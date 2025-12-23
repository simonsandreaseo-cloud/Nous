import React from 'react';
import { FileText, TrendingUp, AlertCircle } from 'lucide-react';

interface SeoReportViewProps {
    item: any;
    accessLevel: 'view' | 'edit';
}

const SeoReportView: React.FC<SeoReportViewProps> = ({ item, accessLevel }) => {
    // Reports usually are static summaries with charts
    const { html, stats, date_range } = item.report_data || {};

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-12">
            <div className="bg-brand-power text-white p-8 rounded-3xl mb-12 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent blur-[100px] opacity-20 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="text-brand-accent" />
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

            <div className="prose prose-slate max-w-none prose-headings:text-brand-power prose-a:text-indigo-600">
                <div dangerouslySetInnerHTML={{ __html: html || '<p>No hay contenido disponible en este informe.</p>' }} />
            </div>

            {accessLevel === 'edit' && (
                <div className="mt-12 p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900">Modo Edición Limitado</h4>
                        <p className="text-sm text-amber-800/70">Los informes son generados por IA y actualmente solo soportan edición del título o notas adicionales. Para cambios profundos, contacta al propietario.</p>
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
