import React, { useState } from "react";
import { motion } from "framer-motion";
import { Settings2, ShieldAlert, Link as LinkIcon, Plus, X, Lock } from "lucide-react";
import { cn } from "@/utils/cn";

export interface LinkStrategyConfig {
    strict_mode: boolean;
    strict_category: string | null;
    category_priorities: Record<string, number>;
    planned_priorities: Record<string, number>;
    vip_urls: string[];
}

interface LinkStrategyEditorProps {
    contentType: string;
    config: LinkStrategyConfig;
    categories: string[];
    plannedTypes: string[];
    onChange: (newConfig: LinkStrategyConfig) => void;
}

export function LinkStrategyEditor({ contentType, config, categories, plannedTypes, onChange }: LinkStrategyEditorProps) {
    const [newVipUrl, setNewVipUrl] = useState("");

    const updateField = (field: keyof LinkStrategyConfig, value: any) => {
        onChange({ ...config, [field]: value });
    };

    const handleCategoryPriorityChange = (category: string, value: number) => {
        updateField('category_priorities', {
            ...config.category_priorities,
            [category]: value
        });
    };

    const handlePlannedPriorityChange = (type: string, value: number) => {
        updateField('planned_priorities', {
            ...config.planned_priorities,
            [type]: value
        });
    };

    const addVipUrl = () => {
        if (!newVipUrl.trim()) return;
        updateField('vip_urls', [...(config.vip_urls || []), newVipUrl.trim()]);
        setNewVipUrl("");
    };

    const removeVipUrl = (index: number) => {
        const newUrls = [...(config.vip_urls || [])];
        newUrls.splice(index, 1);
        updateField('vip_urls', newUrls);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Settings2 className="text-indigo-500" />
                    Estrategia para: <span className="text-indigo-600">{contentType}</span>
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                    Define cómo la IA seleccionará los enlaces internos cuando genere un contenido de tipo "{contentType}".
                </p>
            </div>

            {/* Strict Mode */}
            <div className={cn(
                "p-5 rounded-2xl border transition-all",
                config.strict_mode ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-200"
            )}>
                <div className="flex items-start justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Lock size={16} className={config.strict_mode ? "text-amber-500" : "text-slate-400"} />
                            Modo Estricto de Enlazado
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-lg">
                            Si se activa, la IA <strong>SOLO</strong> enlazará a URLs de la categoría exacta seleccionada. Se ignorarán las prioridades.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={config.strict_mode}
                            onChange={(e) => updateField('strict_mode', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                </div>

                {config.strict_mode && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t border-amber-100"
                    >
                        <label className="block text-xs font-bold text-slate-700 mb-2">Categoría Única Permitida:</label>
                        <select
                            className="w-full max-w-sm p-2.5 bg-white border border-amber-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                            value={config.strict_category || ""}
                            onChange={(e) => updateField('strict_category', e.target.value)}
                        >
                            <option value="">-- Selecciona una categoría --</option>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </motion.div>
                )}
            </div>

            {/* Priorities (Only if not strict mode) */}
            {!config.strict_mode && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Published Categories */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ShieldAlert size={16} className="text-emerald-500" />
                            Prioridad: URLs Publicadas
                        </h4>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {categories.length === 0 && <p className="text-xs text-slate-400">No hay categorías descubiertas aún.</p>}
                            {categories.map(category => (
                                <div key={category} className="flex items-center gap-4">
                                    <span className="text-xs font-semibold text-slate-600 w-32 truncate" title={category}>
                                        {category}
                                    </span>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="10" 
                                        value={config.category_priorities?.[category] ?? 5}
                                        onChange={(e) => handleCategoryPriorityChange(category, parseInt(e.target.value))}
                                        className="flex-1 accent-indigo-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs font-bold w-6 text-center text-indigo-600">
                                        {config.category_priorities?.[category] ?? 5}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Planned Content */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Settings2 size={16} className="text-blue-500" />
                            Prioridad: URLs Planificadas
                        </h4>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {plannedTypes.length === 0 && <p className="text-xs text-slate-400">No hay tipos de contenido en el planificador.</p>}
                            {plannedTypes.map(type => (
                                <div key={type} className="flex items-center gap-4">
                                    <span className="text-xs font-semibold text-slate-600 w-32 truncate" title={type}>
                                        {type}
                                    </span>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="10" 
                                        value={config.planned_priorities?.[type] ?? 5}
                                        onChange={(e) => handlePlannedPriorityChange(type, parseInt(e.target.value))}
                                        className="flex-1 accent-blue-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs font-bold w-6 text-center text-blue-600">
                                        {config.planned_priorities?.[type] ?? 5}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* VIP URLs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <LinkIcon size={16} className="text-pink-500" />
                            URLs VIP (Alta Prioridad)
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">Estas URLs se inyectarán forzosamente al inicio de las sugerencias de la IA.</p>
                    </div>
                </div>

                <div className="flex gap-2 mb-4">
                    <input 
                        type="url"
                        placeholder="https://tudominio.com/campana-especial"
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-300 transition-colors"
                        value={newVipUrl}
                        onChange={(e) => setNewVipUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addVipUrl()}
                    />
                    <button 
                        onClick={addVipUrl}
                        disabled={!newVipUrl}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Plus size={16} /> Agregar
                    </button>
                </div>

                <div className="space-y-2">
                    {(!config.vip_urls || config.vip_urls.length === 0) ? (
                        <p className="text-xs text-slate-400 italic">No hay URLs VIP configuradas para este tipo de contenido.</p>
                    ) : (
                        config.vip_urls.map((url, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <span className="text-xs font-medium text-slate-700 truncate">{url}</span>
                                <button 
                                    onClick={() => removeVipUrl(idx)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
