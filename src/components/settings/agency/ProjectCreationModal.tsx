"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    X, 
    Globe, 
    Briefcase, 
    Image as ImageIcon, 
    Link as LinkIcon,
    Loader2,
    CheckCircle2,
    Search,
    AlertCircle,
    Plus
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";

interface ProjectCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProjectCreationModal({ isOpen, onClose }: ProjectCreationModalProps) {
    const { createProject } = useProjectStore();
    const [step, setStep] = useState(1);
    
    // Form Data
    const [name, setName] = useState("");
    const [domain, setDomain] = useState("");
    const [faviconUrl, setFaviconUrl] = useState("");
    const [selectedConnection, setSelectedConnection] = useState<string>("");
    const [selectedSiteUrl, setSelectedSiteUrl] = useState<string>("");
    
    // Fetching states
    const [connections, setConnections] = useState<any[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);
    const [gscSites, setGscSites] = useState<any[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setName("");
            setDomain("");
            setFaviconUrl("");
            setSelectedConnection("");
            setSelectedSiteUrl("");
            setError("");
            fetchConnections();
        }
    }, [isOpen]);

    // Auto-fetch favicon when domain changes
    useEffect(() => {
        if (domain && domain.includes(".")) {
            try {
                const url = new URL(domain.startsWith("http") ? domain : `https://${domain}`);
                setFaviconUrl(`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`);
            } catch (e) {
                // Invalid URL, do nothing
            }
        } else {
            setFaviconUrl("");
        }
    }, [domain]);

    // Fetch user connections
    const fetchConnections = async () => {
        setIsLoadingConnections(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;

            const { data, error } = await supabase
                .from('user_google_connections')
                .select('*')
                .eq('user_id', session.user.id);
            
            if (data && data.length > 0) {
                setConnections(data);
                // Auto-select first connection
                if (data.length === 1) {
                    setSelectedConnection(data[0].id);
                }
            } else {
                setConnections([]);
            }
        } catch (err) {
            console.error("Error fetching connections", err);
        } finally {
            setIsLoadingConnections(false);
        }
    };

    // Fetch sites when connection is selected
    useEffect(() => {
        const fetchSites = async () => {
            if (!selectedConnection) {
                setGscSites([]);
                return;
            }
            
            setIsLoadingSites(true);
            setError("");
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`/api/gsc/sites?connectionId=${selectedConnection}`, {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`
                    }
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Error al obtener sitios");
                
                setGscSites(data.sites || []);
                
                // Auto-match domain if possible
                if (domain && data.sites) {
                    const match = data.sites.find((s: any) => s.url.includes(domain.replace(/^https?:\/\//, '')));
                    if (match) setSelectedSiteUrl(match.url);
                }
                
            } catch (err: any) {
                setError(err.message);
                setGscSites([]);
            } finally {
                setIsLoadingSites(false);
            }
        };

        fetchSites();
    }, [selectedConnection, domain]);

    const handleSubmit = async () => {
        if (!name || !domain || !selectedConnection || !selectedSiteUrl) {
            setError("Por favor completa todos los campos requeridos.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const newProject = await createProject({
                name,
                domain: domain.replace(/^https?:\/\//, ''),
                logo_url: faviconUrl,
                gsc_connected: true,
                gsc_site_url: selectedSiteUrl,
                google_connection_id: selectedConnection,
                scraper_settings: { paths: [] },
                settings: {
                    content_preferences: {
                        min_internal_links: 2,
                        max_internal_links: 5,
                        default_strategy: 'informational'
                    },
                    images: { watermark_enabled: false, max_kb: 500 }
                }
            });

            if (newProject) {
                onClose();
            } else {
                setError("Ocurrió un error al crear el proyecto.");
            }
        } catch (err: any) {
            setError(err.message || "Error al crear el proyecto");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Nuevo Proyecto</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuración inicial y conexión GSC</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-xs font-bold text-red-600 uppercase tracking-wide leading-relaxed">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Briefcase size={12} />
                                    Nombre del Proyecto
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. Mi Blog Principal"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Globe size={12} />
                                        Dominio
                                    </label>
                                    <input
                                        type="text"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value)}
                                        placeholder="ejemplo.com"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="w-24 shrink-0">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ImageIcon size={12} />
                                        Icono
                                    </label>
                                    <div className="w-full h-[46px] bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                                        {faviconUrl ? (
                                            <img src={faviconUrl} alt="Favicon preview" className="w-6 h-6" />
                                        ) : (
                                            <Globe size={16} className="text-slate-300" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Search size={12} />
                                        Cuenta de Bóveda (GSC)
                                    </div>
                                    {connections.length === 0 && !isLoadingConnections && (
                                        <a href="/settings/agency/connections" className="text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                                            <Plus size={10} /> Añadir
                                        </a>
                                    )}
                                </label>
                                
                                {isLoadingConnections ? (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <Loader2 size={14} className="animate-spin text-slate-400" />
                                        <span className="text-xs text-slate-500">Cargando bóveda...</span>
                                    </div>
                                ) : connections.length > 0 ? (
                                    <select
                                        value={selectedConnection}
                                        onChange={(e) => setSelectedConnection(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Selecciona una cuenta...</option>
                                        {connections.map((conn) => (
                                            <option key={conn.id} value={conn.id}>{conn.email}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="px-4 py-4 bg-orange-50 border border-orange-100 rounded-2xl">
                                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide leading-relaxed">
                                            No tienes cuentas vinculadas. Debes conectar al menos una cuenta en la Bóveda de Conexiones para continuar.
                                        </p>
                                        <a 
                                            href="/settings/agency/connections"
                                            className="mt-3 inline-flex px-4 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all"
                                        >
                                            Ir a la Bóveda
                                        </a>
                                    </div>
                                )}
                            </div>

                            {selectedConnection && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <LinkIcon size={12} />
                                        Propiedad GSC
                                    </label>
                                    
                                    {isLoadingSites ? (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <Loader2 size={14} className="animate-spin text-slate-400" />
                                            <span className="text-xs text-slate-500">Obteniendo propiedades...</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedSiteUrl}
                                            onChange={(e) => setSelectedSiteUrl(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">Selecciona la URL en Search Console...</option>
                                            {gscSites.map((site) => (
                                                <option key={site.url} value={site.url}>{site.url}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!name || !domain || !selectedConnection || !selectedSiteUrl || isSubmitting}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-100"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={14} />
                                    Crear Proyecto
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
