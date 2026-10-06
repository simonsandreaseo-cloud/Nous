const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function exportAll() {
    const { data: projects } = await supabase.from('projects').select('*').ilike('name', '%bassol%');
    if (!projects || projects.length === 0) return;
    const projectId = projects[0].id;

    const { data: tasks } = await supabase.from('tasks').select('id, title, status, content_body').eq('project_id', projectId).eq('status', 'por_maquetar');
    
    const dir = 'C:\\\\Users\\\\Simon San\\\\.gemini\\\\antigravity\\\\brain\\\\6474e280-c05b-40c4-9eb2-31621027da68\\\\scratch\\\\tasks';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    for (let task of tasks) {
        if (task.id === '9240d45b-6ad4-4c60-9e6f-cc5fa5314db9') continue;
        
        let content = task.content_body;
        if (!content) {
            const { data: contents } = await supabase.from('task_contents').select('content_body').eq('id', task.id).single();
            content = contents?.content_body;
        }
        
        if (content) {
            fs.writeFileSync(`${dir}\\\\${task.id}.html`, content, 'utf8');
            console.log(`Exported ${task.id}`);
        }
    }
}
exportAll().then(() => process.exit(0)).catch(console.error);
