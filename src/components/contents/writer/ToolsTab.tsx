'use client';

import { useState } from 'react';
import { 
    Wrench, Play, ChevronDown, ChevronUp, Sparkles, Loader2, Info, Eye, 
    Copy, ExternalLink, FileCode, Check, PlusSquare, Link as LinkIcon, 
    RefreshCcw, AlertCircle, Wand2 
} from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { SectionLabel } from './SidebarCommon';
import { Button } from '@/components/dom/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { NousExtractorService } from '@/lib/services/nous-extractor';
import { LinkPatcherService } from '@/lib/services/link-patcher';
import { cn } from '@/utils/cn';

export function ToolsTab() {
    const store = useWriterStore();
    const { activeProject } = useProjectStore();
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [executingId, setExecutingId] = useState<string | null>(null);
    const [lastCopied, setLastCopied] = useState<string | null>(null);

    const extractorFindings = store.nousExtractorFindings || {};
    const patcherFindings = store.patcherFindings || {};

    const widgets = activeProject?.custom_widgets?.filter(w => {
        // We show the widget in the Writer if the integration is enabled,
        // even if it's currently "inactive" (inactive = manual mode only).
        
        // NOUS_EXTRACTOR:
        if (w.type === 'nous_extractor') {
            return w.show_in_writer || w.config?.rules?.some((r: any) => r.target_phases?.includes('writer') && r.is_active !== false);
        }

        // LINK_PATCHER:
        if (w.type === 'link_patcher') {
            return w.config?.integrations?.writer === true;
        }

        return w.show_in_writer;
    }) || [];

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => prev.includes(id) 
            ? prev.filter(i => i !== id) 
            : [...prev, id]
        );
    };

     /**
      * Logic for NOUS EXTRACTOR
      */
    const handleExecuteExtractor = async (widget: any) => {
        if (!store.editor) return;
        setExecutingId(widget.id);
        store.setStatus(`Escaneando enlaces para ${widget.name}...`);

        try {
            const editor = store.editor;
            const links: { url: string; text: string; pos: number; originalUrl?: string }[] = [];

            editor.state.doc.descendants((node: any, pos: number) => {
                const linkMark = node.marks.find((m: any) => m.type.name === 'link');
                if (linkMark) {
                    const href = linkMark.attrs.href;
                    if (href && /^https?:\/\//i.test(href)) {
                        links.push({
                            url: href,
                            text: node.text || "",
                            pos: pos,
                            originalUrl: linkMark.attrs['data-original-url']
                        });
                    }
                }
                return true;
            });

            if (links.length === 0) {
                store.setStatus("❌ No se encontraron enlaces para procesar.");
                setExecutingId(null);
                return;
            }

            const activeRules = (widget.config?.rules || []).filter((r: any) => r.is_active !== false);
            const newFindings: any[] = [];
            let totalFound = 0;

            for (const link of links) {
                // Use the service which now handles data-original-url via priority
                const response = await NousExtractorService.extract(link.originalUrl || link.url, activeRules);
                
                if (response.success && response.results.length > 0) {
                    response.results.forEach(res => {
                        if (res.success) {
                            newFindings.push({
                                url: link.url,
                                originalUrl: link.originalUrl,
                                text: link.text,
                                pos: link.pos,
                                value: res.formatted,
                                success: true
                            });
                            totalFound++;
                        }
                    });
                }
            }

            store.setNousExtractorFindings({ ...extractorFindings, [widget.id]: newFindings });
            
            if (totalFound > 0) {
                setExpandedIds(prev => prev.includes(widget.id) ? prev : [...prev, widget.id]);
                store.setStatus(`✅ Extracción completada. ${totalFound} hallazgos.`);
            } else {
                store.setStatus("Información incompleta: No se detectaron patrones.");
            }
        } catch (e: any) {
            store.setStatus(`❌ Error: ${e.message}`);
        } finally {
            setExecutingId(null);
        }
    };

    /**
     * Logic for LINK PATCHER (Regex Dynamic Links)
     */
    const handleExecutePatcher = async (widget: any, mode: 'simulate' | 'apply' = 'simulate') => {
        if (!store.editor) return;
        setExecutingId(widget.id);
        store.setStatus(mode === 'simulate' ? 'Simulando parcheo de enlaces...' : 'Aplicando parcheo de enlaces...');

        try {
            const response = await LinkPatcherService.processEditorLinks(store.editor, widget, mode);
            
            if (response.success) {
                store.setPatcherFindings({ ...patcherFindings, [widget.id]: response.results });
                const modifiedCount = response.results.filter(r => r.isModified).length;

                if (mode === 'apply') {
                    store.setStatus(`✅ Enlaces parchados: ${modifiedCount} cambios aplicados.`);
                } else {
                    store.setStatus(`🔍 Simulación: ${modifiedCount} enlaces detectados para parchar.`);
                    if (modifiedCount > 0) {
                        setExpandedIds(prev => prev.includes(widget.id) ? prev : [...prev, widget.id]);
                    }
                }
            } else {
                store.setStatus(`❌ Error: ${response.error}`);
            }
        } catch (e: any) {
            store.setStatus(`❌ Error: ${e.message}`);
        } finally {
            setExecutingId(null);
        }
    };

    const handleScrollToLink = (pos: number) => {
        if (!store.editor) return;
        store.editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
        
        setTimeout(() => {
            const dom = store.editor.view.domAtPos(pos).node as HTMLElement;
            const linkElement = dom.parentElement?.closest('a') || (dom instanceof HTMLElement ? dom.closest('a') : null);
            if (linkElement) {
                linkElement.classList.add('flash-highlight');
                setTimeout(() => linkElement.classList.remove('flash-highlight'), 1500);
            }
        }, 50);
    };

    const handleCopyValue = (value: string) => {
        if (!document.hasFocus()) {
            store.setStatus("⚠️ Enfoca la ventana para copiar al portapapeles.");
            return;
        }
        navigator.clipboard.writeText(value);
        setLastCopied(value);
        setTimeout(() => setLastCopied(null), 2000);
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 pt-2 pb-24">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <SectionLabel>Nous Master Engine</SectionLabel>
                    <Wrench size={12} className="text-indigo-400" />
                </div>
                
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                    Gestiona la inteligencia de tus enlaces y la normalización dinámica de URLs.
                </p>
            </div>

            <div className="space-y-3">
                {widgets.map((widget) => {
                    const isExpanded = expandedIds.includes(widget.id);
                    const isExecuting = executingId === widget.id;
                    const isPatcher = widget.type === 'link_patcher';
                    
                    const findings = isPatcher 
                        ? (patcherFindings[widget.id] || [])
                        : (extractorFindings[widget.id] || []);

                    return (
                        <div 
                            key={widget.id}
                            className={cn(
                                "group border rounded-2xl transition-all overflow-hidden",
                                isExpanded ? "border-indigo-200 bg-indigo-50/10 shadow-lg shadow-indigo-500/5" : "border-slate-100 bg-white"
                            )}
                        >
                            {/* Header Row */}
                            <div className="p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors shadow-sm",
                                        isExpanded 
                                            ? (isPatcher ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white") 
                                            : "bg-slate-50 text-slate-400"
                                    )}>
                                        {isPatcher ? <LinkIcon size={16} /> : <Sparkles size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">
                                                {widget.name}
                                            </h4>
                                            {widget.is_active ? (
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter border",
                                                    isPatcher ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                                )}>
                                                    Auto
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter bg-slate-100 text-slate-400 border border-slate-200">
                                                    Manual
                                                </span>
                                            )}
                                        </div>
                                        <p className={cn(
                                            "text-[9px] font-bold uppercase tracking-widest",
                                            isPatcher ? "text-emerald-500/70" : "text-indigo-500/70"
                                        )}>
                                            {isPatcher ? 'Link Patcher Engine' : 'Extractor Nous'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {isPatcher ? (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                onClick={() => handleExecutePatcher(widget, 'simulate')}
                                                disabled={isExecuting || !!executingId}
                                                className="h-8 px-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                title="Simular cambios"
                                            >
                                                <Eye size={12} />
                                            </Button>
                                            <Button
                                                onClick={() => handleExecutePatcher(widget, 'apply')}
                                                disabled={isExecuting || !!executingId}
                                                className="h-8 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[9px] font-black uppercase"
                                            >
                                                {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={10} />}
                                                <span className="ml-1.5">{isExecuting ? 'Parchando' : 'Parchar'}</span>
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => handleExecuteExtractor(widget)}
                                            disabled={isExecuting || !!executingId}
                                            className={cn(
                                                "h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                isExecuting ? "bg-indigo-100 text-indigo-400" : "bg-slate-900 text-white hover:bg-slate-800"
                                            )}
                                        >
                                            {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} />}
                                            <span className="ml-1.5">{isExecuting ? 'Extrayendo' : 'Ejecutar'}</span>
                                        </Button>
                                    )}
                                    
                                    <button 
                                        onClick={() => toggleExpand(widget.id)}
                                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            </div>

                             {/* Collapsible Content */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-slate-50 overflow-hidden"
                                    >
                                        <div className="p-4 space-y-4">
                                            {findings.length > 0 ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between px-1 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <FileCode size={12} className={isPatcher ? "text-emerald-400" : "text-indigo-400"} />
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-widest",
                                                                isPatcher ? "text-emerald-600" : "text-indigo-600"
                                                            )}>
                                                                {isPatcher ? 'Enlaces Detectados' : 'Hallazgos Detectados'}
                                                            </span>
                                                        </div>
                                                        {isPatcher && (
                                                            <span className="text-[8px] font-bold text-slate-400">
                                                                {findings.filter((f: any) => f.isModified).length} cambios pendientes
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {findings.map((finding: any, idx: number) => (
                                                        <div 
                                                            key={idx}
                                                            className={cn(
                                                                "flex items-start gap-3 p-3 bg-white border rounded-2xl transition-all group/finding",
                                                                isPatcher 
                                                                    ? (finding.isModified ? "border-emerald-100 hover:border-emerald-300" : "border-slate-100 grayscale-[0.5]") 
                                                                    : "border-indigo-100 hover:border-indigo-300"
                                                            )}
                                                        >
                                                            <button 
                                                                onClick={() => handleScrollToLink(finding.pos)}
                                                                className={cn(
                                                                    "mt-1 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm",
                                                                    isPatcher 
                                                                        ? "bg-emerald-50 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                                                                        : "bg-indigo-50 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                                                                )}
                                                            >
                                                                <Eye size={14} />
                                                            </button>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <ExternalLink size={8} className="text-slate-300" />
                                                                    <span className="text-[8px] font-bold text-slate-400 truncate max-w-[180px]">
                                                                        {isPatcher ? finding.originalUrl : finding.url}
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className="flex flex-col gap-1">
                                                                    {isPatcher && finding.isModified && (
                                                                        <div className="flex items-center gap-1.5 text-[8px] text-emerald-500 font-black uppercase italic mb-0.5">
                                                                            <RefreshCcw size={8} className="animate-spin-slow" />
                                                                            <span>URL será normalizada</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className={cn(
                                                                            "text-xs font-black tracking-tight",
                                                                            isPatcher ? (finding.isModified ? "text-emerald-900" : "text-slate-400") : "text-indigo-900"
                                                                        )}>
                                                                            {isPatcher ? finding.patchedUrl : finding.value}
                                                                        </span>
                                                                        
                                                                        {!isPatcher && (
                                                                            <div className="flex items-center gap-1 opacity-0 group-hover/finding:opacity-100 transition-opacity">
                                                                                <button 
                                                                                    onClick={() => handleCopyValue(finding.value)}
                                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                                >
                                                                                    {lastCopied === finding.value ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-white/50 rounded-xl border border-slate-50/50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Info size={10} className="text-slate-400" />
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Información</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                                        {widget.description || (isPatcher 
                                                            ? "Este motor detecta enlaces que pueden ser convertidos a URLs dinámicas (agnósticas al idioma) usando tus reglas Regex."
                                                            : "Este extractor analiza los metadatos de los enlaces para obtener RIDs, etiquetas o identificadores técnicos.")}
                                                    </p>
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-1.5 h-1.5 rounded-full animate-pulse",
                                                            isPatcher ? "bg-emerald-500" : "bg-indigo-500"
                                                        )} />
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {widget.is_active 
                                                                ? (isPatcher ? 'Modo automático activado' : 'Monitor de extracción activo')
                                                                : 'Herramienta en modo manual'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {widgets.length === 0 && (
                    <div className="text-center py-12 px-6 border-2 border-dashed border-slate-100 rounded-3xl">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
                            <Wrench size={24} />
                        </div>
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sin Herramientas Activas</h5>
                        <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                            Activa la opción "Mostrar en Redacción" en tus widgets para verlos aquí.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
