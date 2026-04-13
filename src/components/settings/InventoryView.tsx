"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/utils/cn";
import { 
    Database, 
    Upload, 
    RefreshCw, 
    Plus, 
    Trash2, 
    Loader2, 
    BarChart3,
    Terminal,
    Search,
    Brain
} from "lucide-react";
import { analyzeManualUrlsAction } from "@/app/node-tasks/report-actions";
import { sanitizeUrl } from "@/utils/domain";

export default function InventoryView() {
    const { activeProject, updateProject } = useProjectStore();
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncingGsc, setIsSyncingGsc] = useState(false);
    const [syncProgress, setSyncProgress] = useState("");
    const [samplingStats, setSamplingStats] = useState<any>(null);
    const [editArchitectureRules, setEditArchitectureRules] = useState<any[]>([]);
    const [editArchitectureInstructions, setEditArchitectureInstructions] = useState("");
    const [newRuleName, setNewRuleName] = useState("");
    const [newRuleRegex, setNewRuleRegex] = useState("");

    useEffect(() => {
        if (activeProject) {
            setEditArchitectureRules(activeProject.architecture_rules || []);
            setEditArchitectureInstructions(activeProject.architecture_instructions || "");
            fetchInventoryCount();
        }
    }, [activeProject?.id]);

    const fetchInventoryCount = async () => {
        if (!activeProject) return;
        const { count, error } = await supabase
            .from('project_urls')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', activeProject.id);

        if (!error && count !== null) {
            setSamplingStats((prev: any) => ({
                ...prev,
                totalUrls: count,
                timestamp: new Date().toLocaleTimeString()
            }));
        }
    };

    const handleSyncGscInventory = async () => {
        if (!activeProject || !activeProject.gsc_site_url) return alert("Selecciona una propiedad GSC primero.");
        
        setIsSyncingGsc(true);
        setSyncProgress("Extrayendo inventario de Google...");
        try {
            const response = await fetch('/api/gsc/sync-urls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: activeProject.id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Error al sincronizar");
            
            alert(`Sincronización exitosa: ${data.count} URLs indexadas.`);
            fetchInventoryCount();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsSyncingGsc(false);
            setSyncProgress("");
        }
    };

    const handleRegenerateRegex = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            // Reusing logic from the original page.tsx
            const { count: realCount } = await supabase
                .from('project_urls')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', activeProject.id);

            const { data: catData } = await supabase
                .from('project_urls')
                .select('url, category')
                .eq('project_id', activeProject.id)
                .limit(2000);

            if (!catData || catData.length === 0) {
                alert("No hay URLs suficientes para analizar.");
                return;
            }

            const result = await analyzeManualUrlsAction(catData.slice(0, 1000));
            if (result.success && result.proposedRules) {
                setEditArchitectureRules(result.proposedRules);
                await updateProject(activeProject.id, { architecture_rules: result.proposedRules });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveRules = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            await updateProject(activeProject.id, {
                architecture_rules: editArchitectureRules,
                architecture_instructions: editArchitectureInstructions
            });
            alert("Inteligencia de inventario actualizada.");
        } finally {
            setIsSaving(false);
        }
    };

    const addRule = () => {
        if (!newRuleName || !newRuleRegex) return;
        const updated = [...editArchitectureRules, { name: newRuleName, regex: newRuleRegex }];
        setEditArchitectureRules(updated);
        setNewRuleName("");
        setNewRuleRegex("");
    };

    const deleteRule = (idx: number) => {
        const updated = [...editArchitectureRules];
        updated.splice(idx, 1);
        setEditArchitectureRules(updated);
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Inventario de Datos</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión de URLs e Inteligencia de Arquitectura</p>
                </div>
                
                <div className="flex gap-4">
                    <button 
                        onClick={handleSyncGscInventory}
                        disabled={isSyncingGsc}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                        {isSyncingGsc ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} className="text-indigo-500" />}
                        Sincronizar GSC
                    </button>
                    <label className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                        <Upload size={14} />
                        Subir CSV
                        <input type="file" className="hidden" accept=".csv" onChange={() => {}} />
                    </label>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 rounded-[32px] p-6 text-white border border-slate-800 shadow-xl overflow-hidden relative group">
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 font-mono">Total URLs Indexadas</p>
                        <h4 className="text-3xl font-black italic tracking-tighter">{samplingStats?.totalUrls || 0}</h4>
                    </div>
                    <Database className="absolute -right-4 -bottom-4 text-white opacity-5 rotate-12 transition-transform group-hover:scale-110" size={120} />
                </div>
                {/* Add more stats card here if needed */}
            </div>

            {/* AI Architecture Rules */}
            <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[20px] bg-white shadow-sm flex items-center justify-center border border-slate-100">
                            <Brain className="text-indigo-500" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic">IA Architecture Rules</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Definición de patrones lógicos de enlazado</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleRegenerateRegex}
                        disabled={isSaving}
                        className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Analizar con IA
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Rules List */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {editArchitectureRules.map((rule, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-[20px] border border-slate-100/50 group">
                                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                                    <Terminal size={14} className="text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{rule.name}</p>
                                    <p className="text-[9px] font-mono text-indigo-500 truncate">{rule.regex}</p>
                                </div>
                                <button 
                                    onClick={() => deleteRule(idx)}
                                    className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* New Rule Form */}
                    <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100/50 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-100 ml-1">Etiqueta (Filtro)</label>
                            <input 
                                value={newRuleName}
                                onChange={(e) => setNewRuleName(e.target.value)}
                                className="w-full bg-white border-none rounded-2xl px-5 py-3 text-xs font-bold"
                                placeholder="Ej. Categoría Productos"
                            />
                        </div>
                        <div className="flex-[2] space-y-2 w-full">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-100 ml-1">Regex Pattern</label>
                            <input 
                                value={newRuleRegex}
                                onChange={(e) => setNewRuleRegex(e.target.value)}
                                className="w-full bg-white border-none rounded-2xl px-5 py-3 text-xs font-mono text-indigo-600"
                                placeholder="/categoria/.*"
                            />
                        </div>
                        <button 
                            onClick={addRule}
                            className="h-[44px] aspect-square bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-4 pt-4 border-t border-slate-50">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Macro-instrucciones para la IA (Global Content Architecture)</label>
                        <textarea 
                            value={editArchitectureInstructions}
                            onChange={(e) => setEditArchitectureInstructions(e.target.value)}
                            rows={4}
                            className="w-full bg-slate-50 border-none rounded-2xl p-6 text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="Describe cómo la IA debe interpretar las secciones de tu web para el enlazado interno..."
                        />
                    </div>
                </div>

                <div className="p-8 bg-slate-50/30 flex justify-end">
                    <button 
                        onClick={handleSaveRules}
                        disabled={isSaving}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-3"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} className="text-indigo-400" />}
                        Guardar Inteligencia
                    </button>
                </div>
            </section>
        </div>
    );
}
