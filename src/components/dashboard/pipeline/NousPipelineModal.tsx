import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Settings, Search, Filter, BrainCircuit, Activity, Trash2, 
    ArrowRight, ChevronDown, CheckCircle2, Play, Save, Box, Layers,
    Scissors, Image as ImageIcon, Languages, Wand2, LayoutTemplate
} from 'lucide-react';
import { PipelineBlock, usePipelineStore, PipelineActionType, ExecutionMode, ExecutionStrategy } from '@/store/usePipelineStore';
import { useProjectStore, Task, STATUS_LABELS } from '@/store/useProjectStore';
import { PipelineBlockConfig } from './PipelineBlockConfig';
import { cn } from '@/utils/cn';
import { useQueueStore, QueueTask } from '@/store/useQueueStore';

interface NousPipelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTaskIds: string[];
    onExecute: (blocks: PipelineBlock[], mode: ExecutionMode, strategy: ExecutionStrategy, finalTargetIds?: string[], finalStatus?: string) => void;
}

const AVAILABLE_ACTIONS: { id: PipelineActionType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'research', label: 'Investigación', icon: <Activity size={16} />, color: 'bg-cyan-100 text-cyan-600' },
    { id: 'outline', label: 'Estructura', icon: <Layers size={16} />, color: 'bg-rose-100 text-rose-600' },
    { id: 'generate', label: 'Redacción', icon: <BrainCircuit size={16} />, color: 'bg-indigo-100 text-indigo-600' },
    { id: 'humanize', label: 'Humanizar', icon: <CheckCircle2 size={16} />, color: 'bg-emerald-100 text-emerald-600' },
    { id: 'surgical_edit', label: 'Edición Quirúrgica', icon: <Scissors size={16} />, color: 'bg-fuchsia-100 text-fuchsia-600' },
    { id: 'clean', label: 'Limpiar HTML', icon: <Box size={16} />, color: 'bg-slate-100 text-slate-600' },
    { id: 'seo', label: 'SEO Data', icon: <Settings size={16} />, color: 'bg-amber-100 text-amber-600' },
    { id: 'image', label: 'Imágenes', icon: <ImageIcon size={16} />, color: 'bg-blue-100 text-blue-600' },
    { id: 'translation', label: 'Traducción', icon: <Languages size={16} />, color: 'bg-violet-100 text-violet-600' },
    { id: 'refine', label: 'Refinamiento', icon: <Wand2 size={16} />, color: 'bg-pink-100 text-pink-600' },
    { id: 'custom_transform', label: 'Maquetador', icon: <LayoutTemplate size={16} />, color: 'bg-orange-100 text-orange-600' }
];

export function NousPipelineModal({ isOpen, onClose, selectedTaskIds, onExecute }: NousPipelineModalProps) {
    const { 
        workflows, activeWorkflowId, executionMode, executionStrategy,
        setExecutionMode, setExecutionStrategy, setActiveWorkflow, updateWorkflowName, 
        createWorkflow, deleteWorkflow, addBlock, removeBlock 
    } = usePipelineStore();
    
    const { tasks, activeProject, addTask } = useProjectStore();
    
    const [configBlock, setConfigBlock] = useState<PipelineBlock | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    
    // UI Layout States
    const [localSelectedIds, setLocalSelectedIds] = useState(selectedTaskIds);
    const [selectedStatus, setSelectedStatus] = useState('por_redactar');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Quick Create States
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [quickTitle, setQuickTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    
    // Execution Monitor State
    const [isExecuting, setIsExecuting] = useState(false);
    const { queue, activeTask, enqueueTask, isProcessingQueue, batchTotalTasks, batchCompletedTasks, isPaused, togglePause } = useQueueStore();

    const activeWorkflow = workflows[activeWorkflowId];
    
    // Dynamic Statuses
    const customStatuses = useMemo(() => {
        const defaults = Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label }));
        const projectCustoms = activeProject?.settings?.content_preferences?.custom_statuses || [];
        const customObjs = projectCustoms.map(s => typeof s === 'string' ? { id: s.toLowerCase().replace(/\\s+/g, '_'), label: s } : s);
        return [...defaults, ...customObjs];
    }, [activeProject]);

    // Target Tasks based on mode
        const targetTasks = useMemo(() => {
        let list = tasks;
        if (executionMode === 'status') {
            list = tasks.filter(t => t.status === selectedStatus);
        }
        
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(t => 
                (t.title || '').toLowerCase().includes(q) || 
                (t.target_keyword || '').toLowerCase().includes(q)
            );
        }
        
        return list;
    }, [executionMode, tasks, selectedStatus, searchQuery]);

    const toggleTaskSelection = (id) => {
        setLocalSelectedIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const handleQuickCreate = async () => {
        if (!quickTitle.trim() || !activeProject) return;
        setIsCreating(true);
        try {
            const res = await addTask({
                project_id: activeProject.id,
                title: quickTitle,
                status: executionMode === 'status' ? selectedStatus : 'idea',
                scheduled_date: new Date().toISOString()
            });
            if (res.data) {
                setQuickTitle('');
                setIsQuickCreateOpen(false);
                if (executionMode === 'manual') {
                    setLocalSelectedIds(prev => [...prev, res.data.id]);
                }
            }
        } finally {
            setIsCreating(false);
        }
    };


    // Predictive Counting Algorithm
    const predictiveCounts = useMemo(() => {
        if (!activeWorkflow) return [];
        if (executionMode === 'manual') {
            // Manual mode always uses the current selection count for every step
            return activeWorkflow.blocks.map(() => localSelectedIds.length);
        }

        // Status mode simulation
        const taskStatuses = tasks.reduce((acc, task) => {
            acc[task.id] = task.status;
            return acc;
        }, {} as Record<string, string>);

        const counts: number[] = [];
        for (const block of activeWorkflow.blocks) {
            if (block.inputStatus === 'none') {
                counts.push(0);
                continue;
            }

            let matchCount = 0;
            const matchedIds: string[] = [];
            for (const [taskId, status] of Object.entries(taskStatuses)) {
                if (status === block.inputStatus) {
                    matchCount++;
                    matchedIds.push(taskId);
                }
            }
            counts.push(matchCount);

            // Simulate the transition
            if (block.outputStatus !== 'none') {
                for (const id of matchedIds) {
                    taskStatuses[id] = block.outputStatus;
                }
            }
        }
        return counts;
    }, [activeWorkflow, executionMode, tasks, selectedTaskIds]);

    const handleAddBlock = (actionId: PipelineActionType) => {
        if (!activeWorkflowId) return;
        addBlock(activeWorkflowId, {
            actionType: actionId,
            model: 'default',
            inputStatus: 'none',
            outputStatus: 'none',
            chunkSize: 4
        });
    };

    const handleExecute = () => {
        if (!activeWorkflow || activeWorkflow.blocks.length === 0) return;
        onExecute(activeWorkflow.blocks, executionMode, executionStrategy, localSelectedIds, selectedStatus);
        setIsExecuting(true);
    };

    const handleClose = () => {
        setIsExecuting(false);
        onClose();
    };

    // Calcular Progreso Global
    const currentTaskProgress = activeTask?.progress || 0;
    let globalProgress = 0;
    if (batchTotalTasks > 0) {
        globalProgress = ((batchCompletedTasks / batchTotalTasks) * 100) + (currentTaskProgress / 100) * (100 / batchTotalTasks);
    }
    if (globalProgress >= 100 && isProcessingQueue) {
        globalProgress = 99.99; // Never show 100% until truly done
    }
    const completedContribution = globalProgress;
    const formattedContribution = globalProgress.toFixed(2);
    
    // Capear a 99.99% mientras procesa
    let displayProgress = globalProgress;
    if (!isProcessingQueue && batchTotalTasks > 0 && batchCompletedTasks >= batchTotalTasks) {
        displayProgress = 100;
    }
    
    const displayProgressStr = displayProgress.toFixed(2);

    if (!isOpen || !activeWorkflow) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[32px] shadow-2xl w-full max-w-[1300px] max-h-[90vh] overflow-hidden flex flex-col relative"
                >
                    {/* Header */}
                    <div className="px-8 py-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <BrainCircuit className="text-white" size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 relative">
                                    {isEditingName ? (
                                        <input 
                                            autoFocus
                                            type="text" 
                                            value={activeWorkflow.name}
                                            onChange={(e) => updateWorkflowName(activeWorkflowId, e.target.value)}
                                            onBlur={() => setIsEditingName(false)}
                                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                            className="bg-slate-800 text-white font-black text-xl px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    ) : (
                                        <h2 
                                            onClick={() => setIsEditingName(true)}
                                            className="text-xl font-black tracking-tight cursor-pointer hover:text-indigo-300 transition-colors"
                                        >
                                            {activeWorkflow.name}
                                        </h2>
                                    )}
                                    <div className="relative">
                                        <button 
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            <ChevronDown size={16} className="text-slate-400" />
                                        </button>
                                        {isDropdownOpen && (
                                            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-50 border border-slate-100 py-2">
                                                <div className="px-3 pb-2 mb-2 border-b border-slate-100">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workflows Guardados</span>
                                                </div>
                                                {Object.values(workflows).map(wf => (
                                                    <div key={wf.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 group">
                                                        <button 
                                                            className="flex-1 text-left text-xs font-semibold text-slate-700"
                                                            onClick={() => { setActiveWorkflow(wf.id); setIsDropdownOpen(false); }}
                                                        >
                                                            {wf.name}
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteWorkflow(wf.id)}
                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="px-3 mt-2 pt-2 border-t border-slate-100">
                                                    <button 
                                                        onClick={() => { createWorkflow(); setIsDropdownOpen(false); }}
                                                        className="w-full flex items-center justify-center gap-2 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                                                    >
                                                        <Plus size={12} /> Crear Nuevo
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className="text-slate-400 text-xs mt-1">Motor de Orquestación Visual Nous AI</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="absolute top-6 right-8 text-slate-400 hover:text-white transition-colors p-2 bg-slate-800 rounded-full">
                            <X size={18} />
                        </button>
                    </div>

                    {isExecuting ? (
                        <div className="flex-1 bg-white p-8 flex flex-col relative overflow-y-auto">
                            {/* Glowing background effect */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
                            
                            <div className="relative z-10 flex flex-col h-full overflow-y-auto">
                                <div className="text-center mb-10">
                                    <h3 className="text-2xl font-black text-slate-800 mb-2">Ejecución en Progreso</h3>
                                    <p className="text-slate-500 font-medium">
                                        {isPaused ? (
                                            <span className="text-amber-500 font-bold flex items-center justify-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                Ejecución en Pausa - Pausado (o terminará operación actual)
                                            </span>
                                        ) : (
                                            `Nous AI está procesando tu pipeline (Paso ${batchCompletedTasks + 1} de ${batchTotalTasks || 1})`
                                        )}
                                    </p>
                                </div>
                                
                                <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
                                    {activeTask ? (
                                        <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 transform transition-all">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                                                    <BrainCircuit className="text-indigo-600" size={24} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-lg font-bold text-slate-800 truncate">{activeTask.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                            {activeTask.type === 'seo' || activeTask.type === 'research' ? 'Investigando...' : 
                                                             activeTask.type === 'generate' ? 'Generando...' : 
                                                             activeTask.type === 'humanize' ? 'Humanizando...' : 
                                                             activeTask.type === 'surgical_edit' ? 'Editando...' : 'Procesando...'}
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-400">
                                                            {queue.length} tareas pendientes
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Global Progress Bar */}
                                            <div className="mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm">
                                                <div className="flex items-center justify-between text-xs font-bold mb-3">
                                                    <span className="text-slate-600 uppercase tracking-wider">Progreso Global del Lote</span>
                                                    <span className="text-indigo-600 text-sm">{displayProgressStr}%</span>
                                                </div>
                                                <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 relative transition-all duration-500 ease-out"
                                                        style={{ width: `${displayProgress}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_ease-in-out_infinite]" />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                    <span>{batchCompletedTasks} Tareas Completadas</span>
                                                    <span>{batchTotalTasks} Operaciones en Total</span>
                                                </div>
                                            </div>

                                            {/* Specific Progress Bar */}
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between text-xs font-bold mb-2">
                                                    <span className="text-slate-500">Progreso de la Tarea Actual</span>
                                                    <span className="text-indigo-600">{activeTask.progress || 0}%</span>
                                                </div>
                                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 relative transition-all duration-300 ease-out"
                                                        style={{ width: `${activeTask.progress || 0}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Last Log */}
                                            {activeTask.logs && activeTask.logs.length > 0 && (
                                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mt-6">
                                                    <div className="flex items-start gap-3">
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                                            activeTask.logs[activeTask.logs.length - 1].type === 'error' ? 'bg-rose-100 text-rose-600' :
                                                            activeTask.logs[activeTask.logs.length - 1].type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                                            'bg-blue-100 text-blue-600'
                                                        )}>
                                                            <Activity size={12} />
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                                            {activeTask.logs[activeTask.logs.length - 1].text}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            {queue.length === 0 ? (
                                                <>
                                                    <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                                                    <h4 className="text-xl font-bold text-slate-800 mb-2">¡Pipeline Completado!</h4>
                                                    <p className="text-slate-500">Todas las tareas han sido procesadas exitosamente.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Activity size={48} className="animate-pulse mb-4 opacity-50" />
                                                    <p className="font-medium">Esperando siguiente tarea...</p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Live Metrics Panel */}
                                    <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-5 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none" />
                                            
                                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                                    <Activity className="text-indigo-400" size={16} />
                                                </div>
                                                <h4 className="text-white font-bold tracking-wide">Métricas en Vivo</h4>
                                            </div>

                                            <div className="space-y-3 relative z-10">
                                                {activeTask?.metrics && Object.keys(activeTask.metrics).length > 0 ? (
                                                    Object.entries(activeTask.metrics).map(([key, value]) => (
                                                        <div key={key} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between group hover:bg-slate-800 transition-colors">
                                                            <span className="text-sm font-medium text-slate-300">{key}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg font-black text-white">{value}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                                        <div className="w-10 h-10 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
                                                        <p className="text-sm font-medium text-center">Esperando datos<br/>del orquestador...</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 flex justify-center gap-4">
                                    <button 
                                        onClick={togglePause}
                                        className={`px-8 py-3 rounded-2xl text-sm font-bold shadow-sm transition-all transform hover:-translate-y-0.5 ${
                                            isPaused 
                                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30' 
                                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                        }`}
                                    >
                                        {isPaused ? 'Reanudar Ejecución' : 'Pausar Ejecución'}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            useQueueStore.getState().setIsProcessingQueue(false);
                                            useQueueStore.getState().clearQueue();
                                            handleClose();
                                        }}
                                        className="px-8 py-3 rounded-2xl text-sm font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 transition-colors"
                                    >
                                        Cancelar Ejecución
                                    </button>
                                    <button 
                                        onClick={handleClose}
                                        className="px-8 py-3 rounded-2xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                                    >
                                        Cerrar y ver en consola
                                    </button>
                                </div>
                            </div>
                    ) : (
                        <>
                            {/* Mode Selector + Strategy Toggle — single compact bar */}
                            <div className="px-8 py-3 bg-slate-50 flex items-center gap-4 border-b border-slate-100 shrink-0">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">Modo:</span>
                                <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                                    <button 
                                        onClick={() => setExecutionMode('manual')}
                                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", executionMode === 'manual' ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50")}
                                    >
                                        Manual ({localSelectedIds.length})
                                    </button>
                                    <button 
                                        onClick={() => setExecutionMode('status')}
                                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", executionMode === 'status' ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50")}
                                    >
                                        Por Estatus
                                    </button>
                                    <button 
                                        disabled
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 opacity-50 cursor-not-allowed"
                                        title="Próximamente"
                                    >
                                        Auto (IA)
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="h-5 w-px bg-slate-200 shrink-0" />

                                {/* Strategy Toggle — inline, compact */}
                                <button
                                    onClick={() => setExecutionStrategy(executionStrategy === 'by-type' ? 'by-content' : 'by-type')}
                                    className="flex items-center gap-2 group"
                                    title={executionStrategy === 'by-type' ? 'En Olas: completa cada etapa para todos los contenidos' : 'Uno a Uno: lleva cada contenido a su estado final'}
                                >
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition-colors select-none">
                                        {executionStrategy === 'by-type' ? '🌊 En Olas' : '🎯 Uno a Uno'}
                                    </span>
                                    <div className={cn(
                                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                        executionStrategy === 'by-content' ? 'bg-indigo-600' : 'bg-slate-300'
                                    )}>
                                        <span className={cn(
                                            'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform',
                                            executionStrategy === 'by-content' ? 'translate-x-[18px]' : 'translate-x-[3px]'
                                        )} />
                                    </div>
                                </button>
                            </div>

                    <div className="flex flex-1 min-h-0 bg-slate-50/30">
                        {/* Zone 1: Contenidos Objetivo */}
                        <div className="w-[280px] md:w-[320px] bg-white border-r border-slate-100 flex flex-col shrink-0 z-10 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                    Contenidos 
                                    <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{targetTasks.length}</span>
                                </h3>
                            </div>
                            
                            {/* Quick Create Button / Form */}
                            <div className="p-4 border-b border-slate-100">
                                {isQuickCreateOpen ? (
                                    <div className="space-y-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                        <input 
                                            type="text" 
                                            autoFocus
                                            placeholder="Título del artículo..."
                                            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={quickTitle}
                                            onChange={e => setQuickTitle(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleQuickCreate()}
                                            disabled={isCreating}
                                        />
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleQuickCreate}
                                                disabled={!quickTitle || isCreating}
                                                className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                            >
                                                {isCreating ? 'Creando...' : 'Añadir'}
                                            </button>
                                            <button 
                                                onClick={() => setIsQuickCreateOpen(false)}
                                                className="px-3 py-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsQuickCreateOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 rounded-xl text-sm font-bold transition-colors"
                                    >
                                        <Plus size={16} /> Crear nuevo
                                    </button>
                                )}
                            </div>

                            
                            {/* Search and Filter */}
                            <div className="px-4 pb-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar contenido..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    />
                                </div>
                                <button className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-lg hover:border-indigo-300 transition-colors shadow-sm">
                                    <Filter size={14} />
                                </button>
                            </div>
                            
                            {/* Dynamic Status Selector (if status mode) */}
                            {executionMode === 'status' && (
                                <div className="p-4 border-b border-slate-100 bg-indigo-50/30">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                        Estatus de Origen
                                    </label>
                                    <select 
                                        value={selectedStatus}
                                        onChange={e => setSelectedStatus(e.target.value)}
                                        className="w-full text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {customStatuses.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Task List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                                {targetTasks.map(task => (
                                    <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 group transition-colors">
                                        {executionMode === 'manual' && (
                                            <input 
                                                type="checkbox" 
                                                checked={localSelectedIds.includes(task.id)}
                                                onChange={() => toggleTaskSelection(task.id)}
                                                className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{task.title || 'Sin Título'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate">
                                                    {customStatuses.find(s => s.id === task.status)?.label || task.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {targetTasks.length === 0 && (
                                    <div className="p-8 text-center text-sm text-slate-400 font-medium">
                                        No hay contenidos para procesar.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Zone 2: Available Blocks Sidebar */}
                        <div className="w-[260px] bg-slate-50/50 border-r border-slate-100 p-6 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 shrink-0">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Acciones Disponibles</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {AVAILABLE_ACTIONS.map(action => (
                                    <div key={action.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", action.color)}>
                                                {action.icon}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{action.label}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleAddBlock(action.id)}
                                            className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all transform group-hover:scale-110"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pipeline Area */}
                        <div className="flex-1 bg-white p-6 overflow-y-auto relative [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Secuencia del Pipeline</h3>
                            
                            {activeWorkflow.blocks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                                    <BrainCircuit size={48} className="opacity-20" />
                                    <p className="text-sm font-medium">Agrega bloques desde el panel izquierdo para construir el pipeline.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeWorkflow.blocks.map((block, index) => {
                                        const actionDef = AVAILABLE_ACTIONS.find(a => a.id === block.actionType);
                                        const expectedCount = predictiveCounts[index] || 0;
                                        
                                        return (
                                            <div key={block.id} className="relative">
                                                {/* Connector Line */}
                                                {index > 0 && (
                                                    <div className="absolute -top-4 left-6 w-0.5 h-4 bg-slate-200" />
                                                )}
                                                
                                                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                                                    {/* Step Number */}
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-black shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    
                                                    {/* Icon */}
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", actionDef?.color)}>
                                                        {actionDef?.icon}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-slate-800">{actionDef?.label}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate">
                                                                {block.model}
                                                            </span>
                                                            {executionMode === 'status' && (
                                                                <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                    {STATUS_LABELS[block.inputStatus] || 'Sin entrada'} <ArrowRight size={10} /> {STATUS_LABELS[block.outputStatus] || 'Mantener'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Predictive Counter */}
                                                    <div className="flex flex-col items-center justify-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                        <span className="text-lg font-black text-slate-700">{expectedCount}</span>
                                                        <span className="text-[8px] uppercase font-bold text-slate-400 tracking-widest">Items</span>
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button 
                                                            onClick={() => setConfigBlock(block)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors"
                                                            title="Configurar bloque"
                                                        >
                                                            <Settings size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => removeBlock(activeWorkflowId, block.id)}
                                                            className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors"
                                                            title="Eliminar bloque"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Credit Calculator Area */}
                    <div className="bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-between shrink-0 rounded-b-[32px]">
                        <div className="flex items-center gap-6">
                            <div>
                                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Costo Estimado</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-xl font-black text-slate-800">
                                        ~{predictiveCounts.reduce((a, b) => a + b, 0) * 15}
                                    </span>
                                    <span className="text-sm font-medium text-slate-500">Créditos IA</span>
                                </div>
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div>
                                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total de Operaciones</span>
                                <span className="text-lg font-bold text-slate-700">
                                    {predictiveCounts.reduce((a, b) => a + b, 0)} <span className="text-xs text-slate-500 font-normal">tareas en cola</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleClose}
                                className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleExecute}
                                disabled={activeWorkflow.blocks.length === 0 || predictiveCounts.reduce((a, b) => a + b, 0) === 0}
                                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                <Play size={16} fill="currentColor" /> Ejecutar Pipeline
                            </button>
                        </div>
                    </div>
                    </>
                    )}
                </motion.div>
            </div>

            {/* Nested Config Modal */}
            {configBlock && (
                <PipelineBlockConfig 
                    isOpen={!!configBlock}
                    onClose={() => setConfigBlock(null)}
                    block={configBlock}
                    workflowId={activeWorkflowId}
                    isStatusMode={executionMode === 'status'}
                />
            )}
        </AnimatePresence>
    );
}
