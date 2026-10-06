const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'latest_base.html');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.startsWith('<p>') && !line.includes('[*')) {
    const textOnly = line.replace(/<[^>]+>/g, '').trim();
    const words = textOnly.split(/\s+/).filter(Boolean);
    const maxAllowedEdits = Math.floor(words.length * 0.049); // strictly < 5%
    console.log(`Line ${i+1}: words=${words.length}, maxWordsToChange=${maxAllowedEdits} (<5% is ${(words.length * 0.05).toFixed(2)})`);
    console.log(`   Text: ${textOnly.slice(0, 70)}...`);
  }
});
