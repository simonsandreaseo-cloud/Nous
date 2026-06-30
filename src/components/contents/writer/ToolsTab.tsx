'use client';

import { useState } from 'react';
import { 
    Wrench, Play, ChevronDown, ChevronUp, Sparkles, Loader2, Info, Eye, 
    Copy, ExternalLink, FileCode, Check, PlusSquare, Link as LinkIcon, 
    RefreshCcw, AlertCircle, Wand2, Scissors, Search 
} from 'lucide-react';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { SectionLabel } from './SidebarCommon';
import { Button } from '@/components/dom/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { NousExtractorService } from '@/lib/services/nous-extractor';
import { LinkPatcherService } from '@/lib/services/link-patcher';
import { ContentSplitterService, SplitOptions, SplitChunk } from '@/lib/services/content-splitter';
import { cn } from '@/utils/cn';

export function ToolsTab() {
    const store = useWriterStore();
    const { activeProject } = useProjectStore();
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [executingId, setExecutingId] = useState<string | null>(null);
    const [lastCopied, setLastCopied] = useState<string | null>(null);
    const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
    const [manualRuleSelects, setManualRuleSelects] = useState<Record<string, string>>({});
    const [isTestingManual, setIsTestingManual] = useState<string | null>(null);

    const extractorFindings = store.nousExtractorFindings || {};
    const patcherFindings = store.patcherFindings || {};
    const [splitterChunks, setSplitterChunks] = useState<Record<string, SplitChunk[]>>({});

    const widgets = activeProject?.custom_widgets?.filter(w => {
        // We show the widget in the Writer if the integration is enabled,
        // even if it's currently "inactive" (inactive = manual mode only).
        
        // NOUS_EXTRACTOR:
        if (w.type === 'nous_extractor') {
            return w.show_in_writer || (w.config?.rules && w.config.rules.length > 0);
        }

        // LINK_PATCHER:
        if (w.type === 'link_patcher') {
            return w.config?.integrations?.writer === true;
        }

        // CONTENT_SPLITTER:
        if (w.type === 'content_splitter') {
            return true;
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
        
        const currentStore = useWriterStore.getState();
        setExecutingId(widget.id);
        currentStore.setStatus(`Escaneando enlaces para ${widget.name}...`);

            try {
                const editor = currentStore.editor;
                if (!editor) return;
                
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
                    currentStore.setStatus("❌ No se encontraron enlaces para procesar.");
                    setExecutingId(null);
                    return;
                }

                const activeRules = (widget.config?.rules || []).filter((r: any) => r.is_active !== false);
                const newFindings: any[] = [];
                let totalFound = 0;
                const insertions: { pos: number; endPos: number; value: string; placement: string }[] = [];

                for (const link of links) {
                    const response = await NousExtractorService.extract(link.originalUrl || link.url, activeRules);
                    
                    if (response.success && response.results.length > 0) {
                        response.results.forEach(res => {
                            if (res.success) {
                                const rule = activeRules.find((r: any) => r.id === res.rule_id);
                                const placement = rule?.placement_mode || 'inline';

                                newFindings.push({
                                    url: link.url,
                                    originalUrl: link.originalUrl,
                                    text: link.text,
                                    pos: link.pos,
                                    value: res.formatted,
                                    success: true
                                });

                                insertions.push({
                                    pos: link.pos,
                                    endPos: link.pos + (link.text?.length || 0),
                                    value: res.formatted,
                                    placement
                                });

                                totalFound++;
                            }
                        });
                    }
                }

                insertions.sort((a, b) => b.endPos - a.endPos).forEach(ins => {
                    if (ins.placement === 'inline') {
                        editor.chain().insertContentAt(ins.endPos, ` ${ins.value}`).run();
                    } else if (ins.placement === 'new_line') {
                        editor.chain().insertContentAt(ins.endPos, `<br>${ins.value}`).run();
                    } else if (ins.placement === 'new_paragraph') {
                        // Find the end of the current block to insert the new paragraph after it
                        const $pos = editor.state.doc.resolve(ins.endPos);
                        const blockEnd = $pos.end();
                        // blockEnd is the position right before the closing tag of the current block.
                        // To insert a new block *after* the current one, we insert at blockEnd + 1.
                        editor.chain().insertContentAt(blockEnd + 1, {
                            type: 'paragraph',
                            content: [{ type: 'text', text: ins.value }]
                        }).run();
                    }
                });

                const currentFindings = useWriterStore.getState().extractorFindings;
                currentStore.setNousExtractorFindings({ ...currentFindings, [widget.id]: newFindings });
                
                if (totalFound > 0) {
                    setExpandedIds(prev => prev.includes(widget.id) ? prev : [...prev, widget.id]);
                    currentStore.setStatus(`✅ Extracción completada. ${totalFound} hallazgos.`);
                } else {
                    currentStore.setStatus("Información incompleta: No se detectaron patrones.");
                }
            } catch (e: any) {
                useWriterStore.getState().setStatus(`❌ Error: ${e.message}`);
            } finally {
                setExecutingId(null);
            }
    };

    const handleManualExtract = async (widget: any) => {
        const inputText = manualInputs[widget.id];
        if (!inputText) return;
        
        const urls = inputText.split(/\r?\n/).map(u => u.trim()).filter(u => u.length > 0);
        if (urls.length === 0) return;

        setIsTestingManual(widget.id);
        const currentStore = useWriterStore.getState();
        currentStore.setStatus(`Analizando ${urls.length} URL(s) manual(es)...`);
        
        try {
            const allRules = widget.config?.rules || [];
            const selectedRuleId = manualRuleSelects[widget.id];
            
            const rulesToUse = selectedRuleId 
                ? allRules.filter((r: any) => r.id === selectedRuleId)
                : allRules.filter((r: any) => r.is_active !== false);

            if (rulesToUse.length === 0) {
                currentStore.setStatus("⚠️ No hay reglas seleccionadas o activas.");
                setIsTestingManual(null);
                return;
            }

            const newFindings: any[] = [];
            const ruleResultsMap: Record<string, string[]> = {};

            for (const url of urls) {
                try {
                    const response = await NousExtractorService.extract(url, rulesToUse);
                    if (response.success && response.results.length > 0) {
                        response.results.forEach((res: any) => {
                            if (res.success) {
                                const rule = rulesToUse.find((r: any) => r.id === res.rule_id);
                                if (rule?.batch_mode) {
                                    if (!ruleResultsMap[rule.id]) ruleResultsMap[rule.id] = [];
                                    ruleResultsMap[rule.id].push(res.formatted);
                                } else {
                                    newFindings.push({
                                        url: url,
                                        originalUrl: url,
                                        text: 'Búsqueda Manual',
                                        pos: -1,
                                        value: res.formatted,
                                        success: true
                                    });
                                }
                            } else {
                                newFindings.push({
                                    url: url,
                                    originalUrl: url,
                                    text: 'Error de Extracción',
                                    pos: -1,
                                    value: res.error || 'Patrón no encontrado',
                                    success: false
                                });
                            }
                        });
                    } else {
                        newFindings.push({
                            url: url,
                            originalUrl: url,
                            text: 'Error de Red/API',
                            pos: -1,
                            value: response.error || 'Respuesta vacía',
                            success: false
                        });
                    }
                } catch (e: any) {
                    newFindings.push({
                        url: url,
                        originalUrl: url,
                        text: 'Excepción',
                        pos: -1,
                        value: e.message || 'Error desconocido',
                        success: false
                    });
                }
            }
            
            // Process batched rules
            Object.keys(ruleResultsMap).forEach(ruleId => {
                const rule = rulesToUse.find((r: any) => r.id === ruleId);
                if (rule && ruleResultsMap[ruleId].length > 0) {
                    const joined = ruleResultsMap[ruleId].join(rule.batch_separator || "");
                    const finalValue = `${rule.batch_prefix || ""}${joined}${rule.batch_suffix || ""}`;
                    newFindings.push({
                        url: `${urls.length} URLs procesadas`,
                        originalUrl: `Batch: ${rule.name}`,
                        text: 'Agrupación Batch',
                        pos: -1,
                        value: finalValue,
                        success: true
                    });
                } else if (rule && ruleResultsMap[ruleId].length === 0) {
                    newFindings.push({
                        url: `0 URLs procesadas`,
                        originalUrl: `Batch: ${rule.name}`,
                        text: 'Agrupación Batch Fallida',
                        pos: -1,
                        value: 'No se encontraron resultados para agrupar.',
                        success: false
                    });
                }
            });

            if (newFindings.length > 0) {
                const currentFindings = useWriterStore.getState().nousExtractorFindings || {};
                const existingForWidget = currentFindings[widget.id] || [];
                currentStore.setNousExtractorFindings({ 
                    ...currentFindings, 
                    [widget.id]: [...newFindings, ...existingForWidget] 
                });
                setManualInputs(prev => ({ ...prev, [widget.id]: '' }));
                currentStore.setStatus(`✅ Procesamiento manual completado.`);
            } else {
                currentStore.setStatus("⚠️ No se generaron hallazgos.");
                // Forzar un error visual si llegó hasta acá y no generó nada.
                const currentFindings = useWriterStore.getState().nousExtractorFindings || {};
                const existingForWidget = currentFindings[widget.id] || [];
                currentStore.setNousExtractorFindings({
                    ...currentFindings,
                    [widget.id]: [{
                        url: 'Debugger',
                        originalUrl: 'N/A',
                        text: 'Error de Flujo',
                        pos: -1,
                        value: `urls.length=${urls.length}, rulesToUse.length=${rulesToUse.length}, ruleResultsMapKeys=${Object.keys(ruleResultsMap).length}`,
                        success: false
                    }, ...existingForWidget]
                });
            }
        } catch (e: any) {
            currentStore.setStatus(`❌ Error crítico: ${e.message}`);
        } finally {
            setIsTestingManual(null);
        }
    };

    /**
     * Logic for LINK PATCHER (Regex Dynamic Links)
     */
    const handleExecutePatcher = async (widget: any, mode: 'simulate' | 'apply' = 'simulate') => {
        if (!store.editor) return;
        
        const actionTitle = mode === 'apply' ? `Parcheando: ${widget.name}` : `Simulando: ${widget.name}`;
        
        const currentStore = useWriterStore.getState();
        setExecutingId(widget.id);
        currentStore.setStatus(mode === 'simulate' ? 'Simulando parcheo de enlaces...' : 'Aplicando parcheo de enlaces...');

            try {
                if (!currentStore.editor) return;
                const response = await LinkPatcherService.processEditorLinks(currentStore.editor, widget, mode);
                
                if (response.success) {
                    const currentPatcherFindings = useWriterStore.getState().patcherFindings;
                    currentStore.setPatcherFindings({ ...currentPatcherFindings, [widget.id]: response.results });
                    const modifiedCount = response.results.filter(r => r.isModified).length;

                    if (mode === 'apply') {
                        currentStore.setStatus(`✅ Enlaces parchados: ${modifiedCount} cambios aplicados.`);
                    } else {
                        currentStore.setStatus(`🔍 Simulación: ${modifiedCount} enlaces detectados para parchar.`);
                        if (modifiedCount > 0) {
                            setExpandedIds(prev => prev.includes(widget.id) ? prev : [...prev, widget.id]);
                        }
                    }
                } else {
                    currentStore.setStatus(`❌ Error: ${response.error}`);
                }
            } catch (e: any) {
                useWriterStore.getState().setStatus(`❌ Error: ${e.message}`);
            } finally {
                setExecutingId(null);
            }
    };

    /**
     * Logic for CONTENT SPLITTER
     */
    const handleExecuteSplitter = async (widget: any) => {
        if (!store.editor) return;
        
        const currentStore = useWriterStore.getState();
        setExecutingId(widget.id);
        currentStore.setStatus(`Dividiendo contenido con ${widget.name}...`);

            try {
                if (!currentStore.editor) return;
                const html = currentStore.editor.getHTML();
                const options: SplitOptions = {
                    limitType: widget.config?.limitType || 'words',
                    limitMode: widget.config?.limitMode || 'max_h2',
                    limitValue: widget.config?.limitValue || 1000
                };
                
                const chunks = ContentSplitterService.splitContent(html, options);
                setSplitterChunks(prev => ({ ...prev, [widget.id]: chunks }));
                
                if (chunks.length > 0) {
                    setExpandedIds(prev => prev.includes(widget.id) ? prev : [...prev, widget.id]);
                    currentStore.setStatus(`✅ Contenido dividido en ${chunks.length} partes.`);
                } else {
                    currentStore.setStatus("⚠️ No se pudo dividir el contenido.");
                }
            } catch (e: any) {
                useWriterStore.getState().setStatus(`❌ Error al dividir: ${e.message}`);
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

    const handleCopyRichText = async (html: string, text: string) => {
        if (!document.hasFocus()) {
            store.setStatus("⚠️ Enfoca la ventana para copiar al portapapeles.");
            return;
        }
        
        try {
            // Creamos un elemento temporal para que el navegador genere todos los formatos nativos (ej: para Word)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '-9999px';
            // Algunos estilos para mantener los encabezados lo más nativos posible
            tempDiv.style.whiteSpace = 'pre-wrap';
            document.body.appendChild(tempDiv);
            
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(tempDiv);
            selection?.removeAllRanges();
            selection?.addRange(range);
            
            const successful = document.execCommand('copy');
            
            selection?.removeAllRanges();
            document.body.removeChild(tempDiv);

            if (successful) {
                setLastCopied(text);
                setTimeout(() => setLastCopied(null), 2000);
            } else {
                throw new Error("execCommand fallback failed");
            }
        } catch (error) {
            console.error("Error al copiar al portapapeles:", error);
            // Fallback en caso de error
            handleCopyValue(text);
        }
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
                    const isSplitter = widget.type === 'content_splitter';
                    
                    const findings = isPatcher 
                        ? (patcherFindings[widget.id] || [])
                        : (extractorFindings[widget.id] || []);
                        
                    const chunks = isSplitter ? (splitterChunks[widget.id] || []) : [];

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
                                            ? (isPatcher ? "bg-emerald-500 text-white" : isSplitter ? "bg-amber-500 text-white" : "bg-indigo-500 text-white") 
                                            : "bg-slate-50 text-slate-400"
                                    )}>
                                        {isPatcher ? <LinkIcon size={16} /> : isSplitter ? <Scissors size={16} /> : <Sparkles size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">
                                                {widget.name}
                                            </h4>
                                            {widget.is_active ? (
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter border",
                                                    isPatcher ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                                    isSplitter ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                    "bg-indigo-50 text-indigo-600 border-indigo-100"
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
                                            isPatcher ? "text-emerald-500/70" : isSplitter ? "text-amber-500/70" : "text-indigo-500/70"
                                        )}>
                                            {isPatcher ? 'Link Patcher Engine' : isSplitter ? 'Content Splitter' : 'Extractor Nous'}
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
                                    ) : isSplitter ? (
                                        <Button
                                            onClick={() => handleExecuteSplitter(widget)}
                                            disabled={isExecuting || !!executingId}
                                            className={cn(
                                                "h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                isExecuting ? "bg-amber-100 text-amber-400" : "bg-amber-500 text-white hover:bg-amber-600"
                                            )}
                                        >
                                            {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Scissors size={10} />}
                                            <span className="ml-1.5">{isExecuting ? 'Dividiendo' : 'Dividir'}</span>
                                        </Button>
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
                                            {!isSplitter && !isPatcher && (
                                                <div className="px-1 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <select
                                                            value={manualRuleSelects[widget.id] || ""}
                                                            onChange={(e) => setManualRuleSelects(prev => ({ ...prev, [widget.id]: e.target.value }))}
                                                            className="text-[9px] font-black text-slate-500 uppercase bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition-colors"
                                                        >
                                                            <option value="">Todas las reglas activas</option>
                                                            {(widget.config?.rules || []).map((r: any) => (
                                                                <option key={r.id} value={r.id}>
                                                                    {r.name} {r.is_active ? '' : '(Inactiva)'} {r.batch_mode ? '[BATCH]' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <textarea 
                                                            placeholder="Pegar URLs (una por línea) para extraer manualmente..."
                                                            value={manualInputs[widget.id] || ''}
                                                            onChange={(e) => setManualInputs(prev => ({ ...prev, [widget.id]: e.target.value }))}
                                                            className="w-full min-h-[60px] max-h-[120px] p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-medium text-slate-600 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none resize-y custom-scrollbar"
                                                        />
                                                        <button 
                                                            onClick={() => handleManualExtract(widget)}
                                                            disabled={isTestingManual === widget.id || !manualInputs[widget.id]}
                                                            className="w-full h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center gap-2 hover:bg-indigo-100 disabled:opacity-50 transition-colors shadow-sm text-[10px] font-black uppercase tracking-wider"
                                                        >
                                                            {isTestingManual === widget.id ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                                            Procesar URLs Manualmente
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {isSplitter ? (
                                                chunks.length > 0 ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between px-1 mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <FileCode size={12} className="text-amber-400" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                                                                    Partes Generadas
                                                                </span>
                                                            </div>
                                                            <span className="text-[8px] font-bold text-slate-400">
                                                                {chunks.length} secciones
                                                            </span>
                                                        </div>
                                                        {chunks.map((chunk, idx) => (
                                                            <div key={chunk.id} className="flex items-center justify-between p-3 bg-white border border-amber-100 hover:border-amber-300 rounded-2xl transition-all group/chunk">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[10px] font-black text-slate-700 uppercase">
                                                                            Parte {idx + 1}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                                        <span>{chunk.wordCount} Palabras</span>
                                                                        <span>&bull;</span>
                                                                        <span>{chunk.charCount} Caracteres</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button 
                                                                        onClick={() => handleCopyRichText(chunk.html, chunk.text)}
                                                                        title="Copiar Contenido"
                                                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                                    >
                                                                        {lastCopied === chunk.text ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleCopyValue(chunk.html)}
                                                                        title="Copiar HTML"
                                                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                                    >
                                                                        {lastCopied === chunk.html ? <Check size={14} className="text-emerald-500" /> : <FileCode size={14} />}
                                                                    </button>
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
                                                            Haz clic en "Dividir" para fragmentar el documento según los límites de {widget.config?.limitValue || 1000} {widget.config?.limitType === 'characters' ? 'caracteres' : 'palabras'}.
                                                        </p>
                                                    </div>
                                                )
                                            ) : findings.length > 0 ? (
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
                                                                    : finding.pos === -1 
                                                                        ? "border-amber-100 hover:border-amber-300 shadow-sm"
                                                                        : "border-indigo-100 hover:border-indigo-300"
                                                            )}
                                                        >
                                                            {finding.pos !== -1 ? (
                                                                <button 
                                                                    onClick={() => handleScrollToLink(finding.pos)}
                                                                    className={cn(
                                                                        "mt-1 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0",
                                                                        isPatcher 
                                                                            ? "bg-emerald-50 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                                                                            : "bg-indigo-50 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                                                                    )}
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                            ) : (
                                                                <div className="mt-1 w-8 h-8 rounded-full flex items-center justify-center bg-amber-50 text-amber-400 shrink-0">
                                                                    <Wand2 size={14} />
                                                                </div>
                                                            )}

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
