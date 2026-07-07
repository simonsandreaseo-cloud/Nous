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

        const payload = {
            taskId: targetTaskId,
            content: store.content,
            config: config
        };

        // Encolar tarea con el snapshot
        enqueueTask(
            'humanize', 
            `Humanizando: ${snapshotTitle}`, 
            payload, 
            { taskId: targetTaskId, projectId: targetProjectId }
        );

    }, [store, hasAccess, activeProject]);

    // --- Edición Quirúrgica ---
    const handleSurgicalEdit = useCallback(() => {
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.content) return;

        const { enqueueTask } = useQueueStore.getState();

        enqueueTask(
            'surgical_edit',
            'Edición Quirúrgica',
            {
                draftId:     store.draftId,
                content:     store.content,
                projectName: store.projectName,
                niche:       store.detectedNiche || store.humanizerConfig?.niche || 'General',
                audience:    store.humanizerConfig?.audience || 'Público General',
                language:    activeProject?.settings?.content_preferences?.default_content_language || 'es',
            },
            { taskId: store.draftId ?? undefined, projectId: activeProject?.id }
        );
    }, [hasAccess, store, activeProject]);

    const handleRefine = useCallback(() => {
        const { enqueueTask } = useQueueStore.getState();
        const outerStore = store;
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.content || !store.refinementInstructions) return;

        const payload = {
            taskId: targetTaskId,
            content: store.content,
            instructions: store.refinementInstructions,
            researchMode: store.researchMode
        };

        enqueueTask(
            'refine', 
            'Refinando texto', 
            payload, 
            { taskId: targetTaskId, projectId: targetProjectId }
        );

    }, [store, hasAccess]);

    // --- Clean ---
    const handleClean = useCallback(() => {
        const { enqueueTask } = useQueueStore.getState();
        const outerStore = store;
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        if (!hasAccess) return alert('No tienes permisos.');
        if (!store.content) return;

        const payload = {
            taskId: targetTaskId,
            content: store.content
        };
        
        enqueueTask(
            'clean', 
            'Limpiando huellas IA', 
            payload, 
            { taskId: targetTaskId, projectId: targetProjectId }
        );
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
