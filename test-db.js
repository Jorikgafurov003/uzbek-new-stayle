
import pg from 'pg';
const { Client } = pg;

async function testConnection() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_gtFWru3YV2jk@ep-twilight-wind-an6tuifo.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
    });
    try {
        await client.connect();
        console.log("SUCCESS: Connected to database");
        const res = await client.query('SELECT 1 as result');
        console.log("SUCCESS: Query executed, result:", res.rows[0].result);
        await client.end();
    } catch (err) {
        console.error("FAILURE: Could not connect to database:", err.message);
        process.exit(1);
    }
}

testConnection();
