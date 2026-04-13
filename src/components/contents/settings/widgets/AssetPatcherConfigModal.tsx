"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, 
    MousePointer2, 
    Plus, 
    Trash2, 
    Sparkles, 
    Layers, 
    EyeOff, 
    Maximize, 
    ArrowRight,
    Settings2,
    Code2,
    Save
} from "lucide-react";
import { cn } from "@/utils/cn";
import type { CustomWidget } from "@/types/project";

interface AssetPatcherConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    widget: CustomWidget;
    onUpdate: (updates: Partial<CustomWidget>) => void;
}

export function AssetPatcherConfigModal({ isOpen, onClose, widget, onUpdate }: AssetPatcherConfigModalProps) {
    const config = widget.config || { rules: [], useNousDimensions: true, hideFeatured: false, hideAllImages: false };
    
    // IA Regex Generator State
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [urlExampleSource, setUrlExampleSource] = useState("");
    const [urlExampleTarget, setUrlExampleTarget] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const updateConfig = (updates: any) => {
        onUpdate({ config: { ...config, ...updates } });
    };

    const addRule = () => {
        const newRules = [...(config.rules || []), { id: crypto.randomUUID(), pattern: "", replacement: "" }];
        updateConfig({ rules: newRules });
    };

    const updateRule = (id: string, updates: any) => {
        const newRules = config.rules.map((r: any) => r.id === id ? { ...r, ...updates } : r);
        updateConfig({ rules: newRules });
    };

    const deleteRule = (id: string) => {
        const newRules = config.rules.filter((r: any) => r.id !== id);
        updateConfig({ rules: newRules });
    };

    const handleGenerateRegex = async () => {
        if (!urlExampleSource || !urlExampleTarget) return;
        setIsGenerating(true);
        
        // Simulación del motor de IA (Esto se conectaría a un servicio real)
        setTimeout(() => {
            const pattern = urlExampleSource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\.webp/, '\\.(webp|jpg|png)');
            const replacement = urlExampleTarget;
            
            const newRule = { id: crypto.randomUUID(), pattern, replacement };
            updateConfig({ rules: [...config.rules, newRule] });
            
            setIsGenerating(false);
            setIsGeneratorOpen(false);
            setUrlExampleSource("");
            setUrlExampleTarget("");
        }, 1500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-end p-0 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="bg-white w-full max-w-2xl h-full shadow-[-20px_0_60px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[20px] bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                                    <MousePointer2 size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Nous Patcher Master</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuración técnica de activos y exportación para cualquier CMS</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-slate-200/50 rounded-2xl transition-all text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12">
                            
                            {/* SWITCHES SECTION */}
                            <section>
                                <div className="flex items-center gap-2 mb-6">
                                    <Settings2 size={16} className="text-slate-400" />
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Comportamiento Global</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <SwitchItem 
                                        icon={Maximize} 
                                        title="Heredar Dimensiones de Nous" 
                                        description="Aplica el ancho y alto ajustado visualmente en el redactor."
                                        checked={config.useNousDimensions}
                                        onChange={(v) => updateConfig({ useNousDimensions: v })}
                                        color="text-indigo-500"
                                    />
                                    <SwitchItem 
                                        icon={EyeOff} 
                                        title="Ocultar Arte de Portada" 
                                        description="Elimina la etiqueta de portada del HTML final exportado."
                                        checked={config.hideFeatured}
                                        onChange={(v) => updateConfig({ hideFeatured: v })}
                                        color="text-amber-500"
                                    />
                                    <SwitchItem 
                                        icon={Layers} 
                                        title="Máscara Total de Activos" 
                                        description="Sustituye todas las imágenes por marcadores para carga manual en CMS."
                                        checked={config.hideAllImages}
                                        onChange={(v) => updateConfig({ hideAllImages: v })}
                                        color="text-rose-500"
                                    />
                                </div>
                            </section>

                            {/* REGEX RULES SECTION */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Code2 size={16} className="text-slate-400" />
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Reglas de Transformación (Regex)</h3>
                                    </div>
                                    <button 
                                        onClick={() => setIsGeneratorOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                    >
                                        <Sparkles size={12} />
                                        Generar por IA
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {config.rules.map((rule: any) => (
                                        <div key={rule.id} className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 flex flex-col gap-4 group relative">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Patrón (Find)</label>
                                                    <input 
                                                        type="text"
                                                        value={rule.pattern}
                                                        onChange={(e) => updateRule(rule.id, { pattern: e.target.value })}
                                                        placeholder="Ej: /storage/v1/object/public/(.*)"
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Reemplazo (Target)</label>
                                                    <input 
                                                        type="text"
                                                        value={rule.replacement}
                                                        onChange={(e) => updateRule(rule.id, { replacement: e.target.value })}
                                                        placeholder="Ej: https://cdn.cms.com/$1"
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => deleteRule(rule.id)}
                                                className="absolute top-4 right-4 p-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    <button 
                                        onClick={addRule}
                                        className="w-full h-14 rounded-[28px] border-2 border-dashed border-slate-200 flex items-center justify-center gap-3 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all"
                                    >
                                        <Plus size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Añadir Regla Manual</span>
                                    </button>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                            <button 
                                onClick={onClose}
                                className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-[24px] text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                <Save size={16} />
                                Guardar Maestro
                            </button>
                        </div>

                        {/* IA REGEX GENERATOR OVERLAY */}
                        <AnimatePresence>
                            {isGeneratorOpen && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-8"
                                >
                                    <motion.div 
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        className="bg-white w-full max-w-lg rounded-[40px] shadow-3xl overflow-hidden border border-white/20"
                                    >
                                        <div className="p-8 pb-4">
                                            <div className="flex items-center gap-3 text-indigo-600 mb-4">
                                                <Sparkles size={24} />
                                                <h4 className="text-xl font-black uppercase italic tracking-tighter">Asistente de Regex por IA</h4>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                                Nous analizará tus URLs de ejemplo para construir una regla de parchado inteligente.
                                            </p>
                                        </div>

                                        <div className="p-8 pt-6 space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL Original (de Nous)</label>
                                                <input 
                                                    type="text"
                                                    value={urlExampleSource}
                                                    onChange={(e) => setUrlExampleSource(e.target.value)}
                                                    placeholder="Ej: https://.../v1/object/public/file.webp"
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-mono focus:ring-2 focus:ring-indigo-500/30"
                                                />
                                            </div>
                                            <div className="flex justify-center text-slate-300">
                                                <ArrowRight size={24} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL Destino (del CMS/Web)</label>
                                                <input 
                                                    type="text"
                                                    value={urlExampleTarget}
                                                    onChange={(e) => setUrlExampleTarget(e.target.value)}
                                                    placeholder="Ej: https://cdn.cms.com/t/files/file.webp?v=99"
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-mono focus:ring-2 focus:ring-indigo-500/30"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-8 bg-slate-50/50 flex gap-4">
                                            <button 
                                                onClick={() => setIsGeneratorOpen(false)}
                                                className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all font-bold"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handleGenerateRegex}
                                                disabled={isGenerating || !urlExampleSource || !urlExampleTarget}
                                                className={cn(
                                                    "flex-[1.5] px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2",
                                                    (isGenerating || !urlExampleSource || !urlExampleTarget) && "opacity-50 grayscale"
                                                )}
                                            >
                                                {isGenerating ? "Procesando..." : "Generar Regla Maestra"}
                                                {!isGenerating && <ArrowRight size={14} />}
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function SwitchItem({ icon: Icon, title, description, checked, onChange, color }: any) {
    return (
        <div className="flex items-center justify-between p-6 rounded-[32px] bg-slate-50/50 border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
            <div className="flex items-center gap-6">
                <div className={cn("w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100", color)}>
                    <Icon size={20} />
                </div>
                <div>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight mb-1">{title}</h4>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest max-w-[280px]">{description}</p>
                </div>
            </div>
            
            <button 
                onClick={() => onChange(!checked)}
                className={cn(
                    "w-14 h-8 rounded-full relative transition-all duration-300",
                    checked ? "bg-indigo-600 shadow-lg shadow-indigo-100" : "bg-slate-200"
                )}
            >
                <motion.div 
                    animate={{ x: checked ? 28 : 4 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                />
            </button>
        </div>
    );
}
