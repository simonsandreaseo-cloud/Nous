const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

function auditHtml(html) {
  const issues = [];
  // 1. Check emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{231A}-\u{23FA}\u{FE0F}]/gu;
  const emojis = html.match(emojiRegex);
  if (emojis) issues.push(`Found emojis: ${[...new Set(emojis)].join(' ')}`);

  // 2. Check nested <p> in <li>, <th>, <td>
  if (/<(li|th|td)[^>]*>\s*<p>/i.test(html)) {
    issues.push('Found nested <p> inside <li>, <th>, or <td>');
  }

  // 3. Check empty <ul> or <li>
  if (/<li[^>]*>\s*<\/li>/i.test(html) || /<ul[^>]*>\s*<\/ul>/i.test(html)) {
    issues.push('Found empty <li> or <ul>');
  }

  // 4. Check slug headers (e.g. <h3>foo-bar: )
  const headers = html.match(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi) || [];
  for (const h of headers) {
    const text = h.replace(/<[^>]+>/g, '').trim();
    if (/^[a-z0-9]+-[a-z0-9-]+:/i.test(text)) {
      issues.push(`Found slug-formatted header: ${text}`);
    }
  }

  // 5. Check Mojibake
  if (/Ã¡|Ã©|Ã­|Ã³|Ãº|Ã±|Ã¼|Â¿|Â¡|â€œ|â€|â€™/.test(html)) {
    issues.push('Found potential Mojibake characters');
  }

  return issues;
}

async function run() {
  const [taskId, filePath] = process.argv.slice(2);
  if (!taskId || !filePath) {
    console.error('Usage: node upload_and_verify_polished.cjs <taskId> <filePath>');
    process.exit(1);
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const issues = auditHtml(html);
  if (issues.length > 0) {
    console.error('❌ AUDIT FAILED BEFORE UPLOAD:');
    for (const iss of issues) console.error('  - ' + iss);
    process.exit(1);
  }

  console.log('✅ HTML Audit passed (0 emojis, 0 nested <p> in <li>/<td>/<th>, 0 empty lists, 0 slug headers, 0 mojibake)');

  // Check if a 'Version pulida' already exists for this taskId, update or insert
  const { data: existing } = await supabase
    .from('task_versions')
    .select('id')
    .eq('task_id', taskId)
    .eq('process_name', 'Version pulida');

  if (existing && existing.length > 0) {
    const { data, error } = await supabase
      .from('task_versions')
      .update({ content_body: html, ai_model: 'gemini-1.5-pro' })
      .eq('id', existing[0].id)
      .select();
    if (error) {
      console.error('Update error:', error);
      process.exit(1);
    }
    console.log(`✅ Updated existing 'Version pulida' (${data[0].id}) for task ${taskId} (${html.length} chars)`);
  } else {
    const { data, error } = await supabase
      .from('task_versions')
      .insert([{
        task_id: taskId,
        process_name: 'Version pulida',
        content_body: html,
        ai_model: 'gemini-1.5-pro'
      }])
      .select();
    if (error) {
      console.error('Insert error:', error);
      process.exit(1);
    }
    console.log(`✅ Inserted new 'Version pulida' (${data[0].id}) for task ${taskId} (${html.length} chars)`);
  }
}

run();
