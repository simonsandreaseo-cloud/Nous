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
    Loader2,
    BarChart3
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import { fetchGscSitesAction, fetchGa4PropertiesAction } from "@/app/actions/report-actions";

export default function SettingsPage() {
    const { activeProject, projects, createProject, deleteProject, fetchProjects, updateProject, setActiveProject } = useProjectStore();
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDomain, setNewProjectDomain] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<'projects' | 'integrations' | 'billing'>('projects');
    const [isUserGscConnected, setIsUserGscConnected] = useState(false);
    const [connectedAccounts, setConnectedAccounts] = useState<{ id: string, email: string }[]>([]);

    // Editing state for the active project
    const [editName, setEditName] = useState("");
    const [editDomain, setEditDomain] = useState("");
    const [editWpUrl, setEditWpUrl] = useState("");
    const [editWpToken, setEditWpToken] = useState("");
    const [editTargetCountry, setEditTargetCountry] = useState("ES"); // Default Spain
    const [editLogoUrl, setEditLogoUrl] = useState("");
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const [gscSites, setGscSites] = useState<{ url: string; permission: string; accountEmail?: string }[]>([]);
    const [ga4Properties, setGa4Properties] = useState<{ id: string; name: string; accountEmail?: string }[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    const [isLoadingGa4, setIsLoadingGa4] = useState(false);
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
                setActiveTab('integrations');
                window.history.replaceState({}, '', window.location.pathname);
            } else if (params.get('error')) {
                alert(`Error al conectar GSC: ${params.get('error')}`);
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [fetchProjects]);

    // Check if user has GSC token at user level
    useEffect(() => {
        const checkUserGsc = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    console.log("[DEBUG] Current Session User ID:", session.user.id);
                    if (activeProject) {
                        console.log("[DEBUG] Active Project User ID:", activeProject.user_id);
                    }

                    const { data: tokens, error } = await supabase
                        .from('user_gsc_tokens')
                        .select('id, user_id')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (error) {
                        console.error("[DEBUG] Error checking user GSC status:", error);
                    }
                    setIsUserGscConnected(!!tokens);
                }
            } catch (e) {
                console.warn("GSC Token check failed:", e);
            }
        };
        checkUserGsc();
    }, [activeProject?.id]);

    // Sync edit fields with active project
    useEffect(() => {
        if (activeProject) {
            setEditName(activeProject.name);
            setEditDomain(activeProject.domain);
            setEditWpUrl(activeProject.wp_url || "");
            setEditWpUrl(activeProject.wp_url || "");
            setEditWpToken(activeProject.wp_token || "");
            setEditTargetCountry(activeProject.target_country || "ES");
            setEditLogoUrl(activeProject.logo_url || "");
        }
    }, [activeProject?.id]);

    useEffect(() => {
        const fetchGscSites = async () => {
            // Now we fetch sites if user is connected OR project is connected
            if ((activeProject?.gsc_connected || isUserGscConnected)) {
                setIsLoadingSites(true);
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch('/api/gsc/sites', {
                        headers: {
                            'Authorization': `Bearer ${session?.access_token}`
                        }
                    });
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
    }, [activeProject?.id, activeProject?.gsc_connected, isUserGscConnected]);

    const handleSaveAll = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            await updateProject(activeProject.id, {
                name: editName,
                domain: editDomain,
                wp_url: editWpUrl,

                wp_token: editWpToken,
                target_country: editTargetCountry,
                logo_url: editLogoUrl
            });
            alert("Cambios guardados correctamente.");
        } catch (e: any) {
            alert("Error al guardar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar el proyecto "${name}"? Esta acción no se puede deshacer.`)) return;

        setIsSaving(true);
        try {
            await deleteProject(id);
            // After successful delete, we don't necessarily need to fetchProjects if the store is updated
            // but fetching ensures we are in sync with any DB-side changes.
            await fetchProjects();
            alert("Proyecto eliminado correctamente.");
        } catch (e: any) {
            console.error("Delete failed:", e);
            alert("No se pudo eliminar el proyecto. Probablemente tenga datos asociados (tareas, informes) que bloquean el borrado. \n\nError: " + (e.message || "Error desconocido"));
        } finally {
            setIsSaving(false);
        }
    };

    const fetchGscSites = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        setIsLoadingSites(true);
        try {
            const res = await fetchGscSitesAction(session.user.id);
            if (res.success) setGscSites(res.sites);
        } catch (e) {
            console.error("Failed to fetch GSC sites:", e);
        } finally {
            setIsLoadingSites(false);
        }
    };

    const fetchGa4Sites = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        setIsLoadingGa4(true);
        try {
            const res = await fetchGa4PropertiesAction(session.user.id);
            if (res.success) {
                setGa4Properties(res.sites);
            } else {
                if (res.error?.includes("Permisos")) {
                    alert(res.error);
                }
            }
        } catch (e: any) {
            console.error("Failed to fetch GA4 sites:", e);
        } finally {
            setIsLoadingGa4(false);
        }
    };

    const fetchConnectedAccounts = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('user_gsc_tokens')
                .select('id, email')
                .eq('user_id', session.user.id);
            if (data) setConnectedAccounts(data);
            setIsUserGscConnected((data?.length || 0) > 0);
        } catch (e) {
            console.error("Error fetching accounts:", e);
        }
    };

    useEffect(() => {
        fetchConnectedAccounts();
        if (isUserGscConnected && activeTab === 'integrations') {
            fetchGscSites();
            fetchGa4Sites();
        }
    }, [isUserGscConnected, activeTab]);

    const handleUpdateGscSite = async (siteUrl: string) => {
        if (!activeProject) return;
        const selectedSite = gscSites.find(s => s.url === siteUrl);
        try {
            await updateProject(activeProject.id, {
                gsc_site_url: siteUrl,
                gsc_connected: siteUrl !== "",
                gsc_account_email: selectedSite?.accountEmail
            });
            console.log("[DEBUG] Project GSC site updated to:", siteUrl);
        } catch (e) {
            console.error("Failed to update GSC site:", e);
        }
    };

    const handleUpdateGa4Property = async (propertyId: string) => {
        if (!activeProject) return;
        const selectedProp = ga4Properties.find(p => p.id === propertyId);
        try {
            await updateProject(activeProject.id, {
                ga4_property_id: propertyId,
                ga4_connected: propertyId !== "",
                ga4_account_email: selectedProp?.accountEmail
            });
            console.log("[DEBUG] Project GA4 property updated to:", propertyId);
        } catch (e) {
            console.error("Failed to update GA4 property:", e);
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

            // Upload to Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from('project-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
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

    const handleCreate = async () => {
        if (!newProjectName || !newProjectDomain) return;

        await createProject({
            name: newProjectName,
            domain: newProjectDomain,
            budget_settings: { type: 'count', target: 10, current: 0, mode: 'target' },
            scraper_settings: { paths: ["/"] },
            gsc_connected: false,
            ga4_connected: false
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
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none mt-2 py-4">
                        {activeTab === 'projects' ? (activeProject?.name || "Proyectos") : "Integraciones"} <span className="text-slate-400 px-2 leading-relaxed inline-block">Settings</span>
                    </h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Nav */}
                    <aside className="space-y-4">
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-4">Secciones</h3>
                            <nav className="space-y-1">
                                {[
                                    { id: 'projects', icon: Globe, label: "Proyectos & Dominios" },
                                    { id: 'integrations', icon: Shield, label: "Integraciones API" },
                                    { id: 'billing', icon: Wallet, label: "Presupuesto" },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => item.id !== 'billing' && setActiveTab(item.id as any)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                                            activeTab === item.id
                                                ? "bg-[var(--color-nous-mist)]/20 text-slate-800 shadow-sm border border-[var(--color-nous-mist)]/30"
                                                : "text-slate-500 hover:bg-slate-50 border border-transparent",
                                            item.id === 'billing' && "opacity-40 cursor-not-allowed"
                                        )}
                                    >
                                        <item.icon size={16} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Quick Project Switcher - Only visible on projects tab */}
                        {activeTab === 'projects' && (
                            <div className="bg-white/60 backdrop-blur-md border border-[var(--color-nous-mist)]/30 text-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                                <div className="relative z-10">
                                    <h3 className="text-[10px] font-black text-[var(--color-nous-mist)] uppercase tracking-widest mb-4">Proyecto Seleccionado</h3>
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
                                                            ? "bg-[var(--color-nous-mist)]/10 border-[var(--color-nous-mist)]/20 text-slate-800"
                                                            : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50"
                                                    )}
                                                >
                                                    <span className="text-xs font-bold truncate pr-4">{p.name}</span>
                                                    {p.gsc_connected && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-nous-mist)] shadow-[0_0_8px_var(--color-nous-mist)]" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />
                            </div>
                        )}
                    </aside>

                    {/* Main Settings Area */}
                    <div className="col-span-2 space-y-8">
                        {activeTab === 'projects' && (
                            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-center mb-8 relative z-10">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Editar Proyecto</h2>
                                        <p className="text-xs text-slate-400 font-medium italic">Configura la identidad y acceso de tu sitio.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="px-5 py-2.5 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-nous-mist)]/10 hover:text-[var(--color-nous-mist)] transition-all flex items-center gap-2 border border-slate-200"
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

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País Objetivo (SERP)</label>
                                            <select
                                                className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 ring-slate-100 transition-all appearance-none cursor-pointer"
                                                value={editTargetCountry}
                                                onChange={(e) => setEditTargetCountry(e.target.value)}
                                            >
                                                <option value="ES">España (ES)</option>
                                                <option value="MX">México (MX)</option>
                                                <option value="AR">Argentina (AR)</option>
                                                <option value="CO">Colombia (CO)</option>
                                                <option value="CL">Chile (CL)</option>
                                                <option value="US">Estados Unidos (US)</option>
                                                <option value="VE">Venezuela (VE)</option>
                                                <option value="PE">Perú (PE)</option>
                                                <option value="EC">Ecuador (EC)</option>
                                            </select>
                                            <p className="text-[9px] text-slate-400 font-medium ml-1">Determina qué resultados de Google se analizarán para tus briefings.</p>
                                        </div>

                                        {/* Logo Upload Section */}
                                        <div className="space-y-4 p-8 rounded-3xl border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                    <Plus size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Identidad Visual</h3>
                                                    <p className="text-[10px] text-slate-500 font-medium tracking-tight">Sube el logo de tu marca para las imágenes generadas.</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="w-24 h-24 rounded-3xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center overflow-hidden relative group">
                                                    {editLogoUrl ? (
                                                        <>
                                                            <img src={editLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                                                            <button
                                                                onClick={() => setEditLogoUrl("")}
                                                                className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 size={24} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="text-slate-300">
                                                            <Globe size={32} className="opacity-20" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <input
                                                        type="file"
                                                        id="logo-upload"
                                                        className="hidden"
                                                        accept="image/png,image/webp"
                                                        onChange={handleLogoUpload}
                                                    />
                                                    <label
                                                        htmlFor="logo-upload"
                                                        className={cn(
                                                            "inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-50 transition-all shadow-sm",
                                                            isUploadingLogo && "opacity-50 pointer-events-none"
                                                        )}
                                                    >
                                                        {isUploadingLogo ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                                                        {editLogoUrl ? "Cambiar Logo" : "Subir Logo PNG"}
                                                    </label>
                                                    <p className="text-[9px] text-slate-400">Recomendado: PNG Transparente o WebP. Tamaño sugerido 400x400px.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Project Property Selection - Only if GSC Linked Globally */}
                                        <div className={cn(
                                            "p-8 rounded-3xl border transition-all duration-700 relative overflow-hidden",
                                            isUserGscConnected ? "bg-cyan-50/20 border-cyan-100" : "bg-slate-50 border-slate-100"
                                        )}>
                                            <div className="absolute top-2 right-2 text-[8px] font-black text-cyan-500 uppercase tracking-tighter opacity-50">GSC Module v2.0</div>
                                            <div className="flex items-center gap-4 relative z-10 mb-6">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                                                    isUserGscConnected ? "bg-cyan-500 text-white" : "bg-white text-slate-300"
                                                )}>
                                                    <Globe size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Propiedad Search Console</h3>
                                                    <p className="text-[10px] text-slate-500 font-medium">Asigna un sitio de tu cuenta de Google a este proyecto.</p>
                                                </div>
                                            </div>

                                            {!isUserGscConnected ? (
                                                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Primero vincula tu cuenta de Google en la pestaña de Integraciones</p>
                                                    <button onClick={() => setActiveTab('integrations')} className="text-[10px] font-black text-cyan-600 uppercase underline decoration-cyan-200 underline-offset-4">Ir a Integraciones</button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 relative z-10">
                                                    <div className="flex gap-3">
                                                        <select
                                                            value={activeProject.gsc_site_url || ''}
                                                            onChange={(e) => handleUpdateGscSite(e.target.value)}
                                                            className="flex-1 p-3.5 bg-white border border-cyan-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 ring-cyan-500/10 transition-all appearance-none cursor-pointer"
                                                            disabled={isLoadingSites}
                                                        >
                                                            <option value="">Selecciona una propiedad de Google...</option>
                                                            {gscSites.map(site => (
                                                                <option key={site.url} value={site.url}>
                                                                    {site.url} {site.accountEmail && connectedAccounts.length > 1 ? `(${site.accountEmail})` : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {isLoadingSites && <div className="w-5 h-5 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin self-center" />}
                                                    </div>
                                                    {activeProject.gsc_site_url && (
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 inline-block w-fit">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-[9px] font-black uppercase">Vinculado a: {activeProject.gsc_site_url}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className={cn(
                                            "p-8 rounded-3xl border transition-all duration-700 relative overflow-hidden",
                                            isUserGscConnected ? "bg-amber-50/20 border-amber-100" : "bg-slate-50 border-slate-100"
                                        )}>
                                            <div className="absolute top-2 right-2 text-[8px] font-black text-amber-500 uppercase tracking-tighter opacity-50">GA4 Module v2.0</div>
                                            <div className="flex items-center gap-4 relative z-10 mb-6">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                                                    isUserGscConnected ? "bg-amber-500 text-white" : "bg-white text-slate-300"
                                                )}>
                                                    <BarChart3 size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Google Analytics 4</h3>
                                                    <p className="text-[10px] text-slate-500 font-medium tracking-tight">Vínculo para el análisis de tráfico AI (ChatGPT, Perplexity, etc).</p>
                                                </div>
                                            </div>

                                            {!isUserGscConnected ? (
                                                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Primero vincula tu cuenta de Google en Integraciones</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 relative z-10">
                                                    <div className="flex gap-3">
                                                        <select
                                                            value={activeProject.ga4_property_id || ''}
                                                            onChange={(e) => handleUpdateGa4Property(e.target.value)}
                                                            className="flex-1 p-3.5 bg-white border border-amber-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 ring-amber-500/10 transition-all appearance-none cursor-pointer"
                                                            disabled={isLoadingGa4}
                                                        >
                                                            <option value="">Selecciona una propiedad GA4...</option>
                                                            {ga4Properties.map(prop => (
                                                                <option key={prop.id} value={prop.id}>
                                                                    {prop.name} {prop.accountEmail && connectedAccounts.length > 1 ? `(${prop.accountEmail})` : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {isLoadingGa4 && <div className="w-5 h-5 border-3 border-amber-500 border-t-transparent rounded-full animate-spin self-center" />}
                                                    </div>
                                                    {activeProject.ga4_property_id && (
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 inline-block w-fit">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            <span className="text-[9px] font-black uppercase">Vinculado a GA4 ID: {activeProject.ga4_property_id}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>



                                        <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50/30 space-y-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                    <Globe size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">WordPress Bridge</h3>
                                                    <p className="text-[10px] text-slate-500 font-medium tracking-tight">Conecta este proyecto con el plugin Nous Bridge en WordPress.</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL del Sitio WP</label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://tusitio.com"
                                                        className="w-full p-4 rounded-xl border border-slate-100 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-4 ring-indigo-500/10 transition-all font-mono"
                                                        value={editWpUrl}
                                                        onChange={(e) => setEditWpUrl(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Token de Seguridad</label>
                                                    <input
                                                        type="password"
                                                        placeholder="••••••••••••"
                                                        className="w-full p-4 rounded-xl border border-slate-100 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-4 ring-indigo-500/10 transition-all font-mono"
                                                        value={editWpToken}
                                                        onChange={(e) => setEditWpToken(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-slate-400 bg-white/50 p-3 rounded-xl border border-dashed border-slate-200">
                                                Tip: Instala el plugin <strong>Nous Bridge</strong> en tu WordPress y copia el token configurado allí para permitir la publicación automática.
                                            </p>
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
                                                className="flex items-center gap-3 px-10 py-4 bg-[var(--color-nous-mist)]/20 text-[var(--color-nous-mist)] border border-[var(--color-nous-mist)]/30 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-[var(--color-nous-mist)]/30 transition-all shadow-sm disabled:opacity-50"
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
                        )}

                        {activeTab === 'integrations' && (
                            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                                <header className="mb-8">
                                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Integraciones Neurales</h2>
                                    <p className="text-xs text-slate-400 font-medium italic">Gestiona tus conexiones externas de forma global.</p>
                                </header>

                                <div className="space-y-6">
                                    {/* Google Search Console - Global Connection */}
                                    <div className={cn(
                                        "p-8 rounded-[32px] border transition-all duration-700 relative overflow-hidden",
                                        isUserGscConnected ? "bg-emerald-50/20 border-emerald-100" : "bg-slate-50 border-slate-100"
                                    )}>
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex gap-5">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg",
                                                    isUserGscConnected ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-white text-slate-300"
                                                )}>
                                                    <Globe size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-900 uppercase italic leading-none mb-2">Google Search Console</h3>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", isUserGscConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                            {isUserGscConnected ? `${connectedAccounts.length} Cuenta(s) Conectada(s)` : "Sin Vincular"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-3 max-w-sm">Permite que Simon SEO acceda a tus métricas de tráfico y rendimiento directamente desde Google.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => window.location.href = '/api/auth/gsc/login'}
                                                className={cn(
                                                    "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm",
                                                    isUserGscConnected
                                                        ? "bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 shadow-emerald-100/10"
                                                        : "bg-[var(--color-nous-mist)]/20 border border-[var(--color-nous-mist)]/30 text-[var(--color-nous-mist)] hover:bg-[var(--color-nous-mist)]/30"
                                                )}
                                            >
                                                {isUserGscConnected ? "Agregar Otra Cuenta" : "Vincular Ahora"}
                                            </button>
                                        </div>
                                        {/* Background Decor */}
                                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                                    </div>

                                    {/* Google Analytics 4 - Global Connection */}
                                    <div className={cn(
                                        "p-8 rounded-[32px] border transition-all duration-700 relative overflow-hidden",
                                        isUserGscConnected ? "bg-amber-50/20 border-amber-100" : "bg-slate-50 border-slate-100"
                                    )}>
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex gap-5">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg",
                                                    isUserGscConnected ? "bg-amber-500 text-white shadow-amber-500/20" : "bg-white text-slate-300"
                                                )}>
                                                    <BarChart3 size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-900 uppercase italic leading-none mb-2">Google Analytics 4</h3>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", isUserGscConnected ? "bg-amber-500 animate-pulse" : "bg-slate-300")} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                            {isUserGscConnected ? "Integración Activa" : "Sin Configurar"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-3 max-w-sm">Analiza el tráfico proveniente de LLMs y Chatbots AI vinculando tus propiedades de GA4.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => window.location.href = '/api/auth/gsc/login'}
                                                className={cn(
                                                    "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm",
                                                    isUserGscConnected
                                                        ? "bg-white border border-amber-100 text-amber-600 hover:bg-amber-50 shadow-amber-100/10"
                                                        : "bg-[var(--color-nous-mist)]/20 border border-[var(--color-nous-mist)]/30 text-[var(--color-nous-mist)] hover:bg-[var(--color-nous-mist)]/30"
                                                )}
                                            >
                                                {isUserGscConnected ? "Agregar Otra Cuenta" : "Vincular GA4"}
                                            </button>
                                        </div>
                                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />
                                    </div>

                                    {/* Connected Accounts List */}
                                    {connectedAccounts.length > 0 && (
                                        <div className="mt-12">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2">Cuentas de Google Vinculadas</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {connectedAccounts.map((account) => (
                                                    <div key={account.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                                <Globe size={14} />
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">{account.email || "Cuenta de Google"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100/50 px-2 py-1 rounded-full">Activa</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Placeholder for future integrations */}
                                    <div className="p-8 rounded-[32px] border border-slate-50 bg-slate-50 opacity-40 grayscale pointer-events-none">
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-5">
                                                <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-sm text-slate-200">
                                                    <Shield size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-300 uppercase italic leading-none mb-2">Claude / OpenAI</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Próximamente</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
