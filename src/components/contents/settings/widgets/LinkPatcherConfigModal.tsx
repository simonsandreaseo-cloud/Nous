"use client";

import { useState, useEffect, useRef } from "react";
import { 
    X, 
    Link as LinkIcon,
    Plus, 
    Save,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Beaker,
    ArrowRight,
    Play,
    Loader2,
    Check,
    AlertCircle,
    Info,
    ChevronRight,
    Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { LinkPatcherService } from "@/lib/services/link-patcher";
import { useProjectStore } from "@/store/useProjectStore";
import type { CustomWidget } from "@/types/project";

interface LinkPatcherConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    widget: CustomWidget;
    onUpdate: (updates: Partial<CustomWidget>) => void;
}

export function LinkPatcherConfigModal({ isOpen, onClose, widget, onUpdate }: LinkPatcherConfigModalProps) {
    const [localRules, setLocalRules] = useState<{ regex: string; replacement: string }[]>([]);
    const [localName, setLocalName] = useState("");
    const [integrations, setIntegrations] = useState({
        internal_linking: false,
        translator: false,
        writer: false,
        extractor: { enabled: false, target_extractor_id: "" }
    });
    const [testUrl, setTestUrl] = useState("");
    const [testResult, setTestResult] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    
    // Existing extractors for the dropdown
    const { activeProject } = useProjectStore();
    const availableExtractors = activeProject?.custom_widgets?.filter(w => w.type === 'nous_extractor') || [];
    
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            setLocalRules(widget.config?.rules || []);
            setLocalName(widget.name || "Link Patcher");
            setIntegrations(widget.config?.integrations || {
                internal_linking: false,
                translator: false,
                writer: false,
                extractor: { enabled: false, target_extractor_id: "" }
            });
            setHasChanges(false);
            wasOpenRef.current = true;
        } 
        if (!isOpen) wasOpenRef.current = false;
    }, [isOpen, widget.config?.rules, widget.name, widget.config?.integrations]);

    const addRule = () => {
        setLocalRules([...localRules, { regex: "", replacement: "" }]);
        setHasChanges(true);
    };

    const updateRule = (index: number, updates: { regex?: string; replacement?: string }) => {
        const newRules = [...localRules];
        newRules[index] = { ...newRules[index], ...updates };
        setLocalRules(newRules);
        setHasChanges(true);
    };

    const removeRule = (index: number) => {
        setLocalRules(localRules.filter((_, i) => i !== index));
        setHasChanges(true);
    };

    const handleSaveChanges = () => {
        onUpdate({ 
            name: localName,
            config: { 
                ...widget.config, 
                rules: localRules,
                integrations 
            } 
        });
        setHasChanges(false);
    };

    const handleTest = () => {
        if (!testUrl) return;
        const result = LinkPatcherService.patchUrl(testUrl, localRules);
        setTestResult(result);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className="bg-white w-full max-w-5xl max-h-[85vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-white/20"
                    >
                        {/* Header */}
                        <div className="p-8 px-10 flex items-center justify-between border-b border-slate-50 shrink-0 bg-slate-50/50">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                    <LinkIcon size={24} />
                                </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="text"
                                                value={localName}
                                                onChange={(e) => {
                                                    setLocalName(e.target.value);
                                                    setHasChanges(true);
                                                }}
                                                className="text-xl font-black text-slate-900 uppercase italic tracking-tight bg-transparent border-none outline-none focus:ring-0 p-0 hover:bg-slate-100/50 rounded-lg transition-colors px-2 -ml-2"
                                                placeholder="Nombre del Patcher..."
                                            />
                                            {hasChanges && (
                                                <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-full border border-amber-100 flex items-center gap-1.5 animate-pulse">
                                                    <AlertCircle size={10} /> Cambios sin guardar
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Normalización Dinámica de Enlaces (Regex Mode)</p>
                                    </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {hasChanges && (
                                    <button 
                                        onClick={handleSaveChanges}
                                        className="h-11 px-6 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 shadow-xl shadow-emerald-100 ring-4 ring-emerald-500/5 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <Save size={16} />
                                        Guardar Reglas
                                    </button>
                                )}
                                <button onClick={onClose} className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Rules Editor */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 space-y-4">
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Integración de Procesos</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'internal_linking', label: 'Enlazado Interno' },
                                                { id: 'translator', label: 'Traductor' },
                                                { id: 'writer', label: 'Redactor' },
                                                { id: 'extractor', label: 'Extractor' }
                                            ].map((proc) => (
                                                <label key={proc.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 cursor-pointer hover:bg-emerald-50/10 transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={proc.id === 'extractor' ? integrations.extractor.enabled : (integrations as any)[proc.id]}
                                                        onChange={(e) => {
                                                            if (proc.id === 'extractor') {
                                                                setIntegrations({ ...integrations, extractor: { ...integrations.extractor, enabled: e.target.checked } });
                                                            } else {
                                                                setIntegrations({ ...integrations, [proc.id]: e.target.checked });
                                                            }
                                                            setHasChanges(true);
                                                        }}
                                                        className="w-4 h-4 rounded-md border-slate-200 text-emerald-600 focus:ring-emerald-500/20"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{proc.label}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {integrations.extractor.enabled && (
                                            <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular con Extractor:</label>
                                                <select 
                                                    value={integrations.extractor.target_extractor_id}
                                                    onChange={(e) => {
                                                        setIntegrations({ 
                                                            ...integrations, 
                                                            extractor: { ...integrations.extractor, target_extractor_id: e.target.value } 
                                                        });
                                                        setHasChanges(true);
                                                    }}
                                                    className="w-full h-11 px-4 bg-white border border-slate-100 rounded-xl text-[10px] font-black text-slate-600 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                                >
                                                    <option value="">Seleccionar Extractor...</option>
                                                    {availableExtractors.map(ext => (
                                                        <option key={ext.id} value={ext.id}>{ext.name}</option>
                                                    ))}
                                                </select>
                                                {availableExtractors.length === 0 && (
                                                    <p className="text-[9px] text-amber-500 font-bold italic ml-1 flex items-center gap-1">
                                                        <AlertCircle size={10} /> No hay Extractores Nous configurados.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 flex flex-col justify-center">
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Estado Maestro</h3>
                                        <p className="text-[10px] text-slate-400 font-medium mt-1">Define si este patcher se aplica automáticamente en los procesos marcados.</p>
                                        <div className="mt-4 flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-600 uppercase">Activar Automatización</span>
                                            <button 
                                                onClick={() => {
                                                    onUpdate({ is_active: !widget.is_active });
                                                }}
                                                className="focus:outline-none"
                                            >
                                                {widget.is_active ? 
                                                    <ToggleRight className="text-emerald-500" size={32} /> : 
                                                    <ToggleLeft className="text-slate-300" size={32} />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Configuración de Parches</h3>
                                        <p className="text-[10px] text-slate-400 font-medium mt-1">Define patrones Regex para transformar URLs de forma automática.</p>
                                    </div>
                                    <button 
                                        onClick={addRule}
                                        className="h-10 px-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all"
                                    >
                                        <Plus size={14} />
                                        Añadir Parche
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {localRules.map((rule, idx) => (
                                        <motion.div 
                                            key={idx}
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="group flex flex-col gap-4 p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 transition-all relative"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Patrón (Regex)</label>
                                                    <input 
                                                        type="text"
                                                        value={rule.regex}
                                                        onChange={(e) => updateRule(idx, { regex: e.target.value })}
                                                        placeholder="/es-es/ o /(shop-.*)/"
                                                        className="w-full h-11 px-4 bg-white border border-slate-100 rounded-xl text-xs font-mono text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-200 transition-all"
                                                    />
                                                </div>
                                                <div className="pt-6">
                                                    <ArrowRight size={16} className="text-slate-300" />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reemplazo</label>
                                                    <input 
                                                        type="text"
                                                        value={rule.replacement}
                                                        onChange={(e) => updateRule(idx, { replacement: e.target.value })}
                                                        placeholder="/"
                                                        className="w-full h-11 px-4 bg-white border border-slate-100 rounded-xl text-xs font-mono text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-200 transition-all font-bold"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => removeRule(idx)}
                                                    className="mt-6 p-2.5 text-slate-200 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {localRules.length === 0 && (
                                        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px] bg-slate-50/20">
                                            <Info size={32} className="mx-auto text-slate-200 mb-4" />
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No hay reglas configuradas para este proyecto.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Testing Sandbox */}
                            <div className="w-full md:w-[380px] bg-slate-50 border-l border-slate-100 p-10 space-y-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-slate-900 rounded-lg text-white">
                                            <Beaker size={16} />
                                        </div>
                                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Link Sandbox</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed italic">Valida la transformación de tus enlaces en tiempo real.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">URL Original:</label>
                                        <div className="relative group">
                                            <input 
                                                type="text" 
                                                placeholder="https://opticabassol.com/es-es/productos"
                                                value={testUrl}
                                                onChange={(e) => setTestUrl(e.target.value)}
                                                className="w-full h-12 pl-4 pr-12 rounded-2xl border bg-white text-[11px] font-bold focus:ring-4 focus:ring-slate-500/5 transition-all outline-none"
                                            />
                                            <button 
                                                onClick={handleTest}
                                                disabled={!testUrl || localRules.length === 0}
                                                className="absolute right-1.5 top-1.5 w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-20 transition-all shadow-lg"
                                            >
                                                <Play size={14} className="fill-white" />
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {testResult !== null && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="space-y-3"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <ChevronRight size={12} className="text-emerald-500" />
                                                    <span className="text-[9px] font-black text-slate-400 uppercase">Resultado Parchado</span>
                                                </div>
                                                <div className="p-5 rounded-[32px] bg-white border border-emerald-100 shadow-sm shadow-emerald-500/5 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Check size={14} className="text-emerald-500" />
                                                    </div>
                                                    <div className={cn(
                                                        "text-[12px] font-mono break-all select-all transition-colors",
                                                        testResult !== testUrl ? "text-emerald-600 font-bold" : "text-slate-400 italic"
                                                    )}>
                                                        {testResult}
                                                    </div>
                                                    {testResult === testUrl && (
                                                        <div className="mt-2 flex items-center gap-1.5 text-[8px] text-amber-500 font-black uppercase tracking-widest">
                                                            <AlertCircle size={8} /> No hubo cambios
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="p-6 bg-white/50 rounded-[32px] border border-slate-200">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Search size={10} /> Tips de Ingeniería
                                        </h4>
                                        <ul className="space-y-2.5">
                                            {[
                                                "Usa `/es-es/` para limpiar idiomas.",
                                                "Los parches se aplican secuencialmente.",
                                                "Soporta grupos de captura Regex."
                                            ].map((tip, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[9px] text-slate-500 font-bold italic leading-tight">
                                                    <div className="w-1 h-1 rounded-full bg-slate-300 mt-1" />
                                                    {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
