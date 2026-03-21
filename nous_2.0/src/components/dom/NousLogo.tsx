"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

export interface NousLogoProps {
    isProcessing?: boolean;
    showText?: boolean;
    className?: string;
}

export function NousLogo({ isProcessing = false, showText = true, className }: NousLogoProps) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Determinar color de "alma" basado en la ruta (Vacío Inteligente)
    let glowColor = "var(--color-nous-mist)"; // Gris azulado por defecto (Oficina/Dashboard)
    if (pathname?.includes("/monitor")) {
        glowColor = "var(--color-nous-mint)"; // Menta Glacial para monitoreo
    } else if (pathname?.includes("/writer")) {
        glowColor = "var(--color-nous-lavender)"; // Lavanda Pálido para IA
    }

    if (!mounted) return null;

    return (
        <div className={cn("relative flex items-center gap-3 group cursor-pointer", className)}>
            {/* El Nodo Orbital (SVG) */}
            <div className="relative w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 group-hover:bg-white/10 group-hover:shadow-sm">

                {/* 2. La Deriva Orbital (Slow Rotation) */}
                <motion.svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    className="absolute inset-0"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 45,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                >
                    <defs>
                        {/* Degradado tipo "cometa" */}
                        <linearGradient id="orbitalGradient" x1="100%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor={glowColor} stopOpacity="0.8" />
                            <stop offset="50%" stopColor={glowColor} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* 4. El Trazado de Inicio (SVG Draw) */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#orbitalGradient)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        transform="rotate(36 50 50)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 0.8, opacity: 1 }}
                        transition={{
                            pathLength: { duration: 2.5, ease: [0.4, 0, 0.2, 1] },
                            opacity: { duration: 1.5, ease: "easeOut" }
                        }}
                    />
                </motion.svg>

                {/* 3. El Salto de Frecuencia (LPU Processing) */}
                {isProcessing && (
                    <>
                        {/* Capas translúcidas vibrantes */}
                        <motion.svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 100 100"
                            className="absolute inset-0 opacity-40 blur-[1px]"
                            animate={{ rotate: [-20, 340], scale: [1, 1.05, 1] }}
                            transition={{
                                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                                scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
                            }}
                        >
                            <circle cx="50" cy="50" r="45" fill="none" stroke={glowColor} strokeWidth="1" strokeDasharray="60 220" transform="rotate(100 50 50)" />
                        </motion.svg>
                        <motion.svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 100 100"
                            className="absolute inset-0 opacity-30 blur-[2px]"
                            animate={{ rotate: [20, -340], scale: [1.05, 1, 1.05] }}
                            transition={{
                                rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
                                scale: { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
                            }}
                        >
                            <circle cx="50" cy="50" r="45" fill="none" stroke={glowColor} strokeWidth="2" strokeDasharray="100 200" transform="rotate(-50 50 50)" />
                        </motion.svg>
                    </>
                )}

                {/* 1. El Pulso de Conciencia (Breathing Nucleus) */}
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        width: '4px',
                        height: '4px',
                        backgroundColor: glowColor,
                        boxShadow: `0 0 10px ${glowColor}`
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: isProcessing ? [1, 1.5, 1] : [1, 1.2, 1],
                        opacity: isProcessing ? [0.9, 1, 0.9] : [0.5, 1, 0.5],
                        boxShadow: isProcessing
                            ? [`0 0 8px ${glowColor}`, `0 0 18px ${glowColor}`, `0 0 8px ${glowColor}`]
                            : [`0 0 4px ${glowColor}`, `0 0 10px ${glowColor}`, `0 0 4px ${glowColor}`]
                    }}
                    transition={{
                        scale: { duration: isProcessing ? 0.6 : 4, repeat: Infinity, ease: "easeInOut" },
                        opacity: { duration: isProcessing ? 0.6 : 4, repeat: Infinity, ease: "easeInOut" },
                        boxShadow: { duration: isProcessing ? 0.6 : 4, repeat: Infinity, ease: "easeInOut" }
                    }}
                />
            </div>

            {/* Tipografía Nous */}
            {showText && (
                <motion.div
                    className="text-2xl tracking-elegant text-slate-800"
                    style={{ fontWeight: 200 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1.5, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                >
                    Nous
                </motion.div>
            )}
        </div>

    );
}
