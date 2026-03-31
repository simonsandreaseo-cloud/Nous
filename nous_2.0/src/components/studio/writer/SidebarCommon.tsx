'use client';

import { Loader2, Sparkles } from 'lucide-react';
import React from 'react';

export function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {children}
        </p>
    );
}

export function StatusBadge({ 
    message, 
    isLoading, 
    inventorySize, 
    activeProject, 
    syncProjectInventory 
}: { 
    message: string; 
    isLoading?: boolean; 
    inventorySize?: number; 
    activeProject?: any; 
    syncProjectInventory?: (projectId: string, siteUrl: string) => Promise<void>;
}) {
    if (!message) return null;
    return (
        <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
            {isLoading
                ? <Loader2 size={12} className="text-indigo-500 animate-spin shrink-0" />
                : <Sparkles size={12} className="text-indigo-500 shrink-0" />}
            <div className="flex-1">
                <p className="text-[10px] text-indigo-700 font-medium leading-snug">{message}</p>
                {inventorySize !== undefined && (
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest">
                            Inventario: {inventorySize} URLs
                        </p>
                        {inventorySize === 0 && activeProject && (
                            <button 
                                onClick={() => syncProjectInventory?.(activeProject.id, activeProject.site_url || '')}
                                className="text-[8px] text-pink-500 font-bold uppercase underline hover:text-pink-700"
                            >
                                Sincronizar ahora
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
