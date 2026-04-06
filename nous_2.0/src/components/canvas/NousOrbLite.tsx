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
    const nousMode = useAppStore((state) => state.nousMode);

    const theme = useMemo(() => {
        if (isProcessing) {
            return {
                color: "from-purple-500 to-indigo-500",
                glow: "rgba(168, 85, 247, 0.5)",
                border: "border-purple-500/50"
            };
        }
        
        switch (nousMode) {
            case 'alta_calidad':
                return {
                    color: "from-emerald-500 to-cyan-500",
                    glow: "rgba(16, 185, 129, 0.4)",
                    border: "border-emerald-500/30"
                };
            case 'equilibrado':
                return {
                    color: "from-indigo-500 to-blue-500",
                    glow: "rgba(99, 102, 241, 0.4)",
                    border: "border-indigo-500/30"
                };
            case 'rapido':
                return {
                    color: "from-amber-500/80 to-rose-500/80",
                    glow: "rgba(245, 158, 11, 0.4)",
                    border: "border-amber-500/30"
                };
            default:
                return {
                    color: "from-indigo-500 to-blue-500",
                    glow: "rgba(99, 102, 241, 0.4)",
                    border: "border-indigo-500/30"
                };
        }
    }, [nousMode, isProcessing]);

    return (
        <div className="w-full h-full flex items-center justify-center relative scale-[1.2]">
            {/* Outer Aura / Glow */}
            <motion.div
                animate={{
                    scale: isProcessing ? [1, 1.15, 1] : [1, 1.05, 1],
                    opacity: isProcessing ? [0.4, 0.6, 0.4] : [0.2, 0.3, 0.2],
                }}
                transition={{
                    duration: isProcessing ? 1.5 : 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute inset-[-10%] rounded-full blur-3xl opacity-30 shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                style={{ backgroundColor: theme.glow }}
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
                        className="absolute inset-0 rounded-full border border-dashed border-white/20 p-1"
                    >
                        <div className={cn("w-full h-full rounded-full border-t-2 border-r-2 bg-transparent", theme.border)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* THE MASTER ORB (Black Circle) */}
            <motion.div
                animate={{
                    scale: isProcessing ? [1, 1.02, 1] : 1,
                    boxShadow: isProcessing 
                        ? [`0 0 20px ${theme.glow}`, `0 0 40px ${theme.glow}`, `0 0 20px ${theme.glow}`]
                        : [`0 0 10px ${theme.glow}`, `0 0 20px ${theme.glow}`, `0 0 10px ${theme.glow}`]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                    "relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden transition-all duration-700",
                    "bg-gradient-to-br from-slate-900 to-black border border-white/10 shadow-2xl",
                    isProcessing ? "ring-1 ring-white/20" : "group-hover:border-white/20"
                )}
            >
                {/* Logo Nous Centered */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <Image
                        src="/LogoNous.png"
                        alt="Nous Assistant"
                        width={48}
                        height={48}
                        priority
                        className={cn(
                            "object-contain transition-all duration-700",
                            isProcessing ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "group-hover:scale-105"
                        )}
                    />
                </div>

                {/* Internal HUD Overlay (Technical detail) */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)] pointer-events-none" />
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0px)', backgroundSize: '4px 4px' }} />
            </motion.div>

            {/* Breathing Ring (Subtle) */}
            {!isProcessing && (
                <motion.div
                    animate={{
                        scale: [1, 1.08, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute inset-0 rounded-full border border-white/10"
                />
            )}
        </div>
    );
}

