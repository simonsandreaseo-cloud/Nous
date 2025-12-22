import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SectionSelectorProps {
    suggestedSections: string[];
    onConfirm: (selectedSections: string[]) => void;
    onCancel: () => void;
}

const ALL_SECTIONS = [
    { id: 'ANALISIS_ESTRATEGICO', label: 'Análisis Estratégico', desc: 'Matriz de Ataque/Defensa y visión general.' },
    { id: 'ANALISIS_CONCENTRACION', label: 'Riesgo de Concentración', desc: 'Dependencia del tráfico en pocas URLs.' },
    { id: 'ANALISIS_CAUSAS_CAIDA', label: 'Diagnóstico de Caídas', desc: 'Análisis forense de pérdida de tráfico.' },
    { id: 'OPORTUNIDADES_CONTENIDO_CLUSTERS', label: 'Oportunidades de Contenido', desc: 'Clusters temáticos para expandir.' },
    { id: 'ALERTA_CANIBALIZACION', label: 'Canibalización SEO', desc: 'Páginas compitiendo por la misma keyword.' },
    { id: 'OPORTUNIDAD_STRIKING_DISTANCE', label: 'Striking Distance', desc: 'Keywords en poisición 4-20 fáciles de subir.' },
    { id: 'OPORTUNIDAD_NUEVAS_KEYWORDS', label: 'Nuevas Keywords', desc: 'Términos donde has empezado a rankear.' },
    { id: 'ANALISIS_CTR', label: 'Análisis de CTR', desc: 'Páginas con CTR bajo sospechoso.' },
    { id: 'ANALISIS_SEGMENTOS', label: 'Segmentos de URL', desc: 'Rendimiento por directorios (/blog, /tienda).' }
];

export const SectionSelector: React.FC<SectionSelectorProps> = ({ suggestedSections, onConfirm, onCancel }) => {
    const [selected, setSelected] = useState<string[]>([]);

    useEffect(() => {
        // Pre-select suggestions
        setSelected(suggestedSections);
    }, [suggestedSections]);

    const toggleSection = (id: string) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(s => s !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Personaliza tu Informe</h2>
                    <p className="text-slate-500">El Agente ha sugerido <strong>{suggestedSections.length}</strong> secciones basándose en tus datos. Añade o quita lo que necesites.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ALL_SECTIONS.map((section) => {
                            const isSelected = selected.includes(section.id);
                            const isSuggested = suggestedSections.includes(section.id);

                            return (
                                <div
                                    key={section.id}
                                    onClick={() => toggleSection(section.id)}
                                    className={`
                                        cursor-pointer relative p-5 rounded-xl border-2 transition-all duration-200 group
                                        ${isSelected
                                            ? 'border-indigo-600 bg-white shadow-md'
                                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                        }
                                    `}
                                >
                                    {/* Selection Indicator */}
                                    <div className={`
                                        absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                        ${isSelected
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : 'border-slate-300 bg-transparent'
                                        }
                                    `}>
                                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>

                                    {/* Suggestion Badge */}
                                    {isSuggested && (
                                        <span className="inline-block bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 border border-emerald-200">
                                            ✨ Sugerido
                                        </span>
                                    )}

                                    <h3 className={`font-bold text-sm mb-1 ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{section.label}</h3>
                                    <p className="text-xs text-slate-400 leading-snug">{section.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                    <div className="text-sm text-slate-500 font-medium">
                        {selected.length} secciones seleccionadas
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onCancel}
                            className="text-slate-500 hover:text-slate-800 font-bold px-4 py-2 text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(selected)}
                            disabled={selected.length === 0}
                            className={`
                                bg-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-slate-200
                                ${selected.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0'}
                            `}
                        >
                            Generar Informe 🚀
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
