"use client";

import React, { useState } from "react";
import { Mic, MicOff, Headphones, UserPlus, MoreVertical, Hash, Lock, Volume2 } from "lucide-react";

interface TeamMember {
    id: string;
    name: string;
    avatar: string;
    status: "online" | "busy" | "meeting" | "offline";
    currentTask?: string;
    timeOnTask?: string;
    role: string;
}

const teamMembers: TeamMember[] = [
    {
        id: "1",
        name: "Simon Sandrea",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
        status: "online",
        currentTask: "Reviewing Landing Page",
        timeOnTask: "00:45:12",
        role: "Project Lead",
    },
    {
        id: "2",
        name: "Sofia Chen",
        avatar: "https://i.pravatar.cc/150?u=a04258114e29026302d",
        status: "busy",
        currentTask: "Designing New Icons",
        timeOnTask: "02:10:30",
        role: "Design Lead",
    },
    {
        id: "3",
        name: "Marcus Aurelius",
        avatar: "https://i.pravatar.cc/150?u=a048581f4e29026701d",
        status: "meeting",
        role: "Strategist",
    },
    {
        id: "4",
        name: "Elena Fisher",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
        status: "offline",
        role: "Content Writer",
    },
];

const rooms = [
    { id: "general", name: "General Pod", members: [], type: "public" },
    { id: "design", name: "Design Lab", members: ["2"], type: "public" },
    { id: "dev", name: "Dev Bunker", members: [], type: "private" },
];

export function TeamSidebar() {
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [micOn, setMicOn] = useState(false);

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

                                    {/* Active Indicator & Volume Visualization (Mock) */}
                                    {isActive && (
                                        <div className="flex gap-0.5 items-end h-3">
                                            <div className="w-0.5 bg-[var(--color-nous-mist)] animate-[bounce_1s_infinite] h-2"></div>
                                            <div className="w-0.5 bg-[var(--color-nous-mist)] animate-[bounce_1.2s_infinite] h-3"></div>
                                            <div className="w-0.5 bg-[var(--color-nous-mist)] animate-[bounce_0.8s_infinite] h-1"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Members in Room */}
                                {room.members.length > 0 && (
                                    <div className="flex -space-x-1 mt-2 pl-6">
                                        {room.members.map(memberId => {
                                            const member = teamMembers.find(m => m.id === memberId);
                                            if (!member) return null;
                                            return (
                                                <img key={memberId} src={member.avatar} alt={member.name} className="w-5 h-5 rounded-full ring-2 ring-white grayscale group-hover:grayscale-0 transition-all shadow-sm" />
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* User Mic Controls (When in a room) */}
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

                {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-start gap-3 group p-2 hover:bg-white/40 glass-panel-hover rounded-lg transition-colors cursor-pointer">
                        {/* Avatar with Status Dot */}
                        <div className="relative">
                            <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-hairline shadow-sm" />
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${member.status === 'online' ? 'bg-[var(--color-nous-mint)] shadow-[0_0_5px_var(--color-nous-mint)]' :
                                member.status === 'busy' ? 'bg-red-400 shadow-[0_0_5px_#ef4444]' :
                                    member.status === 'meeting' ? 'bg-[var(--color-nous-lavender)] shadow-[0_0_5px_var(--color-nous-lavender)]' : 'bg-slate-300'
                                }`}></div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-sm font-light text-slate-800 truncate">{member.name}</span>
                                {member.status === 'busy' && <span className="text-[9px] font-mono text-red-500 bg-red-50 border border-red-100 px-1 rounded">{member.timeOnTask}</span>}
                            </div>

                            {/* Role */}
                            <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">{member.role}</div>

                            {/* Current Task (The Unique Feature) */}
                            {member.status !== 'offline' && (
                                <div className="text-[11px] leading-tight text-[var(--color-nous-mist)] italic truncate border-l-2 border-[var(--color-nous-mist)]/30 pl-2">
                                    {member.status === 'meeting' ? 'In a call...' : member.currentTask || 'Idle'}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Invite / Footer */}
            <div className="p-4 border-t border-hairline bg-white/20">
                <button className="flex items-center justify-center w-full py-2 bg-white/40 glass-panel-hover border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-slate-500 hover:text-slate-700 transition-all text-[10px] uppercase font-bold tracking-widest">
                    <UserPlus size={14} className="mr-2" />
                    Invitar Agente
                </button>
            </div>

        </div>
    );
}
