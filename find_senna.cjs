const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('tasks')
        .select('id, url, title, content_body')
        .ilike('title', '%PO0202S%');

    if (error) {
        console.error('Error fetching:', error);
        return;
    }
    console.log(JSON.stringify(data.map(d => ({id: d.id, title: d.title})), null, 2));
    
    if (data.length > 0) {
        const fs = require('fs');
        fs.writeFileSync('persol_senna.txt', data[0].content_body);
        console.log('Saved to persol_senna.txt');
    }
}
main();
