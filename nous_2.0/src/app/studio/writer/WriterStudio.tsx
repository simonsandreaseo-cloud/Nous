'use client';

import { useWriterStore } from '@/store/useWriterStore';
import WriterEditor from '@/components/studio/writer/WriterEditor';
import WriterSidebar from '@/components/studio/writer/WriterSidebar';
import { PanelLeft, PanelRight, Save } from 'lucide-react';
import { Button } from '@/components/dom/Button';
import { cn } from '@/utils/cn';

export default function WriterStudio() {
    const {
        isSidebarOpen, toggleSidebar, isSaving, lastSaved,
        keyword, strategyH1, draftId
    } = useWriterStore();

    return (
        <div className="flex w-full h-[calc(100vh-6rem)] bg-transparent overflow-hidden rounded-tl-2xl ml-4 mt-4">

            {/* Main Editor Area */}
            <main className="flex-1 flex flex-col min-w-0 glass-panel border-r-0 rounded-tl-3xl relative shadow-[0_20px_50px_rgba(0,0,0,0.1)]">

                {/* Minimal Toolkit / Header */}
                <header className="h-16 border-b border-hairline flex items-center justify-between px-8 bg-white/40 backdrop-blur-md z-10 sticky top-0">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            <span>Studio</span>
                            <span className="text-slate-200">/</span>
                            <span>Escritor</span>
                            {keyword && (
                                <>
                                    <span className="text-slate-200">/</span>
                                    <span className="text-indigo-400">{keyword}</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-sm font-bold text-slate-800 tracking-tight truncate max-w-[400px]">
                            {strategyH1 || keyword || "Nuevo Artículo"}
                        </h1>
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

                {/* Editor Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white/20">
                    <div className="max-w-4xl mx-auto min-h-full">
                        <WriterEditor />
                    </div>
                </div>
            </main>

            {/* Right Sidebar */}
            <WriterSidebar />
        </div>
    );
}
