const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'nous_2.0/src/app/settings/page.tsx');
let code = fs.readFileSync(targetPath, 'utf8');

code = code.replace(
    /router\.replace\('\/settings'\);/g,
    `window.history.replaceState({}, '', window.location.pathname);`
);

fs.writeFileSync(targetPath, code);
console.log("Fixed router error");
