"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
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

    // Determinar color de "alma" basado en la ruta
    let glowColor = "rgba(148, 163, 184, 0.5)"; // Slate 400
    if (pathname?.includes("/monitor")) {
        glowColor = "rgba(16, 185, 129, 0.5)"; // Emerald 500
    } else if (pathname?.includes("/writer")) {
        glowColor = "rgba(99, 102, 241, 0.5)"; // Indigo 500
    }

    if (!mounted) return null;

    return (
        <div className={cn("relative flex items-center gap-3 group cursor-pointer", className)}>
            {/* Logo Container */}
            <div className="relative w-9 h-9 flex items-center justify-center">
                
                {/* Orbital Rings (Behind Logo) */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-slate-200/50 scale-[1.1]"
                />
                
                {isProcessing && (
                    <motion.div
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full blur-md"
                        style={{ backgroundColor: glowColor }}
                    />
                )}

                {/* The PNG Logo */}
                <div className="relative z-10 w-7 h-7">
                    <Image
                        src="/LogoNous.png"
                        alt="Nous Logo"
                        width={28}
                        height={28}
                        className={cn(
                            "object-contain transition-transform duration-500",
                            isProcessing ? "scale-110 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" : "group-hover:scale-110"
                        )}
                    />
                </div>

                {/* Active Pulse Dot (Floating) */}
                {isProcessing && (
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)]"
                    />
                )}
            </div>

            {/* Tipografía Nous */}
            {showText && (
                <motion.div
                    className="text-xl tracking-[0.2em] text-slate-900 font-black uppercase"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                >
                    Nous
                </motion.div>
            )}
        </div>
    );
}
