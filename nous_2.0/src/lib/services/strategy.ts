import { supabase } from '@/lib/supabase';
import { getGeminiKey } from '@/lib/ai/config';
import { runDeepSEOAnalysis as runRealDeepAnalysis } from './writer/seo-analyzer';
import { useProjectStore } from '@/store/useProjectStore';

async function queryAI(prompt: string, modelId: string = 'gemini-2.5-flash', jsonResponse: boolean = true): Promise<string> {
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
            .from('tasks')
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

    /**
     * Runs a deep SEO research for a topic/idea.
     * Analyzes SERP, extracts LSI keywords, and builds a research dossier.
     */
    static async runDeepSEOAnalysis(
        projectId: string, 
        idea: string, 
        onProgress?: (phaseId: string) => void,
        onLog?: (phaseId: string, prompt: string) => void,
        modelName: string = 'gemini-2.5-flash'
    ): Promise<any> {
        try {
            // Fetch project inventory for semantic links
            const { data: projectData } = await supabase.from('projects').select('name, domain').eq('id', projectId).single();
            const { data: inventory } = await supabase.from('project_urls').select('url, title').eq('project_id', projectId).limit(10000);
            
            const results = await runRealDeepAnalysis(
                idea, 
                inventory || [], 
                projectData?.name || "", 
                false, 
                projectId,
                onProgress,
                onLog,
                modelName
            );

            return results;
        } catch (e) {
            console.error("Deep SEO Analysis Error:", e);
            // Fallback object safely as "Idea"
            return {
                title: idea,
                target_keyword: idea,
                volume: 0,
                word_count: 1000,
                brief: "La investigación profunda falló. Se usará la idea base.",
                research_dossier: {
                    lsiKeywords: [],
                    top10Urls: []
                }
            };
        }
    }
}
