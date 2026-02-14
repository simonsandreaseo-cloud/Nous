"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const handleAuthCallback = async () => {
            const { error } = await supabase.auth.getSession();
            if (!error) {
                // Get redirect path from URL params
                const next = searchParams.get('next') || searchParams.get('redirect_to') || '/';
                router.push(next);
            } else {
                console.error("Auth error:", error);
                router.push("/auth");
            }
        };

        handleAuthCallback();
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA]">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
            <p className="text-sm font-mono font-bold text-slate-500 tracking-[0.2em] uppercase">Sincronizando Identidad...</p>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F7FA]">
                <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
                <p className="text-sm font-mono font-bold text-slate-500 tracking-[0.2em] uppercase">Cargando...</p>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
