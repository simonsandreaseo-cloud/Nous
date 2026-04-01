const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, 'nous_2.0/src/components/contents/ContentsLayout.tsx');
let layoutCode = fs.readFileSync(layoutPath, 'utf8');

layoutCode = layoutCode.replace(
    /onToolSelect=\{handleToolSelect\}/g,
    `onToolSelect={onToolSelect}`
);

fs.writeFileSync(layoutPath, layoutCode);
console.log("Replacing handleToolSelect back with onToolSelect in DashboardViewWithViewMode props...");
