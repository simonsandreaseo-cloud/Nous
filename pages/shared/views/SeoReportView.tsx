import React from 'react';
import { FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { UnifiedReportRenderer } from '../../../components/tools/MetricsAnalyst/components/UnifiedReportRenderer';
import { ChartData, ReportSection } from '../../../components/tools/MetricsAnalyst/types';

interface SeoReportViewProps {
    item: any;
    accessLevel: 'view' | 'edit';
}

const SeoReportView: React.FC<SeoReportViewProps> = ({ item, accessLevel }) => {
    // Reports usually are static summaries with charts
    const { html, stats, date_range, sections, rawChartData } = item.report_data || {};

    // Prepare sections: Use saved sections or fallback to legacy HTML wrapped in a text section
    const displaySections: ReportSection[] = sections || (html ? [{
        id: 'legacy-content',
        type: 'text',
        title: 'Reporte Generado',
        content: html,
        order: 0,
        isEditable: false
    }] : []);

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-12 font-sans">
            <div className="bg-slate-900 text-white p-8 rounded-3xl mb-12 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 blur-[100px] opacity-20 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="text-indigo-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-white/50">Informe SEO Consolidado</span>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{item.domain || 'Análisis de Dominio'}</h2>
                    <p className="text-white/60 font-medium">Periodo analizado: {date_range || 'N/A'}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 relative z-10">
                    <StatBox label="Impresiones" value={stats?.impressions || '0'} trend={stats?.impressionsTrend} />
                    <StatBox label="Clics" value={stats?.clicks || '0'} trend={stats?.clicksTrend} />
                    <StatBox label="CTR Medio" value={stats?.ctr || '0%'} trend={stats?.ctrTrend} />
                    <StatBox label="Posición" value={stats?.position || '0'} trend={stats?.positionTrend} />
                </div>
            </div>

            <div className="min-h-[500px]">
                {displaySections.length > 0 ? (
                    <UnifiedReportRenderer
                        sections={displaySections}
                        chartData={(rawChartData || {}) as ChartData}
                        isReadOnly={true}
                        onSectionsChange={() => { }}
                    />
                ) : (
                    <div className="bg-white p-12 rounded-2xl text-center text-slate-500 border border-slate-200">
                        <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-lg font-medium">No hay contenido disponible para visualizar.</p>
                    </div>
                )}
            </div>

            {accessLevel === 'edit' && (
                <div className="mt-12 p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900">Modo Visor</h4>
                        <p className="text-sm text-amber-800/70">Este visor es de solo lectura. Para editar el contenido, utiliza el Analista de Métricas principal.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatBox = ({ label, value, trend }: any) => (
    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {trend !== undefined && (
            <p className={`text-[10px] font-bold mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
            </p>
        )}
    </div>
);

export default SeoReportView;
