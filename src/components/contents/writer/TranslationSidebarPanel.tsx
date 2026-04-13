'use client';

import { useState, useMemo } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { AVAILABLE_LANGUAGES } from '@/constants/languages';
import { Languages, Plus, CheckCircle2, Loader2, Send, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { aiRouter } from '@/lib/ai/router';
import { LinkPatcherService } from '@/lib/services/link-patcher';
import { mdToHtml } from '@/utils/markdown';
import { NotificationService } from '@/lib/services/notifications';

export default function TranslationSidebarPanel() {
    const { 
        draftId, content, strategyH1, strategyTitle, strategySlug, strategyDesc, 
        strategyExcerpt, contentVersions, projectId, loadContentById,
        parentTaskId, currentLanguage
    } = useWriterStore();
    
    const { projects, addTask } = useProjectStore();
    const activeProject = projects.find(p => p.id === projectId) || null;
    
    const [isTranslating, setIsTranslating] = useState(false);
    const [progress, setProgress] = useState<{ [key: string]: 'pending' | 'processing' | 'done' | 'error' }>({});

    // Get target languages from project settings
    const targetLanguages = useMemo(() => {
        return activeProject?.settings?.content_preferences?.default_translator_languages || [];
    }, [activeProject]);

    // Detect which languages are missing
    const missingLanguages = useMemo(() => {
        return targetLanguages.filter(lang => !contentVersions[lang] && lang !== 'es');
    }, [targetLanguages, contentVersions]);

    const handleTranslateMissing = async () => {
        if (missingLanguages.length === 0 || isTranslating) return;
        
        setIsTranslating(true);
        const newProgress = { ...progress };
        missingLanguages.forEach(code => newProgress[code] = 'pending');
        setProgress(newProgress);

        // We use the parent content as source for consistent translations
        // If we are currently in a child, we'd need to fetch the parent first or just use current if it's the original
        const sourceId = parentTaskId || draftId;
        
        for (const langCode of missingLanguages) {
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
  "target_url_slug": "url-slug-traducido-y-optimizado",
  "content_body": "cuerpo integro en markdown traducido"
}
Solo devuelve el JSON, sin texto adicional. Asegúrate de que el slug sea válido para URLs (minúsculas, guiones, sin caracteres especiales).`;

                const prompt = `Contenido original:
Título: ${strategyH1}
SEO Title: ${strategyTitle}
Meta Desc: ${strategyDesc}
Slug actual: ${strategySlug}
Resumen: ${strategyExcerpt}

Cuerpo:
${content}`;

                const response = await aiRouter.generate({
                    model: 'gemma-3-27b-it',
                    systemPrompt,
                    prompt,
                    jsonMode: true,
                    temperature: 0.3
                });

                const translatedData = JSON.parse(response.text);
                const htmlContent = mdToHtml(translatedData.content_body);
                const patchedContentBody = LinkPatcherService.patchHtmlForProcess(htmlContent, activeProject, 'translator');

                const newTask: any = {
                    project_id: projectId,
                    title: translatedData.h1,
                    h1: translatedData.h1,
                    seo_title: translatedData.seo_title,
                    meta_description: translatedData.meta_description,
                    excerpt: translatedData.excerpt,
                    target_url_slug: translatedData.target_url_slug,
                    content_body: patchedContentBody,
                    status: 'por_corregir' as any,
                    language: langCode,
                    translation_parent_id: sourceId,
                    metadata: { 
                        is_translation: true,
                        source_lang: currentLanguage || 'es'
                    }
                };

                await addTask(newTask);
                setProgress(prev => ({ ...prev, [langCode]: 'done' }));
                
                // Refresh versions in store
                if (loadContentById) await loadContentById(draftId);
                
            } catch (error) {
                console.error(`Error translating to ${langCode}:`, error);
                setProgress(prev => ({ ...prev, [langCode]: 'error' }));
            }
        }
        
        setIsTranslating(false);
        NotificationService.notify("Traducción completada", "Se han generado las versiones faltantes.");
    };

    return (
        <div className="flex flex-col h-full bg-white/50 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                        <Languages size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Traductor Integrado</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestionar Versiones</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap size={12} className="text-amber-400" /> Estados de Versión
                        </h4>
                        
                        <div className="space-y-2">
                            {targetLanguages.map(langCode => {
                                const details = AVAILABLE_LANGUAGES.find(l => l.code === langCode);
                                const isReady = !!contentVersions[langCode];
                                const isActive = currentLanguage === langCode;
                                const status = progress[langCode] || (isReady ? 'done' : 'pending');

                                return (
                                    <div 
                                        key={langCode}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-2xl border transition-all",
                                            isActive ? "bg-indigo-50 border-indigo-100 ring-2 ring-indigo-500/5" : 
                                            isReady ? "bg-white border-slate-50" : "bg-slate-50/50 border-dashed border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{details?.flag || langCode}</span>
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-tight",
                                                    isActive ? "text-indigo-600" : "text-slate-700"
                                                )}>
                                                    {details?.name || langCode}
                                                    {isActive && " (Actual)"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {status === 'processing' ? (
                                                <Loader2 size={12} className="animate-spin text-emerald-500" />
                                            ) : status === 'done' ? (
                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                            ) : status === 'error' ? (
                                                <AlertCircle size={12} className="text-rose-500" />
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            {/* Sticky Bottom Section */}
            <div className="sticky bottom-0 mt-auto p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] space-y-4 z-10">
                {missingLanguages.length > 0 && (
                    <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-[9px] font-black text-emerald-700 uppercase tracking-tight text-center flex items-center justify-center gap-2">
                            <Zap size={10} className="text-emerald-500" />
                            {missingLanguages.length === targetLanguages.length 
                                ? "Todo el proyecto por traducir" 
                                : `Faltan ${missingLanguages.length} versiones por generar`}
                        </p>
                    </div>
                )}

                <button
                    onClick={handleTranslateMissing}
                    disabled={missingLanguages.length === 0 || isTranslating}
                    className={cn(
                        "w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl",
                        missingLanguages.length === 0 || isTranslating
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                            : "bg-[#E2F5ED] text-[#1E5D45] hover:bg-emerald-500 hover:text-white hover:-translate-y-1 active:scale-95 shadow-emerald-500/10 border border-emerald-200/50"
                    )}
                >
                    {isTranslating ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Plus size={18} />
                    )}
                    <span className="text-[11px] font-black uppercase tracking-widest italic">
                        {isTranslating 
                            ? "Traduciendo..." 
                            : missingLanguages.length === targetLanguages.length || Object.keys(contentVersions).length <= 1
                                ? "Traducir" 
                                : "Traducir Faltantes"}
                    </span>
                </button>
            </div>
        </div>
    );
}
