"use client";
import { useProjectStore } from "@/store/useProjectStore";
import { 
    Wallet, 
    Zap, 
    CreditCard, 
    AlertCircle,
    ArrowUpRight,
    Search,
    PenLine,
    Image as ImageIcon
} from "lucide-react";

export default function BillingView() {
    const { activeProject } = useProjectStore();

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Minimal Header */}
            <header className="flex justify-between items-end border-b border-slate-100 pb-8 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Presupuesto y Uso</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Gestión de créditos y consumo de IA</p>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Créditos Disponibles", value: "2,450", sub: "Recarga el 12 Abr", icon: Wallet, color: "bg-indigo-50 text-indigo-500" },
                    { label: "Palabras Generadas", value: "458k", sub: "Límite: 1M", icon: PenLine, color: "bg-amber-50 text-amber-500" },
                    { label: "Imágenes AI", value: "124", sub: "Límite: 500", icon: ImageIcon, color: "bg-cyan-50 text-cyan-500" },
                    { label: "Consultas GSC", value: "12,8K", sub: "Ilimitado", icon: Search, color: "bg-emerald-50 text-emerald-500" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm group hover:border-indigo-100 transition-all">
                        <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                            <stat.icon size={18} />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <h4 className="text-2xl font-black text-slate-900 mt-1 uppercase tracking-tighter">{stat.value}</h4>
                        <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-1.5">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Premium Plan Banner */}
            <div className="bg-slate-900 rounded-2xl p-10 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-3xl" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 px-3 py-1 bg-white/5 rounded border border-white/10">
                            <Zap size={10} className="text-yellow-400" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Plan Activo: Enterprise Clinical</span>
                        </div>
                        <div>
                            <h3 className="text-4xl font-black italic tracking-tighter max-w-xl leading-none">
                                ESCALABILIDAD TOTAL SIN LÍMITES DE INVESTIGACIÓN.
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-4">
                                RENOVACIÓN AUTOMÁTICA: 12 DE MAYO, 2026
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        <button className="px-8 py-5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-50 active:scale-95 transition-all shadow-2xl flex items-center gap-3">
                            Ver Facturación
                            <ArrowUpRight size={16} />
                        </button>
                        <p className="text-[8px] text-white/20 text-center font-bold uppercase tracking-widest">Infraestructura por Stripe</p>
                    </div>
                </div>
                
                <CreditCard className="absolute -left-12 -bottom-12 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform duration-1000" size={200} />
            </div>

            {/* Minimal Warning */}
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-6">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                    <AlertCircle className="text-amber-500" size={18} />
                </div>
                <div>
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Proyección de Consumo</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Al ritmo actual, los créditos de redacción se agotarán en 8 días hábiles.</p>
                </div>
            </div>
        </div>
    );
}
