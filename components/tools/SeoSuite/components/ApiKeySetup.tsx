
import React, { useState } from 'react';
import { Key, ExternalLink, ShieldCheck, Play, Plus, Trash2, Globe, FileText, CheckCircle, Blocks, Loader2, AlertCircle } from 'lucide-react';
import { Language, ExternalApiKeys, ProviderConfig } from '../types';
import { AVAILABLE_MODELS, validateGeminiKey } from '../services/aiService';
import { validateExternalKey } from '../services/jinaService';

interface ApiKeySetupProps {
    lang: Language;
    onComplete: (data: { geminiKeys: string[], externalKeys: ExternalApiKeys, providerConfig: ProviderConfig, model: string }) => void;
    onCancel: () => void;
    initialGeminiKeys: string[];
    initialExternalKeys?: ExternalApiKeys;
    initialProviderConfig?: ProviderConfig;
    initialModel: string;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ 
    lang, 
    onComplete, 
    onCancel, 
    initialGeminiKeys, 
    initialExternalKeys = {}, 
    initialProviderConfig = { reader: 'JINA', serp: 'JINA', clustering: 'GEMINI' },
    initialModel 
}) => {
    const [geminiKeys, setGeminiKeys] = useState<string[]>(initialGeminiKeys);
    const [tempGemini, setTempGemini] = useState('');
    const [model, setModel] = useState(initialModel);
    
    // External Providers
    const [providerConfig, setProviderConfig] = useState<ProviderConfig>(initialProviderConfig);
    const [keys, setKeys] = useState<ExternalApiKeys>(initialExternalKeys);

    // Validation States
    const [validating, setValidating] = useState(false);
    const [geminiStatus, setGeminiStatus] = useState<Record<string, 'valid' | 'invalid' | 'unknown'>>({});
    const [externalStatus, setExternalStatus] = useState<Record<string, 'valid' | 'invalid' | 'unknown'>>({});

    const t = {
        title: lang === 'es' ? 'Configuración de Seguridad IA' : 'AI Security Setup',
        subtitle: lang === 'es' 
            ? 'Configura tus proveedores de IA y Datos. Las llaves se almacenan localmente.' 
            : 'Configure your AI and Data providers. Keys are stored locally.',
        geminiSection: 'Google Gemini API',
        externalSection: lang === 'es' ? 'Proveedores Externos' : 'External Providers',
        add: lang === 'es' ? 'Agregar' : 'Add',
        placeholderKey: 'Paste API Key...',
        continue: lang === 'es' ? 'Guardar y Continuar' : 'Save & Continue',
        cancel: lang === 'es' ? 'Cancelar' : 'Cancel',
        required: lang === 'es' ? 'Requerido' : 'Required',
        modelLabel: lang === 'es' ? 'Modelo de IA Principal' : 'Main AI Model',
        readerLabel: lang === 'es' ? 'Lector (URL -> Texto)' : 'Reader (URL -> Text)',
        serpLabel: lang === 'es' ? 'Búsqueda SERP' : 'SERP Search',
        clusterLabel: lang === 'es' ? 'Clustering (Agrupación)' : 'Clustering',
        validateBtn: lang === 'es' ? 'Validar Keys' : 'Validate Keys',
        validating: lang === 'es' ? 'Validando...' : 'Validating...'
    };

    const addGemini = () => {
        if (tempGemini.trim() && !geminiKeys.includes(tempGemini.trim())) {
            setGeminiKeys([...geminiKeys, tempGemini.trim()]);
            setTempGemini('');
        }
    };
    
    const removeGemini = (idx: number) => setGeminiKeys(geminiKeys.filter((_, i) => i !== idx));
    const isValid = geminiKeys.length > 0;

    const updateKey = (key: keyof ExternalApiKeys, value: string) => {
        setKeys(prev => ({ ...prev, [key]: value }));
        // Reset validation status on change
        setExternalStatus(prev => ({ ...prev, [key]: 'unknown' }));
    };

    const handleValidation = async () => {
        setValidating(true);
        const newGStatus: Record<string, 'valid' | 'invalid' | 'unknown'> = {};
        
        // Validate Gemini Keys
        for (const k of geminiKeys) {
            const isValid = await validateGeminiKey(k);
            newGStatus[k] = isValid ? 'valid' : 'invalid';
        }
        setGeminiStatus(newGStatus);

        const newEStatus: Record<string, 'valid' | 'invalid' | 'unknown'> = {};
        
        // Validate External Keys
        const checkKey = async (provider: string, keyVal: string | undefined, keyName: string) => {
            if (keyVal) {
                const ok = await validateExternalKey(provider, keyVal);
                newEStatus[keyName] = ok ? 'valid' : 'invalid';
            }
        };

        await Promise.all([
            checkKey('JINA', keys.jina, 'jina'),
            checkKey('FIRECRAWL', keys.firecrawl, 'firecrawl'),
            checkKey('TAVILY', keys.tavily, 'tavily'),
            checkKey('SERPER', keys.serper, 'serper'),
            checkKey('UNSTRUCTURED', keys.unstructured, 'unstructured'),
            checkKey('VOYAGE', keys.voyage, 'voyage')
        ]);

        setExternalStatus(newEStatus);
        setValidating(false);
    };

    const StatusIcon = ({ status }: { status?: 'valid' | 'invalid' | 'unknown' }) => {
        if (status === 'valid') return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
        if (status === 'invalid') return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
        return null;
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-indigo-600 p-6 flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{t.title}</h2>
                        <p className="text-indigo-100 text-sm mt-1">{t.subtitle}</p>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                    
                    {/* Model Selector */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">{t.modelLabel}</label>
                            <select 
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {AVAILABLE_MODELS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Gemini Keys */}
                    <div className="border-b border-gray-100 pb-6">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                {t.geminiSection}
                                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full uppercase">{t.required}</span>
                            </label>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                Get Key <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text" 
                                value={tempGemini}
                                onChange={(e) => setTempGemini(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addGemini()}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                placeholder={t.placeholderKey}
                            />
                            <button onClick={addGemini} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg">
                                <Plus className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {geminiKeys.length > 0 ? (
                            <div className="bg-slate-50 rounded-lg p-2 space-y-2 border border-slate-100">
                                {geminiKeys.map((k, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <Key className="w-4 h-4 text-indigo-400" />
                                            <span className="text-xs font-mono text-slate-600">{k.substring(0, 8)}...••••</span>
                                            <StatusIcon status={geminiStatus[k]} />
                                        </div>
                                        <button onClick={() => removeGemini(i)} className="text-slate-400 hover:text-rose-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-rose-500 italic">At least one Gemini API Key is required.</p>
                        )}
                    </div>

                    {/* External Providers */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4">{t.externalSection}</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* READER CONFIG */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4" /> {t.readerLabel}
                                </label>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setProviderConfig(p => ({ ...p, reader: 'JINA' }))}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded border ${providerConfig.reader === 'JINA' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500'}`}
                                        >
                                            Jina
                                        </button>
                                        <button 
                                            onClick={() => setProviderConfig(p => ({ ...p, reader: 'FIRECRAWL' }))}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded border ${providerConfig.reader === 'FIRECRAWL' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500'}`}
                                        >
                                            Firecrawl
                                        </button>
                                        <button 
                                            onClick={() => setProviderConfig(p => ({ ...p, reader: 'UNSTRUCTURED' }))}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded border ${providerConfig.reader === 'UNSTRUCTURED' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500'}`}
                                        >
                                            Unstruct.
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type="password"
                                            value={(providerConfig.reader === 'JINA' ? keys.jina : providerConfig.reader === 'FIRECRAWL' ? keys.firecrawl : keys.unstructured) || ''}
                                            onChange={(e) => updateKey(providerConfig.reader === 'JINA' ? 'jina' : providerConfig.reader === 'FIRECRAWL' ? 'firecrawl' : 'unstructured', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                                            placeholder="API Key..."
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <StatusIcon status={externalStatus[providerConfig.reader === 'JINA' ? 'jina' : providerConfig.reader === 'FIRECRAWL' ? 'firecrawl' : 'unstructured']} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SERP CONFIG */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3">
                                    <Globe className="w-4 h-4" /> {t.serpLabel}
                                </label>
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        <button 
                                            onClick={() => setProviderConfig(p => ({ ...p, serp: 'JINA' }))}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded border ${providerConfig.serp === 'JINA' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500'}`}
                                        >
                                            Jina
                                        </button>
                                        <button 
                                            onClick={() => setProviderConfig(p => ({ ...p, serp: 'SERPER' }))}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded border ${providerConfig.serp === 'SERPER' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500'}`}
                                        >
                                            Serper
                                        </button>
                                        <button 
                                            onClick={() => setProviderConfig(p => ({ ...p, serp: 'DUCKDUCKGO' }))}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded border ${providerConfig.serp === 'DUCKDUCKGO' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500'}`}
                                        >
                                            DDG (Free)
                                        </button>
                                    </div>
                                    
                                    {providerConfig.serp === 'TAVILY' && (
                                         <div className="relative">
                                            <input 
                                                type="password"
                                                value={keys.tavily || ''}
                                                onChange={(e) => updateKey('tavily', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                                                placeholder="tvly-..."
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <StatusIcon status={externalStatus['tavily']} />
                                            </div>
                                         </div>
                                    )}
                                    {providerConfig.serp === 'SERPER' && (
                                         <div className="relative">
                                            <input 
                                                type="password"
                                                value={keys.serper || ''}
                                                onChange={(e) => updateKey('serper', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                                                placeholder="serper-..."
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <StatusIcon status={externalStatus['serper']} />
                                            </div>
                                         </div>
                                    )}
                                     {providerConfig.serp === 'JINA' && (
                                         <div className="text-xs text-slate-400 italic text-center py-2 flex items-center justify-center gap-2">
                                            Uses Jina Key.
                                            <StatusIcon status={externalStatus['jina']} />
                                         </div>
                                    )}
                                    {providerConfig.serp === 'DUCKDUCKGO' && (
                                         <div className="text-xs text-emerald-600 italic text-center py-2 font-medium bg-emerald-50 rounded">
                                            No API Key required. Slower.
                                         </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* CLUSTERING CONFIG (NEW) */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3">
                                    <Blocks className="w-4 h-4" /> {t.clusterLabel}
                                </label>
                                <div className="space-y-3">
                                    <div className="flex gap-2 max-w-sm">
                                        <button 
                                            onClick={() => setProviderConfig(p => ({ ...p, clustering: 'GEMINI' }))}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded border ${providerConfig.clustering === 'GEMINI' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500'}`}
                                        >
                                            Gemini (Generative)
                                        </button>
                                        <button 
                                            onClick={() => setProviderConfig(p => ({ ...p, clustering: 'VOYAGE' }))}
                                            className={`flex-1 py-1.5 text-xs font-medium rounded border ${providerConfig.clustering === 'VOYAGE' ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500'}`}
                                        >
                                            Voyage AI (Vectors)
                                        </button>
                                    </div>

                                    {providerConfig.clustering === 'VOYAGE' ? (
                                        <div className="relative">
                                            <input 
                                                type="password"
                                                value={keys.voyage || ''}
                                                onChange={(e) => updateKey('voyage', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 pl-8"
                                                placeholder="voyage-..."
                                            />
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">V</span>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <StatusIcon status={externalStatus['voyage']} />
                                            </div>
                                        </div>
                                    ) : (
                                         <div className="text-xs text-slate-400 italic">
                                            Uses Gemini Key (Slower but more descriptive).
                                         </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between gap-3">
                     <button
                        onClick={handleValidation}
                        disabled={validating || !isValid}
                        className="px-4 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors flex items-center gap-2"
                     >
                        {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {validating ? t.validating : t.validateBtn}
                     </button>
                     
                     <div className="flex gap-3">
                        <button 
                            onClick={onCancel}
                            className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            {t.cancel}
                        </button>
                        <button 
                            onClick={() => onComplete({ geminiKeys, externalKeys: keys, providerConfig, model })}
                            disabled={!isValid || validating}
                            className="px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2"
                        >
                            {t.continue} <Play className="w-4 h-4 fill-current" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeySetup;
