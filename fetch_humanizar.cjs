const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchTask() {
  const { data, error } = await supabase
    .from('task_versions')
    .select('*')
    .eq('task_id', 'ed810b7f-5e21-44b3-bad3-c88020526a0f')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    fs.writeFileSync('C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/task_to_humanize.html', data[0].content_body, 'utf8');
    console.log('Saved to task_to_humanize.html');
  } else {
    console.log('No versions found');
  }
}

fetchTask();
