const fs = require('fs');
const path = require('path');

const sidebarPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterSidebar.tsx');
let sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

sidebarCode = sidebarCode.replace(
    /<ResearchTab \/>;/g,
    `<ResearchTab onPlanStructure={handlePlanStructure} isPlanning={store.isPlanningStructure} />;`
);

fs.writeFileSync(sidebarPath, sidebarCode);
console.log("Fixed ResearchTab in WriterSidebar");
