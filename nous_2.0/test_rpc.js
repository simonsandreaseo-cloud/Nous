const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });
    if (error) {
        console.error("RPC Error:", error.message);
    } else {
        console.log("RPC Success:", data);
    }
}
test();
