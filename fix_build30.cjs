const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/SEOTab.tsx');
let code = fs.readFileSync(targetPath, 'utf8');

code = code.replace(
    /<pie size=\{12\} \/>/g,
    `<PieChart size={12} />`
);

fs.writeFileSync(targetPath, code);
console.log("Fixed pie chart case issue");
