const fs = require('fs');
const path = require('path');

const writerStudioPath = path.join(__dirname, 'nous_2.0/src/app/studio/writer/WriterStudio.tsx');
let wCode = fs.readFileSync(writerStudioPath, 'utf8');

// The `any` errors
wCode = wCode.replace(/let competitors: any\[\]/g, "let competitors: { url: string, content: string }[]");
wCode = wCode.replace(/competitors\.map\(\(comp: any,/g, "competitors.map((comp: { url: string, content: string },");

// Fix unused variables: lastSaved, keyword, strategyH1
// I need to use them in the header like we had originally! Oh, the prompt's layout code removed them?
wCode = wCode.replace(
    /<span>Redactor<\/span>/g,
    `<span className="text-indigo-400">{keyword || "Nuevo"}</span>
                            </div>
                            <h1 className="text-[13px] font-bold text-slate-800 tracking-tight truncate max-w-[300px] leading-tight">
                                {strategyH1 || keyword || "Sin título"}
                            </h1>`
);
wCode = wCode.replace(
    /\{isSaving \? "Sincronizando\.\.\." : draftId \? "Guardado en la nube" : "Borrador Local"\}/g,
    `{isSaving ? "Sincronizando..." : draftId ? "Guardado en la nube" : "Borrador Local"}
                            </div>
                            <div className="text-[9px] text-slate-300 font-medium">
                                {lastSaved ? \`Hace un momento\` : "Sin cambios guardados"}`
);

wCode = wCode.replace(
    /import \{ LayoutTemplate, PanelRight \} from 'lucide-react';/g,
    `import { LayoutTemplate } from 'lucide-react';`
);

fs.writeFileSync(writerStudioPath, wCode);

const editorPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterEditor.tsx');
let edCode = fs.readFileSync(editorPath, 'utf8');

// Fix syntax error at line 260
edCode = edCode.replace(/<\/div>\s*\{\/\* AGENTE NOUS - ORBE FLOTANTE \*\/\}/g, `</div></div>{/* AGENTE NOUS - ORBE FLOTANTE */}`);
fs.writeFileSync(editorPath, edCode);

console.log("Fixed unused vars and syntax in Editor");
