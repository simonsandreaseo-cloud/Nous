"use client";

import { Mic, MicOff, Headphones, UserPlus, Hash, Lock, Volume2, User } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PresenceService, PresenceStatus } from "@/lib/services/presence";
import { usePermissions } from "@/hooks/usePermissions";

interface TeamMemberDisplay {
    id: string;
    full_name: string;
    avatar_url: string;
    status: PresenceStatus;
    role: string;
    current_task_id?: string | number;
}

interface AudioPod {
    id: string;
    name: string;
    type: 'public' | 'private';
    members: string[]; 
}

export function TeamSidebar() {
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [micOn, setMicOn] = useState(false);
    const [members, setMembers] = useState<TeamMemberDisplay[]>([]);
    const [rooms, setRooms] = useState<AudioPod[]>([]);
    
    const { activeTeam, tasks } = useProjectStore();
    const { role: userRole } = usePermissions();

    useEffect(() => {
        if (!activeTeam) return;

        const fetchInitialData = async () => {
            // Fetch Members
            const { data: memberData } = await supabase
                .from('team_members')
                .select('role, user_id, presence_status, current_task_id, profiles(full_name, avatar_url)')
                .eq('team_id', activeTeam.id);

            if (memberData) {
                const formatted = memberData.map((m: any) => ({
                    id: m.user_id,
                    full_name: m.profiles?.full_name || 'Agente Anónimo',
                    avatar_url: m.profiles?.avatar_url || '',
                    role: m.role,
                    status: (m.presence_status as PresenceStatus) || 'offline',
                    current_task_id: m.current_task_id
                })) as TeamMemberDisplay[];
                setMembers(formatted);
            }

            // Fetch Audio Pods
            const { data: podData } = await supabase
                .from('team_audio_pods')
                .select('*')
                .eq('team_id', activeTeam.id);
            
            if (podData) {
                setRooms(podData.map(p => ({ ...p, members: [] })));
            }
        };

        fetchInitialData();

        // Subscribe to Team Members
        const memberSub = PresenceService.subscribeToTeam(activeTeam.id, (updatedMember) => {
            setMembers(prev => prev.map(m => 
                m.id === updatedMember.user_id 
                    ? { ...m, status: updatedMember.presence_status, current_task_id: updatedMember.current_task_id }
                    : m
            ));
        });

        // Subscribe to Audio Pods
        const podSub = supabase
            .channel(`team-pods-${activeTeam.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_audio_pods', filter: `team_id=eq.${activeTeam.id}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setRooms(prev => [...prev, { ...payload.new as AudioPod, members: [] }]);
                } else if (payload.eventType === 'DELETE') {
                    setRooms(prev => prev.filter(r => r.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
                    setRooms(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r));
                }
            })
            .subscribe();

        // Heartbeat for current user
        const heartbeatInterval = setInterval(() => {
            PresenceService.sendHeartbeat(activeTeam.id);
        }, 30000); 

        // Immediate initial presence update to 'online'
        PresenceService.updatePresence(activeTeam.id, 'online');

        // Handle offline status on window close
        const handleUnload = () => {
            PresenceService.updatePresence(activeTeam.id, 'offline');
        };
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            memberSub.unsubscribe();
            podSub.unsubscribe();
            clearInterval(heartbeatInterval);
            window.removeEventListener('beforeunload', handleUnload);
            PresenceService.updatePresence(activeTeam.id, 'offline');
        };
    }, [activeTeam]);

    const handleInviteMember = () => {
        const email = prompt("Email del nuevo miembro:");
        if (!email) return;
        alert(`Invitación enviada a ${email} para unirse a ${activeTeam?.name}`);
    };

    return (
        <div className="w-full h-full flex flex-col z-20">

            {/* Audio Rooms Section */}
            <div className="p-4 border-b border-hairline">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-medium text-slate-500 uppercase tracking-elegant flex items-center gap-2">
                        <Headphones size={14} className="text-[var(--color-nous-mist)]" />
                        Audio Pods
                    </h3>
                </div>

                <div className="space-y-2">
                    {rooms.map((room) => {
                        const isActive = activeRoom === room.id;
                        return (
                            <div
                                key={room.id}
                                onClick={() => setActiveRoom(isActive ? null : room.id)}
                                className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${isActive
                                    ? "bg-[var(--color-nous-mist)]/20 border-[var(--color-nous-mist)]/40"
                                    : "bg-white/40 border-transparent hover:bg-white/60 hover:border-hairline glass-panel-hover"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {room.type === 'private' ? <Lock size={12} className="text-slate-400" /> : <Hash size={12} className="text-slate-400" />}
                                        <span className={`text-sm font-light ${isActive ? 'text-[var(--color-nous-mist)] font-medium' : 'text-slate-600'}`}>{room.name}</span>
                                    </div>

                                    {isActive && (
                                        <div className="flex gap-0.5 items-end h-3">
                                            <div className="w-0.5 bg-[var(--color-nous-mist)] animate-[bounce_1s_infinite] h-2"></div>
                                            <div className="w-0.5 bg-[var(--color-nous-mist)] animate-[bounce_1.2s_infinite] h-3"></div>
                                            <div className="w-0.5 bg-[var(--color-nous-mist)] animate-[bounce_0.8s_infinite] h-1"></div>
                                        </div>
                                    )}
                                </div>

                                {room.members.length > 0 && (
                                    <div className="flex -space-x-1 mt-2 pl-6">
                                        {room.members.map(memberId => {
                                            const member = members.find(m => m.id === memberId);
                                            if (!member) return null;
                                            return (
                                                <img key={memberId} src={member.avatar_url} alt={member.full_name} className="w-5 h-5 rounded-full ring-2 ring-white grayscale group-hover:grayscale-0 transition-all shadow-sm" />
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {activeRoom && (
                    <div className="mt-3 flex items-center justify-center gap-4 py-2 bg-white/60 rounded-lg border border-hairline glass-panel">
                        <button
                            onClick={(e) => { e.stopPropagation(); setMicOn(!micOn); }}
                            className={`p-2 rounded-full transition-all ${micOn ? 'bg-[var(--color-nous-mint)]/20 text-[var(--color-nous-mint)] hover:bg-[var(--color-nous-mint)]/30' : 'bg-red-50 text-red-400 hover:bg-red-100'}`}
                        >
                            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                        </button>
                        <button className="p-2 rounded-full hover:bg-white/80 text-slate-500 hover:text-slate-700 transition-colors">
                            <Volume2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Team Members List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
                <h3 className="text-[10px] font-medium text-slate-500 uppercase tracking-elegant pl-1">Agentes / Equipo</h3>

                {members.map((member) => (
                    <div key={member.id} className="flex items-start gap-3 group p-2 hover:bg-white/40 glass-panel-hover rounded-lg transition-colors cursor-pointer">
                        <div className="relative">
                            {member.avatar_url ? (
                                <img src={member.avatar_url} alt={member.full_name} className="w-9 h-9 rounded-full object-cover border border-hairline shadow-sm" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-hairline text-slate-400">
                                    <User size={16} />
                                </div>
                            )}
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                member.status === 'online' ? 'bg-[var(--color-nous-mint)] shadow-[0_0_5px_var(--color-nous-mint)]' :
                                member.status === 'busy' ? 'bg-red-400 shadow-[0_0_5px_#ef4444]' : 'bg-slate-300'
                            }`}></div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-sm font-light text-slate-800 truncate">{member.full_name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">{member.role}</div>
                            <div className="text-[11px] leading-tight text-slate-400 italic truncate pl-2">
                                {member.status === 'offline' ? 'Desconectado' : 
                                 member.current_task_id ? `Trabajando en: ${tasks.find(t => t.id?.toString() === member.current_task_id?.toString())?.title || 'Tarea'}` : 
                                 'Disponible'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Invite / Footer */}
            {userRole !== 'client' && (
                <div className="p-4 border-t border-hairline bg-white/20">
                    <button 
                        onClick={handleInviteMember}
                        className="flex items-center justify-center w-full py-2 bg-white/40 glass-panel-hover border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-slate-500 hover:text-slate-700 transition-all text-[10px] uppercase font-bold tracking-widest"
                    >
                        <UserPlus size={14} className="mr-2" />
                        Invitar al Equipo
                    </button>
                </div>
            )}

        </div>
    );
}
