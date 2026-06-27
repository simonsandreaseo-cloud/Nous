'use client';

import { 
    runHumanizerPipeline, 
    generateOutlineStrategy, 
    generateArticleJSON, 
    runSEOPostProcessor,
    refineArticleContent, 
    runContentCleaning,
    ArticleConfig 
} from '@/lib/actions/aiActions';
import { 
    generateBriefingText, 
    buildPrompt, 
    autoInterlinkAsync, 
    cleanAndFormatHtml, 
    refineStyling, 
    selectTopRelevantLinks 
} from '@/components/tools/writer/services';
import { ResearchOrchestrator } from '@/lib/services/writer/research';
import { OutlineEngine } from '@/lib/services/writer/research/outline-engine';
import { LinkPatcherService } from '@/lib/services/link-patcher';
import { NousExtractorService } from '@/lib/services/nous-extractor';
import { streamGenerate, streamSEOPostProcess, streamHumanize, streamSurgicalEdit, streamFinalCleanup } from '@/lib/services/writer/ai-streaming';

import { AI_CONFIG } from '@/lib/ai/config';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { useState, useCallback } from 'react';

export function useWriterActions() {
    const store = useWriterStore();
    const { user } = useAuthStore();
    const { activeProject } = useProjectStore();
    const { canTakeContents, canEditAny, canUseAllTools, hasTokens, consumeTokens, getTokensLimit } = usePermissions();

    const [isLocalConnected, setIsLocalConnected] = useState(false);

    // Context check for hasContentAccess
    const hasAccess = activeProject ? (canTakeContents() || canEditAny() || canUseAllTools()) : true;

    // --- SEO Research ---
    const handleSEO = useCallback(async () => {
        if (!store.keyword) return alert('Ingresa una palabra clave primero.');
        store.setAnalyzingSEO(true);
        store.setStatus('Realizando análisis profundo de SEO...');
        try {
            const modelToUse = store.researchMode === 'rapid' ? 'gemma-4-31b-it' : 'gemma-4-31b-it';
            const res = await ResearchOrchestrator.runDeepAnalysis({
                keyword: store.keyword,
                projectId: activeProject?.id,
                onProgress: (phase) => store.setStatus(phase),
                modelName: modelToUse,
                language: activeProject?.settings?.content_preferences?.default_content_language || 'es'
            });


            // 1. Sync store with research results
            store.setRawSeoData(res);
            if (res.nicheDetected) store.setDetectedNiche(res.nicheDetected);
            if (res.lsiKeywords) store.setStrategyLSI(res.lsiKeywords);
            if (res.frequentQuestions) store.setStrategyQuestions(res.frequentQuestions);
            if (res.suggestedInternalLinks) store.setStrategyLinks(res.suggestedInternalLinks || []);
            
            // Hypothetical keyword ideas
            if (res.keywordIdeas) store.setStrategyKeywords(res.keywordIdeas);
            
            // Volume & Difficulty mapping
            if (res.searchVolume || res.volume) store.setStrategyVolume(String(res.searchVolume || res.volume));
            if (res.keywordDifficulty) store.setStrategyDifficulty(res.keywordDifficulty);

            // New: Cannibalization handling
            const cannibalUrls = (res as any).cannibalizationUrls || [];
            store.setStrategyCannibalization(cannibalUrls);
            if (cannibalUrls.length > 0) {
                store.setIsConsoleOpen(true);
            }

            const brief = generateBriefingText(res);
            store.setStrategyNotes(brief);

            // 2. Persist to DB (Dossier + Top level columns)
            if (store.draftId) {
                console.log("[useWriterActions] Persisting Comprehensive SEO Strategy to DB for task:", store.draftId);
                const { error: updateError } = await supabase
                    .from('tasks')
                    .update({
                        seo_data: res, 
                        h1: res.h1,
                        seo_title: res.seo_title,
                        meta_description: res.meta_description,
                        excerpt: res.extracto,
                        target_url_slug: res.target_url_slug,
                        target_word_count: res.target_word_count,
                        outline_structure: res.strategyOutline || [],
                        status: 'por_redactar'
                    })
                    .eq('id', store.draftId);
                
                if (updateError) console.error("[useWriterActions] Error persisting research:", updateError.message);
            }

            // 3. Populate specific strategy fields for immediate UI feedback
            if (res.strategyOutline) {
                store.setStrategyOutline(res.strategyOutline);
            }

            if (res.h1) store.setStrategyH1(res.h1);
            if (res.seo_title) store.setStrategyTitle(res.seo_title);
            if (res.target_url_slug) store.setStrategySlug(res.target_url_slug);
            if (res.meta_description) store.setStrategyDesc(res.meta_description);
            if (res.extracto) store.setStrategyExcerpt(res.extracto);
            if (res.target_word_count) store.setStrategyWordCount(String(res.target_word_count));
            
            store.setStatus('✅ Análisis SEO y Arquitectura completados.');
            store.setSidebarTab('seo'); // Switching to SEO/Strategy tab
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error SEO: ' + e.message);
        } finally {
            store.setAnalyzingSEO(false);
        }
    }, [store, activeProject]);

    // --- Plan Structure (REGENERATION) ---
    const handleRegenerateOutline = useCallback(async () => {
        if (!store.rawSeoData) return alert('Realiza el análisis SEO primero.');
        store.setPlanningStructure(true);
        store.setStatus('Regenerando outline estratégico con Gemini 3.1 Flash Lite...');
        try {
            const res = await OutlineEngine.generate({
                keyword: store.keyword,
                seoMetadata: {
                    h1: store.strategyH1,
                    seo_title: store.strategyTitle,
                    slug: store.strategySlug,
                    meta_description: store.strategyDesc,
                    extracto: store.strategyExcerpt,
                    recommendedWordCount: store.strategyWordCount
                },
                cleanedLSI: store.strategyLSI,
                suggestedLinks: store.strategyLinks,
                validCompetitors: (store.rawSeoData as any).competitors || [],
                wordCountGoal: parseInt(String(store.strategyWordCount)) || 1500
            });

            
            store.setStrategyOutline(res);
            store.addDebugPrompt('Regeneración de Outline', `Nuevo outline generado para: ${store.keyword}`, JSON.stringify(res));
            
            if (store.draftId) {
                await supabase.from('tasks').update({
                    outline_structure: res
                }).eq('id', store.draftId);
            }
            
            store.setStatus('✅ Outline regenerado con éxito.');
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error Regeneración: ' + e.message);
        } finally {
            store.setPlanningStructure(false);
        }
    }, [store]);

    // --- Generate ---
    const handleGenerate = useCallback(async () => {
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.strategyH1 && !store.keyword) return alert('Necesitas un H1 o keyword objetivo.');
        
        store.setGenerating(true);
        store.setContent('');
        store.setStatus('Redactando artículo completo…');
        try {
            const h1 = store.strategyH1 || store.keyword;
            
            // Unify links from strategy and research
            const allLinks = [
                ...(store.strategyLinks || []),
                ...(store.strategyInternalLinks || []),
                ...(store.rawSeoData?.suggestedInternalLinks || [])
            ];
            const uniqueLinksMap = new Map();
            allLinks.forEach((l: any) => {
                if (!l.url) return;
                if (!uniqueLinksMap.has(l.url)) {
                    uniqueLinksMap.set(l.url, { 
                        ...l, 
                        url: l.url, 
                        title: l.title || l.url,
                        type: l.type || 'other'
                    });
                }
            });
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

            // Ensure we have at least 15-20 relevant links to provide the AI
            const finalApprovedLinks = researchLinks.slice(0, 20);

            const config: ArticleConfig = {
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
                    }).join('\n'),
                language: activeProject?.settings?.content_preferences?.default_content_language || 'es'
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

            const outlineChunks = chunkOutline(config.outlineStructure || [], 4);
            store.setStatus(`Documento dividido en ${outlineChunks.length} fragmentos para redacción progresiva...`);

            if (activeProject && !hasTokens(1)) {
                store.setStatus('❌ Límite de tokens mensual alcanzado.');
                return alert(`Has superado tu límite de ${getTokensLimit()} tokens.`);
            }

            store.setStatus('Redactando artículo (1 Token usado)…');
            if (activeProject) await consumeTokens(1);

            const writingHierarchy = AI_CONFIG.gemini.hierarchies.writing;
            const modelToUse = 'gemma-4-31b-it'; // Strict rule
            
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
                if (i === 0) store.addDebugPrompt('Fase 1: Redacción Inicial', prompt);
                
                store.setStatus(`Redactando parte ${i + 1}/${outlineChunks.length}... (Espere unos segundos)`);
                
                let chunkHtml = "";
                try {
                    chunkHtml = await streamGenerate(
                        prompt, 
                        modelToUse, 
                        writingHierarchy,
                        (html) => { 
                            chunkHtml = html; 
                            store.setContent(finalHtml + html); 
                        },
                        (msg) => store.setStatus(`[Parte ${i+1}] ${msg}`)
                    );
                } catch (err) {
                    console.error(`[Generate Chunk ${i+1}] Fallback triggered`, err);
                    store.setStatus(`⚠️ Interrupción detectada en parte ${i+1}. Reintentando...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    chunkHtml = await streamGenerate(
                        prompt, 
                        modelToUse, 
                        writingHierarchy,
                        (html) => { 
                            chunkHtml = html; 
                            store.setContent(finalHtml + html); 
                        },
                        (msg) => store.setStatus(`[Parte ${i+1}] ${msg}`)
                    );
                }

                finalHtml += chunkHtml + '\n\n';
                previousContext = chunkHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            }

            store.setStatus('Procesando HTML final...');
            let cleanHtml = cleanAndFormatHtml(finalHtml);
            
            store.setContent(cleanHtml);

            if (cleanHtml.includes('<!-- METADATA_START -->')) {
                const parts = cleanHtml.split('<!-- METADATA_START -->');
                cleanHtml = parts[0];
                try {
                    const meta = JSON.parse(parts[1].replace(/```json/g, '').replace(/```/g, '').trim());
                    store.setMetadata(meta);
                    if (meta.title) store.setTitle(meta.title);
                } catch (_) { }
            }

            // --- PHASE 3: SEO POST-PROCESSING & POLISHING ---
            store.setStatus('Generando vínculos interlinking...');
            await new Promise(resolve => setTimeout(resolve, 100)); // Yield to UI
            
            const linked = await autoInterlinkAsync(
                cleanHtml, 
                finalApprovedLinks,
                activeProject?.architecture_rules,
                activeProject?.architecture_instructions,
                activeProject
            );
            
            await new Promise(resolve => setTimeout(resolve, 100)); // Yield to UI
            
            store.setAnalyzingSEO(true);
            store.addDebugPrompt('Fase 2: Refinamiento SEO', `Optimizando con keywords: ${config.topic}, LSI: ${config.lsiKeywords?.join(', ')}. Enlaces aprobados: ${finalApprovedLinks.length}`);
            
            // --- API ROUTE REPLACEMENT FOR SEO POSTPROCESSOR ---
            let refinedSEO = linked;
            // Post-procesado global removido para evitar procesamiento de documento completo
            
            await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI
            
            // --- AUTOMATIC EXTRACTION (IF ACTIVE) ---
            let finalContent = refinedSEO;
            const activeExtractorRules = NousExtractorService.getActiveRulesForPhase(activeProject, 'writer');
            if (activeExtractorRules.length > 0) {
                store.setStatus('Ejecutando extractores de datos...');
                await new Promise(resolve => setTimeout(resolve, 100)); // Yield to UI
                finalContent = await NousExtractorService.applyExtractionToHtml(refinedSEO, activeProject, 'writer');
            }

            // --- FINAL CLEANUP & STORE SYNC (BATCHED) ---
            const formatted = cleanAndFormatHtml(finalContent);
            
            // Batch final state update to avoid multiple re-renders
            useWriterStore.setState({
                content: formatted,
                isAnalyzingSEO: false,
                hasGenerated: true,
                statusMessage: '✅ Artículo generado con éxito.',
                sidebarTab: 'assistant'
            } as any);

            store.addDebugPrompt('Refinamiento Finalizado', `SEO Post-Procesado y Extractores aplicados con éxito`, formatted.substring(0, 1000));
            
            // --- AUTO-PATCHER ORCHESTRATION ---
            const patchers = LinkPatcherService.getPatchersForProcess(activeProject, 'writer');
            if (patchers.length > 0 && store.editor) {
                store.setStatus('Normalizando URLs con Nous Patcher...');
                await new Promise(resolve => setTimeout(resolve, 100)); // Yield to UI
                try {
                    for (const patcher of patchers) {
                        await LinkPatcherService.processEditorLinks(store.editor, patcher, 'apply');
                    }
                    store.setStatus('✅ Artículo generado y URLs normalizadas.');
                } catch (pe) {
                    console.error('[AutoPatcher] Failure:', pe);
                }
            }

            setTimeout(() => store.setStatus(''), 5000);
        } catch (e: any) {
            console.error(e);
            useWriterStore.setState({
                statusMessage: '❌ Error: ' + e.message,
                isGenerating: false,
                isAnalyzingSEO: false
            } as any);
        } finally {
            store.setGenerating(false);
        }
    }, [store, hasAccess, activeProject, hasTokens, consumeTokens, getTokensLimit, selectTopRelevantLinks]);

    // --- Humanize ---
    const handleHumanize = useCallback(async () => {
        console.log("[DEBUG-Humanize] Action triggered");
        if (!hasAccess) {
            console.log("[DEBUG-Humanize] Access denied");
            return alert('No tienes permisos.');
        }
        if (!store.content) {
            console.log("[DEBUG-Humanize] No content found in store. Current content length:", store.content?.length);
            return;
        }
        
        console.log("[DEBUG-Humanize] Starting pipeline for content length:", store.content.length);
        store.setHumanizing(true);
        store.setHumanizerStatus('Iniciando humanización...');
        // Unify links for humanizer
        const allLinks = [
            ...(store.strategyLinks || []),
            ...(store.strategyInternalLinks || []),
            ...(store.rawSeoData?.suggestedInternalLinks || [])
        ];
        const uniqueLinksMap = new Map();
        allLinks.forEach(l => {
            if (!l.url) return;
            if (!uniqueLinksMap.has(l.url)) {
                uniqueLinksMap.set(l.url, { url: l.url, title: l.title || l.url });
            }
        });
        const unifiedLinks = Array.from(uniqueLinksMap.values());

        try {
            const config: any = {
                projectName: store.projectName, 
                niche: store.detectedNiche || store.humanizerConfig.niche || 'General', 
                audience: store.humanizerConfig.audience || 'Público General',
                keywords: store.keyword, 
                notes: store.humanizerConfig.notes || '',
                lsiKeywords: store.strategyLSI.map(l => l.keyword).concat(store.strategyLongTail),
                links: unifiedLinks, 
                questions: store.strategyQuestions,
                mode: store.humanizerConfig.mode || 'unified',
                language: activeProject?.settings?.content_preferences?.default_content_language || 'es'
            };

            const originalContent = store.content;

            const chunkHtml = (htmlString: string, chunkSize: number): string[] => {
                const elements = htmlString.split(/(?=<h[1-6]|<p|<ul|<ol|<li>|<div|<table|<blockquote)/gi);
                const chunks = [];
                for (let i = 0; i < elements.length; i += chunkSize) {
                    const chunk = elements.slice(i, i + chunkSize).join('').trim();
                    if (chunk) chunks.push(chunk);
                }
                return chunks;
            };

            const rawChunks = chunkHtml(originalContent, 4);
            console.log(`[DEBUG-Humanize] Documento dividido en ${rawChunks.length} chunks.`);
            store.setHumanizerStatus(`Documento dividido en ${rawChunks.length} partes...`);
            
            // In-place chunking: envolver todos los chunks inicialmente
            let currentDocumentChunks = rawChunks.map((chunk, index) => 
                `<div data-chunk-id="${index}" data-processing-state="idle">${chunk}</div>`
            );
            
            // Publicar el documento intacto pero marcado en el store
            store.setContent(currentDocumentChunks.join('\n'));

            for (let i = 0; i < rawChunks.length; i++) {
                let success = false;
                let attempts = 0;
                const MAX_ATTEMPTS = 3;

                // Marcar el chunk actual como "processing"
                currentDocumentChunks[i] = `<div data-chunk-id="${i}" data-processing-state="processing">${rawChunks[i]}</div>`;
                store.setContent(currentDocumentChunks.join('\n'));

                while (!success && attempts < MAX_ATTEMPTS) {
                    try {
                        store.setHumanizerStatus(`Humanizando Chunk ${i + 1}/${rawChunks.length} (Intento ${attempts + 1})...`);
                        
                        const chunkResult = await streamHumanize(
                            rawChunks[i],
                            config,
                            50,
                            () => {}, // Desactivamos el streaming parcial para mantener el DOM estable
                            (msg) => console.log(`[Chunk ${i+1}] ${msg}`)
                        );
                        
                        // Reemplazar el chunk original con el HTML finalizado
                        currentDocumentChunks[i] = chunkResult.html;
                        store.setContent(currentDocumentChunks.join('\n'));
                        success = true;
                    } catch (err: any) {
                        attempts++;
                        console.error(`[Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                        
                        if (attempts >= MAX_ATTEMPTS) {
                            throw new Error(`Fallo definitivo en el chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos: ${err.message}`);
                        }
                        
                        store.setHumanizerStatus(`Error en Chunk ${i + 1}. Reintentando en 60s... (${attempts}/${MAX_ATTEMPTS})`);
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    }
                }
            }

            const finalResult = { html: currentDocumentChunks.join('\n') };

            await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI

            // result now contains { html, metadata }
            const refined = refineStyling(finalResult.html);
            
            // Batch updates
            useWriterStore.setState({
                content: refined,
                hasHumanized: true,
                humanizerStatus: '✅ ¡Humanización completada!'
            } as any);

            store.addDebugPrompt('Humanización Finalizada', `Contenido humanizado con éxito`, refined.substring(0, 1000));
            
            // Update humanization metadata in DB
            if (store.draftId) {
                const { data: taskData } = await supabase
                    .from('tasks')
                    .select('metadata')
                    .eq('id', store.draftId)
                    .single();

                const newMetadata = { 
                    ...(taskData?.metadata || {}), 
                    is_humanized: true, 
                    humanized_at: new Date().toISOString() 
                };

                const { error: humanizeError } = await supabase
                    .from('tasks')
                    .update({ metadata: newMetadata })
                    .eq('id', store.draftId);
                
                if (humanizeError) console.error("[useWriterActions] Error updating humanization metadata:", humanizeError.message);
            }

            setTimeout(() => store.setHumanizerStatus(''), 3000);
        } catch (e: any) {
            console.error(e);
            store.setHumanizerStatus('❌ Error: ' + e.message);
        } finally {
            store.setHumanizing(false);
        }
    }, [store, hasAccess]);

    // --- Refine ---
    const handleSurgicalEdit = useCallback(async () => {
        console.log("[DEBUG-SurgicalEdit] Action triggered");
        if (!hasAccess) {
            console.log("[DEBUG-SurgicalEdit] Access denied");
            return alert('No tienes permisos.');
        }
        if (!store.content) {
            console.log("[DEBUG-SurgicalEdit] No content found in store. Current content length:", store.content?.length);
            return;
        }
        
        console.log("[DEBUG-SurgicalEdit] Starting pipeline for content length:", store.content.length);
        store.setSurgicalEditing(true);
        store.setSurgicalEditStatus('Iniciando edición quirúrgica...');
        
        try {
            const config: any = {
                projectName: store.projectName, 
                niche: store.detectedNiche || store.humanizerConfig.niche || 'General', 
                audience: store.humanizerConfig.audience || 'Público General',
                language: activeProject?.settings?.content_preferences?.default_content_language || 'es'
            };

            const originalContent = store.content;

            const chunkHtml = (htmlString: string, chunkSize: number): string[] => {
                const elements = htmlString.split(/(?=<h[1-6]|<p|<ul|<ol|<li>|<div|<table|<blockquote)/gi);
                const chunks = [];
                for (let i = 0; i < elements.length; i += chunkSize) {
                    const chunk = elements.slice(i, i + chunkSize).join('').trim();
                    if (chunk) chunks.push(chunk);
                }
                return chunks;
            };

            const rawChunks = chunkHtml(originalContent, 4);
            console.log(`[DEBUG-SurgicalEdit] Documento dividido en ${rawChunks.length} chunks.`);
            store.setSurgicalEditStatus(`Documento dividido en ${rawChunks.length} partes...`);
            
            // In-place chunking: envolver todos los chunks inicialmente
            let currentDocumentChunks = rawChunks.map((chunk, index) => 
                `<div data-chunk-id="${index}" data-processing-state="idle">${chunk}</div>`
            );
            
            // Publicar el documento intacto pero marcado en el store
            store.setContent(currentDocumentChunks.join('\n'));

            for (let i = 0; i < rawChunks.length; i++) {
                let success = false;
                let attempts = 0;
                const MAX_ATTEMPTS = 3;

                // Marcar el chunk actual como "processing"
                currentDocumentChunks[i] = `<div data-chunk-id="${i}" data-processing-state="processing">${rawChunks[i]}</div>`;
                store.setContent(currentDocumentChunks.join('\n'));

                while (!success && attempts < MAX_ATTEMPTS) {
                    try {
                        store.setSurgicalEditStatus(`Edición Quirúrgica Chunk ${i + 1}/${rawChunks.length} (Intento ${attempts + 1})...`);
                        
                        const chunkResult = await streamSurgicalEdit(
                            rawChunks[i],
                            config,
                            50,
                            () => {}, // Desactivamos el streaming parcial para mantener el DOM estable
                            (msg) => console.log(`[Chunk ${i+1}] ${msg}`)
                        );
                        
                        // Reemplazar el chunk original con el HTML finalizado
                        currentDocumentChunks[i] = chunkResult.html;
                        store.setContent(currentDocumentChunks.join('\n'));
                        success = true;
                    } catch (err: any) {
                        attempts++;
                        console.error(`[Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                        
                        if (attempts >= MAX_ATTEMPTS) {
                            throw new Error(`Fallo definitivo en el chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos: ${err.message}`);
                        }
                        
                        store.setSurgicalEditStatus(`Error en Chunk ${i + 1}. Reintentando en 60s... (${attempts}/${MAX_ATTEMPTS})`);
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    }
                }
            }

            const finalResult = { html: currentDocumentChunks.join('\n') };

            await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI

            const refined = refineStyling(finalResult.html);
            
            // Batch updates
            useWriterStore.setState({
                content: refined,
                surgicalEditStatus: '✅ ¡Edición Quirúrgica completada!'
            } as any);

            store.addDebugPrompt('Edición Quirúrgica Finalizada', `Contenido mejorado quirúrgicamente con éxito`, refined.substring(0, 1000));
            
        } catch (error: any) {
            console.error('[SurgicalEdit] Error:', error);
            store.setSurgicalEditStatus(`❌ Error: ${error.message}`);
            store.addDebugPrompt('Error en Edición Quirúrgica', 'Fallo general', error.message);
        } finally {
            store.setSurgicalEditing(false);
            setTimeout(() => {
                store.setSurgicalEditStatus('');
            }, 5000);
            
            console.log("[DEBUG-SurgicalEdit] Process finished");
        }
    }, [hasAccess, store, activeProject, refineStyling]);

    const handleRefine = useCallback(async () => {
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.content || !store.refinementInstructions) return;
        store.setRefining(true);
        store.setStatus('Refinando artículo…');
        try {
            const modelToUse = store.researchMode === 'rapid' ? 'gemma-4-31b-it' : 'gemma-4-31b-it';
            const refined = await refineArticleContent(store.content, store.refinementInstructions, modelToUse);
            
            await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI
            
            const styled = refineStyling(refined);
            
            // Batch updates
            useWriterStore.setState({
                content: styled,
                statusMessage: '✅ Refinamiento completado.',
                refinementInstructions: ''
            } as any);

            store.addDebugPrompt('Refinamiento Completado', `Instrucciones aplicadas: ${store.refinementInstructions}`, styled.substring(0, 1000));
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error: ' + e.message);
        } finally {
            store.setRefining(false);
        }
    }, [store, hasAccess]);

    // --- Clean ---
    const handleClean = useCallback(async () => {
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.content) return;
        
        store.setRefining(true);
        store.setStatus('Limpiando ruido IA del artículo…');
        
        try {
            const originalContent = store.content;
            
            const chunkHtml = (htmlString: string, chunkSize: number): string[] => {
                const elements = htmlString.split(/(?=<h[1-6]|<p|<ul|<ol|<li>|<div|<table|<blockquote)/gi);
                const chunks = [];
                for (let i = 0; i < elements.length; i += chunkSize) {
                    const chunk = elements.slice(i, i + chunkSize).join('').trim();
                    if (chunk) chunks.push(chunk);
                }
                return chunks;
            };

            const rawChunks = chunkHtml(originalContent, 4);
            store.setStatus(`Documento dividido en ${rawChunks.length} partes para limpieza...`);
            
            // In-place chunking: envolver todos los chunks inicialmente
            let currentDocumentChunks = rawChunks.map((chunk, index) => 
                `<div data-chunk-id="${index}" data-processing-state="idle">${chunk}</div>`
            );
            
            // Publicar el documento intacto pero marcado en el store
            store.setContent(currentDocumentChunks.join('\n'));
            
            for (let i = 0; i < rawChunks.length; i++) {
                let success = false;
                let attempts = 0;
                const MAX_ATTEMPTS = 3;

                // Marcar el chunk actual como "processing"
                currentDocumentChunks[i] = `<div data-chunk-id="${i}" data-processing-state="processing">${rawChunks[i]}</div>`;
                store.setContent(currentDocumentChunks.join('\n'));

                while (!success && attempts < MAX_ATTEMPTS) {
                    try {
                        store.setStatus(`Limpiando Chunk ${i + 1}/${rawChunks.length} (Intento ${attempts + 1})...`);
                        
                        const chunkResult = await streamFinalCleanup(
                            rawChunks[i],
                            (msg) => console.log(`[Clean Chunk ${i+1}] ${msg}`)
                        );
                        
                        // Reemplazar el chunk original con el HTML finalizado
                        currentDocumentChunks[i] = chunkResult;
                        store.setContent(currentDocumentChunks.join('\n'));
                        success = true;
                    } catch (err: any) {
                        attempts++;
                        console.error(`[Clean Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                        
                        if (attempts >= MAX_ATTEMPTS) {
                            throw new Error(`Fallo definitivo en la limpieza del chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos: ${err.message}`);
                        }
                        
                        store.setStatus(`Error en Limpieza Chunk ${i + 1}. Reintentando en 10s... (${attempts}/${MAX_ATTEMPTS})`);
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI
            
            const accumulatedHtml = currentDocumentChunks.join('\n');
            useWriterStore.setState({
                content: accumulatedHtml,
                statusMessage: '✅ ¡Limpieza mágica aplicada en todo el artículo!'
            } as any);

            store.addDebugPrompt('Limpieza Completada', `Ruido IA eliminado con éxito mediante chunks`, accumulatedHtml.substring(0, 1000));
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error en limpieza: ' + e.message);
        } finally {
            store.setRefining(false);
        }
    }, [store, hasAccess]);

    return {
        handleSEO,
        handleRegenerateOutline,
        handleGenerate,
        handleHumanize,
        handleSurgicalEdit,
        handleRefine,
        handleClean,
        isLocalConnected,
        setIsLocalConnected,
        hasAccess
    };
}
