"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Zap, 
    RefreshCw, 
    CheckCircle2, 
    Search,
    Key,
    Trash2,
    Plus,
    Mail
} from "lucide-react";
import { cn } from "@/utils/cn";

export default function ConnectionVaultView() {
    const [connections, setConnections] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;

            const { data, error } = await supabase
                .from('user_google_connections')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (data) setConnections(data);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddConnection = () => {
        window.location.href = `/api/auth/gsc/login?redirect=${window.location.origin}/settings/agency/connections`;
    };

    const handleDeleteConnection = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta conexión? Los proyectos vinculados perderán acceso a sus datos.")) return;
        
        const { error } = await supabase
            .from('user_google_connections')
            .delete()
            .eq('id', id);

        if (!error) {
            setConnections(connections.filter(c => c.id !== id));
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Bóveda de Conexiones</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Recursos globales de la agencia</p>
                </div>
                <button 
                    onClick={handleAddConnection}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                >
                    <Plus size={14} />
                    Agregar Cuenta Google
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connections.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <Zap size={40} className="mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No hay conexiones activas</p>
                    </div>
                )}

                {connections.map((conn) => (
                    <div key={conn.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group relative">
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Mail size={24} />
                            </div>
                            <button 
                                onClick={() => handleDeleteConnection(conn.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cuenta Google</p>
                            <h3 className="text-sm font-black text-slate-900 truncate mb-4">{conn.email}</h3>
                            
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full inline-flex border border-emerald-100">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Token Activo</span>
                            </div>
                        </div>

                        {/* Status detail */}
                        <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-400">
                                <RefreshCw size={10} />
                                <span className="text-[8px] font-bold uppercase tracking-tighter">Último uso: Reciente</span>
                            </div>
                            <div className="flex items-center gap-1 text-[8px] font-black text-indigo-500 uppercase">
                                <Key size={10} /> 
                                API Activa
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && [1,2,3].map(i => (
                    <div key={i} className="bg-slate-50 rounded-[32px] border border-slate-100 p-6 h-[220px] animate-pulse" />
                ))}
            </div>

            <section className="bg-slate-900 rounded-xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10 max-w-xl">
                    <h3 className="text-xl font-black uppercase italic mb-2 tracking-tight">¿Cómo funciona la Bóveda?</h3>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                        Vencula tus cuentas de Google Search Console y Analytics aquí una sola vez. Luego, desde la configuración de cada proyecto, podrás elegir cuál de estas cuentas usar sin tener que repetir el proceso de login.
                    </p>
                </div>
                <Search className="absolute -right-8 -bottom-8 w-40 h-40 text-white/5 rotate-12" />
            </section>
        </div>
    );
}
