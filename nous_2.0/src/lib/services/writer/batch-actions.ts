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
        onProgress: (percent: number) => void,
        onLog: (taskId: string, stage: string, msg: string) => void
    ) {
        let count = 0;
        for (const task of tasks) {
            try {
                onLog(task.id, 'Outline', `Iniciando diseño de estructura para: ${task.title}`);
                
                const config: ArticleConfig = {
                    projectName: 'Nous Project',
                    niche: task.metadata?.niche || 'General',
                    topic: task.target_keyword || task.title,
                    metaTitle: task.title,
                    keywords: task.target_keyword || '',
                    tone: 'Profesional',
                    wordCount: '1500',
                    refContent: task.research_dossier?.brief || '',
                    approvedLinks: task.research_dossier?.suggestedInternalLinks || []
                };

                const res = await generateOutlineStrategy(config, task.target_keyword || task.title, task.research_dossier);
                
                await supabase.from('tasks').update({
                    outline_structure: { headers: res.outline?.headers || [] },
                    h1: res.snippet?.h1 || task.title,
                    seo_title: res.snippet?.metaTitle || task.title,
                    target_url_slug: res.snippet?.slug || '',
                    meta_description: res.snippet?.metaDescription || ''
                }).eq('id', task.id);

                onLog(task.id, 'Outline', `✅ Estructura generada con éxito.`);
            } catch (error: any) {
                onLog(task.id, 'Error', `❌ Error en Outline: ${error.message}`);
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
        onLog: (taskId: string, stage: string, msg: string) => void
    ) {
        let count = 0;
        for (const task of tasks) {
            try {
                onLog(task.id, 'Redacción', `Iniciando redacción masiva para: ${task.title}`);
                
                // Construcción de Prompt similar a WriterEditor
                const prompt = buildPrompt({
                    topic: task.h1 || task.title,
                    keywords: task.target_keyword || '',
                    outline: task.outline_structure?.headers || [],
                    links: task.research_dossier?.suggestedInternalLinks || [],
                    notes: task.research_dossier?.brief || '',
                    tone: 'Profesional',
                    wordCount: '1500'
                });

                const stream = await generateArticleStream('gemini-2.5-flash', prompt);
                let fullContent = '';
                
                for await (const chunk of stream) {
                    fullContent += chunk.text;
                }

                await supabase.from('tasks').update({
                    content_body: fullContent,
                    status: 'por_corregir'
                }).eq('id', task.id);

                onLog(task.id, 'Redacción', `✅ Artículo redactado y guardado.`);
            } catch (error: any) {
                onLog(task.id, 'Error', `❌ Error en Redacción: ${error.message}`);
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
        onLog: (taskId: string, stage: string, msg: string) => void
    ) {
        let count = 0;
        for (const task of tasks) {
            try {
                if (!task.content_body) continue;
                onLog(task.id, 'Humanización', `Iniciando humanización indetectable para: ${task.title}`);
                
                const res = await runHumanizerPipeline(
                    task.content_body,
                    { mode: 'balanced', tone: 'natural' },
                    (status) => onLog(task.id, 'Progreso', status)
                );

                await supabase.from('tasks').update({
                    content_body: res.content,
                    metadata: { 
                        ...task.metadata, 
                        is_humanized: true, 
                        humanized_at: new Date().toISOString() 
                    }
                }).eq('id', task.id);

                onLog(task.id, 'Humanización', `✅ Contenido humanizado con éxito.`);
            } catch (error: any) {
                onLog(task.id, 'Error', `❌ Error en Humanización: ${error.message}`);
            }
            count++;
            onProgress((count / tasks.length) * 100);
        }
    }
};
