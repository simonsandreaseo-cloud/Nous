const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'latest_base.html');
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);
lines.forEach((l, idx) => {
    const isP = l.startsWith('<p>');
    const isLi = l.startsWith('  <li>') || l.startsWith('<li>');
    const isTd = l.startsWith('      <td>') || l.startsWith('<td>');
    if (isP || isLi) {
        const text = l.replace(/<[^>]+>/g, '').trim();
        const words = text.split(/\s+/).filter(Boolean);
        const maxDist = Math.floor(words.length * 0.049); // strict < 5%
        console.log(`Line ${idx + 1} [${isP ? 'p' : 'li'}] (${words.length}w, maxEdit=${maxDist}): ${text.substring(0, 80)}...`);
    }
});
