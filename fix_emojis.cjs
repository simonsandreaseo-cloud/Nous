const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

const cp1252ToByte = {
  '\u20AC': 0x80, '\u0081': 0x81, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87,
  '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C, '\u008D': 0x8D, '\u017D': 0x8E, '\u008F': 0x8F,
  '\u0090': 0x90, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C, '\u009D': 0x9D, '\u017E': 0x9E, '\u0178': 0x9F
};

function fixEmojiMojibake(str) {
  // Emojis typically start with F0 9F in UTF-8.
  // In CP1252, F0 is \u00F0 (ð) and 9F is \u0178 (Ÿ).
  // They are followed by 2 more bytes in the 80-BF range.
  return str.replace(/\u00F0\u0178../g, (match) => {
    const bytes = [];
    for (let i = 0; i < match.length; i++) {
      const c = match[i];
      let b = cp1252ToByte[c];
      if (b === undefined) {
        b = c.charCodeAt(0);
      }
      bytes.push(b);
    }
    return Buffer.from(bytes).toString('utf8');
  });
}

async function fixDB() {
  console.log('Fetching all records from task_versions...');
  const { data: rows, error } = await supabase
    .from('task_versions')
    .select('id, content_body, task_id, process_name')
    .like('content_body', '%\u00F0\u0178%'); // filter rows that have the mojibake signature

  if (error) {
    console.error('Error fetching records:', error);
    process.exit(1);
  }

  let updatedCount = 0;
  console.log(`Found ${rows.length} rows with mojibake emojis.`);

  for (const row of rows) {
    let original = row.content_body;
    let fixed = fixEmojiMojibake(original);

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

  console.log(`Finished fixing emojis. Updated ${updatedCount} rows.`);
}

fixDB().then(() => process.exit(0));
