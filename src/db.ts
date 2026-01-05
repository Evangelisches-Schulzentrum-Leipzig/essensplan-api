import { config } from 'dotenv';
import mariadb, { Pool } from 'mariadb';

interface Meal{
    id: number;
    name: string;
    dietary: string;
    allergens: {id: string, name: string}[];
    supplements: {id: string, name: string}[];
    created_date: Date;
}

//Bit 0: vegetarian, Bit 1: vegan, Bit 2: gluten-free
const dietary_map_from_flags = (flags: number): string => {
    const dietary_labels = ['vegetarian', 'vegan', 'gluten-free'];
    let labels: string[] = [];
    dietary_labels.forEach((label, index) => {
        if ((flags & (1 << index)) !== 0) {
            labels.push(label);
        }
    });
    return labels.join(', ');
};

config();

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

export async function queryAllergens(id: string | undefined = undefined): Promise<{id: string, name: string}[]> {
    const conn = await getPool().getConnection();
    try {
        let rows = await conn.query('SELECT id, name FROM allergens' + (id ? ' WHERE id = ?' : ''), id ? [id] : []);
        return Array.isArray(rows) ? rows.map(row => ({ id: row.id, name: row.name })) : [];
    } finally {
        conn.release();
    }
}

export async function querySupplements(id: string | undefined = undefined): Promise<{id: string, name: string}[]> {
    const conn = await getPool().getConnection();
    try {
        let rows = await conn.query('SELECT id, name FROM supplements' + (id ? ' WHERE id = ?' : ''), id ? [id] : []);
        return Array.isArray(rows) ? rows.map(row => ({ id: row.id, name: row.name })) : [];
    } finally {
        conn.release();
    }
}

export async function queryMeals(id: number | undefined = undefined): Promise<Meal[]> {    
    const conn = await getPool().getConnection();
    try {
        let rows = await conn.query('SELECT meals.id, meals.name, meals.dietary_flags, allergens.id as allergen_id, allergens.name as allergen_name, supplements.id as supplement_id, supplements.name as supplement_name, meals.created_date FROM `meals` LEFT JOIN meal_allergens ON meal_allergens.meal_id = meals.id LEFT JOIN allergens ON allergens.id = meal_allergens.allergen_id LEFT JOIN meal_supplements ON meal_supplements.meal_id = meals.id LEFT JOIN supplements ON supplements.id = meal_supplements.supplement_id' + (id ? ' WHERE meals.id = ?' : ''), id ? [id] : []);
        var parsed_rows: {id: number, name: string, dietary: string, allergen_id: string | null, allergen_name: string | null, supplement_id: string | null, supplement_name: string | null, created_date: Date}[] = Array.isArray(rows) ? rows.map(row => ({ id: row.id, name: row.name, dietary: dietary_map_from_flags(row.dietary_flags), allergen_id: row.allergen_id, allergen_name: row.allergen_name, supplement_id: row.supplement_id, supplement_name: row.supplement_name, created_date: row.created_date })) : [];
        var meals_map: Map<number, Meal> = new Map();
        parsed_rows.forEach(row => {
            if (!meals_map.has(row.id)) {
                meals_map.set(row.id, { id: row.id, name: row.name, dietary: row.dietary, allergens: [], supplements: [], created_date: row.created_date });
            }
            let meal = meals_map.get(row.id);
            if (row.allergen_id && row.allergen_name) {
                meal?.allergens.push({ id: row.allergen_id, name: row.allergen_name });
            }
            if (row.supplement_id && row.supplement_name) {
                meal?.supplements.push({ id: row.supplement_id, name: row.supplement_name });
            }
        });
        return Array.from(meals_map.values());
    } finally {
        conn.release();
    }
}

export async function queryMenues(): Promise<{id: number, name: string}[]> {
    const conn = await getPool().getConnection();
    try {
        let rows = await conn.query('SELECT id, name FROM categories');
        return Array.isArray(rows) ? rows.map(row => ({id: row.id, name: row.name})) : [];
    } finally {
        conn.release();
    }
}

export async function queryDailyPlan(date: string): Promise<{category: {id: number, name: string}, meal: Meal, displayOrder: number}[]> {
    const conn = await getPool().getConnection();
    try {
        let rows = await conn.query('SELECT plan_meals.date, categories.id as categorie_id, categories.name as categorie_name, meals.id, meals.name, meals.dietary_flags, allergens.id as allergen_id, allergens.name as allergen_name, supplements.id as supplement_id, supplements.name as supplement_name, meals.created_date, plan_meals.display_order FROM `plan_meals` INNER JOIN meals ON meals.id = plan_meals.meal_id INNER JOIN categories ON categories.id = plan_meals.category_id LEFT JOIN meal_allergens ON meal_allergens.meal_id = meals.id LEFT JOIN allergens ON allergens.id = meal_allergens.allergen_id LEFT JOIN meal_supplements ON meal_supplements.meal_id = meals.id LEFT JOIN supplements ON supplements.id = meal_supplements.supplement_id WHERE plan_meals.date = ?', date);
        var parsed_rows: {date: Date, categorie_id: number, categorie_name: string, meal_id: number, meal_name: string, dietary: string, allergen_id: string | null, allergen_name: string | null, supplement_id: string | null, supplement_name: string | null, created_date: Date, display_order: number}[] = Array.isArray(rows) ? rows.map(row => ({ date: row.date, categorie_id: row.categorie_id, categorie_name: row.categorie_name, meal_id: row.id, meal_name: row.name, dietary: dietary_map_from_flags(row.dietary_flags), allergen_id: row.allergen_id, allergen_name: row.allergen_name, supplement_id: row.supplement_id, supplement_name: row.supplement_name, created_date: row.created_date, display_order: row.display_order })) : [];
        var meals_map: Map<number, {category: {id: number, name: string}, meal: Meal, displayOrder: number}> = new Map();
        parsed_rows.forEach(row => {
            if (!meals_map.has(row.meal_id)) {
                meals_map.set(row.meal_id, { category: { id: row.categorie_id, name: row.categorie_name }, meal: { id: row.meal_id, name: row.meal_name, dietary: row.dietary, allergens: [], supplements: [], created_date: row.created_date }, displayOrder: row.display_order });
            }
            let mealEntry = meals_map.get(row.meal_id);
            if (row.allergen_id && row.allergen_name) {
                mealEntry?.meal.allergens.push({ id: row.allergen_id, name: row.allergen_name });
            }
            if (row.supplement_id && row.supplement_name) {
                mealEntry?.meal.supplements.push({ id: row.supplement_id, name: row.supplement_name });
            }
        });
        return Array.from(meals_map.values());
    } finally {
        conn.release();
    }
};

export async function queryDateRangeMenues(startDate: string, endDate: string | undefined = undefined): Promise<{[key: string]: {date: Date, category: {id: number, name: string}, meal: Meal, displayOrder: number}[]}> {
    const conn = await getPool().getConnection();
    try {
        let rows = await conn.query('SELECT plan_meals.date, categories.id as categorie_id, categories.name as categorie_name, meals.id, meals.name, meals.dietary_flags, allergens.id as allergen_id, allergens.name as allergen_name, supplements.id as supplement_id, supplements.name as supplement_name, meals.created_date, plan_meals.display_order FROM `plan_meals` INNER JOIN meals ON meals.id = plan_meals.meal_id INNER JOIN categories ON categories.id = plan_meals.category_id LEFT JOIN meal_allergens ON meal_allergens.meal_id = meals.id LEFT JOIN allergens ON allergens.id = meal_allergens.allergen_id LEFT JOIN meal_supplements ON meal_supplements.meal_id = meals.id LEFT JOIN supplements ON supplements.id = meal_supplements.supplement_id WHERE plan_meals.date >= ?' + (endDate ? " AND plan_meals.date <= ?" : ""), (endDate ? [startDate, endDate] : [startDate]));
        var parsed_rows: {date: Date, categorie_id: number, categorie_name: string, meal_id: number, meal_name: string, dietary: string, allergen_id: string | null, allergen_name: string | null, supplement_id: string | null, supplement_name: string | null, created_date: Date, display_order: number}[] = Array.isArray(rows) ? rows.map(row => ({ date: row.date, categorie_id: row.categorie_id, categorie_name: row.categorie_name, meal_id: row.id, meal_name: row.name, dietary: dietary_map_from_flags(row.dietary_flags), allergen_id: row.allergen_id, allergen_name: row.allergen_name, supplement_id: row.supplement_id, supplement_name: row.supplement_name, created_date: row.created_date, display_order: row.display_order })) : [];
        var meals_map: Map<string, {date: Date, category: {id: number, name: string}, meal: Meal, displayOrder: number}> = new Map();
        parsed_rows.forEach(row => {
            const key = `${row.date.toISOString()}_${row.meal_id}`;
            if (!meals_map.has(key)) {
                meals_map.set(key, { date: row.date, category: { id: row.categorie_id, name: row.categorie_name }, meal: { id: row.meal_id, name: row.meal_name, dietary: row.dietary, allergens: [], supplements: [], created_date: row.created_date }, displayOrder: row.display_order });
            }
            let mealEntry = meals_map.get(key);
            if (row.allergen_id && row.allergen_name) {
                mealEntry?.meal.allergens.push({ id: row.allergen_id, name: row.allergen_name });
            }
            if (row.supplement_id && row.supplement_name) {
                mealEntry?.meal.supplements.push({ id: row.supplement_id, name: row.supplement_name });
            }
        });
        var days_map: {[key: string]: {date: Date, category: {id: number, name: string}, meal: Meal, displayOrder: number}[]} = {};
        meals_map.forEach((value) => {
            const dayKey = value.date.toLocaleDateString("lt-LT");
            if (!days_map[dayKey]) {
                days_map[dayKey] = [];
            }
            days_map[dayKey].push(value);
        });
        return days_map;
    } finally {
        conn.release();
    }
};