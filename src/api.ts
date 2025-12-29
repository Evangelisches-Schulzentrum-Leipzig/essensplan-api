import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fetchAndImportRange } from './query.js';

config();

const app = express()
const port = process.env.API_PORT || 80;

app.use(cors())

app.get('/', (req, res) => {
    res.redirect('/swagger')
})

app.use("/swagger", express.static("docs/api/ui"))
app.use("/openapi.yaml", express.static("docs/api/openapi.yaml"))
app.use("/openapi.json", express.static("docs/api/openapi.json"))

app.get('/query/:startDate/:endDate', async (req, res) => {
    const { startDate, endDate } = req.params;
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