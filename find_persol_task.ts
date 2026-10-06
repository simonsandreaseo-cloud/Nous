import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const taskId = 'debb4f5d-45aa-43d7-99c0-4f126468b9dc';
    // get versions
    const { data: versions, error: vErr } = await supabase
        .from('task_versions')
        .select('id, process_name, created_at, content_body')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
        
    if (vErr) {
        console.error(vErr);
        return;
    }
    
    console.log("Versions for Persol:");
    let lastVersionContent = "";
    versions.forEach(v => {
        console.log(`- ${v.process_name} (${v.id})`);
        lastVersionContent = v.content_body;
    });

    fs.writeFileSync('c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/persol_base.html', lastVersionContent);
    console.log("Saved the latest version to persol_base.html");
}

main().catch(console.error);
