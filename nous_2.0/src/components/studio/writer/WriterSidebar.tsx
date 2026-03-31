'use client';

// Modular Imports
import { StatusBadge } from './SidebarCommon';
import { useWriterActions } from './useWriterActions';
import { GenerateTab } from './GenerateTab';
import { SEOTab } from './SEOTab';
import { AssistantTab } from './AssistantTab';
import { ResearchTab } from './ResearchTab';
import { ExportTab } from './ExportTab';
import { MediaTab } from './MediaTab';

/**
 * REFACTORING STATUS: 70% Complete
 * PENDING TASKS FOR JULES:
 * 1. [FIX LINT]: Property names 'status' and 'sidebarTab' were changed in the store to 'statusMessage' and 'activeSidebarTab'.
 *    - Current code uses 'statusMessage' and 'activeSidebarTab' in most places, but verify setters.
 * 2. [MEDIA TAB]: Implement the MediaTab component for image generation & management.
 * 3. [HANDLERS]: The 'handleExportWP' and 'handleSaveCloud' handlers are currently stubs. Move them to a service or implement here.
 * 4. [UX]: Add transitions between tabs (Framer Motion recommended).
 */
import { useWriterStore } from '@/store/useWriterStore';
import { LayoutTemplate, MessageSquareMore, FileSearch, Search, MonitorSmartphone, Share2, ImagePlus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarTab } from '@/store/useWriterStore';

export default function WriterSidebar() {
    const store = useWriterStore();
    const {
        handleSEO,
        handlePlanStructure,
        handleGenerate,
        handleHumanize,
        handleRefine
    } = useWriterActions();

    const renderTabContent = () => {
        let content = null;
        switch (store.activeSidebarTab) {
            case 'seo':
                content = <SEOTab onSEO={handleSEO} isAnalyzing={store.isAnalyzingSEO} onPlanStructure={handlePlanStructure} isPlanning={store.isPlanningStructure} />;
                break;
            case 'generate':
                content = <GenerateTab onGenerate={handleGenerate} onHumanize={handleHumanize} isLoading={store.isGenerating} />;
                break;
            case 'assistant':
                content = <AssistantTab onRefine={handleRefine} isRefining={store.isRefining} />;
                break;
            case 'research':
                content = <ResearchTab />;
                break;
            case 'export':
                content = <ExportTab onExportWP={() => {}} onSaveCloud={() => {}} />;
                break;
            case 'media':
                content = <MediaTab />;
                break;
            default:
                content = null;
        }

        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={store.activeSidebarTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    {content}
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <aside className="w-80 h-full border-r border-slate-200 bg-white flex flex-col z-20 shadow-xl shadow-indigo-900/5 transition-all">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0 bg-white">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
                        <MonitorSmartphone size={16} className="text-white" />
                    </div>
                    <span className="font-black text-slate-800 tracking-tight">AI Writer</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 py-3 border-b border-slate-100 shrink-0 overflow-x-auto custom-scrollbar">
                <div className="flex gap-1">
                    {[
                        { id: 'seo', icon: Search, label: 'SEO' },
                        { id: 'generate', icon: LayoutTemplate, label: 'Editor' },
                        { id: 'media', icon: ImagePlus, label: 'Media' },
                        { id: 'assistant', icon: MessageSquareMore, label: 'Asistente' },
                        { id: 'research', icon: FileSearch, label: 'Datos' },
                        { id: 'export', icon: Share2, label: 'Exportar' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => store.setSidebarTab(tab.id as SidebarTab)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                store.activeSidebarTab === tab.id
                                    ? "bg-indigo-50 text-indigo-600"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            )}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {renderTabContent()}
            </div>

            <StatusBadge message={store.statusMessage || ''} />
        </aside>
    );
}
