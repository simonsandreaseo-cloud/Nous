import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Navigate, Link } from 'react-router-dom';
import { FileText, Clock, ExternalLink, User as UserIcon, LogOut, ChevronRight } from 'lucide-react';
import ToolWrapper from '../components/layout/ToolWrapper';

interface Draft {
    id: number;
    title: string;
    created_at: string;
    strategy_data: any;
}

const UserDashboard: React.FC = () => {
    const { user, loading, signOut } = useAuth();
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);

    useEffect(() => {
        if (user) {
            fetchDrafts();
        }
    }, [user]);

    const fetchDrafts = async () => {
        try {
            const { data, error } = await supabase
                .from('content_drafts')
                .select('id, title, created_at, strategy_data')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDrafts(data || []);
        } catch (error) {
            console.error('Error fetching drafts:', error);
        } finally {
            setIsLoadingDrafts(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-white"><div className="w-8 h-8 border-4 border-brand-power border-t-transparent rounded-full animate-spin"></div></div>;

    if (!user) return <Navigate to="/" />;

    return (
        <ToolWrapper backTo="/" backLabel="Volver al Inicio">
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

                        {/* Reports Section */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-power/5 mb-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold text-brand-power flex items-center gap-3">
                                    <FileText className="text-brand-accent" />
                                    Mis Informes SEO
                                </h2>
                                <Link to="/herramientas/generador-informes" className="text-xs font-bold text-brand-power/50 hover:text-brand-accent uppercase tracking-widest">
                                    Nuevo +
                                </Link>
                            </div>
                            <div className="text-center py-8 border-2 border-dashed border-brand-power/5 rounded-xl">
                                <p className="text-brand-power/40 text-sm mb-4">No hay informes guardados.</p>
                                <Link to="/herramientas/generador-informes" className="inline-block px-4 py-2 bg-brand-soft text-brand-power rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-brand-accent transition-colors">
                                    Generar Informe
                                </Link>
                            </div>
                        </div>

                        {/* Saved Content Section */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-brand-power/5">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold text-brand-power flex items-center gap-3">
                                    <FileText className="text-brand-accent" />
                                    Mis Artículos
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
                                        <div key={draft.id} className="group flex items-center justify-between p-4 rounded-xl border border-brand-power/5 hover:border-brand-accent/30 hover:bg-brand-soft/10 transition-all cursor-pointer">
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
                                            <ChevronRight size={16} className="text-brand-power/20 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-brand-power/5 rounded-xl">
                                    <p className="text-brand-power/40 text-sm mb-4">No has guardado ningún artículo aún.</p>
                                    <Link to="/herramientas/redactor-ia" className="inline-block px-6 py-3 bg-brand-power text-brand-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-colors">
                                        Crear mi primer artículo
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
                                    <Link to="/herramientas/redactor-ia" className="flex items-center justify-between group">
                                        <span className="text-brand-white/70 group-hover:text-white transition-colors">Content Writer</span>
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
                                    <Link to="/herramientas/generador-informes" className="flex items-center justify-between group">
                                        <span className="text-brand-white/70 group-hover:text-white transition-colors">Generador de Informes</span>
                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </ToolWrapper>
    );
};

export default UserDashboard;
