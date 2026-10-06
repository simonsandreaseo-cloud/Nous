const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const taskId = 'debb4f5d-45aa-43d7-99c0-4f126468b9dc';
    
    const { data: versions, error } = await supabase
        .from('task_versions')
        .select('id, process_name, content_body, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error('Error fetching:', error);
        return;
    }
    
    // Find Guardado Manual 10
    const v10 = versions.find(v => v.process_name === 'Guardado Manual 10' || v.process_name === 'guardado manual 10');
    if (v10) {
        fs.writeFileSync('senna_v10.txt', v10.content_body);
        console.log(`Saved Guardado Manual 10 (ID: ${v10.id}) to senna_v10.txt`);
        
        // Delete all others
        const idsToDelete = versions.filter(v => v.id !== v10.id).map(v => v.id);
        if (idsToDelete.length > 0) {
            console.log(`Deleting ${idsToDelete.length} other versions...`);
            const { error: delError } = await supabase
                .from('task_versions')
                .delete()
                .in('id', idsToDelete);
            if (delError) console.error('Delete error:', delError);
            else console.log('Successfully deleted other versions.');
        } else {
            console.log('No other versions to delete.');
        }
    } else {
        console.log('Version "Guardado Manual 10" not found! Existing versions:');
        versions.slice(0,5).forEach(v => console.log(v.process_name));
    }
}
main();
