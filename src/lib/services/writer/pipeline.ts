import { Task, Project } from '@/types/project';
import { supabase } from '@/lib/supabase';
import { ArticleConfig } from '@/lib/actions/aiActions';
import { buildPrompt, autoInterlinkAsync, cleanAndFormatHtml } from '@/components/tools/writer/services';
import { streamGenerate, streamHumanize, streamSEOPostProcess, streamFinalCleanup, streamSurgicalEdit } from '@/lib/services/writer/ai-streaming';
import { sanitizeLLMHtml } from '@/utils/html-parser';
import { AI_CONFIG } from '@/lib/ai/config';
import { NousExtractorService } from '@/lib/services/nous-extractor';
import { HtmlProtectionService, sizeAwareChunkHtml } from '@/lib/utils/html-protection';

export async function executeDraftPipeline(
    task: Task, 
    activeProject: Project | null,
    onLog: (msg: string) => void,
    onChunk: (html: string) => void,
    checkPause?: () => Promise<void>,
    onProgress?: (progress: number) => void,
    model?: string,
    chunkSize?: number
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
            // Note: Experimental AnchorMapNode uses 'level: 2', standard uses 'type: H2'
            const isH2 = item.type === 'H2' || item.level === 2;
            
            if (isH2) {
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

    const outlineChunks = chunkOutline(config.outlineStructure || [], chunkSize || 2);
    onLog(`Documento dividido en ${outlineChunks.length} fragmentos para redacción progresiva...`);

    let finalHtml = '';
    const writingHierarchy = AI_CONFIG.gemini.hierarchies.writing;
    const modelToUse = 'gemma-4-31b-it';
    let previousContext = '';

    for (let i = 0; i < outlineChunks.length; i++) {
        // Resolve Experimental Context (Nous 3.0) if applicable
        let experimentalContext = '';
        const currentOutline = outlineChunks[i];
        
        for (const item of currentOutline) {
            if (item.semantic_anchors && Array.isArray(item.semantic_anchors) && research_dossier?.semantic_map) {
                for (const anchor of item.semantic_anchors) {
                    for (const sm of research_dossier.semantic_map) {
                        const smMap = sm.map || '';
                        // The anchor is something like [S1-P2]
                        // We extract the line containing the anchor from the map.
                        // The map is a string with lines like "[S1-P2] Some text here..."
                        const line = smMap.split('\n').find((l: string) => l.includes(anchor));
                        if (line) {
                            experimentalContext += `\n- FUENTE (${sm.source}) - ${line}`;
                        }
                    }
                }
            }
        }

        const chunkConfig = {
            ...config,
            outlineStructure: currentOutline,
            chunkIndex: i,
            totalChunks: outlineChunks.length,
            previousContext: previousContext,
            experimentalContext: experimentalContext
        };

        if (checkPause) await checkPause();
        if (onProgress) onProgress((i / outlineChunks.length) * 100);
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
    
    // Save to tasks (omit content_body)
    const { content_body: _, ...tasksUpdate } = updates;
    const { error: tErr } = await supabase.from('tasks').update(tasksUpdate).eq('id', task.id);
    if (tErr) throw tErr;

    // Save to task_contents
    const { error: tcErr } = await supabase.from('task_contents')
        .upsert({ id: task.id, content_body: formatted });
    if (tcErr) throw tcErr;

    onLog('✅ Artículo redactado y optimizado.');
    return { success: true, content: formatted, updates };
}

export async function executeSurgicalEditPipeline(
    task: Task, 
    content: string, 
    activeProject: Project | null,
    onLog: (msg: string) => void,
    onChunk: (html: string) => void,
    checkPause?: () => Promise<void>,
    onProgress?: (progress: number) => void,
    model?: string,
    chunkSize?: number
) {
    onLog('Iniciando edición quirúrgica (streaming)...');

    try {
        await supabase.from("task_versions").insert({
            task_id: task.id,
            process_name: "Pre-Edición Quirúrgica",
            content_body: content,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error("No se pudo guardar la versión Pre-Edición:", e);
    }

    const config = {
        activeProject,
        task
    };

    const sanitizedContent = sanitizeLLMHtml(content);
    
    // Protection Phase
    const { blindedHtml, map: protectionMap } = HtmlProtectionService.protect(sanitizedContent);
    
    // Size-Aware Chunking (using blinded HTML)
    const chunks = sizeAwareChunkHtml(blindedHtml, chunkSize || 8);
    onLog(`Documento dividido en ${chunks.length} chunks para edición quirúrgica...`);
    
    let accumulatedHtml = '';
    let humLastUpdateTime = 0;

    for (let i = 0; i < chunks.length; i++) {
        if (checkPause) await checkPause();
        if (onProgress) onProgress((i / chunks.length) * 100);
        let success = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 4;

        while (!success && attempts < MAX_ATTEMPTS) {
            try {
                onLog(`Editando Chunk ${i + 1}/${chunks.length} (Intento ${attempts + 1})...`);
                
                const chunkResult = await streamSurgicalEdit(
                    chunks[i],
                    config,
                    7, // intensity
                    (partialHtml) => {
                        const now = Date.now();
                        if (now - humLastUpdateTime > 300) {
                            onChunk(accumulatedHtml + partialHtml);
                            humLastUpdateTime = now;
                        }
                    },
                    (msg) => {
                        console.log(`[Chunk ${i+1}] ${msg}`);
                        onLog(`[Chunk ${i+1}] ${msg}`);
                    },
                    model
                );
                
                accumulatedHtml += (chunkResult.html || chunkResult) + '\n';
                onChunk(accumulatedHtml);
                success = true;
            } catch (err: any) {
                attempts++;
                console.error(`[Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                
                if (attempts >= MAX_ATTEMPTS) {
                    onLog(`Fallo definitivo en Chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos. Saltando chunk. Error: ${err.message}`);
                    accumulatedHtml += chunks[i] + '\n';
                    onChunk(accumulatedHtml);
                    break;
                }
                
                onLog(`Error en Chunk ${i + 1}. Reintentando en 70s... (${attempts}/${MAX_ATTEMPTS})`);
                await new Promise(r => setTimeout(r, 70000));
            }
        }
    }

    // Restore protected atomic blocks
    const restoredHtml = HtmlProtectionService.restore(accumulatedHtml, protectionMap);
    const formatted = cleanAndFormatHtml(restoredHtml);
    const updates = { 
        content_body: formatted,
        metadata: { ...(task.metadata as object), is_surgically_edited: true }
    };

    try {
        await supabase.from("task_versions").insert({
            task_id: task.id,
            process_name: "Post-Edición Quirúrgica",
            content_body: formatted,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error("No se pudo guardar la versión Post-Edición:", e);
    }

    onLog('✅ Edición quirúrgica completada.');
    return { success: true, content: formatted, updates };
}
export async function executeHumanizePipeline(
    task: Task,
    content: string,
    activeProject: Project | null,
    onLog: (msg: string) => void,
    onChunk: (html: string) => void,
    checkPause?: () => Promise<void>,
    onProgress?: (progress: number) => void,
    model?: string,
    chunkSize?: number
) {
    onLog('Iniciando humanización (streaming)...');

    // Guardar versión pre-humanización
    try {
        await supabase.from('task_versions').insert({
            task_id: task.id,
            process_name: "Pre-Humanización",
            content_body: content,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('No se pudo guardar la versión Pre-Humanización:', e);
    }

    const config = {
        niche: task.metadata?.niche || 'General',
        audience: 'General',
        keywords: task.target_keyword || '',
        language: task.language || activeProject?.settings?.content_preferences?.default_content_language || activeProject?.i18n_settings?.default_language || 'es'
    };

    const sanitizedContent = sanitizeLLMHtml(content);
    
    // Protection Phase
    const { blindedHtml, map: protectionMap } = HtmlProtectionService.protect(sanitizedContent);
    
    // Size-Aware Chunking (using blinded HTML)
    const chunks = sizeAwareChunkHtml(blindedHtml, chunkSize || 4);
    onLog(`Documento dividido en ${chunks.length} chunks de ${chunkSize || 4} elementos HTML...`);


    let accumulatedHtml = '';
    let humLastUpdateTime = 0;

    for (let i = 0; i < chunks.length; i++) {
        if (checkPause) await checkPause();
        if (onProgress) onProgress((i / chunks.length) * 100);
        const chunkContent = chunks[i];
        let success = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 4;
        while (!success && attempts < MAX_ATTEMPTS) {
            try {
                onLog(`Humanizando fragmento ${i + 1}/${chunks.length} (Intento ${attempts + 1})...`);
                const chunkResult = await streamHumanize(
                    chunkContent,
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
                        console.log(`[Fragmento ${i + 1}] ${msg}`);
                        onLog(`[Fragmento ${i + 1}] ${msg}`);
                    },
                    model,
                    (chunkProgress) => {
                        const baseProgress = (i / chunks.length) * 100;
                        const additionalProgress = (chunkProgress / 100) * (1 / chunks.length) * 100;
                        if (onProgress) onProgress(Number((baseProgress + additionalProgress).toFixed(2)));
                    }
                );
                accumulatedHtml += chunkResult.html + '\n';
                onChunk(accumulatedHtml);
                success = true;
            } catch (err: any) {
                attempts++;
                console.error(`Error en fragmento ${i + 1} intento ${attempts}:`, err);
                if (attempts >= MAX_ATTEMPTS) {
                    onLog(`Fallo definitivo en fragmento ${i + 1} tras ${MAX_ATTEMPTS} intentos. Continuando con siguiente fragmento.`);
                    // Append raw chunk content to preserve flow
                    accumulatedHtml += chunkContent + '\n';
                    onChunk(accumulatedHtml);
                    break;
                }
                onLog(`Reintentando fragmento ${i + 1} en 70s... (${attempts}/${MAX_ATTEMPTS})`);
                await new Promise(r => setTimeout(r, 70000));
            }
        }
    }

    // Restore protected atomic blocks
    const restoredHtml = HtmlProtectionService.restore(accumulatedHtml, protectionMap);
    
    const updates: Partial<Task> = {
        content_body: restoredHtml,
        metadata: { ...task.metadata, is_humanized: true, humanized_at: new Date().toISOString() }
    };


    // Guardar versión post-humanización
    try {
        await supabase.from('task_versions').insert({
            task_id: task.id,
            process_name: "Post-Humanización",
            content_body: restoredHtml,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('No se pudo guardar la versión Post-Humanización:', e);
    }
    
    // Update tasks table
    const { content_body: _, ...tasksUpdate } = updates;
    const { error: tErr } = await supabase.from('tasks').update(tasksUpdate).eq('id', task.id);
    if (tErr) throw tErr;
    
    // Update task_contents
    const { error: tcErr } = await supabase.from('task_contents').upsert({ id: task.id, content_body: restoredHtml });
    if (tcErr) throw tcErr;
    
    onLog('✅ Humanización completada y HTML limpiado.');
    return { success: true, content: restoredHtml, updates };

}
