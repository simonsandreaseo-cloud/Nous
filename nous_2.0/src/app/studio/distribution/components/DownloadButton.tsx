"use client";

import { Download } from "lucide-react";

interface DownloadButtonProps {
    variant?: "primary" | "secondary";
}

export default function DownloadButton({ variant = "primary" }: DownloadButtonProps) {
    const isPrimary = variant === "primary";

    return (
        <button
            className={`
                px-8 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all duration-300
                ${isPrimary
                    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-500/20 hover:scale-105"
                    : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"}
            `}
            onClick={() => alert("Próximamente disponible para descarga.")}
        >
            <Download className="w-5 h-5" />
            {isPrimary ? "Descargar Plugin" : "Descarga Alternativa"}
        </button>
    );
}
