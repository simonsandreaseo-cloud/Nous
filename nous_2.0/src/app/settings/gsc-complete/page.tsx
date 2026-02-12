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
                console.log("[DEBUG] Session detected in GSC Complete:", session ? "YES" : "NO");
                console.log("[DEBUG] User ID:", session?.user?.id);

                if (!session?.user) {
                    console.error("[DEBUG] No user session found");
                    setStatus("error");
                    setErrorMsg("No hay una sesión activa. Por favor, inicia sesión de nuevo.");
                    return;
                }

                const userId = session.user.id;
                const updates: any = {
                    gsc_connected: true,
                    gsc_expiration: ex ? parseInt(ex) : null,
                    gsc_access_token: at,
                    google_refresh_token: rt,
                };

                console.log("[DEBUG] Updates to apply:", updates);

                // Update projects for this user
                const { error: updateError, data: updatedData } = await supabase
                    .from("projects")
                    .update(updates)
                    .eq("user_id", userId)
                    .select('id');

                const count = updatedData ? updatedData.length : 0; // Select allows us to see affected rows

                console.log("[DEBUG] Projects update error:", updateError);
                console.log("[DEBUG] Projects affected:", count);

                if (updateError) throw updateError;

                // If no projects were updated, maybe the user has no projects?
                // Or maybe RLS blocked it?
                if (count === 0) {
                    console.warn("[DEBUG] No projects were updated! Possible RLS issue or no projects for this user ID.");
                }

                // Also upsert centralized tokens
                const { error: upsertError } = await supabase.from("user_gsc_tokens").upsert({
                    user_id: userId,
                    access_token: at,
                    refresh_token: rt,
                    expires_at: ex ? new Date(parseInt(ex)).toISOString() : null,
                    updated_at: new Date().toISOString()
                });

                console.log("[DEBUG] Token upsert error:", upsertError);

                setStatus("success");
                setTimeout(() => router.push("/settings?gsc=connected"), 2000);
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
