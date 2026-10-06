const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

const taskId = 'ed810b7f-5e21-44b3-bad3-c88020526a0f';

async function updateVersionPulida() {
  const content = fs.readFileSync('task_final_polished_authentic.html', 'utf8');
  
  console.log('Updating Version pulida in task_versions...');
  const { data, error } = await supabase
    .from('task_versions')
    .update({ content_body: content })
    .eq('task_id', taskId)
    .eq('process_name', 'Version pulida')
    .select();
    
  if (error) {
    console.error('Error updating:', error);
    process.exit(1);
  }
  
  console.log('Successfully updated Version pulida row count:', data.length);
}

updateVersionPulida();
