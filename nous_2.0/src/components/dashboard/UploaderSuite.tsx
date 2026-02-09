"use client";

import { useState } from "react";
import {
    Upload,
    Link,
    FileText,
    Type,
    Plus,
    ChevronDown,
    Sparkles,
    Calendar,
    CheckCircle2,
    X,
    Layout
} from "lucide-react";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

export function UploaderSuite() {
    const [activeTab, setActiveTab] = useState<"paste" | "upload" | "links">("paste");
    const [content, setContent] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleProcess = () => {
        setIsProcessing(true);
        setTimeout(() => setIsProcessing(false), 2000);
    };

    return (
        <section className="bg-white/70 backdrop-blur-xl border border-white rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800">
                        <Upload size={20} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Neural Factory</h3>
                        <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Suite de Carga</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-cyan-100 flex items-center gap-2">
                        <Layout size={12} />
                        Layout Ready
                    </div>
                </div>
            </div>

            <div className="bg-slate-50/50 p-1.5 border border-slate-100/50 rounded-2xl flex items-center mb-6">
                {[
                    { id: 'paste', label: 'Smart Paste', icon: Type },
                    { id: 'upload', label: 'Bulk CSV/Doc', icon: FileText },
                    { id: 'links', label: 'Docs Sync', icon: Link },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                            activeTab === t.id ? "bg-white text-slate-900 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <AnimatePresence mode="wait">
                    {activeTab === 'paste' && (
                        <motion.div
                            key="paste"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 flex flex-col"
                        >
                            <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-6 relative group focus-within:ring-2 focus-within:ring-cyan-500/10 focus-within:border-cyan-200 transition-all overflow-hidden flex flex-col">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-100 transition-opacity">
                                    <Sparkles className="text-cyan-500" />
                                </div>
                                <textarea
                                    className="w-full flex-1 bg-transparent border-none p-0 text-sm leading-relaxed text-slate-600 focus:ring-0 resize-none font-mono focus:outline-none scrollbar-thin scrollbar-thumb-slate-200"
                                    placeholder="Pega el contenido aquí (mantiene headers, negritas y listas automáticamente)..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                                <div className="mt-4 flex items-center justify-between text-[9px] font-bold text-slate-300 uppercase tracking-widest font-mono">
                                    <span>{content.split(/\s+/).filter(Boolean).length} palabras</span>
                                    <span>Sincronizado</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'upload' && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[32px] bg-white/50 hover:bg-white hover:border-cyan-200 transition-all cursor-pointer group"
                        >
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-cyan-500 group-hover:scale-110 transition-all mb-4 shadow-sm">
                                <FileText size={24} />
                            </div>
                            <p className="text-sm font-bold text-slate-600">Suelta tus archivos aquí</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 font-mono">CSV para programación / DOCX para maquetación</p>
                        </motion.div>
                    )}

                    {activeTab === 'links' && (
                        <motion.div
                            key="links"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 flex flex-col gap-4"
                        >
                            <div className="p-6 bg-white border border-slate-100 rounded-3xl">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Link de Google Docs</label>
                                <div className="relative">
                                    <Link size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="https://docs.google.com/..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="p-5 bg-cyan-50/50 rounded-[24px] border border-cyan-100 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-cyan-600 shadow-sm">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-cyan-600 uppercase tracking-widest font-mono">Sincronización Periódica</p>
                                    <p className="text-xs font-bold text-slate-600 mt-0.5">El sistema revisará cambios cada 4 horas.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-10 grid grid-cols-4 gap-4">
                <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="col-span-3 h-16 bg-slate-900 rounded-[24px] text-white flex items-center justify-center gap-3 font-black text-sm tracking-[0.2em] group relative overflow-hidden shadow-2xl shadow-slate-900/10 active:scale-[0.98] transition-all"
                >
                    {isProcessing ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Plus size={18} className="text-cyan-400" />
                            PROGRAMAR CONTENIDO
                        </>
                    )}
                </button>
                <button className="h-16 bg-emerald-50 border border-emerald-100 rounded-[24px] flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-all" title="Programar ahora">
                    <CheckCircle2 size={24} />
                </button>
            </div>
        </section>
    );
}
