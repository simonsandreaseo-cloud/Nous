'use client';

import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Sparkles, ImageIcon, Loader2, AlertCircle, Anchor } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';

export default function ImageSlotNodeView(props: any) {
    const { node } = props;
    const { id, prompt, role, status, semanticAnchor, width, align, wrapping } = node.attrs;

    return (
        <NodeViewWrapper 
            className={cn(
                "nous-image-slot-wrapper py-4",
                align === 'center' && "flex justify-center",
                align === 'full' && "w-full"
            )}
        >
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: width || '100%' }}
                className={cn(
                    "relative group overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
                    status === 'pending' && "border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50",
                    status === 'completed' && "border-emerald-400 bg-emerald-50/50",
                    status === 'error' && "border-rose-300 bg-rose-50/50",
                    role === 'hero' ? "aspect-[16/9]" : "aspect-video"
                )}
            >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className={cn(
                        "p-3 rounded-full mb-3 transition-transform group-hover:scale-110",
                        status === 'pending' && "bg-indigo-100 text-indigo-600",
                        status === 'completed' && "bg-emerald-100 text-emerald-600",
                        status === 'error' && "bg-rose-100 text-rose-600"
                    )}>
                        {status === 'pending' && <Sparkles size={24} className="animate-pulse" />}
                        {status === 'completed' && <ImageIcon size={24} />}
                        {status === 'error' && <AlertCircle size={24} />}
                    </div>

                    <div className="space-y-1 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                            {status === 'pending' ? 'Sugerencia Editorial' : 'Asset Procesado'}
                        </span>
                        {semanticAnchor && (
                            <div className="flex items-center justify-center gap-1 text-[8px] text-indigo-400 font-bold uppercase italic">
                                <Anchor size={8} />
                                Anclado a: &quot;{semanticAnchor.slice(0, 20)}...&quot;
                            </div>
                        )}
                    </div>

                    <p className="text-xs font-medium text-slate-600 italic line-clamp-2 max-w-md px-4">
                        &quot;{prompt || 'Esperando instrucciones de diseño...'}&quot;
                    </p>

                    <div className="mt-4 flex items-center gap-2">
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                            role === 'hero' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                        )}>
                            {role}
                        </span>
                        {status === 'pending' && (
                            <div className="flex items-center gap-1 text-indigo-500 text-[8px] font-black uppercase">
                                <Loader2 size={10} className="animate-spin" />
                                Maquetando...
                            </div>
                        )}
                    </div>
                </div>

                {/* Grid Decorativo */}
                <div className="absolute inset-0 pointer-events-none opacity-10" 
                     style={{ backgroundImage: 'radial-gradient(#6366f1 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }} 
                />
            </motion.div>
        </NodeViewWrapper>
    );
}
