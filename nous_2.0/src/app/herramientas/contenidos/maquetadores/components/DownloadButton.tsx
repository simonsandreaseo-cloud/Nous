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
                className="group px-8 py-4 rounded-2xl bg-cyan-500 text-[#0A0E1A] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-cyan-400 transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 transition-transform group-hover:-translate-y-1" />}
                Descargar Plugin
            </button>
        );
    }

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="group px-8 py-4 rounded-2xl bg-white text-slate-900 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-cyan-500 hover:text-[#0A0E1A] transition-all duration-300 shadow-xl hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 transition-transform group-hover:-translate-y-1" />}
            Descargar Plugin
        </button>
    );
}
