'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Chart } from 'chart.js/auto';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, Moon, Sun, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ReportViewProps {
    htmlContent: string;
    chartData: any;
}

export function ReportView({ htmlContent, chartData }: ReportViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const presentationRef = useRef<HTMLDivElement>(null);

    // Presentation State
    const [isPresenting, setIsPresenting] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Split content into slides based on <section> tags
    const slides = useMemo(() => {
        if (!htmlContent) return [];
        // Extract content inside <section> tags. 
        // Logic: Split by <section and rejoin to keep tags, or better: use DOMParser
        if (typeof window === 'undefined') return [htmlContent];

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const sections = Array.from(doc.querySelectorAll('section'));

        if (sections.length === 0) return [htmlContent]; // Fallback if no sections found
        return sections.map(s => s.outerHTML);
    }, [htmlContent]);

    // Handle Charts rendering
    useEffect(() => {
        // We render charts in BOTH normal view and presentation view
        // The container changes based on mode
        const root = isPresenting ? presentationRef.current : containerRef.current;
        if (!root) return;

        const placeholders = root.querySelectorAll('.chart-placeholder');

        placeholders.forEach((el) => {
            // Check if already initialized to avoid double render
            if (el.querySelector('canvas')) return;

            const type = el.getAttribute('data-chart-type');

            const canvas = document.createElement('canvas');
            // Adjust height for presentation
            canvas.style.maxHeight = isPresenting ? '60vh' : '400px';
            canvas.style.width = '100%';

            el.innerHTML = '';
            el.appendChild(canvas);

            // Chart Configuration Logic
            const commonOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: theme === 'dark' && isPresenting ? '#cbd5e1' : '#475569' } }
                },
                scales: {
                    x: { ticks: { color: theme === 'dark' && isPresenting ? '#94a3b8' : '#64748b' }, grid: { color: theme === 'dark' && isPresenting ? '#334155' : '#e2e8f0' } },
                    y: { ticks: { color: theme === 'dark' && isPresenting ? '#94a3b8' : '#64748b' }, grid: { color: theme === 'dark' && isPresenting ? '#334155' : '#e2e8f0' } }
                }
            };

            // TREND CHART
            if (type === 'trend') {
                const trendData = chartData.seoStatus?.monthlyTrend;
                const labels = trendData?.p2?.map((_: any, i: number) => `Día ${i + 1}`) || [];

                new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [
                            {
                                label: 'Periodo Anterior',
                                data: trendData?.p1 || [],
                                borderColor: '#94a3b8',
                                borderDash: [5, 5],
                                tension: 0.4,
                                pointRadius: 0
                            },
                            {
                                label: 'Periodo Actual',
                                data: trendData?.p2 || [],
                                borderColor: '#8b5cf6',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 2
                            }
                        ]
                    },
                    options: commonOptions
                });
                return;
            }

            // WINNERS/LOSERS BAR CHART
            const metrics = chartData[type === 'clicks' ? 'topWinners' : 'topLosers'];
            if (!metrics) return;

            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: metrics.map((m: any) => m.name.substring(0, 30) + '...'),
                    datasets: [{
                        label: type === 'clicks' ? 'Cambio en Clics' : 'Caída en Clics',
                        data: metrics.map((m: any) => m.clicksChange),
                        backgroundColor: type === 'clicks' ? '#10b981' : '#ef4444',
                        borderRadius: 4
                    }]
                },
                options: {
                    ...commonOptions,
                    indexAxis: 'y' as const
                }
            });
        });

        // Cleanup function (optional if we want to destroy charts, 
        // but Chart.js usually handles canvas replacement fine or we can track instances)

    }, [htmlContent, chartData, isPresenting, currentSlide, theme]);

    // Fullscreen Toggle
    const togglePresentation = () => {
        if (!isPresenting) {
            setIsPresenting(true);
            setCurrentSlide(0);
            document.body.style.overflow = 'hidden';
            // Request fullscreen
            document.documentElement.requestFullscreen().catch(e => console.log(e));
        } else {
            setIsPresenting(false);
            document.body.style.overflow = '';
            if (document.fullscreenElement) document.exitFullscreen().catch(e => console.log(e));
        }
    };

    // Slides Navigation
    const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
    const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

    // Keyboard Support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPresenting) return;
            if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === 'Escape') togglePresentation();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPresenting, slides.length]);


    // CSS Override for Dark Mode Presentation
    // We inject a style tag to override tailwind classes inside the innerHTML content
    const darkModeStyles = `
        .dark-mode-override section { background-color: #0f172a !important; color: #f8fafc !important; box-shadow: none !important; }
        .dark-mode-override h1, .dark-mode-override h2, .dark-mode-override h3 { color: #f8fafc !important; }
        .dark-mode-override p { color: #cbd5e1 !important; }
        .dark-mode-override code { background-color: #1e293b !important; color: #38bdf8 !important; }
        .dark-mode-override table { color: #cbd5e1 !important; }
        .dark-mode-override thead { background-color: #1e293b !important; color: #f8fafc !important; }
        .dark-mode-override tr:hover { background-color: #1e293b !important; }
        .dark-mode-override td, .dark-mode-override th { border-color: #334155 !important; }
    `;

    return (
        <div className="relative">
            {/* Toolbar */}
            <div className="absolute top-0 right-0 -mt-16 flex gap-2">
                <button
                    onClick={togglePresentation}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                >
                    <Maximize2 size={14} /> Modo Presentación
                </button>
            </div>

            {/* Normal View */}
            <div
                ref={containerRef}
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {/* Presentation Overlay */}
            {isPresenting && (
                <div className={cn(
                    "fixed inset-0 z-[100] flex flex-col justify-center items-center transition-colors duration-500",
                    theme === 'dark' ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"
                )}>
                    {theme === 'dark' && <style>{darkModeStyles}</style>}

                    {/* Controls Header */}
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-black uppercase tracking-widest opacity-50">
                                Slide {currentSlide + 1} / {slides.length}
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

                    {/* Controls Footer (Navigation) */}
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-8 z-10">
                        <button onClick={prevSlide} disabled={currentSlide === 0} className="p-4 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 backdrop-blur-md transition-all disabled:opacity-30 disabled:hover:scale-100">
                            <ChevronLeft size={32} />
                        </button>
                        <button onClick={nextSlide} disabled={currentSlide === slides.length - 1} className="p-4 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 backdrop-blur-md transition-all disabled:opacity-30 disabled:hover:scale-100">
                            <ChevronRight size={32} />
                        </button>
                    </div>

                    {/* SLIDE CONTENT */}
                    <div
                        ref={presentationRef}
                        className={cn(
                            "w-full max-w-5xl h-[80vh] flex items-center justify-center p-8 overflow-y-auto hide-scrollbar presentation-slide",
                            theme === 'dark' ? "dark-mode-override" : ""
                        )}
                    >
                        <div
                            className="w-full prose prose-xl max-w-none transform transition-all duration-500 ease-out"
                            dangerouslySetInnerHTML={{ __html: slides[currentSlide] }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
