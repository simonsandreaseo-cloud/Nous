const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function upload() {
    const dir = 'C:\\\\Users\\\\Simon San\\\\.gemini\\\\antigravity\\\\brain\\\\6474e280-c05b-40c4-9eb2-31621027da68\\\\scratch\\\\tasks';
    const files = fs.readdirSync(dir);
    for (let f of files) {
        if (f.endsWith('_pass1.html') || f.endsWith('_pass2.html')) {
            const taskId = f.split('_pass')[0];
            const passName = f.includes('pass1') ? 'Prueba con Antigravity' : 'Prueba con Antigravity - Segunda Pasada';
            const html = fs.readFileSync(`${dir}\\\\${f}`, 'utf8');
            
            // Check if already uploaded
            const { data: existing } = await supabase.from('task_versions').select('id').eq('task_id', taskId).eq('process_name', passName);
            if (existing && existing.length > 0) {
                console.log(`Skipping ${taskId} ${passName}, already exists.`);
                continue;
            }

            const { data, error } = await supabase.rpc('save_task_version', {
                p_task_id: taskId,
                p_content_body: html,
                p_process_name: passName
            });
            if (error) {
                console.error(`Failed ${taskId} ${passName}:`, error);
            } else {
                console.log(`Uploaded ${taskId} ${passName} -> ${data}`);
            }
        }
    }
}
upload().then(() => process.exit(0)).catch(console.error);
