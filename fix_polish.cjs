const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterEditor.tsx');
let code = fs.readFileSync(editorPath, 'utf8');

// The "Modo Código" button at the top right of the editor looks out of place inside the prose container.
// Also the tab switcher for Visual / Código HTML is there. We should make it look more elegant.

code = code.replace(
    /<div className="flex items-center gap-1 mb-8 p-1 bg-slate-100 rounded-xl w-fit mx-auto shadow-inner border border-slate-200\/50">/g,
    `<div className="flex items-center gap-1 mb-10 p-1.5 bg-slate-50 rounded-2xl w-fit mx-auto shadow-inner border border-slate-100/80">`
);

code = code.replace(
    /className=\{cn\(\n\s*"px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",\n\s*activeTab === 'visual' \? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"\n\s*\)\}/g,
    `className={cn(
                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'visual' ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50" : "text-slate-400 hover:text-slate-600"
                    )}`
);

code = code.replace(
    /className=\{cn\(\n\s*"px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",\n\s*activeTab === 'html' \? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"\n\s*\)\}/g,
    `className={cn(
                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'html' ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50" : "text-slate-400 hover:text-slate-600"
                    )}`
);


// The "Modo Código" absolute positioned div at the bottom of the HTML view block
code = code.replace(
    /<div className="absolute top-4 right-4 bg-slate-800 text-\[10px\] text-slate-400 px-2 py-1 rounded border border-slate-700 font-bold tracking-widest uppercase">\n\s*Modo Código\n\s*<\/div>\n\s*<\/div>/g,
    `</div>` // We just remove it because the top switcher is clear enough
);

fs.writeFileSync(editorPath, code);
console.log("Polished WriterEditor UI");
