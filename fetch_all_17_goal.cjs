const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

const taskIds = [
  '9240d45b-6ad4-4c60-9e6f-cc5fa5314db9', // 01: Gucci Máscara Verano 2026
  '90e7075e-c0f3-4ff2-a6ba-85d1b98ff52b', // 02: Gafas de Bruja Halloween
  '221fa0a0-3a5c-493f-bd49-3f29dc8ef721', // 03: Carrera Sport Rendimiento
  'cf656e15-4e25-4356-b689-0f16c251ed86', // 04: Oliver Peoples Rendezvous Recall
  '49eee171-a092-458d-92a1-f23a78b502c0', // 05: Gucci Verano Hombre 2026
  'ea6f7a7e-ac92-4f50-9275-82ca988c9199', // 06: Etnia Barcelona Chroma
  '0413cb6f-ddd6-4a00-8e01-9f5d6f557e63', // 07: Zegna Hombre
  '45f890ea-4eeb-475a-ab7f-b8bb44a44f1d', // 08: Oakley Fortnite
  '99768edf-252f-451c-8445-f83fce602f53', // 09: Gucci Mujer Máscara
  'b2fb5d8e-b7e3-4925-b4ea-8bdc27840886', // 10: Gucci Geometric Black
  'b0f96960-2c9b-461e-b55f-ebe7a05d9b74', // 11: Prada Shadowplay
  '8d3376d0-f126-4cf8-a350-b216d51de15b', // 12: Dolce&Gabbana Campaña SS26
  '30801bdf-250d-4ead-9ae5-a3bdadabe9c8', // 13: Dolce&Gabbana Gafas de Sol SS26
  'a6744b8e-f841-4449-bb83-206daeb5eed0', // 14: Carrera Sport Envíos 17 Agosto
  '0a61cfac-05f8-4b12-bd58-3cd639fb4e3b', // 15: Carrera Ducati
  'debb4f5d-45aa-43d7-99c0-4f126468b9dc', // 16: Persol PO0202S Senna
  'b87a8b96-b614-444a-b952-f19cd6deb158'  // 17: Persol 714 Steve McQueen
];

async function fetchAll17() {
  if (!fs.existsSync('goal_17')) fs.mkdirSync('goal_17');
  const metadata = [];

  for (let i = 0; i < taskIds.length; i++) {
    const id = taskIds[i];
    const num = String(i + 1).padStart(2, '0');
    const { data: task } = await supabase.from('tasks').select('id, title, h1, refs, associated_url').eq('id', id).single();
    const { data: vers } = await supabase.from('task_versions').select('id, process_name, content_body').eq('task_id', id).order('created_at', { ascending: false }).limit(1);

    const content = vers[0].content_body;
    fs.writeFileSync(`goal_17/task_${num}_raw.html`, content, 'utf8');
    metadata.push({ num, id, title: task.title, refs: task.refs, associated_url: task.associated_url, latestVersion: vers[0].process_name });
    console.log(`Saved goal_17/task_${num}_raw.html (${content.length} bytes) - ${task.title}`);
  }

  fs.writeFileSync('goal_17/metadata.json', JSON.stringify(metadata, null, 2), 'utf8');
}

fetchAll17();
