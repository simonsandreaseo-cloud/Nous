const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

const taskId = 'ed810b7f-5e21-44b3-bad3-c88020526a0f';

async function uploadVersions() {
  console.log('Uploading Pass 1...');
  const pass1 = fs.readFileSync('task_to_humanize_pass1.html', 'utf8');
  
  const { error: err1 } = await supabase.from('task_versions').insert({
    task_id: taskId,
    content_body: pass1,
    process_name: 'Humanización (Pasada 1)',
    ai_model: 'gemini-1.5-pro'
  });
  
  if (err1) {
    console.error('Error Pass 1:', err1);
    return;
  }
  
  console.log('Uploading Pass 2...');
  const pass2 = fs.readFileSync('task_to_humanize_pass2.html', 'utf8');
  
  const { error: err2 } = await supabase.from('task_versions').insert({
    task_id: taskId,
    content_body: pass2,
    process_name: 'Humanización (Pasada 2)',
    ai_model: 'gemini-1.5-pro'
  });
  
  if (err2) {
    console.error('Error Pass 2:', err2);
    return;
  }
  
  // Opcional: Actualizar el estado de la tarea
  // await supabase.from('tasks').update({ status: 'por_maquetar' }).eq('id', taskId);
  
  console.log('Both versions uploaded successfully!');
}

uploadVersions();
