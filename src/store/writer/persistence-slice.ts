import { StateCreator } from 'zustand';
import { WriterStoreState, StrategyOutlineItem } from './types';

export interface PersistenceActions {
    loadResearchData: (contentId: string) => Promise<void>;
    saveResearchData: (contentId: string, keyword: string, serp: any, competitors: any) => Promise<void>;
    loadProjectContents: (projectId: string | string[]) => Promise<void>;
    loadContentById: (contentId: string) => Promise<void>;
    deleteContent: (contentId: string) => Promise<boolean>;
    initializeFromTask: (task: any, project: any) => void;
    loadProjectInventory: (projectId: string) => Promise<void>;
    loadTaskImages: (taskId: string) => Promise<void>;
    finishContent: () => Promise<void>;
    updateTaskStatus: (newStatus: string) => Promise<void>;
    switchLanguage: (langCode: string) => Promise<void>;
    deleteVersion: (taskId: string) => Promise<void>;
    setVersionStatus: (langCode: string, taskId: string | null) => void;
}

export type PersistenceSlice = WriterStoreState & PersistenceActions;

export const createPersistenceSlice: StateCreator<PersistenceSlice, [], [], PersistenceSlice> = (set, get) => ({
    // Initial State
    projectContents: [],
    csvData: [],
    csvFileName: null,
    projectName: '',
    taskImages: [],
    
    // Multi-Language State
    currentLanguage: 'es',
    parentTaskId: null,
    contentVersions: {},

    // Actions
    loadResearchData: async (contentId: string) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('content_research')
            .select('*')
            .eq('content_id', contentId)
            .maybeSingle();

        if (!error && data) {
            set((state: any) => {
                const serp = data.serp_data || {};
                const sLinks = serp.suggestedInternalLinks || serp.suggested_links || serp.suggestedLinks || [];
                
                return {
                    rawSeoData: serp || state.rawSeoData,
                    competitorDetails: data.competitors_data || state.competitorDetails,
                    strategyLinks: (sLinks && sLinks.length > 0) ? sLinks : state.strategyLinks
                } as any;
            });
        }
    },

    saveResearchData: async (contentId: string, keyword: string, serp: any, competitors: any) => {
        const { supabase } = require('@/lib/supabase');
        await supabase.from('content_research').upsert({
            content_id: contentId,
            keyword,
            serp_data: serp,
            competitors_data: competitors
        }, { onConflict: 'content_id' });
    },

    loadProjectContents: async (projectId: string | string[]) => {
        const { supabase } = require('@/lib/supabase');
        let query = supabase.from('tasks').select('*');

        if (Array.isArray(projectId)) {
            query = query.in('project_id', projectId);
        } else {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query
            .is('translation_parent_id', null) // Solo mostrar contenido original/padre
            .order('created_at', { ascending: false });
        if (!error && data) set({ projectContents: data } as any);
    },

    loadContentById: async (contentId: string) => {
        const { supabase } = require('@/lib/supabase');
        // Fetch the task metadata
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', contentId)
            .maybeSingle();

        if (!error && data) {
            const { initializeFromTask, loadResearchData } = get() as any;
            
            if (initializeFromTask) {
                initializeFromTask(data, { id: data.project_id });
            }
            
            // --- Robust Version Loading ---
            // A version is either the parent itself or a task pointing to this parent
            const parentId = data.translation_parent_id || data.id;
            
            const { data: versions, error: vError } = await supabase
                .from('tasks')
                .select('id, language')
                .or(`id.eq.${parentId},translation_parent_id.eq.${parentId}`);

            if (vError) {
                console.error('[Persistence] Error loading versions:', vError);
            }

            if (versions && versions.length > 0) {
                const versionMap = versions.reduce((acc: any, v: any) => ({
                    ...acc,
                    [v.language || 'es']: v.id
                }), {});
                
                console.log(`[Persistence] Versions mapped for parent ${parentId}:`, versionMap);
                set({ contentVersions: versionMap, parentTaskId: parentId });
            } else {
                // Fallback: at least the current one
                set({ 
                    contentVersions: { [data.language || 'es']: data.id }, 
                    parentTaskId: parentId 
                });
            }
            
            // Load heavy data from satellite tables
            if (loadResearchData) await loadResearchData(contentId);
            if (get().loadTaskImages) await get().loadTaskImages(contentId);
        } else {
            console.error('[Persistence] Failed to load content by ID:', contentId, error);
        }
    },

    deleteContent: async (contentId: string) => {
        const { supabase } = require('@/lib/supabase');
        const { error } = await supabase.from('tasks').delete().eq('id', contentId);
        if (error) return false;

        const { loadProjectContents } = get() as any;
        const { useProjectStore } = require('@/store/useProjectStore');
        const { activeProjectIds } = useProjectStore.getState();
        if (activeProjectIds.length > 0 && loadProjectContents) {
            await loadProjectContents(activeProjectIds);
        }
        return true;
    },

    initializeFromTask: (task: any, project: any) => {
        const hasContentBody = task.content_body !== undefined && task.content_body !== '';
        
        if (!hasContentBody) {
            // Trigger async rehydration since Planner lightweight fetch omitted content_body
            setTimeout(() => {
                const { useProjectStore } = require('@/store/useProjectStore');
                useProjectStore.getState().fetchTaskContent(task.id).then((contentBody: string | null) => {
                    const currentDraftId = (get() as any).draftId;
                    if (currentDraftId === task.id && contentBody !== null) {
                        (get() as any).setContent(contentBody || '');
                    }
                });
            }, 0);
        }

        set((state: any) => {
            const dossier = (task as any).research_dossier || (task as any).seo_data || null;
            const seoTitle = task.seo_title || dossier?.seo_title || dossier?.strategyTitle || task.title || '';
            const h1 = task.h1 || dossier?.h1 || dossier?.title || task.title || '';
            const slug = task.target_url_slug || dossier?.slug || dossier?.target_url_slug || '';
            const desc = task.meta_description || dossier?.meta_description || '';
            const excerpt = (task as any).excerpt || dossier?.excerpt || '';
            const lsi = dossier?.lsiKeywords || dossier?.keywordIdeas || state.strategyLSI;
            const competitors = dossier?.fullCompetitorAnalysis || dossier?.competitors || dossier?.top10Urls || state.competitorDetails;
            
            // Briefing fallback
            let notes = state.strategyNotes;
            if (dossier) {
                try {
                    const { generateBriefingText } = require('@/components/tools/writer/services');
                    notes = generateBriefingText(dossier);
                } catch (e) {}
            }

            return {
                title: task.title,
                draftId: task.id,
                linkedTaskId: task.id,
                content: hasContentBody ? (task.content_body || '') : null,
                keyword: task.target_keyword || dossier?.target_keyword || '',
            strategyH1: h1,
            strategyTitle: seoTitle,
            strategySlug: slug,
            strategyDesc: desc,
            strategyExcerpt: excerpt,
            activeSidebarTab: 'generate',
            researchDossier: dossier,
            rawSeoData: dossier,
            seoResults: dossier,
            wordCountReal: task.word_count_real || 0,
            strategyWordCount: String(
                parseInt(String(task.target_word_count)) || 
                parseInt(String(dossier?.recommendedWordCount)) || 
                parseInt(String(dossier?.word_count)) || 
                parseInt(String(state.strategyWordCount)) || 
                1500
            ),
            strategyLSI: lsi,
            strategyQuestions: dossier?.frequentQuestions || state.strategyQuestions,
            strategyKeywords: dossier?.keywordIdeas || state.strategyKeywords,
            competitorDetails: competitors,
            strategyNotes: notes,
            strategyVolume: dossier?.searchVolume || dossier?.volume?.toString() || state.strategyVolume,
            strategyDifficulty: dossier?.keywordDifficulty || state.strategyDifficulty,
            strategyOutline: (() => {
                const rawOutline = (task as any).outline_structure?.headers || (task as any).outline_structure || [];
                if (!Array.isArray(rawOutline)) return [];
                return rawOutline.map(item => {
                    if (typeof item === 'string') return { type: 'h2', text: item, wordCount: '300', currentWordCount: 0 };
                    if (item && typeof item === 'object') return {
                        type: item.type || 'h2',
                        text: item.text || item.title || '',
                        wordCount: String(item.wordCount || '300'),
                        currentWordCount: item.currentWordCount || 0
                    };
                    return null;
                }).filter(Boolean) as StrategyOutlineItem[];
            })(),
            outlineStructure: (task as any).outline_structure,
            humanizerConfig: {
                ...state.humanizerConfig,
                niche: project?.settings?.niche || project?.description || 'General',
                audience: project?.settings?.audience || 'General',
            },
            strategyLinks: (() => {
                const rawAssocUrls = task.associated_url ? (typeof task.associated_url === 'string' ? task.associated_url.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean) : Array.isArray(task.associated_url) ? task.associated_url : []) : [];
                const manualLinks = rawAssocUrls.map((u: string, i: number) => ({ url: u, title: `Enlace Principal ${i+1} (Manual)`, anchor_text: "Ver más", type: "manual" }));
                const suggestedLinks = dossier?.suggestedInternalLinks || dossier?.suggested_links || dossier?.suggestedLinks || (task as any).suggested_links || [];
                const allLinksMap = new Map();
                [...manualLinks, ...suggestedLinks].forEach((l: any) => {
                    const url = l.url || l.link;
                    if (url && !allLinksMap.has(url)) allLinksMap.set(url, l);
                });
                return Array.from(allLinksMap.values());
            })(),
            projectId: project?.id || task.project_id || null,
            currentLanguage: task.language || 'es',
            viewMode: 'workspace',
            status: task.status || 'por_redactar'
        } as any;
    });
},

    switchLanguage: async (langCode: string) => {
        const { contentVersions, loadContentById, setStatus } = get() as any;
        const targetId = contentVersions[langCode];
        
        if (targetId) {
            setStatus(`Cambiando a versión: ${langCode.toUpperCase()}...`);
            await loadContentById(targetId);
            setStatus('');
        } else {
            console.warn(`[Persistence] No version found for language: ${langCode}`);
        }
    },
    
    setVersionStatus: (langCode: string, taskId: string | null) => {
        set((state) => ({
            contentVersions: taskId 
                ? { ...state.contentVersions, [langCode]: taskId }
                : Object.fromEntries(
                    Object.entries(state.contentVersions).filter(([key]) => key !== langCode)
                  )
        }));
    },
    
    loadProjectInventory: async (projectId: string) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('project_urls')
            .select('url, title, type, category')
            .eq('project_id', projectId);
            
        if (!error && data) {
            set({ csvData: (data || []).map((u: any) => ({ ...u, search_index: "0" })) });
        }
    },

    loadTaskImages: async (taskId: string) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('task_images')
            .select('id, task_id, url, alt_text, type, paragraph_index, storage_path, title')
            .eq('task_id', taskId);
            
        if (!error && data) {
            set({ taskImages: data });
        } else {
            console.error('[Persistence] Error loading images:', error);
        }
    },

    setVisualBlueprint: (blueprint: any) => set({ visualBlueprint: blueprint }),


    finishContent: async () => {
        const { draftId, projectId, setStatus, setViewMode } = get() as any;
        if (!draftId) return;

        setStatus('Maquetando diseño final...');
        try {
            const { finalizeContentAction } = await import('@/lib/actions/writerActions');
            const res = await finalizeContentAction({ taskId: draftId, projectId });

            if (!res.success) throw new Error(res.error);

            setStatus('✅ Contenido Publicado y Maquetado');
            setTimeout(() => {
                if (setStatus) setStatus('');
                if (setViewMode) setViewMode('dashboard');
            }, 2000);
        } catch (error: any) {
            setStatus('❌ Error: ' + error.message);
        }
    },

    updateTaskStatus: async (newStatus: string) => {
        const { draftId, setStatus, loadProjectContents } = get() as any;
        if (!draftId) return;

        const { supabase } = require('@/lib/supabase');
        
        // Optimistic local state update
        set({ status: newStatus } as any);

        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', draftId);

        if (!error) {
            if (setStatus) setStatus(`✅ Estado: ${newStatus.replace('_', ' ').toUpperCase()}`);
            setTimeout(() => {
                if (setStatus) setStatus('');
            }, 2000);

            // Refrescar el panel lateral con las tareas del proyecto activo
            const { useProjectStore } = require('@/store/useProjectStore');
            const activeProjectId = useProjectStore.getState().projectId;
            if (activeProjectId && loadProjectContents) {
                await loadProjectContents(activeProjectId);
            }
        } else {
            if (setStatus) setStatus('❌ Error: ' + error.message);
        }
    },
    
    deleteVersion: async (taskId: string) => {
        const { supabase } = require('@/lib/supabase');
        const { draftId, parentTaskId, loadContentById, setStatus, setViewMode } = get() as any;
        
        const isCurrent = taskId === draftId;
        const isParent = taskId === parentTaskId;
        
        setStatus('Eliminando versión...');
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        
        if (error) {
            setStatus('❌ Error al eliminar: ' + error.message);
            return;
        }
        
        if (isCurrent) {
            if (isParent) {
                // Si eliminamos el padre, volvemos al dashboard
                setStatus('✅ Proyecto eliminado. Volviendo...');
                setTimeout(() => {
                    setStatus('');
                    setViewMode('dashboard');
                }, 1500);
            } else {
                // Si eliminamos una traducción, volvemos al padre
                setStatus('✅ Versión eliminada. Volviendo al original...');
                await loadContentById(parentTaskId);
                setStatus('');
            }
        } else {
            // Si borramos algo que no es lo actual (ej. desde un panel lateral), solo refrescamos versiones
            await loadContentById(draftId);
            setStatus('✅ Versión eliminada');
            setTimeout(() => setStatus(''), 2000);
        }
    },
} as any);
