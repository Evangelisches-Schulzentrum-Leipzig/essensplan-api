import { create } from 'xmlbuilder2'
import { queryDailyPlan, queryDateRangeMenues, queryDay, queryDays } from "./db.js"

export async function getFeedV2() {
    const planData = await queryDateRangeMenues(new Date().toLocaleDateString("lt-LT"));
    const dayMetadata = await queryDays(new Date().toLocaleDateString("lt-LT"));
    var root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('openmensa', {
            version: '2.1',
            'xmlns': 'http://openmensa.org/open-mensa-v2',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'xsi:schemaLocation': 'http://openmensa.org/open-mensa-v2 http://openmensa.org/open-mensa-v2.xsd'
        });
    
    root.ele('version').txt('1.0.0');
    
    const canteen = root.ele('canteen');
    canteen.ele('name').txt('Mensa Evangelisches Schulzentrum Leipzig');
    canteen.ele('address').txt('Schletterstraße 7, 04107 Leipzig, Deutschland');
    canteen.ele('city').txt('Leipzig');
    canteen.ele('location', { latitude: '51.3303829274839', longitude: '12.377177720801583' });
    canteen.ele('availability').txt('restricted');
    let times = canteen.ele('times', { type: 'opening' });
    times.ele('monday', { open: '09:15-14:00' });
    times.ele('tuesday', { open: '09:15-14:00' });
    times.ele('wednesday', { open: '09:15-14:00' });
    times.ele('thursday', { open: '09:15-14:00' });
    times.ele('friday', { open: '09:15-14:00' });
    times.ele('saturday', { closed: 'true' });
    times.ele('sunday', { closed: 'true' });
    
    for (const dayDate in planData) {        
        let dayData = planData[dayDate];
        let dayInfo = dayMetadata.find(d => d.date === dayDate);
        
        let day = canteen.ele('day', { date: dayDate });
        if (dayInfo && dayInfo.holiday) {
            day.ele('closed');
            continue;
        }
        dayData.sort((a, b) => a.displayOrder - b.displayOrder);
        dayData = dayData.filter(d => d.category.name != "Milch");
        for (const planEl of dayData) {
            let category = day.ele('category', { name: planEl.category.name });
            let meal = category.ele('meal');
            meal.ele('name').txt(planEl.meal.name.substring(0, 247) + (planEl.meal.name.length > 250 ? '...' : planEl.meal.name.substring(247)));

            var notes = [
                planEl.meal.dietary,
                ...planEl.meal.allergens.map(a => a.name),
                ...planEl.meal.supplements.map(s => s.name)
            ].filter(n => n.length > 0)
            for (const note of notes) {
                meal.ele('note').txt(note);
            }            
        }
    }
    
    return root.end({ prettyPrint: true });
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