const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterEditor.tsx');
let code = fs.readFileSync(editorPath, 'utf8');

// I need to add state for the Orb menu and replace the `alert()`

const stateLogic = `
    const [isOrbOpen, setIsOrbOpen] = useState(false);
`;

code = code.replace(
    /const \[slashMenuPos, setSlashMenuPos\] = useState<\{ x: number, y: number \} \| null>\(null\);/g,
    `const [slashMenuPos, setSlashMenuPos] = useState<{ x: number, y: number } | null>(null);\n    const [isOrbOpen, setIsOrbOpen] = useState(false);`
);

const orbMenu = `
            {/* AGENTE NOUS - ORBE FLOTANTE Y MENÚ */}
            <div className="fixed bottom-8 right-8 z-[100]">
                {/* Menú Contextual (Popover) */}
                <AnimatePresence>
                    {isOrbOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-20 right-0 w-[320px] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[28px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Agente Nous</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Configuración de Escritura IA</p>
                                </div>
                                <button onClick={() => setIsOrbOpen(false)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* Tono de Voz */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tono de Voz</label>
                                    <select className="w-full text-[12px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400">
                                        <option>Profesional</option>
                                        <option>Casual</option>
                                        <option>Académico</option>
                                        <option>Persuasivo</option>
                                        <option>Humorístico</option>
                                    </select>
                                </div>

                                {/* Palabras Objetivo */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Longitud Objetivo</label>
                                    <select className="w-full text-[12px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400">
                                        <option>Corta (~800 palabras)</option>
                                        <option>Estándar (~1500 palabras)</option>
                                        <option>Larga (~2500 palabras)</option>
                                        <option>Pilar (>3500 palabras)</option>
                                    </select>
                                </div>

                                {/* Nivel de Creatividad */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-between">
                                        <span>Creatividad</span>
                                        <span className="text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Equilibrada</span>
                                    </label>
                                    <input type="range" min="1" max="100" defaultValue="50" className="w-full accent-indigo-500" />
                                    <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase tracking-wider mt-2">
                                        <span>Mín.</span>
                                        <span>Max.</span>
                                    </div>
                                </div>

                                <button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl py-3 font-black text-[11px] uppercase tracking-widest hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    Generar Artículo Completo
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Botón Orbe */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse" />
                    <button
                        onClick={() => setIsOrbOpen(!isOrbOpen)}
                        className={cn("relative w-16 h-16 backdrop-blur-xl border border-indigo-100 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500", isOrbOpen ? "bg-white scale-95" : "bg-white/80 hover:scale-105 active:scale-95")}
                    >
                        <div className={cn("bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-500", isOrbOpen ? "w-12 h-12" : "w-10 h-10")}>
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[spin_4s_linear_infinite]" />
                            <span className="text-white font-black relative z-10 transition-all duration-500" style={{ fontSize: isOrbOpen ? '18px' : '12px' }}>{isOrbOpen ? "✕" : "N"}</span>
                        </div>
                    </button>
                    {!isOrbOpen && (
                        <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Agente Nous
                        </div>
                    )}
                </div>
            </div>
`;

code = code.replace(
    /\{\/\* AGENTE NOUS - ORBE FLOTANTE \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\);\s*\}/,
    `${orbMenu}\n        </div>\n    );\n}`
);

// We need AnimatePresence and motion imported
if (!code.includes('import { motion, AnimatePresence } from "framer-motion"')) {
    code = `import { motion, AnimatePresence } from "framer-motion";\n` + code;
}

fs.writeFileSync(editorPath, code);
console.log("Replaced alert with proper Nous Contextual Menu in Orb");
