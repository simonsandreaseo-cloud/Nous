"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { 
    Globe, 
    Type, 
    FileText, 
    Palette, 
    Image as ImageIcon,
    Save,
    RefreshCw,
    Briefcase
} from "lucide-react";
import { cn } from "@/utils/cn";

const PRESET_COLORS = [
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#0f172a', // Slate 900
];

export default function ProjectGeneralView() {
    const { activeProject, updateProject } = useProjectStore();
    
    const [name, setName] = useState("");
    const [domain, setDomain] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState("#6366f1");
    const [logoUrl, setLogoUrl] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (activeProject) {
            setName(activeProject.name || "");
            setDomain(activeProject.domain || "");
            setDescription(activeProject.description || "");
            setColor(activeProject.color || "#6366f1");
            setLogoUrl(activeProject.logo_url || "");
        }
    }, [activeProject]);

    const handleSave = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            await updateProject(activeProject.id, {
                name,
                domain,
                description,
                color,
                logo_url: logoUrl
            });
        } finally {
            setIsSaving(true);
            // Simular feedback visual breve
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Identidad de Marca</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configura la presencia visual y datos base del proyecto</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Preview Card */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-4">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vista Previa del Proyecto</label>
                        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center group transition-all duration-500">
                            <div 
                                className="w-24 h-24 rounded-[32px] shadow-2xl flex items-center justify-center text-white overflow-hidden border-8 border-white mb-6 transform group-hover:scale-110 transition-transform duration-500"
                                style={{ backgroundColor: color }}
                            >
                                {logoUrl ? (
                                    <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Briefcase size={40} />
                                ) }
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">
                                {name || "Sin Nombre"}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                {domain || "dominio.com"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-8">
                        {/* Name & Domain */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    <Type size={12} className="text-indigo-500" />
                                    Nombre del Proyecto
                                </label>
                                <input 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="Ej: Nous Clinical"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    <Globe size={12} className="text-indigo-500" />
                                    Dominio del Proyecto
                                </label>
                                <input 
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="ejemplo.com"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <FileText size={12} className="text-indigo-500" />
                                Descripción Corta
                            </label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                                placeholder="Breve resumen del propósito de este proyecto..."
                            />
                        </div>

                        {/* Color Selector */}
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Palette size={12} className="text-indigo-500" />
                                Color de Marca (Theme)
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "w-10 h-10 rounded-xl transition-all relative overflow-hidden",
                                            color === c ? "ring-4 ring-offset-2 ring-indigo-500 scale-110 shadow-lg" : "hover:scale-105"
                                        )}
                                        style={{ backgroundColor: c }}
                                    >
                                        {color === c && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                <RefreshCw size={14} className="text-white opacity-80" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                                <div className="flex items-center gap-3 ml-2 pl-4 border-l border-slate-100">
                                    <input 
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-10 h-10 p-0 border-none bg-transparent cursor-pointer"
                                    />
                                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{color}</span>
                                </div>
                            </div>
                        </div>

                        {/* Logo URL */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <ImageIcon size={12} className="text-indigo-500" />
                                URL del Logo (Transparente recomendado)
                            </label>
                            <div className="relative">
                                <input 
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="https://imgur.com/logo.png"
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-200"
                            >
                                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                Guardar Identidad
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
