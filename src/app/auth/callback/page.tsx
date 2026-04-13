"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const setUser = useAuthStore((state) => state.setUser);
    const [debugInfo, setDebugInfo] = useState<string>("Iniciando protocolo de sincronización...");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        console.log("[AUTH-DEBUG] AuthCallback iniciada. URL detectada:", window.location.href);
        setDebugInfo("Buscando sesión activa...");

        // 1. Initial check
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            console.log("[AUTH-DEBUG] Respuesta inicial de getSession:", { 
                hasSession: !!session, 
                error: error?.message 
            });
            
            if (session) {
                setDebugInfo("Sesión detectada. Sincronizando perfil...");
                setUser(session.user);
                const next = searchParams.get('next') || searchParams.get('redirect_to') || '/';
                router.push(next);
            } else {
                setDebugInfo("Esperando respuesta del proveedor de identidad (OAuth fragment)...");
            }
        });

        // 2. Listen for the SIGNED_IN event
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("[AUTH-DEBUG] Evento de Auth detectado:", event, { 
                hasSession: !!session 
            });
            
            setDebugInfo(`Protocolo: ${event}...`);

            if (event === 'SIGNED_IN' && session) {
                setDebugInfo("¡Identidad confirmada! Redirigiendo...");
                setUser(session.user);
                const next = searchParams.get('next') || searchParams.get('redirect_to') || '/';
                setTimeout(() => router.push(next), 500);
            } else if (event === 'INITIAL_SESSION' && session) {
                setDebugInfo("Sesión inicial establecida. Redirigiendo...");
                setUser(session.user);
                router.push('/');
            }
        });

        // Safety timeout
        const timeout = setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!session) {
                    const msg = "Tiempo de espera agotado: No se detectó ninguna sesión activa.";
                    console.error("[AUTH-DEBUG] " + msg);
                    setErrorMsg(msg);
                    setDebugInfo("Fallo en la sincronización neural.");
                    
                    // Solo redirigimos con error después de un tiempo para que el usuario pueda ver el log
                    setTimeout(() => {
                        router.push("/auth?error=no_session_detected");
                    }, 3000);
                }
            });
        }, 12000); // Aumentamos a 12s para dar margen a conexiones lentas

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        }
    }, [router, searchParams, setUser]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA]">
            <div className="p-10 bg-white rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col items-center gap-8 border border-white max-w-[400px] w-full mx-4">
                <div className="relative">
                    <Loader2 className="w-16 h-16 animate-spin text-cyan-500" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-cyan-400 blur-2xl opacity-20 animate-pulse" />
                </div>
                
                <div className="text-center space-y-4">
                    <p className="text-xs font-mono font-bold text-slate-800 tracking-[0.3em] uppercase leading-relaxed">
                        {debugInfo}
                    </p>
                    {errorMsg ? (
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest bg-red-50 p-3 rounded-xl border border-red-100 animate-bounce">
                           Error: {errorMsg}
                        </p>
                    ) : (
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em] animate-pulse">
                           Estabilizando conexión neural con Supabase...
                        </p>
                    )}
                </div>
                
                <div className="w-full flex justify-center gap-1.5 grayscale opacity-30">
                     <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                     <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                </div>
            </div>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA]">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
                <p className="text-sm font-mono font-bold text-slate-500 tracking-[0.2em] uppercase">Iniciando Protocolo...</p>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
