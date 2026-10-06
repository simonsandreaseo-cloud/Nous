const fs = require('fs');

let finalContent = '';
for (let i = 0; i < 8; i++) {
    const part = fs.readFileSync(`senna_p${i}_surgical.txt`, 'utf8');
    finalContent += part;
}

fs.writeFileSync('senna_final_surgical.html', finalContent);
console.log('Merged successfully. Length:', finalContent.length);
