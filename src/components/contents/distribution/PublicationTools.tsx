"use client";

import { 
    Copy, 
    Check, 
    FileCode, 
    Type, 
    Globe, 
    Link, 
    MousePointer2, 
    Tags, 
    Layout, 
    CheckCircle2, 
    ArrowRightLeft,
    ScrollText,
    ClipboardCheck,
    ExternalLink,
    AlertTriangle,
    CheckCircle,
    X,
    ArrowRight,
    Loader2
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { Task, useProjectStore } from "@/store/useProjectStore";
import { NotificationService } from "@/lib/services/notifications";
import { generateArticleSchemas } from "@/lib/services/writer/seo-analyzer";

interface PublicationToolsProps {
    task: Task;
    onStatusToggle: () => void;
    onReportIssue: (note: string) => void;
}

export function PublicationTools({ task, onStatusToggle, onReportIssue }: PublicationToolsProps) {
    const [copyingStatus, setCopyingStatus] = useState<Record<string, boolean>>({});
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportNote, setReportNote] = useState("");
    const [isGeneratingSchemas, setIsGeneratingSchemas] = useState(false);
    const { updateTask } = useProjectStore();

    const handleCopy = async (id: string, text: string, type: 'text' | 'html' | 'rich-text' = 'text') => {
        try {
            if (type === 'rich-text') {
                const blob = new Blob([text], { type: 'text/html' });
                const plainText = text.replace(/<[^>]*>?/gm, '');
                const plainBlob = new Blob([plainText], { type: 'text/plain' });
                const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': plainBlob })];
                await navigator.clipboard.write(data);
            } else {
                await navigator.clipboard.writeText(text);
            }
            
            setCopyingStatus(prev => ({ ...prev, [id]: true }));
            NotificationService.notify("Copiado", `${id} al portapapeles.`);
            setTimeout(() => setCopyingStatus(prev => ({ ...prev, [id]: false })), 2000);
        } catch (err) {
            NotificationService.error("Error", "No se pudo copiar.");
        }
    };

    const handleCopyAll = async () => {
        const text = `
Título: ${task.title}
SEO Title: ${task.seo_title || ''}
Slug: ${task.target_url_slug || ''}
Meta Description: ${task.meta_description || ''}
Keyword: ${task.target_keyword || ''}
Extracto: ${task.excerpt || ''}
Schemas: ${JSON.stringify(task.research_dossier?.schemas || [], null, 2)}
`.trim();
        await handleCopy('Todo', text);
    };

    const handleGenerateSchemas = async () => {
        if (!task.content_body) {
            NotificationService.error("Error", "El artículo no tiene contenido para analizar.");
            return;
        }

        setIsGeneratingSchemas(true);
        try {
            const schemas = await generateArticleSchemas(task.title, task.content_body);
            
            // Actualizamos la tarea con los nuevos schemas
            const updatedDossier = {
                ...(task.research_dossier || {}),
                schemas: schemas
            };

            await updateTask(task.id, { research_dossier: updatedDossier });
            NotificationService.notify("Schemas Generados", "Se han añadido Article y FAQ Schemas correctamente.");
        } catch (error) {
            NotificationService.error("Error", "No se pudieron generar los schemas.");
        } finally {
            setIsGeneratingSchemas(false);
        }
    };

    const metadataItems = [
        { id: "h1", label: "Título Principal (H1)", value: task.title, icon: Layout },
        { id: "seo_title", label: "SEO Title", value: task.seo_title, icon: Globe },
        { id: "slug", label: "Slug / URL", value: task.target_url_slug, icon: Link },
        { id: "meta_desc", label: "Meta Description", value: task.meta_description, icon: MousePointer2 },
        { id: "excerpt", label: "Extracto / Resumen", value: task.excerpt, icon: ScrollText },
        { 
            id: "schemas", 
            label: "Schemas (JSON-LD)", 
            value: task.research_dossier?.schemas ? JSON.stringify(task.research_dossier.schemas, null, 2) : null, 
            icon: FileCode 
        },
    ];

    const isPublic = task.status === 'publicado' || task.status === 'done';

    return (
        <div className="h-full flex flex-col gap-10 p-12 overflow-y-auto custom-scrollbar bg-white border-l border-slate-100 shadow-2xl relative">
            
            {/* PUBLISH TOGGLE BUTTON */}
            <div className="space-y-4">
                <button 
                    onClick={onStatusToggle}
                    className={cn(
                        "w-full group relative overflow-hidden flex items-center justify-between px-8 py-5 rounded-[28px] transition-all duration-300 shadow-xl active:scale-[0.98]",
                        isPublic 
                            ? "bg-slate-100 border border-slate-200 text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600" 
                            : "bg-slate-900 border border-slate-800 text-white hover:bg-emerald-600 hover:border-emerald-500 hover:shadow-emerald-100 hover:-translate-y-1"
                    )}
                >
                    <div className="flex items-center gap-4 z-10">
                        <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center transition-colors shadow-inner",
                            isPublic ? "bg-white text-amber-500" : "bg-white/10 text-white"
                        )}>
                            {isPublic ? <ArrowRightLeft size={20} /> : <CheckCircle size={20} />}
                        </div>
                        <div className="flex flex-col items-start translate-y-[-1px]">
                            <span className="text-[13px] font-black uppercase tracking-tight italic">
                                {isPublic ? 'Deshacer publicación' : 'Marcar como publicado'}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-40">
                                {isPublic ? 'Devolver a pendientes' : 'Finalizar tarea hoy'}
                            </span>
                        </div>
                    </div>
                    
                    {!isPublic && <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </button>

                {!isPublic && (
                    <button 
                        onClick={() => setIsReportModalOpen(true)}
                        className="w-full py-5 rounded-[28px] border border-slate-100 hover:border-amber-200 hover:bg-amber-50 text-amber-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <AlertTriangle size={18} />
                        <span className="text-[11px] font-black uppercase tracking-widest italic">Reportar Problema</span>
                    </button>
                )}
            </div>

            {/* QUICK COPY BODY */}
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => handleCopy('HTML', task.content_body || '', 'text')}
                    className="flex flex-col items-center gap-4 p-8 bg-slate-50 hover:bg-white rounded-[40px] border border-slate-100 hover:border-indigo-100 transition-all group shadow-sm hover:shadow-xl hover:shadow-indigo-100/30"
                >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm transition-colors">
                        <FileCode size={24} />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Obtener HTML</span>
                        <span className="text-[8px] font-bold text-slate-300 uppercase mt-1">Código Limpio</span>
                    </div>
                </button>
                <button 
                    onClick={() => handleCopy('RichText', task.content_body || '', 'rich-text')}
                    className="flex flex-col items-center gap-4 p-8 bg-slate-50 hover:bg-white rounded-[40px] border border-slate-100 hover:border-emerald-100 transition-all group shadow-sm hover:shadow-xl hover:shadow-emerald-100/30"
                >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-emerald-600 shadow-sm transition-colors">
                        <Type size={24} />
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Formato RTF</span>
                        <span className="text-[8px] font-bold text-slate-300 uppercase mt-1">Copiado Enriquecido</span>
                    </div>
                </button>
                <button 
                    onClick={handleGenerateSchemas}
                    disabled={isGeneratingSchemas}
                    className="col-span-2 flex items-center justify-between p-7 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 rounded-[40px] border border-indigo-500 text-white transition-all group shadow-xl shadow-indigo-100 hover:shadow-indigo-200 active:scale-95"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shadow-inner">
                            {isGeneratingSchemas ? <Loader2 className="animate-spin" size={24} /> : <FileCode size={24} />}
                        </div>
                        <div className="text-left">
                            <span className="text-[12px] font-black uppercase tracking-widest block">
                                {isGeneratingSchemas ? 'Analizando Artículo...' : 'Generar Schemas SEO'}
                            </span>
                            <span className="text-[8px] font-bold text-indigo-100 uppercase mt-1">Detección Automática de FAQs & Article JSON-LD</span>
                        </div>
                    </div>
                    <ArrowRight size={20} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
            </div>

            {/* METADATA SECTION */}
            <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Metadatos de Publicación</h4>
                    <button 
                        onClick={handleCopyAll}
                        className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                        Copiar TODO
                    </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    {metadataItems.map((item) => (
                        <div key={item.id} className="group relative flex flex-col gap-3 p-7 bg-slate-50 hover:bg-white rounded-[32px] border border-slate-100 hover:border-indigo-100 transition-all shadow-sm hover:shadow-xl hover:shadow-slate-200/40">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-colors">
                                        <item.icon size={16} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">{item.label}</span>
                                </div>
                                <button 
                                    onClick={() => handleCopy(item.id, (item.value as string) || '', 'text')}
                                    className={cn(
                                        "p-2 rounded-xl transition-all active:scale-90",
                                        copyingStatus[item.id] ? "bg-emerald-50 text-emerald-600" : "hover:bg-indigo-50 text-indigo-400"
                                    )}
                                >
                                    {copyingStatus[item.id] ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                            <div className="bg-white/50 group-hover:bg-white rounded-2xl p-4 border border-transparent group-hover:border-slate-50 transition-all">
                                <p className={cn(
                                    "text-[12px] font-bold leading-relaxed break-words italic",
                                    item.value ? "text-slate-800" : "text-slate-300 font-normal"
                                )}>
                                    {(item.value as string) || "Dato no disponible para este artículo"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* REPORT MODAL */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
                        onClick={() => setIsReportModalOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-12 text-center">
                                <div className="w-20 h-20 bg-amber-100 rounded-[32px] flex items-center justify-center text-amber-600 mx-auto mb-8 shadow-inner">
                                    <AlertTriangle size={36} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter mb-4">
                                    Reportar un Problema
                                </h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-10 leading-relaxed">
                                    El contenido volverá a Corrección.<br />Describe qué sucede para que sea revisado.
                                </p>

                                <textarea 
                                    placeholder="Ej: El enlace del botón está roto, o hay un error en el formato de las imágenes..."
                                    value={reportNote}
                                    onChange={(e) => setReportNote(e.target.value)}
                                    className="w-full h-40 p-8 bg-slate-50 border border-slate-100 rounded-[40px] text-[12px] font-medium text-slate-600 focus:bg-white focus:border-amber-200 outline-none transition-all resize-none shadow-sm mb-8"
                                />

                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => {
                                            if (reportNote.trim()) {
                                                onReportIssue(reportNote);
                                                setIsReportModalOpen(false);
                                                setReportNote("");
                                            }
                                        }}
                                        disabled={!reportNote.trim()}
                                        className="w-full py-6 bg-slate-900 hover:bg-amber-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-[32px] text-[12px] font-black uppercase tracking-widest italic transition-all shadow-xl hover:shadow-amber-100"
                                    >
                                        Enviar a Corrección
                                    </button>
                                    <button 
                                        onClick={() => setIsReportModalOpen(false)}
                                        className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
