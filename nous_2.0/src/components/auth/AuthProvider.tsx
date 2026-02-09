"use client";

import { useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUser = useAuthStore((state) => state.setUser);

    useEffect(() => {
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [setUser]);

    return <>{children}</>;
}
