import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Project } from '../../lib/task_manager';
import { MindMap } from '../../components/projects/strategy/MindMap';
import { ImpactAnalysis } from '../../components/projects/strategy/ImpactAnalysis';

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

    // Quick fetch tasks for this view
    const [tasks, setTasks] = React.useState<any[]>([]);

    React.useEffect(() => {
        import('../../lib/task_manager').then(({ TaskService }) => {
            TaskService.getTasks(project.id).then(setTasks);
        });
    }, [project.id]);

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
                <h3 className="font-bold text-brand-power text-xl mb-4">Informes de Analista</h3>
                <p className="text-sm text-brand-power/50 mb-4">Aquí aparecerán los informes generados con la herramienta de Analista de Métricas.</p>
                <div className="flex gap-4">
                    <button className="px-4 py-2 bg-brand-soft text-brand-power font-bold rounded-lg text-xs uppercase tracking-wider opacity-50 cursor-not-allowed" title="Función no implementada">
                        Conectar Informe
                    </button>
                    <button
                        onClick={() => navigate(`/herramientas/generador-informes?projectId=${project.id}&url=${encodeURIComponent(project.gsc_property_url || '')}`)}
                        className="px-4 py-2 bg-brand-power text-brand-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-brand-accent hover:text-brand-power transition-colors shadow-lg"
                    >
                        Crear Informe
                    </button>
                </div>
            </section>
        </div>
    );
};

export default StrategyView;
