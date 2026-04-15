import React, { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AddAssetPlaceholderProps {
    type: 'featured' | 'inline';
    className?: string;
    onDropUpload: (file: File, type: 'featured' | 'inline') => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'featured' | 'inline') => void;
}

export function AddAssetPlaceholder({ type, className, onDropUpload, onFileUpload }: AddAssetPlaceholderProps) {
    const [isOver, setIsOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onDropUpload(file, type);
    };

    return (
        <>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => onFileUpload(e, type)} 
                className="hidden" 
                accept="image/*"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
                onDragLeave={() => setIsOver(false)}
                onDrop={onDrop}
                className={cn(
                    "flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-all group relative overflow-hidden bg-slate-50",
                    isOver ? "bg-indigo-50 border-indigo-400 shadow-inner" : "border-slate-200 hover:bg-slate-100 hover:border-slate-300",
                    className
                )}
            >
                <Plus size={20} className={cn("transition-transform duration-300", isOver ? "text-indigo-500 scale-125" : "text-slate-400 group-hover:text-slate-600 group-hover:scale-110")} />
                <span className={cn("text-[10px] font-black uppercase tracking-[0.1em] transition-colors", isOver ? "text-indigo-500" : "text-slate-400 group-hover:text-slate-600")}>Agregar</span>
                {isOver && <div className="absolute inset-0 border-4 border-indigo-400/20 rounded-inherit animate-pulse" />}
            </button>
        </>
    );
}
