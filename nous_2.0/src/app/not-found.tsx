"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
    return (
        <div className="fixed inset-0 z-[500] bg-[#F5F7FA] flex flex-col items-center justify-center p-10 font-mono">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                <h1 className="text-6xl font-black tracking-tighter text-foreground/5 mb-[-2rem]">404</h1>
                <div className="relative z-10">
                    <h2 className="text-xl font-bold tracking-[0.3em] uppercase mb-2">Path_Not_Found</h2>
                    <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-8">
                        The requested data node does not exist in this sector.
                    </p>
                    <Link
                        href="/"
                        className="px-8 py-3 border border-foreground/10 text-[10px] font-bold uppercase tracking-widest hover:bg-black/5 transition-all"
                    >
                        Return_to_Core
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
