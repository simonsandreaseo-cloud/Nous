const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
    const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Reading migration task_versions...");
    let sql = fs.readFileSync('supabase/migrations/20260627200000_create_task_versions.sql', 'utf8');
    if (sql.charCodeAt(0) === 0xFEFF) {
        sql = sql.slice(1);
    }
    
    // Strip BEGIN; and COMMIT; statements because EXECUTE doesn't support them
    sql = sql.replace(/^BEGIN;/gim, '-- BEGIN;');
    sql = sql.replace(/^COMMIT;/gim, '-- COMMIT;');

    console.log(`Sending ${sql.length} bytes of SQL via RPC...`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
        console.error("Error executing SQL:", error);
    } else {
        console.log("Success! Migration applied successfully.");
    }
}

run();
