import React, { useState } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, PlusCircle, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function FloatingOutlineUI() {
    const { strategyOutline, editor } = useWriterStore();
    const [isOpen, setIsOpen] = useState(false);

    if (!strategyOutline || strategyOutline.length === 0) {
        return null;
    }

    const handleInsert = (item: any) => {
        if (!editor) return;
        
        let level = 2;
        if (item.level) level = item.level;
        else if (item.type === 'H1') level = 1;
        else if (item.type === 'H3') level = 3;
        else if (item.type === 'H4') level = 4;
        
        editor.chain().focus().insertContent([
            { type: 'heading', attrs: { level }, content: [{ type: 'text', text: item.text }] },
            { type: 'paragraph' }
        ]).run();
    };

    return (
        <div className="absolute top-4 left-4 z-50 flex flex-col items-start pointer-events-none">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-black uppercase tracking-widest text-[11px] transition-all hover:scale-105"
            >
                {isOpen ? <X size={14} /> : <Menu size={14} />}
                Outline
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 10, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="pointer-events-auto mt-2 bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[24px] overflow-hidden max-w-lg w-[90vw]"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-orange-500" />
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800">Estructura del Contenido</h3>
                            </div>
                            <button className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                                <RefreshCw size={14} />
                            </button>
                        </div>
                        
                        <div className="p-4 flex gap-3 overflow-x-auto custom-scrollbar snap-x snap-mandatory">
                            {strategyOutline.map((item, idx) => (
                                <div key={idx} className="snap-center shrink-0 w-[280px] bg-white border border-slate-200 rounded-[16px] p-4 flex flex-col shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-orange-50 text-orange-600 rounded">
                                                {item.type || (item.level ? `H${item.level}` : 'H2')}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">{item.wordCount || 0} p</span>
                                        </div>
                                    </div>
                                    <h4 className="text-[13px] font-bold text-slate-700 leading-snug mb-3">
                                        {item.text}
                                    </h4>

                                    {(item.notes || item.instructions) && (
                                        <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Pautas</span>
                                            <p className="text-[11px] text-slate-600 leading-relaxed">{item.notes || item.instructions}</p>
                                        </div>
                                    )}

                                    {((item.lsi_targets || item.lsi_keywords || item.keywords) && (item.lsi_targets || item.lsi_keywords || item.keywords).length > 0) && (
                                        <div className="mb-3">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">LSI Sugeridas</span>
                                            <div className="flex flex-wrap gap-1">
                                                {(item.lsi_targets || item.lsi_keywords || item.keywords).map((kw: string, i: number) => (
                                                    <span key={i} className="text-[9px] font-medium bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(item.slang && item.slang.length > 0) && (
                                        <div className="mb-3">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Argot</span>
                                            <div className="flex flex-wrap gap-1">
                                                {item.slang.map((sl: string, i: number) => (
                                                    <span key={i} className="text-[9px] font-medium bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">
                                                        {sl}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(item.semantic_anchors && item.semantic_anchors.length > 0) && (
                                        <div className="mb-4">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Enlaces</span>
                                            <div className="flex flex-wrap gap-1">
                                                {item.semantic_anchors.map((an: string, i: number) => (
                                                    <span key={i} className="text-[9px] font-medium bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                                                        {an}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-2">
                                        <button 
                                            onClick={() => handleInsert(item)}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-orange-500 hover:text-white text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors group"
                                        >
                                            <PlusCircle size={14} className="group-hover:rotate-90 transition-transform" />
                                            Insertar al final
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}