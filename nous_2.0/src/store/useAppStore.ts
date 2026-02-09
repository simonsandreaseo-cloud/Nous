"use client";

import { create } from "zustand";

interface AppState {
    activeSection: string;
    hoveredItem: string | null;
    systemStatus: "nominal" | "loading" | "analyzing" | "error";
    isLoaded: boolean;
    highContrast: boolean; // New: Accessibility
    setActiveSection: (section: string) => void;
    setHovered: (id: string | null) => void;
    setSystemStatus: (status: AppState["systemStatus"]) => void;
    setLoaded: (loaded: boolean) => void;
    toggleHighContrast: () => void; // Action for accessibility
}

export const useAppStore = create<AppState>((set) => ({
    activeSection: "home",
    hoveredItem: null,
    systemStatus: "nominal",
    isLoaded: false,
    highContrast: false,
    setActiveSection: (section) => set({ activeSection: section }),
    setHovered: (id) => set({ hoveredItem: id }),
    setSystemStatus: (status) => set({ systemStatus: status }),
    setLoaded: (loaded) => set({ isLoaded: loaded }),
    toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
}));
