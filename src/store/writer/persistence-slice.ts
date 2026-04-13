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
    switchLanguage: (langCode: string) => Promise<void>;
    deleteVersion: (taskId: string) => Promise<void>;
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
    loadResearchData: async (contentId) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('content_research')
            .select('*')
            .eq('content_id', contentId)
            .maybeSingle();

        if (!error && data) {
            set((state) => {
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

    saveResearchData: async (contentId, keyword, serp, competitors) => {
        const { supabase } = require('@/lib/supabase');
        await supabase.from('content_research').upsert({
            content_id: contentId,
            keyword,
            serp_data: serp,
            competitors_data: competitors
        }, { onConflict: 'content_id' });
    },

    loadProjectContents: async (projectId) => {
        const { supabase } = require('@/lib/supabase');
        let query = supabase.from('tasks').select('*');

        if (Array.isArray(projectId)) {
            query = query.in('project_id', projectId);
        } else {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query
            .in('status', ['por_redactar', 'por_corregir', 'en_redaccion', 'publicado', 'por_maquetar'])
            .is('translation_parent_id', null) // Solo mostrar contenido original/padre
            .order('created_at', { ascending: false });
        if (!error && data) set({ projectContents: data } as any);
    },

    loadContentById: async (contentId) => {
        const { supabase } = require('@/lib/supabase');
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', contentId)
            .maybeSingle();

        if (!error && data) {
            console.log(`[Persistence] Task loaded: "${data.title}" (ID: ${contentId}) content_body present: ${!!data.content_body}`);
            const dossier = (data as any).research_dossier || (data as any).seo_data || null;
            const { initializeFromTask, loadResearchData } = get() as any;
            
            // We use a simplified version of initializeFromTask logic here or call it directly
            if (initializeFromTask) {
                initializeFromTask(data, { id: data.project_id });
            }
            
            // Cargar versiones de idiomas
            const parentId = data.translation_parent_id || data.id;
            const { data: versions } = await supabase
                .from('tasks')
                .select('id, language')
                .or(`id.eq.${parentId},translation_parent_id.eq.${parentId}`);

            if (versions) {
                const versionMap = versions.reduce((acc: any, v: any) => ({
                    ...acc,
                    [v.language]: v.id
                }), {});
                set({ contentVersions: versionMap, parentTaskId: parentId });
            }
            
            if (loadResearchData) await loadResearchData(contentId);
            if (get().loadTaskImages) await get().loadTaskImages(contentId);
        }
    },

    deleteContent: async (contentId) => {
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

    initializeFromTask: (task, project) => set((state) => {
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
            content: task.content_body || '',
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
            strategyLinks: dossier?.suggestedInternalLinks || dossier?.suggested_links || dossier?.suggestedLinks || (task as any).suggested_links || [],
            projectId: project?.id || task.project_id || null,
            currentLanguage: task.language || 'es',
            viewMode: 'workspace'
        } as any;
    }),
    
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
            .select('*')
            .eq('task_id', taskId);
            
        if (!error && data) {
            set({ taskImages: data });
        } else {
            console.error('[Persistence] Error loading images:', error);
        }
    },

    finishContent: async () => {
        const { draftId, setStatus, setViewMode } = get() as any;
        if (!draftId) return;

        const { supabase } = require('@/lib/supabase');
        const { error } = await supabase
            .from('tasks')
            .update({ status: 'publicado' })
            .eq('id', draftId);

        if (!error) {
            if (setStatus) setStatus('✅ Contenido marcado como Publicado');
            setTimeout(() => {
                if (setStatus) setStatus('');
                if (setViewMode) setViewMode('dashboard');
            }, 2000);
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
