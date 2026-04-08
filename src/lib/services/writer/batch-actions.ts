import { Task } from '@/types/project';
import { supabase } from '@/lib/supabase';
import { 
    runDeepSEOAnalysis, 
    generateOutlineStrategy, 
    generateArticleStream,
    runHumanizerPipeline,
    buildPrompt,
    ArticleConfig
} from '@/components/tools/writer/services';
import { StrategyService } from '@/lib/services/strategy';
import { NotificationService } from '@/lib/services/notifications';

/**
 * Servicio encargado de la ejecución secuencial de procesos masivos
 * para el Calendario Editorial mediante el Orbe Nous.
 */
export const BatchProcessor = {
    
    /**
     * Genera Outlines para tareas con investigación pero sin estructura.
     */
    async processOutlines(
        tasks: Task[], 
        projectId: string,
        csvData: any[],
        onProgress: (percent: number) => void,
        onLog: (taskId: string, stage: string, msg: string) => void,
        onTaskUpdate?: (id: string, updates: Partial<Task>) => void,
        onTaskProgress?: (id: string, percent: number) => void
    ) {
        let count = 0;
        for (const task of tasks) {
            try {
                onLog(task.id, 'Outline', `Diseñando arquitectura para: ${task.title}`);
                onTaskProgress?.(task.id, 10);
                
                const config: ArticleConfig = {
                    projectName: 'Nous Project',
                    niche: task.metadata?.niche || 'General',
                    topic: task.h1 || task.title,
                    metaTitle: task.seo_title || task.title,
                    keywords: task.target_keyword || '',
                    tone: 'Profesional',
                    wordCount: '1500',
                    refUrls: '',
                    refContent: task.research_dossier?.brief || '',
                    approvedLinks: task.research_dossier?.suggestedInternalLinks || [],
                    csvData: csvData || []
                };

                const res = await generateOutlineStrategy(config, task.target_keyword || task.title, task.research_dossier);
                onTaskProgress?.(task.id, 90);

                // Harmonize: use flat array (res.outline.headers) as standard
                const headers = res.outline?.headers || [];
                const updates: Partial<Task> = {
                    outline_structure: headers,
                    h1: res.snippet?.h1 || task.title,
                    seo_title: res.snippet?.metaTitle || task.title,
                    target_url_slug: res.snippet?.slug || '',
                    meta_description: res.snippet?.metaDescription || '',
                    status: 'por_redactar'
                };

                await supabase.from('tasks').update(updates).eq('id', task.id);
                onTaskUpdate?.(task.id, updates);

                onLog(task.id, 'Outline', `✅ Estructura de ${headers.length} secciones generada.`);
                onTaskProgress?.(task.id, 100);
            } catch (error: any) {
                console.error("[BatchProcessor] Outline error:", error);
                onLog(task.id, 'Error', `❌ Error en Outline: ${error.message}`);
                onTaskProgress?.(task.id, 0);
            }
            count++;
            onProgress((count / tasks.length) * 100);
        }
    },

    /**
     * Redacta artículos completos para tareas con Outline listo.
     */
    async processDrafts(
        tasks: Task[],
        onProgress: (percent: number) => void,
        onLog: (taskId: string, stage: string, msg: string) => void,
        onTaskUpdate?: (id: string, updates: Partial<Task>) => void,
        onTaskProgress?: (id: string, percent: number) => void
    ) {
        let count = 0;
        for (const task of tasks) {
            try {
                onLog(task.id, 'Redacción', `Redactando contenido para: ${task.title}`);
                onTaskProgress?.(task.id, 10);
                
                // Robustness: handle both array (new standard) and object (old legacy) formats
                const rawOutline = task.outline_structure;
                const outlineArray = Array.isArray(rawOutline) 
                    ? rawOutline 
                    : (rawOutline?.headers || []);

                if (outlineArray.length === 0) {
                    onLog(task.id, 'Aviso', `⚠️ El contenido no tiene estructura definida. Usando modo genérico.`);
                }

                const config: ArticleConfig = {
                    projectName: 'Nous Project',
                    niche: task.metadata?.niche || 'General',
                    topic: task.h1 || task.title,
                    metaTitle: task.seo_title || task.title,
                    keywords: task.target_keyword || '',
                    tone: 'Profesional',
                    wordCount: '1500',
                    refUrls: '',
                    refContent: task.research_dossier?.brief || '',
                    csvData: [],
                    outlineStructure: outlineArray,
                    approvedLinks: task.research_dossier?.suggestedInternalLinks || []
                };

                const prompt = buildPrompt(config);
                const stream = await generateArticleStream('gemma-3-27b-it', prompt);
                let fullContent = '';
                
                for await (const chunk of (stream as any)) {
                    if (chunk.text) {
                        fullContent += chunk.text;
                    }
                }

                if (!fullContent || fullContent.length < 100) {
                    throw new Error("El contenido generado es demasiado corto o está vacío.");
                }

                const updates: Partial<Task> = {
                    content_body: fullContent,
                    status: 'por_corregir'
                };

                await supabase.from('tasks').update(updates).eq('id', task.id);
                onTaskUpdate?.(task.id, updates);

                onLog(task.id, 'Redacción', `✅ Artículo de ${fullContent.length} bytes guardado.`);
                onTaskProgress?.(task.id, 100);
            } catch (error: any) {
                console.error("[BatchProcessor] Drafting error:", error);
                onLog(task.id, 'Error', `❌ Error en Redacción: ${error.message}`);
                onTaskProgress?.(task.id, 0);
            }
            count++;
            onProgress((count / tasks.length) * 100);
        }
    },

    /**
     * Humaniza contenidos para quitar la "huella" de IA.
     */
    async processHumanization(
        tasks: Task[],
        onProgress: (percent: number) => void,
        onLog: (taskId: string, stage: string, msg: string) => void,
        onTaskUpdate?: (id: string, updates: Partial<Task>) => void,
        onTaskProgress?: (id: string, percent: number) => void
    ) {
        let count = 0;
        for (const task of tasks) {
            try {
                if (!task.content_body) continue;
                onLog(task.id, 'Humanización', `Iniciando humanización de alta fidelidad para: ${task.title}`);
                onTaskProgress?.(task.id, 10);
                
                const res = await runHumanizerPipeline(
                    task.content_body,
                    { 
                        niche: 'General', 
                        audience: 'General', 
                        keywords: task.target_keyword || '' 
                    },
                    0.7, // intensity
                    (status: string) => {
                        onLog(task.id, 'IA', status);
                        // Podemos extrapolar algo de progreso del status si quisiéramos
                    },
                    'gemma-3-27b-it'
                );

                const updates: Partial<Task> = {
                    content_body: res.html,
                    metadata: { 
                        ...task.metadata, 
                        is_humanized: true, 
                        humanized_at: new Date().toISOString() 
                    }
                };

                await supabase.from('tasks').update(updates).eq('id', task.id);
                onTaskUpdate?.(task.id, updates);

                onLog(task.id, 'Humanización', `✅ Contenido humanizado con éxito.`);
                onTaskProgress?.(task.id, 100);
            } catch (error: any) {
                onLog(task.id, 'Error', `❌ Error en Humanización: ${error.message}`);
                onTaskProgress?.(task.id, 0);
            }
            count++;
            onProgress((count / tasks.length) * 100);
        }
    }
};
