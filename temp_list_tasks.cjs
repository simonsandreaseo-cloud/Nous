const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTasks() {
    const { data: projects } = await supabase.from('projects').select('*').ilike('name', '%bassol%');
    if (!projects || projects.length === 0) return;
    const projectId = projects[0].id;

    const { data: tasks } = await supabase.from('tasks').select('id, title, status').eq('project_id', projectId).eq('status', 'por_maquetar');
    console.log(`Tasks to process: ${tasks.length}`);
    tasks.forEach((t, i) => {
        console.log(`[${i + 1}] ${t.id} - ${t.title}`);
    });
}
listTasks().then(() => process.exit(0)).catch(console.error);
