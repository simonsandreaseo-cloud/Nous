import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, BrainCircuit, Box, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { PipelineBlock, usePipelineStore, AIModelType, AIProviderType } from '@/store/usePipelineStore';
import { STATUS_LABELS } from '@/store/useProjectStore';
import { cn } from '@/utils/cn';

interface PipelineBlockConfigProps {
    isOpen: boolean;
    onClose: () => void;
    block: PipelineBlock;
    workflowId: string;
    isStatusMode: boolean;
}

const AI_MODELS: { id: AIModelType; label: string; description: string; providerSpecific?: AIProviderType }[] = [
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', description: 'Flujos complejos y agentic workflows' },
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', description: 'Alta capacidad (Solo Vertex)', providerSpecific: 'vertex-ai' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', description: 'Tareas volumétricas de bajo costo' },
    { id: 'gemma-4-31b', label: 'Gemma 4 (31B)', description: 'Alta precisión local y razonamiento' },
    { id: 'gemma-4-26b-moe', label: 'Gemma 4 (26B MoE)', description: 'Velocidad y eficiencia' },
    { id: 'default', label: 'Por Defecto', description: 'Usa la configuración general' }
];

const AI_PROVIDERS: { id: AIProviderType; label: string }[] = [
    { id: 'auto', label: 'Automático' },
    { id: 'google-ai-studio', label: 'Google AI Studio' },
    { id: 'vertex-ai', label: 'Google Cloud Vertex AI' }
];

const RESEARCH_PHASES = [
    { id: 'serp', label: 'Análisis SERP' },
    { id: 'lsi', label: 'Palabras LSI' },
    { id: 'ask', label: 'Jerga / ASK' },
    { id: 'golden_kws', label: 'Golden KWs' },
    { id: 'metadata', label: 'Metadatos' },
    { id: 'interlinking', label: 'Interlinking' },
    { id: 'outline', label: 'Estructura (Outline)' }
];

export function PipelineBlockConfig({ isOpen, onClose, block, workflowId, isStatusMode }: PipelineBlockConfigProps) {
    const { updateBlock } = usePipelineStore();
    
    // Local state for the form so we don't dispatch on every keystroke until saved/closed
    const [localBlock, setLocalBlock] = useState<PipelineBlock>(block);

    // Sync if block prop changes (when opening another block)
    useEffect(() => {
        if (isOpen) setLocalBlock(block);
    }, [block, isOpen]);

    const handleSave = () => {
        // Prevent infinite loops in status mode
        if (isStatusMode && localBlock.inputStatus === localBlock.outputStatus && localBlock.inputStatus !== 'none') {
            alert("Error: El Estatus de Entrada y Salida no pueden ser el mismo en el Modo Estatus para evitar bucles infinitos.");
            return;
        }
        
        updateBlock(workflowId, block.id, {
            model: localBlock.model,
            chunkSize: localBlock.chunkSize,
            inputStatus: localBlock.inputStatus,
            outputStatus: localBlock.outputStatus,
            additionalConfig: localBlock.additionalConfig
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100"
                >
                    {/* Header */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <Settings size={16} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Configurar Tarea</h3>
                                <p className="text-[10px] text-slate-500 font-medium">Bloque: {block.actionType}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 bg-white rounded-full border border-slate-200">
                            <X size={14} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                        
                        {/* Status Config */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                                <SlidersHorizontal size={12} /> Flujo de Estatus
                            </h4>
                            
                            {isStatusMode && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Estatus de Entrada (Input)</label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        value={localBlock.inputStatus}
                                        onChange={(e) => setLocalBlock({ ...localBlock, inputStatus: e.target.value })}
                                    >
                                        <option value="none">-- Selecciona un Estatus --</option>
                                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                            <option key={`in-${val}`} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Estatus de Salida (Éxito)</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    value={localBlock.outputStatus}
                                    onChange={(e) => setLocalBlock({ ...localBlock, outputStatus: e.target.value })}
                                >
                                    <option value="none">No modificar (mantener actual)</option>
                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                        <option key={`out-${val}`} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {isStatusMode && localBlock.inputStatus !== 'none' && localBlock.inputStatus === localBlock.outputStatus && (
                                <div className="flex items-start gap-2 bg-rose-50 text-rose-600 p-3 rounded-xl border border-rose-100">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                    <p className="text-[10px] font-medium leading-relaxed">
                                        Error: En modo Estatus, el Estatus de Entrada y de Salida no pueden ser idénticos. Esto causaría un bucle infinito en la cola de procesamiento.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* IA Model Selection */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                                <BrainCircuit size={12} /> Motor de IA
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {AI_MODELS.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => setLocalBlock({ ...localBlock, model: model.id })}
                                        className={cn(
                                            "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                                            localBlock.model === model.id 
                                                ? "bg-indigo-50 border-indigo-200" 
                                                : "bg-white border-slate-200 hover:border-indigo-100 hover:bg-slate-50/50"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-xs font-bold",
                                            localBlock.model === model.id ? "text-indigo-700" : "text-slate-700"
                                        )}>{model.label}</span>
                                        <span className="text-[10px] text-slate-500 mt-0.5">{model.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Advanced (Chunks) */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                                <Box size={12} /> Procesamiento por Fragmentos (Chunks)
                            </h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-700">Tamaño del Fragmento</label>
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                        {localBlock.chunkSize} párrafos
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" max="10" step="1"
                                    value={localBlock.chunkSize}
                                    onChange={(e) => setLocalBlock({ ...localBlock, chunkSize: parseInt(e.target.value) })}
                                    className="w-full accent-indigo-500"
                                />
                                <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    Define la longitud de los fragmentos que se enviarán a la IA. Chunks más pequeños mejoran la precisión analítica pero aumentan el tiempo de proceso global.
                                </p>
                            </div>
                        </div>

                        {/* Extra Config for Research */}
                        {localBlock.actionType === 'research' && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                                    Modelos por Fase (Opcional)
                                </h4>
                                <p className="text-[10px] text-slate-500">Puedes especificar el modelo y proveedor de IA para cada fase de la investigación independientemente.</p>
                                <div className="space-y-2">
                                    {RESEARCH_PHASES.map((phase) => {
                                        const currentConfig = localBlock.additionalConfig?.phaseModels?.[phase.id] || { model: 'default', provider: 'auto' };
                                        
                                        return (
                                            <div key={phase.id} className="flex flex-col gap-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                                <span className="text-[10px] font-bold text-slate-700">{phase.label}</span>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select 
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none"
                                                        value={currentConfig.model}
                                                        onChange={(e) => {
                                                            const newModel = e.target.value;
                                                            const selectedModelObj = AI_MODELS.find(m => m.id === newModel);
                                                            const newProvider = selectedModelObj?.providerSpecific || currentConfig.provider;
                                                            
                                                            setLocalBlock({
                                                                ...localBlock,
                                                                additionalConfig: {
                                                                    ...localBlock.additionalConfig,
                                                                    phaseModels: {
                                                                        ...(localBlock.additionalConfig?.phaseModels || {}),
                                                                        [phase.id]: { ...currentConfig, model: newModel, provider: newProvider }
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        {AI_MODELS.map((model) => (
                                                            <option key={model.id} value={model.id}>{model.label}</option>
                                                        ))}
                                                    </select>
                                                    <select 
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none"
                                                        value={currentConfig.provider}
                                                        disabled={AI_MODELS.find(m => m.id === currentConfig.model)?.providerSpecific !== undefined}
                                                        onChange={(e) => {
                                                            setLocalBlock({
                                                                ...localBlock,
                                                                additionalConfig: {
                                                                    ...localBlock.additionalConfig,
                                                                    phaseModels: {
                                                                        ...(localBlock.additionalConfig?.phaseModels || {}),
                                                                        [phase.id]: { ...currentConfig, provider: e.target.value }
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        {AI_PROVIDERS.map((provider) => (
                                                            <option key={provider.id} value={provider.id}>{provider.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-2 shrink-0">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isStatusMode && localBlock.inputStatus === localBlock.outputStatus && localBlock.inputStatus !== 'none'}
                            className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
