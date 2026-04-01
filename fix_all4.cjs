const fs = require('fs');
const path = require('path');

const writerStudioPath = path.join(__dirname, 'nous_2.0/src/app/studio/writer/WriterStudio.tsx');
let wCode = fs.readFileSync(writerStudioPath, 'utf8');

// The replacement was totally broken, let's just rewrite the whole header to avoid trailing fragments.

const headerStart = wCode.indexOf('<header');
const headerEnd = wCode.indexOf('</header>') + 9;
const newHeader = `
                {/* Header / Toolkit */}
                <header className="h-16 border-b border-hairline flex items-center justify-between px-8 bg-white/40 backdrop-blur-md z-10 sticky top-0 shrink-0">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewMode('dashboard')}
                            className="h-8 px-3 rounded-lg text-[10px] uppercase font-black border-slate-200"
                        >
                            Salir
                        </Button>
                        <div className="w-[1px] h-4 bg-slate-100" />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none">
                                <span>Contenidos</span>
                                <span className="text-slate-200">/</span>
                                <span>Redactor</span>
                                <span className="text-slate-200">/</span>
                                <span className="text-indigo-400">{keyword || "Nuevo"}</span>
                            </div>
                            <h1 className="text-[13px] font-bold text-slate-800 tracking-tight truncate max-w-[300px] leading-tight">
                                {strategyH1 || keyword || "Sin título"}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <div className={cn(
                                "text-[10px] font-bold uppercase tracking-wider transition-colors",
                                isSaving ? "text-indigo-500 animate-pulse" : "text-slate-400"
                            )}>
                                {isSaving ? "Sincronizando..." : draftId ? "Guardado en la nube" : "Borrador Local"}
                            </div>
                            <div className="text-[9px] text-slate-300 font-medium">
                                {lastSaved ? \`Hace un momento\` : "Sin cambios guardados"}
                            </div>
                        </div>

                        <div className="w-[1px] h-6 bg-slate-100 mx-1" />

                        <button
                            onClick={toggleSidebar}
                            className={cn(
                                "p-2.5 rounded-xl transition-all duration-300 border border-transparent hover:bg-slate-100/50",
                                isSidebarOpen ? "text-indigo-600 bg-indigo-50/50 border-indigo-100" : "text-slate-400"
                            )}
                            title={isSidebarOpen ? "Modo Zen" : "Modo 50/50"}
                        >
                            <LayoutTemplate size={20} />
                        </button>
                    </div>
                </header>
`;

wCode = wCode.slice(0, headerStart) + newHeader.trim() + wCode.slice(headerEnd);

fs.writeFileSync(writerStudioPath, wCode);
console.log("Rewrote header block cleanly");

// Fix editor syntax properly, because earlier fix broke it
const editorPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterEditor.tsx');
let eCode = fs.readFileSync(editorPath, 'utf8');

// Remove extra closing divs that I injected
eCode = eCode.replace(/<\/div><\/div>\{\/\* AGENTE NOUS - ORBE FLOTANTE \*\/\}/g, `</div>{/* AGENTE NOUS - ORBE FLOTANTE */}`);
fs.writeFileSync(editorPath, eCode);
