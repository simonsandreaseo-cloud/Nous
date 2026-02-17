'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service if needed
        console.error("Studio Images Error:", error);
    }, [error]);

    return (
        <div className="min-h-[600px] flex items-center justify-center p-6 bg-[#FDFCFB]">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 p-10 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-500 mx-auto mb-8">
                    <AlertCircle size={40} />
                </div>

                <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic">
                    Neural Link Failure
                </h2>

                <p className="text-slate-500 font-medium leading-relaxed mb-10 text-sm">
                    A critical interruption occurred in the visual synthesis buffer. This is usually due to a missing API key or an intermittent connection to the Google Gemini nodes.
                </p>

                {error.digest && (
                    <div className="mb-8 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Error Signature (Digest)</p>
                        <code className="text-[10px] font-mono font-bold text-slate-600 block break-all">
                            {error.digest}
                        </code>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => reset()}
                        className="w-full py-4 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={14} /> Reintentar Conexión
                    </button>

                    <Link
                        href="/studio/dashboard"
                        className="w-full py-4 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Home size={14} /> Volver al Dashboard
                    </Link>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Detalles Técnicos</p>
                    <div className="text-left bg-slate-900 rounded-2xl p-4 overflow-x-auto custom-scrollbar">
                        <pre className="text-[9px] font-mono text-emerald-400 bg-slate-900">
                            {error.message || "Unknown server-side error during component render."}
                        </pre>
                        {error.stack && (
                            <pre className="text-[8px] font-mono text-slate-500 mt-2 whitespace-pre-wrap leading-tight max-h-32">
                                {error.stack}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
