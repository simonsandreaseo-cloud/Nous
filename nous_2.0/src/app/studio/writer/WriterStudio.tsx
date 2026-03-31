'use client';

import { useWriterStore } from '@/store/useWriterStore';
import WriterEditor from '@/components/studio/writer/WriterEditor';
import WriterSidebar from '@/components/studio/writer/WriterSidebar';
import WriterSetupBoard from '@/components/studio/writer/WriterSetupBoard';
import WriterDashboard from '@/components/studio/writer/WriterDashboard';
import { PanelRight, X } from 'lucide-react';
import { Button } from '@/components/dom/Button';
import { cn } from '@/utils/cn';

export default function WriterStudio() {
    const {
        isSidebarOpen, toggleSidebar, isSaving, lastSaved,
        keyword, strategyH1, draftId, viewMode, setViewMode
    } = useWriterStore();

    // ── DASHBOARD VIEW ──────────────────────────────────────
    if (viewMode === 'dashboard') {
        return <WriterDashboard />;
    }

    // ── SETUP DRAWER (Overlay on Dashboard) ──────────────────
    if (viewMode === 'setup') {
        return (
            <div className="relative w-full h-full overflow-hidden">
                <WriterDashboard />
                
                {/* Backdrop Blur/Dim */}
                <div 
                    className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-[2px] animate-in fade-in duration-300"
                    onClick={() => setViewMode('dashboard')}
                />
                
                {/* Right Drawer */}
                <div className="fixed top-0 right-0 z-[110] h-full w-full max-w-[550px] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-500 ease-[0.23,1,0.32,1]">
                    {/* Header is handled inside WriterSetupBoard for better control, 
                        but we can add a global close button if needed */}
                    <div className="flex-1 overflow-hidden">
                        <WriterSetupBoard />
                    </div>
                </div>
            </div>
        );
    }

    // ── WORKSPACE VIEW ──────────────────────────────────────
    return (
        <div className="flex w-full h-full bg-transparent overflow-hidden">
            <main className="flex-1 flex flex-col min-w-0 glass-panel border-r-0 rounded-tl-3xl relative shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                {/* Header / Toolkit */}
                <header className="h-16 border-b border-hairline flex items-center justify-between px-8 bg-white/40 backdrop-blur-md z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setViewMode('dashboard')}
                            className="h-8 px-3 rounded-lg text-[10px] uppercase font-black border-slate-200"
                        >
                            Salir
                        </Button>
                        <div className="w-[1px] h-4 bg-slate-100" />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none">
                                <span>Studio</span>
                                <span className="text-slate-200">/</span>
                                <span className="text-indigo-400">{keyword || "Nuevo"}</span>
                            </div>
                            <h1 className="text-[13px] font-bold text-slate-800 tracking-tight truncate max-w-[300px] leading-tight">
                                {strategyH1 || keyword || "Sin título"}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <div className={cn(
                                "text-[10px] font-bold uppercase tracking-wider transition-colors",
                                isSaving ? "text-indigo-500 animate-pulse" : "text-slate-400"
                            )}>
                                {isSaving ? "Sincronizando..." : draftId ? "Guardado en la nube" : "Borrador Local"}
                            </div>
                            <div className="text-[9px] text-slate-300 font-medium">
                                {lastSaved ? `Hace un momento` : "Sin cambios guardados"}
                            </div>
                        </div>

                        <div className="w-[1px] h-6 bg-slate-100 mx-1" />

                        <button
                            onClick={toggleSidebar}
                            className={cn(
                                "p-2.5 rounded-xl transition-all duration-300 border border-transparent hover:bg-slate-100/50",
                                isSidebarOpen ? "text-indigo-600 bg-indigo-50/50 border-indigo-100" : "text-slate-400"
                            )}
                            title={isSidebarOpen ? "Cerrar Panel" : "Abrir Panel"}
                        >
                            <PanelRight size={20} />
                        </button>
                    </div>
                </header>

                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white/20">
                    <div className="max-w-4xl mx-auto min-h-full">
                        <WriterEditor />
                    </div>
                </div>
            </main>

            {/* Sidebar */}
            <WriterSidebar />
        </div>
    );
}
