import { StateCreator } from 'zustand';
import { WriterStoreState, StrategyOutlineItem } from './types';
import { executeWithGroq } from '@/lib/services/groq';
import { safeJsonExtract } from '@/utils/json';

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
    refreshInterlinking: (mode?: 'append' | 'overwrite') => Promise<void>;
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
    setStrategyOutline: (strategyOutline) => set({ strategyOutline }),
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

        set({
            rawSeoData: seoData,
            seoResults: seoData,
            strategyLSI: seoData.lsiKeywords || [],
            strategyQuestions: seoData.frequentQuestions || [],
            strategyWordCount: String(parseInt(String(seoData.recommendedWordCount)) || '1500'),
            strategyMinWords: String(Math.floor(parseInt(String(seoData.recommendedWordCount || '1500')) * 0.8)),
            strategyMaxWords: String(Math.floor(parseInt(String(seoData.recommendedWordCount || '1500')) * 1.2)),
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
        } as any);
    },

    refreshInterlinking: async (mode: 'append' | 'overwrite' = 'overwrite') => {
        try {
            const { strategyLinks, keyword, strategyH1, strategyExcerpt, strategyLSI, projectId } = get() as any;
            if (!projectId) return;

            set({ isRefreshingLinks: true } as any);

            const { supabase } = require('@/lib/supabase');
            const rawTerms = [
                ...keyword.split(/\s+/),
                ...(strategyLSI || []).map((l: any) => typeof l === 'string' ? l.split(/\s+/) : (l.keyword?.split(/\s+/) || [])).flat()
            ].filter((w: string) => w && w.length > 3).map((w: string) => w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const allTerms = Array.from(new Set(rawTerms)).slice(0, 15);
            const searchRegex = allTerms.join('|');

            const { data: units, error: rpcError } = await supabase.rpc('get_semantic_inventory_matches', { 
                p_project_id: projectId,
                p_regex: searchRegex,
                p_limit: 40
            });

            if (rpcError) throw rpcError;

            const highLsis = (strategyLSI || []).filter((l: any) => typeof l !== 'string' && l.count === "Alto").map((l: any) => l.keyword).join(", ");
            const linkPrompt = `ESTRATEGIA DE INTERLINKING PARA: "${keyword}"
H1 PROPUESTO: "${strategyH1}"
RESUMEN: "${strategyExcerpt}"
KEYWORDS CLAVE: ${highLsis || keyword}

CATÁLOGO DISTRIBUIDO POR CATEGORÍAS:
${JSON.stringify((units || []).map((u: any) => ({ 
    title: u.title.substring(0, 60), 
    url: u.url, 
    category: u.category 
})))}

REGLAS:
1. Elige los 5 artículos del catálogo que mejor conecten semánticamente con el contenido.
2. ${mode === 'overwrite' ? 'Ignora los enlaces actuales y genera una lista totalmente nueva.' : 'Busca enlaces complementarios a los que ya existen.'}
3. Retorna ÚNICAMENTE un array JSON válido: [{"url": "...", "title": "...", "anchor_text": "..."}]`;

            const linkRes = await executeWithGroq(linkPrompt, "Arquitecto de Interlinking SEO.", "llama-3.1-8b-instant", true);
            const newLinks = safeJsonExtract(linkRes, []);

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
            
        } catch (e) {
            console.error("Error al refrescar interlinking:", e);
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
