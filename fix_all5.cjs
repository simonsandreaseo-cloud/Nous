const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterEditor.tsx');
let eCode = fs.readFileSync(editorPath, 'utf8');

// I can see the `Modo Codigo` block wasn't closed properly.
// Let's rewrite it.
eCode = eCode.replace(
    /<div className="absolute top-4 right-4 bg-slate-800 text-\[10px\] text-slate-400 px-2 py-1 rounded border border-slate-700 font-bold tracking-widest uppercase">\n                    Modo Código\n                <\/div>\{\/\* AGENTE NOUS - ORBE FLOTANTE \*\/\}/g,
    `<div className="absolute top-4 right-4 bg-slate-800 text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-700 font-bold tracking-widest uppercase">
                    Modo Código
                </div>
            </div>
            {/* AGENTE NOUS - ORBE FLOTANTE */}`
);

fs.writeFileSync(editorPath, eCode);
console.log("Fixed Editor close div");
