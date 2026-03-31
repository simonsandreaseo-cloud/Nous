"use client";

import { create } from "zustand";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
    user: User | null;
    loading: boolean;
    initialized: boolean;
    setUser: (user: User | null) => void;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    initialized: false,
    setUser: (user) => set({ user, loading: false, initialized: true }),
    signInWithGoogle: async () => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const redirectTo = `${origin}/auth/callback`;
        
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { 
                redirectTo,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });
    },
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null });
    },
    initialize: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            set({ user: session?.user ?? null, loading: false, initialized: true });
        });
        return () => subscription.unsubscribe();
    },
}));
