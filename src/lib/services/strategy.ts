import { supabase } from '@/lib/supabase';
import { getGeminiKey } from '@/lib/ai/config';
import { ResearchOrchestrator } from '@/lib/services/writer/research';
import { type DeepSEOConfig } from '@/lib/services/writer/types';

import { useProjectStore } from '@/store/useProjectStore';
import { useWriterStore } from '@/store/useWriterStore';
import type { DeepSEOAnalysisResult } from '@/lib/services/writer/types';

async function queryAI(prompt: string, modelId: string = 'default', jsonResponse: boolean = true): Promise<string> {
    const { executeWithKeyRotation } = await import('./writer/ai-core');
    return executeWithKeyRotation(
        async (client, model) => {
            const modelObj = client.getGenerativeModel({
                model,
                generationConfig: {
                    responseMimeType: jsonResponse ? "application/json" : "text/plain",
                    temperature: 0.2
                }
            });
            const res = await modelObj.generateContent(prompt);
            return res.response.text();
        },
        modelId,
        undefined,
        undefined,
        false,
        'Investigación SEO'
    );
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
    static async runDeepSEOAnalysis(config: DeepSEOConfig & { projectId: string, phaseToRun?: any }): Promise<any> {
        const { projectId, keyword, onProgress, onLog, modelName, taskId, isFastMode, cascade, forceRestart } = config;
        try {
            return await ResearchOrchestrator.runDeepAnalysis({
                keyword: keyword || config.keyword,
                projectId,
                taskId,
                onProgress,
                onLog,
                isFastMode,
                forceRestart,
                cascade
            }, config.phaseToRun);
        } catch (e) {
            console.error("Deep SEO Analysis Error:", e);
            return {
                title: keyword,
                target_keyword: keyword,
                volume: 0,
                word_count: 1000,
                brief: "La investigación profunda falló. Se usará la idea base.",
                research_dossier: {
                    lsiKeywords: [],
                    top10Urls: []
                },
                status: 'en_investigacion'
            };
        }
    }

    /**
     * Validates the quality of the research dossier for a specific task.
     */
    static async validateResearchQuality(taskId: string): Promise<any> {
        return await ResearchOrchestrator.validateQuality(taskId);
    }

    /**
     * Helper to route logs to the global AI Console
     */
    static addLog(taskId: string, phase: string, message: string) {
        addStrategyLog(taskId, phase, message);
    }
}

/**
 * Standalone log helper to ensure reliable imports and execution.
 */
export function addStrategyLog(taskId: string, phase: string, message: string, response?: string) {
    useWriterStore.getState().addDebugPrompt(phase, message, response);
}
