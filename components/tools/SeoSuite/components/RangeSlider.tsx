
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  initialStart?: number;
  initialEnd?: number;
  onChange: (values: [number, number]) => void;
  formatLabel?: (val: number) => string;
  label: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ 
    min, 
    max, 
    initialStart, 
    initialEnd, 
    onChange, 
    formatLabel, 
    label 
}) => {
    const [minVal, setMinVal] = useState(initialStart ?? min);
    const [maxVal, setMaxVal] = useState(initialEnd ?? max);
    
    // Local state for input fields to allow typing without instant jitter
    const [inputMin, setInputMin] = useState(minVal.toString());
    const [inputMax, setInputMax] = useState(maxVal.toString());

    // Refs to track drag state
    const isDraggingMin = useRef(false);
    const isDraggingMax = useRef(false);
    const trackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const s = initialStart ?? min;
        const e = initialEnd ?? max;
        setMinVal(s);
        setMaxVal(e);
        setInputMin(s.toString());
        setInputMax(e.toString());
    }, [min, max, initialStart, initialEnd]);

    const getPercent = useCallback(
        (value: number) => Math.round(((value - min) / (max - min)) * 100),
        [min, max]
    );

    const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!trackRef.current) return;
        
        const rect = trackRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const value = Math.round(min + (percent / 100) * (max - min));

        if (isDraggingMin.current) {
            const newVal = Math.min(value, maxVal - 1);
            setMinVal(newVal);
            setInputMin(newVal.toString());
        } else if (isDraggingMax.current) {
            const newVal = Math.max(value, minVal + 1);
            setMaxVal(newVal);
            setInputMax(newVal.toString());
        }
    }, [min, max, maxVal, minVal]);

    const handleMouseUp = useCallback(() => {
        if (isDraggingMin.current || isDraggingMax.current) {
            isDraggingMin.current = false;
            isDraggingMax.current = false;
            onChange([minVal, maxVal]);
            
            document.removeEventListener('mousemove', handleMouseMove as any);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMouseMove as any);
            document.removeEventListener('touchend', handleMouseUp);
        }
    }, [minVal, maxVal, onChange, handleMouseMove]);

    const startDrag = (isMin: boolean) => {
        if (isMin) isDraggingMin.current = true;
        else isDraggingMax.current = true;

        document.addEventListener('mousemove', handleMouseMove as any);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleMouseMove as any, { passive: false });
        document.addEventListener('touchend', handleMouseUp);
    };

    // Input handlers
    const handleInputChange = (isMin: boolean, value: string) => {
        // Allow empty string for typing
        if (isMin) setInputMin(value);
        else setInputMax(value);
    };

    const commitInput = (isMin: boolean) => {
        let valStr = isMin ? inputMin : inputMax;
        let val = parseFloat(valStr);
        
        if (isNaN(val)) {
            // Revert to current slider value if invalid
            if (isMin) setInputMin(minVal.toString());
            else setInputMax(maxVal.toString());
            return;
        }

        // Clamp values
        if (isMin) {
            val = Math.max(min, Math.min(val, maxVal - 1));
            setMinVal(val);
            setInputMin(val.toString());
            onChange([val, maxVal]);
        } else {
            val = Math.max(minVal + 1, Math.min(val, max));
            setMaxVal(val);
            setInputMax(val.toString());
            onChange([minVal, val]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, isMin: boolean) => {
        if (e.key === 'Enter') {
            commitInput(isMin);
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className="flex flex-col w-full min-w-[180px] max-w-[280px] select-none group">
            <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                <div className="flex gap-2 text-[11px] font-mono font-bold text-slate-600 items-center">
                    <input 
                        type="number" 
                        value={inputMin}
                        onChange={(e) => handleInputChange(true, e.target.value)}
                        onBlur={() => commitInput(true)}
                        onKeyDown={(e) => handleKeyDown(e, true)}
                        className="bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm w-16 text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                    <span className="text-slate-300">-</span>
                    <input 
                        type="number" 
                        value={inputMax}
                        onChange={(e) => handleInputChange(false, e.target.value)}
                        onBlur={() => commitInput(false)}
                        onKeyDown={(e) => handleKeyDown(e, false)}
                        className="bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm w-16 text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="relative w-full h-6 flex items-center cursor-pointer" ref={trackRef}>
                {/* Track Background */}
                <div className="absolute w-full h-[2px] bg-slate-100 rounded-full group-hover:bg-slate-200 transition-colors" />

                {/* Active Range */}
                <div 
                    className="absolute h-[2px] bg-indigo-500 rounded-full transition-all duration-75 ease-out"
                    style={{
                        left: `${getPercent(minVal)}%`,
                        width: `${getPercent(maxVal) - getPercent(minVal)}%`
                    }}
                />

                {/* Min Thumb */}
                <div
                    className="absolute w-4 h-4 bg-white border border-slate-200 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.1)] cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:scale-110 transition-transform z-10 flex items-center justify-center"
                    style={{ left: `calc(${getPercent(minVal)}% - 8px)` }}
                    onMouseDown={() => startDrag(true)}
                    onTouchStart={() => startDrag(true)}
                >
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
                </div>

                {/* Max Thumb */}
                <div
                    className="absolute w-4 h-4 bg-white border border-slate-200 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.1)] cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:scale-110 transition-transform z-10 flex items-center justify-center"
                    style={{ left: `calc(${getPercent(maxVal)}% - 8px)` }}
                    onMouseDown={() => startDrag(false)}
                    onTouchStart={() => startDrag(false)}
                >
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </div>
    );
};

export default RangeSlider;
