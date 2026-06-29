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
import { useQueueStore } from '@/store/useQueueStore';
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

    const getNextProcessName = useCallback((baseName: string) => {
        const versions = store.taskVersions || [];
        const count = versions.filter((v: any) => v.process_name?.startsWith(baseName)).length;
        return count === 0 ? baseName : `${baseName} ${count + 1}`;
    }, [store.taskVersions]);

    // --- SEO Research ---
    const handleSEO = useCallback(() => {
        const { enqueueTask } = useQueueStore.getState();
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        
        if (!store.keyword) return alert('Ingresa una palabra clave primero.');
        
        enqueueTask('seo', 'Investigando SEO', 
            { taskId: targetTaskId, projectId: targetProjectId, keyword: store.keyword },
            { taskId: targetTaskId, projectId: targetProjectId }
        );
    }, [store, hasAccess, activeProject]);

    // --- Plan Structure (REGENERATION) ---
    const handleRegenerateOutline = useCallback(async () => {
        const { enqueueTask } = useQueueStore.getState();
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        
        if (!store.rawSeoData) return alert('Realiza el análisis SEO primero.');
        
        enqueueTask('outline', 'Regenerando estructura', 
            { taskId: targetTaskId, projectId: targetProjectId },
            { taskId: targetTaskId, projectId: targetProjectId }
        );
    }, [store]);

    // --- Generate Content ---
    const handleGenerate = useCallback(async () => {
        const { enqueueTask } = useQueueStore.getState();
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.strategyH1 && !store.keyword) return alert('Necesitas un H1 o keyword objetivo.');
        if (activeProject && !hasTokens(1)) {
            return alert(`Has superado tu límite de ${getTokensLimit()} tokens.`);
        }
        
        if (activeProject) await consumeTokens(1);
        
        enqueueTask('generate', 'Generando borrador inicial', 
            { taskId: targetTaskId, projectId: targetProjectId },
            { taskId: targetTaskId, projectId: targetProjectId }
        );
    }, [store, hasAccess, activeProject, hasTokens, consumeTokens, getTokensLimit]);

    // --- Humanize ---
    const handleHumanize = useCallback(() => {
        const { enqueueTask, addLogToTask } = useQueueStore.getState();
        
        const outerStore = store;
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        const snapshotTitle = store.articleTitle || store.keyword || 'Artículo';
        
        if (!hasAccess) {
            console.log("[DEBUG-Humanize] Access denied");
            return alert('No tienes permisos.');
        }
        if (!store.content) {
            console.log("[DEBUG-Humanize] No content found in store.");
            return;
        }

        // --- Toma de Snapshot Síncrono ---
        const originalContent = store.content;
        
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

        // Encolar tarea con el snapshot
        enqueueTask('humanize', `Humanizando: ${snapshotTitle}`, async (queueTaskId: string) => {
            const store = new Proxy(outerStore, {
                get(target: any, prop: string) {
                    if (typeof target[prop] === 'function' && (prop.startsWith('set') || prop.startsWith('add') || prop === 'setStatus')) {
                        return (...args: any[]) => {
                            if (useWriterStore.getState().draftId === targetTaskId) {
                                return target[prop](...args);
                            }
                        }
                    }
                    if (prop === 'saveTaskVersion') {
                        return (name: string, content?: string) => target.saveTaskVersion(name, content, targetTaskId);
                    }
                    return target[prop];
                }
            });
            console.log("[DEBUG-Humanize] Action triggered");
        
        console.log("[DEBUG-Humanize] Starting pipeline for content length:", originalContent.length);
        store.setHumanizing(true);
        store.setHumanizerStatus('Iniciando humanización...');
        try {
            await store.saveTaskVersion(`Pre-Humanización`, originalContent);

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
            addLogToTask(queueTaskId, `Documento dividido en ${rawChunks.length} partes para procesar.`, 'info');
            
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
                        addLogToTask(queueTaskId, `Procesando chunk ${i + 1} de ${rawChunks.length}${attempts > 0 ? ` (Reintento ${attempts})` : ''}...`, 'info');
                        
                        const chunkResult = await streamHumanize(
                            rawChunks[i],
                            config,
                            50,
                            () => {}, // Desactivamos el streaming parcial para mantener el DOM estable
                            (msg) => {
                                console.log(`[Chunk ${i+1}] ${msg}`);
                                addLogToTask(queueTaskId, `[Chunk ${i+1}] ${msg}`, 'info');
                            }
                        );
                        
                        addLogToTask(queueTaskId, `Chunk ${i + 1} completado.`, 'success');
                        
                        // Reemplazar el chunk original con el HTML finalizado
                        currentDocumentChunks[i] = chunkResult.html;
                        store.setContent(currentDocumentChunks.join('\n'));
                        success = true;
                    } catch (err: any) {
                        attempts++;
                        console.error(`[Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                        addLogToTask(queueTaskId, `Error en chunk ${i + 1}: ${err.message}`, 'error');
                        
                        if (attempts >= MAX_ATTEMPTS) {
                            throw new Error(`Fallo definitivo en el chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos: ${err.message}`);
                        }
                        
                        store.setHumanizerStatus(`Error en Chunk ${i + 1}. Reintentando en 60s... (${attempts}/${MAX_ATTEMPTS})`);
                        addLogToTask(queueTaskId, `Esperando 60s antes de reintentar chunk ${i + 1}...`, 'warning');
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    }
                }
                
                useQueueStore.getState().setTaskStatus(queueTaskId, 'processing', ((i + 1) / rawChunks.length) * 100);
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
            
            // Save version
            await store.saveTaskVersion(getNextProcessName('Humanizada'), refined);
            
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
            addLogToTask(queueTaskId, `Error crítico: ${e.message}`, 'error');
        } finally {
            store.setHumanizing(false);
        }
        }, { taskId: targetTaskId, projectId: targetProjectId });
    }, [store, hasAccess, activeProject]);

    // --- Refine ---
    const handleSurgicalEdit = useCallback(() => {
        const { enqueueTask } = useQueueStore.getState();
        const outerStore = store;
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        enqueueTask('surgical_edit', 'Edición Quirúrgica', async (queueTaskId: string) => {
            const store = new Proxy(outerStore, {
                get(target: any, prop: string) {
                    if (typeof target[prop] === 'function' && (prop.startsWith('set') || prop.startsWith('add') || prop === 'setStatus')) {
                        return (...args: any[]) => {
                            if (useWriterStore.getState().draftId === targetTaskId) {
                                return target[prop](...args);
                            }
                        }
                    }
                    if (prop === 'saveTaskVersion') {
                        return (name: string, content?: string) => target.saveTaskVersion(name, content, targetTaskId);
                    }
                    return target[prop];
                }
            });
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
            await store.saveTaskVersion(`Pre-Edición Quirúrgica`, store.content);

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
            addLogToTask(queueTaskId, `Documento dividido en ${rawChunks.length} partes para edición.`, 'info');
            
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
                        addLogToTask(queueTaskId, `Procesando chunk ${i + 1} de ${rawChunks.length}${attempts > 0 ? ` (Reintento ${attempts})` : ''}...`, 'info');
                        
                        const chunkResult = await streamSurgicalEdit(
                            rawChunks[i],
                            config,
                            50,
                            () => {}, // Desactivamos el streaming parcial para mantener el DOM estable
                            (msg) => {
                                console.log(`[Chunk ${i+1}] ${msg}`);
                                addLogToTask(queueTaskId, `[Chunk ${i+1}] ${msg}`, 'info');
                            }
                        );
                        
                        addLogToTask(queueTaskId, `Chunk ${i + 1} completado.`, 'success');
                        
                        // Reemplazar el chunk original con el HTML finalizado
                        currentDocumentChunks[i] = chunkResult.html;
                        store.setContent(currentDocumentChunks.join('\n'));
                        success = true;
                    } catch (err: any) {
                        attempts++;
                        console.error(`[Chunk ${i+1}] Fallo intento ${attempts}:`, err);
                        addLogToTask(queueTaskId, `Error en chunk ${i + 1}: ${err.message}`, 'error');
                        
                        if (attempts >= MAX_ATTEMPTS) {
                            throw new Error(`Fallo definitivo en el chunk ${i + 1} tras ${MAX_ATTEMPTS} intentos: ${err.message}`);
                        }
                        
                        store.setSurgicalEditStatus(`Error en Chunk ${i + 1}. Reintentando en 60s... (${attempts}/${MAX_ATTEMPTS})`);
                        addLogToTask(queueTaskId, `Esperando 60s antes de reintentar chunk ${i + 1}...`, 'warning');
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    }
                }
                useQueueStore.getState().setTaskStatus(queueTaskId, 'processing', ((i + 1) / rawChunks.length) * 100);
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
            addLogToTask(queueTaskId, 'Edición quirúrgica finalizada.', 'success');
            
            // Save version
            await store.saveTaskVersion(getNextProcessName('Edición Quirúrgica'), refined);
            
        } catch (error: any) {
            console.error('[SurgicalEdit] Error:', error);
            store.setSurgicalEditStatus(`❌ Error: ${error.message}`);
            store.addDebugPrompt('Error en Edición Quirúrgica', 'Fallo general', error.message);
            addLogToTask(queueTaskId, `Error crítico: ${error.message}`, 'error');
        } finally {
            store.setSurgicalEditing(false);
            setTimeout(() => {
                store.setSurgicalEditStatus('');
            }, 5000);
            
            console.log("[DEBUG-SurgicalEdit] Process finished");
        }
        }, { taskId: targetTaskId, projectId: targetProjectId });
    }, [hasAccess, store, activeProject, refineStyling]);

    const handleRefine = useCallback(() => {
        const { enqueueTask } = useQueueStore.getState();
        const outerStore = store;
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        enqueueTask('refine', 'Refinando texto', async () => {
            const store = new Proxy(outerStore, {
                get(target: any, prop: string) {
                    if (typeof target[prop] === 'function' && (prop.startsWith('set') || prop.startsWith('add') || prop === 'setStatus')) {
                        return (...args: any[]) => {
                            if (useWriterStore.getState().draftId === targetTaskId) {
                                return target[prop](...args);
                            }
                        }
                    }
                    if (prop === 'saveTaskVersion') {
                        return (name: string, content?: string) => target.saveTaskVersion(name, content, targetTaskId);
                    }
                    return target[prop];
                }
            });
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
            
            // Save version
            await store.saveTaskVersion(getNextProcessName('Refinada'), styled);
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error: ' + e.message);
        } finally {
            store.setRefining(false);
        }
        }, { taskId: targetTaskId, projectId: targetProjectId });
    }, [store, hasAccess]);

    // --- Clean ---
    const handleClean = useCallback(() => {
        const { enqueueTask } = useQueueStore.getState();
        const outerStore = store;
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        enqueueTask('clean', 'Limpiando huellas IA', async () => {
            const store = new Proxy(outerStore, {
                get(target: any, prop: string) {
                    if (typeof target[prop] === 'function' && (prop.startsWith('set') || prop.startsWith('add') || prop === 'setStatus')) {
                        return (...args: any[]) => {
                            if (useWriterStore.getState().draftId === targetTaskId) {
                                return target[prop](...args);
                            }
                        }
                    }
                    if (prop === 'saveTaskVersion') {
                        return (name: string, content?: string) => target.saveTaskVersion(name, content, targetTaskId);
                    }
                    return target[prop];
                }
            });
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.content) return;
        
        store.setRefining(true);
        store.setStatus('Limpiando ruido IA del artículo…');
        
        try {
            const originalContent = store.content;
            await store.saveTaskVersion(`Pre-Limpieza`, originalContent);
            
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
            
            // Save version
            await store.saveTaskVersion(getNextProcessName('Limpieza IA'), accumulatedHtml);
        } catch (e: any) {
            console.error(e);
            store.setStatus('❌ Error en limpieza: ' + e.message);
        } finally {
            store.setRefining(false);
        }
        }, { taskId: targetTaskId, projectId: targetProjectId });
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
