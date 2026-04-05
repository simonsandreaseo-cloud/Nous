
'use client';
import { useRef, useState, useMemo } from 'react';

import { useWriterStore } from '@/store/useWriterStore';
import WriterEditor from '@/components/contents/writer/WriterEditor';
import WriterDashboard from '@/components/contents/writer/WriterDashboard';
import WriterSetupBoard from '@/components/contents/writer/WriterSetupBoard';
import { LayoutTemplate, ChevronLeft, LayoutDashboard, Settings2, PenTool } from 'lucide-react';
import { Button } from '@/components/dom/Button';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import CompetitorCard from './CompetitorCard';
import SEODataTab from './SEODataTab';
import OutlineSidebar from './OutlineSidebar';
import OutlineEditorPanel from './OutlineEditorPanel';
import CompetitorPanel from './CompetitorPanel';
import PresenceAvatars from './PresenceAvatars';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useCallback } from 'react';

export default function WriterStudio() {
    const {
        isSidebarOpen, toggleSidebar, isSaving, lastSaved,
        keyword, strategyH1, draftId, viewMode, setViewMode, rawSeoData,
        editorTab, setEditorTab, content, activeUsers, setActiveUsers,
        strategyOutline, strategyTitle, strategySlug, strategyDesc, strategyExcerpt, strategyLinks,
        strategyNotes, setIsRemoteUpdate, setStatus, setSaving, isGenerating
    } = useWriterStore();
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
                const formattedUsers: any = {};
                Object.entries(state).forEach(([id, presenceArray]: [string, any]) => {
                    const info = presenceArray[0];
                    if (info) {
                        formattedUsers[id] = {
                            name: info.name || 'Editor Anónimo',
                            photo: info.photo || '',
                            color: info.color || '#cbd5e1',
                        };
                    }
                });
                
                // Only update store if users actually changed to avoid flickering
                const currentUsersJson = JSON.stringify(useWriterStore.getState().activeUsers);
                const nextUsersJson = JSON.stringify(formattedUsers);
                if (currentUsersJson !== nextUsersJson) {
                    setActiveUsers(formattedUsers);
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await trackPresence(channel);
                }
            });

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
    useEffect(() => {
        if (!draftId || isGenerating || !hasAccess) return;

        // Immediately set saving state when content changes to show UI feedback
        // even before the 3s debounce starts in the DB update.
        // Actually, store.setContent no longer sets isSaving, so we do it here.
        
        const currentState = {
            content_body: useWriterStore.getState().content,
            h1: useWriterStore.getState().strategyH1,
            seo_title: useWriterStore.getState().strategyTitle,
            target_url_slug: useWriterStore.getState().strategySlug,
            meta_description: useWriterStore.getState().strategyDesc,
            excerpt: useWriterStore.getState().strategyExcerpt,
            research_dossier: {
                ...useWriterStore.getState().rawSeoData,
                briefing: useWriterStore.getState().strategyNotes,
                suggested_links: useWriterStore.getState().strategyLinks
            },
            outline_structure: { headers: useWriterStore.getState().strategyOutline },
        };

        // Set UI to saving mode immediately
        setSaving(true);

        const timer = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('tasks')
                    .update(currentState)
                    .eq('id', draftId);

                if (error) throw error;
            } catch (e: any) {
                console.error('[AutoSave] Error full:', e);
                const errorMsg = e.message || 'Error desconocido';
                setStatus('❌ Error al guardar: ' + errorMsg);
            } finally {
                setSaving(false);
            }
        }, 3000); // 3 second debounce

        return () => {
            clearTimeout(timer);
        };
    }, [
        draftId, content, strategyH1, strategyTitle, strategySlug, strategyDesc, 
        strategyOutline, rawSeoData, strategyLinks, strategyNotes, isGenerating, setSaving, setStatus, hasAccess
    ]);

    // --- Data Bootstrapping (Inventory/Links) ---
    const { projectId, csvData, loadProjectInventory } = useWriterStore();
    useEffect(() => {
        if (projectId && (!csvData || csvData.length === 0)) {
            loadProjectInventory(projectId);
        }
    }, [projectId, csvData?.length, loadProjectInventory]);

    // ── DASHBOARD VIEW ──────────────────────────────────────

    const [splitWidth, setSplitWidth] = useState(50);
    const [activeRightTab, setActiveRightTab] = useState<'outline' | 'competitors' | 'seo'>('outline');
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDrag = (event: any, info: any) => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        // Calculate new percentage based on mouse movement
        const deltaPercentage = (info.delta.x / containerWidth) * 100;
        setSplitWidth((prev: number) => {
            const newVal = prev + deltaPercentage;
            // Clamp between 30% and 70%
            return Math.min(Math.max(newVal, 30), 70);
        });
    };

    // Parse Competitors for 50/50 view
    let competitors: { url: string, content?: string }[] = [];
    if (rawSeoData && rawSeoData.competitors) {
        competitors = rawSeoData.competitors;
    }

    // common internal views (Dashboard, Setup, Workspace)
    const renderContent = () => {
        if (viewMode === 'dashboard') return <WriterDashboard />;
        if (viewMode === 'setup') return <WriterSetupBoard />;

        return (
            <div className="flex-1 overflow-hidden flex relative bg-white/20" ref={containerRef}>
                {/* Left Side: Zen Editor */}
                <div className={cn("h-full overflow-y-auto custom-scrollbar flex-1", isSidebarOpen ? "transition-none" : "transition-all duration-500 ease-[0.23,1,0.32,1]")}
                    style={{ width: isSidebarOpen ? `${splitWidth}%` : '100%' }}>
                    <div className={cn("mx-auto min-h-full transition-all duration-500 px-4 sm:px-8", isSidebarOpen ? "w-full" : "max-w-4xl")}>
                        <WriterEditor />
                    </div>
                </div>

                {/* Drag Handle */}
                {isSidebarOpen && (
                    <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0}
                        dragMomentum={false}
                        onDrag={handleDrag}
                        className="absolute top-0 bottom-0 z-50 w-2 hover:bg-indigo-500/20 cursor-col-resize flex items-center justify-center group"
                        style={{ left: `calc(${splitWidth}% - 4px)` }}
                    >
                        <div className="h-8 w-1 bg-slate-300 rounded-full group-hover:bg-indigo-400 transition-colors" />
                    </motion.div>
                )}

                {/* Right Side: Competitors / Research (50/50 Mode) */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: `${100 - splitWidth}%`, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                            className="h-full bg-slate-50 flex flex-col overflow-hidden border-l border-slate-200/50 shadow-[inset_10px_0_20px_rgba(0,0,0,0.02)]"
                        >
                            <div className="px-6 py-4 border-b border-slate-200/50 bg-white/80 backdrop-blur-md sticky top-0 z-30">
                                <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/40 w-fit">
                                    <button 
                                        onClick={() => setActiveRightTab('outline')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                            activeRightTab === 'outline' ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <div className={cn("w-1.5 h-1.5 rounded-full", activeRightTab === 'outline' ? "bg-indigo-500 animate-pulse" : "bg-slate-300")} />
                                        Outline
                                    </button>
                                    <button 
                                        onClick={() => setActiveRightTab('competitors')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                            activeRightTab === 'competitors' ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <div className={cn("w-1.5 h-1.5 rounded-full", activeRightTab === 'competitors' ? "bg-slate-400" : "bg-slate-300")} />
                                        Competidores
                                    </button>
                                    <button 
                                        onClick={() => setActiveRightTab('seo')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                            activeRightTab === 'seo' ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <div className={cn("w-1.5 h-1.5 rounded-full", activeRightTab === 'seo' ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                        Datos SEO
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                                {activeRightTab === 'outline' ? (
                                    <OutlineEditorPanel 
                                        isSidebar 
                                        editorText={content} 
                                        onInsertSection={(item) => {
                                            const { editor } = useWriterStore.getState();
                                            if (!editor) return;
                                            const level = item.type === 'H1' ? 1 : item.type === 'H3' ? 3 : item.type === 'H4' ? 4 : 2;
                                            editor.chain().focus().insertContent([
                                                { type: 'heading', attrs: { level }, content: [{ type: 'text', text: item.text }] },
                                                { type: 'paragraph' }
                                            ]).run();
                                        }}
                                    />
                                ) : activeRightTab === 'competitors' ? (
                                    <CompetitorPanel />
                                ) : (
                                    <SEODataTab seoData={rawSeoData} currentContent={content} />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ── ROOT RENDER (Unified Header for Presence) ──────────────────────────────────────
    return (
        <div className="flex w-full h-full bg-transparent overflow-hidden">
            <main className="flex-1 flex flex-col min-w-0 glass-panel border-r-0 rounded-tl-3xl relative shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                {/* Unified Header / Toolkit */}
                <header className="h-auto md:h-20 py-4 md:py-0 flex flex-wrap md:flex-nowrap items-center justify-between px-6 md:px-10 bg-white/10 backdrop-blur-xl z-50 sticky top-0 shrink-0 select-none border-b border-slate-200/20 gap-4">
                    <div className="flex items-center gap-4 md:gap-6 min-w-0">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                                if (viewMode === 'workspace' || viewMode === 'setup') setViewMode('dashboard');
                                else setViewMode('dashboard'); 
                            }}
                            className="h-9 px-3 md:px-4 rounded-xl text-[11px] uppercase font-black tracking-tighter text-slate-500 hover:bg-slate-100/50 transition-all border-none shrink-0"
                        >
                            {viewMode === 'dashboard' ? 'Salir' : <div className="flex items-center gap-2"><ChevronLeft size={14} /> Volver</div>}
                        </Button>
                        <div className="hidden md:block w-[1px] h-5 bg-slate-200/50" />
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-[12px] md:text-[14px] font-black text-slate-900 tracking-tight truncate max-w-[200px] md:max-w-[400px] leading-tight">
                                {strategyH1 || keyword || "Cargando..."}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8 ml-auto">
                        <div className="hidden md:block w-[1px] h-6 bg-slate-200/50 mx-1" />

                        <div className="flex items-center gap-6">
                            {/* PRESENCE ICONOS: VISIBLES SIEMPRE QUE HAYA DRAFTID */}
                            {draftId && activeUsers && <PresenceAvatars users={activeUsers} />}
                            
                            <div className="w-[1px] h-6 bg-slate-200/50 mx-1" />

                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                    <div className={cn(
                                        "text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2",
                                        isSaving ? "text-indigo-500" : "text-slate-400"
                                    )}>
                                        {isSaving ? "Capturando cambios..." : "Sincronizado"}
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            isSaving ? "bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                                        )} />
                                    </div>
                                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">
                                        {lastSaved ? `Activo ahora` : "Borrador"}
                                    </span>
                                </div>
                            </div>

                            {viewMode === 'workspace' && (
                                <button
                                    onClick={toggleSidebar}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all duration-300 border border-transparent hover:bg-slate-100/50",
                                        isSidebarOpen ? "text-indigo-600 bg-indigo-50/50 border-indigo-100" : "text-slate-400"
                                    )}
                                    title={isSidebarOpen ? "Modo Zen" : "Modo 50/50"}
                                >
                                    <LayoutTemplate size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}

