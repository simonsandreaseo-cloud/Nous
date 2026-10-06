const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/221fa0a0-3a5c-493f-bd49-3f29dc8ef721';
const html = fs.readFileSync(path.join(dir, 'latest_base.html'), 'utf8');

const tableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
const tables = [];
const blindedHtml = html.replace(tableRegex, (m) => {
  tables.push(m);
  return '[[ATOMIC_BLOCK_' + (tables.length - 1) + ']]';
});

const boundaryRegex = /(?=<h[1-6]\b[^>]*>|<p\b[^>]*>|<ul\b[^>]*>|<ol\b[^>]*>|<li\b[^>]*>|<div\b[^>]*>|<table\b[^>]*>|<blockquote\b[^>]*>|\[\[ATOMIC_BLOCK_\d+\]\])/gi;
const blocks = blindedHtml.split(boundaryRegex).filter(b => b.trim().length > 0);

let out = '--- BLOCKS DUMP ---\n';
blocks.forEach((b, i) => {
  const textOnly = b.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = textOnly.split(/\s+/).filter(Boolean);
  out += `\n=== BLOCK ${i+1} (${words.length} words) ===\n${b}\n`;
});

fs.writeFileSync(path.join(dir, 'blocks_dump.txt'), out, 'utf8');
console.log('Saved blocks_dump.txt in UTF-8');
