"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Globe, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { AVAILABLE_LANGUAGES } from "@/constants/languages";

interface LanguageDropdownSelectorProps {
    selectedCodes: string[];
    onChange: (codes: string[]) => void;
    multiSelect?: boolean;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function LanguageDropdownSelector({
    selectedCodes,
    onChange,
    multiSelect = true,
    label,
    placeholder = "Seleccionar idioma...",
    disabled = false,
    className
}: LanguageDropdownSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter languages based on search
    const filteredLanguages = AVAILABLE_LANGUAGES.filter(lang => 
        lang.nameEs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleLanguage = (code: string) => {
        if (multiSelect) {
            const newSelection = selectedCodes.includes(code)
                ? selectedCodes.filter(c => c !== code)
                : [...selectedCodes, code];
            onChange(newSelection);
        } else {
            onChange([code]);
            setIsOpen(false);
        }
    };

    const selectedLanguages = AVAILABLE_LANGUAGES.filter(lang => selectedCodes.includes(lang.code));

    return (
        <div ref={containerRef} className={cn("relative w-full", className)}>
            {label && (
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    {label}
                </label>
            )}

            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3 bg-white border rounded-2xl transition-all text-left",
                    isOpen ? "border-indigo-400 ring-4 ring-indigo-50" : "border-slate-100 hover:border-slate-200 shadow-sm",
                    disabled && "opacity-50 cursor-not-allowed bg-slate-50"
                )}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-5 h-5 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                        <Globe size={14} />
                    </div>
                    {selectedLanguages.length > 0 ? (
                        <div className="flex items-center gap-1 overflow-hidden">
                            {selectedLanguages.map((lang, idx) => (
                                <span key={lang.code} className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                                    {lang.flag} {lang.code.toUpperCase()}{idx < selectedLanguages.length - 1 && ","}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">{placeholder}</span>
                    )}
                </div>
                <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[200] top-full left-0 right-0 bg-white border border-slate-200 rounded-[28px] shadow-2xl overflow-hidden mt-2 p-3"
                    >
                        {/* Search Input */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Buscar idioma..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold uppercase tracking-widest focus:bg-white focus:border-indigo-200 outline-none transition-all"
                            />
                        </div>

                        {/* List */}
                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-1">
                            {filteredLanguages.map((lang) => {
                                const isSelected = selectedCodes.includes(lang.code);
                                return (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => toggleLanguage(lang.code)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-xl transition-all group",
                                            isSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl group-hover:scale-110 transition-transform">{lang.flag}</span>
                                            <div className="flex flex-col items-start">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black uppercase tracking-tighter italic">{lang.code}</span>
                                                    <span className="text-[10px] font-bold opacity-40">|</span>
                                                    <span className="text-[11px] font-bold uppercase tracking-tight">{lang.nameEs}</span>
                                                </div>
                                                <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{lang.nameEn}</span>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
                                                <Check size={14} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                            {filteredLanguages.length === 0 && (
                                <div className="py-8 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron idiomas</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
