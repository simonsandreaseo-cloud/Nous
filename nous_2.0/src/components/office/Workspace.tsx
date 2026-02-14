"use client";

import React from "react";
import { Plus, MoreHorizontal, MessageSquare, Paperclip, BarChart3, TrendingUp, Users } from "lucide-react";

interface StatusColumn {
    title: string;
    count: number;
    tasks: TaskCardProps[];
}

interface TaskCardProps {
    title: string;
    project: string;
    assignee: string; // Mock avatar URL
    priority: "High" | "Medium" | "Low";
    comments: number;
    attachments: number;
    tags: string[];
}

const KanbanColumn = ({ status }: { status: StatusColumn }) => (
    <div className="flex flex-col space-y-4 min-w-[300px] h-full overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(status.title)}`}></div>
                {status.title}
                <span className="ml-2 text-xs font-mono px-2 py-0.5 bg-white/5 rounded-full">{status.count}</span>
            </h3>
            <button className="text-gray-500 hover:text-white transition-colors">
                <MoreHorizontal size={16} />
            </button>
        </div>

        {status.tasks.map((task, idx) => (
            <KanbanCard key={idx} {...task} />
        ))}

        <div className="mt-4 flex items-center justify-center p-2 rounded-lg border border-dashed border-white/10 hover:border-cyan-500/50 cursor-pointer text-gray-500 hover:text-cyan-400 transition-all group">
            <Plus size={16} className="mr-2 group-hover:rotate-90 transition-transform" />
            <span className="text-sm">Add Task</span>
        </div>
    </div>
);

const KanbanCard = ({ title, project, assignee, priority, comments, tags }: TaskCardProps) => (
    <div className="group relative bg-[#121212]/80 backdrop-blur-sm border border-white/5  hover:border-cyan-500/30 rounded-xl p-4 transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.15)] hover:-translate-y-1 cursor-grab active:cursor-grabbing">
        {/* Tags/Project Badge */}
        <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${project.includes('SEO') ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 'text-purple-400 border-purple-500/20 bg-purple-500/10'}`}>
                {project}
            </span>
            {priority === 'High' && <div className="ml-auto w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>}
        </div>

        <h4 className="text-sm font-medium text-gray-200 mb-2 leading-snug group-hover:text-cyan-100 transition-colors">{title}</h4>

        <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-3">
            {/* Assignee */}
            <div className="flex items-center -space-x-2">
                <img src={assignee} alt="Assignee" className="w-6 h-6 rounded-full border border-[#121212] object-cover ring-2 ring-[#121212] group-hover:ring-cyan-500/20 transition-all" />
            </div>

            {/* Meta Icons */}
            <div className="flex items-center space-x-3 text-gray-500 text-xs">
                {comments > 0 && (
                    <div className="flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
                        <MessageSquare size={12} />
                        <span>{comments}</span>
                    </div>
                )}
                <div className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">
                    <Paperclip size={12} />
                </div>
            </div>
        </div>
    </div>
);

const getStatusColor = (status: string) => {
    switch (status) {
        case "To Do": return "bg-gray-500";
        case "In Progress": return "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]";
        case "Review": return "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]";
        case "Done": return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
        default: return "bg-white";
    }
};

const mockStatuses: StatusColumn[] = [
    {
        title: "To Do",
        count: 3,
        tasks: [
            {
                title: "Brainstorming: Q3 SEO Strategy for Medical Blog",
                project: "SEO Growth",
                assignee: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
                priority: "Medium",
                comments: 2,
                attachments: 1,
                tags: ["Strategy"]
            },
            {
                title: "Keyword Research: 'Biotech Startups' Niche",
                project: "Research",
                assignee: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
                priority: "Low",
                comments: 0,
                attachments: 0,
                tags: ["Keywords"]
            },
            {
                title: "Update Client Reporting Structure",
                project: "Client Ops",
                assignee: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
                priority: "Medium",
                comments: 5,
                attachments: 2,
                tags: ["Reporting"]
            }
        ],
    },
    {
        title: "In Progress",
        count: 2,
        tasks: [
            {
                title: "Technical Audit: Site Speed Optimization",
                project: "Tech SEO",
                assignee: "https://i.pravatar.cc/150?u=a04258114e29026302d",
                priority: "High",
                comments: 12,
                attachments: 4,
                tags: ["Technical", "Critical"]
            },
            {
                title: "Content Writing: 'Future of Clinical AI'",
                project: "Blog",
                assignee: "https://i.pravatar.cc/150?u=a048581f4e29026701d",
                priority: "Medium",
                comments: 1,
                attachments: 0,
                tags: ["Content"]
            }

        ],
    },
    {
        title: "Review",
        count: 1,
        tasks: [
            {
                title: "Review: On-Page Optimization for Home Page",
                project: "On-Page",
                assignee: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
                priority: "High",
                comments: 3,
                attachments: 1,
                tags: ["Review"]
            }
        ],
    },
    {
        title: "Done",
        count: 5,
        tasks: [
            {
                title: "Launch: New Landing Page",
                project: "Development",
                assignee: "https://i.pravatar.cc/150?u=a04258114e29026302d",
                priority: "High",
                comments: 8,
                attachments: 5,
                tags: ["Launch"]
            }
        ],
    },
];

export function Workspace() {
    return (
        <div className="flex-1 h-full overflow-hidden flex flex-col pt-6 pl-6 pr-0">

            {/* Workspace Toolbar / Filters */}
            <div className="mb-6 flex items-center justify-between pr-6">
                <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-lg border border-white/5 backdrop-blur-sm">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-md shadow-sm transition-all hover:bg-white/20">Board</button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-all hover:bg-white/5 rounded-md">List</button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-all hover:bg-white/5 rounded-md">Timeline</button>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="relative group">
                        <div className="px-3 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-gray-400 group-hover:border-cyan-500/30 transition-colors flex items-center gap-2">
                            <Users size={12} />
                            <span>Filter: All Members</span>
                            <ChevronDown size={10} />
                        </div>
                    </div>
                    <div className="relative group">
                        <div className="px-3 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-gray-400 group-hover:border-purple-500/30 transition-colors flex items-center gap-2">
                            <BarChart3 size={12} />
                            <span>Sort: Priority</span>
                            <ChevronDown size={10} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 flex overflow-x-auto pb-4 space-x-2 scrollbar-none snap-x snap-mandatory">
                {mockStatuses.map((status, idx) => (
                    <div key={idx} className="snap-start shrink-0">
                        <KanbanColumn status={status} />
                    </div>
                ))}

                {/* Add Column Placeholder */}
                <div className="min-w-[300px] h-full p-4 flex items-start justify-center opacity-40 hover:opacity-100 transition-opacity">
                    <button className="flex items-center space-x-2 text-gray-400 hover:text-cyan-400 group border border-dashed border-gray-600 rounded-xl px-6 py-3 w-full justify-center hover:border-cyan-500 transition-colors">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        <span>Add Status</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper needed for Filters
import { ChevronDown } from "lucide-react";
