const { createClient } = require('@supabase/supabase-js');

async function run() {
    const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const sql = `ALTER TABLE public.task_versions ADD COLUMN IF NOT EXISTS ai_model TEXT;`;
    
    console.log("Executing SQL...");
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
        console.error("Error executing SQL:", error);
    } else {
        console.log("Success! Column added.");
    }
}

run();
