"use client";

import React, { useState } from "react";
import { TopBar } from "@/components/office/TopBar";
import { Workspace } from "@/components/office/Workspace";
import { TeamSidebar } from "@/components/office/TeamSidebar";

// Mock Data for TopBar
const mockTasks = [
    "SEO Audit for Client X",
    "Refactoring Auth Flow",
    "Design Review: Mobile Dashboard",
    "Content Strategy Meeting",
];

export default function OfficePage() {
    const [currentTask, setCurrentTask] = useState<string | null>(null);

    return (
        <div className="flex h-screen w-screen bg-[#050505] overflow-hidden relative">

            {/* Background (Subtle Grid/Gradient) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505]"></div>
                <div className="w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] opacity-40"></div>
                {/* Ambient Glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px]"></div>
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-col flex-1 z-10 relative">
                <TopBar />

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Project & Task Workspace */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <Workspace />
                    </div>

                    {/* Right: Team Sidebar */}
                    <div className="w-[320px] shrink-0 border-l border-white/5 bg-[#0A0A0A]/50 backdrop-blur-md">
                        <TeamSidebar />
                    </div>
                </div>
            </div>

        </div>
    );
}
