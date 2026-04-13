"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

function GscCompleteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const completeConnection = async () => {
            const at = searchParams.get("at");
            const rt = searchParams.get("rt");
            const ex = searchParams.get("ex");

            if (!at && !rt) {
                setStatus("error");
                setErrorMsg("No se recibieron tokens de Google.");
                return;
            }

            try {
                // Get session from CLIENT (where it is active)
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    setStatus("error");
                    setErrorMsg("No hay una sesión activa. Por favor, inicia sesión de nuevo.");
                    return;
                }

                const userId = session.user.id;
                const email = searchParams.get("email");

                // 1. Save Token and connection status at USER LEVEL first
                console.log("[DEBUG] Upserting user connections for ID:", userId, "Email:", email);
                const { error: tokenError } = await supabase.from("user_google_connections").upsert({
                    user_id: userId,
                    email: email,
                    access_token: at,
                    refresh_token: rt,
                    expires_at: ex ? new Date(parseInt(ex)).toISOString() : null,
                    updated_at: new Date().toISOString(),
                    scopes: searchParams.get("scopes")?.split(' ') || []
                }, { onConflict: 'user_id, email' });

                if (tokenError) {
                    console.error("[DEBUG] CRITICAL: user_google_connections upsert failed:", tokenError);
                    setStatus("error");
                    setErrorMsg(`Error al guardar conexión: ${tokenError.message}`);
                    return;
                }

                // Marks success since the connection is now in the database
                setStatus("success");
                setTimeout(() => router.push("/settings/agency/connections?google=connected"), 1500);

            } catch (err: any) {

                console.error(err);
                setStatus("error");
                setErrorMsg(err.message || "Error al guardar la conexión.");
            }
        };

        completeConnection();
    }, [searchParams, router]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 rounded-[32px] shadow-xl max-w-md w-full text-center border border-slate-100"
        >
            {status === "loading" && (
                <div className="space-y-6">
                    <Loader2 className="w-16 h-16 animate-spin text-cyan-500 mx-auto" />
                    <h1 className="text-2xl font-black text-slate-900 uppercase italic">Sincronizando...</h1>
                    <p className="text-slate-500 text-sm font-medium">Finalizando la conexión segura con Google Search Console.</p>
                </div>
            )}

            {status === "success" && (
                <div className="space-y-6">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                    <h1 className="text-2xl font-black text-slate-900 uppercase italic">¡Conectado!</h1>
                    <p className="text-slate-500 text-sm font-medium">Redirigiendo a configuración...</p>
                </div>
            )}

            {status === "error" && (
                <div className="space-y-6">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                    <h1 className="text-2xl font-black text-slate-900 uppercase italic">Error</h1>
                    <p className="text-red-500 text-sm font-bold uppercase tracking-tight">{errorMsg}</p>
                    <button
                        onClick={() => router.push("/settings")}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                    >
                        Volver a Ajustes
                    </button>
                </div>
            )}
        </motion.div>
    );
}

export default function GscCompletePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
            <Suspense fallback={
                <div className="bg-white p-12 rounded-[32px] shadow-xl max-w-md w-full text-center border border-slate-100">
                    <Loader2 className="w-16 h-16 animate-spin text-cyan-500 mx-auto mb-6" />
                    <h1 className="text-2xl font-black text-slate-900 uppercase italic">Cargando...</h1>
                </div>
            }>
                <GscCompleteContent />
            </Suspense>
        </div>
    );
}
