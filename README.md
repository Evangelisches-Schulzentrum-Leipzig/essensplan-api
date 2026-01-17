# Essensplan API

A REST API for our cafeteria meal plan (Essensplan) data.  
Including full OpenAPI documentation.

## Features

- Query allergens and supplements information
- Retrieve meal details with dietary information (vegetarian, vegan, gluten-free)
- Access daily, weekly, and custom date range meal plans
- OpenMensa-compatible endpoints
- OpenAPI/Swagger UI documentation

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/download)
- [TypeScript Compiler](https://www.typescriptlang.org/download/)
- [MariaDB database](https://mariadb.org/download/)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
   Or for development:
   ```bash
   npm install -D 
   ```
3. Set up the database using the schema in [`/database/schema.sql`](/database/schema.sql)
4. Create a `.env` file based on the [`.env.example`](/.env.example) file.

### Running the API

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

### Querying the Data Source

The API supports two methods for querying and syncing meal plan data from the external data source:

#### 1. Manual Query via API Endpoint

Use the `/query/:startDate/:endDate` endpoint to fetch and import meal plans for a specific date range:

```bash
GET /query/2024-01-15/2024-01-31
```

**Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- Maximum range: 356 days

**Response:** Returns the HTTP status code 200 on success and the statistics of the import process.

#### 2. Automated Scheduled Sync with Cron Job

For continuous data updates, use the `query-worker.ts` script with a cron job scheduler:

**Setup:**
1. Compile the worker script:
   ```bash
   npm run build
   ```

2. Add to your cron schedule (example: daily at 2 AM):
   ```cron
   0 2 * * * cd /path/to/essensplan-api && node ./dist/query-worker.js
   ```

**What it does:**
- Fetches meal plans for the next 14 days
- Automatically imports them into the database
- Logs the fetch operation and date range
- Exits with status 0 on success, 1 on failure

The worker uses the same `fetchAndImportRange()` function as the API endpoint, ensuring consistent data handling.

**Example output:**
```
Fetching and importing meal plans for the next 14 days...
From 17.1.2026 to 31.1.2026
{ daysProcessed: 10, mealsInserted: 80, planMealsInserted: 80 }
```

**Configure day range**
In the [query-worker.ts](/src/query-worker.ts) you can change the constant `dayDistance` to your liking to adjust the end date of the query from the current day.

## API Documentation

Once the server is running, access the Swagger UI at `/swagger` or the OpenAPI spec at `/openapi.yaml`.  
The file is also located at [`/docs/api/openapi.yaml`](/docs/api/openapi.yaml) or [`/docs/api/openapi.json`](/docs/api/openapi.json).

## Contributing

Contributions of any kind are welcome!

## License

[Open Software License 3.0](https://choosealicense.com/licenses/osl-3.0/)
