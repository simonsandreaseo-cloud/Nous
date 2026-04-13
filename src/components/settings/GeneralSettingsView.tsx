"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/utils/cn";
import { Globe, Save, Upload, Loader2, Palette } from "lucide-react";
import { NOUS_PALETTE } from "@/constants/colors";

export default function GeneralSettingsView() {
    const { activeProject, updateProject } = useProjectStore();
    
    const [editName, setEditName] = useState("");
    const [editDomain, setEditDomain] = useState("");
    const [editColor, setEditColor] = useState("#06b6d4");
    const [editLogoUrl, setEditLogoUrl] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    useEffect(() => {
        if (activeProject) {
            setEditName(activeProject.name);
            setEditDomain(activeProject.domain);
            setEditColor(activeProject.color || "#06b6d4");
            setEditLogoUrl(activeProject.logo_url || "");
        }
    }, [activeProject]);

    const handleSave = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            await updateProject(activeProject.id, {
                name: editName,
                domain: editDomain,
                color: editColor,
                logo_url: editLogoUrl
            });
            alert("Identidad del proyecto actualizada con éxito.");
        } catch (e: any) {
            alert("Error al guardar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject) return;

        setIsUploadingLogo(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${activeProject.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('project-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('project-assets')
                .getPublicUrl(filePath);

            setEditLogoUrl(publicUrl);
        } catch (error: any) {
            alert("Error al subir el logo: " + error.message);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    if (!activeProject) return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">Selecciona un proyecto para configurar</div>;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Configuración General</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Identidad y ADN del Proyecto</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Identity Form */}
                <div className="space-y-8 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Proyecto</label>
                            <input 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="Ej. Nous Clinical"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dominio / URL Raíz</label>
                            <div className="relative">
                                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input 
                                    value={editDomain}
                                    onChange={(e) => setEditDomain(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                                    placeholder="ejemplo.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Color de Identidad</label>
                            <div className="grid grid-cols-7 gap-2">
                                {NOUS_PALETTE.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setEditColor(color)}
                                        className={cn(
                                            "w-full aspect-square rounded-lg transition-all border-2",
                                            editColor === color 
                                                ? "border-slate-900 scale-110 shadow-lg" 
                                                : "border-transparent hover:scale-105"
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logo Section */}
                <div className="space-y-8 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="relative group overflow-hidden w-32 h-32 rounded-3xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center mb-6">
                        {editLogoUrl ? (
                            <img src={editLogoUrl} alt="Logo" className="w-full h-full object-contain p-4" />
                        ) : (
                            <div className="flex flex-col items-center text-slate-300">
                                <Upload size={24} />
                                <span className="text-[8px] font-black uppercase mt-2">No Logo</span>
                            </div>
                        )}
                        
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <label className="cursor-pointer">
                                <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">Cambiar Logo</span>
                            </label>
                        </div>
                        {isUploadingLogo && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">Identidad Visual</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest max-w-[200px]">Este logo se usará en informes, calendarios y activos generados por IA.</p>
                    </div>
                </div>
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
                            <span>Guardando ADN...</span>
                        </>
                    ) : (
                        <>
                            <Save size={16} className="text-indigo-400" />
                            <span>Guardar Cambios</span>
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
}
