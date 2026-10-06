import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

const taskId = process.argv[2];

async function main() {
  if (!taskId) {
      console.error("No task id provided");
      return;
  }
  try {
    const hum1Path = `c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/${taskId}/hum1.html`;
    const surg1Path = `c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/${taskId}/surg1.html`;
    const surg2Path = `c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/${taskId}/surg2.html`;

    const hum1Content = fs.readFileSync(hum1Path, 'utf8');
    const surg1Content = fs.readFileSync(surg1Path, 'utf8');
    const surg2Content = fs.readFileSync(surg2Path, 'utf8');

    await supabase.from('task_versions').insert({
        task_id: taskId,
        content_body: hum1Content,
        process_name: 'Limpiado + Humanización',
    });
    console.log("Uploaded: Limpiado + Humanización");

    await supabase.from('task_versions').insert({
        task_id: taskId,
        content_body: surg1Content,
        process_name: 'Limpiado + Quirúrgica 1',
    });
    console.log("Uploaded: Limpiado + Quirúrgica 1");

    await supabase.from('task_versions').insert({
        task_id: taskId,
        content_body: surg2Content,
        process_name: 'Limpiado + Quirúrgica 2',
    });
    console.log("Uploaded: Limpiado + Quirúrgica 2");

  } catch (err) {
    console.error("Error uploading to Supabase:", err);
  }
}

main();
