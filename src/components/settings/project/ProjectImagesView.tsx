"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { Save, Loader2, Image as ImageIcon, Shield, Weight, Maximize2 } from "lucide-react";
import { Switch } from "@headlessui/react";
import { cn } from "@/utils/cn";

export default function ProjectImagesView() {
    const { activeProject, updateProject } = useProjectStore();
    const [isSaving, setIsSaving] = useState(false);

    // Initial State from project settings
    const [settings, setSettings] = useState({
        watermark_enabled: true,
        max_kb: 250,
        portada: { width: 1280, height: 720 },
        body: { width: 800, height: 450 }
    });

    useEffect(() => {
        if (activeProject?.settings?.images) {
            setSettings({
                ...settings,
                ...activeProject.settings.images
            });
        }
    }, [activeProject]);

    const handleSave = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            const updatedSettings = {
                ...activeProject.settings,
                images: settings
            };
            await updateProject(activeProject.id, {
                settings: updatedSettings
            });
        } catch (e: any) {
            console.error("Error saving image settings:", e);
        } finally {
            setIsSaving(false);
        }
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Motor de Imágenes</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuración técnica y estética de la media</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Branding & Protection */}
                <section className="space-y-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
                            <Shield size={20} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Branding & Protección</h3>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-slate-700 uppercase">Marca de Agua</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Insertar logo en esquina inferior derecha</p>
                        </div>
                        <Switch
                            checked={settings.watermark_enabled}
                            onChange={(val) => setSettings({ ...settings, watermark_enabled: val })}
                            className={cn(
                                settings.watermark_enabled ? "bg-indigo-500" : "bg-slate-200",
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
                            )}
                        >
                            <span className={cn(
                                settings.watermark_enabled ? "translate-x-5" : "translate-x-0",
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                            )} />
                        </Switch>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                            <Weight size={14} className="text-slate-400" />
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peso Máximo por Imagen (KB)</label>
                        </div>
                        <input 
                            type="number"
                            value={settings.max_kb}
                            onChange={(e) => setSettings({ ...settings, max_kb: parseInt(e.target.value) })}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            placeholder="Ej. 250"
                        />
                        <p className="px-2 text-[8px] text-slate-400 font-bold uppercase italic">La IA optimizará el WebP para no exceder este peso.</p>
                    </div>
                </section>

                {/* Sizing & Dimensions */}
                <section className="space-y-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
                            <Maximize2 size={20} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Dimensiones Estándar</h3>
                    </div>

                    {/* Portada Size */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tamaño Portada (Featured)</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter ml-1">Ancho (px)</label>
                                <input 
                                    type="number"
                                    value={settings.portada.width}
                                    onChange={(e) => setSettings({ ...settings, portada: { ...settings.portada, width: parseInt(e.target.value) } })}
                                    className="w-full bg-white border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-rose-500/20 bg-slate-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter ml-1">Alto (px)</label>
                                <input 
                                    type="number"
                                    value={settings.portada.height}
                                    onChange={(e) => setSettings({ ...settings, portada: { ...settings.portada, height: parseInt(e.target.value) } })}
                                    className="w-full bg-white border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-rose-500/20 bg-slate-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Body Size */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tamaño Cuerpo (Inline)</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter ml-1">Ancho (px)</label>
                                <input 
                                    type="number"
                                    value={settings.body.width}
                                    onChange={(e) => setSettings({ ...settings, body: { ...settings.body, width: parseInt(e.target.value) } })}
                                    className="w-full bg-white border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-rose-500/20 bg-slate-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter ml-1">Alto (px)</label>
                                <input 
                                    type="number"
                                    value={settings.body.height}
                                    onChange={(e) => setSettings({ ...settings, body: { ...settings.body, height: parseInt(e.target.value) } })}
                                    className="w-full bg-white border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-rose-500/20 bg-slate-50"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <footer className="flex justify-end pt-8 border-t border-slate-100">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:scale-100"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                            <span>Sincronizando Motor...</span>
                        </>
                    ) : (
                        <>
                            <Save size={16} className="text-indigo-400" />
                            <span>Guardar Configuración</span>
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
}
