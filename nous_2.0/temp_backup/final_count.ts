import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pnntoicdocixeajhoyai.supabase.co';
const supabaseAdminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubnRvaWNkb2NpeGVhamhveWFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEyOTEzNSwiZXhwIjoyMDgxNzA1MTM1fQ.TzW5ITvkM9ZqBYmJnbUwQQ4tv71Px99qhWR6m7pkcTc';

const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function countPerProject() {
  const p1 = 'a287c310-656d-4468-a68c-9386147fe017';
  const p2 = 'f216ce59-810c-4719-bd3e-d02ca31fae0e';

  const { count: c1 } = await supabase.from('project_urls').select('*', { count: 'exact', head: true }).eq('project_id', p1);
  const { count: c2 } = await supabase.from('project_urls').select('*', { count: 'exact', head: true }).eq('project_id', p2);

  console.log(`Proyecto Opticabassol (a28...): ${c1} URLs`);
  console.log(`Proyecto Optica Bassol (f21...): ${c2} URLs`);
}

countPerProject();
