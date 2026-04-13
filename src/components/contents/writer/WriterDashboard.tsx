'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore, STATUS_LABELS, STATUS_COLORS } from '@/store/useProjectStore';
import { Button } from '@/components/dom/Button';
import { 
    Plus, FileText, Calendar, Clock, 
    ChevronRight
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';

export default function WriterDashboard() {
    const router = useRouter();
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
                        router.push("/contents/planner?action=new-research");
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
                {!activeProject ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-amber-50 rounded-[28px] flex items-center justify-center text-amber-500 border border-amber-100/50">
                            <Calendar size={40} />
                        </div>
                        <div className="max-w-xs">
                            <h3 className="text-lg font-bold text-slate-700 uppercase tracking-tight">Sin Proyecto Seleccionado</h3>
                            <p className="text-sm text-slate-400 mt-2 font-medium">Por favor, activa al menos un proyecto en la barra lateral para ver y gestionar tus contenidos.</p>
                        </div>
                    </div>
                ) : (!projectContents || projectContents.length === 0) ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-slate-100 rounded-[28px] flex items-center justify-center text-slate-300 border border-slate-200/50">
                            <FileText size={40} />
                        </div>
                        <div className="max-w-xs">
                            <h3 className="text-lg font-bold text-slate-700 uppercase tracking-tight">Escritorio Vacío</h3>
                            <p className="text-sm text-slate-400 mt-2 font-medium">Este proyecto no tiene tareas en redacción o los filtros están ocultando los artículos publicados.</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => setViewMode('setup')}
                            className="rounded-xl border-slate-200 font-bold uppercase text-[10px] tracking-widest"
                        >
                            Crear Primer Contenido
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {projectContents.map((content, idx) => (
                            <motion.div
                                key={content.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => loadContentById(content.id)}
                                className="group relative bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer transition-all duration-500 overflow-hidden"
                            >
                                {/* Decorative Gradient Blobs */}
                                <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-colors" />
                                <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyan-50/50 rounded-full blur-3xl group-hover:bg-cyan-100/50 transition-colors" />

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                                            STATUS_COLORS[content.status]?.bg || 'bg-slate-50',
                                            STATUS_COLORS[content.status]?.text || 'text-slate-600',
                                            STATUS_COLORS[content.status]?.border || 'border-slate-100/50'
                                        )}>
                                            <motion.div 
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                                                    STATUS_COLORS[content.status]?.dot || 'bg-slate-400'
                                                )} 
                                            />
                                            {STATUS_LABELS[content.status] || content.status.replace(/_/g, ' ')}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>

                                    <h3 className="text-base font-bold text-slate-800 line-clamp-3 mb-6 leading-tight group-hover:text-indigo-600 transition-colors min-h-[3rem]">
                                        {content.title}
                                    </h3>

                                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} className="text-slate-300" />
                                            <span>{new Date(content.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg group-hover:bg-indigo-50/50 group-hover:text-indigo-500 transition-colors">
                                            <FileText size={12} />
                                            <span>Editar</span>
                                        </div>
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
