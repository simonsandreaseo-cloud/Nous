"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { Save, Loader2, Shield, Weight, Image as ImageIcon, Sparkles, Layers, Plus, Trash2 } from "lucide-react";
import { Switch } from "@headlessui/react";
import { cn } from "@/utils/cn";
import { ImagePreset } from "@/types/project";

const AVAILABLE_MODELS = [
    { id: "flux", label: "Flux 1 Pro", provider: "Pollinations", quality: "ULTRA", color: "text-rose-600 bg-rose-50 border-rose-200" },
    { id: "grok-imagine-pro", label: "Grok Pro", provider: "Pollinations", quality: "ALTA", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { id: "wan-image-pro", label: "Wan Pro", provider: "Pollinations", quality: "MEDIA-ALTA", color: "text-amber-600 bg-amber-50 border-amber-200" }
];

const RATIOS = [
    { id: "16:9", label: "Apaisado (16:9)" },
    { id: "1:1", label: "Cuadrado (1:1)" },
    { id: "4:3", label: "Estándar (4:3)" },
    { id: "9:16", label: "Vertical (9:16)" },
    { id: "auto", label: "Automático (IA decide)" },
    { id: "custom", label: "Libre (Custom)" }
];

export default function ProjectImagesView() {
    const { activeProject, updateProject } = useProjectStore();
    const [isSaving, setIsSaving] = useState(false);

    // Initial State from project settings
    const [settings, setSettings] = useState<{
        watermark_enabled: boolean;
        max_kb: number;
        master_prompt: string;
        portada_preset: ImagePreset;
        body_presets: ImagePreset[];
    }>({
        watermark_enabled: true,
        max_kb: 250,
        master_prompt: "",
        portada_preset: {
            id: "portada-main",
            type: "portada",
            ratio: "16:9",
            width: 1280,
            height: 720,
            model: "flux",
            mini_prompt: ""
        },
        body_presets: [
            {
                id: "body-slot-1",
                type: "body",
                ratio: "auto",
                width: 800,
                height: 450,
                model: "flux",
                mini_prompt: ""
            }
        ]
    });

    useEffect(() => {
        if (activeProject?.settings?.images) {
            const imgSettings = activeProject.settings.images;
            setSettings({
                watermark_enabled: imgSettings.watermark_enabled ?? true,
                max_kb: imgSettings.max_kb ?? 250,
                master_prompt: imgSettings.master_prompt ?? "",
                portada_preset: imgSettings.portada_preset || {
                    id: "portada-main",
                    type: "portada",
                    ratio: "16:9",
                    width: imgSettings.portada?.width || 1280,
                    height: imgSettings.portada?.height || 720,
                    model: "flux",
                    mini_prompt: ""
                },
                body_presets: imgSettings.body_presets?.length ? imgSettings.body_presets : [
                    {
                        id: "body-slot-1",
                        type: "body",
                        ratio: "auto",
                        width: imgSettings.body?.width || 800,
                        height: imgSettings.body?.height || 450,
                        model: "flux",
                        mini_prompt: ""
                    }
                ]
            });
        }
    }, [activeProject]);

    const handleSave = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            const updatedSettings = {
                ...activeProject.settings,
                images: {
                    ...activeProject.settings?.images,
                    watermark_enabled: settings.watermark_enabled,
                    max_kb: settings.max_kb,
                    master_prompt: settings.master_prompt,
                    portada_preset: settings.portada_preset,
                    body_presets: settings.body_presets
                }
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

    // Helper for Smart Ratio Calculations
    const handleDimensionChange = (preset: ImagePreset, field: 'width' | 'height', value: number): ImagePreset => {
        const newPreset = { ...preset, [field]: value };
        
        if (preset.ratio !== "custom" && preset.ratio !== "auto") {
            const [w, h] = preset.ratio.split(':').map(Number);
            if (field === 'width') {
                newPreset.height = Math.round((value * h) / w);
            } else {
                newPreset.width = Math.round((value * w) / h);
            }
        }
        return newPreset;
    };

    const handleRatioChange = (preset: ImagePreset, newRatio: string): ImagePreset => {
        const newPreset = { ...preset, ratio: newRatio as any };
        if (newRatio !== "custom" && newRatio !== "auto") {
            const [w, h] = newRatio.split(':').map(Number);
            newPreset.height = Math.round((preset.width * h) / w);
        }
        return newPreset;
    };

    const addBodySlot = () => {
        setSettings(prev => ({
            ...prev,
            body_presets: [
                ...prev.body_presets,
                {
                    id: `body-slot-${Date.now()}`,
                    type: "body",
                    ratio: "auto",
                    width: 800,
                    height: 450,
                    model: "flux",
                    mini_prompt: ""
                }
            ]
        }));
    };

    const removeBodySlot = (id: string) => {
        setSettings(prev => ({
            ...prev,
            body_presets: prev.body_presets.filter(p => p.id !== id)
        }));
    };

    const updateBodySlot = (id: string, newPreset: ImagePreset) => {
        setSettings(prev => ({
            ...prev,
            body_presets: prev.body_presets.map(p => p.id === id ? newPreset : p)
        }));
    };

    if (!activeProject) return null;

    const SlotEditor = ({ preset, onChange, onRemove, isPortada }: { preset: ImagePreset, onChange: (p: ImagePreset) => void, onRemove?: () => void, isPortada?: boolean }) => {
        const activeModel = AVAILABLE_MODELS.find(m => m.id === preset.model) || AVAILABLE_MODELS[0];
        
        return (
            <div className={cn("p-5 rounded-[24px] border border-slate-100 bg-white shadow-sm space-y-4 relative group transition-all", isPortada ? "border-indigo-100 bg-indigo-50/10" : "")}>
                {onRemove && (
                    <button 
                        onClick={onRemove}
                        className="absolute right-4 top-4 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
                
                <div className="flex items-center gap-3">
                    <div className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest", isPortada ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500")}>
                        {isPortada ? 'Portada (Hero)' : 'Cuerpo (Slot)'}
                    </div>
                    {preset.ratio === 'auto' && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                            <Sparkles size={10} /> IA decide orientación
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Selectors */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Motor Gráfico (IA)</label>
                            <select 
                                value={preset.model}
                                onChange={(e) => onChange({ ...preset, model: e.target.value })}
                                className={cn("w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer", activeModel.color)}
                            >
                                {AVAILABLE_MODELS.map(m => (
                                    <option key={m.id} value={m.id}>{m.label} ({m.provider}) - Calidad: {m.quality}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Proporción (Ratio)</label>
                            <select 
                                value={preset.ratio}
                                onChange={(e) => onChange(handleRatioChange(preset, e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            >
                                {RATIOS.map(r => (
                                    <option key={r.id} value={r.id}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Dimensions */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Ancho (px)</label>
                                <input 
                                    type="number"
                                    value={preset.width}
                                    onChange={(e) => onChange(handleDimensionChange(preset, 'width', parseInt(e.target.value) || 0))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Alto (px)</label>
                                <input 
                                    type="number"
                                    value={preset.height}
                                    onChange={(e) => onChange(handleDimensionChange(preset, 'height', parseInt(e.target.value) || 0))}
                                    disabled={preset.ratio !== 'custom' && preset.ratio !== 'auto'}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Mini-Prompt (Específico)</label>
                            <input 
                                type="text"
                                value={preset.mini_prompt}
                                onChange={(e) => onChange({ ...preset, mini_prompt: e.target.value })}
                                placeholder="Ej: Logo centrado, colores pastel..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-300"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">WriterStudio V3</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Motor de Imágenes & Diseño Editorial</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Global Esthetics & Tech */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Master Prompt */}
                    <section className="space-y-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">ADN Visual</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Master Prompt</p>
                            </div>
                        </div>

                        <textarea 
                            value={settings.master_prompt}
                            onChange={(e) => setSettings({ ...settings, master_prompt: e.target.value })}
                            placeholder="Directiva global: hyperrealista, fotografía premiada del National Geographic, iluminación dramática, 35mm..."
                            className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-medium text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none transition-all placeholder:text-slate-300"
                        />
                        <p className="text-[10px] font-medium text-slate-500 italic leading-snug">
                            Esta instrucción se adjuntará automáticamente a TODAS las imágenes generadas para mantener una estética coherente en el proyecto.
                        </p>
                    </section>

                    {/* Tech Config */}
                    <section className="space-y-6 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                                <Shield size={18} />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Técnica & Peso</h3>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="space-y-1">
                                <p className="text-[11px] font-black text-slate-700 uppercase">Marca de Agua</p>
                                <p className="text-[9px] text-slate-400 font-bold">Logo en esquina inferior</p>
                            </div>
                            <Switch
                                checked={settings.watermark_enabled}
                                onChange={(val) => setSettings({ ...settings, watermark_enabled: val })}
                                className={cn(
                                    settings.watermark_enabled ? "bg-indigo-500" : "bg-slate-200",
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none"
                                )}
                            >
                                <span className={cn(
                                    settings.watermark_enabled ? "translate-x-5" : "translate-x-0",
                                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                )} />
                            </Switch>
                        </div>

                        <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                                <Weight size={14} className="text-slate-500" />
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Peso Máx. (KB)</label>
                            </div>
                            <input 
                                type="number"
                                value={settings.max_kb}
                                onChange={(e) => setSettings({ ...settings, max_kb: parseInt(e.target.value) || 0 })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">El procesador Node ajustará la calidad WebP.</p>
                        </div>
                    </section>
                </div>

                {/* Right Column: Slot Manager */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 shadow-inner">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
                                    <Layers size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Gestor de Slots (Plantillas)</h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Presets para el equipo de redacción</p>
                                </div>
                            </div>
                            <button 
                                onClick={addBodySlot}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-emerald-300 hover:text-emerald-600 transition-all shadow-sm"
                            >
                                <Plus size={14} /> Añadir Slot
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Portada is fixed */}
                            <SlotEditor 
                                preset={settings.portada_preset} 
                                onChange={(p) => setSettings({ ...settings, portada_preset: p })}
                                isPortada={true}
                            />
                            
                            {/* Dynamic Body Slots */}
                            {settings.body_presets.map((preset) => (
                                <SlotEditor 
                                    key={preset.id}
                                    preset={preset}
                                    onChange={(p) => updateBodySlot(preset.id, p)}
                                    onRemove={() => removeBodySlot(preset.id)}
                                />
                            ))}
                            
                            {settings.body_presets.length === 0 && (
                                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-[24px]">
                                    <ImageIcon size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-500">No hay plantillas configuradas para el cuerpo.</p>
                                    <p className="text-[10px] text-slate-400 mt-1">El redactor tendrá que configurar las imágenes manualmente.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <footer className="fixed bottom-0 left-0 right-0 lg:left-64 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 px-8 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-3 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:scale-100"
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
