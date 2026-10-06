import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { runHumanizerPipeline, runSurgicalEditorPipeline } from './src/lib/actions/aiActions';

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const tasksFile = fs.readFileSync('c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/tasks_to_process.json', 'utf8');
    const tasksToProcess = JSON.parse(tasksFile);
    
    console.log(`Found ${tasksToProcess.length} tasks to process.`);
    
    for (const item of tasksToProcess) {
        const { task, limpiadoVersion } = item;
        const taskId = task.id;
        const htmlBase = limpiadoVersion.content_body;
        
        console.log(`\n========================================`);
        console.log(`Processing Task: ${task.title} (ID: ${taskId})`);
        console.log(`Base version: ${limpiadoVersion.process_name} (${limpiadoVersion.id})`);
        
        const config = {
            niche: "Moda y Gafas de Sol",
            audience: "Compradores de lujo",
            language: "es",
            chunkSize: 1
        };

        // 1. Humanizacion (1 pass)
        console.log("-> Starting Humanizer (1 pass)");
        let humHtml = htmlBase;
        try {
            // runHumanizerPipeline(html, config, intensity, onStatus, modelName)
            const result = await runHumanizerPipeline(humHtml, config, 1, msg => console.log(msg), 'gemini-3.5-flash');
            humHtml = result.html;
            
            // Subir a Supabase
            await supabase.from('task_versions').insert({
                task_id: taskId,
                content_body: humHtml,
                process_name: 'Limpiado + Humanización',
            });
            console.log("-> Uploaded: Limpiado + Humanización");
        } catch (e) {
            console.error("Error in Humanizer:", e);
            continue; // Skip this task if humanizer fails
        }

        // 2. Surgical Edit (Pass 1)
        console.log("-> Starting Surgical Edit (Pass 1)");
        let surg1Html = humHtml;
        try {
            const result = await runSurgicalEditorPipeline(surg1Html, config, 1, msg => console.log(msg), 'gemini-3.5-flash');
            surg1Html = result.html;
            
            await supabase.from('task_versions').insert({
                task_id: taskId,
                content_body: surg1Html,
                process_name: 'Limpiado + Quirúrgica 1',
            });
            console.log("-> Uploaded: Limpiado + Quirúrgica 1");
        } catch (e) {
            console.error("Error in Surgical 1:", e);
        }

        // 3. Surgical Edit (Pass 2)
        console.log("-> Starting Surgical Edit (Pass 2)");
        let surg2Html = surg1Html;
        try {
            const result = await runSurgicalEditorPipeline(surg2Html, config, 1, msg => console.log(msg), 'gemini-3.5-flash');
            surg2Html = result.html;
            
            await supabase.from('task_versions').insert({
                task_id: taskId,
                content_body: surg2Html,
                process_name: 'Limpiado + Quirúrgica 2',
            });
            console.log("-> Uploaded: Limpiado + Quirúrgica 2");
        } catch (e) {
            console.error("Error in Surgical 2:", e);
        }
    }
    
    console.log(`\n========================================`);
    console.log(`GOAL COMPLETE! Processed all tasks.`);
}

main().catch(console.error);
