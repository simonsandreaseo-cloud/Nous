import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Plus, Settings, BrainCircuit, Activity, Trash2, 
    ArrowRight, ChevronDown, CheckCircle2, Play, Save, Box, Layers
} from 'lucide-react';
import { PipelineBlock, usePipelineStore, PipelineActionType, ExecutionMode } from '@/store/usePipelineStore';
import { useProjectStore, Task, STATUS_LABELS } from '@/store/useProjectStore';
import { PipelineBlockConfig } from './PipelineBlockConfig';
import { cn } from '@/utils/cn';

interface NousPipelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTaskIds: string[];
    onExecute: (blocks: PipelineBlock[], mode: ExecutionMode) => void;
}

const AVAILABLE_ACTIONS: { id: PipelineActionType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'research', label: 'Investigación', icon: <Activity size={16} />, color: 'bg-cyan-100 text-cyan-600' },
    { id: 'outline', label: 'Estructura', icon: <Layers size={16} />, color: 'bg-rose-100 text-rose-600' },
    { id: 'generate', label: 'Redacción', icon: <BrainCircuit size={16} />, color: 'bg-indigo-100 text-indigo-600' },
    { id: 'humanize', label: 'Humanizar', icon: <CheckCircle2 size={16} />, color: 'bg-emerald-100 text-emerald-600' },
    { id: 'clean', label: 'Limpiar HTML', icon: <Box size={16} />, color: 'bg-slate-100 text-slate-600' },
    { id: 'seo', label: 'SEO Data', icon: <Settings size={16} />, color: 'bg-amber-100 text-amber-600' }
];

export function NousPipelineModal({ isOpen, onClose, selectedTaskIds, onExecute }: NousPipelineModalProps) {
    const { 
        workflows, activeWorkflowId, executionMode, 
        setExecutionMode, setActiveWorkflow, updateWorkflowName, 
        createWorkflow, deleteWorkflow, addBlock, removeBlock 
    } = usePipelineStore();
    
    const { tasks } = useProjectStore();
    
    const [configBlock, setConfigBlock] = useState<PipelineBlock | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);

    const activeWorkflow = workflows[activeWorkflowId];

    // Predictive Counting Algorithm
    const predictiveCounts = useMemo(() => {
        if (!activeWorkflow) return [];
        if (executionMode === 'manual') {
            // Manual mode always uses the current selection count for every step
            return activeWorkflow.blocks.map(() => selectedTaskIds.length);
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
        onExecute(activeWorkflow.blocks, executionMode);
        onClose();
    };

    if (!isOpen || !activeWorkflow) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
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
                        <button onClick={onClose} className="absolute top-6 right-8 text-slate-400 hover:text-white transition-colors p-2 bg-slate-800 rounded-full">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Mode Selector */}
                    <div className="px-8 py-4 bg-slate-50 flex items-center gap-4 border-b border-slate-100 shrink-0">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Modo de Ejecución:</span>
                        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                            <button 
                                onClick={() => setExecutionMode('manual')}
                                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", executionMode === 'manual' ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50")}
                            >
                                Selección Manual ({selectedTaskIds.length})
                            </button>
                            <button 
                                onClick={() => setExecutionMode('status')}
                                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", executionMode === 'status' ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50")}
                            >
                                Cascada por Estatus
                            </button>
                            <button 
                                disabled
                                className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-300 opacity-50 cursor-not-allowed"
                                title="Próximamente"
                            >
                                Auto (IA Decide)
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-1 min-h-0">
                        {/* Available Blocks Sidebar */}
                        <div className="w-1/3 bg-slate-50/50 border-r border-slate-100 p-6 overflow-y-auto">
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
                        <div className="flex-1 bg-white p-6 overflow-y-auto relative">
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
                                onClick={onClose}
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
