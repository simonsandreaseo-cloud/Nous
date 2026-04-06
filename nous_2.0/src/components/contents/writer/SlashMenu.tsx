'use client';

import {
    Heading1, Heading2, Heading3,
    List, ListOrdered, Quote,
    Image as ImageIcon, Sparkles,
    Code
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/utils/cn';

interface SlashMenuProps {
    position: { x: number; y: number } | null;
    onSelect: (command: string) => void;
    onClose: () => void;
}

export default function SlashMenu({ position, onSelect, onClose }: SlashMenuProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const commands = [
        { id: 'h1', label: 'Título 1', icon: Heading1, desc: 'Encabezado principal' },
        { id: 'h2', label: 'Título 2', icon: Heading2, desc: 'Sección importante' },
        { id: 'h3', label: 'Título 3', icon: Heading3, desc: 'Subsección' },
        { id: 'bullet', label: 'Lista', icon: List, desc: 'Lista con viñetas' },
        { id: 'ordered', label: 'Lista Numerada', icon: ListOrdered, desc: 'Secuencia ordenada' },
        { id: 'quote', label: 'Cita', icon: Quote, desc: 'Cita destacada' },
        { id: 'divider', label: 'Separador', icon: null, desc: '' }, // Logic separator
        { id: 'ai-nous', label: 'Agente Nous', icon: Sparkles, desc: '/nous [instrucción]', highlight: true },
        { id: 'ai-write', label: 'Continuar con IA', icon: Sparkles, desc: 'Autocompletar texto', highlight: true },
        { id: 'image', label: 'Imagen IA', icon: ImageIcon, desc: 'Generar imagen' },
    ];

    const filterCommands = commands.filter(c => c.id !== 'divider');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!position) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filterCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filterCommands.length) % filterCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onSelect(filterCommands[selectedIndex].id);
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [position, selectedIndex, onSelect, onClose, filterCommands]);

    if (!position) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-50 w-72 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: position.y + 24,
                left: position.x
            }}
        >
            <div className="bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Comandos Básicos
            </div>

            <div className="py-1 overflow-y-auto max-h-[300px]">
                {filterCommands.map((cmd, idx) => (
                    <button
                        key={cmd.id}
                        onClick={() => onSelect(cmd.id)}
                        className={cn(
                            "w-full text-left px-3 py-2 flex items-center gap-3 transition-colors",
                            idx === selectedIndex ? "bg-blue-50" : "hover:bg-slate-50"
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded border flex items-center justify-center bg-white shadow-sm",
                            cmd.highlight ? "border-blue-200 text-blue-600" : "border-slate-200 text-slate-500"
                        )}>
                            {cmd.icon && <cmd.icon size={16} />}
                        </div>
                        <div>
                            <div className={cn("text-sm font-medium", cmd.highlight ? "text-blue-700" : "text-slate-700")}>
                                {cmd.label}
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {cmd.desc}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
