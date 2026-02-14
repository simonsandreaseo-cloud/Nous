"use client";

import WriterStudio from '@/app/studio/writer/WriterStudio';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, Suspense } from 'react';

export default function WriterPage() {
    const setMode = useAppStore((state) => state.setMode);

    useEffect(() => {
        setMode('writer');
    }, [setMode]);

    return (
        <main className="min-h-screen bg-slate-50 relative overflow-hidden">
            {/* Subtle background for studio feel */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white" />

            <div className="relative z-10 h-full w-full">
                <Suspense fallback={<div className="flex items-center justify-center min-h-[500px] text-slate-400">Iniciando Studio...</div>}>
                    <WriterStudio />
                </Suspense>
            </div>
        </main>
    );
}
