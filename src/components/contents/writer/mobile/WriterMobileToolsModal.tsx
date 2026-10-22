'use client';

import { useEffect } from 'react';
import { 
    X, 
    Briefcase, 
    Search, 
    History, 
    Zap, 
    ImagePlus, 
    Wrench, 
    Languages,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { NousLogo } from '@/components/dom/NousLogo';

export const MOBILE_STUDIO_TABS = [
    { id: 'nous', label: 'Nous', icon: NousLogo, isLogo: true },
    { id: 'research', label: 'Investigación', icon: Search },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'seo', label: 'SEO', icon: Zap },
    { id: 'media', label: 'Media', icon: ImagePlus },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'translate', label: 'Idiomas', icon: Languages },
];

interface WriterMobileToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    onTabChange: (tab: string) => void;
    children: React.ReactNode;
}

export function WriterMobileToolsModal({
    isOpen,
    onClose,
    activeTab,
    onTabChange,
    children
}: WriterMobileToolsModalProps) {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40"
                    />

                    {/* Near-Fullscreen Sheet Container */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        className="relative w-full h-[92vh] max-h-[94vh] bg-white rounded-t-3xl shadow-2xl flex flex-col z-50 overflow-hidden border-t border-slate-200"
                    >
                        {/* Drag Handle Bar */}
                        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

                        {/* Modal Header */}
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                                    <Briefcase size={16} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 leading-tight">
                                        Herramientas de Studio
                                    </h3>
                                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">
                                        Panel Auxiliar
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors active:scale-95"
                                aria-label="Cerrar herramientas"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Horizontal Tab Bar (Pills) */}
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 shrink-0">
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                {MOBILE_STUDIO_TABS.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    const Icon = tab.icon;

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => onTabChange(tab.id)}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95',
                                                isActive
                                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                                                    : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/60'
                                            )}
                                        >
                                            {tab.isLogo ? (
                                                <NousLogo showText={false} className="scale-60 -mx-1" />
                                            ) : (
                                                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-500'} />
                                            )}
                                            <span className="text-[11px] uppercase tracking-tight font-extrabold whitespace-nowrap">
                                                {tab.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content View Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-slate-50/30">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
