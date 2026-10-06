const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'latest_base.html');
const content = fs.readFileSync(filePath, 'utf-8');

const regex = /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>[\s\S]*?<\/p>|<li[^>]*>[\s\S]*?<\/li>|<blockquote[^>]*>[\s\S]*?<\/blockquote>|<th[^>]*>[\s\S]*?<\/th>|<td[^>]*>[\s\S]*?<\/td>)/gi;

const blocks = [];
let m;
while ((m = regex.exec(content)) !== null) {
  blocks.push(m[0]);
}

const report = blocks.map((b, i) => {
  const plain = b.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plain.split(' ').filter(Boolean).length;
  return `--- CHUNK ${i} (${wordCount} words) ---\nRAW: ${b}\nPLAIN: ${plain}\n`;
}).join('\n');

fs.writeFileSync(path.join(__dirname, 'chunks.txt'), report, 'utf-8');
console.log('Saved', blocks.length, 'chunks to chunks.txt');
