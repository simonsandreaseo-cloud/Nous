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

export async function processTaskOutlineAction(task: Task, csvData: any[]) {
    try {
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
        const headers = res.outline?.headers || [];
        
        const updates: Partial<Task> = {
            outline_structure: headers,
            h1: res.snippet?.h1 || task.title,
            seo_title: res.snippet?.metaTitle || task.title,
            target_url_slug: res.snippet?.slug || '',
            meta_description: res.snippet?.metaDescription || '',
            status: 'por_redactar'
        };

        const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
        if (error) throw error;

        return { success: true, updates, msg: `✅ Estructura de ${headers.length} secciones generada.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function processTaskDraftAction(task: Task) {
    try {
        const rawOutline = task.outline_structure;
        const outlineArray = Array.isArray(rawOutline) ? rawOutline : (rawOutline?.headers || []);

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
        const stream = await generateArticleStream('gemini-3.1-flash-preview', prompt);
        let fullContent = '';
        for await (const chunk of (stream as any)) {
            if (chunk.text) fullContent += chunk.text;
        }

        if (!fullContent || fullContent.length < 100) throw new Error("Contenido vacío.");

        const updates: Partial<Task> = { content_body: fullContent, status: 'por_corregir' };
        const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
        if (error) throw error;

        return { success: true, updates, msg: `✅ Artículo redactado.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function processTaskHumanizationAction(task: Task) {
    try {
        if (!task.content_body) throw new Error("No hay contenido.");
        
        const res = await runHumanizerPipeline(
            task.content_body,
            { niche: 'General', audience: 'General', keywords: task.target_keyword || '' },
            0.7, () => {}, 'gemini-3.1-flash-preview'
        );

        const updates: Partial<Task> = {
            content_body: res.html,
            metadata: { ...task.metadata, is_humanized: true, humanized_at: new Date().toISOString() }
        };

        const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
        if (error) throw error;

        return { success: true, updates, msg: `✅ Humanización completada.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

import { VisualEngine } from '@/lib/services/writer/VisualEngine';
import { LayoutService } from '@/lib/services/writer/LayoutService';

// ... (previous actions)

export async function processTaskVisualsAction(task: Task) {
    try {
        const { data: project } = await supabase.from('projects').select('settings').eq('id', task.project_id).single();
        const imgSettings = project?.settings?.images;
        const patcherRules = project?.settings?.patcher_rules || [];
        const paragraphs = (task.content_body || "").split(/<p>|<\/p>|\n\n/).filter(p => p.trim() !== "");
        
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
            task.content_body || "", 
            result.assets || [], 
            patcherRules
        );

        const updates: Partial<Task> = {
            content_body: updatedHtml,
            metadata: { ...task.metadata, visuals_completed: true }
        };
        
        const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
        if (error) throw error;

        return { success: true, updates, msg: `✅ Estrategia visual (V3) aplicada.` };
    } catch (error: any) {
        console.error("[batchActions] Visuals Error:", error);
        return { success: false, error: error.message };
    }
}

export async function processTaskTranslationAction(task: Task, langCode: string) {
    try {
        const langName = AVAILABLE_LANGUAGES.find(l => l.code === langCode)?.name || langCode;
        const metadataPrompt = `Translate to ${langName}. Return JSON: {h1, seo_title, meta_description, excerpt, target_url_slug}`;
        const metadataRaw = await executeTranslation(metadataPrompt, langName);
        let translatedData;
        try {
            const jsonString = metadataRaw.replace(/```json|```/g, '').trim();
            translatedData = JSON.parse(jsonString);
        } catch (e) {
            translatedData = { h1: task.h1, seo_title: task.seo_title, meta_description: task.meta_description, excerpt: task.excerpt, target_url_slug: task.target_url_slug };
        }

        const translatedBody = await executeTranslation(task.content_body || '', langName);
        const htmlContent = mdToHtml(translatedBody);
        
        const newTask: Partial<Task> = {
            project_id: task.project_id,
            title: translatedData.h1,
            h1: translatedData.h1,
            seo_title: translatedData.seo_title,
            meta_description: translatedData.meta_description,
            excerpt: translatedData.excerpt,
            target_url_slug: translatedData.target_url_slug,
            content_body: htmlContent,
            status: 'por_corregir',
            language: langCode,
            translation_parent_id: task.id,
            metadata: { is_translation: true, source_lang: task.language || 'es' }
        };

        const { data, error: upsertError } = await supabase.from('tasks').insert(newTask).select().single();
        if (upsertError) throw upsertError;

        return { success: true, data, msg: `✅ Traducción ${langCode.toUpperCase()} completada.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
