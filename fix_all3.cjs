const fs = require('fs');
const path = require('path');

const writerStudioPath = path.join(__dirname, 'nous_2.0/src/app/studio/writer/WriterStudio.tsx');
let wCode = fs.readFileSync(writerStudioPath, 'utf8');

// I replaced too much or missed closing tags. Let's fix the header carefully.
wCode = wCode.replace(
    /<span className="text-indigo-400">\{keyword \|\| "Nuevo"\}<\/span>\n                            <\/div>\n                            <h1 className="text-\[13px\] font-bold text-slate-800 tracking-tight truncate max-w-\[300px\] leading-tight">\n                                \{strategyH1 \|\| keyword \|\| "Sin título"\}\n                            <\/h1>/g,
    `<span>Redactor</span>
                                <span className="text-slate-200">/</span>
                                <span className="text-indigo-400">{keyword || "Nuevo"}</span>
                            </div>
                            <h1 className="text-[13px] font-bold text-slate-800 tracking-tight truncate max-w-[300px] leading-tight">
                                {strategyH1 || keyword || "Sin título"}
                            </h1>`
);

fs.writeFileSync(writerStudioPath, wCode);
console.log("Restored tags");
