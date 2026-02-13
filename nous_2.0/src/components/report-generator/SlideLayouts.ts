
export const SlideLayouts = {
    /**
     * Standard Title Slide with a modern gradient accent
     */
    TitleSlide: (title: string, subtitle: string, date: string) => `
        <section class="report-slide bg-white h-full relative overflow-hidden flex flex-col justify-center p-16">
            <div class="absolute top-0 right-0 w-64 h-64 bg-purple-100 rounded-bl-full opacity-50 -mr-16 -mt-16"></div>
            <div class="absolute bottom-0 left-0 w-96 h-96 bg-slate-50 rounded-tr-full opacity-50 -ml-24 -mb-24"></div>
            
            <div class="relative z-10 max-w-4xl">
                <div class="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                    Reporte SEO
                </div>
                <h1 class="text-5xl md:text-6xl font-black text-slate-900 leading-tight mb-6">
                    ${title}
                </h1>
                <p class="text-2xl text-slate-500 font-light mb-12 max-w-2xl leading-relaxed">
                    ${subtitle}
                </p>
                <div class="border-t border-slate-200 pt-8 flex items-center gap-4">
                    <div class="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        ${date}
                    </div>
                </div>
            </div>
        </section>
    `,

    /**
     * Split Layout: Chart on Left, Analysis/Text on Right
     */
    SplitChartAnalysis: (title: string, chartConfig: any, analysisHtml: string, metricsHtml?: string) => `
        <section class="report-slide bg-white h-full relative overflow-hidden p-12 flex flex-col">
            <div class="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
               <h2 class="text-3xl font-black text-slate-800 tracking-tight">${title}</h2>
               <div class="flex gap-2">
                   <div class="h-2 w-2 rounded-full bg-purple-500"></div>
                   <div class="h-2 w-2 rounded-full bg-slate-200"></div>
                   <div class="h-2 w-2 rounded-full bg-slate-200"></div>
               </div>
            </div>

            <div class="flex-1 grid grid-cols-12 gap-8 min-h-0">
                <!-- Left: Visuals (Chart + Metrics) -->
                <div class="col-span-7 flex flex-col gap-6 h-full">
                    
                    ${metricsHtml ? `
                    <div class="grid grid-cols-2 gap-4">
                        ${metricsHtml}
                    </div>
                    ` : ''}

                    <div class="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col relative group">
                        <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                             <div class="bg-white p-2 rounded-lg shadow-sm border border-slate-200 text-xs font-bold text-slate-400">Interactivo</div>
                        </div>
                        <!-- Chart Container -->
                        <div class="chart-placeholder flex-1 w-full min-h-[300px]" 
                             data-chart-type="insight" 
                             data-chart-config='${JSON.stringify(chartConfig).replace(/'/g, "&apos;")}'>
                        </div>
                    </div>
                </div>

                <!-- Right: Analysis/Text -->
                <div class="col-span-5 flex flex-col h-full overflow-hidden">
                    <div class="bg-purple-50/50 rounded-2xl border border-purple-100 p-8 h-full overflow-y-auto prose prose-sm max-w-none">
                        <h3 class="text-purple-800 font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
                            <span class="bg-purple-200 p-1 rounded">✨</span> Análisis IA
                        </h3>
                        <div class="text-slate-600 leading-relaxed font-medium">
                            ${analysisHtml}
                        </div>
                    </div>
                </div>
            </div>
             <div class="absolute bottom-4 right-12 text-[10px] text-slate-300 font-mono">
                Generado por Nous SEO
            </div>
        </section>
    `,

    /**
     * Full Table View for "Top Pages" or "Top Queries"
     */
    TableDashboard: (title: string, tableRowsHtml: string) => `
        <section class="report-slide bg-white h-full relative overflow-hidden p-12 flex flex-col">
            <div class="flex items-center space-x-4 mb-8">
                <div class="p-3 bg-slate-100 rounded-xl">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-700"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                </div>
                <div>
                    <h2 class="text-2xl font-black text-slate-800">${title}</h2>
                    <p class="text-sm text-slate-400 font-medium">Desglose detallado de rendimiento</p>
                </div>
            </div>

            <div class="flex-1 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div class="overflow-auto flex-1">
                    <table class="w-full">
                        <thead class="bg-slate-50/80 backdrop-blur sticky top-0 z-10">
                            <tr>
                                <th class="py-4 pl-6 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Item</th>
                                <th class="py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Clicks</th>
                                <th class="py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 hidden sm:table-cell">Impr.</th>
                                <th class="py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">CTR</th>
                                <th class="py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Pos.</th>
                                <th class="py-4 pr-6 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Tendencia</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `,

    /**
     * Helper to generate a standardized Metric Card HTML
     */
    MetricCard: (label: string, value: string | number, subtext?: string, trend?: 'up' | 'down' | 'neutral') => {
        const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400';
        return `
        <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">${label}</span>
            <div class="flex items-end gap-2">
                <span class="text-3xl font-black text-slate-800 tracking-tight">${value}</span>
                ${subtext ? `<span class="text-xs font-bold ${trendColor} mb-1">${subtext}</span>` : ''}
            </div>
        </div>
        `;
    },

    /**
     * Helper for Table Rows
     */
    TableRow: (item: any) => `
        <tr class="hover:bg-slate-50/80 transition-colors group">
            <td class="py-3 pl-6 text-sm font-medium text-slate-700 truncate max-w-[200px] border-l-2 border-transparent group-hover:border-purple-500">
                ${item.key}
            </td>
            <td class="py-3 text-right text-sm text-slate-900 font-bold font-mono">${item.clicks.toLocaleString()}</td>
            <td class="py-3 text-right text-sm text-slate-500 font-mono hidden sm:table-cell">${item.impressions.toLocaleString()}</td>
            <td class="py-3 text-right text-sm text-slate-500 font-mono">${item.ctr.toFixed(1)}%</td>
            <td class="py-3 text-right text-sm text-slate-700 font-mono font-bold">${item.position.toFixed(1)}</td>
            <td class="py-3 pr-6 text-right">
                <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold ${item.changeClicks > 0 ? 'bg-emerald-50 text-emerald-600' : item.changeClicks < 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}">
                    ${item.changeClicks > 0 ? '+' : ''}${item.changeClicks}
                </span>
            </td>
        </tr>
    `
};
