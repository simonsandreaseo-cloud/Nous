"use client";

import { create } from "zustand";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";

interface AuthState {
    user: User | null;
    loading: boolean;
    initialized: boolean;
    setUser: (user: User | null) => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    initialized: false,
    setUser: (user) => set({ user, loading: false, initialized: true }),
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null });
    },
}));
