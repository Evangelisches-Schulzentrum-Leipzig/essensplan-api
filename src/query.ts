import { config } from 'dotenv';
import mariadb, { Pool, PoolConnection } from 'mariadb';

config();

interface TagesMenue {
    allergeneIds: string[];
    bestellbarWenn: number[];
    bezeichnung: string;
    gesperrt: boolean;
    inhaltsstoffeIds: number[];
    zusatzstoffeIds: string[];
    kurzBez: string;
    mehrfachbestellbar: boolean;
    menueGruppe: number;
    menueNr: number;
    menueText: string;
    menueTyp: string;
    menueId: string;
    portionsGroesse: number;
    naehrwertMassTyp: string;
    naehrwerte: unknown[];
    symbol: string | null;
    splanId: string;
}

interface SpeiseplanTag {
    datum: string;
    tagesMenues: Record<number, TagesMenue>;
    feiertag: boolean;
}

interface BestellMsg {
    name: string;
    params: string[];
    text: string;
    typ: string;
}

interface ApiResponse {
    code: number;
    content: {
        speiseplanTage: Record<string, SpeiseplanTag>;
        bestellschlussMsg: BestellMsg[];
        splanPdfs: Record<string, string>;
    };
}

interface ProcessedMeal {
    name: string;
    cleanedText: string;
    allergenIds: string[];
    supplementIds: string[];
    dietaryFlags: number;
}

interface InsertResult {
    daysProcessed: number;
    mealsInserted: number;
    planMealsInserted: number;
}

// Dietary flag bit positions
const DIETARY_FLAGS = {
    VEGETARIAN: 1 << 0,  // Bit 0
    VEGAN: 1 << 1,       // Bit 1
    GLUTEN_FREE: 1 << 2, // Bit 2
} as const;

let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        pool = mariadb.createPool({
            host: process.env['DB_HOST'] || '',
            port: Number(process.env['DB_PORT']) || 3306,
            user: process.env['DB_USER'] || '',
            password: process.env['DB_PASSWORD'] || '',
            database: process.env['DB_DATABASE'] || '',
            connectionLimit: Number(process.env['DB_CONNECTION_LIMIT']) || 10,
            bigIntAsNumber: true,
        });
    }
    return pool;
}

async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("lt-LT");
}

// ============================================================================
// API Fetching
// ============================================================================

async function fetchSpeiseplanData({ dateStart, dateEnd, etag }: {dateStart: Date, dateEnd: Date, etag?: string}): Promise<{data: ApiResponse, etag: string} | null> {
    const requestBody = {
        command: 'speiseplan/mandantAPI_1_5',
        client: 'web',
        parameter: {
            mandantId: process.env['API_MANDANT_ID'],
            speiseplanNr: process.env['API_SPEISEPLAN_NR'],
            von: formatDate(dateStart),
            bis: formatDate(dateEnd),
        },
    };

    const response = await fetch(process.env['API_REQUEST_URL'] || '', {
        method: 'POST',
        headers: {
            'Accept': 'application/json, text/javascript, */*',
            'Content-Type': 'application/json',
            'Referer': process.env['API_REFERRER_URL'] || '',
            'If-None-Match': etag || '',
        },
        body: JSON.stringify(requestBody),
    });

    if (response.status === 304) {
        console.log('Data not modified since last fetch.');
        return null;
    }

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ApiResponse;
    const response_etag = response.headers.get('ETag') || "";

    return { data: data, etag: response_etag };
}

// ============================================================================
// Text Processing
// ============================================================================

function cleanMenuText(menueText: string): string {
    // Split by [br], trim whitespace
    let lines = menueText.split('[br]').map(s => s.trim());

    // Remove last line if it contains allergens/additives info (in parentheses)
    if (lines.length > 0 && /\([^)]+\)/.test(lines[lines.length - 1])) {
        lines.pop();
    }

    // Remove additive markers like (1), (2,3), etc.
    lines = lines.map(s => s.replace(/\((?:[1-9]|1[0-5])(?:,[1-9]|,1[0-5])*\)/g, ''));

    // Remove allergen markers like (A), (A,G), etc.
    lines = lines.map(s => s.replace(/\([A-N](?:,[A-N])*\)/g, ''));

    // Ensure commas are followed by a space
    lines = lines.map(s => s.replace(/,([^ ])/g, ', $1'));

    // Remove empty lines and join
    return lines.filter(Boolean).join(' ').trim();
}

async function extractAllergenIds(conn: PoolConnection, menueText: string): Promise<string[]> {
    var rows = await conn.query<{ id: string }[]>('SELECT id FROM allergens;');

    const matches = menueText.match(/\(([A-N](?:,[A-N])*)\)/g);
    if (!matches) return [];

    const ids = new Set<string>();
    for (const match of matches) {
        const cleaned = match.replace(/[()]/g, '');
        for (const id of cleaned.split(',')) {
            if (id && rows.find(r => r.id === id)) {
                ids.add(id);
            }
        }
    }
    return Array.from(ids).sort();
}

async function extractSupplementIds(conn: PoolConnection, menueText: string): Promise<string[]> {
    var rows = await conn.query<{ id: string }[]>('SELECT id FROM supplements;');

    const matches = menueText.match(/\((?:[1-9]|1[0-5])(?:,(?:[1-9]|1[0-5]))*\)/g);
    if (!matches) return [];

    const ids = new Set<string>();
    for (const match of matches) {
        const cleaned = match.replace(/[()]/g, '');
        for (const id of cleaned.split(',')) {
            if (id && rows.find(r => r.id === id)) {
                ids.add(id);
            }
        }
    }
    return Array.from(ids).sort((a, b) => parseInt(a) - parseInt(b));
}

async function calculateDietaryFlags(conn: PoolConnection, bezeichnung: string, menueText: string): Promise<number> {
    let flags = 0;
    const combined = `${bezeichnung} ${menueText}`.toLowerCase();

    // Check for vegetarian indicators
    if (combined.includes('vegetarisch') || combined.includes('(veg)') || combined.includes('veg.')) {
        flags |= DIETARY_FLAGS.VEGETARIAN;
    }

    // Check for vegan indicators
    if (combined.includes('vegan')) {
        flags |= DIETARY_FLAGS.VEGAN;
        flags |= DIETARY_FLAGS.VEGETARIAN; // Vegan implies vegetarian
    }

    // Check for gluten-free (absence of allergen A)
    const allergenIds = await extractAllergenIds(conn, menueText);
    if (!allergenIds.includes('A')) {
        flags |= DIETARY_FLAGS.GLUTEN_FREE;
    }

    return flags;
}

async function processMenue(conn: PoolConnection, menue: TagesMenue): Promise<ProcessedMeal> {
    return {
        name: menue.bezeichnung,
        cleanedText: cleanMenuText(menue.menueText),
        allergenIds: await extractAllergenIds(conn, menue.menueText),
        supplementIds: await extractSupplementIds(conn, menue.menueText),
        dietaryFlags: await calculateDietaryFlags(conn, menue.bezeichnung, menue.menueText),
    };
}

// ============================================================================
// Database Operations
// ============================================================================

async function findOrCreateMeal(
    conn: PoolConnection,
    processed: ProcessedMeal
): Promise<number> {    
    const insertResult = await conn.query(
        `INSERT INTO meals (name, dietary_flags) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), dietary_flags = VALUES(dietary_flags)`,
        [processed.cleanedText, processed.dietaryFlags]
    );

    const mealId = Number(insertResult.insertId);
    if (mealId === 0) {
        // Meal already exists, fetch its ID
        const rows = await conn.query<{ id: number }[]>(
            'SELECT id FROM meals WHERE name = ? AND dietary_flags = ? LIMIT 1',
            [processed.cleanedText, processed.dietaryFlags]
        );
        return rows[0].id;
    }

    // Insert allergens
    if (processed.allergenIds.length > 0) {
        const allergenValues = processed.allergenIds.map(id => [mealId, id]);
        await conn.batch(
            'INSERT IGNORE INTO meal_allergens (meal_id, allergen_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE meal_id = meal_id',
            allergenValues
        );
    }

    // Insert supplements
    if (processed.supplementIds.length > 0) {
        const supplementValues = processed.supplementIds.map(id => [mealId, id]);
        await conn.batch(
            'INSERT IGNORE INTO meal_supplements (meal_id, supplement_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE meal_id = meal_id',
            supplementValues
        );
    }

    return mealId;
}

async function findCategoryId(conn: PoolConnection, categoryName: string): Promise<number | null> {
    if (categoryName.toLowerCase().includes("milch")) {
        categoryName = "Milch";
    }
    if (categoryName == "Allergie.glutenfrei") {
        categoryName = "Glutenfrei";
    }
    const rows = await conn.query<{ id: number }[]>(
        'SELECT id FROM categories WHERE name = ? LIMIT 1',
        [categoryName]
    );
    const default_rows = await conn.query<{ id: number }[]>(
        'SELECT id FROM categories WHERE name = "N/A" LIMIT 1'
    );

    return rows.length > 0 ? rows[0].id : default_rows.length > 0 ? default_rows[0].id : null;
}

async function insertPlanMeal(
    conn: PoolConnection,
    date: string,
    mealId: number,
    categoryId: number | null,
    displayOrder: number,
    price: number = 0.0
): Promise<void> {
    await conn.query(
        `INSERT INTO plan_meals (date, meal_id, category_id, display_order, price) 
         VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE meal_id = VALUES(meal_id), category_id = VALUES(category_id), display_order = VALUES(display_order), price = VALUES(price)`,
        [date, mealId, categoryId, displayOrder, price]
    );
}

async function insertPlanMetadata(
    conn: PoolConnection,
    date: string,
    isHoliday: boolean,
    notes?: string
): Promise<void> {
    await conn.query(
        `INSERT INTO plan_metadata (date, notes, holiday) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE holiday = VALUES(holiday), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP`,
        [date, notes, isHoliday]
    );
}

// ============================================================================
// Main Import Functions
// ============================================================================

async function importSpeiseplanTag(
    conn: PoolConnection,
    datum: string,
    tag: SpeiseplanTag
): Promise<{ mealsInserted: number; planMealsInserted: number }> {
    let mealsInserted = 0;
    let planMealsInserted = 0;

    // Insert plan metadata (holiday status)
    await insertPlanMetadata(conn, datum, tag.feiertag);

    // Process each menu item for this day
    const menues = Object.values(tag.tagesMenues);
    
    for (const menue of menues) {
        // Skip locked/unavailable items
        if (menue.gesperrt) continue;

        // Process the menu item
        const processed = await processMenue(conn, menue);

        // Find or create the meal
        const mealId = await findOrCreateMeal(conn, processed);
        mealsInserted++;

        // Find category
        const categoryId = await findCategoryId(conn, processed.name);

        // Insert into plan_meals
        await insertPlanMeal(conn, datum, mealId, categoryId, menue.menueNr);
        planMealsInserted++;
    }

    return { mealsInserted, planMealsInserted };
}

async function importApiResponse(conn: PoolConnection, response: ApiResponse): Promise<InsertResult> {
    try {
        await conn.beginTransaction();

        let totalMeals = 0;
        let totalPlanMeals = 0;
        let daysProcessed = 0;

        const { speiseplanTage } = response.content;

        for (const [datum, tag] of Object.entries(speiseplanTage)) {
            const { mealsInserted, planMealsInserted } = await importSpeiseplanTag(conn, datum, tag);
            totalMeals += mealsInserted;
            totalPlanMeals += planMealsInserted;
            daysProcessed++;
        }

        await conn.commit();

        return {
            daysProcessed,
            mealsInserted: totalMeals,
            planMealsInserted: totalPlanMeals,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetches meal plan data for a date range and imports it into the database.
 */
export async function fetchAndImportRange(startDate: Date, endDate: Date): Promise<InsertResult> {
    const conn = await getPool().getConnection();
    // get last etag for the date range from api_metadata
    var rows = await conn.query<{ hash: string }[]>(
        'SELECT hash FROM api_metadata WHERE start_date = ? AND end_date = ? LIMIT 1',
        [formatDate(startDate), formatDate(endDate)]
    );
    const lastEtag = rows.length > 0 ? rows[0].hash : undefined;

    var eTagOptions = lastEtag ? { etag: lastEtag } : {};
    var options = { dateStart: startDate, dateEnd: endDate, ...eTagOptions };
    const response = await fetchSpeiseplanData(options);
    // If-None-Match not correctly working, so we manually check etag
    if (response === null || lastEtag === response.etag) {
        conn.release();
        return {
            daysProcessed: 0,
            mealsInserted: 0,
            planMealsInserted: 0,
        };
    }
    const result = await importApiResponse(conn, response.data);
    // Update api_metadata with new etag
    await conn.query(
        'REPLACE INTO api_metadata (start_date, end_date, hash) VALUES (?, ?, ?)',
        [formatDate(startDate), formatDate(endDate), response.etag]
    );
    closePool();
    return result;
}

/**
 * Export types for external use.
 */
export type {
    ApiResponse,
    SpeiseplanTag,
    TagesMenue,
    ProcessedMeal,
    InsertResult,
};