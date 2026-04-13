"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { 
    Settings, 
    Link2, 
    ArrowRightLeft, 
    Save, 
    RefreshCw,
    Sparkles,
    Info,
    LayoutGrid,
    Languages
} from "lucide-react";
import { AVAILABLE_LANGUAGES } from "@/constants/languages";
import { cn } from "@/utils/cn";

export default function ProjectContentPreferencesView() {
    const { activeProject, updateProject } = useProjectStore();
    
    const [minLinks, setMinLinks] = useState(5);
    const [maxLinks, setMaxLinks] = useState(12);
    const [strategy, setStrategy] = useState<'auto' | 'ecommerce' | 'informational'>('auto');
    const [defaultLangs, setDefaultLangs] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (activeProject?.settings?.content_preferences) {
            const prefs = activeProject.settings.content_preferences;
            setMinLinks(prefs.min_internal_links || 5);
            setMaxLinks(prefs.max_internal_links || 12);
            setStrategy(prefs.default_strategy || 'auto');
            setDefaultLangs(prefs.default_translator_languages || []);
        }
    }, [activeProject]);

    const handleSave = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            const updatedSettings = {
                ...(activeProject.settings || {}),
                content_preferences: {
                    min_internal_links: minLinks,
                    max_internal_links: maxLinks,
                    default_strategy: strategy,
                    default_translator_languages: defaultLangs
                }
            };

            await updateProject(activeProject.id, {
                settings: updatedSettings
            });
        } finally {
            setIsSaving(true);
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-indigo-600">Preferencias de Contenido</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Define el comportamiento SEO y reglas de enlazado para este proyecto</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Internal Linking Configuration */}
                    <section className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <Link2 size={120} />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm">
                                <Link2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic">Enlazado Interno (Nous Master)</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Límites para el orquestador de investigación</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Mínimo de Enlaces
                                </label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range"
                                        min="0"
                                        max="10"
                                        value={minLinks}
                                        onChange={(e) => setMinLinks(parseInt(e.target.value))}
                                        className="flex-1 accent-indigo-500 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                                    />
                                    <span className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm tabular-nums">
                                        {minLinks}
                                    </span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium leading-tight">
                                    Cantidad mínima de sugerencias internas que Nous intentará encontrar antes de dar por finalizada la fase.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Máximo de Enlaces
                                </label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range"
                                        min="1"
                                        max="25"
                                        value={maxLinks}
                                        onChange={(e) => setMaxLinks(parseInt(e.target.value))}
                                        className="flex-1 accent-indigo-500 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                                    />
                                    <span className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black text-sm tabular-nums">
                                        {maxLinks}
                                    </span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium leading-tight">
                                    Tope máximo de sugerencias. Un número alto permite más diversidad, pero satura la curación de IA.
                                </p>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50 flex justify-end">
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-200"
                            >
                                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                Guardar Preferencias
                            </button>
                        </div>
                    </section>

                    {/* Translator Default Languages */}
                    <section className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <Languages size={120} />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 shadow-sm">
                                <Languages size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic">Omni-Traductor AI</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configuración de idiomas preferidos para traducciones</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Idiomas seleccionados por defecto
                            </label>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {AVAILABLE_LANGUAGES.map(lang => {
                                    const isSelected = defaultLangs.includes(lang.code);
                                    return (
                                        <button
                                            key={lang.code}
                                            onClick={() => {
                                                setDefaultLangs(prev => 
                                                    isSelected 
                                                        ? prev.filter(c => c !== lang.code)
                                                        : [...prev, lang.code]
                                                );
                                            }}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 relative group",
                                                isSelected
                                                    ? "bg-purple-50 border-purple-200 shadow-md shadow-purple-500/5 ring-2 ring-purple-500/10"
                                                    : "bg-white border-slate-100 hover:border-slate-300 text-slate-400"
                                            )}
                                        >
                                            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{lang.flag}</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest leading-none text-center">
                                                {lang.name}
                                            </span>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                                    <div className="w-1 h-1 bg-white rounded-full" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="text-[9px] text-slate-400 font-medium leading-tight p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                Los idiomas marcados aquí aparecerán seleccionados automáticamente cada vez que abras la herramienta de traducción para un artículo de este proyecto.
                            </p>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {/* Strategy Card */}
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl pointer-events-none group-hover:opacity-20 transition-opacity">
                            <Sparkles size={80} />
                        </div>

                        <div className="flex items-center gap-3">
                            <Sparkles size={20} className="text-amber-400" />
                            <h4 className="text-[11px] font-black uppercase tracking-widest leading-none mt-1">Perfiles de Enlazado</h4>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                            Nous detecta automáticamente si el contenido es transaccional o informativo para priorizar productos o guías.
                        </p>

                        <div className="space-y-3">
                            <button 
                                onClick={() => setStrategy('auto')}
                                className={cn(
                                    "w-full px-5 py-4 rounded-2xl text-left border transition-all flex items-center justify-between group",
                                    strategy === 'auto' ? "bg-indigo-500/10 border-indigo-500/50" : "border-white/5 hover:bg-white/5"
                                )}
                            >
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-tighter">Auto-Inteligente</p>
                                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">Basado en Intención</p>
                                </div>
                                {strategy === 'auto' && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,1)]" />}
                            </button>

                            <button 
                                onClick={() => setStrategy('ecommerce')}
                                className={cn(
                                    "w-full px-5 py-4 rounded-2xl text-left border transition-all flex items-center justify-between group",
                                    strategy === 'ecommerce' ? "bg-amber-500/10 border-amber-500/50" : "border-white/5 hover:bg-white/5"
                                )}
                            >
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-tighter">E-commerce Heavy</p>
                                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">Prioriza Productos</p>
                                </div>
                                {strategy === 'ecommerce' && <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,1)]" />}
                            </button>

                            <button 
                                onClick={() => setStrategy('informational')}
                                className={cn(
                                    "w-full px-5 py-4 rounded-2xl text-left border transition-all flex items-center justify-between group",
                                    strategy === 'informational' ? "bg-cyan-500/10 border-cyan-500/50" : "border-white/5 hover:bg-white/5"
                                )}
                            >
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-tighter">Informacional Puro</p>
                                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">Solo Guías y Blogs</p>
                                </div>
                                {strategy === 'informational' && <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,1)]" />}
                            </button>
                        </div>
                    </div>

                    <div className="bg-indigo-50 rounded-[32px] p-8 space-y-4">
                        <div className="flex items-center gap-3 text-indigo-500">
                            <Info size={18} />
                            <h4 className="text-[10px] font-black uppercase tracking-widest leading-none mt-1">Tip de Arquitecto</h4>
                        </div>
                        <p className="text-[10px] text-indigo-900/60 font-medium leading-relaxed">
                            Si tu proyecto es un nicho de reviews, el perfil "Informacional" te ayudará a evitar enlazar a productos vacíos y enfocarte en comparativas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
