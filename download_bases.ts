import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const tasksFile = fs.readFileSync('c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/tasks_to_process.json', 'utf8');
    const tasksToProcess = JSON.parse(tasksFile);
    
    for (const item of tasksToProcess) {
        const { task, limpiadoVersion } = item;
        const taskId = task.id;
        const html = limpiadoVersion.content_body;
        
        const safeTitle = task.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        const outDir = `c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/${taskId}`;
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        
        fs.writeFileSync(`${outDir}/base.html`, html);
        fs.writeFileSync(`${outDir}/info.json`, JSON.stringify({
            taskId,
            title: task.title,
            safeTitle
        }, null, 2));
    }
    console.log(`Saved ${tasksToProcess.length} tasks to goal_17/tasks`);
}

main().catch(console.error);
