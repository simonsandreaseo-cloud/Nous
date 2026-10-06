const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const taskId = 'b87a8b96-b614-444a-b952-f19cd6deb158';
    
    // Get the previous version (before our update today)
    const { data: versions, error } = await supabase
        .from('task_versions')
        .select('content_body, created_at, process_name')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(2);
        
    if (error) {
        console.error(error);
        return;
    }
    
    // index 0 is our recent update, index 1 is the previous one.
    if (versions.length > 1) {
        fs.writeFileSync('original_content.txt', versions[1].content_body);
        console.log('Original saved to original_content.txt');
    } else {
        console.log('Not enough versions found');
    }
}
main();
