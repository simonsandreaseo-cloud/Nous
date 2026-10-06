const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const taskId = 'debb4f5d-45aa-43d7-99c0-4f126468b9dc';
    
    // Fetch the version named 'Guardado Manual 8'
    const { data: versions, error } = await supabase
        .from('task_versions')
        .select('content_body')
        .eq('task_id', taskId)
        .eq('process_name', 'Guardado Manual 8')
        .order('created_at', { ascending: false })
        .limit(1);
        
    if (error) {
        console.error('Error fetching:', error);
        return;
    }
    
    if (versions.length > 0) {
        fs.writeFileSync('senna_v8.txt', versions[0].content_body);
        console.log('Saved Guardado Manual 8 to senna_v8.txt');
    } else {
        console.log('Version not found.');
    }
}
main();
