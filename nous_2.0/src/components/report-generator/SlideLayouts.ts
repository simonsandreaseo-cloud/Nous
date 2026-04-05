
export const SlideLayouts = {
    /**
     * Standard Title Slide with a modern gradient accent
     */
    TitleSlide: (title: string, subtitle: string, date: string) => `
        <section class="report-slide bg-white h-full relative overflow-hidden flex flex-col justify-center p-20">
            <div class="absolute top-0 right-0 w-80 h-80 bg-purple-50 rounded-bl-full opacity-40 -mr-20 -mt-20"></div>
            <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/30 rounded-tr-full opacity-40 -ml-32 -mb-24"></div>
            
            <div class="relative z-10 max-w-4xl">
                <div class="inline-block px-5 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-xl shadow-slate-900/10">
                    Estrategia SEO Global
                </div>
                <h1 class="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-8 italic uppercase">
                    ${title}
                </h1>
                <p class="text-2xl text-slate-500 font-medium mb-12 max-w-2xl leading-relaxed">
                    ${subtitle}
                </p>
                <div class="flex items-center gap-6">
                    <div class="h-1 w-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"></div>
                    <div class="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
                        ${date}
                    </div>
                </div>
            </div>
            
            <div class="absolute bottom-12 right-12">
                <div class="w-16 h-16 border-4 border-slate-100/50 rounded-full flex items-center justify-center">
                    <div class="w-8 h-8 bg-slate-100 rounded-full"></div>
                </div>
            </div>
        </section>
    `,

    /**
     * Split Layout: Chart on Left, Analysis/Text on Right
     */
    SplitChartAnalysis: (title: string, chartConfig: any, analysisHtml: string, metricsHtml?: string) => `
        <section class="report-slide bg-white h-full relative overflow-hidden p-12 flex flex-col">
            <div class="flex items-center justify-between mb-10 shrink-0">
               <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                  </div>
                  <h2 class="text-3xl font-black text-slate-900 tracking-tighter uppercase italic gradient-text">${title}</h2>
               </div>
               <div class="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black uppercase text-slate-400 tracking-widest">Análisis Profundo</div>
            </div>

            <div class="flex-1 grid grid-cols-12 gap-10 min-h-0">
                <!-- Left: Visuals (Chart + Metrics) -->
                <div class="col-span-7 flex flex-col gap-6 h-full">
                    
                    ${metricsHtml ? `
                    <div class="grid grid-cols-2 gap-4">
                        ${metricsHtml}
                    </div>
                    ` : ''}

                    <div class="chart-container-premium flex-1 group">
                        <div class="absolute top-6 right-6 flex gap-2">
                             <div class="h-2 w-2 rounded-full bg-purple-400"></div>
                             <div class="h-2 w-2 rounded-full bg-indigo-400"></div>
                        </div>
                        <!-- Chart Container -->
                        <div class="chart-placeholder w-full h-full min-h-[300px]" 
                             data-chart-type="insight" 
                             data-chart-config='${JSON.stringify(chartConfig).replace(/'/g, "&apos;")}'>
                        </div>
                    </div>
                </div>

                <!-- Right: Analysis/Text -->
                <div class="col-span-5 flex flex-col h-full overflow-hidden">
                    <div class="report-card h-full flex flex-col bg-slate-50/30">
                        <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 italic">Visualización y Estrategia</h3>
                        <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                           <div class="prose prose-slate prose-sm text-slate-600 leading-relaxed font-medium">
                               ${analysisHtml}
                           </div>
                        </div>
                        <div class="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                            <span class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Powered by Gemini Pro</span>
                            <div class="flex -space-x-2">
                                <div class="w-6 h-6 rounded-full bg-purple-100 border-2 border-white"></div>
                                <div class="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `,

    /**
     * Full Table View for "Top Pages" or "Top Queries"
     */
    TableDashboard: (title: string, tableRowsHtml: string) => `
        <section class="report-slide bg-white h-full relative overflow-hidden p-12 flex flex-col">
            <div class="flex items-center justify-between mb-10 shrink-0">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/></svg>
                    </div>
                    <div>
                        <h2 class="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">${title}</h2>
                        <p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Evidence Cluster v2.0</p>
                    </div>
                </div>
                <div class="px-6 py-2 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest">Dataset Completo</div>
            </div>

            <div class="flex-1 overflow-hidden rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col bg-white">
                <div class="overflow-auto flex-1 custom-scrollbar">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th class="text-left">Elemento Clave</th>
                                <th class="text-right">Clicks</th>
                                <th class="text-right hidden sm:table-cell">Impresiones</th>
                                <th class="text-right">CTR %</th>
                                <th class="text-right">Pos.</th>
                                <th class="text-right">Fluctuación</th>
                            </tr>
                        </thead>
                        <tbody>
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
        const trendClass = trend === 'up' ? 'metric-pill-up' : trend === 'down' ? 'metric-pill-down' : 'bg-slate-50 text-slate-400';
        return `
        <div class="report-card !p-6 flex flex-col justify-between group hover:!border-purple-200">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">${label}</span>
            <div class="flex items-baseline justify-between">
                <span class="text-4xl font-black text-slate-900 tracking-tighter">${value}</span>
                ${subtext ? `<div class="metric-pill ${trendClass} scale-90 origin-right">${subtext}</div>` : ''}
            </div>
        </div>
        `;
    },

    /**
     * Helper for Table Rows
     */
    TableRow: (item: any) => `
        <tr class="group">
            <td class="font-mono text-[11px] text-slate-500 max-w-[250px] truncate group-hover:text-purple-600 transition-colors">
                ${item.key}
            </td>
            <td class="text-right font-black text-slate-700">${item.clicks.toLocaleString()}</td>
            <td class="text-right text-slate-400 font-medium hidden sm:table-cell">${item.impressions.toLocaleString()}</td>
            <td class="text-right text-slate-500 font-bold">${item.ctr.toFixed(1)}%</td>
            <td class="text-right"><span class="px-2 py-1 bg-slate-100 rounded-lg font-black text-slate-600">${item.position.toFixed(1)}</span></td>
            <td class="text-right">
                <span class="font-black ${item.changeClicks > 0 ? 'text-emerald-500' : item.changeClicks < 0 ? 'text-rose-500' : 'text-slate-300'}">
                    ${item.changeClicks > 0 ? '↑' : item.changeClicks < 0 ? '↓' : '•'} ${Math.abs(item.changeClicks)}
                </span>
            </td>
        </tr>
    `
};
