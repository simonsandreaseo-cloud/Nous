'use client';
import { useWriterStore, StrategyOutlineItem } from '@/store/useWriterStore';
import { cn } from '@/utils/cn';
import { useState, useEffect, useCallback } from 'react';
import {
    FileText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
    Plus, Sparkles, Target, AlertCircle, PlusCircle, Trash2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface OutlineEditorPanelProps {
    /** The plain text content of the editor (for active section detection) */
    editorText?: string;
    /** Called when user wants to insert a section heading into the editor */
    onInsertSection?: (item: StrategyOutlineItem) => void;
    /** Optional class for container */
    className?: string;
    /** If true, adjusts paddings for sidebar usage */
    isSidebar?: boolean;
}

export default function OutlineEditorPanel({ 
    editorText = '', 
    onInsertSection, 
    className,
    isSidebar = false
}: OutlineEditorPanelProps) {
    const { strategyOutline, setStrategyOutline, strategyWordCount } = useWriterStore();
    const [isOpen, setIsOpen] = useState(true);
    const [activeIdx, setActiveIdx] = useState(0);

    // Auto-detect active section based on editor text headings
    useEffect(() => {
        if (!editorText || strategyOutline.length === 0) return;

        const lowerText = editorText.toLowerCase();
        let bestMatch = -1;
        let bestPos = -1;

        strategyOutline.forEach((item, idx) => {
            if (!item.text) return;
            const pos = lowerText.lastIndexOf(item.text.toLowerCase());
            if (pos > bestPos) {
                bestPos = pos;
                bestMatch = idx;
            }
        });

        if (bestMatch !== -1 && bestMatch !== activeIdx) {
            setActiveIdx(bestMatch);
        }
    }, [editorText, strategyOutline, activeIdx]);

    const activeItem = strategyOutline[activeIdx];
    const totalSections = strategyOutline.length;

    const updateActiveItem = useCallback((field: keyof StrategyOutlineItem, value: string) => {
        const updated = strategyOutline.map((item, i) =>
            i === activeIdx ? { ...item, [field]: value } : item
        );
        setStrategyOutline(updated);
    }, [strategyOutline, activeIdx, setStrategyOutline]);

    const smartWordCount = useCallback((item: StrategyOutlineItem) => {
        if (item.wordCount && parseInt(item.wordCount) > 0) return item.wordCount;
        const total = parseInt(strategyWordCount) || 1500;
        const perSection = Math.round(total / Math.max(strategyOutline.length, 1) / 50) * 50;
        return String(Math.max(perSection, 100));
    }, [strategyWordCount, strategyOutline.length]);

    const addSection = () => {
        const newItem: StrategyOutlineItem = {
            type: 'H2',
            text: '',
            wordCount: '300',
            notes: '',
            currentWordCount: 0
        };
        const updated = [...strategyOutline, newItem];
        setStrategyOutline(updated);
        setActiveIdx(updated.length - 1);
    };

    const deleteSection = (idx: number) => {
        if (strategyOutline.length <= 1) return;
        const updated = strategyOutline.filter((_, i) => i !== idx);
        setStrategyOutline(updated);
        setActiveIdx(prev => Math.min(prev, updated.length - 1));
    };

    // Nothing to show if no outline
    if (strategyOutline.length === 0) {
        return (
            <div className={cn(isSidebar ? "p-6" : "mx-auto max-w-[700px] px-4 sm:px-8 pt-6", className)}>
                <div className="flex flex-col items-center justify-center gap-5 py-10 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/30">
                    <AlertCircle size={24} className="text-slate-300" />
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin outline activo</p>
                        <p className="text-[9px] font-medium text-slate-400 mt-1 leading-relaxed max-w-[200px] mx-auto">
                            Genera una estrategia con Nous o añade secciones manualmente para comenzar.
                        </p>
                    </div>
                    <button
                        onClick={addSection}
                        className="h-10 px-6 border-2 border-dashed border-indigo-200 rounded-2xl text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2"
                    >
                        <Plus size={14} /> Añadir Primera Sección
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(isSidebar ? "p-4" : "mx-auto max-w-[700px] px-4 sm:px-8 pt-6", className)}>
            <motion.div
                layout
                className={cn(
                    "rounded-[24px] border overflow-hidden shadow-sm transition-all",
                    "bg-gradient-to-br from-white to-slate-50/50",
                    isOpen ? "border-indigo-100 shadow-xl shadow-indigo-900/5" : "border-slate-200/60"
                )}
            >
                {/* Header bar */}
                <div
                    className={cn(
                        "flex items-center justify-between px-4 py-3 cursor-pointer select-none",
                        isOpen
                            ? "border-b border-indigo-100/60 bg-white/80 backdrop-blur-md sticky top-0 z-10"
                            : "bg-white/40"
                    )}
                    onClick={() => setIsOpen(v => !v)}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-100">
                            <FileText size={12} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 leading-tight">
                                Guía de Sección (Outline)
                            </span>
                            {/* Section selector dropdown */}
                            <select 
                                value={activeIdx}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setActiveIdx(parseInt(e.target.value));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-transparent border-0 text-[11px] font-bold text-slate-500 outline-none p-0 h-4 cursor-pointer hover:text-indigo-600 transition-colors"
                            >
                                {strategyOutline.map((item, idx) => (
                                    <option key={idx} value={idx}>
                                        {idx + 1}. {item.text || 'Sin título'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Section navigator */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100/60 rounded-xl" onClick={e => e.stopPropagation()}>
                            <button
                                disabled={activeIdx === 0}
                                onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:pointer-events-none transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-[10px] font-extrabold text-slate-400 px-1 border-x border-slate-200">
                                {activeIdx + 1} / {totalSections}
                            </span>
                            <button
                                disabled={activeIdx >= totalSections - 1}
                                onClick={() => setActiveIdx(i => Math.min(totalSections - 1, i + 1))}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:pointer-events-none transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        <div className="w-[1px] h-5 bg-slate-200" />
                        {isOpen ? (
                            <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                            <ChevronDown size={16} className="text-slate-400" />
                        )}
                    </div>
                </div>

                {/* Body */}
                <AnimatePresence initial={false} mode="wait">
                    {isOpen && activeItem && (
                        <motion.div
                            key={activeIdx}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="px-5 py-5 space-y-4"
                        >
                            {/* Section title (editable) + word count */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={activeItem.type}
                                            onChange={e => updateActiveItem('type', e.target.value)}
                                            className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border-0 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                                        >
                                            <option value="H1">H1</option>
                                            <option value="H2">H2</option>
                                            <option value="H3">H3</option>
                                            <option value="H4">H4</option>
                                        </select>
                                        <button 
                                            onClick={() => deleteSection(activeIdx)}
                                            title="Eliminar sección"
                                            className="text-slate-300 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/50 rounded-lg px-3 py-1.5 shrink-0">
                                        <Target size={11} className="text-indigo-400" />
                                        <input
                                            type="number"
                                            min="50"
                                            step="50"
                                            value={smartWordCount(activeItem)}
                                            onChange={e => updateActiveItem('wordCount', e.target.value)}
                                            className="w-12 text-[11px] font-black text-indigo-600 bg-transparent outline-none text-right"
                                        />
                                        <span className="text-[10px] text-indigo-400 font-bold">pal.</span>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={activeItem.text}
                                    onChange={e => updateActiveItem('text', e.target.value)}
                                    placeholder="Título de la sección..."
                                    className="w-full text-[13px] font-bold text-slate-800 bg-white/50 border border-transparent focus:border-indigo-100 focus:bg-white rounded-xl px-3 py-2.5 outline-none placeholder:text-slate-300 transition-all shadow-sm"
                                />
                            </div>

                            {/* Progress info */}
                            {(activeItem.currentWordCount !== undefined) && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Progreso de Escritura
                                        </span>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase",
                                            (activeItem.currentWordCount || 0) >= parseInt(smartWordCount(activeItem))
                                                ? "text-emerald-500"
                                                : "text-slate-500"
                                        )}>
                                            {activeItem.currentWordCount || 0} / {smartWordCount(activeItem)} pal.
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className={cn(
                                                "h-full transition-all duration-500",
                                                (activeItem.currentWordCount || 0) >= parseInt(smartWordCount(activeItem))
                                                    ? "bg-emerald-400"
                                                    : "bg-indigo-400"
                                            )}
                                            initial={{ width: 0 }}
                                            animate={{
                                                width: `${Math.min(
                                                    ((activeItem.currentWordCount || 0) / (parseInt(smartWordCount(activeItem)) || 1)) * 100,
                                                    100
                                                )}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Editorial notes */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 px-1">
                                    <Sparkles size={10} className="text-amber-500" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Nota Orientativa</span>
                                </label>
                                <textarea
                                    value={activeItem.notes || ''}
                                    onChange={e => updateActiveItem('notes', e.target.value)}
                                    rows={isSidebar ? 4 : 3}
                                    className="w-full text-[11px] font-medium text-amber-900 bg-amber-50/50 border border-amber-100 rounded-2xl px-4 py-3 outline-none resize-none leading-relaxed placeholder:text-amber-300 focus:bg-amber-50 transition-all shadow-inner"
                                    placeholder="Instrucciones: keywords a incluir, tono, puntos clave..."
                                />
                            </div>

                            {/* Actions bar */}
                            <div className="grid grid-cols-1 gap-2 pt-2">
                                {onInsertSection && (
                                    <button
                                        onClick={() => onInsertSection(activeItem)}
                                        className="w-full h-11 bg-white border border-indigo-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <PlusCircle size={14} />
                                        Insertar en el editor
                                    </button>
                                )}
                                <button
                                    onClick={addSection}
                                    className="w-full h-11 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} />
                                    Nueva Sección
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Section dots navigation — hide in sidebar to save vertical space */}
                {isOpen && totalSections > 1 && !isSidebar && (
                    <div className="flex items-center justify-center gap-1.5 pb-4">
                        {strategyOutline.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveIdx(idx)}
                                title={item.text || `Sección ${idx + 1}`}
                                className={cn(
                                    "rounded-full transition-all duration-300",
                                    idx === activeIdx
                                        ? "w-6 h-1.5 bg-indigo-500"
                                        : "w-1.5 h-1.5 bg-slate-200 hover:bg-indigo-300"
                                )}
                            />
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
