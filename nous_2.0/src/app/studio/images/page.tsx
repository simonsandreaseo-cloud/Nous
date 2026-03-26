"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ImagesPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirigir al dashboard ya que las opciones de generación de imágenes no están incluidas de momento
        router.push('/contents');
    }, [router]);

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-slate-300 mb-4" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Redirigiendo...</p>
        </div>
    );
}
