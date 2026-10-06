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
    const surg3Path = `c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/${taskId}/surg3.html`;
    const surg3Content = fs.readFileSync(surg3Path, 'utf8');

    await supabase.from('task_versions').insert({
        task_id: taskId,
        content_body: surg3Content,
        process_name: 'Limpiado + Quirúrgica 3',
    });
    console.log("Uploaded: Limpiado + Quirúrgica 3");

  } catch (err) {
    console.error("Error uploading to Supabase:", err);
  }
}

main();
