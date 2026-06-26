"use client";

import { useState } from "react";
import { X, Save, Scissors, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import type { CustomWidget } from "@/types/project";

interface ContentSplitterConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    widget: CustomWidget;
    onUpdate: (updates: Partial<CustomWidget>) => void;
}

export function ContentSplitterConfigModal({ isOpen, onClose, widget, onUpdate }: ContentSplitterConfigModalProps) {
    const [localName, setLocalName] = useState(widget.name);
    const [limitType, setLimitType] = useState<'words' | 'characters'>(widget.config?.limitType || 'words');
    const [limitMode, setLimitMode] = useState<'exact' | 'max_h2'>(widget.config?.limitMode || 'max_h2');
    const [limitValue, setLimitValue] = useState<number>(widget.config?.limitValue || 1000);

    const handleSave = () => {
        onUpdate({
            name: localName,
            config: {
                ...widget.config,
                limitType,
                limitMode,
                limitValue
            }
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                <Scissors size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Content Splitter</h3>
                                <p className="text-[11px] font-medium text-slate-500">Configuración de división de texto</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                                    Nombre de la Herramienta
                                </label>
                                <input
                                    type="text"
                                    value={localName}
                                    onChange={(e) => setLocalName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                    placeholder="Ej: Splitter Principal"
                                />
                            </div>
                        </div>

                        {/* Split Logic */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings2 size={16} className="text-amber-500" />
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Reglas de División</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                                        Tipo de Límite
                                    </label>
                                    <select
                                        value={limitType}
                                        onChange={(e) => setLimitType(e.target.value as 'words' | 'characters')}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                    >
                                        <option value="words">Palabras</option>
                                        <option value="characters">Caracteres</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                                        Valor del Límite
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={limitValue}
                                        onChange={(e) => setLimitValue(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    Modo de Corte
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setLimitMode('max_h2')}
                                        className={cn(
                                            "p-4 rounded-xl border-2 text-left transition-all",
                                            limitMode === 'max_h2' 
                                                ? "border-amber-500 bg-amber-50" 
                                                : "border-slate-100 bg-white hover:border-slate-200"
                                        )}
                                    >
                                        <div className="text-xs font-bold text-slate-900 mb-1">Respetar H2 (Máximo)</div>
                                        <div className="text-[10px] text-slate-500 leading-relaxed">
                                            Corta en el último H2 antes de alcanzar el límite. Mantiene las secciones completas.
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setLimitMode('exact')}
                                        className={cn(
                                            "p-4 rounded-xl border-2 text-left transition-all",
                                            limitMode === 'exact' 
                                                ? "border-amber-500 bg-amber-50" 
                                                : "border-slate-100 bg-white hover:border-slate-200"
                                        )}
                                    >
                                        <div className="text-xs font-bold text-slate-900 mb-1">Corte Estricto (Exacto)</div>
                                        <div className="text-[10px] text-slate-500 leading-relaxed">
                                            Corta exactamente al llegar al límite establecido, aunque quede a mitad de una sección.
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
                        >
                            <Save size={16} />
                            Guardar Cambios
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
