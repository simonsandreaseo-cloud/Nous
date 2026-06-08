'use server';

import { Task } from '@/types/project';
import { supabase } from '@/lib/supabase';
import { 
    generateOutlineStrategy, 
    generateArticleStream,
    runHumanizerPipeline,
    buildPrompt,
    ArticleConfig
} from '@/components/tools/writer/services';
import { executeTranslation } from '@/lib/services/writer/ai-core';
import { mdToHtml } from '@/utils/markdown';
import { HeadlessLayoutService } from '@/lib/services/images/HeadlessLayoutService';
import { PatcherMaster } from '@/lib/services/images/PatcherMaster';
import { JSDOM } from 'jsdom';
import { AVAILABLE_LANGUAGES } from '@/constants/languages';

/**
 * Server Actions for Batch Processing
 * Decouples server-only libs (sharp, jsdom, ai-sdk) from the client.
 */

// Removed to clientActions.ts: processTaskOutlineAction, processTaskDraftAction, processTaskHumanizationAction

import { VisualEngine } from '@/lib/services/writer/VisualEngine';
import { LayoutService } from '@/lib/services/writer/LayoutService';

// ... (previous actions)

export async function processTaskVisualsAction(taskId: string) {
    try {
        const { data: task, error: taskError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (taskError || !task) throw new Error("Task not found");

        const { data: taskContent } = await supabase.from('task_contents').select('content_body').eq('id', taskId).maybeSingle();
        const contentBody = taskContent?.content_body || task.content_body || "";

        const { data: project } = await supabase.from('projects').select('settings').eq('id', task.project_id).single();
        const imgSettings = project?.settings?.images;
        const patcherRules = project?.settings?.patcher_rules || [];
        const paragraphs = contentBody.split(/<p>|<\/p>|\n\n/).filter(p => p.trim() !== "");
        
        // 1. Unified Visual Engine Execution
        const result = await VisualEngine.executeFullPipeline(
            paragraphs,
            {
                instructions: task.metadata?.visual_instructions || "Professional editorial design",
                language: (task.language || 'es') as 'es' | 'en',
                masterPrompt: imgSettings?.master_prompt || "",
                portadaPreset: imgSettings?.portada_preset,
                bodyPresets: imgSettings?.body_presets,
                taskId: task.id,
                projectId: task.project_id
            }
        );

        if (!result.success) throw new Error("Failed to execute visual engine");

        // 2. Consistent HTML Injection via LayoutService
        const updatedHtml = LayoutService.injectAssets(
            contentBody, 
            result.assets || [], 
            patcherRules
        );

        const updates: Partial<Task> = {
            metadata: { ...task.metadata, visuals_completed: true }
        };
        
        const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
        if (error) throw error;
        
        await supabase.from('task_contents').update({ content_body: updatedHtml }).eq('id', taskId);
        if (error) throw error;

        return { success: true, updates, msg: `✅ Estrategia visual (V3) aplicada.` };
    } catch (error: any) {
        console.error("[batchActions] Visuals Error:", error);
        return { success: false, error: error.message };
    }
}


