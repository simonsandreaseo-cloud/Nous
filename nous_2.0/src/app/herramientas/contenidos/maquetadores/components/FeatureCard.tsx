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
            whileHover={{ scale: 1.02, y: -5 }}
            className="group relative p-8 rounded-[32px] glass-panel bg-white/40 border-hairline overflow-hidden transition-all duration-500 hover:shadow-sm"
        >
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-[var(--color-nous-mist)]/0 group-hover:bg-[var(--color-nous-mist)]/5 transition-all duration-700 pointer-events-none" />

            {/* Icon */}
            <div className="relative mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-nous-mist)]/10 border border-[var(--color-nous-mist)]/20 flex items-center justify-center group-hover:bg-[var(--color-nous-mist)]/20 transition-all duration-300">
                    <Icon className="w-6 h-6 text-[var(--color-nous-mist)] group-hover:scale-110 transition-transform duration-300" />
                </div>
            </div>

            {/* Content */}
            <div className="relative">
                <h3 className="text-xl font-black tracking-tight mb-3 text-slate-800 uppercase italic group-hover:text-[var(--color-nous-mist)] transition-colors duration-300">
                    {title}
                </h3>
                <p className="text-slate-500 font-light leading-relaxed text-sm">
                    {description}
                </p>
            </div>
        </motion.div>
    );
}
