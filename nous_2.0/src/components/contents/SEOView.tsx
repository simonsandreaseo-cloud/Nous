"use client";

import { useProjectStore } from "@/store/useProjectStore";
import ProjectUrlManager from "@/components/dashboard/ProjectUrlManager";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function SEOView() {
    const { activeProject } = useProjectStore();

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-8">
                <Search size={16} className="text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.25em]">Gestión de URLs del Proyecto</h3>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1"
            >
                <ProjectUrlManager />
            </motion.div>
        </div>
    );
}
