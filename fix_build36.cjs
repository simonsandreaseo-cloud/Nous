const fs = require('fs');
const path = require('path');

const processorPath = path.join(__dirname, 'nous_2.0/src/lib/services/writer/html-processor.ts');
let processorCode = fs.readFileSync(processorPath, 'utf8');

processorCode = processorCode.replace(
    /\|\| i\.type === 'page'/g,
    `|| i.type === 'static' || i.type === 'blog'`
);

fs.writeFileSync(processorPath, processorCode);
console.log("Fixed page overlap in html-processor");
