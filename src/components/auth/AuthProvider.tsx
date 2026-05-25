"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const setUser = useAuthStore((state) => state.setUser);

    useEffect(() => {
        // Safety check: ensure supabase auth exists
        if (!supabase || !supabase.auth) {
            console.warn("Supabase auth is not initialized. Check your environment variables.");
            return;
        }

        let isFetching = false;

        const triggerFetch = () => {
            if (isFetching) return;
            isFetching = true;
            import('@/store/useProjectStore').then(mod => {
                mod.useProjectStore.getState().fetchTeams();
                setTimeout(() => { isFetching = false; }, 1000); // Debounce initial fetch
            });
        };

        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const user = session?.user ?? null;
            setUser(user);
            if (user) triggerFetch();
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const user = session?.user ?? null;
            setUser(user);
            // Only trigger on SIGNED_IN or INITIAL_SESSION to avoid redundant calls
            if (user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
                triggerFetch();
            }
        });

        return () => subscription.unsubscribe();
    }, [setUser]);

    return <>{children}</>;
}
