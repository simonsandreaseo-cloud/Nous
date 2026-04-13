"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { 
    Database, 
    Globe2, 
    Plus, 
    Trash2, 
    Save, 
    RefreshCw,
    Search
} from "lucide-react";
import { cn } from "@/utils/cn";

export default function ProjectInventoryView() {
    const { activeProject, updateProject } = useProjectStore();
    
    const [paths, setPaths] = useState<string[]>([]);
    const [newPath, setNewPath] = useState("");
    const [targetCountry, setTargetCountry] = useState("ES");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (activeProject) {
            setPaths(activeProject.scraper_settings?.paths || []);
            setTargetCountry(activeProject.target_country || "ES");
        }
    }, [activeProject]);

    const handleAddPath = () => {
        if (!newPath) return;
        const normalized = newPath.trim().replace(/\/+$/, "");
        if (!paths.includes(normalized)) {
            setPaths([...paths, normalized]);
        }
        setNewPath("");
    };

    const handleRemovePath = (pathToRemove: string) => {
        setPaths(paths.filter(p => p !== pathToRemove));
    };

    const handleSave = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            await updateProject(activeProject.id, {
                scraper_settings: {
                    ...activeProject.scraper_settings,
                    paths
                },
                target_country: targetCountry
            });
        } finally {
            setIsSaving(true);
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Inventario de Contenidos</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Define el alcance del rastreo y la segmentación geográfica</p>
            </header>

            <div className="grid grid-cols-1 gap-8">
                {/* Geotargeting Section */}
                <section className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <Globe2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic">Segmentación Geográfica</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">País objetivo para el análisis de SERPs y volumen</p>
                        </div>
                    </div>

                    <div className="max-w-xs space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de País (ISO)</label>
                        <select 
                            value={targetCountry}
                            onChange={(e) => setTargetCountry(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                        >
                            <option value="ES">España (ES)</option>
                            <option value="MX">México (MX)</option>
                            <option value="CO">Colombia (CO)</option>
                            <option value="AR">Argentina (AR)</option>
                            <option value="CL">Chile (CL)</option>
                            <option value="US">Estados Unidos (US)</option>
                            <option value="PE">Perú (PE)</option>
                        </select>
                    </div>
                </section>

                {/* Scraper Paths Section */}
                <section className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-500">
                            <Search size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic">Mapa de Rastreo (Inventory)</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">URLs raíz que Nous analizará para detectar contenidos</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <input 
                                value={newPath}
                                onChange={(e) => setNewPath(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddPath()}
                                className="flex-1 bg-slate-50 border-none rounded-xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all"
                                placeholder="https://miweb.com/blog"
                            />
                            <button 
                                onClick={handleAddPath}
                                className="px-6 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {paths.map((path) => (
                                <div key={path} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl group/item">
                                    <span className="text-[11px] font-bold text-slate-600 truncate mr-2">{path}</span>
                                    <button 
                                        onClick={() => handleRemovePath(path)}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {paths.length === 0 && (
                                <div className="col-span-full py-8 text-center bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-100">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No hay rutas configuradas</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-200"
                        >
                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                            Guardar Inventario
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
