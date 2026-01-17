import { queryDailyPlan, queryDay, queryDays } from "./db.js"

export async function getFeedV2() {
    
}

export async function getCanteen() {
    return {
        "id": 1,
        "name": "Mensa Evangelisches Schulzentrum Leipzig",
        "city": "Leipzig",
        "address": "Schletterstraße 7, 04107 Leipzig, Deutschland",
        "coordinates": [51.3303829274839,12.377177720801583]
    }
}

export async function getDaysOfCanteen(startDate: string | undefined): Promise<{date: string, closed: boolean}[]> {
    var days = await queryDays(startDate);
    return days.map(day => ({date: day.date, closed: day.holiday}));
}

export async function getDayOfCanteen(date: string): Promise<{date: string, closed: boolean} | null> {
    var day = await queryDay(date);
    if (!day) {
        return null;
    }
    return {date: day.date, closed: day.holiday};
}

export async function getMealsOfCanteen(date: string): Promise<{"id": number, "name": string, "notes": string[], "prices": {"students": number, "employees": number, "others": number}, "category": string}[]> {
    var day = await queryDay(date);
    if (!day || day.holiday) {
        return [];
    }
    var plan = await queryDailyPlan(date);

    return plan.map(planEl => ({
        id: planEl.meal.id,
        name: planEl.meal.name,
        notes: [
            planEl.meal.dietary,
            ...planEl.meal.allergens.map(a => a.name),
            ...planEl.meal.supplements.map(s => s.name)
        ].filter(n => n.length > 0),
        prices: {
            pupils: -1,
            students: -1,
            employees: -1,
            others: -1
        },
        category: planEl.category.name
    }));
}

export async function getMealOfCanteen(date: string, id: number): Promise<{"id": number, "name": string, "notes": string[], "prices": {"students": number, "employees": number, "others": number}, "category": string} | null> {
    return (await getMealsOfCanteen(date)).filter(el => el.id === id)[0] || null;
}