const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'latest_base.html'), 'utf8');
const lines = content.split('\n');

const chunks = [];
lines.forEach((line, index) => {
    const isP = line.startsWith('<p>');
    const isLi = line.startsWith('  <li>') || line.startsWith('<li>');
    if ((isP || isLi) && !line.includes('[*')) {
        const text = line.replace(/<[^>]+>/g, '').trim();
        const words = text.split(/\s+/).filter(Boolean);
        chunks.push({
            lineNumber: index + 1,
            tag: isP ? 'p' : 'li',
            wordCount: words.length,
            maxAllowedDist: Math.floor(words.length * 0.049), // strictly < 5%
            lineContent: line
        });
    }
});

fs.writeFileSync(path.join(__dirname, 'chunks_info.json'), JSON.stringify(chunks, null, 2), 'utf8');
console.log('Total editable chunks:', chunks.length);
