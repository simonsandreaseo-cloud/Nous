const fs = require('fs');
const path = require('path');

const servicesPath = path.join(__dirname, 'nous_2.0/src/components/tools/writer/services.ts');
let servicesCode = fs.readFileSync(servicesPath, 'utf8');

servicesCode = servicesCode.replace(
    /\|\| i\.type === 'page'/g,
    `|| i.type === 'static' || i.type === 'blog'`
);

fs.writeFileSync(servicesPath, servicesCode);
console.log("Fixed page overlap");
