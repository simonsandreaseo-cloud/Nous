"use client";

import { useState } from "react";
import { 
    X, 
    Copy, 
    Check, 
    FileCode, 
    Type, 
    Globe, 
    Link, 
    ChevronRight, 
    Layout, 
    MousePointer2, 
    Tags, 
    Share2, 
    CheckCircle2, 
    ArrowRightLeft,
    Clock,
    User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { Task } from "@/types/project";
import { useProjectStore } from "@/store/useProjectStore";
import { NotificationService } from "@/lib/services/notifications";

interface DistributionDetailModalProps {
    task: Task;
    onClose: () => void;
}

export function DistributionDetailModal({ task, onClose }: DistributionDetailModalProps) {
    const { updateTask } = useProjectStore();
    const [localTask, setLocalTask] = useState<Task>(task);
    const [copyingStatus, setCopyingStatus] = useState<Record<string, boolean>>({});

    const handleCopy = async (id: string, text: string, type: 'text' | 'html' | 'rich-text' = 'text') => {
        try {
            if (type === 'rich-text') {
                // To copy rich text/HTML to clipboard so it's recognized as formatted text
                const blob = new Blob([text], { type: 'text/html' });
                const plainText = text.replace(/<[^>]*>?/gm, '');
                const plainBlob = new Blob([plainText], { type: 'text/plain' });
                const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': plainBlob })];
                await navigator.clipboard.write(data);
            } else {
                await navigator.clipboard.writeText(text);
            }
            
            setCopyingStatus(prev => ({ ...prev, [id]: true }));
            NotificationService.notify("Copiado con éxito", `Se ha copiado el ${id} al portapapeles.`);
            setTimeout(() => setCopyingStatus(prev => ({ ...prev, [id]: false })), 2000);
        } catch (err) {
            console.error("Failed to copy!", err);
            NotificationService.error("Error al copiar", "No se pudo acceder al portapapeles.");
        }
    };

    const handleStatusToggle = async () => {
        const nextStatus = localTask.status === 'publicado' ? 'por_maquetar' : 'publicado';
        await updateTask(localTask.id, { status: nextStatus });
        setLocalTask(prev => ({ ...prev, status: nextStatus }));
    };

    const metadataItems = [
        { id: "title", label: "Título H1", value: localTask.title, icon: Layout },
        { id: "seo_title", label: "SEO Title", value: localTask.seo_title, icon: Globe },
        { id: "slug", label: "Slug / URL", value: localTask.target_url_slug, icon: Link },
        { id: "meta_description", label: "Meta Description", value: localTask.meta_description, icon: MousePointer2 },
        { id: "keywords", label: "Keywords", value: localTask.target_keyword, icon: Tags },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-xl"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-5xl h-[85vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row relative border border-white/20"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Lateral Panel */}
                <div className="w-full md:w-80 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col shrink-0">
                    <div className="p-8 pb-4">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <Share2 size={24} />
                            </div>
                            <button onClick={onClose} className="p-3 bg-white hover:bg-white rounded-2xl shadow-sm border border-slate-100 transition-all hover:scale-105 active:scale-95 group">
                                <X size={20} className="text-slate-400 group-hover:text-slate-900" />
                            </button>
                        </div>
                        
                        <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter leading-tight mb-2">
                            Distribución
                        </h2>
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Listo para Publicar</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-8 custom-scrollbar">
                        {/* Status Switcher */}
                        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Estado Editorial</span>
                            <div className="flex items-center justify-between">
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border",
                                    localTask.status === 'publicado' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                )}>
                                    {localTask.status === 'publicado' ? 'Publicado' : 'Por Maquetar'}
                                </span>
                                <button 
                                    onClick={handleStatusToggle}
                                    className="p-2 hover:bg-slate-50 rounded-xl transition-all group"
                                    title="Cambiar Estado"
                                >
                                    <ArrowRightLeft size={16} className="text-slate-400 group-hover:text-indigo-600" />
                                </button>
                            </div>
                        </div>

                        {/* Copy Tools */}
                        <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 px-2">Copiado Rápido</span>
                            
                            <button 
                                onClick={() => handleCopy('HTML', localTask.content_body || '', 'text')}
                                className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-900 group rounded-[24px] border border-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-slate-800">
                                        <FileCode size={18} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase italic tracking-tight text-slate-700 group-hover:text-white">Copiar HTML</span>
                                </div>
                                {copyingStatus['HTML'] ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-300 group-hover:text-white/50" />}
                            </button>

                            <button 
                                onClick={() => handleCopy('Enriquecido', localTask.content_body || '', 'rich-text')}
                                className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-900 group rounded-[24px] border border-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-slate-800">
                                        <Type size={18} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase italic tracking-tight text-slate-700 group-hover:text-white">Formato Enriquecido</span>
                                </div>
                                {copyingStatus['Enriquecido'] ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-300 group-hover:text-white/50" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col bg-white">
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Metadata */}
                            <div className="space-y-6">
                                <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3 mb-6">
                                    <ChevronRight size={14} className="text-indigo-600" /> Metadatos del Contenido
                                </h3>
                                
                                <div className="space-y-3">
                                    {metadataItems.map((item) => (
                                        <div key={item.id} className="group flex flex-col gap-2 p-5 bg-slate-50 hover:bg-white rounded-[28px] border border-slate-100 hover:border-indigo-100 transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-200/20">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <item.icon size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleCopy(item.id, item.value || '', 'text')}
                                                    className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-all active:scale-90"
                                                >
                                                    {copyingStatus[item.id] ? <Check size={14} /> : <Copy size={14} className="opacity-40 hover:opacity-100 transition-opacity" />}
                                                </button>
                                            </div>
                                            <p className={cn(
                                                "text-xs font-bold leading-relaxed break-words",
                                                item.value ? "text-slate-800" : "text-slate-300 italic"
                                            )}>
                                                {item.value || "No especificado"}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="flex flex-col gap-6">
                                <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                                    <ChevronRight size={14} className="text-indigo-600" /> Vista Previa
                                </h3>
                                
                                <div className="flex-1 bg-white rounded-[40px] border border-slate-100 shadow-inner p-8 overflow-y-auto min-h-[400px] border-dashed">
                                    {localTask.content_body ? (
                                        <div 
                                            className="prose prose-slate prose-sm max-w-none text-slate-600"
                                            dangerouslySetInnerHTML={{ __html: localTask.content_body }}
                                        />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                            <CheckCircle2 size={40} className="text-slate-100 mb-4" />
                                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                                                No hay contenido redactado aún.<br/>Usa el Redactor de Nous primero.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
