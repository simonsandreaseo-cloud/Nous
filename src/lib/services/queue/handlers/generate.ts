import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { supabase } from '@/lib/supabase';
import { buildPrompt, cleanAndFormatHtml, autoInterlinkAsync } from '@/components/tools/writer/services';
import { streamGenerate } from '@/lib/services/writer/ai-streaming';
import { AI_CONFIG } from '@/lib/ai/config';
import { NousExtractorService } from '@/lib/services/nous-extractor';
import { LinkPatcherService } from '@/lib/services/link-patcher';
import type { QueuePayload } from '../registry';
import { safeJsonExtract } from '@/utils/json';

export const handleGenerateTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const activeProject = useProjectStore.getState().activeProject;
    
    const draftId = payload.taskId || store.draftId;
    
    // Verificación dinámica de borrador activo
    const isCurrentDraft = () => useWriterStore.getState().draftId === draftId;
    
    if (isCurrentDraft()) {
        useWriterStore.getState().setGenerating(true);
        if (store.content?.trim().length > 0) {
            await store.saveTaskVersion(`Pre-Generación`, store.content, draftId);
        }
        useWriterStore.getState().setContent('');
        useWriterStore.getState().setStatus('Redactando artículo completo…');
    } else {
        // Si no está activo pero tiene contenido previo provisto en el payload, guardamos de todas formas la versión anterior de forma segura
        const initialContent = payload.content || '';
        if (initialContent.trim().length > 0) {
            await useWriterStore.getState().saveTaskVersion(`Pre-Generación`, initialContent, draftId);
        }
    }

    try {
        const h1 = payload.strategyH1 || store.strategyH1 || store.keyword || 'Artículo';
        
        const uniqueLinksMap = new Map<string, any>();
        const addLinksToMap = (links: any[]) => {
            if (links && Array.isArray(links)) {
                links.forEach(l => {
                    if (l.url && !uniqueLinksMap.has(l.url)) uniqueLinksMap.set(l.url, { url: l.url, anchor: l.anchor, type: l.type || 'other' });
                });
            }
        };

        if (store.rawSeoData && isCurrentDraft()) {
            addLinksToMap((store.rawSeoData as any).suggestedInternalLinks || []);
        }
        addLinksToMap(store.strategyLinks || []);

        const researchLinks = Array.from(uniqueLinksMap.values()).map(link => {
            if (!link.category && activeProject?.architecture_rules) {
                for (const rule of activeProject.architecture_rules) {
                    try {
                        const reg = new RegExp(rule.regex, 'i');
                        if (reg.test(link.url)) return { ...link, category: rule.name };
                    } catch (_) { }
                }
            }
            return link;
        });

        const finalApprovedLinks = researchLinks.slice(0, 20);

        const config = {
            projectName: store.projectName, niche: store.detectedNiche, topic: h1,
            metaTitle: store.strategyTitle || h1,
            keywords: store.rawSeoData?.keywordIdeas?.shortTail?.slice(0, 5).join(', ') || store.keyword,
            tone: store.strategyTone || 'Profesional',
            wordCount: store.strategyWordCount,
            refUrls: store.strategyCompetitors, refContent: store.strategyNotes,
            csvData: [], outlineStructure: store.strategyOutline,
            approvedLinks: finalApprovedLinks,
            questions: store.strategyQuestions,
            lsiKeywords: store.strategyLSI.map((l) => l.keyword).concat(store.strategyLongTail),
            contextInstructions: store.contextInstructions,
            language: activeProject?.settings?.content_preferences?.default_content_language || activeProject?.i18n_settings?.default_language || 'es',
            architectureInstructions: activeProject?.architecture_instructions,
            architectureRules: activeProject?.architecture_rules,
            isStrictMode: store.isStrictMode, 
            strictFrequency: store.strictFrequency,
            extractorInstructions: NousExtractorService.getActiveRulesForPhase(activeProject, 'writer')
                .map(r => {
                    let placementText = "";
                    if (r.placement_mode === 'new_paragraph') placementText = "OBLIGATORIO: Coloca el dato extraído (ej: RID) en un párrafo INDEPENDIENTE, en una línea él solo, justo después del párrafo donde está el enlace.";
                    else if (r.placement_mode === 'new_line') placementText = "Coloca el dato extraído en una nueva línea (br) inmediatamente después del enlace.";
                    else placementText = "Coloca el dato extraído inmediatamente después del enlace (inline).";
                    return `- Para reglas "${r.name}": ${placementText} (Pattern: ${r.extraction_value})`;
                }).join('\n')
        };

        const chunkOutline = (outline: any[], maxH2: number = 2): any[][] => {
            const chunks: any[][] = [];
            let currentChunk: any[] = [];
            let h2Count = 0;
            for (const item of outline) {
                if (item.type === 'H2') {
                    if (h2Count >= maxH2) { chunks.push(currentChunk); currentChunk = []; h2Count = 0; }
                    h2Count++;
                }
                currentChunk.push(item);
            }
            if (currentChunk.length > 0) chunks.push(currentChunk);
            return chunks.length > 0 ? chunks : [outline];
        };

        const outlineChunks = chunkOutline(config.outlineStructure || [], 4);

        if (isCurrentDraft()) {
            useWriterStore.getState().setStatus(`Documento dividido en ${outlineChunks.length} fragmentos para redacción progresiva...`);
        }

        const writingHierarchy = AI_CONFIG.gemini.hierarchies.writing;
        const modelToUse = 'gemma-4-31b-it';
        
        let finalHtml = "";
        let previousContext = '';

        for (let i = 0; i < outlineChunks.length; i++) {
            const currentOutline = outlineChunks[i];
            let experimentalContext = "";

            const requiredAnchors = new Set<string>();
            currentOutline.forEach((node: any) => {
                if (node.semantic_anchors && Array.isArray(node.semantic_anchors)) {
                    node.semantic_anchors.forEach((a: string) => requiredAnchors.add(a));
                }
            });

            console.log(`[Generate Chunk ${i+1}] Analizando chunk con ${currentOutline.length} nodos. Anchors requeridos:`, Array.from(requiredAnchors));

            const activeDossier = payload.researchDossier || store.researchDossier;
            if (requiredAnchors.size > 0 && activeDossier?.semantic_map) {
                console.log(`[Generate Chunk ${i+1}] Dossier encontrado. Extrayendo fragmentos del mapa semántico...`);
                const semanticMap = activeDossier.semantic_map;
                const extractedTexts: string[] = [];
                semanticMap.forEach((sm: any) => {
                    if (!sm.map) return;
                    const lines = sm.map.split('\n');
                    lines.forEach((line: string) => {
                        for (const anchor of requiredAnchors) {
                            if (line.startsWith(anchor)) {
                                extractedTexts.push(`[Fuente: ${sm.source}] ${line}`);
                                break;
                            }
                        }
                    });
                });
                if (extractedTexts.length > 0) {
                    experimentalContext = extractedTexts.join('\n');
                    console.log(`[Generate Chunk ${i+1}] ✅ Contexto Experimental Inyectado con éxito (${extractedTexts.length} fragmentos obtenidos).`);
                } else {
                    console.warn(`[Generate Chunk ${i+1}] ⚠️ No se encontraron fragmentos coincidentes para los anchors requeridos.`);
                }
            } else if (requiredAnchors.size > 0) {
                console.warn(`[Generate Chunk ${i+1}] ❌ Hay anchors requeridos pero NO se encontró un 'semantic_map' válido en el dossier activo.`);
            }

            const chunkConfig = {
                ...config,
                outlineStructure: currentOutline,
                chunkIndex: i,
                totalChunks: outlineChunks.length,
                previousContext: previousContext,
                experimentalContext: experimentalContext
            };

            const prompt = buildPrompt(chunkConfig);
            if (isCurrentDraft() && i === 0) store.addDebugPrompt('Fase 1: Redacción Inicial', prompt);
            
            if (isCurrentDraft()) {
                useWriterStore.getState().setStatus(`Redactando parte ${i + 1}/${outlineChunks.length}... (Espere unos segundos)`);
            }
            
            let chunkHtml = "";
            try {
                chunkHtml = await streamGenerate(
                    prompt, 
                    modelToUse, 
                    writingHierarchy,
                    (html) => { 
                        chunkHtml = html; 
                        if (isCurrentDraft()) useWriterStore.getState().setContent(finalHtml + html); 
                    },
                    (msg) => { if (isCurrentDraft()) useWriterStore.getState().setStatus(`[Parte ${i+1}] ${msg}`); }
                );
            } catch (err) {
                console.error(`[Generate Chunk ${i+1}] Fallback triggered`, err);
                if (isCurrentDraft()) useWriterStore.getState().setStatus(`⚠️ Interrupción detectada en parte ${i+1}. Reintentando...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                chunkHtml = await streamGenerate(
                    prompt, 
                    modelToUse, 
                    writingHierarchy,
                    (html) => { 
                        chunkHtml = html; 
                        if (isCurrentDraft()) useWriterStore.getState().setContent(finalHtml + html); 
                    },
                    (msg) => { if (isCurrentDraft()) useWriterStore.getState().setStatus(`[Parte ${i+1}] Reintento: ${msg}`); }
                );
            }

            finalHtml += chunkHtml + '\n\n';
            previousContext = chunkHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        if (isCurrentDraft()) useWriterStore.getState().setStatus('Procesando HTML final...');
        let cleanHtml = cleanAndFormatHtml(finalHtml);
        
        if (isCurrentDraft()) {
            useWriterStore.getState().setContent(cleanHtml);
        }

        if (cleanHtml.includes('<!-- METADATA_START -->')) {
            const parts = cleanHtml.split('<!-- METADATA_START -->');
            cleanHtml = parts[0];
            try {
                const meta = safeJsonExtract<any>(parts[1], {});
                if (isCurrentDraft()) {
                    useWriterStore.getState().setMetadata(meta);
                    if (meta.title) useWriterStore.getState().setTitle(meta.title);
                }
            } catch (_) { }
        }

        if (isCurrentDraft()) useWriterStore.getState().setStatus('Generando vínculos interlinking...');
        
        const linked = await autoInterlinkAsync(
            cleanHtml, 
            finalApprovedLinks,
            activeProject?.architecture_rules,
            activeProject?.architecture_instructions,
            activeProject
        );
        
        if (isCurrentDraft()) {
            const s = useWriterStore.getState();
            s.setAnalyzingSEO(true);
            s.addDebugPrompt('Fase 2: Refinamiento SEO', `Optimizando con keywords: ${config.topic}, LSI: ${config.lsiKeywords?.join(', ')}. Enlaces aprobados: ${finalApprovedLinks.length}`);
        }
        
        let refinedSEO = linked;
        
        let finalContent = refinedSEO;
        const activeExtractorRules = NousExtractorService.getActiveRulesForPhase(activeProject, 'writer');
        if (activeExtractorRules.length > 0) {
            if (isCurrentDraft()) useWriterStore.getState().setStatus('Ejecutando extractores de datos...');
            finalContent = await NousExtractorService.applyExtractionToHtml(refinedSEO, activeProject, 'writer');
        }

        const formatted = cleanAndFormatHtml(finalContent);
        
        // 1. Guardar la versión de la tarea en la base de datos de manera agnóstica al borrador activo
        await useWriterStore.getState().saveTaskVersion('Generación Inicial', formatted, draftId);
        
        // 2. Persistir directamente en las tablas de Supabase
        await supabase.from('task_contents').upsert({ id: draftId, content_body: formatted });
        await supabase.from('tasks').update({ content_body: formatted }).eq('id', draftId);

        // 3. Si sigue siendo el borrador activo en pantalla, actualizamos el editor visual y los estados
        if (isCurrentDraft()) {
            useWriterStore.setState({
                content: formatted,
                isAnalyzingSEO: false,
                hasGenerated: true,
                statusMessage: '✅ Artículo generado con éxito.',
                sidebarTab: 'assistant'
            } as any);
            store.addDebugPrompt('Refinamiento Finalizado', `SEO Post-Procesado y Extractores aplicados con éxito`, formatted.substring(0, 1000));
        }
        
        // --- AUTO-PATCHER ORCHESTRATION ---
        const patchers = LinkPatcherService.getPatchersForProcess(activeProject, 'writer');
        if (patchers.length > 0 && store.editor && isCurrentDraft()) {
            useWriterStore.getState().setStatus('Normalizando URLs con Nous Patcher...');
            try {
                for (const patcher of patchers) {
                    await LinkPatcherService.processEditorLinks(store.editor, patcher, 'apply');
                }
                if (isCurrentDraft()) useWriterStore.getState().setStatus('✅ Artículo generado y URLs normalizadas.');
            } catch (pe) {
                console.error('[AutoPatcher] Failure:', pe);
            }
        }

        setTimeout(() => { if (isCurrentDraft()) useWriterStore.getState().setStatus(''); }, 5000);
        useQueueStore.getState().addLogToTask(taskId, 'Generación completada.', 'success');
    } catch (e: any) {
        console.error(e);
        useQueueStore.getState().addLogToTask(taskId, `Error: ${e.message}`, 'error');
        if (isCurrentDraft()) {
            useWriterStore.setState({
                statusMessage: '❌ Error: ' + e.message,
                isGenerating: false,
                isAnalyzingSEO: false
            } as any);
        }
        throw e;
    } finally {
        if (isCurrentDraft()) {
            useWriterStore.getState().setGenerating(false);
        }
    }
};
