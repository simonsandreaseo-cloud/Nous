"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/utils/cn";
import { 
    Zap, 
    Link as LinkIcon, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle,
    LayoutGrid,
    Search,
    BarChart3,
    Key,
    ExternalLink,
    Save
} from "lucide-react";

export default function IntegrationsView() {
    const { activeProject, updateProject } = useProjectStore();
    
    // Google Integration State
    const [isUserGscConnected, setIsUserGscConnected] = useState(false);
    const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
    const [gscSites, setGscSites] = useState<any[]>([]);
    const [ga4Properties, setGa4Properties] = useState<any[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    
    // WordPress State
    const [editWpUrl, setEditWpUrl] = useState("");
    const [editWpToken, setEditWpToken] = useState("");
    const [isSavingWp, setIsSavingWp] = useState(false);

    useEffect(() => {
        if (activeProject) {
            setEditWpUrl(activeProject.wp_url || "");
            setEditWpToken(activeProject.wp_token || "");
            fetchConnectedAccounts();
        }
    }, [activeProject]);

    useEffect(() => {
        if (isUserGscConnected && connectedAccounts.length > 0) {
            fetchGscSites();
            fetchGa4Sites();
        }
    }, [isUserGscConnected, connectedAccounts]);

    const fetchConnectedAccounts = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        const { data } = await supabase
            .from('user_google_connections')
            .select('id, email')
            .eq('user_id', session.user.id);
        
        if (data && data.length > 0) {
            setConnectedAccounts(data);
            setIsUserGscConnected(true);
        }
    };

    const fetchGscSites = async () => {
        setIsLoadingSites(true);
        try {
            const allSites: any[] = [];
            for (const account of connectedAccounts) {
                const res = await fetch(`/api/gsc/sites?connectionId=${account.id}`);
                const data = await res.json();
                if (data.success) {
                    allSites.push(...data.sites.map((s: any) => ({ ...s, accountEmail: account.email, connectionId: account.id })));
                }
            }
            setGscSites(allSites);
        } finally {
            setIsLoadingSites(false);
        }
    };

    const fetchGa4Sites = async () => {
        try {
            const allProps: any[] = [];
            for (const account of connectedAccounts) {
                const res = await fetch(`/api/ga4/properties?connectionId=${account.id}`);
                const data = await res.json();
                if (data.success) {
                    allProps.push(...data.sites.map((p: any) => ({ ...p, accountEmail: account.email, connectionId: account.id })));
                }
            }
            setGa4Properties(allProps);
        } catch (e) {
            console.error(e);
        }
    };

    const handleGoogleConnect = () => {
        window.location.href = `/api/auth/gsc/login?redirect=${window.location.origin}/settings/integrations`;
    };

    const handleUpdateGsc = async (siteUrl: string) => {
        if (!activeProject) return;
        const site = gscSites.find(s => s.url === siteUrl);
        await updateProject(activeProject.id, {
            gsc_site_url: siteUrl,
            gsc_connected: !!siteUrl,
            gsc_account_email: site?.accountEmail || null,
            google_connection_id: site?.connectionId || null
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
            alert("WordPress vinculado correctamente.");
        } finally {
            setIsSavingWp(false);
        }
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Integraciones API</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Conecta Nous con el ecosistema digital</p>
            </header>

            <div className="grid grid-cols-1 gap-8">
                {/* Google Ecosystem */}
                <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[20px] bg-white shadow-sm flex items-center justify-center border border-slate-100">
                                <Search className="text-indigo-500" size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic">Google Search & Analytics</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Visibilidad y Tráfico mediante APIs oficiales</p>
                            </div>
                        </div>
                        {!isUserGscConnected ? (
                            <button 
                                onClick={handleGoogleConnect}
                                className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                <Zap size={14} className="text-yellow-400" />
                                Vincular Google
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cuenta Vinculada</span>
                            </div>
                        )}
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* GSC Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Search size={12} />
                                Search Console Propiedad
                            </div>
                            <select 
                                value={activeProject.gsc_site_url || ""}
                                onChange={(e) => handleUpdateGsc(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Desconectado</option>
                                {gscSites.map((site) => (
                                    <option key={site.url} value={site.url}>{site.url} ({site.accountEmail})</option>
                                ))}
                            </select>
                        </div>

                        {/* GA4 Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                <BarChart3 size={12} />
                                Analytics GA4 Propiedad
                            </div>
                            <select 
                                value={activeProject.ga4_property_id || ""}
                                onChange={(e) => updateProject(activeProject.id, { ga4_property_id: e.target.value, ga4_connected: !!e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">Desconectado</option>
                                {ga4Properties.map((prop) => (
                                    <option key={prop.id} value={prop.id}>{prop.name} ({prop.accountEmail})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* WordPress Integration */}
                <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[20px] bg-white shadow-sm flex items-center justify-center border border-slate-100">
                                <LayoutGrid className="text-cyan-500" size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic">WordPress CMS</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Publicación automática y gestión de nodos</p>
                            </div>
                        </div>
                        {activeProject.wp_url && activeProject.wp_token ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-cyan-50 rounded-full border border-cyan-100">
                                <CheckCircle2 size={14} className="text-cyan-500" />
                                <span className="text-[9px] font-black text-cyan-600 uppercase tracking-widest">Activo</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full border border-amber-100">
                                <AlertCircle size={14} className="text-amber-500" />
                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Sin Configurar</span>
                            </div>
                        )}
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
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Application Password (App Token)</label>
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

                        <div className="flex justify-between items-center bg-slate-900 rounded-[28px] p-6 shadow-xl">
                            <div className="flex items-center gap-3">
                                <ExternalLink size={20} className="text-cyan-400" />
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Enlace de Publicación</p>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-tight">Debes habilitar la API REST en tu WordPress.</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleSaveWp}
                                disabled={isSavingWp}
                                className="px-8 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-50 transition-all flex items-center gap-2"
                            >
                                {isSavingWp ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                Vincular WP
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
