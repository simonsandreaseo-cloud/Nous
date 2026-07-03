import { StateCreator } from 'zustand';
import { WriterStoreState, StrategyOutlineItem } from './types';
import { toast } from 'sonner';


export interface StrategyActions {
    setStrategyTitle: (title: string) => void;
    setStrategyH1: (h1: string) => void;
    setStrategySlug: (slug: string) => void;
    setStrategyDesc: (desc: string) => void;
    setStrategyExcerpt: (excerpt: string) => void;
    setStrategyWordCount: (val: string) => void;
    setStrategyTone: (tone: string) => void;
    setStrategyOutline: (outline: StrategyOutlineItem[]) => void;
    setStrategyCompetitors: (competitors: string) => void;
    setStrategyNotes: (notes: string) => void;
    setStrategyLSI: (lsi: { keyword: string; count: string | number }[]) => void;
    setStrategyQuestions: (questions: string[]) => void;
    setStrategyLinks: (links: any[]) => void;
    setRawSeoData: (data: any) => void;
    setDetectedNiche: (niche: string) => void;
    updateSectionProgress: (idx: number, count: number) => void;
    updateStrategyFromSeo: (seoData: any) => void;
    refreshInterlinking: (mode?: 'append' | 'overwrite', customKeywords?: string, count?: number) => Promise<void>;
    generateInterlinkingKeywordsWithAI: (content: string, count?: number) => Promise<void>;
    resetStrategy: () => void;
    setStrategyDensity: (density: number) => void;
}

export type StrategySlice = WriterStoreState & StrategyActions;

export const createStrategySlice: StateCreator<StrategySlice, [], [], StrategySlice> = (set, get) => ({
    // Initial State
    strategyTitle: '',
    strategyH1: '',
    strategySlug: '',
    strategyDesc: '',
    strategyExcerpt: '',
    strategyWordCount: '1500',
    strategyTone: 'Profesional y cercano',
    strategyOutline: [],
    strategyCompetitors: '',
    strategyNotes: '',
    strategyLinks: [],
    strategyCannibalization: [],
    strategyVolume: '0',
    strategyDifficulty: '0',
    competitorDetails: [],
    strategyLSI: [],
    strategyKeywords: [],
    strategyInternalLinks: [],
    strategyExternalLinks: [],
    strategyMinWords: '1000',
    strategyMaxWords: '2000',
    strategyLongTail: [],
    strategyQuestions: [],
    detectedNiche: '',
    rawSeoData: null,
    seoResults: null,
    researchDossier: null,
    outlineStructure: null,
    strategyDensity: 0,

    // Actions
    setStrategyTitle: (strategyTitle) => set({ strategyTitle }),
    setStrategyH1: (strategyH1) => set({ strategyH1, title: strategyH1 }),
    setStrategySlug: (strategySlug) => set({ strategySlug }),
    setStrategyDesc: (strategyDesc) => set({ strategyDesc }),
    setStrategyExcerpt: (strategyExcerpt) => set({ strategyExcerpt }),
    setStrategyWordCount: (val: string) => {
        const parsed = parseInt(String(val)) || 1500;
        set({ strategyWordCount: String(parsed) });
    },
    setStrategyTone: (strategyTone) => set({ strategyTone }),
    setStrategyOutline: (strategyOutline) => {
        // Guard to prevent accidental outline clearing if it already has items
        const currentState = get();
        if (strategyOutline.length === 0 && currentState.strategyOutline && currentState.strategyOutline.length > 0) {
            console.warn('[Zustand] Attempted to clear strategyOutline to empty array, ignored to prevent outline disappearance.');
            return;
        }
        set({ strategyOutline });
    },
    setStrategyCompetitors: (strategyCompetitors) => set({ strategyCompetitors }),
    setStrategyNotes: (strategyNotes) => set({ strategyNotes }),
    setStrategyLSI: (strategyLSI) => set({ strategyLSI }),
    setStrategyQuestions: (strategyQuestions) => set({ strategyQuestions }),
    setStrategyLinks: (strategyLinks) => set({ strategyLinks }),
    setRawSeoData: (rawSeoData) => set({ rawSeoData, seoResults: rawSeoData }),
    setDetectedNiche: (detectedNiche) => set({ detectedNiche }),
    
    updateSectionProgress: (idx, count) => set((state) => ({
        strategyOutline: state.strategyOutline.map((item, i) =>
            i === idx ? { ...item, currentWordCount: count } : item
        )
    })),

    updateStrategyFromSeo: (seoData: any) => {
        // Dynamic require to avoid circular dependency in services that might import the store
        const { generateBriefingText } = require('@/components/tools/writer/services');
        const brief = generateBriefingText(seoData);
        
        const mainKeywordPool = seoData.keywordIdeas 
            ? [...(seoData.keywordIdeas.shortTail || []), ...(seoData.keywordIdeas.midTail || [])]
            : [];
        
        const mappedKeywords = mainKeywordPool.map((k: any) => ({
            keyword: typeof k === 'string' ? k : k.keyword, 
            volume: typeof k === 'string' ? '0' : (k.volume || '0')
        }));

        // Parse word count robustly
        const parsedWordCount = parseInt(String(seoData.recommendedWordCount || seoData.wordCountGoal || seoData.outline_structure?.totalWordCount || '1500'));
        const safeWordCount = isNaN(parsedWordCount) ? 1500 : parsedWordCount;

        set({
            rawSeoData: seoData,
            seoResults: seoData,
            strategyLSI: seoData.lsiKeywords || [],
            strategyQuestions: seoData.frequentQuestions || seoData.faqs || [],
            strategyWordCount: String(safeWordCount),
            strategyMinWords: String(Math.floor(safeWordCount * 0.8)),
            strategyMaxWords: String(Math.floor(safeWordCount * 1.2)),
            strategyNotes: brief,
            detectedNiche: seoData.nicheDetected || '',
            strategyCannibalization: (seoData as any).cannibalizationUrls || [],
            strategyVolume: seoData.searchVolume || '0',
            strategyDifficulty: seoData.keywordDifficulty || '0',
            competitorDetails: seoData.competitors || (seoData as any).top10Urls || [],
            strategyCompetitors: seoData.competitors?.map((c: any) => c.url).join('\n') || '',
            strategyLinks: seoData.suggestedInternalLinks || [],
            strategyKeywords: mappedKeywords.slice(0, 5),
            strategyInternalLinks: (seoData.suggestedInternalLinks || []).map((u: any) => ({ 
                url: u.url, 
                title: u.title || '',
                type: 'other' as const,
                search_index: "0"
            })),
            // Map SEO Metadata properly
            strategyH1: seoData.seoMetadata?.h1 || seoData.masterH1 || '',
            strategyExcerpt: seoData.seoMetadata?.excerpt || seoData.seoMetadata?.meta_description || '',
            strategySlug: seoData.seoMetadata?.target_url_slug || '',
            strategyTitle: seoData.seoMetadata?.seo_title || seoData.seoMetadata?.h1 || '',
            strategyDesc: seoData.seoMetadata?.meta_description || '',
        } as any);
    },

    refreshInterlinking: async (mode: 'append' | 'overwrite' = 'overwrite', customKeywords?: string, count: number = 5) => {
        try {
            const { strategyLinks, keyword, strategyH1, strategyExcerpt, strategyLSI, projectId } = get() as any;
            if (!projectId) return;

            set({ isRefreshingLinks: true } as any);
            const toastId = toast.loading("Buscando enlaces relacionados...", { id: "refresh-links" });

            const { supabase } = require('@/lib/supabase');
            
            let rawTerms: string[] = [];
            if (customKeywords && customKeywords.trim().length > 0) {
                rawTerms = customKeywords.split(',').map(k => k.trim().toLowerCase().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).filter(k => k.length > 2);
            } else {
                rawTerms = [
                    ...keyword.split(/\s+/),
                    ...(strategyLSI || []).map((l: any) => typeof l === 'string' ? l.split(/\s+/) : (l.keyword?.split(/\s+/) || [])).flat()
                ].filter((w: string) => w && w.length > 3).map((w: string) => w.toLowerCase().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'));
            }
            
            const allTerms = Array.from(new Set(rawTerms)).slice(0, 15);
            const searchRegex = allTerms.join('|');

            const { data: units, error: rpcError } = await supabase.rpc('get_semantic_inventory_matches_v3', { 
                p_project_id: projectId,
                p_base_regex: searchRegex,
                p_ask_regex: '',
                p_limit: 40
            });

            if (rpcError) throw rpcError;

            const newLinks = (units || []).slice(0, count).map((u: any) => ({
                url: u.url,
                title: u.title,
                anchor_text: u.title, // Default to title for the anchor text, or user can adjust later
                type: 'other' as const,
                search_index: "0"
            }));

            const { useProjectStore } = require('@/store/useProjectStore');
            const { updateTask } = useProjectStore.getState();

            let finalLinks = newLinks;
            if (mode === 'append') {
                const existingUrls = new Set(strategyLinks.map((l: any) => l.url));
                finalLinks = [...strategyLinks, ...newLinks.filter((l: any) => !existingUrls.has(l.url))];
            }

            set({ strategyLinks: finalLinks } as any);
            const dossier = (get() as any).researchDossier || {};
            await updateTask((get() as any).draftId!, { 
                research_dossier: { ...dossier, suggestedInternalLinks: finalLinks, suggested_links: finalLinks } 
            });
            
            toast.success(`Se encontraron ${newLinks.length} enlaces`, { id: "refresh-links" });
            
        } catch (e) {
            console.error("Error al refrescar interlinking:", e);
            toast.error("Error al buscar enlaces", { id: "refresh-links" });
        } finally {
            set({ isRefreshingLinks: false } as any);
        }
    },

    generateInterlinkingKeywordsWithAI: async (content: string, count: number = 5) => {
        try {
            if (!content || content.length < 50) {
                toast.error("Contenido insuficiente para analizar.");
                return;
            }
            
            set({ isRefreshingLinks: true } as any);
            toast.loading("Analizando contenido con Gemini 3.5 Flash...", { id: "ai-links" });
            
            // Clean content from HTML tags roughly to save tokens, though Gemini handles HTML fine
            const plainText = content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 15000); 

            const prompt = `Analiza el siguiente texto y extrae las 10 a 15 entidades, conceptos clave, nombres de productos o temas principales más importantes que serían excelentes textos de anclaje (anchor texts) para enlaces internos. 
Responde ÚNICAMENTE con un array de strings en formato JSON. Ejemplo: ["marketing digital", "estrategia seo", "zapatillas nike"]. 
Texto:\n\n${plainText}`;

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model: 'gemini-3.5-flash',
                    systemPrompt: 'Eres un experto en arquitectura de información SEO.',
                    jsonMode: true
                })
            });

            if (!response.ok) throw new Error("Error en la API de IA");
            
            const data = await response.json();
            let keywords = [];
            
            try {
                // Parse the response which should be a JSON array
                keywords = JSON.parse(data.text);
                if (!Array.isArray(keywords)) throw new Error("Invalid format");
            } catch (err) {
                // Fallback parsing just in case
                const match = data.text.match(/\[.*\]/s);
                if (match) {
                    keywords = JSON.parse(match[0]);
                } else {
                    throw new Error("No se pudo parsear el JSON de Gemini");
                }
            }

            toast.success("Keywords generadas con IA, buscando enlaces...", { id: "ai-links" });
            
            // Re-use the existing logic to search using these highly semantic keywords
            const customKeywordsStr = keywords.join(', ');
            await (get() as any).refreshInterlinking('overwrite', customKeywordsStr, count);
            
            toast.success("Enlaces semánticos actualizados", { id: "ai-links" });
        } catch (e) {
            console.error("Error en generateInterlinkingKeywordsWithAI:", e);
            toast.error("Error al generar enlaces con IA", { id: "ai-links" });
        } finally {
            set({ isRefreshingLinks: false } as any);
        }
    },

    resetStrategy: () => set({
        keyword: '',
        strategyTitle: '',
        strategyH1: '',
        strategySlug: '',
        strategyDesc: '',
        strategyExcerpt: '',
        strategyOutline: [],
        strategyLinks: [],
        strategyCompetitors: '',
        strategyLSI: [],
        strategyLongTail: [],
        strategyQuestions: [],
        rawSeoData: null,
        seoResults: null,
        detectedNiche: '',
        contextInstructions: '',
        metadata: null,
        statusMessage: '',
        viewMode: 'setup',
    } as any),
    setStrategyDensity: (strategyDensity) => set({ strategyDensity }),
} as any);
