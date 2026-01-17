# Essensplan API

A REST API for our cafeteria meal plan (Essensplan) data.  
Including full OpenAPI documentation.

## Features

- Comprehensive meal data with allergens and supplements
- Flexible meal plans (daily, weekly, custom date ranges)
- Possible automated data synchronization with cron jobs
- OpenMensa v2.1 feed support and OpenMensa v2 API endpoints
- Interactive Swagger UI and OpenAPI 3.1.0 specification

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

The API will start on the port specified in your `.env` file (default: 80).

### Querying the Data Source

The API supports two methods for querying and syncing meal plan data from the external source:

#### Option 1: Manual Query via HTTP API

Use the `/query/:startDate/:endDate` endpoint to fetch and import meal plans for a specific date range:

```bash
GET /query/2024-01-15/2024-01-31
```

**Parameters:**
- `startDate` (path, required): Start date in YYYY-MM-DD format
- `endDate` (path, required): End date in YYYY-MM-DD format
- **Maximum range:** 356 days

**Response (200 OK):**
```json
{ "daysProcessed": 10, "mealsInserted": 80, "planMealsInserted": 80 }
```

**Use cases:**
- Manual data refresh during development
- On-demand imports triggered by external systems
- One-time historical data imports

#### Option 2: Automated Scheduled Sync (Recommended for Production)

Use the `query-worker.ts` script with a system cron job for automatic periodic updates:

**Setup:**
1. Compile the worker script:
   ```bash
   npm run build
   ```

2. Add to your system crontab (example: daily at 2 AM):
   ```cron
   0 2 * * * cd /path/to/essensplan-api && node ./dist/query-worker.js >> /var/log/essensplan-worker.log 2>&1
   ```

**What it does:**
- Fetches meal plans for the next 14 days
- Automatically imports them into the database
- Logs the fetch operation and date range
- Exits with status 0 on success, 1 on failure

The worker uses the same `fetchAndImportRange()` function as the API endpoint, ensuring consistent data handling.

**Example output:**
```bash
Fetching and importing meal plans for the next 14 days...
From 17.1.2026 to 31.1.2026
{ daysProcessed: 10, mealsInserted: 80, planMealsInserted: 80 }
```
**Customizing the Query Range**  
To adjust how many days ahead the worker fetches, edit the `dayDistance` constant in [`query-worker.ts`](/src/query-worker.ts). By default, it fetches 14 days from the current date; modify this value to suit your needs.

## API Documentation

Once the server is up and running, you can access the Swagger UI at `/swagger` or get the OpenAPI specification at `/openapi.yaml`.  
Additionally, the specification files are available at [`/docs/api/openapi.yaml`](/docs/api/openapi.yaml) and [`/docs/api/openapi.json`](/docs/api/openapi.json).

## Contributing

Contributions of any kind are welcome!

## License

[Open Software License 3.0](https://choosealicense.com/licenses/osl-3.0/)
