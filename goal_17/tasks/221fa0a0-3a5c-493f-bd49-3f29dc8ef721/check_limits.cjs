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

console.log('Block summary:');
blocks.forEach((b, i) => {
  const isTag = b.match(/^<([a-z0-9]+)/i);
  const tag = isTag ? isTag[1] : (b.startsWith('[[') ? 'atomic' : 'text');
  const textOnly = b.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = textOnly.split(/\s+/).filter(Boolean);
  const limitWords = Math.floor(words.length * 0.05 - 0.00001); // strictly < 5%
  console.log(`[Chunk ${i + 1}] tag=<${tag}> words=${words.length} max_edits=${limitWords}`);
});
