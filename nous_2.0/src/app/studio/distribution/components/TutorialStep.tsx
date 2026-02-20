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
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[var(--color-nous-mist)] text-white font-black text-xl flex items-center justify-center shadow-sm">
                {stepNumber}
            </div>

            {/* Content */}
            <div className="flex-grow space-y-4">
                <h3 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">{title}</h3>
                <p className="text-slate-500 text-lg leading-relaxed max-w-2xl font-light">{description}</p>

                {/* Code Snippet */}
                <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-xs group shadow-sm">
                    <div className="absolute top-4 right-4 text-slate-300 text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Código de Referencia
                    </div>
                    <pre className="text-[var(--color-nous-mist)] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                        {code}
                    </pre>
                </div>
            </div>
        </motion.div>
    );
}
