'use client';

import { useState } from 'react';
import { 
    Wrench, 
    X,
    Layout,
    Search,
    Image as ImageIcon,
    Settings2,
    Languages,
    ChevronDown,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useWriterStore } from '@/store/useWriterStore';
import { useShallow } from 'zustand/react/shallow';

// Import Panels (Need to ensure paths are correct based on WriterStudio)
import SEODataTab from '../SEODataTab';
import { MediaTab } from '../MediaTab';
import { ToolsTab } from '../ToolsTab';
import TranslationSidebarPanel from '../TranslationSidebarPanel';
import { CompetitorPanel } from '../CompetitorPanel';

export function FloatingToolbox() {
    const { 
        isToolboxOpen,
        toggleToolbox,
        activeSidebarTab,
        setSidebarTab,
        content,
        rawSeoData
    } = useWriterStore(useShallow(state => ({
        isToolboxOpen: state.isToolboxOpen,
        toggleToolbox: state.toggleToolbox,
        activeSidebarTab: state.activeSidebarTab,
        setSidebarTab: state.setSidebarTab,
        content: state.content,
        rawSeoData: state.rawSeoData
    })));

    const tabs = [
        { id: 'history', label: 'Competidores', icon: Search, color: 'text-slate-500' },
        { id: 'seo', label: 'Datos SEO', icon: Zap, color: 'text-emerald-500' },
        { id: 'media', label: 'Imágenes', icon: ImageIcon, color: 'text-purple-500' },
        { id: 'tools', label: 'Herramientas', icon: Settings2, color: 'text-amber-500' },
        { id: 'translate', label: 'Traducir', icon: Languages, color: 'text-emerald-500' },
    ];

    const ActiveIcon = tabs.find(t => t.id === activeSidebarTab)?.icon || Wrench;

    return (
        <div className="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-4">
            {/* FLOATING PANEL */}
            <AnimatePresence>
                {isToolboxOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-[450px] h-[600px] bg-white/80 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/20 flex flex-col overflow-hidden"
                    >
                        {/* HEADER */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                    <Wrench size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Toolbox Redactor</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Modo Zen Activo</p>
                                </div>
                            </div>
                            <button 
                                onClick={toggleToolbox}
                                className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* TABS NAVIGATION */}
                        <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar-horizontal pb-1">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setSidebarTab(tab.id as any)}
                                        className={cn(
                                            "flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
                                            activeSidebarTab === tab.id 
                                                ? "bg-white text-indigo-600 border-slate-100 shadow-sm" 
                                                : "bg-transparent text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/40"
                                        )}
                                    >
                                        <tab.icon size={14} className={cn(activeSidebarTab === tab.id ? tab.color : "text-slate-300")} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* TAB CONTENT */}
                        <div className="flex-1 overflow-hidden flex flex-col bg-white/20">
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {activeSidebarTab === 'seo' ? (
                                    <SEODataTab seoData={rawSeoData} currentContent={content} />
                                ) : activeSidebarTab === 'media' ? (
                                    <MediaTab />
                                ) : activeSidebarTab === 'tools' ? (
                                    <ToolsTab />
                                ) : activeSidebarTab === 'translate' ? (
                                    <TranslationSidebarPanel />
                                ) : (
                                    <CompetitorPanel />
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN TOGGLE BUTTON */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleToolbox}
                className={cn(
                    "w-16 h-16 rounded-[24px] flex items-center justify-center transition-all shadow-2xl relative group",
                    isToolboxOpen 
                        ? "bg-slate-900 text-white" 
                        : "bg-indigo-600 text-white hover:bg-indigo-500"
                )}
            >
                <div className="absolute inset-0 bg-white/20 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                {isToolboxOpen ? <X size={28} /> : <ActiveIcon size={28} />}
                
                {/* TOOLTIP */}
                {!isToolboxOpen && (
                    <div className="absolute right-full mr-4 px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Cajita de Herramientas
                    </div>
                )}
            </motion.button>
        </div>
    );
}
