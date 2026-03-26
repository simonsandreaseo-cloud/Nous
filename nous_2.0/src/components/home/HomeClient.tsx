"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useState, useLayoutEffect } from "react";
import { NousOrb } from "@/components/canvas/NousOrb";
import { LoadingScreen } from "@/components/dom/LoadingScreen";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";
import { HomeHeader } from "@/components/home/HomeHeader";

const SceneLayout = dynamic(
    () => import("@/components/canvas/SceneLayout"),
    { ssr: false }
);

export default function HomeClient() {
    const isLoaded = useAppStore((state) => state.isLoaded);
    const setMode = useAppStore((state) => state.setMode);
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Desktop App Redirect
    useLayoutEffect(() => {
        if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
            setIsRedirecting(true);
            window.location.replace('/desktop-app');
        }
    }, []);

    useEffect(() => {
        setMode('home');
    }, [setMode]);

    if (isRedirecting) return null;

    return (
        <main
            id="main-content"
            className="relative w-full h-screen overflow-hidden bg-[url('/Fondo_Nous.webp')] bg-cover bg-center bg-no-repeat selection:bg-blue-100"
        >

            <LoadingScreen />

            {/* WEBGL LAYER - Orb positioned on the right */}
            <motion.div
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoaded ? 1 : 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute inset-0 z-10 pointer-events-none"
            >
                <Suspense fallback={null}>
                    <SceneLayout>
                        {/* Adjusted orb slightly to the right, slightly higher, and smaller */}
                        <group position={[5.2, -0.6, -3]} scale={1.55}>
                            <NousOrb />
                        </group>
                    </SceneLayout>
                </Suspense>
            </motion.div>

            {/* UI OVERLAY LAYER */}
            <AnimatePresence>
                {isLoaded && (
                    <div className="relative z-20 h-full w-full flex flex-col pointer-events-none">
                        
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.5 }}
                        >
                            <HomeHeader />
                        </motion.div>

                        {/* MAIN CONTENT LAYER */}
                        <div className="relative flex flex-col h-full w-full px-8 md:px-16 lg:px-24 z-30 justify-center">
                            
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1.2, delay: 0.6 }}
                                className="pointer-events-auto flex flex-col items-start max-w-2xl mt-12"
                            >
                                <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.05] font-medium text-[#111] tracking-tight mb-12">
                                    Ecosistema<br />
                                    SEO Inteligente
                                </h1>
                                
                                <Link
                                    href="/auth"
                                    className="relative overflow-hidden group px-10 py-4 rounded-full bg-gradient-to-r from-[#62cff4] to-[#3b82f6] text-white text-lg font-bold tracking-wide shadow-[0_8px_25px_-8px_rgba(59,130,246,0.5)] hover:shadow-[0_8px_30px_-5px_rgba(59,130,246,0.6)] hover:-translate-y-0.5 transition-all duration-300"
                                >
                                    <span className="relative z-10">EMPEZAR</span>
                                    {/* Hover shine effect */}
                                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                                </Link>

                            </motion.div>

                        </div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}
