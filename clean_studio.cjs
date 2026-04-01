const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'nous_2.0/src/app/studio/writer/WriterStudio.tsx');
let wCode = fs.readFileSync(file, 'utf8');

// I see `// {/* Header / Toolkit */}` duplicated
wCode = wCode.replace(/\{\/\* Header \/ Toolkit \*\/\}\n\s*\{\/\* Header \/ Toolkit \*\/\}/g, `{/* Header / Toolkit */}`);

// Remove unused import WriterSidebar
wCode = wCode.replace(/import WriterSidebar from '@\/components\/studio\/writer\/WriterSidebar';\n/g, ``);

fs.writeFileSync(file, wCode);
console.log("Cleaned WriterStudio.tsx");
