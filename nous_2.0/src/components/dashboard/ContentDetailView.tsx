'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FileText,
    Target,
    Image as ImageIcon,
    ChevronRight,
    CheckCircle2,
    Database,
    Trash2,
    ExternalLink,
    Clock,
    User,
    Search,
    PenTool,
    ShieldCheck,
    MousePointer2,
    Sparkles,
    Save
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Task } from '@/types/project';
import { useProjectStore } from '@/store/useProjectStore';

import ContentTab from './detail/ContentTab';
import SEOTab from './detail/SEOTab';
import ImagesTab from './detail/ImagesTab';
import StrategyTab from './detail/StrategyTab';

interface ContentDetailViewProps {
    task: Task;
    onClose: () => void;
}

const FLOW_STATES = [
    { id: 'idea', label: 'Idea' },
    { id: 'en_investigacion', label: 'Investigación' },
    { id: 'por_redactar', label: 'Redacción' },
    { id: 'por_corregir', label: 'Corrección' },
    { id: 'por_maquetar', label: 'Maquetación' },
    { id: 'publicado', label: 'Publicado' },
];

type TabId = 'content' | 'strategy' | 'seo' | 'images';

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'content', label: 'Contenido', icon: FileText },
    { id: 'strategy', label: 'Estrategia', icon: Sparkles },
    { id: 'seo', label: 'SEO & Research', icon: Target },
    { id: 'images', label: 'Imágenes & Media', icon: ImageIcon },
];

export default function ContentDetailView({ task, onClose }: ContentDetailViewProps) {
    const [activeTab, setActiveTab] = useState<TabId>('content');
    const { updateTask, teamMembers, claimTask } = useProjectStore();
    const [localTask, setLocalTask] = useState<Task>(task);

    const handleUpdateStatus = async (newStatus: string) => {
        const next = { ...localTask, status: newStatus as any };
        setLocalTask(next);
        await updateTask(task.id, { status: newStatus as any });
    };

    const currentIndex = FLOW_STATES.findIndex(s => s.id === localTask.status);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden"
        >
            {/* PRE-HEADER: FLOW INDICATOR */}
            <div className="bg-slate-50 border-b border-slate-100 px-8 py-3 shrink-0">
                <div className="flex items-center justify-between">
                    {/* Flow Steps */}
                    <div className="flex items-center gap-1">
                        {FLOW_STATES.map((state, index) => (
                            <div key={state.id} className="flex items-center">
                                <button
                                    onClick={() => handleUpdateStatus(state.id)}
                                    className={cn(
                                        'px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                                        index < currentIndex
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : index === currentIndex
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                                : 'text-slate-400 hover:text-slate-600 bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                    )}
                                >
                                    {index < currentIndex && <CheckCircle2 size={10} />}
                                    {state.label}
                                </button>
                                {index < FLOW_STATES.length - 1 && (
                                    <div className={cn(
                                        'w-4 h-[1px] mx-1',
                                        index < currentIndex ? 'bg-emerald-300' : 'bg-slate-100'
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Meta & Global Actions */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {localTask.created_at && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/50 rounded-lg">
                                    <Clock size={11} className="text-slate-300"/>
                                    <span>{new Date(localTask.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                            )}

                        </div>
                        
                        <div className="w-[1px] h-5 bg-slate-200" />
                        
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200"
                        >
                            <X size={14} /> Cerrar
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN HEADER */}
            <header className="px-8 pt-8 pb-0 bg-white shrink-0">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col gap-3 flex-1 pr-8">
                        {/* Breadcrumb badge */}

                        {/* Editable Title */}
                        <h1
                            className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-tight focus:outline-none focus:ring-0 cursor-text"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                                const newTitle = e.currentTarget.textContent?.trim() || localTask.title;
                                if (newTitle !== localTask.title) {
                                    updateTask(localTask.id, { title: newTitle });
                                    setLocalTask(prev => ({ ...prev, title: newTitle }));
                                }
                            }}
                        >
                            {localTask.title}
                        </h1>
                    </div>


                </div>

                {/* TABS */}
                <nav className="flex gap-10 border-b border-slate-100">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'pb-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 transition-all relative',
                                activeTab === tab.id
                                    ? 'text-slate-900'
                                    : 'text-slate-400 hover:text-slate-600'
                            )}
                        >
                            <tab.icon size={15} className={activeTab === tab.id ? 'text-indigo-600' : 'text-current'} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabLine"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"
                                />
                            )}
                        </button>
                    ))}
                </nav>
            </header>

            {/* TAB CONTENT */}
            <main className="flex-1 overflow-y-auto bg-slate-50/40 custom-scrollbar">
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'content' && (
                            <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                                <ContentTab task={localTask} />
                            </motion.div>
                        )}
                        {activeTab === 'strategy' && (
                            <motion.div key="strategy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                                <StrategyTab task={localTask} />
                            </motion.div>
                        )}
                        {activeTab === 'seo' && (
                            <motion.div key="seo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                                <SEOTab task={localTask} />
                            </motion.div>
                        )}
                        {activeTab === 'images' && (
                            <motion.div key="images" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                                <ImagesTab task={localTask} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* FOOTER */}
            <footer className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sincronizado</span>
                    </div>
                    
                    <div className="h-4 w-px bg-slate-100" />
                    
                    <div className="flex items-center -space-x-1">
                        {[
                            { role: 'Creator', id: localTask.creator_id },
                            { role: 'Research', id: localTask.researcher_id },
                            { role: 'Writer', id: localTask.writer_id },
                            { role: 'Corrector', id: localTask.corrector_id },
                        ].map((credit, i) => {
                            const member = teamMembers.find(m => m.user_id === credit.id);
                            const name = member?.profile?.full_name?.split(' ')[0] || credit.role[0];
                            return (
                                <div key={i} title={`${credit.role}: ${member?.profile?.full_name || 'Sin asignar'}`} 
                                    className={cn(
                                        "w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black uppercase text-white shadow-sm transition-all",
                                        i === 0 ? "bg-indigo-500" : i === 1 ? "bg-emerald-500" : i === 2 ? "bg-amber-500" : "bg-violet-500",
                                        !credit.id && "bg-slate-200 grayscale scale-90"
                                    )}>
                                    {name[0]}
                                </div>
                            );
                        })}
                        <span className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo</span>
                    </div>

                    <div className="h-4 w-px bg-slate-100" />

                    {!localTask.assigned_to ? (
                        <button 
                            onClick={async () => { await claimTask(localTask.id); setLocalTask(prev => ({ ...prev, assigned_to: 'self' })); }}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                        >
                            Tomar Contenido
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            <User size={12} className="text-indigo-500" />
                            <span>Asignado a {teamMembers.find(m => m.user_id === localTask.assigned_to)?.profile?.full_name?.split(' ')[0] || 'Miembro'}</span>
                        </div>
                    )}

                    <div className="h-4 w-px bg-slate-100" />
                    
                    <button className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">
                        <Database size={13} /> Historial
                    </button>
                    <button 
                        onClick={async () => {
                            if (confirm('¿Estás seguro de que quieres eliminar este contenido permanentemente?')) {
                                await useProjectStore.getState().deleteTask(localTask.id);
                                onClose();
                            }
                        }}
                        className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={13} /> Eliminar
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 bg-slate-900 text-white rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all">
                        <ExternalLink size={12} /> Vista Previa
                    </button>
                    <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                        <Save size={12} /> Guardar Todo
                    </button>
                </div>
            </footer>
        </motion.div>
    );
}
