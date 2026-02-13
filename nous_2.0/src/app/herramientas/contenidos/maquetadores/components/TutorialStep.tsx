"use client";

import { motion } from "framer-motion";

interface TutorialStepProps {
    stepNumber: number;
    title: string;
    description: string;
    code: string;
}

export default function TutorialStep({ stepNumber, title, description, code }: TutorialStepProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col md:flex-row gap-8 items-start"
        >
            {/* Step Marker */}
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-cyan-500 text-[#0A0E1A] font-black text-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                {stepNumber}
            </div>

            {/* Content */}
            <div className="flex-grow space-y-4">
                <h3 className="text-3xl font-black tracking-tight text-white">{title}</h3>
                <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">{description}</p>

                {/* Code Snippet */}
                <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-700/50 font-mono text-sm group">
                    <div className="absolute top-4 right-4 text-slate-600 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Código de Referencia
                    </div>
                    <pre className="text-cyan-300/80 leading-relaxed overflow-x-auto">
                        {code}
                    </pre>
                </div>
            </div>
        </motion.div>
    );
}
