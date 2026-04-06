import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pnntoicdocixeajhoyai.supabase.co';
const supabaseAdminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubnRvaWNkb2NpeGVhamhveWFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEyOTEzNSwiZXhwIjoyMDgxNzA1MTM1fQ.TzW5ITvkM9ZqBYmJnbUwQQ4tv71Px99qhWR6m7pkcTc';

const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function globalDiagnosis() {
  console.log("--- DIAGNÓSTICO GLOBAL SUPABASE ---");
  
  // 1. Count rows
  const { count, error: errCount } = await supabase.from('project_urls').select('*', { count: 'exact', head: true });
  console.log(`TOTAL FILAS EN project_urls: ${count}`);

  // 2. Sample first 5 rows regardless of filters
  const { data: anyData, error: errData } = await supabase.from('project_urls').select('*').limit(5);
  console.log("MUESTRA CRUDA (CUALQUIERA):", JSON.stringify(anyData, null, 2));

  // 3. Last projects update
  const { data: latestProj } = await supabase.from('projects').select('id, name, domain').order('created_at', { ascending: false }).limit(5);
  console.log("ÚLTIMOS PROYECTOS CREADOS:", JSON.stringify(latestProj, null, 2));
}

globalDiagnosis();
