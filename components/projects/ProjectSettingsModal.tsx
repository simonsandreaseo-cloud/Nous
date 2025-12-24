import React, { useState, useEffect } from 'react';
import { Project, ProjectService, ProjectMember, Team, ContentGoal } from '../../lib/task_manager';
import { X, Plus, Trash2, Users, Target, Save, User as UserIcon, Shield, FolderGit2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ProjectSettingsModalProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ project, isOpen, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'teams' | 'goals' | 'directories'>('general');
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || '');
    const [logoUrl, setLogoUrl] = useState(project.logo_url || '');
    const [uploading, setUploading] = useState(false);
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
            await ProjectService.updateProject(project.id, {
                name,
                description,
                logo_url: logoUrl,
                settings
            });
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

    // --- Directory Management Helpers ---
    const [newDir, setNewDir] = useState("");
    const addDirectory = () => {
        if (!newDir.trim()) return;
        let formatted = newDir.trim();
        if (!formatted.startsWith('/')) formatted = '/' + formatted;
        if (!formatted.endsWith('/')) formatted = formatted + '/';

        const currentDirs = settings.content_directories || [];
        if (currentDirs.includes(formatted)) {
            alert("Este directorio ya existe");
            return;
        }
        setSettings({ ...settings, content_directories: [...currentDirs, formatted] });
        setNewDir("");
    };

    const removeDirectory = (dir: string) => {
        const currentDirs = settings.content_directories || [];
        setSettings({ ...settings, content_directories: currentDirs.filter((d: string) => d !== dir) });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${project.id}-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('project-logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('project-logos')
                .getPublicUrl(filePath);

            setLogoUrl(publicUrl);
        } catch (error: any) {
            alert("Error al subir logo: " + error.message);
        } finally {
            setUploading(false);
        }
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
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <Shield size={18} /> General
                        </button>
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
                        <button
                            onClick={() => setActiveTab('directories')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'directories' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            <FolderGit2 size={18} /> Categorías
                        </button>
                        {/* Placeholder for General if needed */}
                        {/* <button disabled className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed">
                            <Settings size={18} /> General
                        </button> */}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 bg-white">

                        {activeTab === 'general' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Información General</h3>
                                    <p className="text-sm text-slate-500 mt-1">Nombre, descripción y logo del proyecto.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-8">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Logo del Proyecto</label>
                                            <div className="relative group">
                                                <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-300">
                                                    {logoUrl ? (
                                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FolderGit2 className="text-slate-300" size={32} />
                                                    )}
                                                </div>
                                                <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl text-[10px] font-bold uppercase tracking-wider">
                                                    {uploading ? 'Subiendo...' : 'Cambiar'}
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                                                </label>
                                            </div>
                                            {logoUrl && (
                                                <button
                                                    onClick={() => setLogoUrl('')}
                                                    className="text-[10px] text-red-500 font-bold uppercase tracking-wider hover:underline"
                                                >
                                                    Eliminar Logo
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre del Proyecto</label>
                                                <input
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                                    placeholder="Mi Gran Proyecto..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción (Opcional)</label>
                                                <textarea
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    rows={3}
                                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                                                    placeholder="Breve descripción del proyecto..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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


                        {activeTab === 'directories' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Directorios de Contenido</h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Define las categorías o carpetas donde se publicarán los contenidos (ej: /blog/, /glosario/).
                                        Estos servirán para construir la URL final.
                                    </p>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                    <div className="flex gap-4 mb-6">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nuevo Directorio</label>
                                            <input
                                                value={newDir}
                                                onChange={(e) => setNewDir(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addDirectory()}
                                                placeholder="/ejemplo/"
                                                className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1 px-1">Formato sugerido: /categoria/</p>
                                        </div>
                                        <div className="flex items-end pb-[26px]">
                                            <button
                                                onClick={addDirectory}
                                                disabled={!newDir}
                                                className="px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {(settings.content_directories || []).length === 0 && (
                                            <div className="col-span-2 text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                                                No hay directorios configurados.
                                            </div>
                                        )}
                                        {(settings.content_directories || []).map((dir: string) => (
                                            <div key={dir} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm group hover:border-indigo-200 transition-colors">
                                                <span className="font-mono text-sm text-slate-700 font-medium">{dir}</span>
                                                <button
                                                    onClick={() => removeDirectory(dir)}
                                                    className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 flex gap-3 text-amber-800 text-xs">
                                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                    <p>
                                        <strong>Nota:</strong> Al redactar un contenido, podrás seleccionar uno de estos directorios.
                                        La URL se construirá automáticamente como: <code>Dominio + Directorio + Slug</code>.
                                        También existirá la opción "Ninguno" para URLs en la raíz.
                                    </p>
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
        </div >
    );
};
