"use client";

import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { DiscoveryWidget } from "@/components/dashboard/DiscoveryWidget";
import {
    Settings as SettingsIcon,
    Wallet,
    Shield,
    Globe,
    Save
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

export default function SettingsPage() {
    const { activeProject } = useProjectStore();

    return (
        <div className="relative min-h-screen w-full bg-[#F5F7FA] text-slate-900 font-sans">
            <NavigationHeader />

            <main className="relative z-10 pt-32 pb-20 px-6 md:px-12 max-w-[1200px] mx-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-cyan-600 uppercase font-mono">
                        <SettingsIcon size={14} />
                        Configuración del Sistema
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none mt-2">
                        {activeProject?.name || "Proyecto"} <span className="text-slate-400">Settings</span>
                    </h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Nav (Mock for now) */}
                    <aside className="space-y-2">
                        {[
                            { icon: Globe, label: "Crawlers & Discovery", active: true },
                            { icon: Wallet, label: "Presupuesto Neural", active: false },
                            { icon: Shield, label: "API & Seguridad", active: false },
                        ].map((item) => (
                            <button
                                key={item.label}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all ${item.active
                                        ? "bg-white shadow-sm border border-slate-100 text-slate-900"
                                        : "text-slate-500 hover:bg-white/50"
                                    }`}
                            >
                                <item.icon size={18} />
                                <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                    </aside>

                    {/* Main Settings Area */}
                    <div className="col-span-2 space-y-8">
                        {/* Discovery Module */}
                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Configuración de Escaneo</h2>
                            <DiscoveryWidget />
                        </div>

                        {/* Budget Configuration (Mock) */}
                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm opacity-50 grayscale pointer-events-none">
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Ajustes de Presupuesto</h2>
                            <p className="text-sm text-slate-500">Próximamente disponible en esta vista.</p>
                        </div>

                        <div className="flex justify-end">
                            <button className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-lg">
                                <Save size={18} />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
