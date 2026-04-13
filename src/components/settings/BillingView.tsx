"use client";
import { useProjectStore } from "@/store/useProjectStore";
import { 
    Wallet, 
    Zap, 
    CreditCard, 
    BarChart3, 
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
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Presupuesto y Uso</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión de créditos y consumo de IA</p>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Créditos Disponibles", value: "2,450", sub: "Recarga el 12 Abr", icon: Wallet, color: "text-indigo-500" },
                    { label: "Palabras Generadas", value: "458k", sub: "Límite: 1M", icon: PenLine, color: "text-amber-500" },
                    { label: "Imágenes AI", value: "124", sub: "Límite: 500", icon: ImageIcon, color: "text-cyan-500" },
                    { label: "Consultas GSC", value: "12,8K", sub: "Ilimitado", icon: Search, color: "text-emerald-500" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                        <stat.icon size={20} className={stat.color + " mb-4"} />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <h4 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Plans */}
            <div className="bg-slate-900 rounded-xl p-10 text-white relative overflow-hidden group">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                            <Zap size={12} className="text-yellow-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Plan Actual: Enterprise Clinical</span>
                        </div>
                        <h3 className="text-3xl font-black italic tracking-tighter max-w-md">Maximiza tu visibilidad con créditos ilimitados de investigación.</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-sm">Tu suscripción se renueva automáticamente el próximo mes.</p>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <button className="px-10 py-5 bg-white text-slate-900 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3">
                            Gestionar Facturación
                            <ArrowUpRight size={18} />
                        </button>
                        <p className="text-[9px] text-slate-500 text-center font-bold uppercase tracking-widest">Powered by Stripe</p>
                    </div>
                </div>
                
                <CreditCard className="absolute -right-10 -bottom-10 text-white opacity-5 rotate-12 transition-transform group-hover:scale-110" size={240} />
            </div>

            {/* Usage Warning */}
            <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100 flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <AlertCircle className="text-amber-500" size={24} />
                </div>
                <div>
                    <h5 className="text-[11px] font-black text-amber-800 uppercase tracking-tight">Proyección de Consumo</h5>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Al ritmo actual, agotarás tus créditos de redacción en 8 días. Considera ampliar tu plan.</p>
                </div>
            </div>
        </div>
    );
}
