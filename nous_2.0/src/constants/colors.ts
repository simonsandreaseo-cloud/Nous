export const NOUS_PALETTE = [
    "#06b6d4", "#0891b2", "#0e7490", // Cyans
    "#14b8a6", "#0d9488", "#0f766e", // Teals
    "#10b981", "#059669", "#047857", // Emeralds
    "#22c55e", "#16a34a", "#15803d", // Greens
    "#84cc16", "#65a30d",             // Limes
    "#eab308", "#ca8a04",             // Yellows
    "#f59e0b", "#d97706",             // Ambers
    "#f97316", "#ea580c",             // Oranges
    "#ef4444", "#dc2626",             // Reds
    "#f43f5e", "#e11d48",             // Roses
    "#ec4899", "#db2777",             // Pinks
    "#d946ef", "#c026d3",             // Fuchsias
    "#a855f7", "#9333ea",             // Purples
    "#8b5cf6", "#7c3aed",             // Violets
    "#6366f1", "#4f46e5",             // Indigos
    "#3b82f6", "#2563eb",             // Blues
    "#64748b", "#475569",             // Slates
];

export const getRandomNousColor = () => {
    return NOUS_PALETTE[Math.floor(Math.random() * NOUS_PALETTE.length)];
};
