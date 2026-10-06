const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listPorMaquetar() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, h1, status, refs, associated_url')
    .eq('status', 'por_maquetar')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Found ${tasks.length} tasks in status 'por_maquetar':\n`);
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const { data: vers } = await supabase
      .from('task_versions')
      .select('id, process_name, created_at')
      .eq('task_id', t.id)
      .order('created_at', { ascending: false });

    const hasPulida = vers.some(v => v.process_name === 'Version pulida');
    const latestVer = vers[0] ? vers[0].process_name : 'NONE';
    console.log(`${i + 1}. [${t.id}] "${t.title}"`);
    console.log(`   Refs: ${JSON.stringify(t.refs)}`);
    console.log(`   Latest Version: ${latestVer} | Has 'Version pulida': ${hasPulida}`);
  }
}

listPorMaquetar();
