const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

const mojibakeMap = {
  '\xC3\xA1': 'á',
  '\xC3\xA9': 'é',
  '\xC3\xAD': 'í',
  '\xC3\xB3': 'ó',
  '\xC3\xBA': 'ú',
  '\xC3\xB1': 'ñ',
  '\xC3\x91': 'Ñ',
  '\xC2\xBF': '¿',
  '\xC2\xA1': '¡',
  '\xC3\xBC': 'ü',
  '\xC3\x9C': 'Ü',
  '\xC3\x81': 'Á',
  '\xC3\x89': 'É',
  '\xC3\x8D': 'Í',
  '\xC3\x93': 'Ó',
  '\xC3\x9A': 'Ú'
};

async function fixDB() {
  console.log('Fetching all records from task_versions...');
  const { data: rows, error } = await supabase
    .from('task_versions')
    .select('id, content_body, task_id, process_name');

  if (error) {
    console.error('Error fetching records:', error);
    process.exit(1);
  }

  let updatedCount = 0;

  for (const row of rows) {
    let original = row.content_body;
    if (!original) continue;

    let fixed = original;
    for (const [mojibake, correct] of Object.entries(mojibakeMap)) {
      fixed = fixed.split(mojibake).join(correct);
    }

    if (fixed !== original) {
      console.log(`Fixing row ID ${row.id} (Task ${row.task_id} - ${row.process_name})...`);
      const { error: updateError } = await supabase
        .from('task_versions')
        .update({ content_body: fixed })
        .eq('id', row.id);

      if (updateError) {
        console.error(`Failed to update row ${row.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Finished fixing. Updated ${updatedCount} rows.`);
}

fixDB().then(() => process.exit(0));
