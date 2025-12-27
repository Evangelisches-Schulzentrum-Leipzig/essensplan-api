import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';

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

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})