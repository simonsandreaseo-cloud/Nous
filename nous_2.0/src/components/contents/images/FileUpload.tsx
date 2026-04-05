"use client";

import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X } from 'lucide-react';

interface FileUploadProps {
    label: string;
    accept: string;
    onFileSelect: (file: File) => void;
    selectedFile: File | null;
    onClear: () => void;
    icon?: 'doc' | 'image';
}

export const FileUpload: React.FC<FileUploadProps> = ({
    label,
    accept,
    onFileSelect,
    selectedFile,
    onClear,
    icon = 'doc'
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <div className="w-full">
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileChange}
                accept={accept}
                className="hidden"
            />

            {!selectedFile ? (
                <div
                    onClick={handleClick}
                    className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 h-32 group"
                >
                    <div className="p-3 bg-white rounded-full shadow-sm text-slate-400 group-hover:text-emerald-500 transition-colors">
                        <Upload size={20} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">{label}</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Clic para explorar</p>
                    </div>
                </div>
            ) : (
                <div className="border border-slate-200 bg-white/50 backdrop-blur-sm rounded-lg p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2.5 rounded-md ${icon === 'doc' ? 'bg-blue-100/50 text-blue-600' : 'bg-emerald-100/50 text-emerald-600'}`}>
                            {icon === 'doc' ? <FileText size={20} /> : <ImageIcon size={20} />}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{selectedFile.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium tracking-tight">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="p-2 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-500 transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};
