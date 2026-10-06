const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchVersion() {
    const { data: v } = await supabase.from('task_versions').select('content_body').eq('id', '6dc8f639-7bb8-4451-833a-1ebc07a5f806').single();
    
    fs.writeFileSync('C:\\\\Users\\\\Simon San\\\\.gemini\\\\antigravity\\\\brain\\\\6474e280-c05b-40c4-9eb2-31621027da68\\\\scratch\\\\content_v2.html', v.content_body, 'utf8');
    console.log('Saved to scratch/content_v2.html');
}
fetchVersion().then(() => process.exit(0)).catch(e => console.error(e));
