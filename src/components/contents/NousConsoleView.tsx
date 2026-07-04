import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, Activity, ListTodo, Loader2, Play, CheckCircle2, AlertCircle, Clock, Trash2, LayoutGrid, Zap } from "lucide-react";
import { useQueueStore, QueueTask } from "@/store/useQueueStore";
import { cn } from "@/utils/cn";

function LogLine({ text, type = 'info', timestamp }: { text: string, type?: 'info' | 'success' | 'error' | 'warning', timestamp: Date }) {
    const colorMap = {
        info: 'text-slate-600',
        success: 'text-emerald-600 font-medium',
        error: 'text-rose-600 font-medium',
        warning: 'text-amber-600 font-medium'
    };

    const iconMap = {
        info: <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />,
        success: <CheckCircle2 size={12} className="text-emerald-500 mt-1 shrink-0" />,
        error: <AlertCircle size={12} className="text-rose-500 mt-1 shrink-0" />,
        warning: <AlertCircle size={12} className="text-amber-500 mt-1 shrink-0" />
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3 text-[12px] mb-2"
        >
            <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-400 font-mono text-[10px] select-none">
                    {new Date(timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {iconMap[type]}
            </div>
            <span className={cn(colorMap[type], "leading-relaxed break-words")}>{text}</span>
        </motion.div>
    );
}

export default function NousConsoleView() {
    const { queue, activeTask, isProcessingQueue, clearQueue, dequeueTask } = useQueueStore();
    const displayLogs = activeTask?.logs || [];

    const computedProgress = useMemo(() => {
        if (!activeTask) return 0;
        
        let totalChunks = 0;
        let currentChunk = 0;
        
        // Analizar logs buscando chunks
        for (const log of activeTask.logs) {
            const totalMatch = log.text.match(/dividido en (\d+) chunks/i);
            if (totalMatch) totalChunks = parseInt(totalMatch[1]);
            
            const currentMatch = log.text.match(/Chunk (\d+)\/(\d+)/i);
            if (currentMatch) {
                currentChunk = parseInt(currentMatch[1]);
                totalChunks = parseInt(currentMatch[2]);
            }
        }
        
        if (totalChunks > 0 && currentChunk > 0) {
            return Math.round((currentChunk / totalChunks) * 100);
        }
        
        return activeTask.progress || 0;
    }, [activeTask]);

    const getStatusIcon = (status: QueueTask['status']) => {
        switch (status) {
            case 'pending': return <Clock size={14} className="text-slate-400" />;
            case 'processing': return <Loader2 size={14} className="text-indigo-500 animate-spin" />;
            case 'completed': return <CheckCircle2 size={14} className="text-emerald-500" />;
            case 'error': return <AlertCircle size={14} className="text-rose-500" />;
            default: return <Activity size={14} className="text-slate-400" />;
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full overflow-hidden relative">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-8 shrink-0 bg-white">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm">
                        <Activity size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-slate-800 flex items-center gap-2">
                            Monitor de IA
                            {isProcessingQueue && (
                                <span className="flex h-2.5 w-2.5 relative ml-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                            )}
                        </h1>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            {isProcessingQueue ? "Ejecutando Pipeline Activo" : "Sistema inactivo"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <Cpu size={14} />
                        <span>Motor: Pipeline V1</span>
                    </div>
                    {queue.length > 0 && (
                        <button 
                            onClick={() => clearQueue()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors border border-rose-100 text-[11px] font-black uppercase tracking-widest"
                        >
                            <Trash2 size={14} />
                            Limpiar Cola
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Monitor View */}
                <div className="flex-1 flex flex-col p-8 overflow-hidden relative">
                    {/* Active Task Dashboard */}
                    <div className="mb-6 shrink-0">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Zap size={14} className="text-indigo-500" />
                            Tarea en Progreso
                        </h2>
                        
                        {activeTask ? (
                            <div className="bg-white border border-slate-200/60 shadow-lg shadow-slate-200/20 rounded-2xl p-6 relative overflow-hidden">
                                {/* Decoración de fondo */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 via-purple-50 to-transparent rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                
                                <div className="flex items-start justify-between relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                                {activeTask.type}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">ID: {activeTask.id.substring(0,8)}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-1">{activeTask.title}</h3>
                                        {activeTask.description && (
                                            <p className="text-sm text-slate-500">{activeTask.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                                        {getStatusIcon(activeTask.status)}
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                                            {activeTask.status}
                                        </span>
                                    </div>
                                </div>

                                {activeTask.progress !== undefined && (
                                    <div className="mt-6">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Progreso Total
                                            </span>
                                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                                                {computedProgress}%
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                                            <motion.div 
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${computedProgress}%` }}
                                                transition={{ duration: 0.5, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-10 text-center flex flex-col items-center justify-center border-dashed">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                                    <Cpu size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-base font-black text-slate-700 mb-2">Sistema Inactivo</h3>
                                <p className="text-sm text-slate-400">No hay tareas ejecutándose en este momento.</p>
                            </div>
                        )}
                    </div>

                    {/* Logs output */}
                    <div className="flex-1 bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 overflow-y-auto custom-scrollbar relative flex flex-col">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Terminal size={12} />
                            Registro de Operaciones
                        </h3>
                        <div className="flex-1">
                            {displayLogs.length === 0 && !activeTask && (
                                <div className="text-slate-400 text-sm italic flex flex-col items-center justify-center h-full gap-2">
                                    <LayoutGrid size={24} className="text-slate-200" />
                                    <span>Esperando tareas...</span>
                                </div>
                            )}
                            {displayLogs.map(log => (
                                <LogLine key={log.id} text={log.text} type={log.type} timestamp={log.timestamp} />
                            ))}
                            {isProcessingQueue && (
                                <div className="flex items-center gap-3 mt-4 text-slate-400 text-sm font-medium">
                                    <Loader2 size={14} className="animate-spin text-indigo-400" />
                                    <span>Procesando...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Queue */}
                <div className="w-[340px] border-l border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
                    <div className="p-6 border-b border-slate-200 bg-white">
                        <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                            <ListTodo size={14} className="text-indigo-500" />
                            Cola de Espera ({queue.length})
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        <AnimatePresence>
                            {queue.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12"
                                >
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                                        <ListTodo size={24} className="text-slate-300" />
                                    </div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">La cola está vacía</p>
                                </motion.div>
                            ) : (
                                queue.map((task, index) => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl group relative overflow-hidden transition-all hover:shadow-md hover:border-indigo-200"
                                    >
                                        {task.id === activeTask?.id && (
                                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                                        )}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(task.status)}
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest",
                                                    task.status === 'processing' ? "text-indigo-600" : "text-slate-500"
                                                )}>
                                                    {task.type}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => dequeueTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Eliminar de la cola"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 leading-snug mb-1">{task.title}</h4>
                                        <p className="text-[11px] font-medium text-slate-400">{new Date(task.createdAt).toLocaleTimeString()}</p>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
