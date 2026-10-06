const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

const taskId = '746add15-6655-4d3f-8f42-e3f139e4bfd3';

async function uploadGuessPolished() {
  const content = fs.readFileSync('guess_step6_polished.html', 'utf8');
  
  console.log('Uploading Version pulida for Guess task...');
  const { data, error } = await supabase.from('task_versions').insert({
    task_id: taskId,
    content_body: content,
    process_name: 'Version pulida',
    ai_model: 'gemini-1.5-pro'
  }).select();
  
  if (error) {
    console.error('Error uploading:', error);
    process.exit(1);
  }
  
  console.log('Successfully uploaded Version pulida for Guess. Row ID:', data[0].id);
}

uploadGuessPolished();
