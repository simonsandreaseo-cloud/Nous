import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, Activity, ListTodo, Loader2, Play, CheckCircle2, AlertCircle, Clock, Trash2 } from "lucide-react";
import { useQueueStore, QueueTask } from "@/store/useQueueStore";
import { cn } from "@/utils/cn";

function ConsoleLine({ text, type = 'info', timestamp }: { text: string, type?: 'info' | 'success' | 'error' | 'warning', timestamp: Date }) {
    const colorMap = {
        info: 'text-indigo-400',
        success: 'text-emerald-400',
        error: 'text-rose-400',
        warning: 'text-amber-400'
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3 font-mono text-[11px] mb-1.5"
        >
            <span className="text-slate-600 select-none shrink-0">{new Date(timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="text-slate-500 select-none shrink-0">❯</span>
            <span className={cn(colorMap[type], "leading-relaxed")}>{text}</span>
        </motion.div>
    );
}

export default function NousConsoleView() {
    const { queue, activeTask, isProcessingQueue, clearQueue, dequeueTask } = useQueueStore();
    const displayLogs = activeTask?.logs || [];

    const getStatusIcon = (status: QueueTask['status']) => {
        switch (status) {
            case 'pending': return <Clock size={14} className="text-slate-400" />;
            case 'processing': return <Loader2 size={14} className="text-indigo-400 animate-spin" />;
            case 'completed': return <CheckCircle2 size={14} className="text-emerald-400" />;
            case 'error': return <AlertCircle size={14} className="text-rose-400" />;
            default: return <Activity size={14} className="text-slate-400" />;
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-950 text-slate-300 h-full overflow-hidden relative">
            {/* Header */}
            <div className="h-14 border-b border-slate-800/60 flex items-center justify-between px-6 shrink-0 bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Terminal size={16} className="text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white flex items-center gap-2">
                            Consola Nous
                            {isProcessingQueue && (
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                            )}
                        </h1>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                            {isProcessingQueue ? "Motor de IA en ejecución" : "Motor de IA inactivo"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <Cpu size={14} />
                        <span>Core: v2.0.4</span>
                    </div>
                    {queue.length > 0 && (
                        <button 
                            onClick={() => clearQueue()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors border border-rose-500/20 text-[10px] font-bold uppercase tracking-widest"
                        >
                            <Trash2 size={12} />
                            Limpiar Cola
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Terminal View */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden relative">
                    {/* Active Task Dashboard */}
                    <div className="mb-6 shrink-0">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <Activity size={12} />
                            Proceso Actual
                        </h2>
                        
                        {activeTask ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                                {/* Decoraciones tipo terminal */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-50"></div>
                                
                                <div className="flex items-start justify-between relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">
                                                {activeTask.type}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">ID: {activeTask.id.substring(0,8)}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">{activeTask.title}</h3>
                                        {activeTask.description && (
                                            <p className="text-xs text-slate-400">{activeTask.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                                        {getStatusIcon(activeTask.status)}
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                                            {activeTask.status}
                                        </span>
                                    </div>
                                </div>

                                {activeTask.progress !== undefined && (
                                    <div className="mt-5">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                                            <span>Progreso de la tarea</span>
                                            <span className="text-indigo-400">{Math.round(activeTask.progress)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                            <motion.div 
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${activeTask.progress}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-8 text-center flex flex-col items-center justify-center border-dashed">
                                <Cpu size={32} className="text-slate-600 mb-3" />
                                <h3 className="text-sm font-bold text-slate-400 mb-1">Sistema Inactivo</h3>
                                <p className="text-xs text-slate-500">No hay tareas ejecutándose en este momento.</p>
                            </div>
                        )}
                    </div>

                    {/* Logs output */}
                    <div className="flex-1 bg-[#09090b] border border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar shadow-inner relative flex flex-col">
                        <div className="flex-1">
                            {displayLogs.length === 0 && !activeTask && (
                                <div className="text-slate-600 font-mono text-[11px] italic">
                                    Nous OS v2.0 initialized.<br/>
                                    Waiting for incoming tasks...
                                </div>
                            )}
                            {displayLogs.map(log => (
                                <ConsoleLine key={log.id} text={log.text} type={log.type} timestamp={log.timestamp} />
                            ))}
                            {isProcessingQueue && (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-slate-600 font-mono text-[11px]">Nous ~ $</span>
                                    <span className="w-2 h-3 bg-indigo-500 animate-pulse"></span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Queue */}
                <div className="w-80 border-l border-slate-800/60 bg-slate-900/30 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-800/60">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <ListTodo size={12} />
                            Cola de Tareas ({queue.length})
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        <AnimatePresence>
                            {queue.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-10"
                                >
                                    <ListTodo size={24} className="text-slate-700 mx-auto mb-2" />
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">La cola está vacía</p>
                                </motion.div>
                            ) : (
                                queue.map((task, index) => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-slate-900 border border-slate-800 p-3 rounded-lg group relative overflow-hidden"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                {getStatusIcon(task.status)}
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    {task.type}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => dequeueTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-all"
                                                title="Eliminar de la cola"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-200 leading-tight mb-1">{task.title}</h4>
                                        <p className="text-[10px] text-slate-500">{new Date(task.createdAt).toLocaleTimeString()}</p>
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
