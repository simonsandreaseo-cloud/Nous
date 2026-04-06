"use client";
import { create } from "zustand";

interface DesktopState {
    isWebConnected: boolean;
    lastToken: string | null;
    setWebConnected: (connected: boolean, token?: string) => void;
}

export const useDesktopStore = create<DesktopState>((set) => ({
    isWebConnected: false,
    lastToken: null,
    setWebConnected: (connected, token) => set({
        isWebConnected: connected,
        lastToken: token || null
    }),
}));
