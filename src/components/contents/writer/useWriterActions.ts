'use client';

import { 
    runHumanizerPipeline, 
    generateOutlineStrategy, 
    generateArticleJSON, 
    runSEOPostProcessor,
    refineArticleContent, 
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

            if (activeProject && !hasTokens(1)) {
                store.setStatus('❌ Límite de tokens mensual alcanzado.');
                return alert(`Has superado tu límite de ${getTokensLimit()} tokens.`);
            }

            const prompt = buildPrompt(config);
            store.addDebugPrompt('Fase 1: Redacción Inicial', prompt);
            store.setStatus('Redactando artículo (1 Token usado)…');
            if (activeProject) await consumeTokens(1);

            const writingHierarchy = AI_CONFIG.gemini.hierarchies.writing;
            const modelToUse = store.researchMode === 'rapid' ? 'gemma-4-31b-it' : writingHierarchy[0];
            
            // Replaced streaming loop with direct JSON Server Action -> Now using Edge API Route to bypass 60s limit
            store.setStatus('Redactando contenido base... (Espere unos segundos)');
            
            let finalHtml = "";
            try {
                const response = await fetch('/api/writer/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, model: modelToUse, hierarchy: writingHierarchy })
                });
                
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                if (!response.body) throw new Error("No se pudo iniciar el stream del servidor.");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let lastUpdateTime = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.type === 'error') throw new Error(parsed.error);
                            if (parsed.type === 'status') store.setStatus(parsed.message);
                            if (parsed.type === 'chunk') {
                                finalHtml += parsed.html;
                            }
                            if (parsed.type === 'done') finalHtml = parsed.text;
                        } catch (e) {
                            // Ignorar errores de parseo de chunks incompletos
                        }
                    }
                }
                
                if (!finalHtml) throw new Error("No se generó contenido válido.");
            } catch (err) {
                console.error('[Generate] Fallback triggered', err);
                store.setStatus('⚠️ Interrupción detectada. Aplicando Fallback de continuación...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const fallbackModel = writingHierarchy.length > 1 ? writingHierarchy[1] : writingHierarchy[0];
                const fallbackResponse = await fetch('/api/writer/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, model: fallbackModel, hierarchy: writingHierarchy })
                });
                
                if (!fallbackResponse.ok || !fallbackResponse.body) throw new Error("Fallback falló al iniciar stream.");
                
                const fallbackReader = fallbackResponse.body.getReader();
                const fallbackDecoder = new TextDecoder();
                let fallbackBuffer = '';
                let fbLastUpdateTime = 0;

                while (true) {
                    const { done, value } = await fallbackReader.read();
                    if (done) break;
                    
                    fallbackBuffer += fallbackDecoder.decode(value, { stream: true });
                    const lines = fallbackBuffer.split('\n');
                    fallbackBuffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.type === 'error') throw new Error(parsed.error);
                            if (parsed.type === 'status') store.setStatus(parsed.message);
                            if (parsed.type === 'chunk') {
                                finalHtml += parsed.html;
                            }
                            if (parsed.type === 'done') finalHtml = parsed.text;
                        } catch (e) {}
                    }
                }
                
                if (!finalHtml) throw new Error("Fallback no generó contenido válido.");
            }

            store.setStatus('Procesando HTML final...');
            const cleanHtml = cleanAndFormatHtml(finalHtml);
            
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
            
            // Remove callback to prevent Server Action serialization error
            const refinedSEO = await runSEOPostProcessor(linked, config);
            
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

            const response = await fetch('/api/humanize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: store.content,
                    config,
                    intensity: 50
                })
            });

            const contentType = response.headers.get('content-type');
            if (!response.ok) {
                if (response.status === 504) {
                    throw new Error("El servidor tardó demasiado en responder (Error 504: Timeout). El texto es muy largo para procesarlo de una vez.");
                }
                
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                } else {
                    const textError = await response.text();
                    throw new Error(`Error del servidor (${response.status}): La respuesta no es JSON válido.`);
                }
            }

            if (!response.body) throw new Error("No se pudo iniciar el stream del servidor.");

            store.setContent(''); // Empezar de cero para mostrar el stream
            let newContent = '';

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let finalResult = null;
            let humLastUpdateTime = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // El último puede estar incompleto
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.type === 'status') {
                            store.setHumanizerStatus(parsed.message);
                        } else if (parsed.type === 'chunk') {
                            newContent += parsed.html + '\n';
                            const now = Date.now();
                            if (now - humLastUpdateTime > 300) {
                                store.setContent(newContent);
                                humLastUpdateTime = now;
                            }
                        } else if (parsed.type === 'error') {
                            throw new Error(parsed.error);
                        } else if (parsed.type === 'done') {
                            finalResult = parsed.result;
                        }
                    } catch (e) {
                        console.warn("Error parseando chunk del stream:", line);
                    }
                }
            }

            if (!finalResult) {
                finalResult = { html: newContent };
            }

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

    return {
        handleSEO,
        handleRegenerateOutline,
        handleGenerate,
        handleHumanize,
        handleRefine,
        isLocalConnected,
        setIsLocalConnected,
        hasAccess
    };
}
