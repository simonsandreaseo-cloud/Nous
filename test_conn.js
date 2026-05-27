const { Client } = require('pg');

async function testConnection(host, port, user) {
    const connStr = `postgresql://${user}:ALZfE%24%25H-ze%21zn7@${host}:${port}/postgres`;
    const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log(`Testing ${host}:${port} with user ${user}...`);
        await client.connect();
        const res = await client.query('SELECT 1 as result');
        console.log(`Success! Result: ${res.rows[0].result}`);
        await client.end();
        return true;
    } catch (e) {
        console.error(`Failed: ${e.message}`);
        return false;
    }
}

async function run() {
    const p1 = await testConnection('aws-0-us-east-2.pooler.supabase.com', 6543, 'postgres.wswylghsczgusgagucbd');
    if (p1) return;
    
    const p2 = await testConnection('aws-0-us-east-2.pooler.supabase.com', 5432, 'postgres.wswylghsczgusgagucbd');
    if (p2) return;
}

run();
