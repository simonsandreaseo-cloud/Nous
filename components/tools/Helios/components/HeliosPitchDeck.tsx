import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2, X } from 'lucide-react';
import { HeliosReport, HeliosSection } from '../types/heliosSchema';
import { ChartRenderer } from './ChartRenderer';

interface HeliosPitchDeckProps {
    report: HeliosReport;
    onClose: () => void;
}

export const HeliosPitchDeck: React.FC<HeliosPitchDeckProps> = ({ report, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    // Filter relevant sections for slides (ensure they have charts or summary)
    const slides = report.sections || [];
    const totalSlides = slides.length;

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % totalSlides);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);

    const currentSection = slides[currentSlide];

    if (totalSlides === 0) {
        return <div className="p-10 text-center text-white">No slides available to display.</div>;
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Header / Toolbar */}
            <div className="h-16 border-b border-slate-800 flex justify-between items-center px-6 bg-slate-950/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                    <h1 className="font-bold text-lg tracking-wide text-indigo-100 uppercase">
                        {report.title || 'Helios Executive Brief'}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400 font-mono">
                        SLIDE {currentSlide + 1} / {totalSlides}
                    </span>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Main Slide Content */}
            <div className="flex-1 relative flex items-center justify-center p-8 md:p-12">

                {/* Navigation Buttons */}
                <button
                    onClick={prevSlide}
                    className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-slate-800/80 hover:bg-indigo-600 transition-all hover:scale-110 z-10"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>

                <button
                    onClick={nextSlide}
                    className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-slate-800/80 hover:bg-indigo-600 transition-all hover:scale-110 z-10"
                >
                    <ChevronRight className="w-8 h-8" />
                </button>

                {/* Slide Card */}
                <div className="w-full max-w-6xl h-full flex flex-col md:flex-row gap-8 bg-slate-950/40 rounded-3xl border border-slate-800 p-8 shadow-2xl backdrop-blur-md">

                    {/* Left: Text & Key Points */}
                    <div className="flex-1 flex flex-col justify-center gap-6">
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
                                MODULE: {currentSection.title}
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                                {currentSection.title}
                            </h2>
                        </div>

                        <p className="text-xl text-slate-300 font-light leading-relaxed border-l-4 border-indigo-500 pl-6">
                            "{currentSection.summary}"
                        </p>

                        {/* Bullets (if available in schema extension) or default bullets */}
                        <div className="mt-4 space-y-4">
                            {(currentSection as any).bullets ? (
                                (currentSection as any).bullets.map((point: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="w-2 h-2 mt-2.5 rounded-full bg-emerald-400 shrink-0" />
                                        <span className="text-lg text-slate-200">{point}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-500 italic">Analysis complete. See chart for details.</div>
                            )}
                        </div>
                    </div>

                    {/* Right: Visualization */}
                    <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-inner flex flex-col overflow-hidden">
                        <div className="flex-1 w-full h-full min-h-[400px]">
                            {/* We use the same ChartRenderer but might need to adjust styles for dark mode transparency if needed, 
                                but Chart.js usually handles canvas well. We'll wrap it in a light container if chart requires it, 
                                or update ChartRenderer to support dark mode props. 
                                For now, let's keep it simple: White Chart Card inside Dark Slide.
                            */}
                            {currentSection.charts && currentSection.charts.length > 0 ? (
                                <div className="bg-white rounded-xl h-full p-4">
                                    <ChartRenderer config={currentSection.charts[0]} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-600">
                                    No Visual Data Available
                                </div>
                            )}
                        </div>
                        {/* Thumbnails if multiple charts exists? (Optional future feature) */}
                    </div>

                </div>
            </div>

            {/* Footer / Progress */}
            <div className="h-2 w-full bg-slate-800 mt-auto">
                <div
                    className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                    style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
                />
            </div>
        </div>
    );
};
