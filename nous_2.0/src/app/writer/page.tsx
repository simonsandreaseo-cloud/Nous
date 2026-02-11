"use client";

import WriterApp from '@/components/tools/writer/WriterApp';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, Suspense } from 'react';

export default function WriterPage() {
    const setMode = useAppStore((state) => state.setMode);

    useEffect(() => {
        setMode('writer');
    }, [setMode]);

    return (
        <main className="min-h-screen bg-slate-50 relative overflow-hidden">
            {/* Background elements if needed - Glassmorphism vibes */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-transparent" />

            <div className="relative z-10 h-full w-full">
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-600">Cargando Redactor...</div>}>
                    <WriterApp />
                </Suspense>
            </div>
        </main>
    );
}
