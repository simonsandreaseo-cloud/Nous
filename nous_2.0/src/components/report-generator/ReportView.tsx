'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Chart } from 'chart.js/auto';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, Moon, Sun, X, Plus, Trash2, GripVertical, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';

import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ReportEditorToolbar } from './ReportEditorToolbar';
import { InsightBuilder, InsightConfig } from './InsightBuilder';
import { SlideLayouts } from './SlideLayouts';

interface ReportViewProps {
    htmlContent: string;
    chartData: any;
    onContentChange?: (newHtml: string) => void;
    projectId?: string;
    dateRange?: { start: string, end: string };
}

// Custom Extension to preserve Chart Placeholders
const ChartExtension = Node.create({
    name: 'chartPlaceholder',
    group: 'block',
    atom: true, // Treated as a single unit
    draggable: true,

    addAttributes() {
        return {
            'data-chart-type': { default: null },
            'data-chart-url': { default: null },
            'data-chart-config': { default: null },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-chart-type]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { class: 'chart-placeholder w-full relative' }), '']
    },
});

export function ReportView({ htmlContent, chartData, onContentChange, projectId, dateRange }: ReportViewProps) {
    // --- State ---
    const [slides, setSlides] = useState<string[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isPresenting, setIsPresenting] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [showInsightBuilder, setShowInsightBuilder] = useState(false);

    // --- Initialization ---
    useEffect(() => {
        if (!htmlContent) {
            setSlides(['<section><h1>Nueva Diapositiva</h1><p>Comienza a escribir...</p></section>']);
            return;
        }

        // Parse initial HTML into slides
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const sections = Array.from(doc.querySelectorAll('section'));

        if (sections.length > 0) {
            setSlides(sections.map(s => s.outerHTML));
        } else {
            // If no sections, wrap content in one
            setSlides([`<section class="report-slide">${htmlContent}</section>`]);
        }
    }, []); // Run once on mount (or if we want to reset from prop, add logic)

    // --- Tiptap Editor (Per Slide) ---
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            ChartExtension
        ],
        content: slides[currentSlideIndex] || '', // Load current slide
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px] p-8 bg-white shadow-sm rounded-3xl border border-slate-100',
            },
        },
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();

            // Update single slide in state
            setSlides(prev => {
                const newSlides = [...prev];
                newSlides[currentSlideIndex] = newContent;

                // Debounce parent update? For now direct.
                if (onContentChange) {
                    onContentChange(newSlides.join('\n\n'));
                }

                return newSlides;
            });
        },
    });

    // Sync Editor Content when Slide Changes
    useEffect(() => {
        if (editor && slides[currentSlideIndex] !== undefined) {
            const currentContent = editor.getHTML();
            // Only update if different to avoid cursor jumps / loops
            // BUT: slides[i] might be different because we switched index.
            // We need to check if the editor content matches the TARGET slide content.

            // Hard set content when index changes
            editor.commands.setContent(slides[currentSlideIndex]);
        }
    }, [currentSlideIndex, editor]); // Removed 'slides' dependency to avoid loop on typing


    // --- Slide Management ---
    const addSlide = () => {
        const newSlide = `<section class="report-slide bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-12 relative overflow-hidden">
            <div class="flex items-center space-x-3 border-b border-gray-200 pb-3 mb-4">
                <h2 class="text-xl font-bold text-gray-900">Nueva Sección</h2>
            </div>
            <p>Contenido...</p>
        </section>`;

        setSlides(prev => {
            const updated = [...prev, newSlide];
            if (onContentChange) onContentChange(updated.join('\n\n'));
            return updated;
        });
        // Switch to new slide
        setTimeout(() => setCurrentSlideIndex(slides.length), 10);
    };

    const deleteSlide = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (slides.length <= 1) return; // Prevent deleting last slide

        const newSlides = slides.filter((_, i) => i !== index);
        setSlides(newSlides);
        if (onContentChange) onContentChange(newSlides.join('\n\n'));

        if (currentSlideIndex >= index && currentSlideIndex > 0) {
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    const handleInsertInsight = (config: InsightConfig) => {
        let content = '';
        let metricsHtml = '';

        // 1. Generate Metrics HTML
        if (config.options.includeMetrics && config.data.summary) {
            const s = config.data.summary.current;
            const comp = config.data.summary.previous;
            const getDiff = (curr: number, prev: number) => {
                if (!prev) return undefined;
                return curr > prev ? 'up' : (curr < prev ? 'down' : 'neutral');
            };
            const formatDiff = (curr: number, prev: number) => {
                if (!prev) return '';
                const diff = curr - prev;
                return (diff > 0 ? '+' : '') + diff.toFixed(1);
            }

            metricsHtml += SlideLayouts.MetricCard('Clicks', s.clicks.toLocaleString(), comp ? formatDiff(s.clicks, comp.clicks) : '', getDiff(s.clicks, comp?.clicks));
            metricsHtml += SlideLayouts.MetricCard('Impresiones', s.impressions.toLocaleString(), comp ? formatDiff(s.impressions, comp.impressions) : '', getDiff(s.impressions, comp?.impressions));
            metricsHtml += SlideLayouts.MetricCard('CTR', s.ctr.toFixed(2) + '%', comp ? (s.ctr - comp.ctr).toFixed(2) + '%' : '', getDiff(s.ctr, comp?.ctr));
            metricsHtml += SlideLayouts.MetricCard('Posición', s.position.toFixed(1), comp ? (s.position - comp.position).toFixed(1) : '', s.position < (comp?.position || 100) ? 'up' : 'down'); // Lower position is better (green/up)
        }

        // 2. Determine Layout Strategy
        if (config.options.visualization === 'table' || (config.options.includeTable && config.options.visualization === 'text')) {
            // Table Layout
            const rows = config.data.items.slice(0, config.options.limit || 15).map((item: any) => SlideLayouts.TableRow(item)).join('');
            content = SlideLayouts.TableDashboard(config.options.title, rows);

        } else if (config.options.visualization !== 'text') {
            // Chart Layout (Split)
            const chartConfig = {
                type: config.options.visualization, // 'bubble', 'bar', 'line'
                data: config.data,
                title: config.options.title
            };

            // If AI is not included, we might want a different layout or just empty right side? 
            // For now, let's put the analysis or a placeholder text.
            const analysis = config.options.includeAI && config.data.analysis
                ? config.data.analysis.replace(/\n/g, '<br/>')
                : `<p>Visualización de datos para ${config.options.title}.</p>`;

            content = SlideLayouts.SplitChartAnalysis(config.options.title, chartConfig, analysis, metricsHtml);

        } else {
            // Text/Just Analysis Layout (Fallback to Split with no chart? or Generic)
            content = `
             <section class="report-slide bg-white p-12 rounded-[30px] flex flex-col justify-center">
                <h2 class="text-3xl font-black text-slate-800 mb-8">${config.options.title}</h2>
                <div class="prose prose-lg text-slate-600">
                    ${config.options.includeAI ? config.data.analysis : 'Contenido generado...'}
                </div>
             </section>`;
        }

        if (config.options.placement === 'new_slide') {
            // SlideLayouts already return <section> tags
            setSlides(prev => [...prev, content]);
            setTimeout(() => setCurrentSlideIndex(slides.length), 100);
        } else {
            editor?.commands.insertContent(content);
        }
        setShowInsightBuilder(false);
    };

    // --- Chart Rendering Logic (Reused) ---
    const containerRef = useRef<HTMLDivElement>(null);
    const presentationRef = useRef<HTMLDivElement>(null);

    // Effect to render charts in the DOM (both Editor and Presentation)
    useEffect(() => {
        const root = isPresenting ? presentationRef.current : containerRef.current;
        if (!root) return;

        // Small timeout to allow Tiptap/React to render the DOM nodes
        const timeout = setTimeout(() => {
            const placeholders = root.querySelectorAll('.chart-placeholder');
            placeholders.forEach((el) => {
                if (el.querySelector('canvas')) return; // Already rendered

                const type = el.getAttribute('data-chart-type');
                const canvas = document.createElement('canvas');
                canvas.style.maxHeight = isPresenting ? '60vh' : '400px';
                canvas.style.width = '100%';
                el.innerHTML = '';
                el.appendChild(canvas);

                // ... Chart Config (Keep existing logic or simplify for this snippet) ...
                // For brevity, I'm calling a helper or reusing the logic if possible.
                // Re-implementing basic render for stability in this refactor.
                renderChart(canvas, type, chartData, theme, isPresenting);
            });
        }, 100);

        return () => clearTimeout(timeout);
    }, [slides, currentSlideIndex, isPresenting, theme, chartData]);

    // Presentation Navigation
    const nextSlide = () => setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
    const prevSlide = () => setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
    const togglePresentation = () => {
        setIsPresenting(!isPresenting);
        // If entering presentation, ensure we are on current slide (already shared state)
    };


    return (
        <div className="flex flex-col h-[85vh] min-h-[600px] bg-slate-50/50 rounded-[30px] overflow-hidden border border-slate-200 shadow-sm">
            {/* Toolbar Area */}
            <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Editor de Diapositivas</h3>
                    <div className="h-4 w-px bg-slate-200"></div>
                    {/* Editor Toolbar (Text formatting) */}
                    {!isPresenting && (
                        <ReportEditorToolbar
                            editor={editor}
                            onOpenSectionBuilder={() => setShowInsightBuilder(true)}
                        />
                    )}
                </div>

                <button
                    onClick={togglePresentation}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                >
                    <Maximize2 size={14} /> Presentar
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Sidebar (Thumbnails) */}
                <div className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col">
                    <div className="p-4 overflow-y-auto flex-1 space-y-3">
                        {slides.map((slide, idx) => (
                            <div
                                key={idx}
                                onClick={() => setCurrentSlideIndex(idx)}
                                className={cn(
                                    "p-3 rounded-xl border-2 cursor-pointer transition-all relative group touch-none", // touch-none for DnD later
                                    currentSlideIndex === idx
                                        ? "bg-white border-purple-500 shadow-md ring-2 ring-purple-100"
                                        : "bg-white border-transparent hover:border-slate-300"
                                )}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className={cn("text-[10px] font-bold uppercase", currentSlideIndex === idx ? "text-purple-600" : "text-slate-400")}>
                                        Slide {idx + 1}
                                    </span>
                                    <button
                                        onClick={(e) => deleteSlide(e, idx)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                {/* Mini Preview (Stripped HTML) */}
                                <div className="h-16 overflow-hidden text-[8px] text-slate-400 leading-tight select-none">
                                    <div dangerouslySetInnerHTML={{ __html: slide }} className="scale-50 origin-top-left w-[200%]" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                        <button
                            onClick={addSlide}
                            className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={14} /> Nueva Slide
                        </button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-slate-50 overflow-y-auto p-8 flex justify-center" ref={containerRef}>
                    <div className="w-full max-w-5xl">
                        <EditorContent editor={editor} />
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
                            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full hover:bg-white/20 transition-all">
                                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
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
                            "w-full max-w-5xl h-[80vh] flex items-center justify-center p-8 overflow-y-auto presentation-slide",
                            // Inject dark mode styles via class or style tag if needed
                            // Using a simple wrapper class approach
                        )}
                    >
                        <style>{`
                            .presentation-slide h1, .presentation-slide h2 { color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'}; }
                            .presentation-slide p { color: ${theme === 'dark' ? '#cbd5e1' : '#334155'}; }
                            .presentation-slide section { background: transparent !important; box-shadow: none !important; border: none !important; }
                         `}</style>
                        <div
                            className="w-full prose prose-xl max-w-none"
                            dangerouslySetInnerHTML={{ __html: slides[currentSlideIndex] }}
                        />
                    </div>
                </div>
            )}

            {/* Chart Builder Modal */}
            {/* Insight Builder Modal */}
            {showInsightBuilder && (
                <InsightBuilder
                    projectId={projectId}
                    dateRange={dateRange}
                    onClose={() => setShowInsightBuilder(false)}
                    onInsert={handleInsertInsight}
                />
            )}
        </div>
    );
}

// Helper to render chart (simplified from original)

function renderChart(canvas: HTMLCanvasElement, type: string | null, chartData: any, theme: string, isPresenting: boolean) {
    if (!type || !chartData) return;

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: theme === 'dark' && isPresenting ? '#cbd5e1' : '#475569',
                    font: { family: 'Inter', size: 11, weight: 600 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                padding: 10,
                cornerRadius: 8,
                displayColors: true
            }
        },
        scales: {
            x: {
                ticks: { color: theme === 'dark' && isPresenting ? '#94a3b8' : '#64748b', font: { family: 'Inter', size: 10 } },
                grid: { color: theme === 'dark' && isPresenting ? '#334155' : '#f1f5f9', drawBorder: false }
            },
            y: {
                ticks: { color: theme === 'dark' && isPresenting ? '#94a3b8' : '#64748b', font: { family: 'Inter', size: 10 } },
                grid: { color: theme === 'dark' && isPresenting ? '#334155' : '#f1f5f9', drawBorder: false }
            }
        }
    };

    // Handle "Insight" charts (Dynamic Config from SlideLayouts)
    if (type === 'insight' || type === 'custom') {
        const configStr = canvas.parentElement?.getAttribute('data-chart-config');
        if (configStr) {
            try {
                const config = JSON.parse(configStr);

                // Mapper for InsightBuilder simplifie config to Chart.js
                let type = config.type || 'bar';
                let datasets = [];
                let labels = [];

                if (config.type === 'bubble') {
                    type = 'bubble';
                    // Bubble data structure: { x, y, r, label }
                    // Chart.js expects data: [{x,y,r}]
                    // config.data.bubbleData should be passed from InsightBuilder
                    datasets = [{
                        label: config.title || 'Oportunidades',
                        data: config.data.bubbleData || [],
                        backgroundColor: 'rgba(139, 92, 246, 0.6)',
                        borderColor: '#8b5cf6',
                        borderWidth: 1
                    }];
                    // Bubbles don't strictly need labels array on X, but tooltip needs them
                } else {
                    // Standard Bar/Line
                    // If complex structure (InsightBuilder) vs Simple (Custom)
                    if (config.data && config.data.items) {
                        // It's from InsightBuilder
                        labels = config.data.items.map((i: any) => i.key.substring(0, 15) + '...');
                        datasets = [{
                            label: 'Clicks',
                            data: config.data.items.map((i: any) => i.clicks),
                            backgroundColor: '#8b5cf6',
                            borderRadius: 4
                        },
                        {
                            label: 'Impresiones (x100)',
                            data: config.data.items.map((i: any) => i.impressions / 100), // Scale for visibility
                            backgroundColor: '#cbd5e1',
                            borderRadius: 4,
                            hidden: true // Hide by default to not clutter
                        }];
                    } else {
                        // Generic/Custom fallback
                        labels = config.labels || [];
                        datasets = config.datasets || [{
                            label: config.title || 'Datos',
                            data: config.data || [],
                            backgroundColor: '#8b5cf6',
                            borderColor: '#8b5cf6',
                        }];
                    }
                }

                new Chart(canvas, {
                    type,
                    data: {
                        labels,
                        datasets
                    },
                    options: {
                        ...commonOptions,
                        plugins: {
                            ...commonOptions.plugins,
                            title: { display: !!config.title, text: config.title, color: theme === 'dark' ? '#fff' : '#1e293b', font: { size: 14, weight: 'bold' } }
                        }
                    }
                });
            } catch (e) {
                console.error("Error parsing insight chart config", e);
            }
        }
        return;
    }


    // Legacy/Hardcoded Types
    if (type === 'trend') {
        const trendData = chartData.seoStatus?.monthlyTrend;
        const labels = trendData?.p2?.map((_: any, i: number) => `Día ${i + 1}`) || [];
        new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Anterior', data: trendData?.p1 || [], borderColor: '#94a3b8', borderDash: [5, 5], tension: 0.4, pointRadius: 0 },
                    { label: 'Actual', data: trendData?.p2 || [], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', fill: true, tension: 0.4, pointRadius: 2 }
                ]
            },
            options: commonOptions
        });
    } else if (type === 'clicks' || type === 'losers') {
        const metrics = chartData[type === 'clicks' ? 'topWinners' : 'topLosers'];
        if (metrics) {
            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: metrics.map((m: any) => m.name.substring(0, 30) + '...'),
                    datasets: [{
                        label: type === 'clicks' ? 'Subida' : 'Bajada',
                        data: metrics.map((m: any) => m.clicksChange),
                        backgroundColor: type === 'clicks' ? '#10b981' : '#ef4444',
                        borderRadius: 4
                    }]
                },
                options: { ...commonOptions, indexAxis: 'y' }
            });
        }
    }
}

