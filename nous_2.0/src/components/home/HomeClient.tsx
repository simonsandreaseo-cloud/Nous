"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";
import { CurvedGrid } from "@/components/canvas/CurvedGrid";
import { NousOrb } from "@/components/canvas/NousOrb";
import { NousText3D } from "@/components/canvas/NousText3D";
import { DataParticles } from "@/components/canvas/DataParticles";
import { TaskField } from "@/components/canvas/TaskField/TaskField";
import { OfficePanel } from "@/components/dom/OfficePanel";

import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { LoadingScreen } from "@/components/dom/LoadingScreen";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import { Background2D } from "@/components/Background2D/Background2D";

const SceneLayout = dynamic(
    () => import("@/components/canvas/SceneLayout"),
    { ssr: false }
);

export default function HomeClient() {
    const isLoaded = useAppStore((state) => state.isLoaded);
    const highContrast = useAppStore((state) => state.highContrast);
    const toggleHighContrast = useAppStore((state) => state.toggleHighContrast);
    const setMode = useAppStore((state) => state.setMode);

    useEffect(() => {
        setMode('home');
    }, [setMode]);

    // 15.2.2 Easter Egg: Console message
    useEffect(() => {
        console.log(
            "%c NOUS CLINICAL TECH %c SYSTEM_INITIALIZED %c",
            "background: #111827; color: #5EEAD4; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;",
            "background: #5EEAD4; color: #111827; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;",
            "color: transparent"
        );
        console.log("%c Welcome to the neural interface components. Neural paths verified. %c", "color: #94A3B8; font-style: italic;", "");
    }, []);

    return (
        <main
            id="main-content"
            className={cn(
                "relative w-full h-screen overflow-hidden transition-colors duration-700",
                highContrast ? "bg-black" : "bg-[url('/Fondo_Nous.webp')] bg-cover bg-center bg-no-repeat w-full h-full fixed inset-0"
            )}
        >

            {/* 11.1 Progressive Loader */}
            <LoadingScreen />

            {/* BACKGROUND IS NOW INSIDE SCENE LAYOUT FOR REFRACTION */}
            {/* <Background2D /> REMOVED */}

            {/* WEBGL LAYER */}
            <motion.div
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoaded ? 1 : 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute inset-0 z-10"
            >
                <Suspense fallback={null}>
                    <SceneLayout>
                        {/* <NousText3D /> */}
                        {/* <CurvedGrid /> */}

                        {/* <TaskField /> */}
                        {/* <CurvedGrid /> */}

                        <group position={[0, -0.8, -4.5]} scale={1.4}>
                            <NousOrb />
                        </group>
                    </SceneLayout>
                </Suspense>
            </motion.div>

            {/* UI OVERLAY LAYER */}
            <AnimatePresence>
                {isLoaded && (
                    <div className={cn(
                        "relative z-20 pointer-events-none h-full w-full flex flex-col transition-colors duration-700",
                        highContrast ? "text-white" : "text-foreground"
                    )}>

                        {/* HEADER FIXED SECTION */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="z-50"
                        >
                            <NavigationHeader />
                        </motion.div>

                        {/* MAIN INTERFACE LAYER */}
                        <div className="relative flex flex-col h-full w-full px-6 md:px-12 pt-16 pb-10 z-30">
                            <div className="flex flex-col md:flex-row items-start justify-between h-full">

                                {/* LEFT SIDE: MAIN TITLE & PARTNERS */}
                                <div className="flex flex-col gap-10">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 1.2, delay: 0.6 }}
                                        className="pointer-events-auto flex flex-col items-start max-w-2xl mt-4"
                                    >
                                        <h1 className="text-[6.5rem] md:text-[12rem] leading-[0.75] font-black text-slate-900 tracking-[-0.04em] -ml-[0.06em]">
                                            Nous
                                        </h1>
                                        <p className="text-xl md:text-3xl font-light text-slate-600 tracking-tight mt-6">
                                            Tu ecosistema SEO inteligente
                                        </p>
                                    </motion.div>

                                    {/* PARTNERS MOVED HERE */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 1, delay: 0.9 }}
                                        className="pointer-events-auto"
                                    >
                                        <section aria-label="Partner Indicators">
                                            <div className="flex flex-col gap-3">
                                                <div className={cn(
                                                    "flex items-center gap-3 text-xs md:text-sm font-bold transition-colors cursor-crosshair group",
                                                    highContrast ? "text-white/80 hover:text-white" : "text-foreground/70 hover:text-foreground"
                                                )}>
                                                    <div className="w-2.5 h-2.5 rounded-full bg-color-deep-cyan shadow-[0_0_8px_rgba(0,128,128,0.5)] transition-transform group-hover:scale-125" />
                                                    Simón Sandrea Rojas
                                                </div>
                                                <div className={cn(
                                                    "flex items-center gap-3 text-xs md:text-sm font-bold transition-colors cursor-crosshair group",
                                                    highContrast ? "text-white/80 hover:text-white" : "text-foreground/70 hover:text-foreground"
                                                )}>
                                                    <div className="w-2.5 h-2.5 rounded-full bg-color-surgical-blue shadow-[0_0_8px_rgba(0,127,255,0.5)] transition-transform group-hover:scale-125" />
                                                    C3nootics
                                                </div>
                                            </div>
                                        </section>
                                    </motion.div>
                                </div>

                                {/* RIGHT SIDE: OFFICE PANEL */}
                                <motion.div
                                    initial={{ opacity: 0, x: 60 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                                    className="pointer-events-auto flex flex-col items-end gap-12 mt-4"
                                >
                                    <OfficePanel />

                                    <button
                                        className="px-8 py-3 rounded-full bg-white/20 backdrop-blur-md border border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/40 transition-all duration-300 self-end"
                                    >
                                        DILO
                                    </button>
                                </motion.div>

                            </div>
                        </div>

                    </div>
                )}
            </AnimatePresence>

        </main>
    );
}
