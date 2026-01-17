import { exit } from "node:process";
import { fetchAndImportRange } from "./query.js";

const dayDistance = 14; // days

(async () => {
    try {
        console.log(`Fetching and importing meal plans for the next ${dayDistance} days...`);
        console.log(`From ${new Date().toLocaleDateString("lt-LT")} to ${new Date(Date.now() + dayDistance * 24 * 60 * 60 * 1000).toLocaleDateString("lt-LT")}`);
        const result = await fetchAndImportRange(new Date(), new Date(Date.now() + dayDistance * 24 * 60 * 60 * 1000));
        console.log(result);
        exit(0);
    } catch (error) {
        console.error((error as Error).message, (error as Error).stack);
        exit(1);
    }
})();