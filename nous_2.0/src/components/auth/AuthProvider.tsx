"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUser = useAuthStore((state) => state.setUser);

    useEffect(() => {
        // Safety check: ensure supabase.auth exists before calling methods
        // This prevents crashes if env vars are missing during build/init
        if (!supabase || !supabase.auth) {
            console.warn("Supabase auth is not initialized. Check your environment variables.");
            return;
        }

        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const user = session?.user ?? null;
            setUser(user);
            if (user) {
                // Proactively fetch projects for the user
                import('@/store/useProjectStore').then(mod => {
                    mod.useProjectStore.getState().fetchProjects();
                });
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const user = session?.user ?? null;
            setUser(user);
            if (user) {
                import('@/store/useProjectStore').then(mod => {
                    mod.useProjectStore.getState().fetchProjects();
                });
            }
        });

        return () => subscription.unsubscribe();
    }, [setUser]);

    return <>{children}</>;
}
