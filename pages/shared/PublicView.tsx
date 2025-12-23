import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Globe, Edit3, Eye, Home } from 'lucide-react';

// We'll dynamically import or selectively render components based on type
import ContentWriterView from './views/ContentWriterView';
import SeoReportView from './views/SeoReportView';
import ProjectPublicView from './views/ProjectPublicView';

const PublicView: React.FC = () => {
    const { type, token } = useParams<{ type: string; token: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [item, setItem] = useState<any>(null);
    const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');

    useEffect(() => {
        fetchSharedItem();
    }, [type, token]);

    const fetchSharedItem = async () => {
        setLoading(true);
        setError(null);
        try {
            const tableMap: any = {
                project: 'projects',
                draft: 'content_drafts',
                report: 'seo_reports'
            };

            const tableName = tableMap[type || ''];
            if (!tableName) throw new Error('Tipo de contenido no válido');

            const { data, error: fetchError } = await supabase
                .from(tableName)
                .select('*')
                .eq('share_token', token)
                .single();

            if (fetchError || !data) {
                console.error(fetchError);
                throw new Error('No se encontró el contenido o el enlace ha expirado');
            }

            if (data.public_access_level === 'none') {
                throw new Error('Este contenido ya no es público');
            }

            setItem(data);
            setAccessLevel(data.public_access_level);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-brand-white">
                <Loader2 className="w-12 h-12 text-brand-accent animate-spin mb-4" />
                <p className="text-brand-power/40 font-bold uppercase tracking-widest animate-pulse">Cargando contenido compartido...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-brand-white p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6 font-bold">
                    <AlertCircle size={40} />
                </div>
                <h1 className="text-2xl font-bold text-brand-power mb-2">Vaya, algo ha salido mal</h1>
                <p className="text-brand-power/60 mb-8 max-w-md">{error}</p>
                <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-power text-brand-white rounded-xl font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-all">
                    <Home size={18} /> Volver al Inicio
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-white">
            {/* Minimal Public Header */}
            <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-power text-brand-white flex items-center justify-center">
                        <Globe size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-brand-power truncate max-w-[200px] md:max-w-md">{item.title || item.name || 'Contenido compartido'}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            {accessLevel === 'edit' ? (
                                <span className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-indigo-100">
                                    <Edit3 size={10} /> Editaractivado
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-100">
                                    <Eye size={10} /> Solo lectura
                                </span>
                            )}
                            <span className="text-[10px] text-brand-power/30 font-bold uppercase tracking-widest">• simonsandrea-seo</span>
                        </div>
                    </div>
                </div>

                <Link to="/" className="hidden md:flex items-center gap-2 text-xs font-bold text-brand-power/40 hover:text-brand-power uppercase tracking-widest transition-colors">
                    Acceder a la plataforma <Home size={14} />
                </Link>
            </header>

            <main className="animate-in fade-in duration-700">
                {type === 'draft' && <ContentWriterView item={item} accessLevel={accessLevel} />}
                {type === 'report' && <SeoReportView item={item} accessLevel={accessLevel} />}
                {type === 'project' && <ProjectPublicView item={item} accessLevel={accessLevel} />}
            </main>
        </div>
    );
};

export default PublicView;
