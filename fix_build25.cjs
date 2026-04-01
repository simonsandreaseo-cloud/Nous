const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'nous_2.0/src/components/contents/ArticleTable.tsx');
let code = fs.readFileSync(targetPath, 'utf8');

code = code.replace(
    /\{article\.cluster && <p className="text-\[10px\] text-slate-400 mt-0\.5">\{article\.cluster\}<\/p>\}/g,
    `{/* cluster omitted */}`
);

fs.writeFileSync(targetPath, code);
console.log("Fixed ArticleTable");
