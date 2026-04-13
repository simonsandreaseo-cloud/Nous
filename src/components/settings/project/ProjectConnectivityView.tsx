"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { supabase } from "@/lib/supabase";
import { 
    Zap, 
    Link as LinkIcon, 
    RefreshCw, 
    CheckCircle2, 
    Search,
    BarChart3,
    Key,
    ExternalLink,
    Save,
    LayoutGrid,
    AlertCircle
} from "lucide-react";
import { cn } from "@/utils/cn";

export default function ProjectConnectivityView() {
    const { activeProject, updateProject } = useProjectStore();
    
    const [vaultConnections, setVaultConnections] = useState<any[]>([]);
    const [gscSites, setGscSites] = useState<any[]>([]);
    const [ga4Properties, setGa4Properties] = useState<any[]>([]);
    const [isLoadingVault, setIsLoadingVault] = useState(false);
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    
    // WordPress State
    const [editWpUrl, setEditWpUrl] = useState("");
    const [editWpToken, setEditWpToken] = useState("");
    const [isSavingWp, setIsSavingWp] = useState(false);

    useEffect(() => {
        if (activeProject) {
            setEditWpUrl(activeProject.wp_url || "");
            setEditWpToken(activeProject.wp_token || "");
            fetchVaultConnections();
        }
    }, [activeProject]);

    useEffect(() => {
        if (activeProject?.google_connection_id) {
            fetchGscSites(activeProject.google_connection_id);
            fetchGa4Sites(activeProject.google_connection_id);
        }
    }, [activeProject?.google_connection_id]);

    const fetchVaultConnections = async () => {
        setIsLoadingVault(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        const { data } = await supabase
            .from('user_google_connections')
            .select('id, email')
            .eq('user_id', session.user.id);
        
        if (data) setVaultConnections(data);
        setIsLoadingVault(false);
    };

    const fetchGscSites = async (connectionId: string) => {
        setIsLoadingSites(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/gsc/sites?connectionId=${connectionId}`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setGscSites(data.sites);
            }
        } finally {
            setIsLoadingSites(false);
        }
    };

    const fetchGa4Sites = async (connectionId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/ga4/properties?connectionId=${connectionId}`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setGa4Properties(data.sites);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateGsc = async (siteUrl: string) => {
        if (!activeProject) return;
        const site = gscSites.find(s => s.url === siteUrl);
        await updateProject(activeProject.id, {
            gsc_site_url: siteUrl,
            gsc_connected: !!siteUrl
        });
    };

    const handleSaveWp = async () => {
        if (!activeProject) return;
        setIsSavingWp(true);
        try {
            await updateProject(activeProject.id, {
                wp_url: editWpUrl,
                wp_token: editWpToken
            });
        } finally {
            setIsSavingWp(false);
        }
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Conectividad de Datos</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Vincula este proyecto con las cuentas de la Bóveda</p>
            </header>

            <div className="grid grid-cols-1 gap-8">
                {/* Google Connection Selector */}
                <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[20px] bg-white shadow-sm flex items-center justify-center border border-slate-100">
                                <Search className="text-indigo-500" size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic">Google Vault Source</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Selecciona una cuenta de tu Bóveda Global</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cuenta de la Bóveda</label>
                            <select 
                                value={activeProject.google_connection_id || ""}
                                onChange={(e) => updateProject(activeProject.id, { google_connection_id: e.target.value })}
                                className="bg-slate-100 border-none rounded-2xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">--- Sin Cuenta ---</option>
                                {vaultConnections.map((conn) => (
                                    <option key={conn.id} value={conn.id}>{conn.email}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* GSC Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Search size={12} />
                                Propiedad GSC (URL)
                            </div>
                            <select 
                                value={activeProject.gsc_site_url || ""}
                                onChange={(e) => handleUpdateGsc(e.target.value)}
                                disabled={!activeProject.google_connection_id || isLoadingSites}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                            >
                                <option value="">Desconectado</option>
                                {gscSites.map((site) => (
                                    <option key={site.url} value={site.url}>{site.url}</option>
                                ))}
                            </select>
                        </div>

                        {/* GA4 Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <BarChart3 size={12} />
                                Propiedad GA4 (ID)
                            </div>
                            <select 
                                value={activeProject.ga4_property_id || ""}
                                onChange={(e) => updateProject(activeProject.id, { ga4_property_id: e.target.value, ga4_connected: !!e.target.value })}
                                disabled={!activeProject.google_connection_id}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                            >
                                <option value="">Desconectado</option>
                                {ga4Properties.map((prop) => (
                                    <option key={prop.id} value={prop.id}>{prop.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!activeProject.google_connection_id && (
                        <div className="px-8 pb-8 flex items-center gap-3 text-amber-600 bg-amber-50">
                            <AlertCircle size={16} />
                            <p className="text-[10px] font-bold uppercase">Primero vincula una cuenta en la Bóveda de Conexiones de la Agencia.</p>
                        </div>
                    )}
                </section>

                {/* WordPress Integration (Manual context) */}
                <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[20px] bg-white shadow-sm flex items-center justify-center border border-slate-100">
                                <LayoutGrid className="text-cyan-500" size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic">WordPress CMS</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Destino de publicación para este proyecto</p>
                            </div>
                        </div>
                        {activeProject.wp_url ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Conectado</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">WordPress URL</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input 
                                        value={editWpUrl}
                                        onChange={(e) => setEditWpUrl(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500/20"
                                        placeholder="https://miweb.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Application Password</label>
                                <div className="relative">
                                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input 
                                        type="password"
                                        value={editWpToken}
                                        onChange={(e) => setEditWpToken(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500/20"
                                        placeholder="xxxx xxxx xxxx xxxx"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button 
                                onClick={handleSaveWp}
                                disabled={isSavingWp}
                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                {isSavingWp ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                Guardar Credenciales WP
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
