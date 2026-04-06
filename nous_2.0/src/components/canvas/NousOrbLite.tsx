"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";

interface NousOrbLiteProps {
    isProcessing?: boolean;
}

export function NousOrbLite({ isProcessing = false }: NousOrbLiteProps) {
    const nousMode = useAppStore((state) => state.nousMode);

    const theme = useMemo(() => {
        if (isProcessing) {
            return {
                color: "text-purple-500",
                glow: "rgba(168, 85, 247, 0.4)",
                secondary: "text-purple-300"
            };
        }
        
        switch (nousMode) {
            case 'alta_calidad':
                return {
                    color: "text-indigo-500",
                    glow: "rgba(99, 102, 241, 0.3)",
                    secondary: "text-indigo-300"
                };
            case 'equilibrado':
                return {
                    color: "text-cyan-500",
                    glow: "rgba(6, 182, 212, 0.3)",
                    secondary: "text-cyan-300"
                };
            case 'rapido':
                return {
                    color: "text-amber-500",
                    glow: "rgba(245, 158, 11, 0.3)",
                    secondary: "text-amber-300"
                };
            default:
                return {
                    color: "text-indigo-500",
                    glow: "rgba(99, 102, 241, 0.3)",
                    secondary: "text-indigo-300"
                };
        }
    }, [nousMode, isProcessing]);

    return (
        <div className="w-full h-full flex items-center justify-center relative">
            {/* Ambient Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.3, 0.1],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ backgroundColor: theme.glow }}
            />

            {/* SVG Logo (Favicon Style) */}
            <motion.svg 
                viewBox="0 0 100 100" 
                className={cn("w-12 h-12 transition-colors duration-700", theme.color)}
                initial={false}
                animate={{
                    rotate: isProcessing ? 360 : 0
                }}
                transition={{
                    duration: isProcessing ? 3 : 60,
                    repeat: Infinity,
                    ease: isProcessing ? "linear" : "easeInOut"
                }}
            >
                {/* Outer Ring / Crescent (The minimalist 'N' or circle) */}
                <motion.path
                    d="M 50,20 A 30,30 0 1,1 20,50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    animate={{
                        opacity: [0.6, 1, 0.6]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Inner Dot with gentle pulse */}
                <motion.circle
                    cx="58"
                    cy="42"
                    r="6"
                    fill="currentColor"
                    animate={{
                        scale: isProcessing ? [1, 1.4, 1] : 1,
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Tertiary Orbiting Particles (Optional, for premium detail) */}
                {isProcessing && (
                    <motion.circle
                        cx="50"
                        cy="10"
                        r="2"
                        fill="currentColor"
                        className="opacity-40"
                        animate={{
                            rotate: 360,
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        style={{ originX: "50px", originY: "50px" }}
                    />
                )}
            </motion.svg>
        </div>
    );
}
