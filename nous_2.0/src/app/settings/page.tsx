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
    Trash2
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";

export default function SettingsPage() {
    const { activeProject, projects, createProject, deleteProject, fetchProjects } = useProjectStore();
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDomain, setNewProjectDomain] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchProjects();

        // Check for GSC auth callback params
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('gsc') === 'connected') {
                // Refresh projects to reflect the new connection status
                fetchProjects().then(() => {
                    alert("Google Search Console conectado exitosamente.");
                });
                // Clear params
                window.history.replaceState({}, '', window.location.pathname);
            } else if (params.get('error')) {
                alert(`Error al conectar GSC: ${params.get('error')}`);
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [fetchProjects]);

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
        <div className="relative min-h-screen w-full bg-[#F5F7FA] text-slate-900 font-sans">
            <NavigationHeader />

            <main className="relative z-10 pt-32 pb-20 px-6 md:px-12 max-w-[1200px] mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-cyan-600 uppercase font-mono">
                        <SettingsIcon size={14} />
                        Configuración del Sistema
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none mt-2">
                        {activeProject?.name || "Proyecto"} <span className="text-slate-400">Settings</span>
                    </h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Nav */}
                    <aside className="space-y-2">
                        {[
                            { icon: Globe, label: "Proyectos & Dominios", active: true },
                            { icon: Wallet, label: "Presupuesto", active: false },
                            { icon: Shield, label: "API & Llaves", active: false },
                        ].map((item) => (
                            <button
                                key={item.label}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all ${item.active
                                    ? "bg-white shadow-sm border border-slate-100 text-slate-900"
                                    : "text-slate-500 hover:bg-white/50"
                                    }`}
                            >
                                <item.icon size={18} />
                                <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                    </aside>

                    {/* Main Settings Area */}
                    <div className="col-span-2 space-y-8">
                        {/* Project Management */}
                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Mis Proyectos</h2>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center gap-2"
                                >
                                    <Plus size={14} /> Nuevo
                                </button>
                            </div>

                            {isCreating && (
                                <div className="mb-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wide">Nuevo Proyecto</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Nombre del Proyecto"
                                            className="p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 ring-cyan-500 outline-none"
                                            value={newProjectName}
                                            onChange={(e) => setNewProjectName(e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Dominio (ej: sitio.com)"
                                            className="p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 ring-cyan-500 outline-none"
                                            value={newProjectDomain}
                                            onChange={(e) => setNewProjectDomain(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 font-bold text-xs uppercase hover:text-slate-800">Cancelar</button>
                                        <button onClick={handleCreate} className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-bold text-xs uppercase hover:bg-cyan-600 shadow-lg shadow-cyan-500/20">Crear Proyecto</button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {projects.map(project => (
                                    <div key={project.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-500">
                                                {project.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{project.name}</h4>
                                                <p className="text-xs text-slate-400 font-mono">{project.domain}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {project.id === activeProject?.id && <span className="text-[10px] font-bold text-cyan-500 bg-cyan-50 px-2 py-1 rounded-full uppercase tracking-widest border border-cyan-100">Activo</span>}
                                            <button
                                                onClick={() => deleteProject(project.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 border-t border-slate-50 pt-6">
                                <h3 className="text-sm font-bold text-slate-900 mb-4">Integraciones</h3>
                                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                            <Globe size={20} className="text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Google Search Console</p>
                                            <p className="text-xs text-slate-400">Conecta para ver métricas reales</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => window.location.href = '/api/auth/gsc/login'}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                                            activeProject?.gsc_connected
                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default"
                                                : "bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
                                        )}
                                        disabled={activeProject?.gsc_connected}
                                    >
                                        {activeProject?.gsc_connected ? "Conectado" : "Conectar GSC"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-lg">
                                <Save size={18} />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
