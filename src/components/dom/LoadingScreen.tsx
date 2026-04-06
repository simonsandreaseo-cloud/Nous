"use client";

import { useProgress } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";

export function LoadingScreen() {
    const { active, progress, item } = useProgress();
    const setIsLoaded = useAppStore((state) => state.setIsLoaded);
    const [shouldRender, setShouldRender] = useState(true);
    const [displayProgress, setDisplayProgress] = useState(0);

    // Smooth progress interpolation
    useEffect(() => {
        let animationFrameId: number;

        const updateProgress = () => {
            setDisplayProgress(prev => {
                // If real progress is higher, move towards it
                let target = progress;
                // If real progress is 0 but we are active or just creating tension, fake it a bit
                if (progress === 0 && active) target = 10;

                const diff = target - prev;
                if (diff > 0) {
                    return prev + Math.max(diff * 0.1, 0.5); // Ease towards target
                }
                return prev;
            });
            animationFrameId = requestAnimationFrame(updateProgress);
        };

        if (shouldRender) {
            animationFrameId = requestAnimationFrame(updateProgress);
        }

        return () => cancelAnimationFrame(animationFrameId);
    }, [progress, active, shouldRender]);

    // Completion logic & Failsafe
    useEffect(() => {
        const handleComplete = () => {
            // Force display to 100 visually
            setDisplayProgress(100);
            const timer = setTimeout(() => {
                setIsLoaded(true);
                setTimeout(() => setShouldRender(false), 1000);
            }, 500);
            return () => clearTimeout(timer);
        };

        // 1. Normal Success: Active is false AND we have reached 100% (or we decided we are done)
        if (!active && progress === 100) {
            return handleComplete();
        }

        // 2. No Assets Case: If active is false but progress is 0 (scene has no heavy assets)
        // We wait a tiny bit to make sure it's not just "about to start", then finish.
        if (!active && progress === 0 && displayProgress > 0) {
            const emptySceneTimer = setTimeout(handleComplete, 500);
            return () => clearTimeout(emptySceneTimer);
        }

        // 3. Failsafe: Hard timeout to ensure users never get stuck
        const failsafeTimer = setTimeout(() => {
            if (shouldRender) {
                console.warn("Loader timed out. Forcing entry.");
                handleComplete();
            }
        }, 2000); // 2 seconds max wait

        return () => clearTimeout(failsafeTimer);

    }, [active, progress, setIsLoaded, shouldRender, displayProgress]);

    if (!shouldRender) return null;

    return (
        <>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, filter: "blur(20px)" }}
                    transition={{ duration: 1.2, ease: [0.43, 0.13, 0.23, 0.96] }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-transparent font-mono select-none pointer-events-auto"
                >
                    <div className="relative mb-8 overflow-hidden text-center">
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-4xl md:text-5xl font-bold tracking-[0.4em] text-[#111827] uppercase"
                        >
                            Nous
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.3 }}
                            className="text-[12px] tracking-[0.2em] mt-2 uppercase"
                        >
                            Tu mente en la estrategia. Nous hace lo demás.
                        </motion.p>
                    </div>

                    <div className="w-64 flex flex-col gap-2">
                        <div className="flex justify-between items-end text-[9px] text-foreground/40 uppercase tracking-widest font-black">
                            <span className="animate-pulse">
                                {displayProgress < 100 ? "Initializing_Buffer" : "Ready_State"}
                            </span>
                            <span>{Math.round(Math.min(displayProgress, 100))}%</span>
                        </div>

                        <div className="h-[2px] w-full bg-foreground/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(displayProgress, 100)}%` }}
                                className="h-full bg-color-deep-cyan"
                            />
                        </div>

                        <div className="h-4">
                            <span className="text-[7px] text-foreground/20 uppercase tracking-[0.3em] block truncate text-center">
                                {item ? `Src: ${item.split('/').pop()}` : "Verifying System Integrity"}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </>
    );
}
