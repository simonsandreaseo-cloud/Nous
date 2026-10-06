const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

function auditHtml(html, baseHtml, label) {
  const issues = [];
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{231A}-\u{23FA}\u{FE0F}]/gu;
  const emojis = html.match(emojiRegex);
  if (emojis) issues.push(`[${label}] Found emojis: ${[...new Set(emojis)].join(' ')}`);

  if (/<(li|th|td)[^>]*>\s*<p>/i.test(html)) {
    issues.push(`[${label}] Found nested <p> inside <li>, <th>, or <td>`);
  }

  if (/Ã¡|Ã©|Ã­|Ã³|Ãº|Ã±|Ã¼|Â¿|Â¡|â€œ|â€|â€™|\uFFFD/.test(html)) {
    issues.push(`[${label}] Found Mojibake characters`);
  }

  // Verify shortcodes [*...*] match baseHtml
  const baseShortcodes = (baseHtml.match(/\[\*\d+\*\]/g) || []).sort();
  const curShortcodes = (html.match(/\[\*\d+\*\]/g) || []).sort();
  if (JSON.stringify(baseShortcodes) !== JSON.stringify(curShortcodes)) {
    issues.push(`[${label}] Shortcodes mismatch! Expected ${baseShortcodes.join(',')} but got ${curShortcodes.join(',')}`);
  }

  // Verify tag counts match baseHtml
  for (const tag of ['h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'table', 'tr', 'a']) {
    const bCount = (baseHtml.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
    const cCount = (html.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
    if (bCount !== cCount) {
      issues.push(`[${label}] Tag <${tag}> count mismatch: base=${bCount}, current=${cCount}`);
    }
  }

  return issues;
}

async function upsertVersion(taskId, processName, html) {
  const { data: existing } = await supabase
    .from('task_versions')
    .select('id')
    .eq('task_id', taskId)
    .eq('process_name', processName);

  if (existing && existing.length > 0) {
    const { data, error } = await supabase
      .from('task_versions')
      .update({ content_body: html, ai_model: 'gemini-1.5-pro' })
      .eq('id', existing[0].id)
      .select('id, process_name, created_at');
    if (error) throw error;
    console.log(`✅ Updated '${processName}' (${data[0].id}) | ${html.length} chars`);
  } else {
    const { data, error } = await supabase
      .from('task_versions')
      .insert([{
        task_id: taskId,
        process_name: processName,
        content_body: html,
        ai_model: 'gemini-1.5-pro'
      }])
      .select('id, process_name, created_at');
    if (error) throw error;
    console.log(`✅ Inserted '${processName}' (${data[0].id}) | ${html.length} chars`);
  }
}

async function run() {
  const [taskId, baseFile, pass1File, pass2File] = process.argv.slice(2);
  if (!taskId || !baseFile || !pass1File || !pass2File) {
    console.error('Usage: node upload_humanized_pair.cjs <taskId> <baseFile> <pass1File> <pass2File>');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(baseFile, 'utf8');
  const pass1Html = fs.readFileSync(pass1File, 'utf8');
  const pass2Html = fs.readFileSync(pass2File, 'utf8');

  const issues = [
    ...auditHtml(pass1Html, baseHtml, 'Pass 1'),
    ...auditHtml(pass2Html, baseHtml, 'Pass 2')
  ];

  if (issues.length > 0) {
    console.error('❌ AUDIT FAILED:');
    issues.forEach(i => console.error('  - ' + i));
    process.exit(1);
  }

  console.log(`✅ Structural & HTML Audit passed for Pass 1 (${pass1Html.length} chars) & Pass 2 (${pass2Html.length} chars) [Base: ${baseHtml.length} chars]`);
  await upsertVersion(taskId, 'Humanización (Pasada 1)', pass1Html);
  await new Promise(r => setTimeout(r, 1100));
  await upsertVersion(taskId, 'Humanización (Pasada 2)', pass2Html);
}

run();
