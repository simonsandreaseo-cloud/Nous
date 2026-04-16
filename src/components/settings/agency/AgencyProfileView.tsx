"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { 
    User, 
    Mail, 
    Shield, 
    Building2, 
    Globe, 
    Calendar,
    Save,
    Loader2,
    Check
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { NotificationService } from "@/lib/services/notifications";

export default function AgencyProfileView() {
    const { user } = useAuthStore();
    const [fullName, setFullName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user?.id)
                .single();
            
            if (error) throw error;
            if (data) setFullName(data.full_name || "");
        } catch (e) {
            console.error("Error fetching profile:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    full_name: fullName,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user?.id);

            if (error) throw error;
            NotificationService.success("Perfil Actualizado", "Tu identidad ha sido sincronizada.");
        } catch (e: any) {
            NotificationService.error("Error al guardar", e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Minimal Header */}
            <header className="flex justify-between items-end border-b border-slate-100 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Mi Perfil</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Configuración de Identidad y Acceso</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{user?.email}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Admin de Agencia</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                        <User size={20} />
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main Identity Form */}
                <div className="lg:col-span-2 space-y-10">
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Datos Personales</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <input 
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Ej. Alejandro Torres"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all outline-none"
                                />
                                <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest ml-1">Este nombre se mostrará en todos tus proyectos y equipos.</p>
                            </div>

                            <div className="space-y-2 opacity-60">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input 
                                        type="email"
                                        value={user?.email || ""}
                                        disabled
                                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl pl-10 pr-4 py-3.5 text-sm font-bold text-slate-400 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6 pt-6 border-t border-slate-50">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-4 bg-slate-300 rounded-full" />
                            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Metadata de Seguridad</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Shield size={16} className="text-slate-300" />
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Rol</p>
                                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight mt-1">Super Admin</p>
                                    </div>
                                </div>
                                <Check size={14} className="text-emerald-500" />
                            </div>

                            <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Calendar size={16} className="text-slate-300" />
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Miembro Desde</p>
                                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight mt-1">
                                            {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : '---'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            Sincronizar Perfil
                        </button>
                    </div>
                </div>

                {/* Info Sidebar */}
                <div className="space-y-6">
                    <div className="bg-slate-900 p-8 rounded-2xl text-white space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-white/10 transition-all duration-700" />
                        <h3 className="text-lg font-black uppercase italic tracking-tighter relative z-10">Estado Agency</h3>
                        
                        <div className="space-y-4 relative z-10">
                            {[
                                { label: "Plan", value: "Pro Enterprise" },
                                { label: "Proyectos", value: "12 / ∞" },
                                { label: "Tokens IA", value: "Ilimitados" }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                    <span className="text-[9px] font-bold uppercase opacity-40">{item.label}</span>
                                    <span className="text-[10px] font-black uppercase tracking-tight">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Zona Horaria</h4>
                        <div className="flex items-center gap-2">
                            <Globe size={14} className="text-slate-300" />
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Atlantic/Caracas (UTC-4)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
