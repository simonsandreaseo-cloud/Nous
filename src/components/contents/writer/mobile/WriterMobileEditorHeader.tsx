'use client';

import { useState } from 'react';
import { 
    Check, 
    RotateCcw, 
    RotateCw, 
    Cloud, 
    CloudOff, 
    Loader2, 
    Briefcase, 
    MoreVertical, 
    Eye, 
    Code, 
    FileText, 
    Trash2,
    X,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useWriterStore } from '@/store/useWriterStore';

interface WriterMobileEditorHeaderProps {
    onBackToList: () => void;
    onOpenTools: () => void;
    onTogglePreview?: () => void;
    onDeleteDraft?: () => void;
}

export function WriterMobileEditorHeader({
    onBackToList,
    onOpenTools,
    onTogglePreview,
    onDeleteDraft
}: WriterMobileEditorHeaderProps) {
    const { 
        editor, 
        isSaving, 
        wordCountReal, 
        editorTab, 
        setEditorTab,
        strategyH1,
        keyword
    } = useWriterStore();

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const canUndo = editor?.can().undo() ?? false;
    const canRedo = editor?.can().redo() ?? false;

    return (
        <header className="h-14 px-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 select-none z-30 sticky top-0">
            {/* Left Section: Back / Done Checkmark Button (Google Docs Image 2) */}
            <div className="flex items-center gap-1.5">
                <button
                    onClick={onBackToList}
                    className="p-2 rounded-full text-slate-800 hover:bg-slate-100 active:scale-95 transition-all"
                    title="Guardar y volver a la lista"
                    aria-label="Volver a la lista"
                >
                    <Check size={22} strokeWidth={2.5} className="text-slate-900" />
                </button>

                {/* Undo & Redo Controls */}
                <div className="flex items-center gap-0.5 ml-1">
                    <button
                        onClick={() => editor?.chain().focus().undo().run()}
                        disabled={!canUndo}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Deshacer"
                    >
                        <RotateCcw size={17} />
                    </button>
                    <button
                        onClick={() => editor?.chain().focus().redo().run()}
                        disabled={!canRedo}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Rehacer"
                    >
                        <RotateCw size={17} />
                    </button>
                </div>
            </div>

            {/* Center Section: Auto-save status / word count */}
            <div className="flex items-center gap-1.5 px-2 text-slate-400">
                {isSaving ? (
                    <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                        <Loader2 size={13} className="animate-spin" />
                        <span className="hidden sm:inline">Guardando</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                        <Cloud size={14} />
                    </div>
                )}
                <span className="text-[10px] font-bold text-slate-400 ml-1">
                    {wordCountReal || 0} p.
                </span>
            </div>

            {/* Right Section: Highlighted Tools Briefcase (Maletita) & 3 Dots Menu */}
            <div className="flex items-center gap-2">
                {/* ICONO DESTACADO DE HERRAMIENTAS (MALETITA) */}
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={onOpenTools}
                    className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/20 active:scale-95 transition-all"
                    title="Herramientas de Studio (Nous, SEO, Media, etc.)"
                    aria-label="Abrir panel de herramientas"
                >
                    <Briefcase size={18} strokeWidth={2.2} />
                    {/* Pulsing indicator dot */}
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
                </motion.button>

                {/* 3 Dots Menu Button */}
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label="Más opciones"
                    >
                        <MoreVertical size={18} />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsMenuOpen(false)} 
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in"
                                >
                                    <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Opciones de Documento
                                    </div>

                                    {/* Toggle Code / Visual */}
                                    <button
                                        onClick={() => {
                                            setEditorTab(editorTab === 'visual' ? 'code' : 'visual');
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Code size={14} className="text-slate-400" />
                                            <span>Modo {editorTab === 'visual' ? 'Código HTML' : 'Visual'}</span>
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                            {editorTab === 'visual' ? 'V' : 'C'}
                                        </span>
                                    </button>

                                    {/* Preview Article */}
                                    {onTogglePreview && (
                                        <button
                                            onClick={() => {
                                                onTogglePreview();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            <Eye size={14} className="text-slate-400" />
                                            <span>Vista previa</span>
                                        </button>
                                    )}

                                    {/* Delete draft */}
                                    {onDeleteDraft && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onDeleteDraft();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                            <span>Eliminar borrador</span>
                                        </button>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
