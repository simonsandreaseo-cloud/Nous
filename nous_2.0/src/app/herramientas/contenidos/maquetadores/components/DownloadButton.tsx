"use client";

import { motion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface DownloadButtonProps {
    variant?: "primary" | "secondary";
}

export default function DownloadButton({ variant = "primary" }: DownloadButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = () => {
        setIsDownloading(true);
        // Simulate download
        setTimeout(() => {
            const link = document.createElement("a");
            link.href = "/plugins/nous-bridge.zip"; // Assuming this is where it's stored
            link.download = "nous-bridge.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsDownloading(false);
        }, 1500);
    };

    if (variant === "secondary") {
        return (
            <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="group px-8 py-4 rounded-2xl bg-[var(--color-nous-mint)]/10 text-slate-800 border border-[var(--color-nous-mint)]/20 font-medium uppercase tracking-elegant text-[10px] flex items-center justify-center gap-3 hover:bg-[var(--color-nous-mint)]/20 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 transition-transform group-hover:-translate-y-1" />}
                Descargar Plugin
            </button>
        );
    }

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="group px-8 py-4 rounded-2xl bg-[var(--color-nous-mist)]/20 text-slate-800 border border-[var(--color-nous-mist)]/30 font-medium uppercase tracking-elegant text-[10px] flex items-center justify-center gap-3 hover:bg-[var(--color-nous-mist)]/30 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 transition-transform group-hover:-translate-y-1" />}
            Descargar Plugin
        </button>
    );
}
