import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { supabase } from '@/lib/supabase';
import { buildPrompt, cleanAndFormatHtml, autoInterlinkAsync } from '@/components/tools/writer/services';
import { streamGenerate } from '@/lib/services/writer/ai-streaming';
import { AI_CONFIG } from '@/lib/ai/config';
import { NousExtractorService } from '@/lib/services/nous-extractor';
import { LinkPatcherService } from '@/lib/services/link-patcher';
import { QueuePayload } from '../registry';

export const handleGenerateTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const activeProject = useProjectStore.getState().activeProject;
    
    const draftId = payload.taskId || store.draftId;
    
    if (store.draftId === draftId) {
        useWriterStore.getState().setGenerating(true);
        if (store.content?.trim().length > 0) {
            await store.saveTaskVersion(`Pre-Generación`, store.content);
        }
        useWriterStore.getState().setContent('');
        useWriterStore.getState().setStatus('Redactando artículo completo…');
    }

    try {
        const h1 = store.strategyH1 || store.keyword || 'Artículo';
        
        const uniqueLinksMap = new Map<string, any>();
        const addLinksToMap = (links: any[]) => {
            if (links && Array.isArray(links)) {
                links.forEach(l => {
                    if (l.url && !uniqueLinksMap.has(l.url)) uniqueLinksMap.set(l.url, { url: l.url, anchor: l.anchor, type: l.type || 'other' });
                });
            }
        };

        if (store.rawSeoData) {
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

        if (store.draftId === draftId) {
            useWriterStore.getState().setStatus(`Documento dividido en ${outlineChunks.length} fragmentos para redacción progresiva...`);
        }

        const writingHierarchy = AI_CONFIG.gemini.hierarchies.writing;
        const modelToUse = 'gemma-4-31b-it';
        
        let finalHtml = "";
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
            if (store.draftId === draftId && i === 0) store.addDebugPrompt('Fase 1: Redacción Inicial', prompt);
            
            if (store.draftId === draftId) {
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
                        if (store.draftId === draftId) useWriterStore.getState().setContent(finalHtml + html); 
                    },
                    (msg) => { if (store.draftId === draftId) useWriterStore.getState().setStatus(`[Parte ${i+1}] ${msg}`); }
                );
            } catch (err) {
                console.error(`[Generate Chunk ${i+1}] Fallback triggered`, err);
                if (store.draftId === draftId) useWriterStore.getState().setStatus(`⚠️ Interrupción detectada en parte ${i+1}. Reintentando...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                chunkHtml = await streamGenerate(
                    prompt, 
                    modelToUse, 
                    writingHierarchy,
                    (html) => { 
                        chunkHtml = html; 
                        if (store.draftId === draftId) useWriterStore.getState().setContent(finalHtml + html); 
                    },
                    (msg) => { if (store.draftId === draftId) useWriterStore.getState().setStatus(`[Parte ${i+1}] Reintento: ${msg}`); }
                );
            }

            finalHtml += chunkHtml + '\n\n';
            previousContext = chunkHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        if (store.draftId === draftId) useWriterStore.getState().setStatus('Procesando HTML final...');
        let cleanHtml = cleanAndFormatHtml(finalHtml);
        
        if (store.draftId === draftId) {
            useWriterStore.getState().setContent(cleanHtml);
        }

        if (cleanHtml.includes('<!-- METADATA_START -->')) {
            const parts = cleanHtml.split('<!-- METADATA_START -->');
            cleanHtml = parts[0];
            try {
                const meta = JSON.parse(parts[1].replace(/```json/g, '').replace(/```/g, '').trim());
                if (store.draftId === draftId) {
                    useWriterStore.getState().setMetadata(meta);
                    if (meta.title) useWriterStore.getState().setTitle(meta.title);
                }
            } catch (_) { }
        }

        if (store.draftId === draftId) useWriterStore.getState().setStatus('Generando vínculos interlinking...');
        
        const linked = await autoInterlinkAsync(
            cleanHtml, 
            finalApprovedLinks,
            activeProject?.architecture_rules,
            activeProject?.architecture_instructions,
            activeProject
        );
        
        if (store.draftId === draftId) {
            const s = useWriterStore.getState();
            s.setAnalyzingSEO(true);
            s.addDebugPrompt('Fase 2: Refinamiento SEO', `Optimizando con keywords: ${config.topic}, LSI: ${config.lsiKeywords?.join(', ')}. Enlaces aprobados: ${finalApprovedLinks.length}`);
        }
        
        let refinedSEO = linked;
        
        let finalContent = refinedSEO;
        const activeExtractorRules = NousExtractorService.getActiveRulesForPhase(activeProject, 'writer');
        if (activeExtractorRules.length > 0) {
            if (store.draftId === draftId) useWriterStore.getState().setStatus('Ejecutando extractores de datos...');
            finalContent = await NousExtractorService.applyExtractionToHtml(refinedSEO, activeProject, 'writer');
        }

        const formatted = cleanAndFormatHtml(finalContent);
        
        if (store.draftId === draftId) {
            useWriterStore.setState({
                content: formatted,
                isAnalyzingSEO: false,
                hasGenerated: true,
                statusMessage: '✅ Artículo generado con éxito.',
                sidebarTab: 'assistant'
            } as any);
            store.addDebugPrompt('Refinamiento Finalizado', `SEO Post-Procesado y Extractores aplicados con éxito`, formatted.substring(0, 1000));
            await store.saveTaskVersion('Generación Inicial', formatted);
        }
        
        // --- AUTO-PATCHER ORCHESTRATION ---
        const patchers = LinkPatcherService.getPatchersForProcess(activeProject, 'writer');
        if (patchers.length > 0 && store.editor) {
            if (store.draftId === draftId) useWriterStore.getState().setStatus('Normalizando URLs con Nous Patcher...');
            try {
                for (const patcher of patchers) {
                    await LinkPatcherService.processEditorLinks(store.editor, patcher, 'apply');
                }
                if (store.draftId === draftId) useWriterStore.getState().setStatus('✅ Artículo generado y URLs normalizadas.');
            } catch (pe) {
                console.error('[AutoPatcher] Failure:', pe);
            }
        }

        setTimeout(() => { if (useWriterStore.getState().draftId === draftId) useWriterStore.getState().setStatus(''); }, 5000);
        useQueueStore.getState().addLogToTask(taskId, 'Generación completada.', 'success');
    } catch (e: any) {
        console.error(e);
        useQueueStore.getState().addLogToTask(taskId, `Error: ${e.message}`, 'error');
        if (useWriterStore.getState().draftId === draftId) {
            useWriterStore.setState({
                statusMessage: '❌ Error: ' + e.message,
                isGenerating: false,
                isAnalyzingSEO: false
            } as any);
        }
        throw e;
    } finally {
        if (useWriterStore.getState().draftId === draftId) {
            useWriterStore.getState().setGenerating(false);
        }
    }
};
