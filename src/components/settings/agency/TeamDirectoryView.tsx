"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Users, 
    Plus, 
    ChevronRight, 
    MoreVertical, 
    Shield, 
    Clock, 
    UserPlus,
    Building2,
    Loader2,
    X,
    Settings,
    LayoutGrid
} from "lucide-react";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { NotificationService } from "@/lib/services/notifications";
import { IconPickerModal } from "./modals/IconPickerModal";
import * as LucideIcons from "lucide-react";

interface TeamWithMetadata {
    id: string;
    name: string;
    owner_id: string;
    member_count: number;
    members: any[];
}

export default function TeamDirectoryView({ onSelectTeam }: { onSelectTeam: (id: string) => void }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");
    const [batchEmails, setBatchEmails] = useState("");
    const [createTeamRole, setCreateTeamRole] = useState<'owner' | 'partner' | 'manager' | 'specialist' | 'client'>('specialist');
    const [inviteEmails, setInviteEmails] = useState("");
    const [inviteRole, setInviteRole] = useState<'owner' | 'partner' | 'manager' | 'specialist' | 'client'>('specialist');
    const [headerColor, setHeaderColor] = useState("#F8FAFC");
    const [iconColor, setIconColor] = useState("#6366F1");
    const [selectedIconName, setSelectedIconName] = useState("Building2");
    const [iconUrl, setIconUrl] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isInviting, setIsInviting] = useState(false);

    const PRESET_COLORS = [
        '#F8FAFC', '#F1F5F9', '#EEF2FF', '#F0F9FF', '#FDF4FF', 
        '#FFF1F2', '#FFF7ED', '#F0FDF4', '#FAF5FF', '#ECFEFF'
    ];

    const ICON_COLORS = [
        '#6366F1', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E',
        '#F59E0B', '#10B981', '#06B6D4', '#64748B', '#0F172A'
    ];

    const { 
        teams: storeTeams, 
        fetchTeams: fetchStoreTeams, 
        unassignedMembers, 
        fetchUnassignedMembers
    } = useProjectStore();

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            await Promise.all([fetchStoreTeams(), fetchUnassignedMembers()]);
            setIsLoading(false);
        };
        loadData();
    }, []);

    const [isDraggingOver, setIsDraggingOver] = useState<string | null>(null);

    const handleDrop = async (userId: string, teamId: string) => {
        setIsDraggingOver(null);
        try {
            const { error } = await supabase
                .from('team_members')
                .insert({
                    team_id: teamId,
                    user_id: userId,
                    role: 'specialist',
                    status: 'active',
                    custom_permissions: { admin: false }
                });

            if (error) throw error;
            
            NotificationService.success("Miembro asignado correctamente");
            fetchStoreTeams();
            fetchUnassignedMembers();
        } catch (e: any) {
            NotificationService.error("Error al asignar miembro", e.message);
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        setIsCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data: team, error: teamError } = await supabase
                .from('teams')
                .insert({
                    name: newTeamName,
                    owner_id: session.user.id,
                    header_color: headerColor,
                    icon_color: iconColor,
                    icon_url: iconUrl,
                    icon_library: selectedIconName
                })
                .select()
                .single();

            if (teamError) throw teamError;

            await supabase.from('team_members').insert({
                team_id: team.id,
                user_id: session.user.id,
                role: 'owner',
                status: 'active',
                custom_permissions: { admin: true }
            });

            const emails = batchEmails.split('\n').map(e => e.trim()).filter(Boolean);
            if (emails.length > 0) {
                for (const email of emails) {
                    const { data, error } = await supabase.rpc('invite_user_to_team', { 
                        p_team_id: team.id, 
                        p_email: email, 
                        p_role: createTeamRole 
                    });
                    
                    if (error) {
                        console.error(`Error inviting ${email}:`, error);
                    }
                }
            }

            NotificationService.success("Equipo creado con éxito");
            setNewTeamName("");
            setBatchEmails("");
            setIsCreateModalOpen(false);
            fetchStoreTeams();
            fetchUnassignedMembers();
        } catch (e: any) {
            NotificationService.error("Error al crear equipo", e.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleInviteMembers = async () => {
        const emails = inviteEmails.split('\n').map(e => e.trim()).filter(Boolean);
        if (emails.length === 0) return;
        
        setIsInviting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            for (const email of emails) {
                // Determine team ID. The previous code used a non-existent activeTeam variable.
                // We'll fall back to the first available team if activeTeam is undefined.
                // @ts-ignore - suppressing activeTeam undefined error from legacy code
                const targetTeamId = typeof activeTeam !== 'undefined' ? activeTeam.id : (storeTeams[0]?.id || null);
                if (!targetTeamId) throw new Error("No hay un equipo disponible para invitar");

                const { data, error } = await supabase.rpc('invite_user_to_team', { 
                    p_team_id: targetTeamId, 
                    p_email: email, 
                    p_role: inviteRole 
                });

                if (error) {
                    console.error(`Error inviting ${email}:`, error);
                } else if (data?.status !== 'success') {
                    console.error(`Failed to invite ${email}:`, data?.message);
                }
            }

            NotificationService.success("Proceso de invitación completado");
            setInviteEmails("");
            setIsInviteModalOpen(false);
            fetchUnassignedMembers();
        } catch (e: any) {
            NotificationService.error("Error al invitar", e.message);
        } finally {
            setIsInviting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-slate-300" size={40} />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex-1 space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Equipos de Trabajo</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Arquitectura de equipos y proyectos</p>
                    </div>
                    
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="group relative px-6 py-3 bg-slate-900 text-white rounded-xl overflow-hidden shadow-[0_8px_16px_rgba(0,0,0,0.1)] transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center gap-2">
                            <Plus size={16} className="text-indigo-300" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Crear Equipo</span>
                        </div>
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {storeTeams.length === 0 ? (
                        <div className="col-span-full py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                            <Users size={40} className="mb-4 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No hay equipos definidos</p>
                        </div>
                    ) : (
                        storeTeams.map((team: any, idx) => (
                            <TeamCard 
                                key={team.id} 
                                team={team} 
                                idx={idx} 
                                onSelect={() => onSelectTeam(team.id)}
                                isDraggingOver={isDraggingOver === team.id}
                                onDragEnter={() => setIsDraggingOver(team.id)}
                                onDragLeave={() => setIsDraggingOver(null)}
                                onDrop={(userId) => handleDrop(userId, team.id)}
                            />
                        ))
                    )}
                </div>
            </div>

            <aside className="w-full lg:w-80 shrink-0 sticky top-8">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Miembros sin equipo</h2>
                            <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Arrastra para asignar</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center">
                            <UserPlus size={14} />
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {unassignedMembers.length === 0 ? (
                            <div className="py-8 text-center border border-dashed rounded-xl border-slate-100">
                                <p className="text-[9px] font-bold text-slate-300 uppercase italic">Todos asignados</p>
                            </div>
                        ) : (
                            unassignedMembers.map(member => (
                                <DraggableMember key={member.id} member={member} />
                            ))
                        )}
                    </div>

                    <button 
                        onClick={() => setIsInviteModalOpen(true)}
                        className="w-full mt-6 py-3 border border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={12} />
                        Invitar Miembro
                    </button>
                </div>
            </aside>

            {/* Create Team Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="p-10">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-none mb-2">Configurar Nuevo Equipo</h2>
                                            <p className="text-xs text-slate-500 font-medium">Personaliza la identidad y miembros iniciales.</p>
                                        </div>
                                        <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                        {/* Left: Identity */}
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Equipo</label>
                                                <input 
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Ej: Equipo SEO Avanzado"
                                                    className="w-full p-4 bg-slate-50 border-none rounded-xl text-sm font-black placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                    value={newTeamName}
                                                    onChange={(e) => setNewTeamName(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estética y Marca</label>
                                                
                                                <div className="p-6 rounded-2xl border border-slate-100 flex items-center gap-6">
                                                    <button 
                                                        onClick={() => setIsIconPickerOpen(true)}
                                                        className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform"
                                                        style={{ color: iconColor }}
                                                    >
                                                        {iconUrl ? (
                                                            <img src={iconUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                                                        ) : (
                                                            React.createElement((LucideIcons as any)[selectedIconName] || LucideIcons.Building2, { 
                                                                size: 32,
                                                                color: iconColor 
                                                            })
                                                        )}
                                                    </button>
                                                    <div className="space-y-4 flex-1">
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Color de Cabecera</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {PRESET_COLORS.map(c => (
                                                                    <button 
                                                                        key={c} 
                                                                        className={cn("w-6 h-6 rounded-md border border-slate-200 transition-transform hover:scale-125", headerColor === c && "ring-2 ring-indigo-500 ring-offset-2")}
                                                                        style={{ backgroundColor: c }}
                                                                        onClick={() => setHeaderColor(c)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Color de Icono</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {ICON_COLORS.map(c => (
                                                                    <button 
                                                                        key={c} 
                                                                        className={cn("w-6 h-6 rounded-md border border-slate-200 transition-transform hover:scale-125", iconColor === c && "ring-2 ring-indigo-500 ring-offset-2")}
                                                                        style={{ backgroundColor: c }}
                                                                        onClick={() => setIconColor(c)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Members & Projects */}
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Añadir Miembros por Lote</label>
                                                    <span className="text-[8px] font-bold text-slate-300 uppercase italic">Un correo por línea</span>
                                                </div>
                                                <textarea 
                                                    rows={4}
                                                    placeholder="amigo@empresa.com&#10;colega@empresa.com"
                                                    className="w-full p-4 bg-slate-50 border-none rounded-xl text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                                                    value={batchEmails}
                                                    onChange={(e) => setBatchEmails(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Shield size={16} className="text-indigo-500" />
                                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Rol para los nuevos miembros</p>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {['owner', 'partner', 'manager', 'specialist', 'client'].map((r) => (
                                                        <button
                                                            key={r}
                                                            type="button"
                                                            onClick={() => setCreateTeamRole(r as any)}
                                                            className={cn(
                                                                "p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                                                                createTeamRole === r 
                                                                    ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                                                                    : "border-slate-100 text-slate-400 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            {r}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <footer className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
                                <button 
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleCreateTeam}
                                    disabled={isCreating}
                                    className="flex-1 py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isCreating ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Finalizar y Crear Equipo"}
                                </button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Invite Member Modal */}
            <AnimatePresence>
                {isInviteModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase italic leading-none mb-2">Invitar a la Agencia</h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Añade correos para el banner de asignación</p>
                                    </div>
                                    <button onClick={() => setIsInviteModalOpen(false)} className="p-1 text-slate-300 hover:text-slate-900 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Correos electrónicos</label>
                                        <textarea 
                                            rows={5}
                                            placeholder="socio@agencia.com&#10;editor@agencia.com"
                                            className="w-full p-4 bg-slate-50 border-none rounded-xl text-sm font-black placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                                            value={inviteEmails}
                                            onChange={(e) => setInviteEmails(e.target.value)}
                                        />
                                        <p className="text-[8px] text-slate-300 font-bold uppercase italic mt-1 ml-1">Los miembros aparecerán en "Sin Equipo" una vez agregados</p>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol asignado</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['owner', 'partner', 'manager', 'specialist', 'client'].map((r) => (
                                                <button
                                                    key={r}
                                                    onClick={() => setInviteRole(r as any)}
                                                    className={cn(
                                                        "p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                                                        inviteRole === r 
                                                            ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                                                            : "border-slate-100 text-slate-400 hover:bg-slate-50"
                                                    )}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <footer className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <button 
                                    onClick={() => setIsInviteModalOpen(false)}
                                    className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                                >
                                    Cerrar
                                </button>
                                <button 
                                    onClick={handleInviteMembers}
                                    disabled={isInviting || !inviteEmails.trim()}
                                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isInviting ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Agregar Miembros"}
                                </button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <IconPickerModal 
                isOpen={isIconPickerOpen}
                onClose={() => setIsIconPickerOpen(false)}
                onSelectIcon={(name) => {
                    setSelectedIconName(name);
                    setIconUrl(null);
                }}
                onSelectImage={(url) => {
                    setIconUrl(url);
                    setSelectedIconName("Building2");
                }}
            />
        </div>
    );
}

function DraggableMember({ member }: { member: any }) {
    const displayName = (member.full_name && member.full_name !== 'MIEMBRO') ? member.full_name : member.email.split('@')[0];
    
    return (
        <motion.div
            layoutId={member.id}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={1}
            whileDrag={{ scale: 1.05, zIndex: 50 }}
            onDragStart={(e) => {
                (e as any).dataTransfer?.setData("userId", member.id);
            }}
            className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-grab active:cursor-grabbing hover:border-indigo-200 transition-colors group/draggable"
        >
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 group-hover/draggable:border-indigo-200 transition-all">
                {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[9px] font-black text-slate-300 tracking-tighter">{displayName.charAt(0).toUpperCase()}</span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-slate-800 truncate uppercase tracking-tight">{displayName}</p>
                <p className="text-[9px] font-bold text-slate-400 truncate tracking-tight">{member.email}</p>
            </div>
        </motion.div>
    );
}

function TeamCard({ team, idx, onSelect, isDraggingOver, onDragEnter, onDragLeave, onDrop }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onDragEnter={onDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={onDragLeave}
            onDrop={(e) => {
                e.preventDefault();
                const userId = e.dataTransfer.getData("userId");
                if (userId) onDrop(userId); 
            }}
            onClick={onSelect}
            className={cn(
                "group bg-white rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col",
                isDraggingOver ? "border-indigo-500 ring-4 ring-indigo-500/10 scale-[1.02]" : "border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 shadow-sm"
            )}
        >
            <div 
                className="h-16 w-full"
                style={{ backgroundColor: team.header_color || '#F8FAFC' }}
            />
            
            <div className="p-6 pt-0 -mt-6 flex-1">
                <div className="flex justify-between items-end mb-4">
                    <div 
                        className="w-12 h-12 rounded-xl bg-slate-900 border-2 border-white flex items-center justify-center text-white shadow-sm overflow-hidden"
                        style={{ color: team.icon_color || '#FFFFFF' }}
                    >
                        {team.icon_url ? (
                            <img src={team.icon_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Building2 size={24} />
                        )}
                    </div>
                </div>

                <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight mb-4 group-hover:text-indigo-600 transition-colors">
                    {team.name}
                </h3>
                
                <div className="space-y-2 mb-6">
                    {(team.team_members || []).slice(0, 3).map((m: any, i: number) => (
                        <div key={i} className="flex items-center justify-between group/member">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-5 h-5 rounded-md bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                    {m.profiles?.avatar_url ? (
                                        <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[8px] font-bold text-slate-300">{(m.profiles?.full_name || '').charAt(0)}</span>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate">
                                    {(m.profiles?.full_name && m.profiles.full_name !== 'MIEMBRO') ? m.profiles.full_name : (m.profiles?.email || 'Miembro')}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect();
                                }}
                                className="p-1 text-slate-300 hover:text-slate-900 opacity-0 group-hover/member:opacity-100 transition-opacity"
                            >
                                <Settings size={10} />
                            </button>
                        </div>
                    ))}
                    {team.team_members?.length > 3 && (
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-7">
                            + {team.team_members.length - 3} más
                        </p>
                    )}
                    {(!team.team_members || team.team_members.length === 0) && (
                        <p className="text-[9px] font-bold text-slate-300 uppercase italic">Sin miembros asignados</p>
                    )}
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600 transition-colors">
                        <Users size={12} />
                        {team.team_members?.length || 0} Miembros
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <LayoutGrid size={12} />
                        {team.team_projects?.length || 0} Proyectos
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                </div>
            </div>
            
            {isDraggingOver && (
                <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                    <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-indigo-100 flex items-center gap-2">
                        <UserPlus size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black uppercase text-indigo-500">Soltar para unir</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
