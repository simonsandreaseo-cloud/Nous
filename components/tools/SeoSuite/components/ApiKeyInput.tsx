
import React, { useState } from 'react';
import { Key, Plus, Trash2, CheckCircle, ExternalLink, Cpu, Database } from 'lucide-react';
import { Language, ExternalApiKeys, ProviderConfig } from '../types';
import { AVAILABLE_MODELS } from '../services/aiService';

interface ApiKeyInputProps {
    apiKeys: string[];
    setApiKeys: (keys: string[]) => void;
    externalKeys: ExternalApiKeys;
    setExternalKeys: (keys: ExternalApiKeys) => void;
    providerConfig: ProviderConfig;
    setProviderConfig: (config: ProviderConfig) => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    lang: Language;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ 
    apiKeys, setApiKeys, 
    externalKeys, setExternalKeys,
    providerConfig, setProviderConfig,
    selectedModel, setSelectedModel,
    lang 
}) => {
    const [tempKey, setTempKey] = useState('');
    const [isMultiMode, setIsMultiMode] = useState(false);
    const [rawMulti, setRawMulti] = useState('');

    const t = {
        title: lang === 'es' ? 'Configuración de IA' : 'AI Configuration',
        geminiLabel: 'Google Gemini API Key',
        externalLabel: 'External Data Providers',
        getGemini: lang === 'es' ? 'Obtener Gemini Key' : 'Get Gemini Key',
        add: lang === 'es' ? 'Agregar' : 'Add',
        placeholderGemini: 'AIza...',
        multiBtn: lang === 'es' ? 'Gestión Avanzada (Múltiples Keys)' : 'Advanced (Multiple Keys)',
        save: lang === 'es' ? 'Guardar Keys' : 'Save Keys',
        modelLabel: lang === 'es' ? 'Modelo de IA (Predeterminado)' : 'AI Model (Default)',
    };

    const handleAddSingle = () => {
        if (tempKey.trim()) {
            setApiKeys([...apiKeys, tempKey.trim()]);
            setTempKey('');
        }
    };

    const handleRemoveKey = (index: number) => {
        const newKeys = [...apiKeys];
        newKeys.splice(index, 1);
        setApiKeys(newKeys);
    };

    const handleSaveMulti = () => {
        const keys = rawMulti.split('\n').map(k => k.trim()).filter(k => k.length > 0);
        setApiKeys(keys);
        setIsMultiMode(false);
    };

    const updateExtKey = (k: keyof ExternalApiKeys, val: string) => {
        setExternalKeys({ ...externalKeys, [k]: val });
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-indigo-600" />
                {t.title}
            </h3>

            {/* Model Selection */}
            <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">{t.modelLabel}</label>
                <div className="relative">
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                        {AVAILABLE_MODELS.map(m => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                    <Cpu className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
            </div>

            {/* Gemini Section */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t.geminiLabel}</label>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                        {t.getGemini} <ExternalLink className="w-3 h-3" />
                    </a>
                </div>

                {!isMultiMode ? (
                    <div className="space-y-2">
                        {apiKeys.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {apiKeys.map((k, i) => (
                                    <div key={i} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs flex items-center gap-2">
                                        <span className="font-mono">{k.substring(0, 8)}...</span>
                                        <button onClick={() => handleRemoveKey(i)} className="hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input 
                                type="password" 
                                value={tempKey}
                                onChange={(e) => setTempKey(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder={t.placeholderGemini}
                            />
                            <button onClick={handleAddSingle} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <button onClick={() => { setRawMulti(apiKeys.join('\n')); setIsMultiMode(true); }} className="text-xs text-slate-400 hover:text-indigo-600 underline">
                            {t.multiBtn}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2 animate-in fade-in">
                        <textarea 
                            value={rawMulti}
                            onChange={(e) => setRawMulti(e.target.value)}
                            className="w-full h-24 p-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        />
                        <div className="flex justify-end gap-2">
                             <button onClick={() => setIsMultiMode(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded">Cancel</button>
                             <button onClick={handleSaveMulti} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700">{t.save}</button>
                        </div>
                    </div>
                )}
            </div>

            {/* External Providers Compact */}
            <div className="pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 block">{t.externalLabel}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Jina */}
                    <div>
                        <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                            <span>Jina API Key</span>
                            {externalKeys.jina && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <input 
                            type="password"
                            value={externalKeys.jina || ''}
                            onChange={(e) => updateExtKey('jina', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                            placeholder="jina_..."
                        />
                    </div>
                    {/* Firecrawl */}
                    <div>
                        <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                            <span>Firecrawl API Key</span>
                            {externalKeys.firecrawl && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <input 
                            type="password"
                            value={externalKeys.firecrawl || ''}
                            onChange={(e) => updateExtKey('firecrawl', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                            placeholder="fc_..."
                        />
                    </div>
                    {/* Unstructured */}
                    <div>
                        <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                            <span>Unstructured API Key</span>
                            {externalKeys.unstructured && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <input 
                            type="password"
                            value={externalKeys.unstructured || ''}
                            onChange={(e) => updateExtKey('unstructured', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                            placeholder="unstructured_..."
                        />
                    </div>
                    {/* Tavily */}
                    <div>
                        <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                            <span>Tavily API Key</span>
                            {externalKeys.tavily && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <input 
                            type="password"
                            value={externalKeys.tavily || ''}
                            onChange={(e) => updateExtKey('tavily', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                            placeholder="tvly-..."
                        />
                    </div>
                     {/* Serper (New) */}
                    <div>
                        <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                            <span>Serper (Google) Key</span>
                            {externalKeys.serper && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <input 
                            type="password"
                            value={externalKeys.serper || ''}
                            onChange={(e) => updateExtKey('serper', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                            placeholder="serper-..."
                        />
                    </div>
                     {/* Voyage */}
                     <div>
                        <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                            <span>Voyage AI Key</span>
                            {externalKeys.voyage && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <input 
                            type="password"
                            value={externalKeys.voyage || ''}
                            onChange={(e) => updateExtKey('voyage', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                            placeholder="voyage-..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyInput;