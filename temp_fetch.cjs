const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchHtml() {
    const id = '9240d45b-6ad4-4c60-9e6f-cc5fa5314db9';
    let { data: task } = await supabase.from('tasks').select('content_body').eq('id', id).single();
    if (!task || !task.content_body) {
        const { data: contents } = await supabase.from('task_contents').select('content_body').eq('id', id).single();
        task = contents;
    }
    const scratchDir = 'C:\\Users\\Simon San\\.gemini\\antigravity\\brain\\6474e280-c05b-40c4-9eb2-31621027da68\\scratch';
    if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
    }
    fs.writeFileSync(scratchDir + '\\content.html', task.content_body, 'utf8');
    console.log('Saved to scratch/content.html');
}
fetchHtml().then(() => process.exit(0)).catch(e => console.error(e));
