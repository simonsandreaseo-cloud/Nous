"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    index: number;
}

export default function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.2 }}
            whileHover={{ scale: 1.05, y: -10 }}
            className="group relative p-8 rounded-3xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-cyan-500/50"
        >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/10 group-hover:via-transparent group-hover:to-blue-500/10 transition-all duration-500" />

            {/* Icon */}
            <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:bg-cyan-500/30 group-hover:border-cyan-500/50 transition-all duration-300">
                    <Icon className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
            </div>

            {/* Content */}
            <div className="relative">
                <h3 className="text-2xl font-black tracking-tight mb-3 group-hover:text-cyan-400 transition-colors duration-300">
                    {title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Corner Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500" />
        </motion.div>
    );
}
