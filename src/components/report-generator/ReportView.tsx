'use client';

import { useEffect, useRef, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Chart } from 'chart.js/auto';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, Moon, Sun, X, Plus, Trash2, GripVertical, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import html2canvas from 'html2canvas';

import { SplitAnalysisSlide } from './slides/SplitAnalysisSlide';
import { TableDatasetSlide } from './slides/TableDatasetSlide';
import { usePermissions } from '@/hooks/usePermissions';

export interface ReportViewProps {
    jsonState: any[];
    onStateChange?: (newState: any[]) => void;
    theme?: string;
}

export interface ReportViewRef {
    captureAllSlides: () => Promise<string[]>;
}

export const ReportView = forwardRef<ReportViewRef, ReportViewProps>(({ jsonState, onStateChange, theme = '#4f46e5' }, ref) => {
    // --- State ---
    const [slides, setSlides] = useState<any[]>(jsonState || []);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isPresenting, setIsPresenting] = useState(false);
    const [viewTheme, setViewTheme] = useState<'light' | 'dark'>('light');
    const hiddenContainerRef = useRef<HTMLDivElement>(null);
    const { canEditAny, canTakeReports } = usePermissions();
    const canEditReport = canEditAny() || canTakeReports();

    useImperativeHandle(ref, () => ({
        captureAllSlides: async () => {
            if (!hiddenContainerRef.current) return [];

            // Wait slightly to ensure charts render fully before snapshotting
            await new Promise(r => setTimeout(r, 500));

            const snapshots: string[] = [];
            const slideNodes = hiddenContainerRef.current.children;

            // Render sequentially to not overload browser memory
            for (let i = 0; i < slideNodes.length; i++) {
                const node = slideNodes[i] as HTMLElement;
                const canvas = await html2canvas(node, { scale: 2, useCORS: true, logging: false });
                snapshots.push(canvas.toDataURL('image/png'));
            }
            return snapshots;
        }
    }));

    // Sync from props if generation completes
    useEffect(() => {
        if (jsonState && jsonState.length > 0) {
            setSlides(jsonState);
        }
    }, [jsonState]);

    const handleStateUpdate = (newSlides: any[]) => {
        setSlides(newSlides);
        if (onStateChange) onStateChange(newSlides);
    };


    // --- Slide Management ---
    const addSlide = () => {
        if (!canEditReport) return;
        const newSlide = {
            type: 'split_analysis',
            title: 'Nueva Sección',
            analysis: 'Comienza a escribir el análisis aquí...',
            chartConfig: { type: 'bar', chartType: 'custom', title: 'Nuevo Gráfico' }
        };

        handleStateUpdate([...slides, newSlide]);
        setTimeout(() => setCurrentSlideIndex(slides.length), 10);
    };

    const deleteSlide = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (!canEditReport || slides.length <= 1) return; // Prevent deleting last slide

        const newSlides = slides.filter((_, i) => i !== index);
        handleStateUpdate(newSlides);

        if (currentSlideIndex >= index && currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    // --- Presentation Logic ---
    const presentationRef = useRef<HTMLDivElement>(null);

    // Presentation Navigation
    const nextSlide = () => setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
    const prevSlide = () => setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
    const togglePresentation = () => {
        setIsPresenting(!isPresenting);
        // If entering presentation, ensure we are on current slide (already shared state)
    };


    return (
        <div className="flex flex-col h-[85vh] min-h-[600px] glass-panel bg-white/40 rounded-[30px] overflow-hidden border-hairline shadow-sm report-container">
            {/* Toolbar Area */}
            <div className="bg-white/80 backdrop-blur-md border-b border-hairline p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-elegant text-slate-400">Editor de Diapositivas</h3>
                </div>

                <button
                    onClick={togglePresentation}
                    className="flex items-center gap-2 px-4 py-2 glass-panel bg-[var(--color-nous-lavender)]/20 text-[var(--color-nous-lavender)] hover:bg-[var(--color-nous-lavender)]/30 border-hairline rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                    <Maximize2 size={14} /> Presentar
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Sidebar (Thumbnails) */}
                <div className="w-64 bg-white/50 border-r border-hairline flex flex-col backdrop-blur-sm">
                    <div className="p-4 overflow-y-auto flex-1 space-y-3">
                        {slides.map((slide, idx) => (
                            <div
                                key={idx}
                                onClick={() => setCurrentSlideIndex(idx)}
                                className={cn(
                                    "p-3 rounded-xl border cursor-pointer transition-all relative group touch-none",
                                    currentSlideIndex === idx
                                        ? "glass-panel bg-white/80 border-[var(--color-nous-mint)] shadow-sm ring-2 ring-[var(--color-nous-mint)]/20"
                                        : "bg-white/50 border-transparent hover:border-slate-300"
                                )}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", currentSlideIndex === idx ? "text-[var(--color-nous-mint)]" : "text-slate-400")}>
                                        Slide {idx + 1}
                                    </span>
                                    {canEditReport && (
                                        <button
                                            onClick={(e) => deleteSlide(e, idx)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                                {/* Mini Preview (Safe title rendering) */}
                                <div className="h-16 overflow-hidden text-[8px] text-slate-400 leading-tight select-none">
                                    <div className="scale-50 origin-top-left w-[200%] font-bold uppercase">
                                        {slide.title || "Untitled Slide"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {canEditReport && (
                        <div className="p-4 border-t border-hairline bg-white/30 hidden">
                            <button
                                onClick={addSlide}
                                className="w-full py-3 bg-white border-hairline text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-[var(--color-nous-mist)]/20 hover:text-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> Nueva Slide
                            </button>
                        </div>
                    )}
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-slate-50/30 overflow-y-auto p-8 flex justify-center">
                    <div className="w-full max-w-6xl">
                        {/* Dynamic Component Rendering instead of EditorContent */}
                        {slides.length > 0 && currentSlideIndex < slides.length ? (
                            <SlideRenderer slide={slides[currentSlideIndex]} theme={theme} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">Selecciona o añade una diapositiva</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Presentation Overlay */}
            {isPresenting && (
                <div className={cn(
                    "fixed inset-0 z-[100] flex flex-col justify-center items-center transition-colors duration-500",
                    theme === 'dark' ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"
                )}>
                    {/* Controls Header */}
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-black uppercase tracking-widest opacity-50">
                                Slide {currentSlideIndex + 1} / {slides.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 bg-black/10 backdrop-blur-md p-1 rounded-full border border-white/10">
                            <button onClick={() => setViewTheme(viewTheme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full hover:bg-white/20 transition-all">
                                {viewTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                            </button>
                            <div className="w-px h-4 bg-white/20"></div>
                            <button onClick={togglePresentation} className="p-2 rounded-full hover:bg-white/20 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Controls Footer */}
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-8 z-10">
                        <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all disabled:opacity-30">
                            <ChevronLeft size={32} />
                        </button>
                        <button onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1} className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-all disabled:opacity-30">
                            <ChevronRight size={32} />
                        </button>
                    </div>

                    {/* Content */}
                    <div
                        ref={presentationRef}
                        className={cn(
                            "w-full max-w-7xl h-[85vh] flex items-center justify-center p-12 overflow-y-auto presentation-slide report-container",
                        )}
                    >
                        <div className="w-full max-w-none report-container">
                            {slides[currentSlideIndex] && (
                                <SlideRenderer slide={slides[currentSlideIndex]} theme={theme} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden container for html2canvas snapshots */}
            <div
                ref={hiddenContainerRef}
                className="fixed top-0 left-0 -z-50 pointer-events-none opacity-0"
                style={{ width: '1920px' }}
            >
                {slides.map((slide, idx) => (
                    <div key={idx} className="bg-white" style={{ width: '1920px', height: '1080px' }}>
                        <div className="w-full h-full report-container flex items-center justify-center p-12">
                            <SlideRenderer slide={slide} theme={theme} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

// Helper Component to map JSON slide types to React Components
const SlideRenderer = ({ slide, theme }: { slide: any, theme: string }) => {
    if (!slide) return null;

    switch (slide.type) {
        case 'split_analysis':
            return (
                <SplitAnalysisSlide
                    title={slide.title}
                    analysis={slide.analysis}
                    metrics={slide.metrics}
                    chartConfig={slide.chartConfig}
                    theme={theme as any}
                />
            );
        case 'table_dataset':
            return (
                <TableDatasetSlide
                    title={slide.title}
                    subtitle={slide.subtitle}
                    tableData={slide.tableData || slide.data || []}
                />
            );
        case 'title_slide':
            return (
                <section className="report-slide bg-white h-full relative overflow-hidden flex flex-col justify-center p-20 min-h-[600px]">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--color-nous-lavender)] rounded-bl-full opacity-20 -mr-20 -mt-20 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--color-nous-mist)] rounded-tr-full opacity-30 -ml-32 -mb-24 blur-3xl"></div>

                    <div className="relative z-10 max-w-4xl">
                        <div className="inline-block px-5 py-2 glass-panel bg-[var(--color-nous-mist)]/20 border-hairline text-slate-800 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
                            Estrategia SEO Global
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-8 italic uppercase">
                            {slide.title}
                        </h1>
                        <p className="text-2xl text-slate-500 font-medium mb-12 max-w-2xl leading-relaxed">
                            {slide.subtitle}
                        </p>
                        <div className="flex items-center gap-6">
                            <div className="h-1 w-20 bg-gradient-to-r from-[var(--color-nous-mint)] to-[var(--color-nous-mist)] rounded-full"></div>
                            <div className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
                                {slide.date}
                            </div>
                        </div>
                    </div>
                </section>
            );
        case 'error_slide':
        default:
            return (
                <section className="report-slide p-12 flex flex-col items-center justify-center min-h-[300px] bg-slate-50 border border-slate-200">
                    <p className="text-slate-500 text-center font-bold">{slide.message || 'Diapositiva en blanco o formato no reconocido.'}</p>
                </section>
            );
    }
};

