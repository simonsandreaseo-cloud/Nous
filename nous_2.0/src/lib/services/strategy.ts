import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG, getGeminiKey } from '@/lib/ai/config';
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
        // 1. Get Rotating API Key
        const apiKey = getGeminiKey();
        if (!apiKey) throw new Error("Gemini API Keys missing");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: AI_CONFIG.gemini.models.flash });

        const prompt = `Actúa como un experto en SEO clínico. Genera metadatos optimizados para:
        Título: ${title}
        Keyword: ${keyword || 'N/A'}

        Responde en formato JSON con los campos: metaTitle, h1, metaDescription, slug.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

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
