import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('status', 'por_maquetar');
        
    if (error) {
        console.error(error);
        return;
    }
    
    console.log(`Found ${tasks.length} tasks with status 'por_maquetar'.`);
    
    const tasksToProcess = [];

    for (const t of tasks) {
        const { data: versions, error: vErr } = await supabase
            .from('task_versions')
            .select('id, process_name, content_body, created_at')
            .eq('task_id', t.id)
            .ilike('process_name', '%Limpiad%')
            .order('created_at', { ascending: false })
            .limit(1);

        if (vErr) {
            console.error(`Error fetching versions for ${t.title}:`, vErr);
            continue;
        }

        if (versions && versions.length > 0) {
            tasksToProcess.push({
                task: t,
                limpiadoVersion: versions[0]
            });
            console.log(`- Task: ${t.title} -> Found Limpiado version: ${versions[0].process_name}`);
        } else {
            const { data: v2 } = await supabase
                .from('task_versions')
                .select('id, process_name, content_body, created_at')
                .eq('task_id', t.id)
                .ilike('process_name', '%pulida%')
                .order('created_at', { ascending: false })
                .limit(1);
                
            if (v2 && v2.length > 0) {
                tasksToProcess.push({
                    task: t,
                    limpiadoVersion: v2[0]
                });
                console.log(`- Task: ${t.title} -> Found Pulida version: ${v2[0].process_name}`);
            } else {
                console.log(`- Task: ${t.title} -> NO Limpiado/Pulida version found.`);
            }
        }
    }
    
    fs.writeFileSync('c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/tasks_to_process.json', JSON.stringify(tasksToProcess, null, 2));
    console.log("Saved tasks_to_process.json");
}

main().catch(console.error);
