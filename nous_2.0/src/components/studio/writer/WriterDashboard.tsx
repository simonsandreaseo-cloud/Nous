'use client';

import { useEffect } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { Button } from '@/components/dom/Button';
import { 
    Plus, FileText, Calendar, Clock, 
    ChevronRight, Search, LayoutGrid, List
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';

export default function WriterDashboard() {
    const { 
        projectContents, 
        loadProjectContents, 
        loadContentById,
        setViewMode,
        resetStrategy
    } = useWriterStore();
    const { activeProject } = useProjectStore();

    useEffect(() => {
        if (activeProject?.id) {
            loadProjectContents(activeProject.id);
        }
    }, [activeProject?.id, loadProjectContents]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden">
            {/* Header Area */}
            <header className="h-24 flex items-center justify-between px-10 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Escritorio Editorial</h1>
                    <p className="text-sm font-medium text-slate-500">Gestiona y redacta tus contenidos programados.</p>
                </div>

                <Button 
                    onClick={() => {
                        resetStrategy();
                        setViewMode('setup');
                    }}
                    className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 flex items-center gap-2 group transition-all"
                >
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={16} />
                    </div>
                    <span className="font-bold tracking-wide">Nuevo Contenido</span>
                </Button>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10">
                {projectContents.length === 0 ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-slate-100 rounded-[28px] flex items-center justify-center text-slate-300">
                            <FileText size={40} />
                        </div>
                        <div className="max-w-xs">
                            <h3 className="text-lg font-bold text-slate-700">No hay artículos aún</h3>
                            <p className="text-sm text-slate-400 mt-1">Comienza tu viaje editorial creando tu primer contenido con investigación SEO.</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => setViewMode('setup')}
                            className="rounded-xl border-slate-200"
                        >
                            Empezar ahora
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projectContents.map((content, idx) => (
                            <motion.div
                                key={content.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => loadContentById(content.id)}
                                className="group relative bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 cursor-pointer transition-all duration-300"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={cn(
                                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                        content.status === 'published' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                        content.status === 'drafting' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                        "bg-amber-50 text-amber-600 border-amber-100"
                                    )}>
                                        {content.status}
                                    </div>
                                    <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>

                                <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mb-3 leading-snug group-hover:text-indigo-600 transition-colors">
                                    {content.title}
                                </h3>

                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        <span>{new Date(content.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={12} />
                                        <span>Borrador</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
