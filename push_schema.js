const { Client } = require('pg');
const fs = require('fs');

async function run() {
    const connStr = "postgresql://postgres:ALZfE%24%25H-ze%21zn7@db.wswylghsczgusgagucbd.supabase.co:5432/postgres";
    const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Connecting to Supabase DB...");
        await client.connect();
        
        console.log("Reading all_migrations.sql...");
        const sql = fs.readFileSync('supabase/all_migrations.sql', 'utf8');
        
        console.log(`Executing ${sql.length} bytes of SQL...`);
        await client.query(sql);
        console.log("Success! All migrations applied.");
        
    } catch (e) {
        console.error("Error applying migrations:");
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
