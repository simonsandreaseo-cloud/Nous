const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

// Universal Mojibake Decoder (for safety)
const cp1252ToChar = new Array(256);
for (let i = 0; i < 256; i++) { cp1252ToChar[i] = String.fromCharCode(i); }
const overrides = {
  0x80: '\u20AC', 0x81: '\u0081', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E', 0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021',
  0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160', 0x8B: '\u2039', 0x8C: '\u0152', 0x8D: '\u008D', 0x8E: '\u017D', 0x8F: '\u008F',
  0x90: '\u0090', 0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
  0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153', 0x9D: '\u009D', 0x9E: '\u017E', 0x9F: '\u0178'
};
for (const [k, v] of Object.entries(overrides)) { cp1252ToChar[k] = v; }
const charToCp1252 = {};
for (let i = 0; i < 256; i++) { charToCp1252[cp1252ToChar[i]] = i; }
function getCharClass(start, end) {
  let chars = '';
  for (let i = start; i <= end; i++) {
    const char = cp1252ToChar[i];
    if (char === '-' || char === '\\' || char === ']' || char === '^') chars += '\\' + char;
    else chars += char;
  }
  return '[' + chars + ']';
}
const regexStr = 
  '(' + getCharClass(0xC2, 0xDF) + getCharClass(0x80, 0xBF) + ')|' +
  '(' + getCharClass(0xE0, 0xE0) + getCharClass(0xA0, 0xBF) + getCharClass(0x80, 0xBF) + ')|' +
  '(' + getCharClass(0xE1, 0xEC) + getCharClass(0x80, 0xBF) + '{2})|' +
  '(' + getCharClass(0xED, 0xED) + getCharClass(0x80, 0x9F) + getCharClass(0x80, 0xBF) + ')|' +
  '(' + getCharClass(0xEE, 0xEF) + getCharClass(0x80, 0xBF) + '{2})|' +
  '(' + getCharClass(0xF0, 0xF0) + getCharClass(0x90, 0xBF) + getCharClass(0x80, 0xBF) + '{2})|' +
  '(' + getCharClass(0xF1, 0xF3) + getCharClass(0x80, 0xBF) + '{3})|' +
  '(' + getCharClass(0xF4, 0xF4) + getCharClass(0x80, 0x8F) + getCharClass(0x80, 0xBF) + '{2})';
const mojibakeRegex = new RegExp(regexStr, 'g');
function decodeMojibake(match) {
  const bytes = [];
  for (let i = 0; i < match.length; i++) { bytes.push(charToCp1252[match[i]]); }
  return Buffer.from(bytes).toString('utf8');
}

async function uploadAllPass3() {
  const dir = 'C:/Users/Simon San/.gemini/antigravity/brain/6474e280-c05b-40c4-9eb2-31621027da68/scratch/tasks';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('_clean_pass3.html'));
  
  if (files.length === 0) {
    console.log('No pass 3 files found to upload.');
    return;
  }
  
  console.log(`Found ${files.length} pass 3 files. Uploading...`);
  
  let successCount = 0;
  for (const file of files) {
    // Extract task ID (assuming format is task-id_clean_pass3.html)
    const taskId = file.replace('_clean_pass3.html', '');
    const filePath = path.join(dir, file);
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Apply universal mojibake fix just in case the subagent corrupted it again
    const originalContent = content;
    content = content.replace(mojibakeRegex, decodeMojibake);
    if (content !== originalContent) {
      console.log(`[!] Fixed mojibake in ${file} before uploading.`);
    }
    
    const { error } = await supabase.rpc('save_task_version', {
      p_task_id: taskId,
      p_process_name: 'Prueba con Antigravity - Tercera Pasada',
      p_content_body: content
    });

    if (error) {
      console.error(`Error uploading ${file}:`, error);
    } else {
      console.log(`Uploaded ${file}`);
      successCount++;
    }
  }
  
  console.log(`Successfully uploaded ${successCount} out of ${files.length} files.`);
}

uploadAllPass3().then(() => process.exit(0));
