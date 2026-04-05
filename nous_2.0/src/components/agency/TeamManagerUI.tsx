"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Plus, UserPlus, Shield, Settings, Trash2 } from "lucide-react";

export function TeamManagerUI() {
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");

    const fetchTeamsWithManagers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('teams')
            .select('*, team_members(role, profiles(full_name, avatar_url))');
        
        if (data) setTeams(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTeamsWithManagers();
    }, []);

    const handleCreateTeam = async () => {
        if (!newTeamName) return;
        
        const { data: team, error } = await supabase
            .from('teams')
            .insert({ name: newTeamName })
            .select()
            .single();

        if (team) {
            // Also add the current user as owner of the new team
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('team_members').insert({
                    team_id: team.id,
                    user_id: user.id,
                    role: 'owner'
                });
            }
            setNewTeamName("");
            setShowCreateModal(false);
            fetchTeamsWithManagers();
        }
    };

    if (loading) return <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/40 rounded-lg border border-hairline"></div>)}
    </div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-light text-slate-800">Gestión de Equipos</h1>
                    <p className="text-sm text-slate-400 font-light">Crea y organiza las células de trabajo de tu agencia.</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-2.5 bg-[var(--color-nous-mist)] text-white rounded-md text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                    <Plus size={16} />
                    Nuevo Equipo
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {teams.map((team) => {
                    const manager = team.team_members?.find((m: any) => m.role === 'manager' || m.role === 'owner');
                    return (
                        <div key={team.id} className="glass-panel border border-hairline bg-white/40 rounded-lg p-6 flex items-center justify-between hover:bg-white/60 transition-colors">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                                    {team.name[0]}
                                </div>
                                <div>
                                    <h3 className="text-lg font-light text-slate-800">{team.name}</h3>
                                    <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <Users size={12} className="text-slate-400" />
                                            <span className="text-[10px] uppercase font-bold text-slate-400">{team.team_members?.length || 0} Agentes</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Shield size={12} className="text-[var(--color-nous-mint)]" />
                                            <span className="text-[10px] uppercase font-bold text-slate-500">Responsable: {manager?.profiles?.full_name || 'Sin asignar'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button className="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-[var(--color-nous-mist)] transition-colors border border-transparent hover:border-hairline group relative">
                                    <UserPlus size={18} />
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Asignar Manager</span>
                                </button>
                                <button className="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-[var(--color-nous-mist)] transition-colors border border-transparent hover:border-hairline group relative">
                                    <Settings size={18} />
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Ajustes</span>
                                </button>
                                <button className="p-2 rounded-lg hover:bg-red-50 text-red-200 hover:text-red-500 transition-colors border border-transparent hover:border-red-100">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Team Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl border border-hairline animate-in zoom-in-95 duration-300">
                        <h2 className="text-xl font-light text-slate-800 mb-6">Crear Nuevo Equipo</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre del Equipo</label>
                                <input 
                                    type="text" 
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    placeholder="Ej. SEO Elite, Content Team A..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-nous-mist)] transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-3 rounded-md text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleCreateTeam}
                                    className="flex-1 px-4 py-3 rounded-md text-xs font-black uppercase tracking-widest bg-[var(--color-nous-mist)] text-white shadow-lg shadow-[var(--color-nous-mist)]/20 transition-all hover:-translate-y-1"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
