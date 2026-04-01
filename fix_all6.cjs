const fs = require('fs');
const path = require('path');

const writerStudioPath = path.join(__dirname, 'nous_2.0/src/app/studio/writer/WriterStudio.tsx');
let wCode = fs.readFileSync(writerStudioPath, 'utf8');

wCode = wCode.replace(/let competitors: \{ url: string, content: string \}\[\]/g, "let competitors: { url: string, content?: string }[]");
wCode = wCode.replace(/competitors\.map\(\(comp: \{ url: string, content: string \},/g, "competitors.map((comp: { url: string, content?: string },");

fs.writeFileSync(writerStudioPath, wCode);
console.log("Fixed compiler error");
