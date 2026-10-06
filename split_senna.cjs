const fs = require('fs');
const content = fs.readFileSync('senna_v8.txt', 'utf8');

// split by <h2>
const parts = content.split(/(?=<h2>)/);

console.log(`Split into ${parts.length} parts.`);
for (let i = 0; i < parts.length; i++) {
    fs.writeFileSync(`senna_p${i}.txt`, parts[i]);
    console.log(`Part ${i} length: ${parts[i].length} chars.`);
}
