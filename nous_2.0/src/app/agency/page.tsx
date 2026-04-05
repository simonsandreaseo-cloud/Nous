"use client";

import React, { useEffect, useState } from "react";
import { TopBar } from "@/components/office/TopBar";
import { AgencyControlTower } from "@/components/agency/AgencyControlTower";
import { TeamManagerUI } from "@/components/agency/TeamManagerUI";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users, Settings } from "lucide-react";

export default function AgencyPage() {
    const { role, loading } = usePermissions();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'teams' | 'settings'>('dashboard');

    useEffect(() => {
        if (!loading && role !== 'owner' && role !== 'partner') {
            router.push('/office'); // Protected route
        }
    }, [role, loading, router]);

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-nous-mist)]/5">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-t-[var(--color-nous-mist)] border-transparent animate-spin"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Verificando Credenciales de Socio...</span>
                </div>
            </div>
        );
    }

    if (role !== 'owner' && role !== 'partner') return null;

    return (
        <div className="flex h-screen w-screen bg-[var(--color-nous-mist)]/5 overflow-hidden relative">
            <div className="flex flex-col flex-1 z-10 relative">
                <TopBar />

                <div className="flex flex-1 overflow-hidden">
                    {/* Agency Sidebar */}
                    <div className="w-64 border-r border-hairline bg-white/40 backdrop-blur-md flex flex-col p-4 space-y-2">
                        <div className="mb-8 px-2">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Panel de Agencia</h2>
                            <p className="text-sm font-light text-slate-600">Torre de Control</p>
                        </div>

                        <button 
                            onClick={() => setActiveTab('dashboard')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${activeTab === 'dashboard' ? 'bg-[var(--color-nous-mist)] text-white shadow-lg' : 'hover:bg-white/60 text-slate-500'}`}
                        >
                            <LayoutDashboard size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Dashboard Global</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('teams')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${activeTab === 'teams' ? 'bg-[var(--color-nous-mist)] text-white shadow-lg' : 'hover:bg-white/60 text-slate-500'}`}
                        >
                            <Users size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Gestión de Equipos</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${activeTab === 'settings' ? 'bg-[var(--color-nous-mist)] text-white shadow-lg' : 'hover:bg-white/60 text-slate-500'}`}
                        >
                            <Settings size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Ajustes Agencia</span>
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto bg-transparent p-8">
                        {activeTab === 'dashboard' && <AgencyControlTower />}
                        {activeTab === 'teams' && <TeamManagerUI />}
                        {activeTab === 'settings' && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Settings size={48} className="mb-4 opacity-20" />
                                <span className="text-xs font-black uppercase tracking-widest italic">Ajustes Avanzados de Agencia (Próximamente)</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
