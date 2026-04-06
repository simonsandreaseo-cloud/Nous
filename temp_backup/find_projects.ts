import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pnntoicdocixeajhoyai.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubnRvaWNkb2NpeGVhamhveWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMjkxMzUsImV4cCI6MjA4MTcwNTEzNX0.Qtp87eokaTpxgw5rbc8oqZe2UBe41Uy2Otb6HNvSXbU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findProjects() {
  const { data, error } = await supabase.from('projects').select('id, name, domain').limit(10);
  if (error) {
    console.error(error);
    return;
  }
  console.log("PROYECTOS ENCONTRADOS:");
  console.log(JSON.stringify(data, null, 2));
}

findProjects();
