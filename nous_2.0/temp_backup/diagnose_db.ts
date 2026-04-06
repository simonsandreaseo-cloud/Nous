import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pnntoicdocixeajhoyai.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubnRvaWNkb2NpeGVhamhveWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMjkxMzUsImV4cCI6MjA4MTcwNTEzNX0.Qtp87eokaTpxgw5rbc8oqZe2UBe41Uy2Otb6HNvSXbU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnosis() {
  console.log("--- DIAGNÓSTICO SUPABASE: INVENTARIO (DETALLADO) ---");
  
  // 1. Mostrar 5 ejemplos de URLs sincronizadas por GSC (donde impressions_gsc > 0)
  console.log("\n1. EJEMPLOS GSC (CON IMPRESIONES)");
  const { data: gscData, error: e1 } = await supabase.from('project_urls')
    .select('*')
    .gt('impressions_gsc', 0)
    .limit(5);
  
  if (e1) console.error("Error GSC:", e1.message);
  else console.log(JSON.stringify(gscData, null, 2));

  // 2. Mostrar 5 ejemplos de URLs subidas por CSV (buscamos las que tengan 'category')
  console.log("\n2. EJEMPLOS CSV (CON CATEGORÍA)");
  const { data: csvData, error: e2 } = await supabase.from('project_urls')
    .select('*')
    .not('category', 'is', null)
    .limit(5);

  if (e2) console.error("Error CSV:", e2.message);
  else console.log(JSON.stringify(csvData, null, 2));

  // 3. Resumen de columnas disponibles en la tabla
  const { data: columns } = await supabase.from('project_urls').select('*').limit(1);
  if (columns && columns.length > 0) {
    console.log("\n3. ESQUEMA DE TABLA (COLUMNAS):");
    console.log(Object.keys(columns[0]).join(', '));
  }
}

runDiagnosis();
