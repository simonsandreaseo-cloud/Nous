
"use client";

import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";

export function OfficePanel() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-[450px]"
        >
            {/* Top Left Bracket */}
            <svg className="absolute top-0 left-0 w-[150px] h-[150px] pointer-events-none" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 150 0 H 32 Q 0 0 0 32 V 120" stroke="#cbd5e1" strokeWidth="1" />
            </svg>

            {/* Bottom Right Bracket */}
            <svg className="absolute bottom-0 right-0 w-[150px] h-[150px] pointer-events-none" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 0 150 H 118 Q 150 150 150 118 V 30" stroke="#cbd5e1" strokeWidth="1" className="stroke-slate-300" />
            </svg>

            {/* Main Content Container */}
            <div className="relative w-full rounded-[32px] bg-white/50 backdrop-blur-sm p-8">

                {/* Header: Title & Icon */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Oficina</h2>
                        <p className="text-sm text-slate-400 font-medium tracking-wide">Orlh Clo</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 bg-white/50">
                        <Briefcase size={16} strokeWidth={1.5} />
                    </div>
                </div>

                {/* Horizontal Divider */}
                <div className="w-full h-[1px] bg-slate-200 mb-6" />

                {/* Data Grid Section with Vertical Interior Lines */}
                <div className="flex w-full">
                    {[
                        { label: "Monitor", val: "8G", sub: "Obitall" },
                        { label: "Investigación", val: "3.00 Usa", sub: "4G Gus Vebe" },
                        { label: "Contenidos", val: "4.00 02", sub: "Ethimul" },
                        { label: "...", val: "2.32 Ohm", sub: "4-Ommreitco" },
                    ].map((item, i, arr) => (
                        <div
                            key={i}
                            className={`flex flex-col items-start gap-1 flex-1 ${i !== arr.length - 1 ? 'border-r border-slate-200' : ''} ${i === 0 ? 'pl-0' : 'pl-4'}`}
                        >
                            <span className="text-xs text-slate-500 font-medium tracking-tight">
                                {item.label}
                            </span>
                            <span className="text-lg font-bold text-slate-800 tracking-tighter">
                                {item.val}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium tracking-wide font-mono">
                                {item.sub}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

