import { Task } from '@/types/project';
import { supabase } from '@/lib/supabase';
import { 
    generateOutlineStrategy, 
    buildPrompt,
    ArticleConfig,
    executeTranslationAction
} from '@/lib/actions/aiActions';
import { mdToHtml } from '@/utils/markdown';
import { AVAILABLE_LANGUAGES } from '@/constants/languages';
import { NousExtractorService } from '@/lib/services/nous-extractor';

export async function processTaskOutlineAction(taskId: string, csvData: any[]) {
    try {
        const { data: task, error: taskError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (taskError || !task) throw new Error("Task not found");

        const { data: taskResearch } = await supabase.from('task_research').select('*').eq('id', taskId).maybeSingle();
        const research_dossier = taskResearch?.research_dossier || {};

        const config: ArticleConfig = {
            projectName: 'Nous Project',
            niche: task.metadata?.niche || 'General',
            topic: task.h1 || task.title,
            metaTitle: task.seo_title || task.title,
            keywords: task.target_keyword || '',
            tone: 'Profesional',
            wordCount: '1500',
            refUrls: '',
            refContent: research_dossier?.brief || '',
            approvedLinks: research_dossier?.suggestedInternalLinks || [],
            csvData: csvData || [],
            language: task.language || 'es'
        };

        const res = await generateOutlineStrategy(config, task.target_keyword || task.title, research_dossier);
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

export async function prepareTaskDraftAction(taskId: string) {
    console.log("[CLIENT] prepareTaskDraftAction START for taskId:", taskId);
    try {
        const { data: task, error: taskError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (taskError || !task) throw new Error("Task not found");

        const { data: taskResearch } = await supabase.from('task_research').select('*').eq('id', taskId).maybeSingle();
        const research_dossier = taskResearch?.research_dossier || {};
        
        const rawOutline = taskResearch?.outline_structure || {};
        const outlineArray = Array.isArray(rawOutline) ? rawOutline : (rawOutline?.headers || []);

        // Fetch active project for pipeline configurations
        const { data: activeProject } = await supabase.from('projects').select('*').eq('id', task.project_id).single();

        const config: ArticleConfig = {
            projectName: activeProject?.name || 'Nous Project',
            niche: task.metadata?.niche || research_dossier?.nicheDetected || 'General',
            topic: task.h1 || task.title,
            metaTitle: task.seo_title || task.title,
            keywords: research_dossier?.keywordIdeas?.shortTail?.slice(0, 5).join(', ') || task.target_keyword || '',
            tone: 'Profesional',
            wordCount: task.target_word_count ? String(task.target_word_count) : '1500',
            refUrls: '',
            refContent: research_dossier?.brief || '',
            csvData: [],
            outlineStructure: outlineArray,
            approvedLinks: research_dossier?.suggestedInternalLinks || [],
            questions: research_dossier?.frequentQuestions || [],
            lsiKeywords: (research_dossier?.lsiKeywords || []).map((l: any) => l.keyword).concat(research_dossier?.autocompleteLongTail || []),
            contextInstructions: task.metadata?.contextInstructions || '',
            language: task.language || activeProject?.settings?.content_preferences?.default_content_language || activeProject?.i18n_settings?.default_language || 'es',
            architectureInstructions: activeProject?.architecture_instructions,
            architectureRules: activeProject?.architecture_rules,
            isStrictMode: activeProject?.settings?.content_preferences?.strict_mode || false,
            strictFrequency: activeProject?.settings?.content_preferences?.strict_frequency || 'medium',
            extractorInstructions: activeProject ? NousExtractorService.getActiveRulesForPhase(activeProject, 'writer')
                    .map(r => {
                        let placementText = "";
                        if (r.placement_mode === 'new_paragraph') placementText = "OBLIGATORIO: Coloca el dato extraído en un párrafo INDEPENDIENTE.";
                        else if (r.placement_mode === 'new_line') placementText = "Coloca el dato extraído en una nueva línea (br).";
                        else placementText = "Coloca el dato extraído inmediatamente después del enlace (inline).";
                        return `- Para reglas "${r.name}": ${placementText} (Pattern: ${r.extraction_value})`;
                    }).join('\n') : ''
        };

        const prompt = buildPrompt(config);
        
        console.log("[CLIENT] prepareTaskDraftAction SUCCESS");
        return { success: true, prompt, configStr: JSON.stringify(config) };
    } catch (error: any) {
        console.error("[CLIENT] prepareTaskDraftAction ERROR:", error);
        return { success: false, error: error.stack || error.message || String(error) };
    }
}

export async function saveTaskDraftAction(taskId: string, formattedContent: string) {
    try {
        const updates: Partial<Task> = { content_body: formattedContent, status: 'por_corregir' };
        const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
        if (error) throw error;

        return { success: true, updates, msg: `✅ Artículo redactado y optimizado.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function processTaskTranslationAction(taskId: string, langCode: string) {
    try {
        const { data: task, error: taskError } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (taskError || !task) throw new Error("Task not found");

        const langName = AVAILABLE_LANGUAGES.find(l => l.code === langCode)?.name || langCode;
        const metadataPrompt = `Translate to ${langName}. Return JSON: {h1, seo_title, meta_description, excerpt, target_url_slug}`;
        
        // Use the Server Action wrapper instead of executing directly
        const metadataRaw = await executeTranslationAction(metadataPrompt, langName);
        let translatedData;
        try {
            const jsonString = metadataRaw.replace(/```json|```/g, '').trim();
            translatedData = JSON.parse(jsonString);
        } catch (e) {
            translatedData = { h1: task.h1, seo_title: task.seo_title, meta_description: task.meta_description, excerpt: task.excerpt, target_url_slug: task.target_url_slug };
        }

        const { data: taskContent } = await supabase.from('task_contents').select('content_body').eq('id', taskId).maybeSingle();
        const contentBody = taskContent?.content_body || task.content_body || '';

        const translatedBody = await executeTranslationAction(contentBody, langName);
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
