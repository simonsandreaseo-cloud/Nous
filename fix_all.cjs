const fs = require('fs');
const path = require('path');

const writerStudioPath = path.join(__dirname, 'nous_2.0/src/app/studio/writer/WriterStudio.tsx');
let code = `
'use client';

import { useWriterStore } from '@/store/useWriterStore';
import WriterEditor from '@/components/studio/writer/WriterEditor';
import WriterDashboard from '@/components/studio/writer/WriterDashboard';
import { LayoutTemplate, PanelRight } from 'lucide-react';
import { Button } from '@/components/dom/Button';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export default function WriterStudio() {
    const {
        isSidebarOpen, toggleSidebar, isSaving, lastSaved,
        keyword, strategyH1, draftId, viewMode, setViewMode, rawSeoData
    } = useWriterStore();

    // ── DASHBOARD VIEW ──────────────────────────────────────
    if (viewMode === 'dashboard') {
        return <WriterDashboard />;
    }

    // Parse Competitors for 50/50 view
    let competitors: any[] = [];
    if (rawSeoData && rawSeoData.competitors) {
        competitors = rawSeoData.competitors;
    }

    // ── WORKSPACE VIEW (Zen / 50-50 Mode) ──────────────────────────────────────
    return (
        <div className="flex w-full h-full bg-transparent overflow-hidden">
            <main className="flex-1 flex flex-col min-w-0 glass-panel border-r-0 rounded-tl-3xl relative shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
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
                            </div>
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

                {/* Editor Area & Split View */}
                <div className="flex-1 overflow-hidden flex relative bg-white/20">

                    {/* Left Side: Zen Editor */}
                    <div className={cn(
                        "h-full overflow-y-auto custom-scrollbar transition-all duration-500 ease-[0.23,1,0.32,1]",
                        isSidebarOpen ? "w-1/2" : "w-full"
                    )}>
                        <div className={cn("mx-auto min-h-full transition-all duration-500 px-4 sm:px-8", isSidebarOpen ? "max-w-[700px]" : "max-w-4xl")}>
                            <WriterEditor />
                        </div>
                    </div>

                    {/* Right Side: Competitors / Research (50/50 Mode) */}
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "50%", opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                className="h-full bg-slate-50 flex flex-col overflow-hidden border-l border-slate-200/50 shadow-[inset_10px_0_20px_rgba(0,0,0,0.02)]"
                            >
                                <div className="px-8 py-5 border-b border-slate-200/50 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                        Fichas de Competidores
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 pl-4">Investigación en tiempo real para modo 50/50</p>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-50/50">
                                    {competitors.length > 0 ? competitors.map((comp: any, i: number) => (
                                        <div key={i} className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                            <a href={comp.url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 hover:underline break-all mb-4 block truncate px-3 py-1 bg-indigo-50 w-fit rounded-lg">
                                                {new URL(comp.url).hostname.replace('www.', '')}
                                            </a>
                                            <div className="prose prose-sm prose-slate max-w-none text-[13px] leading-relaxed line-clamp-[20] hover:line-clamp-none transition-all">
                                                {comp.content ? (
                                                    <div dangerouslySetInnerHTML={{ __html: comp.content.replace(/\\n/g, '<br/>') }} />
                                                ) : (
                                                    <span className="text-slate-400 italic font-medium">Contenido no extraíble / Protegido.</span>
                                                )}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[32px] m-4">
                                            <LayoutTemplate size={48} className="mb-4 opacity-20" />
                                            <p className="text-sm font-black uppercase tracking-widest text-slate-300">Modo Zen Activo</p>
                                            <p className="text-[11px] font-bold mt-2 text-center px-8 opacity-60">
                                                Genera un Briefing para poblar esta sección con la data de los top competidores extraída en tiempo real.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </main>
        </div>
    );
}
`;
fs.writeFileSync(writerStudioPath, code);

const editorPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterEditor.tsx');
let edCode = fs.readFileSync(editorPath, 'utf8');

const newStyles = `
                class: 'prose prose-lg prose-indigo focus:outline-none max-w-none min-h-[700px] pb-32 transition-all duration-500 mx-auto ' +
                       'prose-h1:text-4xl prose-h1:font-black prose-h1:text-slate-800 prose-h1:mb-8 prose-h1:tracking-tight ' +
                       'prose-h2:text-2xl prose-h2:font-extrabold prose-h2:text-slate-800 prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-100 ' +
                       'prose-h3:text-xl prose-h3:font-bold prose-h3:text-indigo-900 prose-h3:mt-8 prose-h3:mb-3 ' +
                       'prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-[17px] ' +
                       'prose-a:text-indigo-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline ' +
                       'prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic prose-blockquote:text-indigo-900',
`;
edCode = edCode.replace(
    /class: 'prose prose-lg prose-indigo focus:outline-none max-w-none min-h-\[500px\] pb-32 transition-all duration-500',/g,
    newStyles
);
edCode = edCode.replace(
    /placeholder: 'Escribe algo increíble... \(Teclea "\/" para comandos\)',/,
    `placeholder: 'Escribe algo increíble... (Teclea "/nous" para llamar a la IA o "/" para comandos)',`
);

const orbeFlotante = `
            {/* AGENTE NOUS - ORBE FLOTANTE */}
            <div className="fixed bottom-8 right-8 z-[100] group">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse" />
                <button
                    onClick={() => {
                        // Open Setup Modal or trigger AI command
                        alert("Agente Nous: Configuración rápida (Tono, Creatividad, Palabras) en desarrollo.");
                    }}
                    className="relative w-16 h-16 bg-white/80 backdrop-blur-xl border border-indigo-100 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300"
                >
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[spin_4s_linear_infinite]" />
                        <span className="text-white font-black text-xs relative z-10">N</span>
                    </div>
                </button>
                <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Agente Nous
                </div>
            </div>
`;
if(!edCode.includes("AGENTE NOUS")) {
    edCode = edCode.replace(/<\/div>\s*<\/div>\s*\);\s*\}\s*$/g, `${orbeFlotante}\n        </div>\n    );\n}`);
    fs.writeFileSync(editorPath, edCode);
}
console.log("Restored WriterStudio 50/50 and WriterEditor");
