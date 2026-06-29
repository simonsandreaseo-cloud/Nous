import { useProjectStore } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { supabase } from '@/lib/supabase';
import { StrategyService } from '@/lib/services/strategy';
import { OutlineEngine } from '@/lib/services/writer/research/outline-engine';
import { QueuePayload } from '../registry';

// Extracted from EditorialCalendar.tsx
export const handleBatchResearch = async (taskId: string, payload: QueuePayload) => {
    const { targetTaskId, keyword, projectId, linkPlannedContents, linkPlannedStatuses, improveTitleWithNous, currentTitle } = payload;
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();

    try {
        setTaskStatus(taskId, 'processing', 5);
        addLogToTask(taskId, 'Iniciando investigación en bloque...', 'info');

        const result = await StrategyService.runDeepSEOAnalysis({
            projectId: projectId, 
            keyword: keyword || currentTitle,
            onProgress: (p) => {
                const progressMap: Record<string, number> = { 'serp': 25, 'scraping': 50, 'keywords': 75, 'metadata': 90, 'interlinking': 95, 'outline': 100 };
                setTaskStatus(taskId, 'processing', progressMap[p] || 10);
            },
            onLog: (s, m, r) => addLogToTask(taskId, m, r === 'success' ? 'success' : (r === 'error' ? 'error' : 'info')),
            taskId: targetTaskId,
            linkPlannedContents,
            linkPlannedStatuses 
        }, { taskId: targetTaskId });

        if (result) {
            await supabase.from('tasks').update({ 
                title: improveTitleWithNous && result.seo_title ? result.seo_title : currentTitle, 
                research_dossier: result.research_dossier, 
                seo_title: result.seo_title, 
                meta_description: result.meta_description, 
                target_url_slug: result.target_url_slug, 
                status: result.status,
                observaciones: result.observaciones
            }).eq('id', targetTaskId);
        }
        
        setTaskStatus(taskId, 'processing', 100);
        addLogToTask(taskId, 'Investigación completada con éxito.', 'success');
    } catch (e: any) {
        console.error(e);
        addLogToTask(taskId, `Error: ${e.message}`, 'error');
        throw e;
    }
};

export const handleBatchOutline = async (taskId: string, payload: QueuePayload) => {
    const { targetTaskId, keyword, projectId, researchDossier, recommendedWordCount } = payload;
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();

    try {
        setTaskStatus(taskId, 'processing', 10);
        addLogToTask(taskId, 'Generando outline en bloque...', 'info');

        const res = await OutlineEngine.generate({
            keyword: keyword,
            seoMetadata: {
                h1: researchDossier?.h1,
                seo_title: researchDossier?.seo_title,
                slug: researchDossier?.target_url_slug,
                meta_description: researchDossier?.meta_description,
                extracto: researchDossier?.extracto,
                recommendedWordCount: String(recommendedWordCount || 1500)
            },
            cleanedLSI: researchDossier?.lsiKeywords || [],
            suggestedLinks: researchDossier?.suggestedInternalLinks || [],
            validCompetitors: researchDossier?.competitors || [],
            wordCountGoal: parseInt(String(recommendedWordCount)) || 1500
        });

        if (res) {
            await supabase.from('tasks').update({
                outline_structure: res,
                status: 'por_redactar'
            }).eq('id', targetTaskId);
        }
        
        setTaskStatus(taskId, 'processing', 100);
        addLogToTask(taskId, 'Outline completado.', 'success');
    } catch (e: any) {
        console.error(e);
        addLogToTask(taskId, `Error: ${e.message}`, 'error');
        throw e;
    }
};

import { executeDraftPipeline, executeHumanizePipeline } from "@/lib/services/writer/pipeline";

export const handleBatchGenerate = async (taskId: string, payload: QueuePayload) => {
    const { targetTask, activeProject } = payload;
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();

    try {
        setTaskStatus(taskId, "processing", 10);
        addLogToTask(taskId, "Iniciando redacción masiva...", "info");

        const res = await executeDraftPipeline(
            targetTask, 
            activeProject, 
            (msg) => addLogToTask(taskId, msg, "info"),
            (html) => {}
        );
        
        if (res.success && res.updates) {
            await supabase.from("tasks").update(res.updates).eq("id", targetTask.id);
            if (res.updates.content_body) {
                await supabase.from("task_versions").insert({
                    task_id: targetTask.id,
                    process_name: "Generación Inicial",
                    content_snapshot: res.updates.content_body,
                    created_at: new Date().toISOString()
                });
            }
            setTaskStatus(taskId, "processing", 100);
            addLogToTask(taskId, "Redacción completada.", "success");
        } else {
            setTaskStatus(taskId, "error", 100);
            addLogToTask(taskId, "Redacción fallida sin actualizaciones.", "error");
        }
    } catch (e: any) {
        console.error(e);
        addLogToTask(taskId, `Error: ${e.message}`, "error");
        throw e;
    }
};

export const handleBatchHumanize = async (taskId: string, payload: QueuePayload) => {
    const { targetTask, activeProject, content: initialContent } = payload;
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();

    try {
        setTaskStatus(taskId, "processing", 10);
        addLogToTask(taskId, "Iniciando humanización masiva...", "info");
        
        let content = initialContent;
        if (!content) {
            const { data: contentData } = await supabase.from('task_contents').select('content_body').eq('id', targetTask.id).single();
            content = contentData?.content_body || targetTask.content_body;
        }

        if (!content) {
            throw new Error("No hay contenido válido para humanizar.");
        }

        await supabase.from("task_versions").insert({
            task_id: targetTask.id,
            process_name: "Pre-Humanización",
            content_snapshot: content,
            created_at: new Date().toISOString()
        });

        const res = await executeHumanizePipeline(
            targetTask, 
            content, 
            activeProject,
            (msg) => addLogToTask(taskId, msg, "info"),
            (html) => {}
        );
        
        if (res.success && res.updates) {
            await supabase.from("task_contents").upsert({ 
                id: targetTask.id, 
                content_body: res.updates.content_body 
            });
            await supabase.from("tasks").update({ status: "humanizado" }).eq("id", targetTask.id);
            
            await supabase.from("task_versions").insert({
                task_id: targetTask.id,
                process_name: "Post-Humanización",
                content_snapshot: res.updates.content_body,
                created_at: new Date().toISOString()
            });
            setTaskStatus(taskId, "processing", 100);
            addLogToTask(taskId, "Humanización completada.", "success");
        } else {
            setTaskStatus(taskId, "error", 100);
            addLogToTask(taskId, "Humanización fallida sin actualizaciones.", "error");
        }
    } catch (e: any) {
        console.error(e);
        addLogToTask(taskId, `Error: ${e.message}`, "error");
        throw e;
    }
};


import { processTaskTranslationAction } from '@/lib/client/plannerActions';

export const handleBatchTranslate = async (taskId: string, payload: QueuePayload) => {
    const { targetTaskId, targetLangs } = payload;
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();

    try {
        setTaskStatus(taskId, "processing", 10);
        addLogToTask(taskId, "Iniciando traducción masiva...", "info");

        for (const lang of targetLangs) {
            const res = await processTaskTranslationAction(targetTaskId, lang);
            if (res.success) {
                addLogToTask(taskId, `Traducido a ${lang}: ${res.msg}`, "success");
            } else {
                addLogToTask(taskId, `Error traduciendo a ${lang}: ${res.error}`, "error");
            }
        }
        
        setTaskStatus(taskId, "processing", 100);
        addLogToTask(taskId, "Traducción completada.", "success");
    } catch (e: any) {
        console.error(e);
        addLogToTask(taskId, `Error: ${e.message}`, "error");
        throw e;
    }
};

