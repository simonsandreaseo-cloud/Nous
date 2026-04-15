import React, { useState } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, PlusCircle, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function FloatingOutlineUI() {
    const { strategyOutline, editor } = useWriterStore();
    const [isOpen, setIsOpen] = useState(false);

    if (!strategyOutline || strategyOutline.length === 0) return null;

    const handleInsert = (item: any) => {
        if (!editor) return;
        const level = item.type === 'H1' ? 1 : item.type === 'H3' ? 3 : item.type === 'H4' ? 4 : 2;
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
                                <div key={idx} className="snap-center shrink-0 w-[240px] bg-white border border-slate-200 rounded-[16px] p-4 flex flex-col shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-orange-50 text-orange-600 rounded">
                                            {item.type}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">Pautas: {item.wordCount || 0} p</span>
                                    </div>
                                    <h4 className="text-[13px] font-bold text-slate-700 leading-snug line-clamp-3 mb-4 flex-1">
                                        {item.text}
                                    </h4>
                                    <button 
                                        onClick={() => handleInsert(item)}
                                        className="w-full flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-orange-500 hover:text-white text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors group"
                                    >
                                        <PlusCircle size={14} className="group-hover:rotate-90 transition-transform" />
                                        Insertar al final
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}