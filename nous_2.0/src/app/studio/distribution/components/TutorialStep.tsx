"use client";

import { motion } from "framer-motion";

interface TutorialStepProps {
    stepNumber: number;
    title: string;
    description: string;
    code?: string;
}

export default function TutorialStep({ stepNumber, title, description, code }: TutorialStepProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row gap-8 items-start"
        >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 font-bold flex items-center justify-center text-xl border border-cyan-500/20">
                {stepNumber}
            </div>
            <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">{title}</h3>
                <p className="text-slate-400 mb-6 max-w-xl">{description}</p>
                {code && (
                    <div className="bg-slate-950 rounded-xl p-4 font-mono text-sm text-slate-300 border border-slate-800 overflow-x-auto">
                        <pre>{code}</pre>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
