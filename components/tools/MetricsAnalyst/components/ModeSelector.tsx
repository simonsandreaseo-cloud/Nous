import React from 'react';
import { motion } from 'framer-motion';

interface ModeSelectorProps {
    mode: 'csv' | 'gsc';
    onChange: (mode: 'csv' | 'gsc') => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, onChange }) => {
    return (
        <div className="flex justify-center mb-8">
            <div className="bg-brand-power/5 p-1 rounded-xl inline-flex relative shadow-inner">
                {/* Sliding Background */}
                <motion.div
                    className="absolute top-1 bottom-1 bg-brand-white rounded-lg shadow-sm border border-brand-power/5 z-0"
                    initial={false}
                    animate={{
                        left: mode === 'csv' ? '4px' : '50%',
                        width: 'calc(50% - 4px)',
                        x: mode === 'csv' ? 0 : 0
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />

                <button
                    onClick={() => onChange('csv')}
                    className={`relative z-10 px-6 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'csv' ? 'text-brand-power' : 'text-brand-power/50 hover:text-brand-power/70'}`}
                >
                    📂 Archivos CSV
                </button>
                <button
                    onClick={() => onChange('gsc')}
                    className={`relative z-10 px-6 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'gsc' ? 'text-brand-power' : 'text-brand-power/50 hover:text-brand-power/70'}`}
                >
                    ⚡ Conectar Google (GSC + GA4)
                </button>
            </div>
        </div>
    );
};
