"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, Users, Briefcase, Zap, TrendingUp, Clock } from "lucide-react";

export function AgencyControlTower() {
    const [stats, setStats] = useState({
        totalTeams: 0,
        totalProjects: 0,
        activeSpecialists: 0,
        totalTasksPending: 0
    });
    const [recentProjects, setRecentProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGlobalStats = async () => {
            setLoading(true);
            try {
                // 1. Fetch Teams Count
                const { count: teamCount } = await supabase.from('teams').select('*', { count: 'exact', head: true });
                
                // 2. Fetch Projects Count
                const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });

                // 3. Fetch Online Specialists
                const { count: onlineCount } = await supabase.from('team_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('presence_status', 'online');

                // 4. Fetch Global Recent Projects
                const { data: projects } = await supabase
                    .from('projects')
                    .select('*, teams(name)')
                    .order('created_at', { ascending: false })
                    .limit(5);

                setStats({
                    totalTeams: teamCount || 0,
                    totalProjects: projectCount || 0,
                    activeSpecialists: onlineCount || 0,
                    totalTasksPending: 0 // Mock for now, requires global tasks fetch
                });
                setRecentProjects(projects || []);

            } catch (e) {
                console.error("Error fetching agency stats:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchGlobalStats();
    }, []);

    if (loading) return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/40 rounded-lg border border-hairline"></div>)}
            </div>
            <div className="h-64 bg-white/40 rounded-lg border border-hairline"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-light text-slate-800">Resumen de Agencia</h1>
                    <p className="text-sm text-slate-400 font-light">Visión global de todas las operaciones de Nous.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-nous-mint)]/10 border border-[var(--color-nous-mint)]/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-nous-mint)] animate-pulse"></div>
                    <span className="text-[10px] font-black text-[var(--color-nous-mint)] uppercase tracking-widest">Sincronización Live</span>
                </div>
            </div>

            {/* Global KPIS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard 
                    title="Equipos Activos" 
                    value={stats.totalTeams} 
                    icon={<Users className="text-blue-500" />} 
                    trend="+1 esta semana" 
                />
                <StatCard 
                    title="Proyectos Totales" 
                    value={stats.totalProjects} 
                    icon={<Briefcase className="text-purple-500" />} 
                    trend="+4 este mes" 
                />
                <StatCard 
                    title="Agentes Online" 
                    value={stats.activeSpecialists} 
                    icon={<Zap className="text-yellow-500" />} 
                    trend="Pico de hoy: 12" 
                />
                <StatCard 
                    title="Horas Totales" 
                    value={42} 
                    icon={<Clock className="text-cyan-500" />} 
                    trend="75% de la capacidad" 
                />
            </div>

            {/* Main Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Global Projects */}
                <div className="lg:col-span-2 glass-panel border border-hairline rounded-lg p-6 bg-white/40">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Últimos Proyectos Lanzados</h3>
                        <button className="text-[10px] font-bold text-[var(--color-nous-mist)] uppercase hover:underline">Ver Todos</button>
                    </div>
                    <div className="space-y-4">
                        {recentProjects.map((proj) => (
                            <div key={proj.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-white/60 transition-colors border border-transparent hover:border-hairline">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{proj.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-medium">{proj.teams?.name || 'Equipo General'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono text-slate-600">Progresión: 85%</p>
                                    <div className="w-24 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-[var(--color-nous-mist)] w-[85%]"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Efficiency Widget */}
                <div className="glass-panel border border-hairline rounded-lg p-6 bg-white/40 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Eficiencia de Agencia</h3>
                        <div className="flex flex-col items-center py-8">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364} strokeDashoffset={364 * (1 - 0.72)} className="text-[var(--color-nous-mint)] transition-all duration-1000" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-3xl font-light text-slate-800">72%</span>
                                    <span className="text-[9px] uppercase font-bold text-slate-400">Score</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Contenido Generado</span>
                            <span className="font-bold text-slate-800">+124k palabras</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Métricas GSC</span>
                            <span className="font-bold text-[var(--color-nous-mint)]">+15% Impresiones</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string | number, icon: any, trend: string }) {
    return (
        <div className="glass-panel border border-hairline rounded-lg p-6 bg-white/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white rounded-md shadow-sm">
                    {icon}
                </div>
                <TrendingUp size={14} className="text-[var(--color-nous-mint)]" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</span>
                <span className="text-3xl font-light text-slate-800">{value}</span>
                <span className="text-[10px] text-[var(--color-nous-mint)] font-bold mt-2">{trend}</span>
            </div>
        </div>
    );
}
