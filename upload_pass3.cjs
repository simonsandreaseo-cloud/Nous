const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadThirdPass() {
  const filePath = 'C:/Users/Simon San/.gemini/antigravity/brain/6474e280-c05b-40c4-9eb2-31621027da68/scratch/tasks/746add15_clean_pass3.html';
  const content = fs.readFileSync(filePath, 'utf8');
  
  const { data, error } = await supabase.rpc('save_task_version', {
    p_task_id: '746add15-6655-4d3f-8f42-e3f139e4bfd3',
    p_process_name: 'Prueba con Antigravity - Tercera Pasada',
    p_content_body: content
  });

  if (error) {
    console.error('Error saving 3rd pass version:', error);
  } else {
    console.log('Successfully saved 3rd pass version to database.');
  }
}

uploadThirdPass().then(() => process.exit(0));
