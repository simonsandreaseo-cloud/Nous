const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchPass2All() {
  console.log('Fetching tasks with status por_maquetar...');
  const { data: tasks, error: err1 } = await supabase
    .from('tasks')
    .select('id')
    .eq('status', 'por_maquetar');
    
  if (err1) {
    console.error('Error fetching tasks:', err1);
    process.exit(1);
  }

  console.log(`Found ${tasks.length} tasks.`);
  const taskIds = tasks.map(t => t.id).filter(id => id !== '746add15-6655-4d3f-8f42-e3f139e4bfd3');
  console.log(`${taskIds.length} tasks to process (excluding the one already done).`);

  const { data: versions, error: err2 } = await supabase
    .from('task_versions')
    .select('task_id, content_body')
    .in('task_id', taskIds)
    .eq('process_name', 'Prueba con Antigravity - Segunda Pasada');

  if (err2) {
    console.error('Error fetching versions:', err2);
    process.exit(1);
  }

  console.log(`Found ${versions.length} versions for Segunda Pasada.`);
  let savedCount = 0;
  for (const v of versions) {
    fs.writeFileSync(`C:/Users/Simon San/.gemini/antigravity/brain/6474e280-c05b-40c4-9eb2-31621027da68/scratch/tasks/${v.task_id}_clean_pass2.html`, v.content_body, 'utf8');
    savedCount++;
  }
  
  console.log(`Saved ${savedCount} clean pass 2 files to disk.`);
}

fetchPass2All().then(() => process.exit(0));
