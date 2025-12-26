import React, { useState, useEffect } from 'react';
import { HeliosReport, HeliosSection } from '../types/heliosSchema';
import { ChartRenderer } from './ChartRenderer';
import { Save, RefreshCw, Trash2, Plus, GripVertical } from 'lucide-react';

interface ReportEditorProps {
    initialReport: HeliosReport;
    onSave: (report: HeliosReport) => void;
    isSaving?: boolean;
}

export const ReportEditor: React.FC<ReportEditorProps> = ({ initialReport, onSave, isSaving }) => {
    const [report, setReport] = useState<HeliosReport>(initialReport);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // Sync if initialReport changes (e.g. re-run analysis)
    useEffect(() => {
        setReport(initialReport);
    }, [initialReport]);

    const handleSummaryChange = (newSummary: string) => {
        setReport(prev => ({ ...prev, executiveSummary: newSummary }));
    };

    const handleSectionChange = (index: number, field: keyof HeliosSection, value: any) => {
        const newSections = [...report.sections];
        newSections[index] = { ...newSections[index], [field]: value };
        setReport(prev => ({ ...prev, sections: newSections }));
    };

    const handleBulletChange = (sectionIndex: number, bulletIndex: number, value: string) => {
        const newSections = [...report.sections];
        if (newSections[sectionIndex].bullets) {
            const newBullets = [...newSections[sectionIndex].bullets!];
            newBullets[bulletIndex] = value;
            newSections[sectionIndex] = { ...newSections[sectionIndex], bullets: newBullets };
            setReport(prev => ({ ...prev, sections: newSections }));
        }
    };

    const deleteBullet = (sectionIndex: number, bulletIndex: number) => {
        const newSections = [...report.sections];
        if (newSections[sectionIndex].bullets) {
            const newBullets = newSections[sectionIndex].bullets!.filter((_, i) => i !== bulletIndex);
            newSections[sectionIndex] = { ...newSections[sectionIndex], bullets: newBullets };
            setReport(prev => ({ ...prev, sections: newSections }));
        }
    };

    const addBullet = (sectionIndex: number) => {
        const newSections = [...report.sections];
        const currentBullets = newSections[sectionIndex].bullets || [];
        newSections[sectionIndex] = { ...newSections[sectionIndex], bullets: [...currentBullets, "Nuevo insight..."] };
        setReport(prev => ({ ...prev, sections: newSections }));
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">

            {/* Global Actions Toolbar */}
            <div className="sticky top-32 z-20 flex justify-end gap-2 mb-4 pointer-events-none">
                <div className="pointer-events-auto bg-white p-2 rounded-xl shadow-lg border border-slate-100 flex gap-2">
                    <button
                        onClick={() => onSave(report)}
                        disabled={isSaving}
                        className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                        <Save size={16} />
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            {/* Executive Summary Editor */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Resumen Ejecutivo (Editable)</h3>
                <textarea
                    value={report.executiveSummary}
                    onChange={(e) => handleSummaryChange(e.target.value)}
                    className="w-full text-2xl font-light text-slate-800 leading-relaxed bg-transparent border-none focus:ring-0 focus:outline-none resize-none pt-0 relative z-10 placeholder:text-slate-300 min-h-[150px]"
                    placeholder="Escribe el resumen ejecutivo aquí..."
                />
            </div>

            {/* Sections Editor */}
            <div className="grid grid-cols-1 gap-12">
                {report.sections?.map((section, idx) => (
                    <div key={idx} className="group/section">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-bold group-hover/section:bg-indigo-600 group-hover/section:text-white transition-colors">
                                    {idx + 1}
                                </span>
                                <input
                                    value={section.title}
                                    onChange={(e) => handleSectionChange(idx, 'title', e.target.value)}
                                    className="bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none w-full max-w-md"
                                />
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Text Content Editor */}
                            <div className="space-y-6">
                                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm leading-relaxed text-slate-600">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Análisis</h4>
                                    <textarea
                                        value={section.summary}
                                        onChange={(e) => handleSectionChange(idx, 'summary', e.target.value)}
                                        className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-slate-600 text-sm leading-relaxed"
                                    />

                                    {/* Bullets Editor */}
                                    <div className="mt-6 space-y-3">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                                            Insights Clave
                                            <button onClick={() => addBullet(idx)} className="text-indigo-500 hover:bg-indigo-50 p-1 rounded">
                                                <Plus size={14} />
                                            </button>
                                        </h4>
                                        {section.bullets?.map((bullet, bulletIdx) => (
                                            <div key={bulletIdx} className="flex gap-2 items-start group/bullet">
                                                <span className="text-indigo-500 mt-1.5">•</span>
                                                <div className="flex-1 relative">
                                                    <textarea
                                                        value={bullet}
                                                        onChange={(e) => handleBulletChange(idx, bulletIdx, e.target.value)}
                                                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-slate-700 text-sm overflow-hidden"
                                                        rows={Math.max(1, Math.ceil(bullet.length / 60))}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => deleteBullet(idx, bulletIdx)}
                                                    className="opacity-0 group-hover/bullet:opacity-100 text-slate-300 hover:text-rose-500 transition-all pt-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Charts (Read-only for now, but draggable in future?) */}
                            <div className="space-y-6">
                                {section.charts?.map((chart: any, cIdx: number) => (
                                    <div key={cIdx} className="bg-white p-2 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group/chart">
                                        {/* <div className="absolute top-2 right-2 opacity-0 group-hover/chart:opacity-100 z-10 flex gap-1">
                                            <div className="bg-white rounded-lg shadow border border-slate-100 p-1 cursor-move">
                                                <GripVertical size={14} className="text-slate-400" />
                                            </div>
                                        </div> */}
                                        <ChartRenderer config={chart} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
