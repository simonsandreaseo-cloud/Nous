
'use client';
import { useRef, useState, useMemo, useCallback, useEffect } from 'react';

import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import WriterEditor from '@/components/contents/writer/WriterEditor';
import WriterDashboard from '@/components/contents/writer/WriterDashboard';
import WriterSetupBoard from '@/components/contents/writer/WriterSetupBoard';
import { 
    LayoutTemplate, 
    ChevronLeft, 
    LayoutDashboard, 
    Settings2, 
    PenTool, 
    Send, 
    ImagePlus, 
    Wrench, 
    Image as ImageIcon, 
    Sparkles, 
    Trash2, 
    Download, 
    RefreshCcw,
    Maximize2,
    Search,
    Layout,
    FileText,
    Zap,
    Languages,
    ChevronRight,
    Cloud,
    CloudOff,
    Loader2
} from 'lucide-react';
import ImageLightbox from './modals/ImageLightbox';

import { Button } from '@/components/dom/Button';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import CompetitorCard from './CompetitorCard';
import OutlineSidebar from './OutlineSidebar';

const SEODataTab = dynamic(() => import('./SEODataTab'), { loading: () => <div className="p-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Cargando...</div> });
const FloatingOutlineUI = dynamic(() => import('./widgets/FloatingOutlineUI'));
import { CompetitorPanel } from './CompetitorPanel';
const MediaTab = dynamic(() => import('./MediaTab').then(mod => mod.MediaTab), { loading: () => <div className="p-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Cargando...</div> });
const ToolsTab = dynamic(() => import('./ToolsTab').then(mod => mod.ToolsTab), { loading: () => <div className="p-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Cargando...</div> });
const TranslationSidebarPanel = dynamic(() => import('./TranslationSidebarPanel'), { loading: () => <div className="p-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Cargando...</div> });
import PresenceAvatars from './PresenceAvatars';
import { InventorySidebar } from './sidebars/InventorySidebar';
import { FloatingToolbox } from './widgets/FloatingToolbox';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import NousOrb from '@/components/dashboard/NousOrb';
import { useWriterActions } from './useWriterActions';
import { deleteImageAction, uploadGeneratedImage } from '@/lib/actions/imageActions';
import { saveAs } from 'file-saver';
import { PollinationsService } from '@/lib/services/pollinationsService';
import { NousLogo } from '@/components/dom/NousLogo';

const StepIcon = ({ active, done, icon: Icon, label }: { active: boolean, done: boolean, icon: any, label: string }) => (
    <div className={cn(
        "flex items-center gap-1.5 transition-all",
        active ? "text-indigo-600" : done ? "text-emerald-500" : "text-slate-300 opacity-50 grayscale"
    )}>
        <Icon size={12} className={cn(active && "animate-pulse")} />
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </div>
);
export const FeaturedImageSlot = ({ taskId, onFullscreen }: { taskId: string | null, onFullscreen?: (img: any) => void }) => {
    const { taskImages, loadTaskImages, keyword, strategyH1 } = useWriterStore();
    const featured = taskImages.find((img: any) => img.type === 'featured');
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Hide component completely if no featured image exists OR it doesn't have a URL yet
    if (!taskId || !featured || !featured.url) return null;


    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!featured) return;
        saveAs(featured.url, `${featured.title || 'portada'}.jpg`);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!featured) return;
        if (window.confirm("¿Eliminar portada permanentemente?")) {
            await deleteImageAction(featured.id, featured.storage_path);
            await loadTaskImages(taskId);
        }
    };

    const handleRegenerate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!featured || isRegenerating) return;
        setIsRegenerating(true);
        try {
            const prompt = featured.prompt || strategyH1 || keyword || "Imagen de portada profesional";
            const newUrl = PollinationsService.generateImageUrl(prompt, {
                model: 'grok-imagine-pro',
                width: 1280,
                height: 720,
                seed: Math.floor(Math.random() * 1000000)
            });
            
            const res = await uploadGeneratedImage({
                url: newUrl,
                taskId: taskId,
                imageId: featured.id,
                prompt: prompt,
                altText: featured.alt_text || "Portada",
                title: featured.title || "Portada",
                type: 'featured'
            });

            if (res.success) {
                await loadTaskImages(taskId);
            }
        } catch (err) {
            console.error("Failed to regenerate portada", err);
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <div className="mb-8 group/featured relative animate-in fade-in slide-in-from-top-4 duration-700">
            <div className={cn(
                "relative w-full aspect-[21/9] overflow-hidden rounded-[2.5rem] bg-slate-50 border border-slate-200/50 shadow-2xl transition-all duration-500",
                "border-solid border-slate-100 shadow-indigo-500/5"
            )}>
                {/* FLOATING LABEL */}
                <div className="absolute top-6 left-6 z-20 px-4 py-1.5 bg-black/80 backdrop-blur-md text-white border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                    Portada Magistral
                </div>

                <img 
                    src={featured.url} 
                    alt={featured.alt_text} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover/featured:scale-105"
                />
                
                {/* PREMIUM OVERLAY ACTIONS */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/featured:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px] z-10">
                    <button 
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        className={cn(
                            "p-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-xl scale-90 group-hover/featured:scale-100",
                            isRegenerating && "animate-spin"
                        )}
                        title="Regenerar Portada"
                    >
                        <RefreshCcw size={20} />
                    </button>
                    {onFullscreen && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onFullscreen(featured); }}
                            className="p-4 rounded-2xl bg-white text-slate-900 hover:bg-indigo-50 transition-all shadow-xl scale-90 group-hover/featured:scale-100"
                            title="Ver Pantalla Completa"
                        >
                            <Maximize2 size={20} />
                        </button>
                    )}
                    <button 
                        onClick={handleDownload}
                        className="p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all shadow-xl scale-90 group-hover/featured:scale-100"
                        title="Descargar Portada"
                    >
                        <Download size={20} />
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="p-4 rounded-2xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-xl scale-90 group-hover/featured:scale-100"
                        title="Eliminar Permanente"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                {/* PROMPT INFO PILL (BOTTOM) */}
                <div className="absolute bottom-6 left-6 right-6 z-10 pointer-events-none opacity-0 group-hover/featured:opacity-100 transition-opacity">
                    <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 max-w-2xl">
                        <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-1">Prompt de Generación</p>
                        <p className="text-[12px] text-white/90 font-medium line-clamp-1 italic">{featured.prompt}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


const EMPTY_ARRAY: any[] = [];

export default function WriterStudio() {
    const {
        isSidebarOpen, toggleSidebar, isSaving, lastSaved,
        keyword, strategyH1, draftId, viewMode, setViewMode, rawSeoData,
        editorTab, setEditorTab, content, activeUsers, setActiveUsers,
        strategyOutline, strategyTitle, strategySlug, strategyDesc, strategyExcerpt, strategyLinks,
        strategyNotes, setIsRemoteUpdate, setStatus, setSaving, isGenerating,
        isAnalyzingSEO, isPlanningStructure, isHumanizing, isRefining, nousExtractorFindings,
        wordCountReal, activeSidebarTab, setSidebarTab,
        currentLanguage, contentVersions, switchLanguage,
        projectId, csvData, loadProjectInventory, loadContentById,
        redactorUI, setRedactorUI, leftSidebarWidth, setLeftSidebarWidth, 
        rightSidebarWidth, setRightSidebarWidth, isToolboxOpen, toggleToolbox
    } = useWriterStore(useShallow(state => ({
        isSidebarOpen: state.isSidebarOpen,
        toggleSidebar: state.toggleSidebar,
        isSaving: state.isSaving,
        lastSaved: state.lastSaved,
        keyword: state.keyword,
        strategyH1: state.strategyH1,
        draftId: state.draftId,
        viewMode: state.viewMode,
        setViewMode: state.setViewMode,
        rawSeoData: state.rawSeoData,
        editorTab: state.editorTab,
        setEditorTab: state.setEditorTab,
        content: state.content,
        activeUsers: state.activeUsers,
        setActiveUsers: state.setActiveUsers,
        strategyOutline: state.strategyOutline,
        strategyTitle: state.strategyTitle,
        strategySlug: state.strategySlug,
        strategyDesc: state.strategyDesc,
        strategyExcerpt: state.strategyExcerpt,
        strategyLinks: state.strategyLinks,
        strategyNotes: state.strategyNotes,
        setIsRemoteUpdate: state.setIsRemoteUpdate,
        setStatus: state.setStatus,
        setSaving: state.setSaving,
        isGenerating: state.isGenerating,
        isAnalyzingSEO: state.isAnalyzingSEO,
        isPlanningStructure: state.isPlanningStructure,
        isHumanizing: state.isHumanizing,
        isRefining: state.isRefining,
        nousExtractorFindings: state.nousExtractorFindings,
        wordCountReal: state.wordCountReal,
        activeSidebarTab: state.activeSidebarTab,
        setSidebarTab: state.setSidebarTab,
        currentLanguage: state.currentLanguage,
        contentVersions: state.contentVersions,
        switchLanguage: state.switchLanguage,
        projectId: state.projectId,
        csvData: state.csvData,
        loadProjectInventory: state.loadProjectInventory,
        loadContentById: state.loadContentById,
        
        // Dual Mode States
        redactorUI: state.redactorUI,
        setRedactorUI: state.setRedactorUI,
        leftSidebarWidth: state.leftSidebarWidth,
        setLeftSidebarWidth: state.setLeftSidebarWidth,
        rightSidebarWidth: state.rightSidebarWidth,
        setRightSidebarWidth: state.setRightSidebarWidth,
        isToolboxOpen: state.isToolboxOpen,
        toggleToolbox: state.toggleToolbox,
        deleteVersion: state.deleteVersion,
        parentTaskId: state.parentTaskId,
        statusMessage: state.statusMessage,
        hasGenerated: state.hasGenerated
    })));

    const { tasks, isLoading: isProjectLoading, activeProject } = useProjectStore(useShallow(state => ({
        tasks: state.tasks,
        isLoading: state.isLoading,
        activeProject: state.activeProject
    })));

    const targetLanguages = useMemo(() => 
        activeProject?.settings?.content_preferences?.default_translator_languages || EMPTY_ARRAY
    , [activeProject]);

    const isPostProd = isGenerating && (
        statusMessage.toLowerCase().includes('vínculos') || 
        statusMessage.toLowerCase().includes('optimizando') || 
        statusMessage.toLowerCase().includes('interlinking') ||
        statusMessage.toLowerCase().includes('estilos')
    );
    const isDrafting = isGenerating && !isPostProd;

    // --- Language Gallery Logic ---
    const galleryRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = useCallback(() => {
        if (galleryRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = galleryRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(checkScroll, 100);
        return () => clearTimeout(timer);
    }, [checkScroll, contentVersions, targetLanguages, currentLanguage]);

    const handleGalleryScroll = (direction: 'left' | 'right') => {
        if (galleryRef.current) {
            const scrollAmount = 150;
            galleryRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    
    // --- Presence Grace Period Implementation ---
    const presenceBuffer = useRef<Record<string, { user: any, lastSeen: number }>>({});
    const { 
        handleSEO, 
        handleGenerate, 
        handleHumanize, 
        handleRefine 
    } = useWriterActions();
    

    const isProcessingAny = isGenerating || isAnalyzingSEO || isPlanningStructure || isHumanizing || isRefining;

    const hasAccess = true; // Simplified access check for now or import it
    const { user: localUser } = useAuthStore();

    // --- Presence & Visibility Implementation ---
    const userColor = useMemo(() => {
        if (!localUser) return '#6366f1';
        const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
        const charCodeSum = localUser.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[charCodeSum % colors.length];
    }, [localUser]);

    const trackPresence = useCallback(async (channel: any) => {
        if (!localUser) return;
        await channel.track({
            name: localUser.user_metadata?.full_name || localUser.email,
            photo: localUser.user_metadata?.avatar_url || '',
            color: userColor,
            online_at: new Date().toISOString(),
        });
    }, [localUser, userColor]);

    useEffect(() => {
        if (!draftId || !localUser) return;

        const channel = supabase.channel(`writer_presence:${draftId}`, {
            config: {
                presence: {
                    key: localUser.id,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const now = Date.now();
                
                // 1. Update/Add current users to buffer
                Object.entries(state).forEach(([id, presenceArray]: [string, any]) => {
                    const info = presenceArray[0];
                    if (info) {
                        presenceBuffer.current[id] = {
                            lastSeen: now,
                            user: {
                                name: info.name || 'Editor Anónimo',
                                photo: info.photo || '',
                                color: info.color || '#cbd5e1',
                            }
                        };
                    }
                });

                // 2. Derive visible users (current + buffer within 60s)
                const visibleUsers: any = {};
                Object.entries(presenceBuffer.current).forEach(([id, data]) => {
                    if (now - data.lastSeen < 60000) {
                        visibleUsers[id] = data.user;
                    }
                });
                
                // 3. Only update store if users actually changed to avoid flickering
                const currentUsersJson = JSON.stringify(useWriterStore.getState().activeUsers);
                const nextUsersJson = JSON.stringify(visibleUsers);
                if (currentUsersJson !== nextUsersJson) {
                    setActiveUsers(visibleUsers);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await trackPresence(channel);
                }
            });

        // 4. Periodical cleanup interval for the buffer (every 10s)
        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            let hasChanges = false;
            const nextVisibleUsers: any = {};

            Object.entries(presenceBuffer.current).forEach(([id, data]) => {
                if (now - data.lastSeen < 60000) {
                    nextVisibleUsers[id] = data.user;
                } else {
                    delete presenceBuffer.current[id];
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                setActiveUsers(nextVisibleUsers);
            }
        }, 10000);

        // Background sustain: Re-track when window gains focus to avoid inactivity drops
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                trackPresence(channel);
            }
        };
        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleVisibilityChange);
            clearInterval(cleanupInterval);
            channel.unsubscribe();
        };
    }, [draftId, localUser, setActiveUsers, trackPresence]);

    // --- Content Sync Implementation (Optimized: No constant resubscriptions) ---
    useEffect(() => {
        if (!draftId) return;

        const contentChannel = supabase
            .channel(`content_sync:${draftId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'tasks',
                filter: `id=eq.${draftId}`
            }, (payload) => {
                const newContent = payload.new.content_body;
                const currentContentInStore = useWriterStore.getState().content;
                
                // Only sync if content actually changed in the DB and it's different from our current state
                if (newContent !== undefined && newContent !== currentContentInStore) {
                    setIsRemoteUpdate(true);
                    useWriterStore.getState().setContent(newContent);
                    setStatus('Actualización remota recibida');
                    setTimeout(() => setStatus(''), 2000);
                }
            })
            .subscribe();

        return () => {
            contentChannel.unsubscribe();
        };
    }, [draftId, setIsRemoteUpdate, setStatus]);

    // --- AUTO-SAVE IMPLEMENTATION ---
    const { updateTask } = useProjectStore();

    useEffect(() => {
        if (!draftId || isGenerating || !hasAccess) return;

        // Set UI to saving mode immediately if not already saving
        if (!isSaving) setSaving(true);

        const timer = setTimeout(async () => {
            const latestState = useWriterStore.getState() as any;
            
            // GUARD: Check if the ID has changed or component is no longer focused on this draft
            if (latestState.draftId !== draftId) {
                console.log('[AutoSave] Blocked: Draft changed from', draftId, 'to', latestState.draftId);
                return;
            }

            const payload = {
                content_body: latestState.content,
                word_count_real: latestState.wordCountReal,
                h1: latestState.strategyH1,
                seo_title: latestState.strategyTitle,
                target_url_slug: latestState.strategySlug,
                meta_description: latestState.strategyDesc,
                excerpt: latestState.strategyExcerpt,
                research_dossier: {
                    ...latestState.rawSeoData,
                    briefing: latestState.strategyNotes,
                    suggested_links: latestState.strategyLinks,
                    nous_extractor_findings: latestState.nousExtractorFindings
                },
                outline_structure: { headers: latestState.strategyOutline },
            };

            // PROTECTION: Never auto-save if content is empty but it's a known non-empty draft
            if (!payload.content_body && draftId) {
                console.warn('[AutoSave] Blocked: Content is empty, skipping to prevent accidental data loss.');
                setSaving(false);
                return;
            }

            try {
                // Using updateTask from projectStore to sync local state and DB atomically
                await updateTask(draftId, payload);
            } catch (e: any) {
                console.error('[AutoSave] Error full:', e);
                const errorMsg = e.message || 'Error desconocido';
                setStatus('❌ Error al guardar: ' + errorMsg);
            } finally {
                if (isSaving) setSaving(false);
            }
        }, 3000); // 3 second debounce

        return () => {
            clearTimeout(timer);
        };
    }, [
        draftId, content, strategyH1, strategyTitle, strategySlug, strategyDesc, 
        strategyOutline, rawSeoData, strategyLinks, strategyNotes, nousExtractorFindings,
        isGenerating, setSaving, setStatus, hasAccess, wordCountReal, updateTask
    ]);

    // --- Data Bootstrapping (Inventory/Links) ---
    useEffect(() => {
        if (projectId && (!csvData || csvData.length === 0)) {
            loadProjectInventory(projectId);
        }
    }, [projectId, csvData?.length, loadProjectInventory]);

    // --- Auto-skip Dashboard for Standard Mode ---
    useEffect(() => {
        if (redactorUI === 'standard' && viewMode === 'dashboard') {
            setViewMode('workspace');
        }
    }, [redactorUI, viewMode, setViewMode]);

    const [isResizingRight, setIsResizingRight] = useState(false);
    
    const handleRightResizeDown = (e: React.MouseEvent) => {
        setIsResizingRight(true);
        e.preventDefault();
    };

    const handleRightResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizingRight) return;
        const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
        if (newWidth > 15 && newWidth < 45) {
            setRightSidebarWidth(newWidth);
        }
    }, [isResizingRight, setRightSidebarWidth]);

    const handleRightResizeUp = useCallback(() => {
        setIsResizingRight(false);
    }, []);

    useEffect(() => {
        if (isResizingRight) {
            window.addEventListener('mousemove', handleRightResizeMove);
            window.addEventListener('mouseup', handleRightResizeUp);
        } else {
            window.removeEventListener('mousemove', handleRightResizeMove);
            window.removeEventListener('mouseup', handleRightResizeUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleRightResizeMove);
            window.removeEventListener('mouseup', handleRightResizeUp);
        };
    }, [isResizingRight, handleRightResizeMove, handleRightResizeUp]);

    const containerRef = useRef<HTMLDivElement>(null);

    // common internal views (Dashboard, Setup, Workspace)
    const renderContent = () => {
        // --- STANDARD MODE: Always Workspace (unless in Setup) ---
        if (redactorUI === 'standard') {
            if (viewMode === 'setup') return <WriterSetupBoard />;
            
            return (
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT: Inventory Sidebar (Now below header) */}
                    <InventorySidebar />

                    {/* CENTER: Editor */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-200/50" ref={containerRef}>
                        <div className="mx-auto min-h-full transition-all duration-500 p-4 md:p-6">
                            <div className="relative bg-white shadow-2xl min-h-screen max-w-4xl mx-auto rounded-sm p-6 md:p-10 ring-1 ring-slate-200">
                                <FloatingOutlineUI />
                                <WriterEditor key={draftId || 'standard'} />
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // --- ZEN MODE: Multi-view (Dashboard, Setup, Workspace) ---
        if (viewMode === 'dashboard') return <WriterDashboard />;
        if (viewMode === 'setup') return <WriterSetupBoard />;
        
        return (
            <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-200/50" ref={containerRef}>
                {/* Zen Editor (Centered, max-width) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex justify-center relative">
                    <div className="w-full max-w-4xl px-4 py-6">
                        <div className="relative bg-white shadow-2xl min-h-screen rounded-sm p-6 md:p-10 ring-1 ring-slate-200">
                            <FloatingOutlineUI />
                            <WriterEditor key={draftId || 'zen'} />
                        </div>
                    </div>
                </div>
                
                {/* Floating Toolbox for Zen Mode */}
                <FloatingToolbox />
            </div>
        );
    }


    // ── ROOT RENDER (Unified Header for Presence) ──────────────────────────────────────
    return (
        <div className="flex w-full h-full bg-white overflow-hidden">
            <main className="flex-1 flex flex-col min-w-0 bg-white relative">
                {/* 1. PRIMARY HEADER (Article Metadata & Presence) */}
                <header className="h-14 flex items-center justify-between px-6 md:px-10 bg-white/10 backdrop-blur-xl z-50 sticky top-0 shrink-0 select-none border-b border-slate-200/20 gap-4">
                    <div className="flex items-center gap-6 min-w-0">
                        {redactorUI === 'zen' && (
                            <>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setViewMode('dashboard')}
                                    className="h-9 px-4 rounded-lg text-[11px] uppercase font-black tracking-tighter text-slate-500 hover:bg-slate-100/50 transition-all border-none shrink-0"
                                >
                                    <div className="flex items-center gap-2"><ChevronLeft size={14} /> Volver</div>
                                </Button>
                                <div className="hidden md:block w-[1px] h-5 bg-slate-200/50" />
                            </>
                        )}
                        <h1 className="text-[12px] md:text-[14px] font-black text-slate-900 tracking-tight truncate max-w-[200px] md:max-w-[500px] leading-tight italic">
                            {strategyH1 || keyword || "Sin Título"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Left empty for symmetry if needed, or put global actions here */}
                    </div>
                </header>

                {/* 2. SECONDARY TOOLBAR (Languages, View Mode, AI Progress) */}
                <div className="z-40 bg-white border-b border-slate-100 px-6 md:px-10 py-1 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        
                        {/* LEFT: PRESENCE & SYNC */}
                        <div className="flex items-center gap-4 shrink-0">
                            {activeUsers && <PresenceAvatars users={activeUsers} />}
                            <div className="w-[1px] h-4 bg-slate-200/50" />
                            <div 
                                className="flex items-center justify-center p-1.5 rounded-lg border border-transparent hover:bg-slate-50 transition-colors"
                                title={isSaving ? "Guardando en la nube..." : "Sincronizado con Supabase"}
                            >
                                {isSaving ? (
                                    <Cloud className="text-amber-500 animate-pulse" size={14} />
                                ) : (
                                    <Cloud className="text-emerald-500" size={14} />
                                )}
                            </div>
                        </div>

                        {/* CENTER: AI PROGRESS */}
                        <div className="flex-1 flex justify-center">
                            <AnimatePresence>
                                {(isAnalyzingSEO || isPlanningStructure || isGenerating || isHumanizing) && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                        className="hidden xl:flex items-center gap-4 px-3 py-1 bg-slate-50/50 rounded-xl border border-slate-200/40"
                                    >
                                        <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200/50">
                                            <StepIcon active={isAnalyzingSEO} done={!!rawSeoData && !isAnalyzingSEO} icon={Search} label="SEO" />
                                            <StepIcon active={isPlanningStructure} done={strategyOutline.length > 0 && !isPlanningStructure} icon={Layout} label="OUTLINE" />
                                            <StepIcon active={isDrafting} done={(hasGenerated || isPostProd) && !isDrafting} icon={FileText} label="DRAFT" />
                                            <StepIcon active={isPostProd} done={hasGenerated && !isPostProd} icon={Zap} label="FINAL" />
                                        </div>
                                        <div className="relative w-4 h-4">
                                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                                            <div className="w-4 h-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center">
                                                <span className="text-[7px] text-white font-black italic">N</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* RIGHT: LANGUAGES & TAB SWITCHER */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* LANGUAGES GALLERY */}
                            <div className="min-w-0 max-w-[280px] flex items-center gap-1 bg-transparent group/gallery">
                                <div className="flex items-center gap-1.5 px-1 shrink-0">
                                    <button 
                                        onClick={async () => {
                                            const isParent = draftId === parentTaskId;
                                            const message = isParent 
                                                ? "¿Estás seguro de eliminar el PROYECTO ORIGINAL? Esto borrará todas las versiones." : "¿Eliminar esta TRADUCCIÓN?";
                                            if (window.confirm(message)) await deleteVersion(draftId!);
                                        }}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                    <Languages size={12} className="text-slate-400" />
                                </div>

                                <div className="relative flex-1 flex items-center overflow-hidden">
                                    <AnimatePresence>
                                        {canScrollLeft && (
                                            <motion.button
                                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                                onClick={() => handleGalleryScroll('left')}
                                                className="absolute left-0 z-20 p-1 bg-white/90 rounded-md shadow-sm border border-slate-200 text-slate-500"
                                            >
                                                <ChevronLeft size={10} />
                                            </motion.button>
                                        )}
                                    </AnimatePresence>

                                    <div 
                                        ref={galleryRef} onScroll={checkScroll}
                                        className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-1 scroll-smooth"
                                        style={{ maskImage: 'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)' }}
                                    >
                                        {Array.from(new Set([...Object.keys(contentVersions), ...targetLanguages])).map((langCode: string) => {
                                            const isGenerated = !!contentVersions[langCode];
                                            const isActive = currentLanguage === langCode;
                                            if (!langCode) return null;
                                            return (
                                                <button
                                                    key={langCode}
                                                    onClick={() => isGenerated && switchLanguage(langCode)}
                                                    disabled={!isGenerated && !isActive}
                                                    className={cn(
                                                        "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase transition-all shrink-0 select-none border",
                                                        isActive ? "bg-slate-900 text-white shadow-sm border-slate-800" : 
                                                        isGenerated ? "bg-transparent text-slate-500 hover:bg-slate-50 hover:shadow-sm border-transparent" : "text-slate-300 opacity-40 border-transparent"
                                                    )}
                                                >
                                                    {langCode}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <AnimatePresence>
                                        {canScrollRight && (
                                            <motion.button
                                                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                                onClick={() => handleGalleryScroll('right')}
                                                className="absolute right-0 z-10 p-1 bg-white/90 rounded-md shadow-sm border border-slate-200 text-slate-500"
                                            >
                                                <ChevronRight size={10} />
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* TAB SWITCHER: Visual / Código */}
                            <div className="flex items-center gap-1 p-0.5 bg-slate-100/30 border border-slate-200/40 rounded-lg shadow-sm w-[100px] shrink-0">
                                <button 
                                    onClick={() => setEditorTab('visual')}
                                    className={cn(
                                        "px-2 flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                                        editorTab === 'visual' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    V
                                </button>
                                <button 
                                    onClick={() => setEditorTab('code')}
                                    className={cn(
                                        "px-2 flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                                        editorTab === 'code' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    C
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. CONTENT AREA */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {renderContent()}
                </div>
            </main>

                                 {/* RIGHT: Tools Sidebar (Full Height) */}
                                 {redactorUI === 'standard' && (
                                     <div 
                                         className="h-full bg-slate-50 flex flex-col overflow-hidden border-l border-slate-200/50 relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.02)]"
                                         style={{ width: `${rightSidebarWidth}%` }}
                                     >
                                         {/* Drag Handle */}
                                         <div 
                                             onMouseDown={handleRightResizeDown}
                                             className={cn(
                                                 "absolute top-0 left-0 w-1 h-full cursor-col-resize transition-all z-30",
                                                 isResizingRight ? "bg-indigo-500 w-1" : "hover:bg-indigo-300/50 hover:w-1"
                                             )}
                                         />
                                         
                                         {/* ACTION BOX: Finalizar Button (Unified Header) */}
                                         <div className="p-4 bg-white border-b border-slate-200/50 shadow-sm z-20">
                                             <button
                                                 onClick={() => finishContent()}
                                                 className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95 group"
                                             >
                                                 <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                 Finalizar Artículo
                                             </button>
                                         </div>
                                         
                                         {/* Tools Content Tabs */}
                                         <div className="px-5 py-3 border-b border-slate-200/50 bg-white/40 backdrop-blur-md z-10">
                                             <div className="grid grid-cols-6 gap-2 p-1 bg-slate-100 rounded-none border border-slate-200 w-full overflow-hidden">
                                                 {[
                                                     { id: 'history', icon: <Search size={16} /> },
                                                     { id: 'seo', icon: <Zap size={16} /> },
                                                     { id: 'media', icon: <ImagePlus size={16} /> },
                                                     { id: 'tools', icon: <Wrench size={16} /> },
                                                     { id: 'translate', icon: <Languages size={16} /> },
                                                     { id: 'nous', icon: <NousLogo showText={false} className="scale-75" /> },
                                                 ].map(tab => (
                                                     <button 
                                                         key={tab.id}
                                                         onClick={() => setSidebarTab(tab.id as any)}
                                                         className={cn(
                                                             "flex items-center justify-center aspect-square transition-all duration-150 border-2 rounded-none",
                                                             activeSidebarTab === tab.id 
                                                                 ? "bg-slate-50 text-indigo-500 border-indigo-200 shadow-sm" 
                                                                 : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600"
                                                         )}
                                                     >
                                                         {tab.icon}
                                                     </button>
                                                 ))}
                                             </div>
                                         </div>
                                         
                                         <div className="flex-1 flex flex-col min-h-0 bg-slate-50/20">
                                             {activeSidebarTab === 'seo' ? (
                                                 <SEODataTab seoData={rawSeoData} currentContent={content} />
                                             ) : activeSidebarTab === 'media' ? (
                                                 <MediaTab />
                                             ) : activeSidebarTab === 'tools' ? (
                                                 <ToolsTab />
                                             ) : activeSidebarTab === 'translate' ? (
                                                 <TranslationSidebarPanel />
                                             ) : activeSidebarTab === 'nous' ? (
                                                 <div className="p-4 h-full flex items-center justify-center">
                                                     <NousOrb 
                                                         viewMode="writer" 
                                                         isProcessing={isProcessingAny}
                                                         onWriterAction={(type) => {
                                                             if (type === 'seo') handleSEO();
                                                             if (type === 'generate') handleGenerate();
                                                             if (type === 'humanize') handleHumanize();
                                                             if (type === 'refine') handleRefine();
                                                         }}
                                                     />
                                                 </div>
                                             ) : (
                                                 <CompetitorPanel />
                                             )}
                                         </div>
                                     </div>
                                 )}
        </div>
    );
}