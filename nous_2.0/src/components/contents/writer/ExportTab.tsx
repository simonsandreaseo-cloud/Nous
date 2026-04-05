'use client';

import { 
    FileText, Save, Share2, ExternalLink, Globe, FileKey, 
    MonitorSmartphone, Download, Copy, Trash2
} from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { SectionLabel } from './SidebarCommon';
import React from 'react';

export function ExportTab({ 
    onExportWP, 
    onSaveCloud 
}: { 
    onExportWP: () => void; 
    onSaveCloud: () => void;
}) {
    const store = useWriterStore();

    return (
        <div className="space-y-6 pt-2 h-full pr-2 custom-scrollbar pb-32">
            {/* Direct Export Card */}
            <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-lg text-white space-y-4 shadow-xl shadow-indigo-200 group overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform">
                    <Globe size={120} />
                </div>
                
                <div className="flex items-center justify-between relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80">Publicación Directa</h4>
                    <Globe size={14} className="opacity-80 animate-pulse" />
                </div>
                
                <div className="space-y-3 relative z-10 pt-2">
                    <button
                        onClick={onExportWP}
                        className="w-full py-3.5 bg-white text-indigo-900 rounded-lg text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20"
                    >
                        Exportar a WordPress
                    </button>
                    <button
                        disabled
                        className="w-full py-3.5 bg-white/10 text-white/90 rounded-lg text-[11px] font-black uppercase tracking-widest opacity-50 cursor-not-allowed border border-white/10"
                    >
                        Exportar a Shopify
                    </button>
                </div>
                
                <p className="text-[9px] font-medium text-white/50 text-center relative z-10 pt-1 leading-snug">
                    Se publicará como <strong>Borrador</strong> en tu sitio vinculado.
                </p>
            </div>

            {/* Storage Card */}
            <div className="p-5 bg-white border border-slate-100 rounded-lg shadow-xl shadow-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                    <SectionLabel>Almacenamiento & Respaldo</SectionLabel>
                    <Save size={12} className="text-slate-400" />
                </div>
                
                <div className="space-y-3 pt-1">
                    <button
                        onClick={onSaveCloud}
                        className="group flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-black rounded-lg transition-all hover:scale-[1.02] active:scale-95 border border-slate-100/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center shadow-sm">
                                <Save size={16} className="text-indigo-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-white">Guardar en Cloud</p>
                                <p className="text-[9px] font-bold text-slate-400 group-hover:text-indigo-200">Supabase DB Sync</p>
                            </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-white" />
                    </button>

                    <button className="group flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-black rounded-lg transition-all hover:scale-[1.02] active:scale-95 border border-slate-100/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center shadow-sm">
                                <Download size={16} className="text-amber-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-white">Descargar HTML</p>
                                <p className="text-[9px] font-bold text-slate-400 group-hover:text-amber-200">Archivo Estático</p>
                            </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-white" />
                    </button>
                    
                    <button className="group flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-black rounded-lg transition-all hover:scale-[1.02] active:scale-95 border border-slate-100/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center shadow-sm">
                                <Copy size={16} className="text-emerald-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 group-hover:text-white">Copiar al Portapapeles</p>
                                <p className="text-[9px] font-bold text-slate-400 group-hover:text-emerald-200">Rich Content Copy</p>
                            </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}

import { ChevronRight } from 'lucide-react';
