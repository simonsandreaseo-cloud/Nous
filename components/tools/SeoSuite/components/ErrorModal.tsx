
import React, { useState, useEffect } from 'react';
import { XCircle, X, RefreshCw, Play } from 'lucide-react';
import { Language } from '../types';
import { AVAILABLE_MODELS } from '../services/aiService';

export interface ErrorDetails {
  title: string;
  cause: string;
  solution: string;
  rawMessage?: string;
  isRecoverable?: boolean;
}

interface ErrorModalProps { 
    error: ErrorDetails | null; 
    onClose: () => void; 
    lang: Language;
    currentKeys: string[];
    currentModel: string;
    onRetry: (newKeys: string[], newModel: string) => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ error, onClose, lang, currentKeys, currentModel, onRetry }) => {
    const [apiKeysInput, setApiKeysInput] = useState(currentKeys.join('\n'));
    const [model, setModel] = useState(currentModel);

    useEffect(() => {
        setApiKeysInput(currentKeys.join('\n'));
        setModel(currentModel);
    }, [currentKeys, currentModel]);

    if (!error) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
                <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-full shadow-sm">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-red-900">{error.title}</h3>
                    </div>
                    <button onClick={onClose} className="text-red-400 hover:text-red-700 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-5">
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                            {lang === 'es' ? 'Causa' : 'Cause'}
                        </h4>
                        <p className="text-slate-700 text-sm leading-relaxed font-medium">
                            {error.cause}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                            {lang === 'es' ? 'Solución' : 'Solution'}
                        </h4>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-indigo-800 text-sm">
                            {error.solution}
                        </div>
                    </div>

                    {error.isRecoverable && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 mt-2 shadow-inner">
                             <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-indigo-600" />
                                {lang === 'es' ? 'Reanudar Análisis' : 'Resume Analysis'}
                             </h4>
                             <p className="text-xs text-slate-500">
                                {lang === 'es' 
                                    ? 'Agrega más API Keys (una por línea) para rotar si una falla. Se guardarán para este análisis.' 
                                    : 'Add more API Keys (one per line) to rotate if one fails. Will be saved for this analysis.'}
                             </p>
                             
                             <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">Model</label>
                                <select 
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2"
                                >
                                    {AVAILABLE_MODELS.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                             </div>

                             <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">API Keys (Multi-line)</label>
                                <textarea 
                                    value={apiKeysInput}
                                    onChange={(e) => setApiKeysInput(e.target.value)}
                                    className="w-full text-xs font-mono border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border min-h-[80px]"
                                    placeholder="AIza..."
                                />
                             </div>
                        </div>
                    )}

                    {error.rawMessage && (
                        <div className="pt-2 border-t border-gray-100">
                             <details className="cursor-pointer group">
                                 <summary className="text-[10px] text-gray-400 group-hover:text-indigo-500 font-medium uppercase tracking-wide list-none flex items-center gap-1">
                                     Details
                                 </summary>
                                 <div className="mt-2 text-[10px] text-slate-600 font-mono bg-gray-100 p-3 rounded border border-gray-200 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                                     {error.rawMessage}
                                 </div>
                             </details>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-slate-700 font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm"
                    >
                        {lang === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                    {error.isRecoverable && (
                        <button 
                            onClick={() => {
                                const keys = apiKeysInput.split('\n').map(k => k.trim()).filter(k => k.length > 0);
                                onRetry(keys, model);
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm flex items-center gap-2"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            {lang === 'es' ? 'Guardar y Reanudar' : 'Save & Resume'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ErrorModal;
