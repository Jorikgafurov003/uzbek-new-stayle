
import pg from 'pg';
const { Client } = pg;

async function checkPassword() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_gtFWru3YV2jk@ep-twilight-wind-an6tuifo.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
    });
    try {
        await client.connect();
        const res = await client.query("SELECT id, name, phone, password, role FROM users WHERE phone LIKE '%998936584455'");
        console.log("ADMIN DATA:");
        console.log(res.rows[0]);
        await client.end();
    } catch (err) {
        console.error("ERROR:", err.message);
    }
}

checkPassword();
