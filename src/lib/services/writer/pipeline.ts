import { Task, Project } from '@/types/project';
import { supabase } from '@/lib/supabase';
import { ArticleConfig } from '@/lib/actions/aiActions';
import { buildPrompt, autoInterlinkAsync, cleanAndFormatHtml } from '@/components/tools/writer/services';
import { streamGenerate, streamHumanize, streamSEOPostProcess, streamFinalCleanup } from '@/lib/services/writer/ai-streaming';
import { sanitizeLLMHtml } from '@/utils/html-parser';
import { AI_CONFIG } from '@/lib/ai/config';
import { NousExtractorService } from '@/lib/services/nous-extractor';

export async function executeDraftPipeline(
    task: Task, 
    activeProject: Project | null,
    onLog: (msg: string) => void,
    onChunk: (html: string) => void
) {
    onLog('Generando prompt y estructura...');

    // 1. Fetch research data
    const { data: taskResearch } = await supabase.from('task_research').select('*').eq('id', task.id).maybeSingle();
    const research_dossier = taskResearch?.research_dossier || {};
    
    // We get outline from task.outline_structure first, fallback to research
    const rawOutline = task.outline_structure || taskResearch?.outline_structure || {};
    const outlineArray = Array.isArray(rawOutline) ? rawOutline : (rawOutline?.headers || []);

    const approvedLinks = research_dossier?.suggestedInternalLinks || [];

    const config: ArticleConfig = {
        projectName: activeProject?.name || 'Nous Project',
        niche: task.metadata?.niche || 'General',
        topic: task.h1 || task.title,
        metaTitle: task.seo_title || task.title,
        keywords: task.target_keyword || '',
        tone: 'Profesional',
        wordCount: task.target_word_count ? String(task.target_word_count) : '1500',
        refUrls: '',
        refContent: research_dossier?.brief || '',
        csvData: [],
        outlineStructure: outlineArray,
        approvedLinks: approvedLinks,
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

    // Helper to chunk the outline
    const chunkOutline = (outline: any[], maxH2: number = 2): any[][] => {
        const chunks: any[][] = [];
        let currentChunk: any[] = [];
        let h2Count = 0;

        for (const item of outline) {
            if (item.type === 'H2') {
                if (h2Count >= maxH2) {
                    chunks.push(currentChunk);
                    currentChunk = [];
                    h2Count = 0;
                }
                h2Count++;
            }
            currentChunk.push(item);
        }
        if (currentChunk.length > 0) chunks.push(currentChunk);
        
        return chunks.length > 0 ? chunks : [outline];
    };

    const outlineChunks = chunkOutline(config.outlineStructure || [], 2);
    onLog(`Documento dividido en ${outlineChunks.length} fragmentos para redacción progresiva...`);

    let finalHtml = '';
    const writingHierarchy = AI_CONFIG.gemini.hierarchies.writing;
    const modelToUse = 'gemma-4-31b-it';
    let previousContext = '';

    for (let i = 0; i < outlineChunks.length; i++) {
        const chunkConfig = {
            ...config,
            outlineStructure: outlineChunks[i],
            chunkIndex: i,
            totalChunks: outlineChunks.length,
            previousContext: previousContext
        };

        const prompt = buildPrompt(chunkConfig);
        onLog(`Redactando parte ${i + 1}/${outlineChunks.length} (streaming)...`);

        let chunkHtml = '';
        try {
            chunkHtml = await streamGenerate(
                prompt,
                modelToUse,
                writingHierarchy,
                (chunk) => { 
                    chunkHtml = chunk; 
                    onChunk(finalHtml + chunk); 
                },
                (msg) => onLog(`[Parte ${i+1}] ${msg}`)
            );
        } catch (err) {
            console.error(`[Generate Chunk ${i+1}] Fallback triggered`, err);
            onLog(`⚠️ Interrupción detectada en parte ${i+1}. Reintentando...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            chunkHtml = await streamGenerate(
                prompt,
                modelToUse, // Strict gemma-4-31b-it constraint
                writingHierarchy,
                (chunk) => { 
                    chunkHtml = chunk; 
                    onChunk(finalHtml + chunk); 
                },
                (msg) => onLog(`[Parte ${i+1}] ${msg}`)
            );
        }

        // Clean each chunk right after generation
        onLog(`Limpiando alucinaciones del modelo en parte ${i+1}...`);
        try {
            chunkHtml = await streamFinalCleanup(chunkHtml, onLog);
        } catch (cleanupErr: any) {
            onLog(`⚠️ Error en limpieza de parte ${i+1}: ${cleanupErr.message}. Usando versión original.`);
        }

        finalHtml += chunkHtml + '\n\n';
        
        // Strip HTML tags roughly to give text context for the next chunk
        previousContext = chunkHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // El cleanup global con IA fue movido a cada chunk.

    onLog('Procesando vínculos y SEO...');
    let cleanHtml = cleanAndFormatHtml(finalHtml);

    const linked = await autoInterlinkAsync(
        cleanHtml, 
        config.approvedLinks || [],
        activeProject?.architecture_rules,
        activeProject?.architecture_instructions,
        activeProject
    );

    let finalContent = linked;
    const activeExtractorRules = activeProject ? NousExtractorService.getActiveRulesForPhase(activeProject, 'writer') : [];
    if (activeExtractorRules.length > 0) {
        onLog('Ejecutando extractores de datos...');
        finalContent = await NousExtractorService.applyExtractionToHtml(linked, activeProject, 'writer');
    }

    const formatted = cleanAndFormatHtml(finalContent);
    onLog('Guardando artículo...');

    // 2. Save updates
    const updates: Partial<Task> = { content_body: formatted, status: 'por_corregir' };
    
    // Save to tasks
    const { error: tErr } = await supabase.from('tasks').update(updates).eq('id', task.id);
    if (tErr) throw tErr;

    // Save to task_contents
    const { error: tcErr } = await supabase.from('task_contents')
        .upsert({ id: task.id, content_body: formatted });
    if (tcErr) throw tcErr;

    onLog('✅ Artículo redactado y optimizado.');
    return { success: true, content: formatted, updates };
}

export async function executeHumanizePipeline(
    task: Task, 
    content: string, 
    activeProject: Project | null,
    onLog: (msg: string) => void,
    onChunk: (html: string) => void
) {
    onLog('Iniciando humanización (streaming)...');

    const config = {
        niche: task.metadata?.niche || 'General', 
        audience: 'General', 
        keywords: task.target_keyword || '', 
        language: task.language || activeProject?.settings?.content_preferences?.default_content_language || activeProject?.i18n_settings?.default_language || 'es' 
    };

    const chunkHtml = (htmlString: string, chunkSize: number): string[] => {
        const elements = htmlString.split(/(?=<h[1-6]|<p|<ul|<ol|<li>|<div|<table)/gi);
        const chunks = [];
        for (let i = 0; i < elements.length; i += chunkSize) {
            chunks.push(elements.slice(i, i + chunkSize).join(''));
        }
        return chunks;
    };

    const sanitizedContent = sanitizeLLMHtml(content);
    const chunks = chunkHtml(sanitizedContent, 4);
    onLog(`Documento dividido en ${chunks.length} chunks de 4 elementos HTML...`);
    
    let accumulatedHtml = '';
    let humLastUpdateTime = 0;

    for (let i = 0; i < chunks.length; i++) {
        let success = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 3;

        while (!success && attempts < MAX_ATTEMPTS) {
            try {
                onLog(`Humanizando Chunk ${i + 1}/${chunks.length} (Intento ${attempts + 1})...`);
                
                const chunkResult = await streamHumanize(
                    chunks[i],
                    config,
                    50,
                    (partialHtml) => {
                        const now = Date.now();
                        if (now - humLastUpdateTime > 300) {
                            onChunk(accumulatedHtml + partialHtml);
                            humLastUpdateTime = now;
                        }
                    },
                    (msg) => {
                        console.log(`[Chunk ${i+1}] ${msg}`);
                    }
                );
                
                accumulatedHtml += chunkResult.html + '\n';
                onChunk(accumulatedHtml);
                success = true;
            } catch (err: any) {
                attempts++;
                console.error(`[Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                
                if (attempts >= MAX_ATTEMPTS) {
                    throw new Error(`Fallo definitivo en el chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos: ${err.message}`);
                }
                
                onLog(`Error en Chunk ${i + 1}. Reintentando en 60s... (${attempts}/${MAX_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, 60000));
            }
        }
    }

    const finalResult = { html: accumulatedHtml };

    const newContent = finalResult.html;

    const updates: Partial<Task> = {
        content_body: newContent,
        metadata: { ...task.metadata, is_humanized: true, humanized_at: new Date().toISOString() }
    };

    // Save to tasks
    const { error: tErr } = await supabase.from('tasks').update(updates).eq('id', task.id);
    if (tErr) throw tErr;

    // Save to task_contents
    const { error: tcErr } = await supabase.from('task_contents')
        .upsert({ id: task.id, content_body: newContent });
    if (tcErr) throw tcErr;

    onLog('✅ Humanización completada.');
    return { success: true, content: newContent, updates };
}
