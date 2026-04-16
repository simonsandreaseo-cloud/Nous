'use client';

import { useState, useMemo, useEffect } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { AVAILABLE_LANGUAGES } from '@/constants/languages';
import { Languages, CheckCircle2, Loader2, AlertCircle, Square, CheckSquare, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { executeTranslation } from '@/lib/services/writer/ai-core';

import { LinkPatcherService } from '@/lib/services/link-patcher';
import { mdToHtml } from '@/utils/markdown';
import { NotificationService } from '@/lib/services/notifications';

export default function TranslationSidebarPanel() {
    const { 
        draftId, content, strategyH1, strategyTitle, strategySlug, strategyDesc, 
        strategyExcerpt, contentVersions, projectId, loadContentById,
        parentTaskId, currentLanguage, setVersionStatus, deleteVersion
    } = useWriterStore();
    
    const { projects, addTask } = useProjectStore();
    const activeProject = projects.find(p => p.id === projectId) || null;
    
    const [isTranslating, setIsTranslating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [progress, setProgress] = useState<{ [key: string]: 'pending' | 'processing' | 'done' | 'error' }>({});
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    // Get target languages from project settings
    const targetLanguages = useMemo(() => {
        return activeProject?.settings?.content_preferences?.default_translator_languages || [];
    }, [activeProject]);

    // All languages (including already translated ones)
    const allLanguages = useMemo(() => {
        return targetLanguages.filter(lang => lang !== 'es');
    }, [targetLanguages]);

    // Detect which languages are missing (needs translation)
    const missingLanguages = useMemo(() => {
        return targetLanguages.filter(lang => !contentVersions[lang] && lang !== 'es');
    }, [targetLanguages, contentVersions]);

    // Initialize selection with languages that HAVE translation by default
    useEffect(() => {
        if (selectedLanguages.length === 0 && allLanguages.length > 0) {
            // Default: select all languages that are already translated
            setSelectedLanguages(allLanguages);
        }
    }, []); // Only run once on mount

    const toggleLanguage = (langCode: string) => {
        if (isTranslating || isDeleting) return;
        
        const isReady = !!contentVersions[langCode];
        const canToggle = isDeleteMode ? isReady : !isReady;
        if (!canToggle) return;
        
        setSelectedLanguages(prev => 
            prev.includes(langCode) 
                ? prev.filter(l => l !== langCode)
                : [...prev, langCode]
        );
    };

    const handleToggleDeleteMode = () => {
        if (selectedLanguages.length === 0) return;
        
        if (!isDeleteMode) {
            // Entering delete mode - select only those WITH translations (can be deleted)
            const translatable = allLanguages.filter(l => contentVersions[l]);
            setSelectedLanguages(translatable);
            setIsDeleteMode(true);
        } else {
            // Exiting delete mode - reset selection to all
            setSelectedLanguages(allLanguages);
            setIsDeleteMode(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (!isDeleteMode || selectedLanguages.length === 0 || !deleteVersion) return;
        
        // Find tasks to delete based on selected languages
        const tasksToDelete = selectedLanguages
            .filter(lang => contentVersions[lang])
            .map(lang => contentVersions[lang]);
        
        if (tasksToDelete.length === 0) {
            setIsDeleteMode(false);
            setSelectedLanguages(allLanguages);
            return;
        }
        
        setIsDeleting(true);
        
        // Delete via store
        for (const taskId of tasksToDelete) {
            await deleteVersion(taskId);
        }
        
        setIsDeleting(false);
        // Reset after delete
        setIsDeleteMode(false);
        setSelectedLanguages(allLanguages);
    };

    const handleTranslateMissing = async () => {
        if (selectedLanguages.length === 0 || isTranslating) return;
        
        // Filter to only translate languages that need translation (not already translated)
        const languagesToTranslate = selectedLanguages.filter(lang => !contentVersions[lang]);
        
        if (languagesToTranslate.length === 0) {
            NotificationService.notify("Nada que traducir", "Todos los idiomas seleccionados ya tienen traducción.");
            return;
        }
        
        setIsTranslating(true);
        const newProgress = { ...progress };
        languagesToTranslate.forEach(code => newProgress[code] = 'pending');
        setProgress(newProgress);

        const sourceId = parentTaskId || draftId;
        
        for (const langCode of languagesToTranslate) {
            setProgress(prev => ({ ...prev, [langCode]: 'processing' }));
            try {
                const langName = AVAILABLE_LANGUAGES.find(l => l.code === langCode)?.name || langCode;
                
                // 1. Translate Metadata (H1, SEO Title, Meta Desc, Excerpt)
                // We use a structured prompt for metadata but route it through our experts
                const metadataPrompt = `Translate the following metadata to ${langName}. 
Return ONLY a JSON object:
{
  "h1": "...",
  "seo_title": "...",
  "meta_description": "...",
  "excerpt": "...",
  "target_url_slug": "..."
}
Data:
H1: ${strategyH1}
SEO Title: ${strategyTitle}
Meta Desc: ${strategyDesc}
Slug: ${strategySlug}
Excerpt: ${strategyExcerpt}`;

                // We use the general executeTranslation for metadata as well, but since we need JSON, 
                // we'll wrap it or handle it. For simplicity and to keep the " cascade", we use a 
                // slightly modified call or just a separate expert.
                const metadataRaw = await executeTranslation(metadataPrompt, langName);
                let translatedData;
                try {
                    // Clean possible markdown JSON blocks
                    const jsonString = metadataRaw.replace(/```json|```/g, '').trim();
                    translatedData = JSON.parse(jsonString);
                } catch (e) {
                    console.error("Metadata JSON parse failed, using fallbacks");
                    translatedData = { h1: strategyH1, seo_title: strategyTitle, meta_description: strategyDesc, excerpt: strategyExcerpt, target_url_slug: strategySlug };
                }

                // 2. Translate Content Body (The heavy lifting)
                const translatedBody = await executeTranslation(content, langName);
                
                const htmlContent = mdToHtml(translatedBody);
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

                                const { data: createdTask } = await addTask(newTask);
                                setProgress(prev => ({ ...prev, [langCode]: 'done' }));
                                
                                // Async update: don't refresh editor, just update the versions map
                                if (setVersionStatus && createdTask) {
                                    setVersionStatus(langCode, createdTask.id);
                                }
                
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
                    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                        <div className="space-y-1.5">
                            {targetLanguages.map(langCode => {
                                const details = AVAILABLE_LANGUAGES.find(l => l.code === langCode);
                                const isReady = !!contentVersions[langCode];
                                const isActive = currentLanguage === langCode;
                                const isSelected = selectedLanguages.includes(langCode);
                                const canDelete = isReady; // Can only delete if already translated
                                const status = progress[langCode] || (isReady ? 'done' : 'pending');

                                return (
                                    <div 
                                        key={langCode}
                                        onClick={() => (isDeleteMode ? canDelete : !isReady) && toggleLanguage(langCode)}
                                        className={cn(
                                            "flex items-center justify-between py-2 px-3 rounded-xl border transition-all",
                                            // Delete mode: red highlight for selected, muted for non-deletable
                                            isDeleteMode && isSelected && canDelete && "bg-rose-50 border-rose-200 cursor-pointer",
                                            isDeleteMode && isSelected && !canDelete && "bg-slate-50 opacity-50 cursor-not-allowed",
                                            isDeleteMode && !isSelected && canDelete && "bg-white border-rose-100 cursor-pointer hover:bg-rose-50",
                                            isDeleteMode && !isSelected && !canDelete && "bg-slate-50/50 opacity-40 cursor-not-allowed",
                                            // Normal mode
                                            !isDeleteMode && isReady && "cursor-default bg-slate-50/30 border-transparent",
                                            !isDeleteMode && !isReady && isSelected && "bg-indigo-50/50 border-indigo-200 cursor-pointer",
                                            !isDeleteMode && !isReady && !isSelected && "bg-white/50 border-dashed border-slate-200 cursor-pointer",
                                            isActive && "bg-indigo-50 border-indigo-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {/* Checkbox: only for deletable in delete mode, or non-ready in normal mode */}
                                            {isDeleteMode && canDelete && isSelected && (
                                                <CheckSquare size={14} className="text-rose-500 shrink-0" />
                                            )}
                                            {isDeleteMode && canDelete && !isSelected && (
                                                <Square size={14} className="text-rose-300 shrink-0" />
                                            )}
                                            {isDeleteMode && !canDelete && (
                                                <div className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0" />
                                            )}
                                            {!isDeleteMode && isReady && !isSelected && (
                                                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                            )}
                                            {!isDeleteMode && !isReady && isSelected && (
                                                <CheckSquare size={14} className="text-indigo-500 shrink-0" />
                                            )}
                                            {!isDeleteMode && !isReady && !isSelected && (
                                                <Square size={14} className="text-slate-300 shrink-0" />
                                            )}
                                            {isActive && <span className="text-[8px] font-bold text-indigo-500">ACT</span>}
                                            <span className="text-base">{details?.flag || langCode}</span>
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "text-[9px] font-bold uppercase tracking-tight",
                                                    isActive ? "text-indigo-600" : 
                                                    isReady ? "text-slate-400" : "text-slate-500"
                                                )}>
                                                    {details?.name || langCode}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {status === 'processing' ? (
                                                <Loader2 size={12} className="animate-spin text-emerald-500" />
                                            ) : status === 'done' ? (
                                                null
                                            ) : status === 'error' ? (
                                                <AlertCircle size={12} className="text-rose-500" />
                                            ) : !isReady ? (
                                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            {/* Sticky Bottom Section */}
            <div className="sticky bottom-0 mt-auto p-4 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-10">
                {(selectedLanguages.length > 0 && !isDeleteMode) && (
                    <div className="mb-3">
                        <p className="text-[9px] font-bold text-slate-500 text-center">
                            {selectedLanguages.length === allLanguages.length 
                                ? `${selectedLanguages.length} idiomas` 
                                : `Seleccionados: ${selectedLanguages.length}/${allLanguages.length}`}
                        </p>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {/* Toggle Delete Mode Button */}
                    <button
                        onClick={handleToggleDeleteMode}
                        disabled={isDeleting}
                        className={cn(
                            "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
                            isDeleteMode 
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-lg hover:bg-emerald-600"
                                : "bg-white text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-500",
                            isDeleting && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isDeleteMode ? <Languages size={16} /> : <Trash2 size={16} />}
                    </button>

                    {/* Translate Button */}
                    <button
                        onClick={isDeleteMode ? handleDeleteSelected : handleTranslateMissing}
                        disabled={selectedLanguages.length === 0 || isTranslating || isDeleting}
                        className={cn(
                            "flex-1 h-10 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] font-bold uppercase tracking-wider",
                            selectedLanguages.length === 0 || isTranslating || isDeleting
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent"
                                : isDeleteMode
                                    ? "bg-rose-500 text-white border-rose-600 hover:bg-rose-600"
                                    : "bg-[#E2F5ED] text-[#1E5D45] border border-emerald-200 hover:bg-emerald-500 hover:text-white"
                        )}
                    >
                        {isTranslating ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : isDeleting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : isDeleteMode ? (
                            <Trash2 size={14} />
                        ) : (
                            <Languages size={14} />
                        )}
                        <span>
                            {isDeleteMode 
                                ? `Eliminar ${selectedLanguages.length}`
                                : isTranslating 
                                    ? "Procesando..." 
                                    : allLanguages.length > 0 
                                        ? selectedLanguages.length === allLanguages.length 
                                            ? "Traducir Todo" 
                                            : `Traducir ${selectedLanguages.length}`
                                        : "Nada"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
