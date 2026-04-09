"use client";

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from "@/store/useAppStore";
import Image from 'next/image';
import { cn } from "@/utils/cn";

interface NousOrbLiteProps {
    isProcessing?: boolean;
}

export function NousOrbLite({ isProcessing = false }: NousOrbLiteProps) {
    const theme = useMemo(() => {
        if (isProcessing) {
            return {
                color: "from-indigo-500 to-cyan-500",
                glow: "rgba(99, 102, 241, 0.3)",
                border: "border-indigo-400/50"
            };
        }
        
        return {
            color: "from-slate-200 to-white",
            glow: "rgba(0, 0, 0, 0.05)",
            border: "border-slate-200"
        };
    }, [isProcessing]);

    return (
        <div className="w-full h-full flex items-center justify-center relative scale-[1.2]">
            {/* Outer Aura / Glow (Subtle for white orb) */}
            <motion.div
                animate={{
                    scale: isProcessing ? [1, 1.15, 1] : [1, 1.05, 1],
                    opacity: isProcessing ? [0.3, 0.5, 0.3] : [0.1, 0.15, 0.1],
                }}
                transition={{
                    duration: isProcessing ? 1.5 : 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute inset-[-15%] rounded-full blur-3xl"
                style={{ 
                    backgroundColor: isProcessing ? theme.glow : "rgba(255, 255, 255, 0.8)",
                    boxShadow: isProcessing ? `0 0 40px ${theme.glow}` : "none"
                }}
            />

            {/* Neural Processing Ring (Active only when processing) */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                        animate={{ opacity: 1, scale: 1.05, rotate: 360 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                            opacity: { duration: 0.5 },
                            scale: { duration: 0.5 }
                        }}
                        className="absolute inset-[-5%] rounded-full border border-dashed border-indigo-400/30 p-1"
                    >
                        <div className="w-full h-full rounded-full border-t-2 border-r-2 border-indigo-500/40 bg-transparent" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* THE MASTER ORB (White Circle - Modern & Premium) */}
            <motion.div
                animate={{
                    scale: isProcessing ? [1, 1.02, 1] : 1,
                    boxShadow: isProcessing 
                        ? [`0 10px 40px -10px rgba(79, 70, 229, 0.2)`, `0 15px 50px -5px rgba(79, 70, 229, 0.3)`, `0 10px 40px -10px rgba(79, 70, 229, 0.2)`]
                        : ["0 8px 30px -10px rgba(0,0,0,0.12)", "0 12px 35px -5px rgba(0,0,0,0.15)", "0 8px 30px -10px rgba(0,0,0,0.12)"]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className={cn(
                    "relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-all duration-700",
                    "bg-white border border-slate-100 shadow-2xl",
                    isProcessing ? "ring-1 ring-indigo-500/20" : "group-hover:border-indigo-400/30"
                )}
            >
                {/* Logo Nous Centered */}
                <div className="relative w-11 h-11 flex items-center justify-center">
                    <Image
                        src="/LogoNous.png"
                        alt="Nous Assistant"
                        width={44}
                        height={44}
                        priority
                        className={cn(
                            "object-contain transition-all duration-700",
                            isProcessing ? "scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.2)]" : "group-hover:scale-105"
                        )}
                        style={{ filter: 'contrast(1.05) brightness(1)' }}
                    />
                </div>

                {/* Internal Crystal HUD Detail */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.02),transparent_70%)] pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0px)', backgroundSize: '4px 4px' }} />
                
                {/* Glass shine */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
            </motion.div>

            {/* Breathing Ring (Subtle) */}
            {!isProcessing && (
                <motion.div
                    animate={{
                        scale: [1, 1.12, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute inset-0 rounded-full border border-slate-200/50"
                />
            )}
        </div>
    );
}

