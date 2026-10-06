const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/221fa0a0-3a5c-493f-bd49-3f29dc8ef721';
const html = fs.readFileSync(path.join(dir, 'latest_base.html'), 'utf8');

const boundaryRegex = /(?=<h[1-6]\b[^>]*>|<p\b[^>]*>|<ul\b[^>]*>|<ol\b[^>]*>|<li\b[^>]*>|<div\b[^>]*>|<table\b[^>]*>|<blockquote\b[^>]*>|\[\[ATOMIC_BLOCK_\d+\]\])/gi;
const blocks = html.split(boundaryRegex).filter(b => b.trim().length > 0);

console.log('Total blocks:', blocks.length);
blocks.forEach((b, i) => {
  const tag = b.match(/^<([a-z0-9]+)/i)?.[1] || 'unknown';
  const text = b.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wc = text.split(/\s+/).filter(Boolean).length;
  console.log('Block ' + (i + 1) + ' <' + tag + '> (' + wc + ' words): ' + text.substring(0, 80));
});
