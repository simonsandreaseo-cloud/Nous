'use client';

import { useWriterStore } from '@/store/useWriterStore';
import { cn } from '@/utils/cn';
import {
    Bot, Search, Image as ImageIcon, FileOutput, X, Sparkles, Check, Globe,
    Wand2, Settings, Layers, ChevronDown, ChevronUp, Plus, Trash, RefreshCw,
    Upload, Download, Code, Link as LinkIcon, FileText, Loader2, ArrowRight,
    Save, AlertCircle, Zap
} from 'lucide-react';
import { Button } from '@/components/dom/Button';
import { useState, useEffect, useRef } from 'react';
import {
    runHumanizerPipeline,
    runSEOAnalysis,
    generateOutlineStrategy,
    generateArticleStream,
    buildPrompt,
    autoInterlink,
    cleanAndFormatHtml,
    refineStyling,
    refineArticleContent,
    generateSchemaMarkup,
    ArticleConfig,
    ContentItem,
    parseCSV,
} from '@/components/tools/writer/services';
import { BriefingService } from '@/components/studio/writer/BriefingServiceLocal';
import BriefingModal from '@/components/studio/writer/BriefingModal';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectStore } from '@/store/useProjectStore';
import { usePermissions } from '@/hooks/usePermissions';

// ── Small helpers ───────────────────────────────────────────
function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{children}</p>
    );
}

function StatusBadge({ message, isLoading }: { message: string; isLoading?: boolean }) {
    if (!message) return null;
    return (
        <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
            {isLoading
                ? <Loader2 size={12} className="text-indigo-500 animate-spin shrink-0" />
                : <Sparkles size={12} className="text-indigo-500 shrink-0" />}
            <p className="text-[10px] text-indigo-700 font-medium leading-snug">{message}</p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
export default function WriterSidebar() {
    const {
        isSidebarOpen, toggleSidebar, activeSidebarTab, setSidebarTab,
        content, setContent, setTitle,
        keyword, setKeyword,
        apiKeys, setApiKeys,
        serperKey, setSerperKey,
        valueSerpKey, setValueSerpKey,
        jinaKey, setJinaKey,
        model, setModel,
        csvData, setCsvData, csvFileName,
        projectName, setProjectName,
        humanizerConfig, updateHumanizerConfig,
        setGenerating, isGenerating,
        isAnalyzingSEO, setAnalyzingSEO,
        isPlanningStructure, setPlanningStructure,
        isHumanizing, setHumanizing,
        isExporting, setExporting,
        isRefining, setRefining,
        rawSeoData, setRawSeoData,
        seoResults, setSeoResults,
        researchDossier, outlineStructure, setOutlineStructure,
        strategyTitle, setStrategyTitle,
        strategyH1, setStrategyH1,
        strategySlug, setStrategySlug,
        strategyDesc, setStrategyDesc,
        strategyWordCount, setStrategyWordCount,
        strategyTone, setStrategyTone,
        strategyOutline, setStrategyOutline,
        strategyCompetitors, setStrategyCompetitors,
        strategyNotes, setStrategyNotes,
        strategyLinks, setStrategyLinks,
        strategyLSI, setStrategyLSI,
        strategyLongTail, setStrategyLongTail,
        strategyQuestions, setStrategyQuestions,
        detectedNiche, setDetectedNiche,
        creativityLevel, setCreativityLevel,
        contextInstructions, setContextInstructions,
        isStrictMode, setIsStrictMode,
        strictFrequency, setStrictFrequency,
        metadata, setMetadata,
        statusMessage, setStatus,
        downloadProgress,
        refinementInstructions, setRefinementInstructions,
        humanizerStatus, setHumanizerStatus,
        draftId, setDraftId,
    } = useWriterStore();

    const { user } = useAuthStore();
    const { activeProject } = useProjectStore();
    const { canTakeContents, canEditAny, canUseAllTools, hasTokens, consumeTokens, getTokensLimit, getTokensUsed } = usePermissions();
    const hasContentAccess = activeProject ? (canTakeContents() || canEditAny() || canUseAllTools()) : true;

    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
    const [isLocalConnected, setIsLocalConnected] = useState(false);

    // Connection health check
    useEffect(() => {
        const checkConnection = () => {
            try {
                const ws = new WebSocket('ws://127.0.0.1:8181');
                ws.onopen = () => {
                    setIsLocalConnected(true);
                    ws.close();
                };
                ws.onerror = () => setIsLocalConnected(false);
            } catch (e) {
                setIsLocalConnected(false);
            }
        };
        checkConnection();
        const interval = setInterval(checkConnection, 5000);
        return () => clearInterval(interval);
    }, []);

    // Auto-switch model based on local node connection
    useEffect(() => {
        if (isLocalConnected) {
            setModel('gemma-3-4b-it');
        } else {
            setModel('gemini-2.5-flash');
        }
    }, [isLocalConnected, setModel]);


    const fileInputRef = useRef<HTMLInputElement>(null);



    // ── CSV loader ───────────────────────────────────────────
    const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            try {
                const parsed = parseCSV(text) as any;
                const data = Array.isArray(parsed) ? parsed : (parsed.data || []);
                setCsvData(data, file.name);
                setStatus(`✅ CSV cargado: ${data.length} páginas indexadas`);
            } catch (e: any) {
                setStatus(`❌ Error CSV: ${e.message}`);
            }
        };
        reader.readAsText(file);
    };



    // Auto-populate project name & keyword from active project
    useEffect(() => {
        if (activeProject) {
            console.log("[WriterSidebar] Active project changed:", activeProject.name);
            // Always update if current projectName is empty or default
            if (!projectName || projectName === 'General') {
                setProjectName(activeProject.name || '');
            }
            // If keyword is empty, try to use a heuristic from project (e.g. domain or first word of name)
            if (!keyword) {
                // Heuristic: If we don't have a keyword yet, use the project name or domain
                const suggestedKeyword = activeProject.name || '';
                if (suggestedKeyword) {
                    setKeyword(suggestedKeyword);
                }
            }
        }
    }, [activeProject]);

    // ── STEP 1 – SEO Analysis ────────────────────────────────
    const handleSEO = async () => {
        console.log("[WriterSidebar] handleSEO clicked. State check:", {
            keyword,
            hasContentAccess,
            apiKeysCount: apiKeys.length,
            isAnyLoading
        });

        if (!hasContentAccess) {
            console.warn("[WriterSidebar] handleSEO: No content access");
            return alert('No tienes permisos para generar contenido en este proyecto.');
        }
        if (!keyword.trim()) {
            console.warn("[WriterSidebar] handleSEO: No keyword");
            return alert('Introduce una palabra clave.');
        }

        // Only require env keys if NOT using a local model
        const isLocal = model.includes('local') || model.startsWith('gemma');
        // Check both store keys and env keys (favoring the plural NEXT_PUBLIC version for browser access)
        const hasEffectiveKeys = (apiKeys && apiKeys.length > 0) || !!(process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS);
        
        if (!hasEffectiveKeys && !isLocal && !isLocalConnected) {
            console.warn("[WriterSidebar] handleSEO: No API keys for cloud model and local not connected");
            return alert('Error: No se detectan API Keys (plural) configuradas. Asegúrate de tener NEXT_PUBLIC_GEMINI_API_KEYS en Vercel o de configurar tus llaves personales en Ajustes.');
        }

        setAnalyzingSEO(true);
        setStatus('Analizando SERP y keywords…');
        console.log("[WriterSidebar] handleSEO: Calling runSEOAnalysis with model:", model);
        try {
            const data = await runSEOAnalysis(
                apiKeys, keyword, csvData, projectName,
                serperKey || process.env.NEXT_PUBLIC_SERPER_API_KEY || undefined,
                valueSerpKey || undefined,
                jinaKey || undefined,
                model // Pass model to runSEOAnalysis
            );
            console.log("[WriterSidebar] handleSEO: Success", data);
            setRawSeoData(data);
            setSeoResults(data);
            setStrategyCompetitors(data.top10Urls?.map((u) => u.url).join('\n') || '');
            setDetectedNiche(data.nicheDetected || 'General');
            setStrategyLinks(data.suggestedInternalLinks || []);
            setStrategyWordCount(data.recommendedWordCount || '1500');
            setStrategyLSI(data.lsiKeywords || []);
            setStrategyLongTail(data.autocompleteLongTail || []);
            setStrategyQuestions(data.frequentQuestions || []);
            setStatus('✅ Análisis completo. Revisa y ajusta la estrategia.');
            setSidebarTab('research');
        } catch (e: any) {
            console.error("[WriterSidebar] handleSEO: ERROR", e);
            setStatus('❌ Error en análisis: ' + e.message);
        } finally {
            setAnalyzingSEO(false);
        }
    };

    // ── STEP 2 – Plan Structure ──────────────────────────────
    const handlePlanStructure = async () => {
        if (!hasContentAccess) return alert('No tienes permisos.');
        if (!rawSeoData) return alert('Primero analiza el SERP.');
        
        const hasEffectiveKeys = (apiKeys && apiKeys.length > 0) || !!(process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS);
        if (!hasEffectiveKeys && !isLocalConnected) return alert('Configura tus API Keys (plural) primero o conecta el nodo local.');
        setPlanningStructure(true);
        setStatus('Diseñando estructura ganadora…');
        try {
            const config: ArticleConfig = {
                projectName, niche: detectedNiche, topic: keyword,
                metaTitle: '', keywords: keyword, tone: strategyTone,
                wordCount: strategyWordCount, refUrls: strategyCompetitors,
                refContent: '', csvData: [], approvedLinks: strategyLinks,
                questions: strategyQuestions,
                lsiKeywords: strategyLSI.map((l) => l.keyword).concat(strategyLongTail),
            };
            const structureData = await generateOutlineStrategy(apiKeys, config, keyword, rawSeoData, model); // Updated call
            setStrategyTitle(structureData.snippet.metaTitle);
            setStrategyH1(structureData.snippet.h1);
            setStrategySlug(structureData.snippet.slug);
            setStrategyDesc(structureData.snippet.metaDescription);
            setStrategyOutline(structureData.outline.headers);
            setStrategyNotes(structureData.outline.introNote);
            setStatus('✅ Estrategia lista. ¡Genera el artículo ahora!');
            setSidebarTab('research'); // Transition to Strategy review
        } catch (e: any) {
            console.error(e);
            setStatus('❌ Error: ' + e.message);
        } finally {
            setPlanningStructure(false);
        }
    };

    // ── STEP 3 – Generate Article ────────────────────────────
    const handleGenerate = async () => {
        if (!hasContentAccess) return alert('No tienes permisos.');
        if (!strategyH1 && !keyword) return alert('Necesitas un H1 o keyword objetivo.');
        
        const hasEffectiveKeys = (apiKeys && apiKeys.length > 0) || !!(process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS);
        if (!hasEffectiveKeys && !isLocalConnected) return alert('Configura tus API Keys (plural) primero o conecta el nodo local.');

        setGenerating(true);
        setContent('');
        setStatus('Redactando artículo completo…');
        try {
            const h1 = strategyH1 || keyword;
            const config: ArticleConfig = {
                projectName, niche: detectedNiche, topic: h1,
                metaTitle: strategyTitle || h1,
                keywords: rawSeoData?.keywordIdeas?.shortTail?.slice(0, 5).join(', ') || keyword,
                tone: strategyTone, wordCount: strategyWordCount,
                refUrls: strategyCompetitors, refContent: strategyNotes,
                csvData, outlineStructure: strategyOutline,
                approvedLinks: strategyLinks,
                questions: strategyQuestions,
                lsiKeywords: strategyLSI.map((l) => l.keyword).concat(strategyLongTail),
                creativityLevel, contextInstructions,
                isStrictMode, strictFrequency,
            };

            if (activeProject && !hasTokens(1)) {
                setStatus('❌ Límite de tokens mensual alcanzado.');
                return alert(`Has superado tu límite de ${getTokensLimit()} tokens.`);
            }

            const prompt = buildPrompt(config);
            setStatus('Redactando artículo (1 Token usado)…');
            if (activeProject) await consumeTokens(1);

            const stream = await generateArticleStream(apiKeys, model, prompt);

            let buffer = '';
            for await (const chunk of stream) {
                if (chunk.text) {
                    buffer += chunk.text;
                    // Live update on each chunk
                    setContent(buffer);
                }
            }

            // Post-processing
            let cleanHtml = buffer;
            if (cleanHtml.includes('<!-- METADATA_START -->')) {
                const parts = cleanHtml.split('<!-- METADATA_START -->');
                cleanHtml = parts[0];
                try {
                    const meta = JSON.parse(parts[1].replace(/```json/g, '').replace(/```/g, '').trim());
                    setMetadata(meta);
                    if (meta.title) setTitle(meta.title);
                } catch (_) { }
            }

            const linked = autoInterlink(cleanHtml, csvData);
            const formatted = cleanAndFormatHtml(linked);
            setContent(formatted);
            setStatus('✅ Artículo generado con éxito.');
            setSidebarTab('assistant');
        } catch (e: any) {
            console.error(e);
            setStatus('❌ Error: ' + e.message);
        } finally {
            setGenerating(false);
        }
    };

    // ── Humanizer ────────────────────────────────────────────
    const handleHumanize = async () => {
        if (!hasContentAccess) return alert('No tienes permisos.');
        if (!content) return;
        
        const hasEffectiveKeys = (apiKeys && apiKeys.length > 0) || !!(process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS);
        if (!hasEffectiveKeys && !isLocalConnected) return alert('Configura tus API Keys (plural) primero o conecta el nodo local.');
        setHumanizing(true);
        setHumanizerStatus('Iniciando humanización…');
        try {
            const result = await runHumanizerPipeline(
                apiKeys, content,
                { ...humanizerConfig, isStrictMode: false, keywords: '' },
                humanizerConfig.intensity,
                (msg) => setHumanizerStatus(msg)
            );
            setContent(result.html);
            setHumanizerStatus('✅ ¡Humanización completada!');
            setTimeout(() => setHumanizerStatus(''), 3000);
        } catch (e: any) {
            console.error(e);
            setHumanizerStatus('❌ Error: ' + e.message);
        } finally {
            setHumanizing(false);
        }
    };

    // ── Refine with instructions ─────────────────────────────
    const handleRefine = async () => {
        if (!hasContentAccess) return alert('No tienes permisos.');
        if (!content || !refinementInstructions) return;
        setRefining(true);
        setStatus('Refinando artículo…');
        try {
            const refined = await refineArticleContent(apiKeys, content, refinementInstructions, model); // Pass model to refineArticleContent
            const styled = refineStyling(refined);
            setContent(styled);
            setRefinementInstructions('');
            setStatus('✅ Refinamiento completado.');
        } catch (e: any) {
            console.error(e);
            setStatus('❌ Error: ' + e.message);
        } finally {
            setRefining(false);
        }
    };

    // ── Export to WordPress ──────────────────────────────────
    const handleExportWP = async () => {
        if (!content) return alert('No hay contenido para exportar.');
        if (!activeProject?.wp_url || !activeProject?.wp_token)
            return alert('Configura WP URL y Token en los ajustes del proyecto.');
        setExporting(true);
        setStatus('Publicando en WordPress…');
        try {
            const { WordPressService } = await import('@/lib/services/wordpress');
            const res = await WordPressService.publishPost(activeProject.wp_url, activeProject.wp_token, {
                title: strategyH1 || keyword || 'Sin título',
                content,
                status: 'draft',
            });
            if (res.success) {
                if (confirm('✅ Publicado como borrador. ¿Abrir editor de WP?')) window.open(res.edit_url, '_blank');
                setStatus('✅ Publicado en WordPress.');
            }
        } catch (e: any) {
            console.error(e);
            setStatus('❌ Error WordPress: ' + e.message);
        } finally {
            setExporting(false);
        }
    };

    // ── Export: Copy HTML ────────────────────────────────────
    const handleCopyHTML = () => {
        navigator.clipboard.writeText(content);
        setStatus('📋 HTML copiado al portapapeles.');
        setTimeout(() => setStatus(''), 2000);
    };

    // ── Export: Download HTML ────────────────────────────────
    const handleDownloadHTML = () => {
        const blob = new Blob([`<!DOCTYPE html><html><body>${content}</body></html>`], { type: 'text/html' });
        downloadBlob(blob, `${strategySlug || 'articulo'}.html`);
    };

    // ── Export: Google Docs ──────────────────────────────────
    const handleExportDocs = async () => {
        if (!content) return;
        setExporting(true);
        setStatus('Exportando a Google Docs…');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('No hay sesión activa');
            const { exportToGoogleDoc } = await import('@/components/tools/writer/services');
            const url = await exportToGoogleDoc(strategyH1 || keyword || 'Artículo', content, token);
            window.open(url, '_blank');
            setStatus('✅ Exportado a Google Docs.');
        } catch (e: any) {
            console.error(e);
            setStatus('❌ Error: ' + e.message);
        } finally {
            setExporting(false);
        }
    };

    // ── Save Draft to Supabase or Local ──────────────────────
    const handleSaveCloud = async () => {
        if (!hasContentAccess) return alert('No tienes permisos para guardar contenido.');
        
        if (!user || !activeProject) {
            // Save to local storage for anonymous/project-less users
            if (!content && !strategyH1) return alert('Nada que guardar.');
            setStatus('Guardando borrador localmente…');
            try {
                const localDrafts = JSON.parse(localStorage.getItem('nous_local_drafts') || '[]');
                const newDraft = {
                    id: Date.now().toString(),
                    title: strategyH1 || keyword || 'Borrador sin título',
                    html_content: content,
                    strategy_data: {
                        projectName, keyword, detectedNiche, strategyOutline, strategyTone,
                        strategyLSI, strategyLongTail, strategyQuestions, creativityLevel, metadata,
                    },
                    updated_at: new Date().toISOString()
                };
                localDrafts.unshift(newDraft);
                localStorage.setItem('nous_local_drafts', JSON.stringify(localDrafts));
                setStatus('✅ Borrador guardado en tu historial local.');
            } catch (e: any) {
                setStatus('❌ Error al guardar localmente: ' + e.message);
            }
            return;
        }

        if (!content && !strategyH1) return alert('Nada que guardar.');
        setStatus('Guardando borrador en la nube…');
        try {
            const draftData = {
                user_id: user.id,
                title: strategyH1 || keyword || 'Sin título',
                html_content: content,
                strategy_data: {
                    projectName, keyword, detectedNiche, strategyOutline, strategyTone,
                    strategyLSI, strategyLongTail, strategyQuestions, creativityLevel, metadata,
                },
                updated_at: new Date().toISOString(),
            };
            const { data, error } = draftId
                ? await supabase.from('content_drafts').update(draftData).eq('id', draftId).select()
                : await supabase.from('content_drafts').insert([draftData]).select();
            if (error) throw error;
            if (data?.[0]) setDraftId(data[0].id);
            setStatus('✅ Borrador guardado en la nube.');
        } catch (e: any) {
            setStatus('❌ Error al guardar: ' + e.message);
        }
    };

    if (!isSidebarOpen) return null;

    const isAnyLoading = isGenerating || isAnalyzingSEO || isPlanningStructure || isHumanizing || isExporting || isRefining;

    const tabs = [
        { id: 'generate', label: 'Generar', icon: Zap },
        { id: 'assistant', label: 'Asistente', icon: Bot },
        { id: 'seo', label: 'SEO', icon: Search },
        { id: 'research', label: 'Estrategia', icon: Sparkles },
        { id: 'history', label: 'Historial', icon: FileOutput },
        { id: 'export', label: 'Exportar', icon: Download },
    ] as const;

    return (
        <aside className="w-80 glass-panel border-hairline h-full flex flex-col z-20 shrink-0">

            {/* ── Header ── */}
            <div className="flex items-center justify-between p-4 border-b border-hairline">
                <span className="font-light tracking-elegant text-slate-700 text-sm uppercase">Herramientas</span>
                <button
                    onClick={toggleSidebar}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Connection Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isLocalConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                    {isLocalConnected ? 'Nodo Local Activo' : 'Nube (Gemini API)'}
                </span>
            </div>

            {/* BEAUTIFUL NODE PROGRESS BAR */}
            {downloadProgress !== null && (
                <div className="bg-slate-900 p-4 border-b border-indigo-900 shadow-inner relative overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-500/10 opacity-50" />
                    
                    <div className="relative flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest flex items-center gap-2 flex-1 truncate">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            PREPARANDO NODO LOCAL
                        </span>
                        <span className="text-[11px] font-black text-white shrink-0 tabular-nums">
                            {(downloadProgress || 0).toFixed(1)}%
                        </span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner border border-slate-700/50 relative">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(52,211,153,0.8)] relative" 
                            style={{ width: `${downloadProgress}%` }} 
                        />
                    </div>
                    
                    <p className="text-[10px] text-slate-400 mt-2 truncate font-medium flex items-center gap-1.5 italic">
                        <Loader2 size={10} className="animate-spin text-emerald-400" />
                        {statusMessage.replace('[Nodo Local] ', '')}
                    </p>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex border-b border-slate-200 bg-slate-50/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSidebarTab(tab.id)}
                        className={cn(
                            'flex-1 py-3 flex justify-center items-center text-slate-400 hover:text-slate-600 hover:bg-white/40 transition-all border-b-2 border-transparent',
                            activeSidebarTab === tab.id && 'bg-[var(--color-nous-lavender)]/20 text-slate-800 border-[var(--color-nous-lavender)] font-medium'
                        )}
                        title={tab.label}
                    >
                        <tab.icon size={16} />
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">

                {/* Global Status Badge */}
                <StatusBadge message={statusMessage} isLoading={isAnyLoading} />

                {/* TAB: GENERAR */}
                {activeSidebarTab === 'generate' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Keyword & Project */}
                        <div className="space-y-3">
                            <SectionLabel>Configuración</SectionLabel>
                            <div>
                                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Keyword Objetivo</label>
                                <input
                                    type="text"
                                    placeholder="Ej: zapatos de running mujer"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Proyecto</label>
                                <input
                                    type="text"
                                    placeholder="Nombre del proyecto/web"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-700"
                                />
                            </div>
                        </div>

                        {/* CSV Upload */}
                        <div className="space-y-2">
                            <SectionLabel>Sitemap / CSV de Páginas</SectionLabel>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                            >
                                <Upload size={16} className="text-slate-400" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-600">{csvFileName || 'Subir sitemap.csv'}</p>
                                    <p className="text-[10px] text-slate-400">{csvData.length > 0 ? `${csvData.length} páginas cargadas` : 'Para interlinking automático'}</p>
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
                        </div>

                        {/* Pipeline Steps */}
                        <div className="space-y-4 relative">
                            <SectionLabel>Pipeline de Generación</SectionLabel>
                            
                            {/* Vertical Connector Line */}
                            <div className="absolute left-[23px] top-[40px] bottom-[20px] w-0.5 bg-slate-100 -z-0" />

                            <button
                                onClick={handleSEO}
                                disabled={isAnyLoading || !keyword.trim()}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 bg-white border rounded-xl hover:shadow-md transition-all disabled:opacity-50 text-left group relative z-10",
                                    rawSeoData ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:border-blue-300"
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors",
                                    rawSeoData ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"
                                )}>
                                    {rawSeoData ? <Check size={12} /> : "1"}
                                </div>
                                <div>
                                    <p className={cn("text-xs font-bold", rawSeoData ? "text-emerald-800" : "text-slate-800")}>Analizar SERP & Keywords</p>
                                    <p className="text-[10px] text-slate-500">{rawSeoData ? '✅ Análisis disponible' : 'Competitors, LSI, PAA'}</p>
                                </div>
                                {isAnalyzingSEO
                                    ? <Loader2 size={14} className="ml-auto text-blue-600 animate-spin" />
                                    : <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />}
                            </button>

                            <button
                                onClick={handlePlanStructure}
                                disabled={isAnyLoading || !rawSeoData}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 bg-white border rounded-xl hover:shadow-md transition-all disabled:opacity-50 text-left group relative z-10",
                                    strategyOutline.length > 0 ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:border-purple-300",
                                    !rawSeoData && "grayscale opacity-60"
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors",
                                    strategyOutline.length > 0 ? "bg-emerald-500 text-white" : "bg-purple-500 text-white"
                                )}>
                                    {strategyOutline.length > 0 ? <Check size={12} /> : "2"}
                                </div>
                                <div>
                                    <p className={cn("text-xs font-bold", strategyOutline.length > 0 ? "text-emerald-800" : "text-slate-800")}>Planificar Estructura</p>
                                    <p className="text-[10px] text-slate-500">{strategyOutline.length > 0 ? `✅ ${strategyOutline.length} secciones` : 'H1, Meta, Outline con IA'}</p>
                                </div>
                                {isPlanningStructure
                                    ? <Loader2 size={14} className="ml-auto text-purple-600 animate-spin" />
                                    : <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />}
                            </button>

                            <button
                                onClick={handleGenerate}
                                disabled={isAnyLoading || strategyOutline.length === 0}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 bg-white border rounded-xl hover:shadow-md transition-all disabled:opacity-50 text-left group relative z-10",
                                    content.length > 1000 ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:border-emerald-400",
                                    strategyOutline.length === 0 && "grayscale opacity-60"
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-colors",
                                    content.length > 1000 ? "bg-emerald-500 text-white" : "bg-emerald-500 text-white"
                                )}>
                                    {content.length > 1000 ? <Check size={12} /> : "3"}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Generar Artículo</p>
                                    <p className="text-[10px] text-slate-500">Streaming con Gemini + interlinking</p>
                                </div>
                                {isGenerating
                                    ? <Loader2 size={14} className="ml-auto text-emerald-600 animate-spin" />
                                    : <Zap size={14} className="ml-auto text-emerald-400 group-hover:scale-110 transition-transform" />}
                            </button>
                        </div>

                        <details className="group">
                            <summary className="cursor-pointer text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 list-none select-none">
                                <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                                Opciones Avanzadas
                            </summary>
                            <div className="mt-3 space-y-3 pl-3 border-l-2 border-slate-100">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Tono</label>
                                    <input type="text" value={strategyTone} onChange={(e) => setStrategyTone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700" placeholder="Profesional" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Modelo</label>
                                    <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                        <option value="gemma-3-4b-it">Local (Gemma 3 4B)</option>
                                    </select>
                                </div>
                                <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-orange-700 uppercase tracking-wider">Modo Estricto SEO</label>
                                        <button onClick={() => setIsStrictMode(!isStrictMode)} className={cn('w-10 h-5 rounded-full transition-all', isStrictMode ? 'bg-orange-500' : 'bg-slate-200')}>
                                            <div className={cn('w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5', isStrictMode ? 'translate-x-5' : 'translate-x-0')} />
                                        </button>
                                    </div>
                                    {isStrictMode && (
                                        <input type="range" min={10} max={100} step={10} value={strictFrequency} onChange={(e) => setStrictFrequency(parseInt(e.target.value))} className="w-full accent-orange-500" />
                                    )}
                                </div>
                            </div>
                        </details>
                    </div>
                )}




                {activeSidebarTab === 'assistant' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-[var(--color-nous-lavender)]/30 p-4 rounded-xl border border-hairline">
                            <h3 className="font-light tracking-elegant uppercase text-slate-800 text-xs mb-2 flex items-center gap-2">
                                <Bot size={14} className="text-purple-400" /> AI Copilot
                            </h3>
                            <p className="text-[10px] font-light tracking-wide text-slate-600 italic">
                                {humanizerStatus || statusMessage || 'Listo para ayudarte.'}
                            </p>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-pink-500 uppercase tracking-wider">Humanizador</label>
                                <span className="text-[10px] font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">{humanizerConfig.intensity}%</span>
                            </div>
                            <div className="bg-pink-50/50 p-3 rounded-lg border border-pink-100 space-y-3">
                                <input type="range" min="0" max="100" value={humanizerConfig.intensity} onChange={(e) => updateHumanizerConfig({ intensity: parseInt(e.target.value) })} className="w-full h-1.5 accent-pink-600" />
                                <Button variant="primary" className="w-full gap-2 h-9 text-xs bg-pink-600 hover:bg-pink-700 text-white border-none" onClick={handleHumanize} disabled={isAnyLoading}>
                                    {isHumanizing ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                    {isHumanizing ? 'Humanizando...' : 'Humanizar Texto'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Refinamiento Rápido</label>
                            <textarea value={refinementInstructions} onChange={(e) => setRefinementInstructions(e.target.value)} rows={3} placeholder="Instrucciones..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" />
                            <Button variant="secondary" className="w-full text-xs" onClick={handleRefine} disabled={isAnyLoading || !refinementInstructions}>Refinar con IA</Button>
                        </div>
                    </div>
                )}

                {/* TAB: SEO */}
                {activeSidebarTab === 'seo' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {rawSeoData ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Dificultad</p>
                                    <p className="text-lg font-bold text-indigo-900">{rawSeoData.keywordDifficulty || 'N/A'}</p>
                                </div>
                                <div className="space-y-2">
                                    <SectionLabel>LSI Keywords</SectionLabel>
                                    <div className="flex flex-wrap gap-1">
                                        {rawSeoData.lsiKeywords?.map((k: any, i: number) => (
                                            <span key={i} className={cn("px-2 py-1 rounded text-[10px] border", content.toLowerCase().includes(k.keyword.toLowerCase()) ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-white text-slate-400 border-slate-100")}>{k.keyword}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <SectionLabel>Preguntas (PAA)</SectionLabel>
                                    <div className="space-y-1">
                                        {rawSeoData.frequentQuestions?.map((q: string, i: number) => (
                                            <div key={i} className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-600">{q}</div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <Button variant="primary" className="w-full gap-2 h-10 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handlePlanStructure} disabled={isAnyLoading}>
                                        {isPlanningStructure ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
                                        Generar Estrategia Completa
                                        <ArrowRight size={14} className="ml-auto" />
                                    </Button>
                                    <p className="text-[9px] text-slate-400 text-center mt-2">Siguiente paso: Diseñar estructura y metadatos.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Search size={32} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-xs text-slate-400 mb-4">No hay datos de SEO todavía.</p>
                                <Button variant="secondary" size="sm" onClick={() => setSidebarTab('generate')}>Ir a Configuración</Button>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: ESTRATEGIA */}
                {activeSidebarTab === 'research' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg relative overflow-hidden">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">H1 Generado</span>
                                <input value={strategyH1} onChange={(e) => setStrategyH1(e.target.value)} className="w-full bg-transparent border-none p-0 text-sm font-bold italic focus:ring-0 text-white" />
                            </div>
                            <div className="space-y-2">
                                <SectionLabel>Outline</SectionLabel>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {strategyOutline.map((s, i) => (
                                        <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl group relative">
                                            <div className="flex items-center gap-2 mb-1">
                                                <input value={s.text} onChange={(e) => { const n = [...strategyOutline]; n[i].text = e.target.value; setStrategyOutline(n); }} className="text-xs font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full" />
                                            </div>
                                            <textarea value={s.notes || ''} onChange={(e) => { const n = [...strategyOutline]; n[i].notes = e.target.value; setStrategyOutline(n); }} className="w-full bg-transparent border-none p-0 text-[10px] text-slate-500 italic focus:ring-0 resize-none h-10" placeholder="Notas..." />
                                            <button onClick={() => setStrategyOutline(strategyOutline.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash size={12} /></button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" className="w-full border-dashed text-[10px]" onClick={() => setStrategyOutline([...strategyOutline, { type: 'H2', text: 'Nueva Sección', wordCount: '200' }])}>Añadir Sección</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <SectionLabel>Enlaces Internos</SectionLabel>
                                <div className="space-y-1">
                                    {strategyLinks.slice(0, 10).map((l, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg group">
                                            <span className="text-[10px] text-emerald-800 font-medium truncate">{l.title}</span>
                                            <button onClick={() => setStrategyLinks(strategyLinks.filter((_, idx) => idx !== i))} className="text-emerald-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <Button variant="primary" className="w-full gap-2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleGenerate} disabled={isAnyLoading}>
                                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                    Redactar Artículo Completo
                                    <ArrowRight size={14} className="ml-auto" />
                                </Button>
                                <p className="text-[9px] text-slate-400 text-center mt-2">Paso final: Escribir el artículo basado en esta estrategia.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: HISTORIAL */}
                {activeSidebarTab === 'history' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <SectionLabel>Historial Local</SectionLabel>
                        <p className="text-[10px] text-slate-500 mb-4">
                            Los contenidos generados sin un proyecto activo se guardan temporalmente en tu navegador.
                        </p>
                        
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {(() => {
                                const localDrafts = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('nous_local_drafts') || '[]' : '[]');
                                if (localDrafts.length === 0) {
                                    return <div className="text-center py-8 text-xs text-slate-400">No hay borradores locales.</div>;
                                }
                                return localDrafts.map((draft: any) => (
                                    <div key={draft.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors cursor-pointer group" onClick={() => {
                                        if(confirm('¿Cargar este borrador? Se sobreescribirá el contenido actual del editor.')) {
                                            setContent(draft.html_content);
                                            setStrategyH1(draft.title);
                                            setStatus('✅ Borrador local cargado.');
                                        }
                                    }}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{draft.title}</h4>
                                            <span className="text-[9px] text-slate-400 shrink-0">{new Date(draft.updated_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 line-clamp-2">{(draft.html_content || '').replace(/<[^>]*>?/gm, '')}</p>
                                        <div className="mt-2 text-right">
                                            <button 
                                                className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if(confirm('¿Eliminar este borrador local?')) {
                                                        const freshList = JSON.parse(localStorage.getItem('nous_local_drafts') || '[]');
                                                        const updated = freshList.filter((d: any) => d.id !== draft.id);
                                                        localStorage.setItem('nous_local_drafts', JSON.stringify(updated));
                                                        setStatus('🗑️ Borrador local eliminado.');
                                                    }
                                                }}
                                            >Eliminar</button>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )}

                {/* TAB: EXPORTAR */}
                {activeSidebarTab === 'export' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Button variant="primary" className="w-full justify-center gap-2 h-10 bg-indigo-600 text-white" onClick={handleSaveCloud}><Save size={16} /> Guardar Borrador</Button>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={handleCopyHTML} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 flex flex-col items-center gap-2 group">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Code size={18} /></div>
                                <span className="text-[10px] font-bold text-slate-700">Copiar HTML</span>
                            </button>
                            <button onClick={handleExportDocs} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-500 flex flex-col items-center gap-2 group">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-700 group-hover:bg-blue-500 group-hover:text-white transition-colors"><FileText size={18} /></div>
                                <span className="text-[10px] font-bold text-slate-700">Google Docs</span>
                            </button>
                            <button onClick={handleExportWP} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-600 flex flex-col items-center gap-2 group">
                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-800 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Zap size={18} /></div>
                                <span className="text-[10px] font-bold text-slate-700">Publicar WP</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <BriefingModal
                isOpen={isBriefingModalOpen}
                onClose={() => setIsBriefingModalOpen(false)}
                keyword={keyword}
                country="ES"
                onBriefSave={(briefContent) => {
                    setStrategyNotes(briefContent);
                    setStatus("✅ Briefing neural guardado.");
                    setSidebarTab('research');
                }}
            />
        </aside>
    );
}
