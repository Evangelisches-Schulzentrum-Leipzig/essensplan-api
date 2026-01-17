import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fetchAndImportRange } from './query.js';
import { queryAllergens, querySupplements, queryMeals, queryMenues, queryDailyPlan, queryDateRangeMenues, queryDaysDatesOfYear, queryAvailableYears } from './db.js';
import { getCanteen, getDayOfCanteen, getDaysOfCanteen, getFeedV2, getMealOfCanteen, getMealsOfCanteen } from './openmensa.js';

config();

const app = express()
const port = process.env['API_PORT'] || 80;

app.use(cors())

app.get('/', (req, res) => {
    res.redirect('/swagger')
})

app.use("/swagger", express.static("docs/api/ui"))
app.use("/openapi.yaml", express.static("docs/api/openapi.yaml"))
app.use("/openapi.json", express.static("docs/api/openapi.json"))

app.get('/allergens', async (req, res) => {
    try {
        const result = await queryAllergens();
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/allergens/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await queryAllergens(id);
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/supplements', async (req, res) => {
    try {
        const result = await querySupplements();
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/supplements/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await querySupplements(id);
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/menues', async (req, res) => {
    try {
        const result = await queryMenues();
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/meals', async (req, res) => {
    try {
        const result = await queryMeals();
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/meals/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await queryMeals(parseInt(id));
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/days/:date', async (req, res) => {
    const { date } = req.params;
    if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(date)) {
        res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD', type: "invalid_date_format" });
        return;
    }
    try {
        const result = await queryDailyPlan(date);
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/plan-range/:startDate/:endDate', async (req, res) => {
    const { startDate, endDate } = req.params;
    if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(startDate) || !/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(endDate)) {
        res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD', type: "invalid_date_format" });
        return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        res.status(400).json({ error: 'startDate must be before or equal to endDate', type: "invalid_date_range" });
        return;
    }
    if (Math.abs(new Date(startDate).getTime() - new Date(endDate).getTime()) > 999 * 24 * 60 * 60 * 1000) {
        res.status(400).json({ error: 'Date range is above the allowed limit of 999 days', type: "range_limit_exceeded" });
        return;
    }
    try {
        const result = await queryDateRangeMenues(startDate, endDate);
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/weeks/:date', async (req, res) => {
    const { date } = req.params;
    if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(date)) {
        res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD', type: "invalid_date_format" });
        return;
    }
    var [start_date, end_date] = ((date: string) => {
        const d = new Date(date);
        const day = d.getDay();
        const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diffToMonday));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return [start, end];
    })(date);
    try {
        const result = await queryDateRangeMenues(start_date.toLocaleDateString("lt-LT"), end_date.toLocaleDateString("lt-LT"));
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/plans', async (req, res) => {
    try {
        const result = await queryDateRangeMenues(new Date().toLocaleDateString("lt-LT"));
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/plans/:relativeDayOffset', async (req, res) => {
    const { relativeDayOffset } = req.params;
    if (Math.abs(Number(relativeDayOffset)) > 999) {
        res.status(400).json({ error: 'relativeDayOffset is out of range', type: "range_limit_exceeded" });
        return;
    }
    try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + Number(relativeDayOffset));
        const result = await queryDateRangeMenues(targetDate.toLocaleDateString("lt-LT"));
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/available-days/:year', async (req, res) => {
    const { year } = req.params;
    try {
        const result = await queryDaysDatesOfYear(parseInt(year));
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/years', async (req, res) => {
    try {
        const result = await queryAvailableYears();
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/openmensa/feed-v2', async (req, res) => {
    try {
        res.json((await getFeedV2()))
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/openmensa/api-v2/canteens', async (req, res) => {
    try {
        res.json([(await getCanteen())]);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/openmensa/api-v2/canteens/:id', async (req, res) => {
    const { id } = req.params;
    if (id !== "1") {
        res.status(404).json({ error: 'Unknown canteen', type: "unknown_canteen" });
        return;
    }
    try {
        res.json(await getCanteen());
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/openmensa/api-v2/canteens/:id/days', async (req, res) => {
    const { id } = req.params;
    const { start } = req.query;
    if (id !== "1") {
        res.status(404).json({ error: 'Unknown canteen', type: "unknown_canteen" });
        return;
    }
    if (start && !/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(start as string)) {
        res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD', type: "invalid_date_format" });
        return;
    }
    try {
        res.json(await getDaysOfCanteen(start as string | undefined));
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/openmensa/api-v2/canteens/:id/days/:date', async (req, res) => {
    const { id, date } = req.params;
    if (id !== "1") {
        res.status(404).json({ error: 'Unknown canteen', type: "unknown_canteen" });
        return;
    }
    if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(date)) {
        res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD', type: "invalid_date_format" });
        return;
    }
    try {
        res.json(await getDayOfCanteen(date));
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/openmensa/api-v2/canteens/:id/days/:date/meals', async (req, res) => {
    const { id, date } = req.params;
    if (id !== "1") {
        res.status(404).json({ error: 'Unknown canteen', type: "unknown_canteen" });
        return;
    }
    if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(date)) {
        res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD', type: "invalid_date_format" });
        return;
    }
    try {
        res.json(await getMealsOfCanteen(date));
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/openmensa/api-v2/canteens/:id/days/:date/meals/:mealid', async (req, res) => {
    const { id, date, mealid } = req.params;
    if (id !== "1") {
        res.status(404).json({ error: 'Unknown canteen', type: "unknown_canteen" });
        return;
    }
    if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(date)) {
        res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD', type: "invalid_date_format" });
        return;
    }
    try {
        res.json(await getMealOfCanteen(date, parseInt(mealid)));
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/query/:startDate/:endDate', async (req, res) => {
    const { startDate, endDate } = req.params;
    if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(startDate) || !/[0-9]{4}-[0-9]{2}-[0-9]{2}/g.test(endDate)) {
        res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD', type: "invalid_date_format" });
        return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        res.status(400).json({ error: 'startDate must be before or equal to endDate', type: "invalid_date_range" });
        return;
    }
    if (Math.abs(new Date(startDate).getTime() - new Date(endDate).getTime()) > 356 * 24 * 60 * 60 * 1000) {
        res.status(400).json({ error: 'Date range is above the allowed limit of 356 days', type: "range_limit_exceeded" });
        return;
    }
    try {
        const result = await fetchAndImportRange(new Date(startDate), new Date(endDate));
        res.json(result);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})