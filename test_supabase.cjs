const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pnntoicdocixeajhoyai.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubnRvaWNkb2NpeGVhamhveWFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEyOTEzNSwiZXhwIjoyMDgxNzA1MTM1fQ.TzW5ITvkM9ZqBYmJnbUwQQ4tv71Px99qhWR6m7pkcTc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data, error } = await supabase
    .from('contents')
    .select('id, target_keyword, title, status')
    .limit(5);

  console.log('contents sample:', data);
}

checkTables();
