"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Shield, User, Mail, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/utils/cn";
import { CustomPermissions, TeamMember } from "@/types/project";

const DEFAULT_PERMISSIONS: CustomPermissions = {
    admin: false,
    create_delete: false,
    edit_all: false,
    take_edit_tasks: false,
    take_edit_contents: false,
    take_edit_reports: false,
    all_tools_access: false,
    monthly_tokens_limit: 0,
};

export function TeamSettings({ teamId }: { teamId: string }) {
    const [members, setMembers] = useState<(TeamMember & { users?: { email: string }, profiles?: { full_name: string, avatar_url: string } })[]>([]);
    const [isLoading, setIsLoading] = useState(true);



    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form state
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<'owner' | 'partner' | 'manager' | 'specialist' | 'client'>('specialist');
    const [permissions, setPermissions] = useState<CustomPermissions>(DEFAULT_PERMISSIONS);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (teamId) {
            fetchTeam();
        } else {
            setIsLoading(false);
        }
    }, [teamId]);

    const fetchTeam = async () => {
        setIsLoading(true);
        try {
            // Fetch members from team_members
            const { data: membersData, error: membersError } = await supabase
                .from('team_members')
                .select('*, users:user_id(email), profiles:user_id(full_name, avatar_url)')
                .eq('team_id', teamId);

            if (membersError) throw membersError;
            setMembers(membersData || []);

        } catch (e: any) {
            console.error("Error fetching team:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePermission = (key: keyof CustomPermissions, value?: number) => {
        setPermissions(prev => {
            const next = { ...prev };

            if (key === 'monthly_tokens_limit') {
                next.monthly_tokens_limit = value || 0;
            } else if (key === 'admin') {
                const isAdmin = !prev.admin;
                next.admin = isAdmin;
                if (isAdmin) {
                    next.create_delete = true;
                    next.edit_all = true;
                    next.take_edit_tasks = true;
                    next.take_edit_contents = true;
                    next.take_edit_reports = true;
                    next.all_tools_access = true;
                }
            } else {
                const boolKey = key as keyof Omit<CustomPermissions, 'monthly_tokens_limit' | 'admin'>;
                (next as any)[boolKey] = !prev[boolKey];
                if (!(next as any)[boolKey]) {
                    next.admin = false; // Uncheck admin if any sub-permission is disabled
                }
            }
            return next;
        });
    };

    const openInviteModal = () => {
        setIsEditing(false);
        setEmail("");
        setRole("specialist");
        setPermissions(DEFAULT_PERMISSIONS);
        setEditingMemberId(null);
        setIsModalOpen(true);
    };

    const openEditModal = (member: any) => {
        setIsEditing(true);
        setEmail(member.users?.email || member.profiles?.full_name || "Miembro");
        setRole(member.role);
        setPermissions(member.custom_permissions || DEFAULT_PERMISSIONS);
        setEditingMemberId(member.id);
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!email && !isEditing) return;
        setIsSubmitting(true);
        try {
            if (isEditing && editingMemberId) {
                // Update member
                const { error } = await supabase
                    .from('team_members')
                    .update({
                        role,
                        custom_permissions: permissions
                    })
                    .eq('id', editingMemberId);

                if (error) throw error;
                alert("Permisos actualizados correctamente.");
            } else {
                // Invite logic: In the new architecture, we'll try to find user by email first
                const { data: userData } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .maybeSingle();

                if (userData) {
                    const { error } = await supabase
                        .from('team_members')
                        .insert({
                            team_id: teamId,
                            user_id: userData.id,
                            role,
                            custom_permissions: permissions
                        });
                    if (error) throw error;
                    alert("Usuario añadido al equipo.");
                } else {
                    // For now, let's use the invite API but adapted (needs backend update)
                    alert("Actualmente solo se pueden añadir usuarios registrados. Invitación por email próximamente.");
                }
            }
            setIsModalOpen(false);
            fetchTeam();
        } catch (e: any) {
            alert(e.message || "Error al guardar");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMember = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar este acceso?")) return;
        try {
            const { error } = await supabase.from('team_members').delete().eq('id', id);
            if (error) throw error;
            fetchTeam();
        } catch (e: any) {
            alert("Error al eliminar: " + e.message);
        }
    };


    return (
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm relative overflow-hidden animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Equipo y Colaboradores</h2>
                    <p className="text-xs text-slate-400 font-medium italic">Gestiona los miembros de tu agencia y sus niveles de acceso.</p>
                </div>
                <button
                    onClick={openInviteModal}
                    className="px-5 py-2.5 bg-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-600 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                    <Plus size={14} /> Añadir Miembro
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="animate-spin text-cyan-500" size={32} />
                </div>
            ) : !teamId ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Shield size={48} className="mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest text-center">No hay un equipo seleccionado o activo.<br /><span className="text-[10px] font-medium normal-case mt-1 block italic text-slate-300">Crea uno nuevo para empezar a colaborar.</span></p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Miembros de la Agencia</h3>
                        {members.length === 0 ? (
                            <p className="text-xs text-slate-500 py-4 text-center border border-dashed rounded-xl">No hay miembros registrados en este equipo.</p>
                        ) : (
                            members.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                                            {(member.profiles?.full_name || member.users?.email || 'M').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">
                                                {member.profiles?.full_name || member.users?.email || 'Miembro'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600 bg-cyan-100 px-2 py-0.5 rounded-full">{member.role}</span>
                                                {member.custom_permissions?.admin && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Admin Global</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditModal(member)} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-[110]">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase italic">{isEditing ? 'Editar Accesos' : 'Añadir al Equipo'}</h3>
                                <p className="text-xs text-slate-500">Configura los permisos para {isEditing ? email : 'este usuario'}.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {!isEditing && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        placeholder="usuario@ejemplo.com"
                                        className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold focus:bg-white focus:ring-4 ring-cyan-500/10 outline-none transition-all"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            )}

                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Rol en la Agencia</h4>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                                    {['owner', 'partner', 'manager', 'specialist', 'client'].map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => setRole(r as any)}
                                            className={cn(
                                                "p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                                                role === r 
                                                    ? "bg-[var(--color-nous-mist)]/20 border-[var(--color-nous-mist)] text-slate-800"
                                                    : "border-slate-100 text-slate-400 hover:bg-slate-50"
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>

                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Permisos Granulares</h4>

                                {/* Admin Global Toggle */}
                                <div className={cn(
                                    "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between mb-4",
                                    permissions.admin ? "border-red-500 bg-red-50" : "border-slate-200 bg-white hover:border-slate-300"
                                )} onClick={() => handleTogglePermission('admin')}>
                                    <div className="flex gap-3 items-center">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", permissions.admin ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400")}>
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase">Administrador Global</p>
                                            <p className="text-[10px] text-slate-500">Activa el acceso total sin restricciones a todo el equipo.</p>
                                        </div>
                                    </div>
                                    <div className={cn("w-12 h-6 rounded-full transition-colors relative", permissions.admin ? "bg-red-500" : "bg-slate-200")}>
                                        <div className={cn("absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform", permissions.admin ? "translate-x-6" : "")} />
                                    </div>
                                </div>

                                {/* Custom Toggles */}
                                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity", permissions.admin && "opacity-50 pointer-events-none")}>
                                    {[
                                        { key: 'create_delete', label: 'Crear y Eliminar', desc: 'Permite crear o borrar elementos' },
                                        { key: 'edit_all', label: 'Editar Global', desc: 'Edición libre de Tareas, Contenidos, etc.' },
                                        { key: 'take_edit_tasks', label: 'Tomar y Editar Tareas', desc: 'Auto-asignarse y modificar tareas' },
                                        { key: 'take_edit_contents', label: 'Tomar y Editar Contenidos', desc: 'Escribir y guardar el editor neural' },
                                        { key: 'take_edit_reports', label: 'Tomar y Editar Informes', desc: 'Acceso total a informes y KPIs' },
                                        { key: 'all_tools_access', label: 'Herramientas IA y Limitaciones', desc: 'Acceder a todas las tools con tokens' },
                                    ].map((sw) => (
                                        <div key={sw.key} className={cn(
                                            "p-4 rounded-2xl border transition-all cursor-pointer",
                                            permissions[sw.key as keyof CustomPermissions] ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white hover:border-slate-300"
                                        )} onClick={() => handleTogglePermission(sw.key as keyof CustomPermissions)}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-black uppercase text-slate-800">{sw.label}</p>
                                                <div className={cn("w-8 h-4 rounded-full transition-colors relative", permissions[sw.key as keyof CustomPermissions] ? "bg-cyan-500" : "bg-slate-200")}>
                                                    <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform", permissions[sw.key as keyof CustomPermissions] ? "translate-x-4" : "")} />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-tight">{sw.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Token Limits */}
                            <div className={cn("p-6 rounded-2xl border border-slate-200 transition-opacity", !permissions.all_tools_access && "opacity-50 pointer-events-none bg-slate-50")}>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Límite de Tokens IA (Mensual)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-32 p-3 rounded-xl border border-slate-200 text-sm font-bold text-center outline-none focus:ring-2 ring-cyan-500/20"
                                        value={permissions.monthly_tokens_limit}
                                        onChange={(e) => handleTogglePermission('monthly_tokens_limit', parseInt(e.target.value) || 0)}
                                    />
                                    <p className="text-[10px] text-slate-500 w-[200px]">Si estableces esto en 0, no hay un límite estricto de consumo de tokens.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white/80 backdrop-blur-sm z-10">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-800">
                                Cancelar
                            </button>
                            <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-600 shadow-xl shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2">
                                {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                {isEditing ? 'Guardar Cambios' : 'Añadir Miembro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

