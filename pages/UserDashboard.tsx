import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { FileText, Clock, ExternalLink, User as UserIcon, LogOut, ChevronRight, Key, Trash2, Plus, Sparkles, Folder, Globe, TrendingUp, BarChart2, CheckSquare, Mail, Eye, X, Presentation } from 'lucide-react';
import ToolWrapper from '../components/layout/ToolWrapper';
import { ProjectService, Project } from '../lib/task_manager';
import ProjectCard from '../components/projects/ProjectCard';
import ShareModal from '../components/shared/ShareModal';
import TasksDashboard from '../components/dashboard/TasksDashboard';
import TimeTrackerDashboard from '../components/dashboard/TimeTrackerDashboard';
import PageTransition from '../components/layout/PageTransition';

interface Draft {
    id: number;
    title: string;
    created_at: string;
    strategy_data: any;
    html_content?: string;
    share_token?: string;
    public_access_level?: 'none' | 'view' | 'edit';
}

interface ApiKey {
    id: number;
    provider: string;
    key_value: string;
    label?: string;
}

const UserDashboard: React.FC = () => {
    const { user, loading, signOut } = useAuth();
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isLoadingKeys, setIsLoadingKeys] = useState(true);
    const [newKey, setNewKey] = useState({ provider: 'gemini', key_value: '', label: '' });
    const [showAddKey, setShowAddKey] = useState(false);
    const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
    const [showViewer, setShowViewer] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedContent, setEditedContent] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);

    // Sharing State
    const [sharingItem, setSharingItem] = useState<{ type: 'draft' | 'report', id: any, initialAccess: any, initialToken: any } | null>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [showReportViewer, setShowReportViewer] = useState(false);

    useEffect(() => {
        if (user) {
            fetchDrafts();
            fetchKeys();
            fetchProjects();
            fetchReports();
        }
    }, [user]);

    const fetchProjects = async () => {
        try {
            const data = await ProjectService.getProjects();
            setProjects(data);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const InvitationsCard = () => {
        const [invites, setInvites] = useState<any[]>([]);
        const [loadingInvites, setLoadingInvites] = useState(true);

        useEffect(() => {
            loadInvites();
        }, []);

        const loadInvites = async () => {
            try {
                const data = await ProjectService.getUserInvitations();
                setInvites(data || []);
            } catch (e) {
                console.error("Error loading invites", e);
            } finally {
                setLoadingInvites(false);
            }
        };

        const handleAccept = async (id: number) => {
            try {
                await ProjectService.acceptInvitation(id);
                loadInvites();
                fetchProjects(); // Refresh projects to show new one
                alert("Has aceptado la invitación. ¡Bienvenido al proyecto!");
            } catch (e: any) {
                alert("Error al aceptar: " + e.message);
            }
        };

        const handleDecline = async (id: number) => {
            if (!confirm("¿Rechazar esta invitación?")) return;
            try {
                await ProjectService.declineInvitation(id);
                loadInvites();
            } catch (e: any) {
                alert("Error: " + e.message);
            }
        };

        if (loadingInvites) return null; // Or skeleton
        if (invites.length === 0) return null;

        return (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 shadow-lg text-white mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Mail size={20} />
                    Invitaciones Pendientes
                </h2>
                <div className="space-y-3">
                    {invites.map(inv => (
                        <div key={inv.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10">
                            <div>
                                <h3 className="font-bold text-lg">{inv.projects?.name || 'Proyecto desconocido'}</h3>
                                <p className="text-white/70 text-sm">Te han invitado como <span className="font-bold uppercase text-xs tracking-wider">{inv.role}</span></p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDecline(inv.id)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleAccept(inv.id)}
                                    className="px-4 py-2 bg-white text-indigo-600 hover:bg-gray-100 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                >
                                    Aceptar Invitación
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const fetchKeys = async () => {
        try {
            const { data, error } = await supabase
                .from('user_api_keys')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApiKeys(data || []);
        } catch (error) {
            console.error('Error fetching keys:', error);
        } finally {
            setIsLoadingKeys(false);
        }
    };

    const handleAddKey = async () => {
        if (!newKey.key_value) return alert("Ingresa el valor de la clave.");
        try {
            const { error } = await supabase
                .from('user_api_keys')
                .insert([{
                    user_id: user?.id,
                    provider: newKey.provider,
                    key_value: newKey.key_value,
                    label: newKey.label
                }]);

            if (error) throw error;
            setNewKey({ provider: 'gemini', key_value: '', label: '' });
            setShowAddKey(false);
            fetchKeys();
        } catch (error: any) {
            alert("Error al guardar clave: " + error.message);
        }
    };

    const handleDeleteKey = async (id: number) => {
        if (!confirm("¿Seguro que quieres eliminar esta clave?")) return;
        try {
            const { error } = await supabase
                .from('user_api_keys')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchKeys();
        } catch (error: any) {
            alert("Error al eliminar: " + error.message);
        }
    };

    const fetchDrafts = async () => {
        try {
            const { data, error } = await supabase
                .from('content_drafts')
                .select('id, title, created_at, strategy_data, html_content, share_token, public_access_level')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDrafts(data || []);
        } catch (error) {
            console.error('Error fetching drafts:', error);
        } finally {
            setIsLoadingDrafts(false);
        }
    };

    const fetchReports = async () => {
        try {
            const { data, error } = await supabase
                .from('seo_reports')
                .select('id, domain, created_at, report_data, share_token, public_access_level, report_type')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setIsLoadingReports(false);
        }
    };

    const handleDeleteReport = async (id: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este informe?')) return;
        try {
            const { error } = await supabase
                .from('seo_reports')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchReports();
        } catch (error) {
            console.error('Error deleting report:', error);
        }
    };

    const handleOpenDraft = (draft: Draft) => {
        setSelectedDraft(draft);
        setEditedTitle(draft.title || '');
        setEditedContent(draft.html_content || '');
        setShowViewer(true);
    };

    const handleSaveEditedDraft = async () => {
        if (!selectedDraft) return;
        setIsSavingDraft(true);
        try {
            const { error } = await supabase
                .from('content_drafts')
                .update({
                    title: editedTitle,
                    html_content: editedContent,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedDraft.id);

            if (error) throw error;
            setShowViewer(false);
            fetchDrafts();
        } catch (error: any) {
            alert("Error al guardar: " + error.message);
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleDeleteDraft = async (id: number) => {
        if (!confirm("¿Seguro que quieres eliminar este contenido?")) return;
        try {
            const { error } = await supabase
                .from('content_drafts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setShowViewer(false);
            fetchDrafts();
        } catch (error: any) {
            alert("Error al eliminar: " + error.message);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-white"><div className="w-8 h-8 border-4 border-brand-power border-t-transparent rounded-full animate-spin"></div></div>;

    if (!user) return <Navigate to="/" />;

    return (
        <ToolWrapper breadcrumbs={[{ label: 'Dashboard' }]}>
            <PageTransition>
                <div className="max-w-5xl mx-auto pb-20">
                    {/* Header Profile */}
                    <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
                        <div className="w-24 h-24 rounded-full bg-brand-power text-brand-white flex items-center justify-center text-4xl overflow-hidden shadow-xl border-4 border-white">
                            {user.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt={user.email} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={40} />
                            )}
                        </div>
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-bold text-brand-power mb-2">Hola, {user.user_metadata?.full_name || user.email?.split('@')[0]}</h1>
                            <p className="text-brand-power/50 text-sm mb-4">{user.email}</p>
                            <button
                                onClick={signOut}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-colors"
                            >
                                <LogOut size={14} /> Cerrar Sesión
                            </button>
                        </div>
                    </div>

                    {/* Dashboard Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        {/* Main Content Area */}
                        <div className="md:col-span-2 space-y-8">

                            {/* HELIOS INTELLIGENCE CARD (NEW) */}
                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl p-8 shadow-xl text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/30 transition-all duration-700"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                                <Sparkles className="w-5 h-5 text-indigo-300" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white tracking-tight">Helios Intelligence</h2>
                                                <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold">Algorithmic SEO Engine</p>
                                            </div>
                                        </div>
                                        <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                                            Nuevo
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-sm mb-8 leading-relaxed max-w-lg">
                                        Detecta oportunidades de "Striking Distance", canibalización y anomalías de tráfico utilizando algoritmos deterministas + IA.
                                    </p>
                                    <div className="flex gap-4">
                                        <Link to="/herramientas/helios" className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-bold text-center text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-black/10 flex items-center justify-center gap-2">
                                            <Sparkles size={16} /> Iniciar Análisis
                                        </Link>
                                        <Link to="/herramientas/helios?mode=pitch" className="px-4 py-3 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-colors border border-white/10 flex items-center gap-2">
                                            <Presentation size={16} /> Pitch Mode
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Invitations Section */}
                            <InvitationsCard />

                            {/* Time Tracker Section */}
                            <TimeTrackerDashboard />

                            {/* Projects Section */}
                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-power/5">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-bold text-brand-power flex items-center gap-3">
                                        <Folder className="text-brand-accent" />
                                        Gestión de Proyectos
                                    </h2>
                                    <Link to="/proyectos" className="text-xs font-bold text-brand-power/50 hover:text-brand-accent uppercase tracking-widest">
                                        Ver Todo +
                                    </Link>
                                </div>

                                {isLoadingProjects ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[1, 2].map(i => <div key={i} className="h-32 bg-brand-soft/20 rounded-xl animate-pulse" />)}
                                    </div>
                                ) : projects.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {projects.slice(0, 4).map(project => (
                                            <div key={project.id} className="h-full">
                                                <ProjectCard project={project} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 bg-brand-soft/10 p-6 rounded-xl border border-brand-power/5">
                                        <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                                            <Folder size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-brand-power">Tus Campañas y Tareas</h3>
                                            <p className="text-sm text-brand-power/50 mb-2">Gestiona tareas, calendario de contenidos y sitemaps.</p>
                                            <Link to="/proyectos" className="text-xs font-bold text-brand-accent uppercase tracking-widest hover:underline">
                                                Ir a Proyectos &rarr;
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* API Keys Section */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-brand-power/5">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-bold text-brand-power flex items-center gap-3">
                                        <Key className="text-brand-accent" />
                                        Gestionar API Keys
                                    </h2>
                                    <button
                                        onClick={() => setShowAddKey(!showAddKey)}
                                        className="text-xs font-bold text-brand-power hover:text-brand-accent flex items-center gap-1 uppercase tracking-widest transition-colors"
                                    >
                                        {showAddKey ? 'Cancelar' : <><Plus size={14} /> Nueva Clave</>}
                                    </button>
                                </div>

                                {showAddKey && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-8 p-6 bg-brand-soft/20 rounded-2xl border border-brand-accent/20"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-[10px] uppercase tracking-widest font-bold text-brand-power/40 mb-2">Proveedor</label>
                                                <select
                                                    value={newKey.provider}
                                                    onChange={e => setNewKey({ ...newKey, provider: e.target.value })}
                                                    className="w-full bg-white border border-brand-power/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-brand-accent"
                                                >
                                                    <option value="gemini">Google Gemini / AI Studio</option>
                                                    <option value="serper">Serper.dev (SEO)</option>
                                                    <option value="valueserp">ValueSerp (SERP)</option>
                                                    <option value="jina">Jina AI (Reader)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase tracking-widest font-bold text-brand-power/40 mb-2">Etiqueta (Opcional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej. Mi Key Personal"
                                                    value={newKey.label}
                                                    onChange={e => setNewKey({ ...newKey, label: e.target.value })}
                                                    className="w-full bg-white border border-brand-power/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-brand-accent"
                                                />
                                            </div>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-[10px] uppercase tracking-widest font-bold text-brand-power/40 mb-2">Valor de la API Key</label>
                                            <input
                                                type="password"
                                                placeholder="AIzaSy..."
                                                value={newKey.key_value}
                                                onChange={e => setNewKey({ ...newKey, key_value: e.target.value })}
                                                className="w-full bg-white border border-brand-power/10 rounded-lg px-4 py-3 text-sm font-mono outline-none focus:border-brand-accent"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddKey}
                                            className="w-full py-4 bg-brand-power text-brand-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-all shadow-lg"
                                        >
                                            Guardar Clave en Perfil
                                        </button>
                                    </motion.div>
                                )}

                                {isLoadingKeys ? (
                                    <div className="space-y-4">
                                        {[1, 2].map(i => <div key={i} className="h-20 bg-brand-soft/20 rounded-2xl animate-pulse" />)}
                                    </div>
                                ) : apiKeys.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {apiKeys.map((key) => (
                                            <div key={key.id} className="p-4 rounded-2xl border border-brand-power/5 bg-brand-soft/5 flex items-center justify-between group hover:border-brand-accent/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-power/50 group-hover:text-brand-accent">
                                                        <Sparkles size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-accent">{key.provider}</span>
                                                            {key.label && <span className="text-[10px] text-brand-power/30 font-medium">— {key.label}</span>}
                                                        </div>
                                                        <div className="text-xs font-mono text-brand-power/40 mt-0.5">
                                                            {key.key_value.substring(0, 8)}••••••••
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="p-2 text-brand-power/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 border-2 border-dashed border-brand-power/5 rounded-3xl">
                                        <p className="text-brand-power/40 text-sm">Registra tus API Keys para automatizar el uso de las herramientas.</p>
                                    </div>
                                )}
                            </div>

                            {/* Reports Section */}
                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-power/5 mb-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-bold text-brand-power flex items-center gap-3">
                                        <TrendingUp className="text-brand-accent" />
                                        Mis Informes SEO (Analista)
                                    </h2>
                                    <Link to="/herramientas/generador-informes" className="text-xs font-bold text-brand-power/50 hover:text-brand-accent uppercase tracking-widest">
                                        Nuevo +
                                    </Link>
                                </div>

                                {reports.length > 0 ? (
                                    <div className="space-y-3">
                                        {reports.map((report) => (
                                            <div
                                                key={report.id}
                                                onClick={() => {
                                                    if (report.report_type === 'helios' || report.report_data?.type === 'helios') {
                                                        navigate(`/herramientas/helios?reportId=${report.id}`);
                                                    } else {
                                                        setSelectedReport(report);
                                                        setShowReportViewer(true);
                                                    }
                                                }}
                                                className="group flex items-center justify-between p-4 rounded-xl border border-brand-power/5 hover:border-brand-accent/30 hover:bg-brand-soft/10 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                        <TrendingUp size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-brand-power text-sm">{report.domain || 'Informe SEO'}</h3>
                                                        <p className="text-xs text-brand-power/40 flex items-center gap-1 mt-1">
                                                            <Clock size={10} /> {new Date(report.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSharingItem({ type: 'report', id: report.id, initialAccess: report.public_access_level, initialToken: report.share_token }); }}
                                                            className="p-2 text-brand-power/40 hover:text-brand-accent hover:bg-white rounded-lg transition-colors"
                                                            title="Compartir Informe"
                                                        >
                                                            <Globe size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                                                            className="p-2 text-brand-power/40 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <ChevronRight size={16} className="text-brand-power/20 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 border-2 border-dashed border-brand-power/5 rounded-xl">
                                        <p className="text-brand-power/40 text-sm mb-4">No hay informes guardados.</p>
                                        <Link to="/herramientas/generador-informes" className="inline-block px-4 py-2 bg-brand-soft text-brand-power rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-brand-accent transition-colors">
                                            Generar Informe
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Saved Content Section */}
                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-power/5">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-bold text-brand-power flex items-center gap-3">
                                        <FileText className="text-brand-accent" />
                                        Mis Contenidos
                                    </h2>
                                    <Link to="/herramientas/redactor-ia" className="text-xs font-bold text-brand-power/50 hover:text-brand-accent uppercase tracking-widest">
                                        Nuevo +
                                    </Link>
                                </div>

                                {isLoadingDrafts ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-brand-soft/20 rounded-lg animate-pulse" />)}
                                    </div>
                                ) : drafts.length > 0 ? (
                                    <div className="space-y-3">
                                        {drafts.map((draft) => (
                                            <div
                                                key={draft.id}
                                                onClick={() => handleOpenDraft(draft)}
                                                className="group flex items-center justify-between p-4 rounded-xl border border-brand-power/5 hover:border-brand-accent/30 hover:bg-brand-soft/10 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-power/5 text-brand-power/30 flex items-center justify-center group-hover:bg-brand-accent group-hover:text-brand-power transition-colors">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-brand-power text-sm">{draft.title || 'Borrador sin título'}</h3>
                                                        <p className="text-xs text-brand-power/40 flex items-center gap-1 mt-1">
                                                            <Clock size={10} /> {new Date(draft.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSharingItem({ type: 'draft', id: draft.id, initialAccess: draft.public_access_level, initialToken: draft.share_token });
                                                        }}
                                                        className="p-2 text-brand-power/20 hover:text-brand-accent hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Compartir Contenido"
                                                    >
                                                        <Globe size={16} />
                                                    </button>
                                                    <ChevronRight size={16} className="text-brand-power/20 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-brand-power/5 rounded-xl">
                                        <p className="text-brand-power/40 text-sm mb-4">No has guardado ningún contenido aún.</p>
                                        <Link to="/herramientas/redactor-ia" className="inline-block px-6 py-3 bg-brand-power text-brand-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-colors">
                                            Crear mi primer contenido
                                        </Link>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Sidebar */}
                        <div className="space-y-8">
                            <div className="bg-brand-power text-brand-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent blur-[60px] opacity-20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                <h3 className="font-bold text-lg mb-6 relative z-10">Herramientas</h3>
                                <ul className="space-y-4 relative z-10">
                                    <li>
                                        <Link to="/proyectos" className="flex items-center justify-between group">
                                            <span className="text-brand-white/70 group-hover:text-white transition-colors">Gestor de Proyectos</span>
                                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/herramientas/redactor-ia" className="flex items-center justify-between group">
                                            <span className="text-brand-white/70 group-hover:text-white transition-colors">Content Writer</span>
                                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/herramientas/redactor-ia-2" className="flex items-center justify-between group">
                                            <span className="text-brand-white/70 group-hover:text-white transition-colors">Redactor IA 2.0</span>
                                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/herramientas/seo-suite" className="flex items-center justify-between group">
                                            <span className="text-brand-white/70 group-hover:text-white transition-colors">Navaja Suiza SEO</span>
                                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/herramientas/blog-viz" className="flex items-center justify-between group">
                                            <span className="text-brand-white/70 group-hover:text-white transition-colors">Blog Viz AI</span>
                                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/herramientas/helios" className="flex items-center justify-between group">
                                            <span className="text-brand-white/70 group-hover:text-white font-bold transition-colors flex items-center gap-2">
                                                <Sparkles className="w-3 h-3 text-brand-accent" /> Helios Intelligence
                                            </span>
                                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/herramientas/generador-informes" className="flex items-center justify-between group">
                                            <span className="text-brand-white/70 group-hover:text-white transition-colors">Analista de Métricas</span>
                                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Draft Viewer Modal */}
                <AnimatePresence>
                    {showViewer && selectedDraft && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowViewer(false)}
                                className="absolute inset-0 bg-brand-power/80 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                            >
                                {/* ... (rest of the modal content) ... */}
                                {/* Modal Header */}
                                <div className="p-6 border-b border-brand-power/5 flex items-center justify-between bg-brand-soft/10">
                                    <div className="flex-1 mr-4">
                                        <input
                                            type="text"
                                            value={editedTitle}
                                            onChange={(e) => setEditedTitle(e.target.value)}
                                            className="text-xl font-bold text-brand-power bg-transparent border-none outline-none w-full focus:ring-2 focus:ring-brand-accent rounded px-2"
                                            placeholder="Título del contenido"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDeleteDraft(selectedDraft.id)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar contenido"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => setShowViewer(false)}
                                            className="p-2 text-brand-power/30 hover:text-brand-power hover:bg-brand-soft/20 rounded-lg transition-colors"
                                        >
                                            <ChevronRight size={24} className="rotate-90" />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Toolbar */}
                                <div className="px-6 py-4 bg-white border-b border-brand-power/5 flex flex-wrap items-center gap-4">
                                    <button
                                        onClick={handleSaveEditedDraft}
                                        disabled={isSavingDraft}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-power text-brand-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-all shadow-sm"
                                    >
                                        <Sparkles size={14} /> {isSavingDraft ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>

                                    <div className="h-6 w-[1px] bg-brand-power/10 mx-2 hidden sm:block"></div>

                                    <Link
                                        to={`/herramientas/redactor-ia?draftId=${selectedDraft.id}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-soft text-brand-power rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-brand-accent transition-all"
                                    >
                                        <ExternalLink size={14} /> Abrir en Content Writer
                                    </Link>

                                    <Link
                                        to={`/herramientas/blog-viz?draftId=${selectedDraft.id}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-soft text-brand-power rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-brand-accent transition-all"
                                    >
                                        <Sparkles size={14} /> Pasar a BlogViz AI
                                    </Link>
                                </div>

                                {/* Modal Content Editor */}
                                <div className="flex-1 overflow-auto p-8 prose prose-slate max-w-none">
                                    <textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        className="w-full h-full min-h-[500px] border-none outline-none font-serif text-lg leading-relaxed text-brand-power/80 resize-none bg-transparent"
                                        placeholder="Escribe aquí tu contenido..."
                                    />
                                </div>

                                {/* Modal Footer Info */}
                                <div className="px-8 py-4 bg-brand-soft/5 border-t border-brand-power/5 flex items-center justify-between">
                                    <span className="text-[10px] text-brand-power/30 uppercase font-bold tracking-widest">
                                        ID: {selectedDraft.id} — Creado: {new Date(selectedDraft.created_at).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-brand-power/30 uppercase font-bold tracking-widest">
                                        {editedContent.length} caracteres
                                    </span>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Report Viewer Modal */}
                <AnimatePresence>
                    {showReportViewer && selectedReport && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowReportViewer(false)}
                                className="absolute inset-0 bg-brand-power/80 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                            >
                                <div className="p-6 border-b border-brand-power/5 flex items-center justify-between bg-brand-soft/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-brand-power">{selectedReport.domain || 'Informe SEO'}</h2>
                                            <p className="text-[10px] font-bold text-brand-power/40 uppercase tracking-widest">Generado el {new Date(selectedReport.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowReportViewer(false)}
                                        className="p-2 text-brand-power/30 hover:text-brand-power hover:bg-brand-soft/20 rounded-lg transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-auto bg-slate-50">
                                    <div className="max-w-4xl mx-auto py-12 px-6">
                                        {selectedReport.report_data?.stats && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                                                <ReportStat label="Impresiones" value={selectedReport.report_data.stats.impressions} trend={selectedReport.report_data.stats.impressionsTrend} />
                                                <ReportStat label="Clics" value={selectedReport.report_data.stats.clicks} trend={selectedReport.report_data.stats.clicksTrend} />
                                                <ReportStat label="CTR Medio" value={selectedReport.report_data.stats.ctr} trend={selectedReport.report_data.stats.ctrTrend} />
                                                <ReportStat label="Posición" value={selectedReport.report_data.stats.position} trend={selectedReport.report_data.stats.positionTrend} />
                                            </div>
                                        )}
                                        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100 prose prose-slate max-w-none shadow-slate-200/50">
                                            <style dangerouslySetInnerHTML={{
                                                __html: `
                                                 .report-content h1 { font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; line-height: 1.2; }
                                                 .report-content h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 2rem; margin-bottom: 1rem; border-left: 4px solid #4f46e5; padding-left: 1rem; }
                                                 .report-content h3 { font-size: 1.25rem; font-weight: 700; color: #334155; margin-top: 1.5rem; margin-bottom: 0.75rem; }
                                                 .report-content p { margin-bottom: 1.25rem; line-height: 1.7; color: #475569; }
                                                 .report-content ul, .report-content ol { margin-bottom: 1.25rem; padding-left: 1.25rem; }
                                                 .report-content li { margin-bottom: 0.5rem; color: #475569; }
                                                 .report-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.875rem; }
                                                 .report-content th { background: #f8fafc; padding: 0.75rem; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 700; }
                                                 .report-content td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; }
                                                 .report-content .highlight-positive { color: #059669; font-weight: 600; }
                                                 .report-content .highlight-negative { color: #dc2626; font-weight: 600; }
                                             `}} />
                                            <div
                                                className="report-content"
                                                dangerouslySetInnerHTML={{ __html: selectedReport.report_data?.html || '' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-brand-power/5 bg-white flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowReportViewer(false)}
                                        className="px-6 py-2 border border-brand-power/10 text-brand-power font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-brand-soft/10 transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                    <Link
                                        to={`/herramientas/generador-informes?reportId=${selectedReport.id}`}
                                        className="px-6 py-2 bg-brand-power text-brand-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-all shadow-lg"
                                    >
                                        Editar Informe
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </PageTransition>
            <ShareModal
                isOpen={!!sharingItem}
                onClose={() => {
                    setSharingItem(null);
                    fetchDrafts();
                    fetchReports();
                }}
                itemType={sharingItem?.type || 'draft'}
                itemId={sharingItem?.id}
                initialPublicAccess={sharingItem?.initialAccess}
                initialShareToken={sharingItem?.initialToken}
            />
        </ToolWrapper >
    );
};

const ReportStat = ({ label, value, trend }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value || '0'}</p>
        {trend !== undefined && (
            <p className={`text-[10px] font-bold mt-1 ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
        )}
    </div>
);

export default UserDashboard;
