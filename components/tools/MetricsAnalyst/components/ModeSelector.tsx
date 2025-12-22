import React from 'react';
import { motion } from 'framer-motion';

interface ModeSelectorProps {
    mode: 'csv' | 'gsc';
    onChange: (mode: 'csv' | 'gsc') => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, onChange }) => {
    return (
        <div className="flex justify-center mb-8">
            <div className="bg-slate-100 p-1 rounded-xl inline-flex relative shadow-inner">
                {/* Sliding Background */}
                <motion.div
                    className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm border border-slate-200 z-0"
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
                    className={`relative z-10 px-6 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'csv' ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    📂 Archivos CSV
                </button>
                <button
                    onClick={() => onChange('gsc')}
                    className={`relative z-10 px-6 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'gsc' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    ⚡ Conectar GSC
                </button>
            </div>
        </div>
    );
};
