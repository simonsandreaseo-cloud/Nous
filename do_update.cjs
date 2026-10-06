const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const taskId = 'b87a8b96-b614-444a-b952-f19cd6deb158';
    const newContent = fs.readFileSync('cleaned_content.txt', 'utf8');

    console.log('Updating task...');
    const { data: updated, error: updError } = await supabase
        .from('tasks')
        .update({ content_body: newContent })
        .eq('id', taskId);
        
    if (updError) {
        console.error('Update Error:', updError);
        return;
    }

    console.log('Inserting into task_versions...');
    const { data: inserted, error: insError } = await supabase
        .from('task_versions')
        .insert([{
            task_id: taskId,
            process_name: 'Limpieza de Tono y Formalidad',
            content_body: newContent,
            ai_model: 'gemini-3.5-flash'
        }]);

    if (insError) {
        console.error('Insert Error:', insError);
        return;
    }

    console.log('Done successfully.');
}
main();
