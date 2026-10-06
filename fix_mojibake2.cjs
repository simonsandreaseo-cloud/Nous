const map = {
  '\u00C3\u00A1': 'á',
  '\u00C3\u00A9': 'é',
  '\u00C3\u00AD': 'í',
  '\u00C3\u00B3': 'ó',
  '\u00C3\u00BA': 'ú',
  '\u00C3\u00B1': 'ñ',
  '\u00C3\u0091': 'Ñ', // U+0091 is control character? Wait, \u2018 is ‘
  '\u00C2\u00BF': '¿',
  '\u00C2\u00A1': '¡',
  '\u00C3\u00BC': 'ü',
  '\u00C3\u009C': 'Ü', // U+0153 ?

  // cp1252 replacements for 80-9F:
  '\u00C3\u0081': 'Á', // If 81 stays as 81
  '\u00C3\u2030': 'É', // 89 -> U+2030 (‰)
  '\u00C3\u008D': 'Í', // 8D
  '\u00C3\u201C': 'Ó', // 93 -> U+201C (“)
  '\u00C3\u0161': 'Ú', // 9A -> U+0161 (š)
  '\u00C3\u2018': 'Ñ', // 91 -> U+2018 (‘)
  '\u00C3\u0153': 'Ü'  // 9C -> U+0153 (œ)
};

console.log(map);

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    for (const [mojibake, correct] of Object.entries(map)) {
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
