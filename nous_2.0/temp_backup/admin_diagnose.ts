import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pnntoicdocixeajhoyai.supabase.co';
const supabaseAdminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubnRvaWNkb2NpeGVhamhveWFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEyOTEzNSwiZXhwIjoyMDgxNzA1MTM1fQ.TzW5ITvkM9ZqBYmJnbUwQQ4tv71Px99qhWR6m7pkcTc';

const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function runAdminDiagnosis() {
  console.log("--- DIAGNÓSTICO ADMIN SUPABASE ---");
  
  // 1. Proyectos
  const { data: projects } = await supabase.from('projects').select('id, name, domain').limit(10);
  console.log("PROYECTOS:", JSON.stringify(projects, null, 2));

  if (!projects || projects.length === 0) return;

  const targetPid = projects[0].id;
  console.log(`\nANALIZANDO PROYECTO: ${projects[0].name} (${targetPid})`);

  // 2. GSC Data
  const { data: gscData } = await supabase.from('project_urls')
    .select('*')
    .eq('project_id', targetPid)
    .gt('impressions_gsc', 0)
    .limit(3);
  console.log("\nGSC SAMPLE:", JSON.stringify(gscData, null, 2));

  // 3. CSV Data (With category)
  const { data: csvData } = await supabase.from('project_urls')
    .select('*')
    .eq('project_id', targetPid)
    .not('category', 'is', null)
    .limit(3);
  console.log("\nCSV SAMPLE (Category):", JSON.stringify(csvData, null, 2));
}

runAdminDiagnosis();
