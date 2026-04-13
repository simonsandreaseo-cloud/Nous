"use client";

import { useState, useMemo, useEffect } from "react";
import { 
    Languages, 
    Search, 
    ChevronRight, 
    CheckCircle2, 
    Loader2,
    Calendar,
    Globe,
    Plus,
    X,
    Send,
    FileText,
    ArrowRight,
    History,
    Zap
} from "lucide-react";
import { LinkPatcherService } from "@/lib/services/link-patcher";
import { mdToHtml } from "@/utils/markdown";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useProjectStore, Task } from "@/store/useProjectStore";
import { aiRouter } from "@/lib/ai/router";
import { NotificationService } from "@/lib/services/notifications";
import { AVAILABLE_LANGUAGES } from "@/constants/languages";



export default function TranslatorView() {
    const { tasks, addTask, isLoading, activeProjectIds, fetchProjectTasks, activeProject } = useProjectStore();
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [isTranslating, setIsTranslating] = useState(false);
    const [progress, setProgress] = useState<{ [key: string]: 'pending' | 'processing' | 'done' | 'error' }>({});
    const [searchQuery, setSearchQuery] = useState("");

    const translatableTasks = useMemo(() => {
        return tasks.filter(task => 
            ['por_corregir', 'por_maquetar', 'publicado'].includes(task.status) &&
            (!searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [tasks, searchQuery]);

    const activeTask = useMemo(() => {
        return tasks.find(t => t.id === activeTaskId) || null;
    }, [tasks, activeTaskId]);

    // Pre-select default languages when a task is highlighed
    useEffect(() => {
        if (activeTaskId && selectedLanguages.length === 0) {
            const defaultLangs = activeProject?.settings?.content_preferences?.default_translator_languages;
            if (defaultLangs && defaultLangs.length > 0) {
                setSelectedLanguages(defaultLangs);
            }
        }
    }, [activeTaskId, activeProject, selectedLanguages.length]);

    // Initial load
    useEffect(() => {
        if (activeProjectIds.length > 0 && tasks.length === 0) {
            fetchProjectTasks(activeProjectIds[0]);
        }
    }, [activeProjectIds, fetchProjectTasks, tasks.length]);

    const toggleLanguage = (code: string) => {
        setSelectedLanguages(prev => 
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const handleTranslateAll = async () => {
        if (!activeTask || selectedLanguages.length === 0) return;
        
        setIsTranslating(true);
        const newProgress = { ...progress };
        selectedLanguages.forEach(code => newProgress[code] = 'pending');
        setProgress(newProgress);

        for (const langCode of selectedLanguages) {
            setProgress(prev => ({ ...prev, [langCode]: 'processing' }));
            try {
                const langName = AVAILABLE_LANGUAGES.find(l => l.code === langCode)?.name || langCode;
                
                const systemPrompt = `Eres un traductor experto de contenidos SEO. 
Traduce el siguiente contenido al ${langName}.
Mantén estrictamente el formato MARKDOWN para el cuerpo del contenido.
Devuelve el resultado en formato JSON con la siguiente estructura:
{
  "h1": "título principal traducido",
  "seo_title": "título SEO traducido",
  "meta_description": "meta descripción traducida",
  "excerpt": "resumen corto traducido",
  "content_body": "cuerpo integro en markdown traducido"
}`;

                const prompt = `Contenido original (Español):
Título: ${activeTask.h1 || activeTask.title}
SEO Title: ${activeTask.seo_title || ''}
Meta Desc: ${activeTask.meta_description || ''}
Resumen: ${activeTask.excerpt || ''}

Cuerpo:
${activeTask.content_body || ''}`;

                const response = await aiRouter.generate({
                    model: 'gemma-3-27b-it',
                    systemPrompt,
                    prompt,
                    jsonMode: true,
                    temperature: 0.3
                });

                const translatedData = JSON.parse(response.text);

                // --- NATIVE CONVERSION: MD TO HTML ---
                const htmlContent = mdToHtml(translatedData.content_body);

                // APPLY LINK PATCHING TO TRANSLATED CONTENT (Now as HTML)
                const activeProject = useProjectStore.getState().projects.find(p => p.id === activeTask.project_id) || null;
                const patchedContentBody = LinkPatcherService.patchHtmlForProcess(htmlContent, activeProject, 'translator');

                // Create new task in DB
                const newTask: any = {
                    project_id: activeTask.project_id,
                    title: translatedData.h1, // Título limpio sin sufijo (EN)
                    h1: translatedData.h1,
                    seo_title: translatedData.seo_title,
                    meta_description: translatedData.meta_description,
                    excerpt: translatedData.excerpt,
                    content_body: patchedContentBody,
                    status: 'por_corregir' as any,
                    language: langCode,
                    translation_parent_id: activeTask.id,
                    scheduled_date: activeTask.scheduled_date || new Date().toISOString(),
                    metadata: { 
                        ...(activeTask.metadata || {}),
                        is_translation: true,
                        source_lang: activeTask.language || 'es'
                    }
                };

                await addTask(newTask);
                setProgress(prev => ({ ...prev, [langCode]: 'done' }));
            } catch (error) {
                console.error(`Error translating to ${langCode}:`, error);
                setProgress(prev => ({ ...prev, [langCode]: 'error' }));
            }
        }
        
        setIsTranslating(false);
        NotificationService.notify("Traducción completada", "Se han generado las versiones en los idiomas seleccionados.");
    };

    return (
        <div className="flex-1 flex overflow-hidden bg-white">
            {/* Left Column: Task Selection */}
            <div className="w-80 flex flex-col bg-slate-50 border-r border-slate-100 shrink-0">
                <div className="p-6 bg-white/50 border-b border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Seleccionar Contenido</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <input 
                            type="text" 
                            placeholder="Buscar artículo..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-purple-500/10 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {translatableTasks.map(task => (
                        <button
                            key={task.id}
                            onClick={() => setActiveTaskId(task.id)}
                            className={cn(
                                "w-full p-4 rounded-2xl text-left border transition-all duration-300 group",
                                activeTaskId === task.id 
                                    ? "bg-white border-purple-100 shadow-lg shadow-purple-500/5 scale-[1.02]"
                                    : "bg-transparent border-transparent hover:bg-white/40 opacity-70 hover:opacity-100"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter",
                                    task.status === 'publicado' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                )}>
                                    {task.status}
                                </span>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-auto italic">
                                    {task.language || 'es'}
                                </span>
                            </div>
                            <h4 className={cn(
                                "text-[11px] font-black leading-tight uppercase italic tracking-tight line-clamp-2 transition-colors",
                                activeTaskId === task.id ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"
                            )}>
                                {task.title}
                            </h4>
                        </button>
                    ))}
                    {translatableTasks.length === 0 && !isLoading && (
                        <div className="text-center py-12">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron artículos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="h-20 px-8 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-100">
                            <Languages size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-tight">Omni-Traductor AI</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Zap size={10} className="text-amber-400" /> Powered by Gemma 3
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleTranslateAll}
                        disabled={!activeTask || selectedLanguages.length === 0 || isTranslating}
                        className={cn(
                            "group px-8 py-3 rounded-2xl transition-all shadow-xl flex items-center gap-3",
                            !activeTask || selectedLanguages.length === 0 || isTranslating
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed scale-95"
                                : "bg-slate-900 text-white hover:bg-purple-600 hover:-translate-y-0.5"
                        )}
                    >
                        {isTranslating ? (
                            <Loader2 size={16} className="animate-spin text-white/60" />
                        ) : (
                            <Send size={16} />
                        )}
                        <span className="text-[11px] font-black uppercase tracking-widest italic">Lanzar Traducción</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {!activeTask ? (
                        <div className="h-full flex flex-col items-center justify-center p-20 opacity-40">
                            <Globe size={64} className="text-slate-200 mb-8 animate-pulse" />
                            <h3 className="text-lg font-black text-slate-300 uppercase italic tracking-tighter">Sin Selección</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Selecciona un artículo de la izquierda para comenzar</p>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto w-full p-12">
                            {/* Target Languages Selection */}
                            <section className="mb-12">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                        <Plus size={16} />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-800 uppercase italic tracking-tight">Seleccionar Idiomas de Destino</h3>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {AVAILABLE_LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => toggleLanguage(lang.code)}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                                                selectedLanguages.includes(lang.code)
                                                    ? "bg-purple-50 border-purple-200 shadow-md shadow-purple-500/5 ring-2 ring-purple-500/10"
                                                    : "bg-white border-slate-100 hover:border-slate-300 text-slate-400"
                                            )}
                                        >
                                            <span className="text-2xl mb-1">{lang.flag}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                                {lang.name}
                                            </span>
                                            {selectedLanguages.includes(lang.code) && (
                                                <div className="absolute top-2 right-2">
                                                    <CheckCircle2 size={12} className="text-purple-600" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Execution & Progress */}
                            <AnimatePresence>
                                {selectedLanguages.length > 0 && (
                                    <motion.section 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-slate-50/50 rounded-[40px] p-10 border border-slate-100 shadow-inner"
                                    >
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                    <History size={16} />
                                                </div>
                                                <h3 className="text-xs font-black text-slate-800 uppercase italic tracking-tight text-center">Cola de Trabajo ({selectedLanguages.length})</h3>
                                            </div>
                                            {isTranslating && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">
                                                    <Loader2 size={12} className="animate-spin text-purple-600" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-600">Procesando por Lotes...</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            {selectedLanguages.map(code => {
                                                const lang = AVAILABLE_LANGUAGES.find(l => l.code === code);
                                                const status = progress[code] || 'pending';
                                                
                                                return (
                                                    <div 
                                                        key={code}
                                                        className={cn(
                                                            "flex items-center justify-between p-5 rounded-3xl border transition-all",
                                                            status === 'processing' ? "bg-white border-purple-200 shadow-lg shadow-purple-500/5 ring-2 ring-purple-500/5" : "bg-white border-slate-100"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xl">{lang?.flag}</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black text-slate-800 uppercase italic leading-none">{lang?.name}</span>
                                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Versión de Salida</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <div className="flex items-center gap-2">
                                                                {status === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-200" />}
                                                                {status === 'processing' && <Loader2 size={14} className="animate-spin text-purple-600" />}
                                                                {status === 'done' && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                                {status === 'error' && <X size={14} className="text-rose-500" />}
                                                                <span className={cn(
                                                                    "text-[9px] font-black uppercase tracking-widest",
                                                                    status === 'pending' && "text-slate-300",
                                                                    status === 'processing' && "text-purple-600",
                                                                    status === 'done' && "text-emerald-600 text-center",
                                                                    status === 'error' && "text-rose-600"
                                                                )}>
                                                                    {status === 'pending' && "Esperando..."}
                                                                    {status === 'processing' && "Traduciendo Cuerpo & Meta..."}
                                                                    {status === 'done' && "Listo"}
                                                                    {status === 'error' && "Fallo"}
                                                                </span>
                                                            </div>

                                                            {status === 'done' && (
                                                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer">
                                                                    <FileText size={14} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.section>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
