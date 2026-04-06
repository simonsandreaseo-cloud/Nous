'use client';
import { useWriterStore } from '@/store/useWriterStore';
import { 
    Layers, CheckCircle2, Info, Plus, Trash2, 
    GripVertical, ChevronDown, Sparkles, RefreshCw, Lightbulb, ChevronUp, FileText
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useState } from 'react';
import { useWriterActions } from './useWriterActions';

export default function OutlineSidebar() {
    const { 
        strategyOutline, strategyWordCount, setStrategyOutline,
        setStrategyWordCount, keyword, rawSeoData, isPlanningStructure
    } = useWriterStore();
    const { handlePlanStructure } = useWriterActions();
    const [expandedNotes, setExpandedNotes] = useState<number[]>([]);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    const toggleNote = (idx: number) => {
        setExpandedNotes(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    // Smart default: distribute word count evenly if a section has no wordCount
    const getSmartWordCount = (item: any, idx: number) => {
        if (item.wordCount) {
            const parsed = parseInt(String(item.wordCount));
            if (!isNaN(parsed) && parsed > 0) return String(parsed);
        }
        const total = parseInt(String(strategyWordCount)) || 1500;
        const perSection = Math.round(total / Math.max(strategyOutline.length, 1) / 50) * 50;
        return String(Math.max(perSection, 100));
    };

    const updateItem = (idx: number, field: string, value: string) => {
        const updated = strategyOutline.map((item, i) =>
            i === idx ? { ...item, [field]: value } : item
        );
        setStrategyOutline(updated);
    };

    const deleteItem = (idx: number) => {
        setStrategyOutline(strategyOutline.filter((_, i) => i !== idx));
    };

    const addSection = () => {
        setStrategyOutline([
            ...strategyOutline,
            { type: 'H2', text: '', wordCount: '300', notes: '' }
        ]);
        // Auto-expand notes for the new item
        setExpandedNotes(prev => [...prev, strategyOutline.length]);
    };

    // Drag & Drop reorder
    const handleDragStart = (idx: number) => setDragIdx(idx);
    const handleDragEnter = (idx: number) => setDragOverIdx(idx);
    const handleDragEnd = () => {
        if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
            setDragIdx(null);
            setDragOverIdx(null);
            return;
        }
        const updated = [...strategyOutline];
        const [moved] = updated.splice(dragIdx, 1);
        updated.splice(dragOverIdx, 0, moved);
        setStrategyOutline(updated);
        setDragIdx(null);
        setDragOverIdx(null);
    };

    const totalPlanned = strategyOutline.reduce((acc, i) => acc + (parseInt(i.wordCount) || 0), 0);
    const totalWritten = strategyOutline.reduce((acc, i) => acc + (i.currentWordCount || 0), 0);
    const overallProgress = totalPlanned > 0 ? Math.min((totalWritten / totalPlanned) * 100, 100) : 0;

    // ── EMPTY STATE ────────────────────────────────────────────────────────────
    if (strategyOutline.length === 0) {
        return (
            <div className="p-6 flex flex-col gap-6">
                <div className="flex flex-col items-center justify-center gap-5 py-10 border-2 border-dashed border-slate-200 rounded-[32px]">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-100/60 rounded-full animate-ping" style={{ animationDuration: '2.5s' }} />
                        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Layers size={24} className="text-white" />
                        </div>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">Sin Outline Estratégico</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1 leading-relaxed">
                            {rawSeoData
                                ? 'Genera el outline con Nous o añade secciones manualmente.'
                                : 'Primero realiza la investigación SEO para generar el outline.'}
                        </p>
                    </div>

                    <button
                        disabled={isPlanningStructure || !rawSeoData}
                        onClick={handlePlanStructure}
                        className="group relative w-full h-11 bg-indigo-600 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none overflow-hidden shadow-lg shadow-indigo-200 hover:shadow-black/20 active:scale-95"
                    >
                        <div className="absolute inset-0 flex items-center justify-center gap-2 group-hover:-translate-y-full transition-transform duration-500">
                            {isPlanningStructure ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} className="animate-pulse" />}
                            {isPlanningStructure ? 'Diseñando Outline...' : 'Generar Outline con Nous'}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                            <Lightbulb size={14} />
                            Activar Estrategia SEO
                        </div>
                    </button>
                </div>

                {/* Añadir sección manualmente incluso sin outline */}
                <button
                    onClick={addSection}
                    className="w-full h-10 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={14} /> Añadir Sección Manualmente
                </button>
            </div>
        );
    }

    // ── WITH OUTLINE ──────────────────────────────────────────────────────────
    return (
        <div className="p-5 space-y-4 animate-in fade-in duration-300">

            {/* Header + Regenerate */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                        {strategyOutline.length} Secciones
                    </span>
                </div>
                <button
                    disabled={isPlanningStructure || !rawSeoData}
                    onClick={handlePlanStructure}
                    title="Regenerar outline con IA"
                    className="group relative px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 disabled:opacity-40 overflow-hidden shadow-sm active:scale-95 flex items-center gap-2"
                >
                    {isPlanningStructure ? (
                        <RefreshCw size={11} className="animate-spin" />
                    ) : (
                        <Sparkles size={11} className="group-hover:rotate-12 transition-transform" />
                    )}
                    <span>{isPlanningStructure ? 'Generando...' : 'Regenerar Outline'}</span>
                </button>
            </div>

            {/* Meta Palabras Total */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex-1 space-y-0.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Meta Total de Palabras
                    </label>
                    <input
                        type="number"
                        min="300"
                        step="100"
                        value={parseInt(String(strategyWordCount)) || 1500}
                        onChange={e => setStrategyWordCount(e.target.value)}
                        className="w-full text-sm font-black text-indigo-600 bg-transparent outline-none"
                    />
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Planificado</p>
                    <p className="text-xs font-black text-slate-700">{totalPlanned.toLocaleString()}</p>
                </div>
            </div>

            {/* Sections List */}
            <div className="space-y-2">
                {strategyOutline.map((item, idx) => {
                    const smartWC = getSmartWordCount(item, idx);
                    const target = parseInt(smartWC) || 200;
                    const current = item.currentWordCount || 0;
                    const progress = Math.min((current / target) * 100, 100);
                    const isDone = current >= target;
                    const isExpanded = expandedNotes.includes(idx);
                    const isDragging = dragIdx === idx;
                    const isOver = dragOverIdx === idx;
                    const hasNotes = item.notes && item.notes.trim().length > 0;

                    return (
                        <div
                            key={idx}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragEnter={() => handleDragEnter(idx)}
                            onDragOver={e => e.preventDefault()}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                "group bg-white rounded-[20px] border transition-all",
                                isDragging ? "opacity-40 scale-[0.98]" : "opacity-100",
                                isOver ? "border-indigo-300 shadow-md shadow-indigo-100" : isDone ? "border-emerald-200" : "border-slate-100 hover:border-indigo-200",
                                "shadow-sm"
                            )}
                        >
                            <div className="p-4 space-y-3">
                                {/* Row 1: Grip + Type + Title + Delete */}
                                <div className="flex items-center gap-2">
                                    <div className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400 transition-colors shrink-0">
                                        <GripVertical size={16} />
                                    </div>

                                    {/* Heading Type */}
                                    <select
                                        value={item.type}
                                        onChange={e => updateItem(idx, 'type', e.target.value)}
                                        className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border-0 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-indigo-100 hover:text-indigo-600 transition-colors w-14 shrink-0"
                                    >
                                        <option value="H1">H1</option>
                                        <option value="H2">H2</option>
                                        <option value="H3">H3</option>
                                        <option value="H4">H4</option>
                                    </select>

                                    {/* Title Input */}
                                    <input
                                        type="text"
                                        value={item.text}
                                        onChange={e => updateItem(idx, 'text', e.target.value)}
                                        placeholder="Título de la sección..."
                                        className="flex-1 text-[12px] font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-300 min-w-0"
                                    />

                                    {/* Delete */}
                                    <button
                                        onClick={() => deleteItem(idx)}
                                        className="p-1 rounded-lg text-slate-200 hover:text-rose-400 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>

                                {/* Row 2: Word count input + Progress */}
                                <div className="flex items-center gap-3 pl-[52px]">
                                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 shrink-0">
                                        <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Meta</span>
                                        <input
                                            type="number"
                                            min="50"
                                            step="50"
                                            value={smartWC}
                                            onChange={e => updateItem(idx, 'wordCount', e.target.value)}
                                            className="w-14 text-[10px] font-black text-indigo-600 bg-transparent outline-none text-right"
                                        />
                                        <span className="text-[8px] text-indigo-300">pal.</span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="flex-1 space-y-1">
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-500 ease-out",
                                                    isDone ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" : "bg-indigo-400"
                                                )}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[8px] font-bold text-slate-300">
                                            <span>{current} escritas</span>
                                            <span className={isDone ? "text-emerald-500" : ""}>{Math.round(progress)}%</span>
                                        </div>
                                    </div>

                                    {isDone && (
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                    )}
                                </div>

                                {/* Row 3: Notes (¡Siempre visibles en preview!) */}
                                <div className="pl-[52px]">
                                    {hasNotes ? (
                                        <div className="rounded-xl bg-amber-50 border border-amber-100 overflow-hidden">
                                            <div
                                                className={cn(
                                                    "px-3 py-2 text-[10px] font-medium text-amber-800 leading-relaxed",
                                                    !isExpanded && "line-clamp-2"
                                                )}
                                            >
                                                {item.notes}
                                            </div>
                                            <div className="flex items-center justify-between px-3 py-1.5 border-t border-amber-100/60">
                                                <div className="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase tracking-widest">
                                                    <FileText size={9} />
                                                    Nota orientativa
                                                </div>
                                                <button
                                                    onClick={() => toggleNote(idx)}
                                                    className="text-[8px] font-black text-amber-400 hover:text-amber-600 uppercase tracking-widest flex items-center gap-1"
                                                >
                                                    {isExpanded ? (<><ChevronUp size={10} />Cerrar</>) : (<><ChevronDown size={10} />Ver todo</>)}
                                                </button>
                                            </div>
                                            {/* Textarea editablе al expandir */}
                                            {isExpanded && (
                                                <div className="px-3 pb-3">
                                                    <textarea
                                                        value={item.notes || ''}
                                                        onChange={e => updateItem(idx, 'notes', e.target.value)}
                                                        placeholder="Instrucciones editoriales para esta sección..."
                                                        rows={4}
                                                        className="w-full p-2 bg-white/70 border border-amber-200 rounded-xl text-[10px] font-medium text-slate-600 outline-none resize-none focus:bg-white focus:border-amber-300 transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => toggleNote(idx)}
                                            className={cn(
                                                "w-full py-1.5 px-3 rounded-xl border-2 border-dashed text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                                isExpanded
                                                    ? "border-indigo-300 text-indigo-500 bg-indigo-50/50"
                                                    : "border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400"
                                            )}
                                        >
                                            <Info size={10} />
                                            {isExpanded ? 'Escribiendo nota...' : 'Añadir nota orientativa'}
                                        </button>
                                    )}
                                    {!hasNotes && isExpanded && (
                                        <div className="mt-2">
                                            <textarea
                                                value={item.notes || ''}
                                                onChange={e => updateItem(idx, 'notes', e.target.value)}
                                                placeholder="Instrucciones editoriales para esta sección (tono, puntos a cubrir, keywords a usar...)..."
                                                rows={3}
                                                autoFocus
                                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-medium text-slate-600 outline-none resize-none focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-300"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Section Button */}
            <button
                onClick={addSection}
                className="w-full h-10 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
            >
                <Plus size={14} /> Añadir Sección
            </button>

            {/* Total Footer */}
            <div className="p-5 bg-slate-900 rounded-[28px] text-white shadow-xl shadow-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Progreso Global</span>
                    <span className="text-xs font-black text-indigo-300">{totalWritten.toLocaleString()} / {totalPlanned.toLocaleString()} palabras</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
                <p className="text-[9px] font-bold text-slate-500 text-right">{Math.round(overallProgress)}% completado</p>
            </div>
        </div>
    );
}
