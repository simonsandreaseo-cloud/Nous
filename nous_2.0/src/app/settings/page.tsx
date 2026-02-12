"use client";

import { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import {
    Settings as SettingsIcon,
    Wallet,
    Shield,
    Globe,
    Save,
    Plus,
    Trash2,
    Loader2
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";

export default function SettingsPage() {
    const { activeProject, projects, createProject, deleteProject, fetchProjects, updateProject, setActiveProject } = useProjectStore();
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDomain, setNewProjectDomain] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Editing state for the active project
    const [editName, setEditName] = useState("");
    const [editDomain, setEditDomain] = useState("");

    const [gscSites, setGscSites] = useState<{ url: string; permission: string }[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchProjects();

        // Check for GSC auth callback params
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('gsc') === 'connected') {
                fetchProjects().then(() => {
                    alert("Google Search Console conectado exitosamente.");
                });
                window.history.replaceState({}, '', window.location.pathname);
            } else if (params.get('error')) {
                alert(`Error al conectar GSC: ${params.get('error')}`);
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [fetchProjects]);

    // Sync edit fields with active project
    useEffect(() => {
        if (activeProject) {
            setEditName(activeProject.name);
            setEditDomain(activeProject.domain);
        }
    }, [activeProject?.id]);

    useEffect(() => {
        const fetchGscSites = async () => {
            if (activeProject?.gsc_connected) {
                setIsLoadingSites(true);
                try {
                    const res = await fetch('/api/gsc/sites');
                    const data = await res.json();
                    if (data.success) {
                        setGscSites(data.sites);
                    }
                } catch (e) {
                    console.error("Error fetching GSC sites:", e);
                } finally {
                    setIsLoadingSites(false);
                }
            }
        };

        fetchGscSites();
    }, [activeProject?.id, activeProject?.gsc_connected]);

    const handleSaveAll = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            await updateProject(activeProject.id, {
                name: editName,
                domain: editDomain
            });
            alert("Cambios guardados correctamente.");
        } catch (e: any) {
            alert("Error al guardar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${name}"? Esta acción no se puede deshacer.`)) {
            try {
                await deleteProject(id);
                // The store handles the filter, but re-fetching ensures DB consistency
                await fetchProjects();
                alert("Proyecto eliminado.");
            } catch (e: any) {
                alert("Error al eliminar: " + e.message);
            }
        }
    };

    const handleUpdateGscSite = async (siteUrl: string) => {
        if (!activeProject) return;
        await updateProject(activeProject.id, { gsc_site_url: siteUrl });
    };

    const handleCreate = async () => {
        if (!newProjectName || !newProjectDomain) return;

        await createProject({
            name: newProjectName,
            domain: newProjectDomain,
            budget_settings: { type: 'count', target: 10, current: 0, mode: 'target' },
            scraper_settings: { paths: ["/"] },
            gsc_connected: false
        });

        setNewProjectName("");
        setNewProjectDomain("");
        setIsCreating(false);
    };

    return (
        <div className="relative min-h-screen w-full bg-[#F5F7FA] text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900 transition-colors duration-500">
            <NavigationHeader />

            <main className="relative z-10 pt-32 pb-20 px-6 md:px-12 max-w-[1200px] mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-cyan-600 uppercase font-mono">
                        <SettingsIcon size={14} />
                        Centro de Control
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none mt-2">
                        {activeProject?.name || "Configuración"} <span className="text-slate-400">Settings</span>
                    </h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Nav */}
                    <aside className="space-y-4">
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-4">Secciones</h3>
                            <nav className="space-y-1">
                                {[
                                    { icon: Globe, label: "Proyectos & Dominios", active: true },
                                    { icon: Wallet, label: "Presupuesto", active: false },
                                    { icon: Shield, label: "API & Llaves", active: false },
                                ].map((item) => (
                                    <button
                                        key={item.label}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                                            item.active
                                                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                                                : "text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        <item.icon size={16} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Quick Project Switcher */}
                        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-4">Proyecto Seleccionado</h3>
                                <div className="space-y-3">
                                    {projects.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No hay proyectos creados.</p>
                                    ) : (
                                        projects.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setActiveProject(p.id)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                                                    activeProject?.id === p.id
                                                        ? "bg-white/10 border-white/20 text-white"
                                                        : "border-transparent text-white/40 hover:text-white/60 hover:bg-white/5"
                                                )}
                                            >
                                                <span className="text-xs font-bold truncate pr-4">{p.name}</span>
                                                {p.gsc_connected && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />
                        </div>
                    </aside>

                    {/* Main Settings Area */}
                    <div className="col-span-2 space-y-8">
                        {/* Project Editor */}
                        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-center mb-8 relative z-10">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Editar Proyecto</h2>
                                    <p className="text-xs text-slate-400 font-medium italic">Configura la identidad y acceso de tu sitio.</p>
                                </div>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 border border-slate-200"
                                >
                                    <Plus size={14} /> Nuevo Proyecto
                                </button>
                            </div>

                            {isCreating && (
                                <div className="mb-8 p-8 bg-slate-50 rounded-3xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
                                    <h3 className="text-xs font-black mb-6 uppercase tracking-widest text-slate-900">Crear Nuevo Nodo</h3>
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Mi Proyecto Pro"
                                                className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 ring-cyan-500/10 outline-none transition-all"
                                                value={newProjectName}
                                                onChange={(e) => setNewProjectName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dominio</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: sitio.com"
                                                className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 ring-cyan-500/10 outline-none transition-all"
                                                value={newProjectDomain}
                                                onChange={(e) => setNewProjectDomain(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setIsCreating(false)} className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800">Cancelar</button>
                                        <button onClick={handleCreate} className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-600 shadow-xl shadow-cyan-500/20 transition-all">Crear Proyecto</button>
                                    </div>
                                </div>
                            )}

                            {activeProject ? (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador Público</label>
                                            <input
                                                type="text"
                                                className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 ring-slate-100 transition-all"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dominio / URL Raíz</label>
                                            <input
                                                type="text"
                                                className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 ring-slate-100 transition-all font-mono"
                                                value={editDomain}
                                                onChange={(e) => setEditDomain(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Google Search Console - Contextual */}
                                    <div className={cn(
                                        "p-8 rounded-3xl border transition-all duration-700 relative overflow-hidden",
                                        activeProject.gsc_connected
                                            ? "bg-emerald-50/20 border-emerald-100"
                                            : "bg-slate-50 border-slate-100"
                                    )}>
                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="flex gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                                                    activeProject.gsc_connected ? "bg-emerald-500 text-white" : "bg-white text-slate-300"
                                                )}>
                                                    <Globe size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Google Search Console</h3>
                                                    <p className="text-[10px] text-slate-500 font-medium">
                                                        {activeProject.gsc_connected
                                                            ? "Métricas neurales activas. Verifica la propiedad vinculada."
                                                            : "Vincular propiedad de GSC para análisis de tráfico real."}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => window.location.href = '/api/auth/gsc/login'}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                    activeProject.gsc_connected
                                                        ? "bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                        : "bg-slate-900 text-white hover:bg-black"
                                                )}
                                            >
                                                {activeProject.gsc_connected ? "Re-conectar" : "Vincular Ahora"}
                                            </button>
                                        </div>

                                        {activeProject.gsc_connected && (
                                            <div className="mt-8 pt-6 border-t border-emerald-100/50 animate-in fade-in slide-in-from-top-2 relative z-10">
                                                <label className="text-[10px] font-black text-emerald-700/50 uppercase tracking-[0.2em] block mb-3">Propiedad de Dominio</label>
                                                <div className="flex gap-3">
                                                    <select
                                                        value={activeProject.gsc_site_url || ''}
                                                        onChange={(e) => handleUpdateGscSite(e.target.value)}
                                                        className="flex-1 p-3.5 bg-white border border-emerald-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 ring-emerald-500/10 transition-all appearance-none cursor-pointer"
                                                        disabled={isLoadingSites}
                                                    >
                                                        <option value="">Selecciona una propiedad disponible...</option>
                                                        {gscSites.map(site => (
                                                            <option key={site.url} value={site.url}>{site.url}</option>
                                                        ))}
                                                    </select>
                                                    {isLoadingSites && <div className="w-5 h-5 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin self-center" />}
                                                </div>
                                                {activeProject.gsc_site_url ? (
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Nodo activo en: {activeProject.gsc_site_url}</span>
                                                    </div>
                                                ) : (
                                                    <p className="mt-3 text-[10px] font-bold text-amber-600 flex items-center gap-1 italic">
                                                        ⚠ Pendiente de selección de propiedad.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {/* Background decoration */}
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12 pointer-events-none">
                                            <Globe size={180} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-50 pt-8">
                                        <button
                                            onClick={() => handleDelete(activeProject.id, activeProject.name)}
                                            className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} /> Eliminar Proyecto
                                        </button>
                                        <button
                                            onClick={handleSaveAll}
                                            disabled={isSaving}
                                            className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-cyan-600 transition-all shadow-xl shadow-slate-900/10 hover:shadow-cyan-500/20 disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                            Guardar Configuración
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                                    <Globe size={48} className="mb-4 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Selecciona un proyecto para configurar</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
