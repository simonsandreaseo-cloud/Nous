"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, ChevronDown, User, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NousLogo } from "@/components/dom/NousLogo";
import { TimeEntry } from "@/types/time_tracking";
import { Task } from "@/types/project";
import { UserProfileModal } from "./UserProfileModal";
import { useProjectStore } from "@/store/useProjectStore";
import { usePermissions } from "@/hooks/usePermissions";

export function TopBar() {
    const { permissions, role, loading: permsLoading } = usePermissions();
    const [timerActive, setTimerActive] = useState(false);

    const [seconds, setSeconds] = useState(0);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

    const { teams, activeTeam, setActiveTeam } = useProjectStore();

    // Initialize: Get User & Active Entry
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                fetchActiveEntry(user.id);
                fetchTasks(user.id);
                fetchNotifications(user.id);
                fetchProfile(user.id);
            }
        };
        init();

        // Subscribe to realtime changes for sync with Desktop App
        const channel = supabase
            .channel('time_entries_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'time_entries' },
                (payload) => {
                    if (userId) fetchActiveEntry(userId);
                }
            )
            .subscribe();

        const notificationsChannel = supabase
            .channel('notifications_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications' },
                (payload) => {
                    if (userId) fetchNotifications(userId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(notificationsChannel);
        };
    }, [userId]);

    const fetchActiveEntry = async (uid: string) => {
        // Check for an entry where end_time is NULL
        const { data } = await supabase
            .from('time_entries')
            .select('*, task:content_tasks(id, title)')
            .eq('user_id', uid)
            .is('end_time', null)
            .maybeSingle();

        if (data) {
            setTimerActive(true);
            setActiveEntryId(data.id);

            const startTime = new Date(data.start_time).getTime();
            const now = new Date().getTime();
            setSeconds(Math.floor((now - startTime) / 1000));

            if (data.task) {
                // data.task is an object or array depending on query, here it should be single object
                // We cast it to Task roughly
                const t = data.task as any;
                setSelectedTask({ id: t.id, title: t.title } as Task);
            }
        } else {
            setTimerActive(false);
            setActiveEntryId(null);
            setSeconds(0);
        }
    };

    const fetchTasks = async (uid: string) => {
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .in('status', ['todo', 'in_progress']) // Only active tasks
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) setTasks(data as unknown as Task[]);
    };

    const fetchNotifications = async (uid: string) => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });
        if (data) setNotifications(data);
    };

    const fetchProfile = async (uid: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', uid)
            .maybeSingle();
        if (data) setProfile(data);
    };

    const handleAcceptInvite = async (notification: any) => {
        const inviteId = notification.resource_link;
        if (!inviteId) return;
        
        const { data: invite } = await supabase.from('project_invites').select('*').eq('id', inviteId).single();
        if (!invite) {
            alert('Invitación no encontrada o cancelada.');
            await supabase.from('notifications').delete().eq('id', notification.id);
            if (userId) fetchNotifications(userId);
            return;
        }

        const { error: memberError } = await supabase.from('project_members').insert({
            project_id: invite.project_id,
            user_id: userId,
            role: invite.role,
            custom_permissions: invite.custom_permissions
        });

        if (memberError && memberError.code !== '23505') {
            alert('Error al unirse al proyecto: ' + memberError.message);
            return;
        }

        await supabase.from('project_invites').delete().eq('id', invite.id);
        await supabase.from('notifications').delete().eq('id', notification.id);
        
        window.location.reload();
    };

    const handleRejectInvite = async (notification: any) => {
        const inviteId = notification.resource_link;
        if (inviteId) await supabase.from('project_invites').delete().eq('id', inviteId);
        await supabase.from('notifications').delete().eq('id', notification.id);
        if (userId) fetchNotifications(userId);
    };

    // Timer Tick
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timerActive) {
            interval = setInterval(() => {
                setSeconds((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerActive]);

    const handleStartTimer = async () => {
        if (!userId) return;

        if (!timerActive) {
            // START TIMER
            setTimerActive(true);
            const startTime = new Date().toISOString();

            const { data, error } = await supabase
                .from('time_entries')
                .insert({
                    user_id: userId,
                    task_id: selectedTask?.id || null,
                    start_time: startTime,
                    is_manual: false
                })
                .select()
                .single();

            if (data) {
                setActiveEntryId(data.id);
                setSeconds(0);
            } else {
                console.error("Error starting timer:", error);
                setTimerActive(false);
            }
        } else {
            // STOP TIMER
            if (!activeEntryId) return;

            setTimerActive(false);
            const { error } = await supabase
                .from('time_entries')
                .update({ end_time: new Date().toISOString() })
                .eq('id', activeEntryId);

            if (error) {
                console.error("Error stopping timer:", error);
                setTimerActive(true);
            } else {
                setActiveEntryId(null);
            }
        }
    };

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="h-16 w-full flex items-center justify-between px-6 border-b border-hairline bg-white/50 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center space-x-4">
                <NousLogo className="scale-[0.80] origin-left" />
                {(role === 'owner' || role === 'partner') && (
                    <a 
                        href="/agency" 
                        className="px-3 py-1 rounded-full border border-[var(--color-nous-mist)]/30 text-[9px] font-black uppercase tracking-widest text-[var(--color-nous-mist)] hover:bg-[var(--color-nous-mist)]/10 transition-colors"
                    >
                        Torre de Control
                    </a>
                )}
                {role !== 'client' && (
                    <a 
                        href="/escritorio" 
                        className="px-3 py-1 rounded-full bg-white/40 border border-hairline text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-white/60 transition-colors"
                    >
                        Mi Escritorio
                    </a>
                )}
            </div>

            {role !== 'client' && (
                <div className="flex items-center space-x-4 bg-white/40 rounded-full px-4 py-2 border border-hairline shadow-sm">
                    <div className={`font-mono text-xl tracking-wider w-28 text-center transition-colors ${timerActive ? 'text-[var(--color-nous-mist)]' : 'text-slate-400'}`}>
                        {formatTime(seconds)}
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-700 transition-colors px-3 py-1 rounded-md hover:bg-white/50"
                            disabled={timerActive}
                        >
                            <span className="truncate max-w-[200px] font-light">{selectedTask?.title || "Select a task..."}</span>
                            <ChevronDown size={14} />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute top-10 left-0 w-80 glass-panel border border-hairline rounded-lg shadow-xl overflow-hidden z-50">
                                <div className="p-2 text-[10px] text-slate-400 uppercase tracking-elegant bg-white/40">Recent Tasks</div>
                                {tasks.length > 0 ? tasks.map((task) => (
                                    <button
                                        key={task.id}
                                        onClick={() => {
                                            setSelectedTask(task);
                                            setDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-white/60 hover:text-slate-900 transition-colors border-b border-hairline last:border-0"
                                    >
                                        <div className="font-light truncate">{task.title}</div>
                                    </button>
                                )) : (
                                    <div className="p-4 text-center text-slate-400 text-sm font-light">No active tasks found.</div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleStartTimer}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border border-hairline shadow-sm border-[var(--color-nous-mist)]/30 ${timerActive
                            ? "bg-red-50 text-red-500 animate-pulse"
                            : "bg-[var(--color-nous-mist)]/20 text-[var(--color-nous-mist)] hover:bg-[var(--color-nous-mist)]/30"
                            }`}
                    >
                        {timerActive ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                    </button>
                </div>
            )}

            <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end">
                    <div className="relative">
                        <button 
                            onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                            className="flex items-center space-x-1 hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors"
                        >
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-black tracking-elegant uppercase text-slate-900">
                                    {activeTeam?.name || "Seleccionar Equipo"}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                    {activeTeam ? 'Equipo Activo' : 'Sin Equipo'}
                                </span>
                            </div>
                            <ChevronDown size={12} className={`text-slate-400 transition-transform ${teamDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {teamDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="p-3 bg-slate-50 border-b border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tus Equipos</p>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {teams.map((team) => (
                                        <button
                                            key={team.id}
                                            onClick={() => {
                                                setActiveTeam(team.id);
                                                setTeamDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between ${activeTeam?.id === team.id ? 'bg-cyan-50/50 text-cyan-700' : 'text-slate-600'}`}
                                        >
                                            <span className="font-bold">{team.name}</span>
                                            {activeTeam?.id === team.id && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>}
                                        </button>
                                    ))}
                                </div>
                                {role !== 'client' && (
                                    <div className="p-2 border-t border-slate-100">
                                        <button className="w-full py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 rounded-lg transition-colors">
                                            + Crear Nuevo Equipo
                                        </button>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </div>
                
                {/* Notifications Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-hairline hover:bg-slate-100 transition-colors relative"
                    >
                        <Bell size={18} className="text-slate-500" />
                        {notifications.length > 0 && (
                            <div className="absolute top-0.5 right-0.5 w-3 h-3 border-2 border-white rounded-full bg-red-500"></div>
                        )}
                    </button>
                    
                    {showNotifications && (
                        <div className="absolute top-12 right-0 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Notificaciones</h3>
                                <span className="bg-cyan-100 text-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{notifications.length} nuevas</span>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map((notif) => (
                                    <div key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-bold text-slate-900">{notif.title}</p>
                                            <span className="text-[9px] text-slate-400 font-medium">Ahora</span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed mb-3">{notif.message}</p>
                                        
                                        {notif.type === 'PROJECT_INVITE' && (
                                            <div className="flex gap-2 mt-2">
                                                <button 
                                                    onClick={() => handleAcceptInvite(notif)}
                                                    className="flex-1 bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-cyan-600 transition-colors"
                                                >
                                                    Aceptar
                                                </button>
                                                <button 
                                                    onClick={() => handleRejectInvite(notif)}
                                                    className="flex-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-slate-200 transition-colors"
                                                >
                                                    Rechazar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                            <Bell size={24} />
                                        </div>
                                        <div className="text-xs font-medium text-slate-400">No tienes notificaciones pendientes</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => setIsProfileModalOpen(true)}
                    className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-hairline relative hover:bg-slate-200 transition-colors overflow-hidden"
                >
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <User size={18} className="text-slate-400" />
                    )}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${timerActive ? 'bg-[var(--color-nous-mint)]' : 'bg-slate-300'}`}></div>
                </button>
            </div>
            
            {/* Profile Modal */}
            <UserProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
                userId={userId!} 
            />
        </div>
    );
}
