import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Search, Loader2, Check, AlertCircle, RefreshCw, Globe } from 'lucide-react';
import {
    generateMetadataWithSerp,
    TaskMetadata,
    SerpSnippet,
    saveMetadataToTask
} from '../../services/metadataService';
import { ProviderConfig } from '../tools/SeoSuite/types';

interface MetadataGeneratorModalProps {
    taskId: string | number;
    taskTitle: string;
    targetKeyword?: string;
    currentMetadata?: TaskMetadata;
    onClose: () => void;
    onSave: (metadata: TaskMetadata) => void;
}

type GenerationStage = 'config' | 'fetching' | 'generating' | 'preview' | 'error';

const MetadataGeneratorModal: React.FC<MetadataGeneratorModalProps> = ({
    taskId,
    taskTitle,
    targetKeyword,
    currentMetadata,
    onClose,
    onSave
}) => {
    const [stage, setStage] = useState<GenerationStage>('config');
    const [serpProvider, setSerpProvider] = useState<ProviderConfig['serp']>('SERPER');
    const [countryCode, setCountryCode] = useState('es');
    const [langCode, setLangCode] = useState('es');
    const [metadata, setMetadata] = useState<TaskMetadata>(currentMetadata || {});
    const [serpSnippets, setSerpSnippets] = useState<SerpSnippet[]>([]);
    const [error, setError] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);

    const handleGenerate = async () => {
        setStage('fetching');
        setError('');

        try {
            const result = await generateMetadataWithSerp(
                taskTitle,
                targetKeyword,
                countryCode,
                langCode,
                serpProvider
            );

            if (!result.success) {
                setError(result.error || 'Error desconocido');
                setStage('error');
                return;
            }

            setSerpSnippets(result.serpSnippets);
            setStage('generating');

            // Simulate AI generation delay for better UX
            setTimeout(() => {
                setMetadata(result.metadata);
                setStage('preview');
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Error al generar metadatos');
            setStage('error');
        }
    };

    const handleSave = async () => {
        try {
            await saveMetadataToTask(taskId, metadata);
            onSave(metadata);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al guardar metadatos');
            setStage('error');
        }
    };

    const handleRegenerate = () => {
        setStage('config');
        setMetadata({});
        setSerpSnippets([]);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-brand-power/80 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-brand-power/5 flex justify-between items-start bg-gradient-to-r from-brand-accent/10 to-transparent">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="text-brand-accent animate-pulse" size={24} />
                            <h2 className="text-2xl font-bold text-brand-power">Generar Metadatos con IA</h2>
                        </div>
                        <p className="text-sm text-brand-power/60">
                            Analizaremos el SERP y generaremos metadatos optimizados para superar a la competencia
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-brand-power/30 hover:text-brand-power rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {/* Configuration Stage */}
                        {stage === 'config' && (
                            <motion.div
                                key="config"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="bg-brand-soft/20 rounded-2xl p-6 border border-brand-power/10">
                                    <h3 className="font-bold text-brand-power mb-4 flex items-center gap-2">
                                        <Globe size={18} />
                                        Configuración de Búsqueda
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">
                                                Proveedor SERP
                                            </label>
                                            <select
                                                value={serpProvider}
                                                onChange={(e) => setSerpProvider(e.target.value as any)}
                                                className="w-full bg-white border border-brand-power/10 rounded-lg p-3 text-sm outline-none focus:border-brand-accent"
                                            >
                                                <option value="SERPER">Serper (Recomendado)</option>
                                                <option value="TAVILY">Tavily</option>
                                                <option value="JINA">Jina (Gratis)</option>
                                                <option value="DUCKDUCKGO">DuckDuckGo (Gratis)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">
                                                País
                                            </label>
                                            <select
                                                value={countryCode}
                                                onChange={(e) => setCountryCode(e.target.value)}
                                                className="w-full bg-white border border-brand-power/10 rounded-lg p-3 text-sm outline-none focus:border-brand-accent"
                                            >
                                                <option value="es">España</option>
                                                <option value="mx">México</option>
                                                <option value="ar">Argentina</option>
                                                <option value="co">Colombia</option>
                                                <option value="us">Estados Unidos</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-xs text-blue-800">
                                            <strong>Búsqueda:</strong> {targetKeyword || taskTitle}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    className="w-full bg-brand-accent text-brand-power font-bold py-4 rounded-2xl shadow-lg shadow-brand-accent/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                >
                                    <Search size={20} />
                                    Analizar SERP y Generar Metadatos
                                </button>
                            </motion.div>
                        )}

                        {/* Fetching Stage */}
                        {stage === 'fetching' && (
                            <motion.div
                                key="fetching"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16"
                            >
                                <Loader2 className="text-brand-accent animate-spin mb-4" size={48} />
                                <h3 className="text-xl font-bold text-brand-power mb-2">
                                    Analizando resultados de búsqueda...
                                </h3>
                                <p className="text-sm text-brand-power/60">
                                    Obteniendo snippets de la primera página del SERP
                                </p>
                            </motion.div>
                        )}

                        {/* Generating Stage */}
                        {stage === 'generating' && (
                            <motion.div
                                key="generating"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16"
                            >
                                <Sparkles className="text-brand-accent animate-pulse mb-4" size={48} />
                                <h3 className="text-xl font-bold text-brand-power mb-2">
                                    Generando metadatos con IA...
                                </h3>
                                <p className="text-sm text-brand-power/60 mb-6">
                                    Analizando {serpSnippets.length} resultados de la competencia
                                </p>
                                <div className="w-full max-w-md bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 1.5 }}
                                        className="h-full bg-brand-accent"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Preview Stage */}
                        {stage === 'preview' && (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <Check size={20} />
                                        <span className="font-bold">Metadatos generados exitosamente</span>
                                    </div>
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className="text-xs font-bold text-brand-power/50 hover:text-brand-power underline"
                                    >
                                        {isEditing ? 'Vista previa' : 'Editar'}
                                    </button>
                                </div>

                                {/* Metadata Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">
                                            Meta Title ({metadata.metaTitle?.length || 0} caracteres)
                                        </label>
                                        {isEditing ? (
                                            <input
                                                value={metadata.metaTitle || ''}
                                                onChange={(e) => setMetadata({ ...metadata, metaTitle: e.target.value })}
                                                className="w-full bg-white border border-brand-power/10 rounded-lg p-3 text-sm outline-none focus:border-brand-accent"
                                            />
                                        ) : (
                                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-brand-power">
                                                {metadata.metaTitle}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">
                                            H1 ({metadata.h1?.length || 0} caracteres)
                                        </label>
                                        {isEditing ? (
                                            <input
                                                value={metadata.h1 || ''}
                                                onChange={(e) => setMetadata({ ...metadata, h1: e.target.value })}
                                                className="w-full bg-white border border-brand-power/10 rounded-lg p-3 text-sm outline-none focus:border-brand-accent"
                                            />
                                        ) : (
                                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-brand-power">
                                                {metadata.h1}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">
                                            Meta Description ({metadata.metaDescription?.length || 0} caracteres)
                                        </label>
                                        {isEditing ? (
                                            <textarea
                                                value={metadata.metaDescription || ''}
                                                onChange={(e) => setMetadata({ ...metadata, metaDescription: e.target.value })}
                                                className="w-full bg-white border border-brand-power/10 rounded-lg p-3 text-sm outline-none focus:border-brand-accent min-h-[80px]"
                                            />
                                        ) : (
                                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-brand-power">
                                                {metadata.metaDescription}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">
                                            Slug
                                        </label>
                                        {isEditing ? (
                                            <input
                                                value={metadata.slug || ''}
                                                onChange={(e) => setMetadata({ ...metadata, slug: e.target.value })}
                                                className="w-full bg-white border border-brand-power/10 rounded-lg p-3 text-sm outline-none focus:border-brand-accent font-mono"
                                            />
                                        ) : (
                                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-brand-power font-mono">
                                                {metadata.slug}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SERP Snippets Preview */}
                                <div className="mt-8">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-3">
                                        Resultados Analizados ({serpSnippets.length})
                                    </h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                        {serpSnippets.slice(0, 5).map((snippet) => (
                                            <div
                                                key={snippet.position}
                                                className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span className="text-xs font-bold text-brand-power/40 mt-0.5">
                                                        #{snippet.position}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="text-sm font-bold text-brand-power truncate">
                                                            {snippet.title}
                                                        </h5>
                                                        <p className="text-xs text-brand-power/60 line-clamp-2 mt-1">
                                                            {snippet.snippet}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleRegenerate}
                                        className="flex-1 bg-slate-100 text-brand-power font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={18} />
                                        Regenerar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 bg-brand-accent text-brand-power font-bold py-3 rounded-xl shadow-lg shadow-brand-accent/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} />
                                        Guardar Metadatos
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Error Stage */}
                        {stage === 'error' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16"
                            >
                                <AlertCircle className="text-rose-500 mb-4" size={48} />
                                <h3 className="text-xl font-bold text-brand-power mb-2">
                                    Error al generar metadatos
                                </h3>
                                <p className="text-sm text-brand-power/60 mb-6 text-center max-w-md">
                                    {error}
                                </p>
                                <button
                                    onClick={() => setStage('config')}
                                    className="bg-brand-accent text-brand-power font-bold py-3 px-6 rounded-xl shadow-lg shadow-brand-accent/20 hover:scale-[1.02] transition-all"
                                >
                                    Intentar de nuevo
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default MetadataGeneratorModal;
