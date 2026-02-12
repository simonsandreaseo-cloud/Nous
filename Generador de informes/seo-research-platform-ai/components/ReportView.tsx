import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { ChartData, ComparisonItem } from '../types';

interface ReportViewProps {
    htmlContent: string;
    chartData: ChartData | null;
    p1Name: string;
    p2Name: string;
    onRegenerate: (message: string) => void;
    isRegenerating: boolean;
}

export const ReportView: React.FC<ReportViewProps> = ({ htmlContent, chartData, p1Name, p2Name, onRegenerate, isRegenerating }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartInstances = useRef<Chart[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        // Cleanup old charts
        chartInstances.current.forEach(c => c.destroy());
        chartInstances.current = [];

        if (!containerRef.current || !chartData) return;

        // Find placeholders
        const placeholders = containerRef.current.querySelectorAll('.chart-placeholder');
        
        placeholders.forEach((el) => {
            const div = el as HTMLDivElement;
            const url = div.dataset.chartUrl;
            const type = div.dataset.chartType || 'clicks';
            
            if (!url) return;

            // Robust Lookup
            const normalize = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase().trim();
            const target = normalize(url);
            
            // Try direct lookup first (fast)
            let dataItem = chartData.chartLookup[target];
            
            // If not found, try partial matching on keys
            if (!dataItem) {
                const foundKey = Object.keys(chartData.chartLookup).find(k => k.includes(target) || target.includes(k));
                if (foundKey) dataItem = chartData.chartLookup[foundKey];
            }

            if (dataItem) {
                div.innerHTML = '';
                div.style.height = '300px'; 
                const canvas = document.createElement('canvas');
                div.appendChild(canvas);
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const newChart = createChart(ctx, dataItem, type, p1Name, p2Name);
                    chartInstances.current.push(newChart);
                }
            } else {
                div.innerHTML = `<div class="flex items-center justify-center h-full bg-gray-50 text-gray-400 text-xs rounded border border-dashed border-gray-300">Gráfico no disponible para ${url}</div>`;
            }
        });

    }, [htmlContent, chartData, p1Name, p2Name]);

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            onRegenerate(chatInput);
            setChatInput('');
        }
    };

    const handlePrint = () => {
        // 1. Exit Edit Mode
        setIsEditing(false);
        
        // 2. Wait for React to render (close textareas, etc)
        setTimeout(() => {
            // 3. Trigger Print
            window.print();
        }, 300);
    };

    return (
        <div className="space-y-6">
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur shadow-sm border-b border-gray-200 p-4 rounded-lg flex justify-between items-center no-print">
                <h2 className="text-xl font-bold text-gray-900">Informe de Investigación SEO</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition ${isEditing ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    >
                        {isEditing ? 'Terminar Edición' : 'Editar Texto'}
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="bg-gray-800 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-900 transition flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Exportar PDF
                    </button>
                </div>
            </div>

            <div 
                id="report-view"
                ref={containerRef}
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                className={`prose max-w-none ${isEditing ? 'outline-dashed outline-2 outline-blue-400 p-4 rounded bg-gray-50' : ''}`}
                dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />

            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 sticky bottom-4 z-20 no-print">
                <form onSubmit={handleChatSubmit} className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Chat con el Informe</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            disabled={isRegenerating}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ej: 'Hazlo más formal', 'Ignora la caída en /blog/', 'Resume más'..."
                            className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500"
                        />
                        <button 
                            type="submit"
                            disabled={isRegenerating || !chatInput.trim()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRegenerating ? 'Pensando...' : 'Actualizar Informe'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

function createChart(ctx: CanvasRenderingContext2D, data: ComparisonItem, type: string, p1Name: string, p2Name: string) {
    const isPos = type === 'position';
    const dataP1 = isPos ? data.dailySeriesPositionP1 : data.dailySeriesClicksP1;
    const dataP2 = isPos ? data.dailySeriesPositionP2 : data.dailySeriesClicksP2;
    const labelMain = isPos ? 'Posición' : 'Clics';
    const color = isPos ? 'rgba(239, 68, 68, 1)' : 'rgba(59, 130, 246, 1)';
    const maxDays = Math.max(dataP1.length, dataP2.length);
    const labels = Array.from({ length: maxDays }, (_, i) => `Día ${i + 1}`);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: `${p1Name} (${labelMain})`,
                    data: dataP1,
                    borderColor: 'rgba(156, 163, 175, 0.5)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: `${p2Name} (${labelMain})`,
                    data: dataP2,
                    borderColor: color,
                    backgroundColor: color.replace('1)', '0.1)'),
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    reverse: isPos,
                    beginAtZero: !isPos,
                }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}