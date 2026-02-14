'use client';

import { useWriterStore } from '@/store/useWriterStore';
import WriterEditor from '@/components/studio/writer/WriterEditor';
import WriterSidebar from '@/components/studio/writer/WriterSidebar';
import { PanelLeft, PanelRight, Save } from 'lucide-react';
import { Button } from '@/components/dom/Button';
import { cn } from '@/utils/cn';

export default function WriterStudio() {
    const { isSidebarOpen, toggleSidebar, isCheckSaving, isSaving, lastSaved } = useWriterStore() as any; // Cast for now, will fix interface

    return (
        <div className="flex w-full h-[calc(100vh-6rem)] bg-white overflow-hidden rounded-tl-2xl border border-slate-200 shadow-sm ml-4 mt-4">

            {/* Main Editor Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-white relative">

                {/* Minimal Toolkit / Header */}
                <header className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        {/* Breadcrumbs or Title could go here */}
                        <div className="text-sm font-medium text-slate-400">
                            Borrador sin título
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-[10px] text-slate-400 font-medium">
                            {isSaving ? "Guardando..." : lastSaved ? `Guardado ${lastSaved.toLocaleTimeString()}` : "Cambios sin guardar"}
                        </div>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                            <Save size={16} />
                        </Button>
                        <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSidebar}
                            className={cn("text-slate-400 hover:text-slate-600", isSidebarOpen && "text-blue-600 bg-blue-50")}
                        >
                            <PanelRight size={18} />
                        </Button>
                    </div>
                </header>

                {/* Editor Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
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
