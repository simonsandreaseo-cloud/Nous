import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface MovementCardProps {
    title: string;
    current: number;
    previous: number;
    isInverse?: boolean; // For Position (lower is better)
    format?: 'number' | 'percent';
}

const MovementCard: React.FC<MovementCardProps> = ({ title, current, previous, isInverse = false, format = 'number' }) => {
    const diff = current - previous;
    const percentChange = previous !== 0 ? (diff / previous) * 100 : 0;

    // Determine sentiment
    // Normal: Increase = Good (Green), Decrease = Bad (Red)
    // Inverse: Decrease = Good (Green), Increase = Bad (Red)
    let isPositive = diff > 0;
    if (isInverse) isPositive = !isPositive;

    // Neutral
    if (diff === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl border border-brand-power/5 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold uppercase text-brand-power/40 tracking-wider text-center">{title}</span>
                <div className="text-3xl font-black text-brand-power text-center my-2">
                    {format === 'percent' ? `${current.toFixed(2)}%` : current.toLocaleString()}
                </div>
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-gray-400 bg-gray-50 py-1 px-2 rounded-lg mx-auto">
                    <Minus size={12} /> Sin cambios
                </div>
            </div>
        );
    }

    // Determine colors
    // Good = Green, Bad = Red
    // Logic: 
    // If Normal: diff > 0 (Up) -> Good. diff < 0 (Down) -> Bad.
    // If Inverse: diff > 0 (Up) -> Bad. diff < 0 (Down) -> Good.

    const isGood = isInverse ? diff < 0 : diff > 0;
    const colorClass = isGood ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50';
    const Icon = diff > 0 ? ArrowUp : ArrowDown;

    return (
        <div className="bg-white p-6 rounded-2xl border border-brand-power/5 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase text-brand-power/40 tracking-wider text-center">{title}</span>
            <div className="text-3xl font-black text-brand-power text-center my-2">
                {format === 'percent' ? `${current.toFixed(2)}%` : current.toLocaleString()}
            </div>
            <div className={`flex items-center justify-center gap-1 text-xs font-bold ${colorClass} py-1 px-2 rounded-lg mx-auto`}>
                <Icon size={12} />
                <span>{Math.abs(diff).toFixed(format === 'percent' ? 2 : 0)}</span>
                <span className="opacity-70">({Math.abs(percentChange).toFixed(1)}%)</span>
            </div>
        </div>
    );
};

export default MovementCard;
