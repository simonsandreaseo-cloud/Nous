"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // 16.3.2 Log the error to an error reporting service
        console.error("DEPLOYMENT_INTERFACE_EXCEPTION:", error);
    }, [error]);

    return (
        <div className="fixed inset-0 z-[500] bg-[#F5F7FA] flex flex-col items-center justify-center p-10 font-mono">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                </div>
                <h1 className="text-xl font-bold tracking-[0.3em] uppercase mb-2">Interface_Exception</h1>
                <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-8 max-w-xs mx-auto">
                    An unexpected error occured during neural link stabilization.
                </p>
                <button
                    onClick={() => reset()}
                    className="px-8 py-3 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                    Attempt_Restart
                </button>
            </motion.div>
        </div>
    );
}
