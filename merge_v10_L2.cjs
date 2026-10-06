const fs = require('fs');

let finalContent = '';
for (let i = 0; i < 8; i++) {
    const part = fs.readFileSync(`v10_p${i}_L2.txt`, 'utf8');
    finalContent += part;
}

fs.writeFileSync('v10_final_L2.html', finalContent);
console.log('Merged successfully. Length:', finalContent.length);
