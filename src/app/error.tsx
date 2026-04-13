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
                <div className="w-20 h-20 bg-indigo-500/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/10">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-3">Algo no salió como esperábamos</h1>
                <p className="text-sm text-slate-500 mb-10 max-w-sm mx-auto leading-relaxed">
                    Hemos detectado una interrupción en el proceso. No te preocupes, tus datos están a salvo. Reiniciemos la interfaz para continuar.
                </p>
                <button
                    onClick={() => reset()}
                    className="px-10 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200"
                >
                    Reiniciar Sistema
                </button>
            </motion.div>
        </div>
    );
}
