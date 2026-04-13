"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { User, Mail, Shield, Building2, Globe, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function AgencyProfileView() {
    const { user } = useAuthStore();
    
    // De momento usamos los datos del usuario como perfil de agencia simplificado
    // En el futuro esto tirará de la tabla 'agencies'
    
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Hero */}
            <div className="relative h-48 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                <div className="absolute inset-0 flex items-center px-12">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-2xl relative group overflow-hidden">
                            <Building2 className="text-indigo-300 w-12 h-12" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Perfil de Agencia</h1>
                            <p className="text-indigo-300/60 font-medium text-xs uppercase tracking-[0.2em] mt-1">Identidad Corporativa & Accesos</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Information Cards */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                             <User size={18} className="text-indigo-500" /> Datos del Administrador
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Mail size={10} /> Correo Electrónico
                                </label>
                                <p className="text-sm font-bold text-slate-700">{user?.email}</p>
                            </div>
                            
                            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Shield size={10} /> Rol en la Plataforma
                                </label>
                                <p className="text-sm font-bold text-slate-700 capitalize">Administrador de Agencia</p>
                            </div>

                            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Calendar size={10} /> Miembro desde
                                </label>
                                <p className="text-sm font-bold text-slate-700">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : '---'}
                                </p>
                            </div>

                            <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Globe size={10} /> Zona Horaria
                                </label>
                                <p className="text-sm font-bold text-slate-700">UTC-4 (Atlantic/Caracas)</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-tight mb-6">Próximamente: Marca Blanca</h2>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6 italic">
                            Estamos preparando las herramientas de personalización para que puedas subir tu logo corporativo, definir colores de marca y configurar un dominio propio para tus clientes.
                        </p>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "35%" }}
                                className="h-full bg-indigo-500 rounded-full"
                            />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Progreso</span>
                            <span className="text-[9px] font-black text-indigo-500 uppercase">35% Completado</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar Card */}
                <div className="space-y-8">
                    <div className="bg-indigo-600 rounded-xl p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-all" />
                        <h3 className="text-lg font-black uppercase italic tracking-tight mb-4 relative z-10">Estado de Cuenta</h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-[10px] font-bold uppercase opacity-60">Plan Actual</span>
                                <span className="text-xs font-black uppercase">Agency Pro</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-[10px] font-bold uppercase opacity-60">Proyectos Activos</span>
                                <span className="text-xs font-black uppercase">14 / ∞</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-[10px] font-bold uppercase opacity-60">Tokens IA</span>
                                <span className="text-xs font-black uppercase">Ilimitados</span>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-3 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">
                            Gestionar Suscripción
                        </button>
                    </div>

                    <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Seguridad</h3>
                        <div className="space-y-3">
                            <button className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all text-left uppercase tracking-widest">
                                Cambiar Contraseña
                            </button>
                            <button className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all text-left uppercase tracking-widest">
                                Activar 2FA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
