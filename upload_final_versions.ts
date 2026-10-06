import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';

const supabase = createClient(supabaseUrl, supabaseKey);

const taskId = 'debb4f5d-45aa-43d7-99c0-4f126468b9dc';

async function main() {
  try {
    const surg1Path = 'c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/persol_surg1.html';
    const surg2Path = 'c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/persol_surg2.html';
    const surg3Path = 'c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/persol_surg3.html';

    const surg1Content = fs.readFileSync(surg1Path, 'utf8');
    const surg2Content = fs.readFileSync(surg2Path, 'utf8');
    const surg3Content = fs.readFileSync(surg3Path, 'utf8');

    // Subir la version Quirurgica 1
    const { error: err1 } = await supabase
      .from('task_versions')
      .insert({
        task_id: taskId,
        content_body: surg1Content,
        process_name: 'Edición Quirúrgica (Pasada 1)',
      });
      
    if (err1) throw err1;
    console.log("Uploaded: Edición Quirúrgica (Pasada 1)");

    // Subir la version Quirurgica 2
    const { error: err2 } = await supabase
      .from('task_versions')
      .insert({
        task_id: taskId,
        content_body: surg2Content,
        process_name: 'Edición Quirúrgica (Pasada 2)',
      });

    if (err2) throw err2;
    console.log("Uploaded: Edición Quirúrgica (Pasada 2)");

    // Subir la version Quirurgica 3
    const { error: err3 } = await supabase
      .from('task_versions')
      .insert({
        task_id: taskId,
        content_body: surg3Content,
        process_name: 'Edición Quirúrgica (Pasada 3)',
      });

    if (err3) throw err3;
    console.log("Uploaded: Edición Quirúrgica (Pasada 3)");

  } catch (err) {
    console.error("Error uploading to Supabase:", err);
  }
}

main();
