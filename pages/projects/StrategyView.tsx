import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Project } from '../../lib/task_manager';
import { MindMap } from '../../components/projects/strategy/MindMap';
import { ImpactAnalysis } from '../../components/projects/strategy/ImpactAnalysis';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Clock, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StrategyView: React.FC = () => {
    // We assume context provides functionality to update project and access tasks?
    // ProjectLayout context might need to expose tasks too or we fetch them. 
    // Actually ProjectLayout currently only exposes { project, loadProject }.
    // We need 'tasks' to be passed or fetched. 
    // Let's modify ProjectLayout to also fetch/provide tasks OR fetch them here.
    // Given the architecture, fetching here or using a Hook is better.
    // But for MVP speed, we'll cast the context and hope we update Layout or use local state.
    // Wait, let's look at ProjectLayout again. It doesn't fetch tasks.
    // ProjectDetail (old) did. 
    // I should update ProjectLayout to fetch tasks so they are available globally to sub-routes.

    // For now, I will assume we can fetch tasks here.
    const { project, loadProject } = useOutletContext<{ project: Project; loadProject: () => void }>();
    const navigate = useNavigate();

    const [tasks, setTasks] = React.useState<any[]>([]);
    const [reports, setReports] = React.useState<any[]>([]);
    const [isLoadingReports, setIsLoadingReports] = React.useState(true);
    const [selectedReport, setSelectedReport] = React.useState<any>(null);

    React.useEffect(() => {
        import('../../lib/task_manager').then(({ TaskService }) => {
            TaskService.getTasks(project.id).then(setTasks);
        });
        fetchReports();
    }, [project.id]);

    const fetchReports = async () => {
        setIsLoadingReports(true);
        try {
            const { data, error } = await supabase
                .from('seo_reports')
                .select('*')
                .eq('project_id', project.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setIsLoadingReports(false);
        }
    };

    const handleDeleteReport = async (id: number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este informe?')) return;
        try {
            const { error } = await supabase
                .from('seo_reports')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchReports();
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Error al eliminar el informe');
        }
    };

    return (
        <div className="space-y-12 pb-20">
            <header>
                <h1 className="text-3xl font-bold text-brand-power">Estrategia</h1>
                <p className="text-brand-power/50">Planificación, mapa mental y análisis de impacto.</p>
            </header>

            <section>
                <MindMap project={project} tasks={tasks} onUpdateProject={loadProject} />
            </section>

            <section>
                <ImpactAnalysis project={project} tasks={tasks} />
            </section>

            <section className="bg-white p-8 rounded-2xl shadow-sm border border-brand-power/5">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-bold text-brand-power text-xl">Informes de Analista</h3>
                        <p className="text-sm text-brand-power/50">Aquí aparecerán los informes generados con la herramienta de Analista de Métricas.</p>
                    </div>
                    <button
                        onClick={() => navigate(`/herramientas/generador-informes?projectId=${project.id}&url=${encodeURIComponent(project.gsc_property_url || '')}`)}
                        className="px-4 py-2 bg-brand-power text-brand-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-brand-accent hover:text-brand-power transition-colors shadow-lg flex items-center gap-2"
                    >
                        <Plus size={14} /> Crear Informe
                    </button>
                </div>

                {isLoadingReports ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => <div key={i} className="h-20 bg-brand-soft/20 rounded-xl animate-pulse" />)}
                    </div>
                ) : reports.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reports.map((report) => (
                            <div
                                key={report.id}
                                className="group p-4 bg-brand-soft/5 border border-brand-power/5 rounded-xl hover:border-brand-accent/30 hover:bg-brand-soft/10 transition-all flex flex-col justify-between"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <TrendingUp size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-brand-power text-sm line-clamp-1">{report.domain || 'Informe SEO'}</h4>
                                            <p className="text-[10px] text-brand-power/40 flex items-center gap-1 uppercase tracking-widest font-bold">
                                                <Clock size={10} /> {new Date(report.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDeleteReport(report.id)}
                                            className="p-1.5 text-brand-power/40 hover:text-red-500 hover:bg-white rounded-md transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedReport(report)}
                                        className="flex-1 px-3 py-1.5 bg-white border border-brand-power/10 text-brand-power text-[10px] font-bold uppercase tracking-widest rounded-lg hover:border-brand-accent hover:bg-brand-accent/5 transition-all"
                                    >
                                        Ver Informe
                                    </button>
                                    <button
                                        onClick={() => navigate(`/herramientas/generador-informes?projectId=${project.id}&reportId=${report.id}`)}
                                        className="px-3 py-1.5 bg-brand-power text-brand-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-brand-accent hover:text-brand-power transition-all"
                                    >
                                        Editar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-brand-power/5 rounded-2xl bg-brand-soft/5">
                        <TrendingUp className="mx-auto text-brand-power/10 mb-4" size={48} />
                        <p className="text-brand-power/40 text-sm font-medium">No se han encontrado informes para este proyecto.</p>
                        <p className="text-[10px] text-brand-power/30 uppercase tracking-widest font-bold mt-1">Usa el Analista de Métricas para generar uno.</p>
                    </div>
                )}
            </section>

            {/* Report Viewer Modal */}
            <AnimatePresence>
                {selectedReport && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedReport(null)}
                            className="absolute inset-0 bg-brand-power/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-brand-power/5 flex items-center justify-between bg-brand-soft/10">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                        <TrendingUp size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-brand-power">{selectedReport.domain || 'Informe SEO'}</h2>
                                        <p className="text-[10px] font-bold text-brand-power/40 uppercase tracking-widest">Generado el {new Date(selectedReport.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.print()}
                                        className="p-2 text-brand-power/40 hover:text-brand-power hover:bg-brand-soft/20 rounded-lg transition-colors"
                                        title="Imprimir / PDF"
                                    >
                                        <Clock size={20} /> {/* Using Clock as placeholder for Print if not imported */}
                                    </button>
                                    <button
                                        onClick={() => setSelectedReport(null)}
                                        className="p-2 text-brand-power/30 hover:text-brand-power hover:bg-brand-soft/20 rounded-lg transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto bg-slate-50">
                                <div className="max-w-4xl mx-auto py-12 px-6">
                                    {selectedReport.report_data?.stats && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                                            <ReportStat label="Impresiones" value={selectedReport.report_data.stats.impressions} trend={selectedReport.report_data.stats.impressionsTrend} />
                                            <ReportStat label="Clics" value={selectedReport.report_data.stats.clicks} trend={selectedReport.report_data.stats.clicksTrend} />
                                            <ReportStat label="CTR Medio" value={selectedReport.report_data.stats.ctr} trend={selectedReport.report_data.stats.ctrTrend} />
                                            <ReportStat label="Posición" value={selectedReport.report_data.stats.position} trend={selectedReport.report_data.stats.positionTrend} />
                                        </div>
                                    )}
                                    <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100 prose prose-slate max-w-none shadow-slate-200/50">
                                        <div
                                            className="report-content"
                                            dangerouslySetInnerHTML={{ __html: selectedReport.report_data?.html || '' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-brand-power/5 bg-white flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="px-6 py-2 border border-brand-power/10 text-brand-power font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-brand-soft/10 transition-colors"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={() => navigate(`/herramientas/generador-informes?projectId=${project.id}&reportId=${selectedReport.id}`)}
                                    className="px-6 py-2 bg-brand-power text-brand-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-all shadow-lg"
                                >
                                    Editar Informe
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
                .report-content h1 { font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; line-height: 1.2; }
                .report-content h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 2rem; margin-bottom: 1rem; border-left: 4px solid #4f46e5; padding-left: 1rem; }
                .report-content h3 { font-size: 1.25rem; font-weight: 700; color: #334155; margin-top: 1.5rem; margin-bottom: 0.75rem; }
                .report-content p { margin-bottom: 1.25rem; line-height: 1.7; color: #475569; }
                .report-content ul, .report-content ol { margin-bottom: 1.25rem; padding-left: 1.25rem; }
                .report-content li { margin-bottom: 0.5rem; color: #475569; }
                .report-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.875rem; }
                .report-content th { background: #f8fafc; padding: 0.75rem; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 700; }
                .report-content td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; }
                .report-content .highlight-positive { color: #059669; font-weight: 600; }
                .report-content .highlight-negative { color: #dc2626; font-weight: 600; }
            `}} />
        </div>
    );
};

const ReportStat = ({ label, value, trend }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value || '0'}</p>
        {trend !== undefined && (
            <p className={`text-[10px] font-bold mt-1 ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
        )}
    </div>
);

export default StrategyView;
