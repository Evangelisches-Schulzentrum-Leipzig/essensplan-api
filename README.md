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

## API Documentation

Once the server is running, access the Swagger UI at `/swagger` or the OpenAPI spec at `/openapi.yaml`.  
The file is also located at [`/docs/api/openapi.yaml`](/docs/api/openapi.yaml) or [`/docs/api/openapi.json`](/docs/api/openapi.json).

## Contributing

Contributions of any kind are welcome!

## License

[Open Software License 3.0](https://choosealicense.com/licenses/osl-3.0/)
