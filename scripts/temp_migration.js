const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const sql = `ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;`;
    
    console.log("Running migration...");
    const { data, error } = await supabase.rpc('exec_sql', { sql: sql });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

run();
