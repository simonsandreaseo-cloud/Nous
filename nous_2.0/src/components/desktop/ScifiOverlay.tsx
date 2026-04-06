import React from 'react';

export function ScifiOverlay() {
    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-xl">
            {/* Scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none" />

            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_120%)]" />

            {/* Subtle Noise (Optional, can be heavy on performance) */}
            {/* <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.png')]" /> */}

            {/* Border Glow */}
            <div className="absolute inset-0 border border-white/5 rounded-xl shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]" />
        </div>
    );
}
