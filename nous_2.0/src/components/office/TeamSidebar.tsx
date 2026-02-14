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
        <div className="w-full h-full flex flex-col shadow-2xl z-20">

            {/* Audio Rooms Section */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Headphones size={14} className="text-cyan-400" />
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
                                    ? "bg-cyan-500/10 border-cyan-500/40"
                                    : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {room.type === 'private' ? <Lock size={12} className="text-gray-500" /> : <Hash size={12} className="text-gray-500" />}
                                        <span className={`text-sm font-medium ${isActive ? 'text-cyan-100' : 'text-gray-300'}`}>{room.name}</span>
                                    </div>

                                    {/* Active Indicator & Volume Visualization (Mock) */}
                                    {isActive && (
                                        <div className="flex gap-0.5 items-end h-3">
                                            <div className="w-0.5 bg-cyan-400 animate-[bounce_1s_infinite] h-2"></div>
                                            <div className="w-0.5 bg-cyan-400 animate-[bounce_1.2s_infinite] h-3"></div>
                                            <div className="w-0.5 bg-cyan-400 animate-[bounce_0.8s_infinite] h-1"></div>
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
                                                <img key={memberId} src={member.avatar} alt={member.name} className="w-5 h-5 rounded-full ring-2 ring-[#121212] grayscale group-hover:grayscale-0 transition-all" />
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
                    <div className="mt-3 flex items-center justify-center gap-4 py-2 bg-black/40 rounded-lg border border-white/5">
                        <button
                            onClick={(e) => { e.stopPropagation(); setMicOn(!micOn); }}
                            className={`p-2 rounded-full transition-all ${micOn ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                        >
                            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                        </button>
                        <button className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
                            <Volume2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Team Members List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Team Agents</h3>

                {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-start gap-3 group p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                        {/* Avatar with Status Dot */}
                        <div className="relative">
                            <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#050505] ${member.status === 'online' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' :
                                member.status === 'busy' ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' :
                                    member.status === 'meeting' ? 'bg-purple-500 shadow-[0_0_5px_#a855f7]' : 'bg-gray-500'
                                }`}></div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-sm font-medium text-gray-200 truncate">{member.name}</span>
                                {member.status === 'busy' && <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-1 rounded">{member.timeOnTask}</span>}
                            </div>

                            {/* Role */}
                            <div className="text-xs text-gray-500 mb-1">{member.role}</div>

                            {/* Current Task (The Unique Feature) */}
                            {member.status !== 'offline' && (
                                <div className="text-[11px] leading-tight text-cyan-500/80 italic truncate border-l-2 border-cyan-500/20 pl-2">
                                    {member.status === 'meeting' ? 'In a call...' : member.currentTask || 'Idle'}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Invite / Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <button className="flex items-center justify-center w-full py-2 bg-white/5 hover:bg-white/10 border border-dashed border-gray-600 hover:border-white/30 rounded-lg text-gray-400 hover:text-white transition-all text-xs uppercase tracking-wide">
                    <UserPlus size={14} className="mr-2" />
                    Invite Agent
                </button>
            </div>

        </div>
    );
}
