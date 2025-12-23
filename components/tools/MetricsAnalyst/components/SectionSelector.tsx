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
        <div className="fixed inset-0 z-50 bg-brand-power/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-brand-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-brand-power/5"
            >
                <div className="p-8 border-b border-brand-power/5 bg-brand-soft/20">
                    <h2 className="text-2xl font-bold text-brand-power mb-2">Personaliza tu Informe</h2>
                    <p className="text-brand-power/60">El Agente ha sugerido <strong>{suggestedSections.length}</strong> secciones basándose en tus datos, pero puedes <strong>activar todas las que desees</strong> manualmente.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-brand-white">
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
                                            ? 'border-brand-power bg-brand-soft/30 shadow-sm'
                                            : 'border-brand-power/5 bg-brand-white hover:border-brand-power/20 hover:bg-brand-soft/10'
                                        }
                                    `}
                                >
                                    {/* Selection Indicator */}
                                    <div className={`
                                        absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                        ${isSelected
                                            ? 'bg-brand-power border-brand-power'
                                            : 'border-brand-power/20 bg-transparent'
                                        }
                                    `}>
                                        {isSelected && <svg className="w-3 h-3 text-brand-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>

                                    {/* Suggestion Badge */}
                                    {isSuggested && (
                                        <span className="inline-block bg-brand-accent/20 text-brand-power text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 border border-brand-accent/30">
                                            ✨ Sugerido
                                        </span>
                                    )}

                                    <h3 className={`font-bold text-sm mb-1 ${isSelected ? 'text-brand-power' : 'text-brand-power/70'}`}>{section.label}</h3>
                                    <p className="text-xs text-brand-power/50 leading-snug">{section.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 border-t border-brand-power/5 bg-brand-white flex justify-between items-center">
                    <div className="text-sm text-brand-power/50 font-medium">
                        {selected.length} secciones seleccionadas
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onCancel}
                            className="text-brand-power/50 hover:text-brand-power font-bold px-4 py-2 text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(selected)}
                            disabled={selected.length === 0}
                            className={`
                                bg-brand-power text-brand-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-power/10
                                ${selected.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0'}
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
