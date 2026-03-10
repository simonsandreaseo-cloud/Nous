import { supabase } from '@/lib/supabase';
import { LocalNodeBridge } from '@/lib/local-node/bridge';
import { getGeminiKey } from '@/lib/ai/config';

async function queryAI(prompt: string, modelId: string = 'gemini-1.5-flash', jsonResponse: boolean = true): Promise<string> {
    // Read ai mode from cookie (compatible with Client Components and SSR)
    let aiMode = 'cloud';
    if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(^| )nous_ai_mode=([^;]+)/);
        if (match && match[2]) aiMode = match[2];
    }

    if (aiMode === 'local') {
        return (LocalNodeBridge as any).promptAI(prompt);
    } else {
        const apiKey = getGeminiKey();
        if (!apiKey) throw new Error("Gemini API Key missing");
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: modelId });
        const config: any = {};
        if (jsonResponse) config.responseMimeType = 'application/json';
        const res = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: config
        });
        return res.response.text();
    }
}
import { Task } from '@/types/project';

// Basic interfaces ported from legacy metadataService
export interface SerpSnippet {
    position: number;
    title: string;
    url: string;
    snippet: string;
}

export interface MetadataResult {
    metaTitle: string;
    h1: string;
    metaDescription: string;
    slug: string;
}

export class StrategyService {
    /**
     * Generates SEO metadata for a task based on its title and target keyword.
     * Ports logic from legacy metadataService.ts
     */
    static async generateMetadata(taskId: string, title: string, keyword?: string): Promise<MetadataResult> {
        const prompt = `[System]: Actúa como un experto en SEO clínico. Genera metadatos optimizados. Responde ÚNICAMENTE en JSON con los campos: metaTitle, h1, metaDescription, slug. No incluyas markdown.
        
[User]:
Título: ${title}
Keyword: ${keyword || 'N/A'}`;

        const text = await queryAI(prompt);

        // Basic JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid AI response");

        const metadata = JSON.parse(jsonMatch[0]);

        // 2. Update task in Supabase
        await supabase
            .from('content_tasks')
            .update({
                metadata,
                target_keyword: keyword,
                target_url_slug: metadata.slug
            })
            .eq('id', taskId);

        return metadata;
    }

    /**
     * Suggests new tasks based on GSC performance data.
     * Ported from the "Plan de Ejecución Anual" concept.
     */
    static async suggestTasksFromMetrics(projectId: string): Promise<any[]> {
        // Find keywords with high impressions but low CRT/position
        const { data: metrics } = await supabase
            .from('gsc_daily_metrics')
            .select('*')
            .eq('project_id', projectId)
            .order('date', { ascending: false })
            .limit(7);

        if (!metrics || metrics.length === 0) return [];

        // Simple prioritization logic: return unique top queries from last sync
        const latestQueries = metrics[0].top_queries || [];
        return latestQueries
            .filter((q: any) => q.position > 10 && q.impressions > 100)
            .slice(0, 5)
            .map((q: any) => ({
                title: `Optimizar para: ${q.term}`,
                target_keyword: q.term,
                priority: 'high'
            }));
    }
}
