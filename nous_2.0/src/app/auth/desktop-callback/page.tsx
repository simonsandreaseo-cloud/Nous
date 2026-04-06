"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackContent() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            setStatus('Opening Nous Engine...');
            // Redirect to custom protocol
            window.location.href = `nous://auth-callback?token=${token}`;

            // Fallback message
            setTimeout(() => {
                setStatus('If nothing happens, ensure Nous Desktop is installed.');
            }, 3000);
        } else {
            setStatus('Error: No authentication token found.');
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white font-sans p-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 mb-6 animate-pulse" />
            <h1 className="text-2xl font-bold font-michroma mb-2">Connecting to Engine</h1>
            <p className="text-white/50 font-mono text-sm">{status}</p>
        </div>
    );
}

export default function DesktopCallbackPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Auth...</div>}>
            <CallbackContent />
        </Suspense>
    );
}
