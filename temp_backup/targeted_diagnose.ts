import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pnntoicdocixeajhoyai.supabase.co';
const supabaseAdminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubnRvaWNkb2NpeGVhamhveWFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEyOTEzNSwiZXhwIjoyMDgxNzA1MTM1fQ.TzW5ITvkM9ZqBYmJnbUwQQ4tv71Px99qhWR6m7pkcTc';

const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function runTargetedDiagnosis() {
  const targetPid = 'f216ce59-810c-4719-bd3e-d02ca31fae0e'; // Optica Bassol
  console.log(`--- DIAGNÓSTICO DETALLADO: OPTICA BASSOL (${targetPid}) ---`);

  // 1. GSC Examples (impressions_gsc > 0)
  console.log("\n[1] MUESTRA GSC (TOP 100 POR IMPRESIONES)");
  const { data: gscData } = await supabase.from('project_urls')
    .select('*')
    .eq('project_id', targetPid)
    .gt('impressions_gsc', 0)
    .order('impressions_gsc', { ascending: false })
    .limit(10); // Display 10 for log brevity but I'll check count
    
  const { count: gscCount } = await supabase.from('project_urls')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', targetPid)
    .gt('impressions_gsc', 0);

  console.log(`Total URLs GSC encontradas: ${gscCount}`);
  console.log(JSON.stringify(gscData, null, 2));

  // 2. CSV Examples (with category)
  console.log("\n[2] MUESTRA CSV (TOP 100 CON CATEGORÍA)");
  const { data: csvData } = await supabase.from('project_urls')
    .select('*')
    .eq('project_id', targetPid)
    .not('category', 'is', null)
    .limit(10);
    
  const { count: csvCount } = await supabase.from('project_urls')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', targetPid)
    .not('category', 'is', null);

  console.log(`Total URLs CSV encontradas: ${csvCount}`);
  console.log(JSON.stringify(csvData, null, 2));
}

runTargetedDiagnosis();
