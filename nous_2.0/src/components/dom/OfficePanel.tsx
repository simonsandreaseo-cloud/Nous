
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Clock, Plus, Play, Square, CheckCircle, Database, Zap, Activity, Filter } from "lucide-react";
import { useNodeStore } from "@/store/useNodeStore";
import { cn } from "@/utils/cn";
import { usePermissions } from "@/hooks/usePermissions";

export function OfficePanel() {
    const { flux, createTask, startTimer, stopTimer, refreshFlux, isConnected } = useNodeStore();
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isAddingTask, setIsAddingTask] = useState(false);
    const { canCreateOrDelete } = usePermissions();

    useEffect(() => {
        if (isConnected) {
            refreshFlux();
        }
    }, [isConnected, refreshFlux]);

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskTitle.trim()) {
            createTask(newTaskTitle, "SEO", "medium");
            setNewTaskTitle("");
            setIsAddingTask(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-[450px]"
        >
            {/* Brackets visually frames the panel */}
            <svg className="absolute top-0 left-0 w-[150px] h-[150px] pointer-events-none" viewBox="0 0 150 150" fill="none">
                <path d="M 150 0 H 32 Q 0 0 0 32 V 120" stroke="currentColor" strokeWidth="1" className="text-slate-300" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-[150px] h-[150px] pointer-events-none" viewBox="0 0 150 150" fill="none">
                <path d="M 0 150 H 118 Q 150 150 150 118 V 30" stroke="currentColor" strokeWidth="1" className="text-slate-300" />
            </svg>

            <div className="relative w-full rounded-[32px] bg-white/70 backdrop-blur-md border border-white/40 shadow-2xl p-8 min-h-[500px] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                            OFICINA <span className="text-cyan-500 font-medium text-xs tracking-widest border border-cyan-500/30 px-2 py-0.5 rounded-full bg-cyan-500/5">FLUX</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Ecosistema de Productividad</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
                        <Briefcase size={20} strokeWidth={1.5} />
                    </div>
                </div>

                {/* Chronos Engine (Timer Section) */}
                <div className="mb-8 p-6 rounded-lg bg-slate-900 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={80} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={12} className="text-cyan-400 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Chronos Engine</span>
                        </div>

                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter mb-1 font-mono">
                                    {flux.activeTimer ? "ACTIVO" : "00:00:00"}
                                </h3>
                                <p className="text-xs text-slate-400 truncate max-w-[200px]">
                                    {flux.activeTimer?.description || "Inicie una tarea para trackear tiempo"}
                                </p>
                            </div>

                            {flux.activeTimer ? (
                                <button
                                    onClick={() => stopTimer()}
                                    className="p-4 bg-red-500 hover:bg-red-600 rounded-md transition-all shadow-lg shadow-red-500/20 group/btn"
                                >
                                    <Square size={20} fill="white" className="group-hover/btn:scale-110 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    disabled
                                    className="p-4 bg-slate-800 text-slate-500 rounded-md cursor-not-allowed"
                                >
                                    <Play size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Nexus Tasks Section */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Nexus Tasks</h3>
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold">{flux.tasks.length}</span>
                        </div>
                        {canCreateOrDelete() && (
                            <button
                                onClick={() => setIsAddingTask(!isAddingTask)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-cyan-500 transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        )}
                    </div>

                    <AnimatePresence>
                        {isAddingTask && (
                            <motion.form
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                onSubmit={handleCreateTask}
                                className="mb-4"
                            >
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Nombre de la nueva tarea..."
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm outline-none focus:border-cyan-500/50 transition-all text-slate-700"
                                />
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {flux.tasks.length > 0 ? (
                            flux.tasks.map((task) => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    onPlay={() => startTimer(task.id, task.title)}
                                    isActive={flux.activeTimer?.taskId === task.id}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                                <Database size={40} className="mb-2 opacity-20" />
                                <p className="text-xs font-medium">No hay tareas en el Nexus</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Footer */}
                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100/50">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={12} className="text-purple-500" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Productividad</span>
                        </div>
                        <div className="text-lg font-black text-slate-800">
                            {flux.stats?.formattedTime || "0h 0m"}
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100/50">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle size={12} className="text-emerald-500" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completado</span>
                        </div>
                        <div className="text-lg font-black text-slate-800">
                            {flux.stats?.completedTasks || 0}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function TaskItem({ task, onPlay, isActive }: { task: any, onPlay: () => void, isActive: boolean }) {
    return (
        <motion.div
            layout
            className={cn(
                "group p-4 rounded-lg border transition-all flex items-center justify-between",
                isActive
                    ? "bg-cyan-50 border-cyan-100 shadow-sm"
                    : "bg-white border-slate-100 hover:border-slate-200"
            )}
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    task.priority === 'high' ? "bg-red-400" : task.priority === 'medium' ? "bg-amber-400" : "bg-slate-300"
                )} />
                <div className="min-w-0">
                    <h4 className={cn(
                        "text-sm font-bold truncate",
                        isActive ? "text-cyan-900" : "text-slate-700"
                    )}>
                        {task.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{task.category}</span>
                </div>
            </div>

            <button
                onClick={onPlay}
                disabled={isActive}
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    isActive
                        ? "bg-cyan-500 text-white"
                        : "text-slate-300 hover:text-slate-600 hover:bg-slate-100"
                )}
            >
                <Play size={14} fill={isActive ? "white" : "none"} />
            </button>
        </motion.div>
    );
}

