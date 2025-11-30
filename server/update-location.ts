import { connectToDatabase, updateSettings, closeConnection } from "./database";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
    try {
        await connectToDatabase();

        // REPLACE THESE WITH REAL COORDINATES
        const LAT = 17.391924;
        const LNG = 78.319692;

        console.log(`Updating classroom location to ${LAT}, ${LNG}...`);
        await updateSettings(LAT, LNG);
        console.log("✅ Location updated successfully!");

    } catch (error) {
        console.error("❌ Error updating location:", error);
    } finally {
        await closeConnection();
    }
}

main();
