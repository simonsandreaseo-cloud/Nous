const fs = require('fs');
const path = require('path');

const sidebarPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterSidebar.tsx');
let sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

sidebarCode = sidebarCode.replace(
    /onPlanStructure=\{handlePlanStructure\} isPlanning=\{store\.isPlanningStructure\} \/>;/g,
    `/>; // Removed onPlanStructure from SEOTab since it isn't defined there.`
);

fs.writeFileSync(sidebarPath, sidebarCode);
console.log("Fixed WriterSidebar.tsx");
