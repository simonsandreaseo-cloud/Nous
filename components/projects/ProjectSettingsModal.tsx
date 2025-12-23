import React, { useState, useEffect } from 'react';
import { Project, ProjectService, ProjectMember, Team, ContentGoal } from '../../lib/task_manager';
import { X, Plus, Trash2, Users, Target, Save, User as UserIcon, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ProjectSettingsModalProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ project, isOpen, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'teams' | 'goals'>('teams');
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [settings, setSettings] = useState<any>(project.settings || {});
    const [loading, setLoading] = useState(false);

    // Initial load of members
    useEffect(() => {
        if (isOpen && project.id) {
            loadMembers();
            setSettings(project.settings || {});
        }
    }, [isOpen, project.id]);

    const loadMembers = async () => {
        try {
            const { members } = await ProjectService.getMembers(project.id);
            // We need to fetch user details (email/name) essentially if not in member object.
            // ProjectService.getMembers returns members with some details usually?
            // Checking safe implementation: The current getMembers returns `members` from `project_members` (which has user_id)
            // We might need to enrich this if `get_project_members` RPC doesn't return emails.
            // For now, let's assume we can get emails. If not, I might need to fix `getMembers` later.
            // Actually, `ProjectMember` interface has `email`.
            setMembers(members);
        } catch (e) {
            console.error("Error loading members", e);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await ProjectService.updateProject(project.id, { settings });
            onUpdate();
            onClose();
        } catch (e: any) {
            alert("Error al guardar: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Team Management Helpers ---
    const addTeam = () => {
        const newTeam: Team = {
            id: crypto.randomUUID(),
            name: "Nuevo Equipo",
            member_ids: [],
            color: "#6366f1"
        };
        const currentTeams = settings.teams || [];
        setSettings({ ...settings, teams: [...currentTeams, newTeam] });
    };

    const updateTeam = (id: string, updates: Partial<Team>) => {
        const currentTeams = settings.teams || [];
        setSettings({
            ...settings,
            teams: currentTeams.map((t: Team) => t.id === id ? { ...t, ...updates } : t)
        });
    };

    const deleteTeam = (id: string) => {
        if (!confirm("¿Eliminar equipo?")) return;
        const currentTeams = settings.teams || [];
        setSettings({
            ...settings,
            teams: currentTeams.filter((t: Team) => t.id !== id)
        });
    };

    const toggleTeamMember = (teamId: string, memberId: string) => {
        const currentTeams = settings.teams || [];
        const team = currentTeams.find((t: Team) => t.id === teamId);
        if (!team) return;

        const isMember = team.member_ids.includes(memberId);
        const newMembers = isMember
            ? team.member_ids.filter((id: string) => id !== memberId)
            : [...team.member_ids, memberId];

        updateTeam(teamId, { member_ids: newMembers });
    };

    // --- Goal Management Helpers ---
    const addGoal = () => {
        const newGoal: ContentGoal = {
            id: crypto.randomUUID(),
            type: 'project',
            monthly_count_target: 4
        };
        const currentGoals = settings.content_goals || [];
        setSettings({ ...settings, content_goals: [...currentGoals, newGoal] });
    };

    const updateGoal = (id: string, updates: Partial<ContentGoal>) => {
        const currentGoals = settings.content_goals || [];
        setSettings({
            ...settings,
            content_goals: currentGoals.map((g: ContentGoal) => g.id === id ? { ...g, ...updates } : g)
        });
    };

    const deleteGoal = (id: string) => {
        const currentGoals = settings.content_goals || [];
        setSettings({
            ...settings,
            content_goals: currentGoals.filter((g: ContentGoal) => g.id !== id)
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Configuración del Proyecto</h2>
                        <p className="text-sm text-slate-500">Gestiona equipos y objetivos de contenido</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 bg-slate-50 border-r border-slate-100 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('teams')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'teams' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <Users size={18} /> Equipos
                        </button>
                        <button
                            onClick={() => setActiveTab('goals')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'goals' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <Target size={18} /> Objetivos
                        </button>
                        {/* Placeholder for General if needed */}
                        {/* <button disabled className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed">
                            <Settings size={18} /> General
                        </button> */}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 bg-white">

                        {activeTab === 'teams' && (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-800">Equipos de Trabajo</h3>
                                    <button onClick={addTeam} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm hover:shadow">
                                        <Plus size={16} /> Crear Equipo
                                    </button>
                                </div>

                                <div className="grid gap-6">
                                    {(settings.teams || []).length === 0 && (
                                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                                            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-slate-500 font-medium">No hay equipos creados</p>
                                            <p className="text-sm text-slate-400">Organiza a tus colaboradores en grupos</p>
                                        </div>
                                    )}

                                    {(settings.teams || []).map((team: Team) => (
                                        <div key={team.id} className="border border-slate-200 rounded-xl p-5 hover:border-indigo-200 transition-colors bg-white shadow-sm">
                                            <div className="flex gap-4 mb-6">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre del Equipo</label>
                                                    <input
                                                        value={team.name}
                                                        onChange={(e) => updateTeam(team.id, { name: e.target.value })}
                                                        className="w-full text-lg font-bold text-slate-800 border-none p-0 focus:ring-0 placeholder-slate-300"
                                                        placeholder="Nombre del equipo..."
                                                    />
                                                </div>
                                                <div className="flex items-start">
                                                    <button onClick={() => deleteTeam(team.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Miembros</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {members.map(member => {
                                                        const isSelected = team.member_ids.includes(member.user_id);
                                                        return (
                                                            <button
                                                                key={member.id}
                                                                onClick={() => toggleTeamMember(team.id, member.user_id)}
                                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-2 ${isSelected
                                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                                    }`}
                                                            >
                                                                {isSelected ? <Shield size={12} fill="currentColor" /> : <UserIcon size={12} />}
                                                                {member.email || "Usuario sin email"}
                                                            </button>
                                                        );
                                                    })}
                                                    {members.length === 0 && <span className="text-xs text-slate-400 italic">No hay miembros en el proyecto para asignar.</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'goals' && (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-800">Objetivos de Contenido</h3>
                                    <button onClick={addGoal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm hover:shadow">
                                        <Plus size={16} /> Añadir Objetivo
                                    </button>
                                </div>

                                <div className="grid gap-4">
                                    {(settings.content_goals || []).length === 0 && (
                                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                                            <Target className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-slate-500 font-medium">No hay objetivos definidos</p>
                                            <p className="text-sm text-slate-400">Establece metas mensuales para motivar al equipo</p>
                                        </div>
                                    )}

                                    {(settings.content_goals || []).map((goal: ContentGoal) => (
                                        <div key={goal.id} className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-wrap gap-6 items-center">
                                            <div className="min-w-[150px]">
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Alcance</label>
                                                <select
                                                    value={goal.type}
                                                    onChange={(e) => updateGoal(goal.id, { type: e.target.value as any, target_id: undefined })}
                                                    className="w-full bg-white border-slate-200 text-sm rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                >
                                                    <option value="project">Todo el Proyecto</option>
                                                    <option value="team">Equipo Específico</option>
                                                    <option value="user">Usuario Específico</option>
                                                </select>
                                            </div>

                                            {goal.type === 'team' && (
                                                <div className="min-w-[200px]">
                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Seleccionar Equipo</label>
                                                    <select
                                                        value={goal.target_id || ''}
                                                        onChange={(e) => updateGoal(goal.id, { target_id: e.target.value })}
                                                        className="w-full bg-white border-slate-200 text-sm rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    >
                                                        <option value="">Selecciona un equipo...</option>
                                                        {(settings.teams || []).map((t: Team) => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {goal.type === 'user' && (
                                                <div className="min-w-[200px]">
                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Seleccionar Usuario</label>
                                                    <select
                                                        value={goal.target_id || ''}
                                                        onChange={(e) => updateGoal(goal.id, { target_id: e.target.value })}
                                                        className="w-full bg-white border-slate-200 text-sm rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    >
                                                        <option value="">Selecciona un usuario...</option>
                                                        {members.map(m => (
                                                            <option key={m.user_id} value={m.user_id}>{m.email || 'Sin email'}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="w-[120px]">
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nº Contenidos</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={goal.monthly_count_target || ''}
                                                    onChange={(e) => updateGoal(goal.id, { monthly_count_target: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-white border-slate-200 text-sm rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    placeholder="0"
                                                />
                                            </div>

                                            <div className="w-[120px]">
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Palabras/Mes</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="100"
                                                    value={goal.monthly_word_count_target || ''}
                                                    onChange={(e) => updateGoal(goal.id, { monthly_word_count_target: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-white border-slate-200 text-sm rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    placeholder="Opcional"
                                                />
                                            </div>

                                            <button onClick={() => deleteGoal(goal.id)} className="ml-auto text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
