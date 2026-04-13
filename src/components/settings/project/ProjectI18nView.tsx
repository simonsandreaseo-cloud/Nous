"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { 
    Globe, 
    Search, 
    RefreshCw, 
    Settings, 
    Link, 
    Image as ImageIcon,
    AlertCircle,
    CheckCircle2,
    Languages,
    Database,
    Loader2,
    ChevronRight,
    PlayCircle,
    Code2,
    TestTube2,
    Plus,
    Trash2,
    Sparkles
} from "lucide-react";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useToastStore } from "@/store/useToastStore";
import { I18nService } from "@/lib/services/report/i18nService";

export default function ProjectI18nView() {
    const { activeProject, updateProject } = useProjectStore();
    const { addToast } = useToastStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [stats, setStats] = useState({
        totalUrls: 0,
        scrapedUrls: 0,
        linkedGroups: 0,
        missingLangs: 0
    });

    const fetchStats = async () => {
        if (!activeProject) return;

        // 1. Total URLs in project
        const { count: total } = await supabase
            .from('project_urls')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', activeProject.id);

        // 2. Scraped URLs (those with summary entries)
        const { count: scraped } = await supabase
            .from('url_audit_summaries')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', activeProject.id);

        // 3. Unique language groups
        const { count: groups } = await supabase
            .from('url_language_groups')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', activeProject.id);

        setStats({
            totalUrls: total || 0,
            scrapedUrls: scraped || 0,
            linkedGroups: groups || 0,
            missingLangs: (total || 0) - (scraped || 0)
        });
    };

    useEffect(() => {
        fetchStats();
    }, [activeProject?.id]);

    // Form states
    const [pattern, setPattern] = useState(activeProject?.i18n_settings?.pattern || "subdirectory");
    const [languages, setLanguages] = useState<string[]>(activeProject?.i18n_settings?.languages || []);
    const [isAdvanced, setIsAdvanced] = useState(activeProject?.i18n_settings?.pattern === 'custom' || !!activeProject?.i18n_settings?.extraction_regex);
    const [regex, setRegex] = useState(activeProject?.i18n_settings?.extraction_regex || "");
    const [defaultLang, setDefaultLang] = useState(activeProject?.i18n_settings?.default_language || "");
    const [mapping, setMapping] = useState<Record<string, string>>(activeProject?.i18n_settings?.locale_mapping || {});
    
    // Test state
    const [testUrl, setTestUrl] = useState("");
    const [testResult, setTestResult] = useState<{ lang: string | null, slug: string } | null>(null);

    const handleSaveSettings = async (overrides = {}) => {
        if (!activeProject) return;
        
        const settingsToSave = {
            ...activeProject.i18n_settings,
            pattern: isAdvanced ? "custom" : pattern,
            languages,
            extraction_regex: isAdvanced ? regex : undefined,
            locale_mapping: isAdvanced ? mapping : undefined,
            default_language: defaultLang || undefined,
            ...overrides
        };

        await updateProject(activeProject.id, {
            i18n_settings: settingsToSave
        });
    };

    const handleAutoDetect = async () => {
        if (!activeProject || isDetecting) return;
        setIsDetecting(true);

        try {
            console.log("🪄 [I18nAI] Triggering Auto-Detection for Project:", activeProject.id);
            
            const { data, error } = await supabase.functions.invoke('i18n-auto-detect', {
                body: { projectId: activeProject.id }
            });

            if (error) throw error;

            const { settings } = data;
            
            // Populate form
            setPattern(settings.pattern);
            setRegex(settings.extraction_regex);
            setLanguages(settings.languages);
            setMapping(settings.locale_mapping);
            setDefaultLang(settings.default_language);
            setIsAdvanced(true);

            addToast({
                title: "Configuración Detectada",
                description: "Nous ha analizado tu estructura. Por favor, revisa y guarda los cambios.",
                type: 'success'
            });

        } catch (err: any) {
            console.error("[I18nAI] Error:", err);
            addToast({
                title: "Error de Detección",
                description: err.message,
                type: 'error'
            });
        } finally {
            setIsDetecting(false);
        }
    };

    const runDiscovery = async () => {
        if (isProcessing || !activeProject) return;
        setIsProcessing(true);
        
        try {
            console.log("🚀 [I18nDiscovery] Triggering Edge Function for Project:", activeProject.id);
            
            const { data, error } = await supabase.functions.invoke('audit-crawler', {
                body: { projectId: activeProject.id, limit: 10 }
            });

            if (error) throw error;

            addToast({
                title: "Auditoría en proceso",
                description: `Se procesaron ${data.processed || 0} URLs con éxito`,
                type: 'success'
            });
            await fetchStats();
        } catch (err: any) {
            console.error("[I18nDiscovery] Error:", err);
            addToast({
                title: "Error de Auditoría",
                description: err.message,
                type: 'error'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">I18n & SEO Bridge</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión multidioma y auditoría técnica profunda</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Section */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Header with Advanced Toggle */}
                    <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                isAdvanced ? "bg-indigo-50 text-indigo-500" : "bg-slate-50 text-slate-400"
                            )}>
                                <Code2 size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Modo Avanzado (Beta)</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Configuración mediante Regex para sitios complejos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleAutoDetect}
                                disabled={isDetecting}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50",
                                    isDetecting && "animate-pulse"
                                )}
                            >
                                {isDetecting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                {isDetecting ? "Analizando..." : "Detectar con Nous AI"}
                            </button>
                            <button 
                                onClick={() => setIsAdvanced(!isAdvanced)}
                                className={cn(
                                    "relative w-12 h-6 rounded-full transition-colors",
                                    isAdvanced ? "bg-indigo-500" : "bg-slate-200"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                                    isAdvanced ? "left-7" : "left-1"
                                )} />
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                    {!isAdvanced ? (
                        <motion.div 
                            key="simple"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {/* Pattern Selection */}
                            <section className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
                                        <Settings size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Estructura Estándar</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Define cómo se estructuran los idiomas en el sitio</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'subdirectory', label: 'Subdirectorio', helper: '/es/pagina' },
                                        { id: 'subdomain', label: 'Subdominio', helper: 'es.sitio.com' },
                                        { id: 'prefix', label: 'Prefijo de Ruta', helper: '/espana/pagina' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => { setPattern(opt.id as any); }}
                                            className={cn(
                                                "p-6 rounded-2xl border-2 transition-all text-left",
                                                pattern === opt.id 
                                                    ? "border-slate-900 bg-slate-900 text-white" 
                                                    : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                                            )}
                                        >
                                            <p className="text-xs font-black uppercase mb-1">{opt.label}</p>
                                            <p className="text-[10px] font-mono opacity-60">{opt.helper}</p>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="advanced"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {/* Regex Config */}
                            <section className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                        <Code2 size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Extractor Regex</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Patrón para capturar el idioma (Usa paréntesis para el grupo)</p>
                                    </div>
                                    <button 
                                        onClick={() => setRegex('^\\/([a-z]{2}(?:-[a-z]{2})?)\\/')}
                                        className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1 hover:bg-indigo-50 px-3 py-1 rounded-full transition-colors"
                                    >
                                        <Sparkles size={12} /> Sugerir (Bassol)
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <input 
                                        value={regex}
                                        onChange={(e) => setRegex(e.target.value)}
                                        placeholder="Ej: ^\/([a-z]{2})\/"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-mono focus:border-indigo-500 outline-none transition-all"
                                    />
                                    
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Idioma por Defecto</label>
                                        <input 
                                            value={defaultLang}
                                            onChange={(e) => setDefaultLang(e.target.value)}
                                            placeholder="es"
                                            className="w-32 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 text-xs font-black uppercase focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Locale Mapping */}
                            <section className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                                        <RefreshCw size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Mapeo de Locales</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Normaliza los prefijos detectados</p>
                                    </div>
                                    <button 
                                        onClick={() => setMapping({...mapping, "": ""})}
                                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {Object.entries(mapping).map(([key, value], idx) => (
                                        <div key={idx} className="flex items-center gap-3 animate-in zoom-in-95 duration-200">
                                            <input 
                                                value={key}
                                                onChange={(e) => {
                                                    const newMapping = { ...mapping };
                                                    delete newMapping[key];
                                                    newMapping[e.target.value] = value;
                                                    setMapping(newMapping);
                                                }}
                                                placeholder="en-us"
                                                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-mono"
                                            />
                                            <ChevronRight size={14} className="text-slate-300" />
                                            <input 
                                                value={value}
                                                onChange={(e) => setMapping({...mapping, [key]: e.target.value})}
                                                placeholder="en"
                                                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-mono"
                                            />
                                            <button 
                                                onClick={() => {
                                                    const newMapping = { ...mapping };
                                                    delete newMapping[key];
                                                    setMapping(newMapping);
                                                }}
                                                className="text-slate-300 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {Object.keys(mapping).length === 0 && (
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4 italic">No hay mapeos activos</p>
                                    )}
                                </div>
                            </section>
                        </motion.div>
                    )}
                    </AnimatePresence>

                    {/* Languages Selection (Always visible) */}
                    <section className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                                <Languages size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Idiomas Permitidos</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Filtro de seguridad para el descubrimiento</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                             {/* Generar chips dinámicos basados en los idiomas detectados + los básicos */}
                             {Array.from(new Set([
                                 'es', 'en', 'fr', 'pt', 'de', 'it', 
                                 ...Object.keys(mapping), 
                                 ...languages
                             ])).sort().map(lang => {
                                 if (!lang) return null;
                                 const isActive = languages.includes(lang);
                                 return (
                                     <button
                                        key={lang}
                                        onClick={() => {
                                            const newLangs = isActive 
                                                ? languages.filter(l => l !== lang)
                                                : [...languages, lang];
                                            setLanguages(newLangs);
                                        }}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            isActive ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                        )}
                                     >
                                         {lang}
                                     </button>
                                 );
                             })}
                        </div>
                    </section>

                    <button 
                        onClick={() => handleSaveSettings()}
                        className="w-full py-5 bg-slate-900 text-white rounded-[32px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:scale-[1.01] transition-all"
                    >
                        Guardar Configuración Avanzada
                    </button>
                </div>

                {/* Automation & Testing Console */}
                <div className="space-y-8">
                    
                    {/* Live Test Lab */}
                    <section className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm overflow-hidden relative group">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                <TestTube2 size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Test Lab</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Verifica tu Regex en vivo</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input 
                                    value={testUrl}
                                    onChange={(e) => {
                                        const url = e.target.value;
                                        setTestUrl(url);
                                        if (url) {
                                            const lang = I18nService.detectLanguage(url, {
                                                pattern: isAdvanced ? "custom" : pattern,
                                                languages,
                                                extraction_regex: isAdvanced ? regex : undefined,
                                                locale_mapping: isAdvanced ? mapping : undefined,
                                                default_language: defaultLang
                                            } as any);
                                            const slug = I18nService.getGenericSlug(url, {
                                                pattern: isAdvanced ? "custom" : pattern,
                                                languages,
                                                extraction_regex: isAdvanced ? regex : undefined,
                                                locale_mapping: isAdvanced ? mapping : undefined,
                                                default_language: defaultLang
                                            } as any);
                                            setTestResult({ lang, slug });
                                        } else {
                                            setTestResult(null);
                                        }
                                    }}
                                    placeholder="Pega una URL de Bassol..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-bold outline-none focus:border-emerald-500 transition-all"
                                />
                            </div>

                            {testResult && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-slate-900 rounded-3xl p-6 text-white space-y-4"
                                >
                                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                        <span className="text-[8px] font-black uppercase text-slate-500">Idioma Detectado</span>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            testResult.lang ? "bg-emerald-500" : "bg-rose-500"
                                        )}>
                                            {testResult.lang || "No Detectado"}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black uppercase text-slate-500">Slug Genérico (Limpio)</span>
                                        <p className="text-[10px] font-mono break-all text-indigo-300">{testResult.slug}</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </section>

                    <section className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="mb-8">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Mapeador Inteligente</p>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">I18n Discovery Engine</h3>
                            </div>

                            <button 
                                onClick={runDiscovery}
                                disabled={isProcessing}
                                className={cn(
                                    "w-full py-4 bg-white text-slate-900 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
                                    isProcessing && "animate-pulse"
                                )}
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                                {isProcessing ? "Procesando..." : "Ejecutar Mapeo & Scrapeo"}
                            </button>

                            <div className="mt-12 grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">URLs Mapeadas</span>
                                    <span className="text-xl font-black italic">{stats.scrapedUrls.toLocaleString()}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Grupos Multiidioma</span>
                                    <span className="text-xl font-black italic text-indigo-400">{stats.linkedGroups.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <Globe className="absolute -right-12 -bottom-12 w-48 h-48 text-white/5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000" />
                    </section>

                    <section className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Próximos Pasos</h4>
                        <div className="space-y-4">
                            {[
                                { text: 'Detectar etiquetas Hreflang', icon: Link, color: 'indigo' },
                                { text: 'Analizar Metadatos Técnicos', icon: Search, color: 'cyan' },
                                { text: 'Inventariar Imágenes & ALT', icon: ImageIcon, color: 'orange' },
                                { text: 'Extraer Esquemas (Full JSON)', icon: Database, color: 'emerald' }
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", `bg-${step.color}-500`)} />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase">{step.text}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
