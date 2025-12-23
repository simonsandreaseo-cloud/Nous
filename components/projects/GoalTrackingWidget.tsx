import React, { useMemo } from 'react';
import { Project, Task, ContentGoal, Team, ProjectSettings } from '../../lib/task_manager';
import { AlertCircle, CheckCircle2, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface GoalTrackingWidgetProps {
    project: Project;
    tasks: Task[];
    currentDate: Date;
}

export const GoalTrackingWidget: React.FC<GoalTrackingWidgetProps> = ({ project, tasks, currentDate }) => {
    const { user } = useAuth();
    const settings = project.settings as ProjectSettings || {};
    const goals = settings.content_goals || [];
    const teams = settings.teams || [];

    const monthTasks = useMemo(() => {
        return tasks.filter(t => {
            if (!t.due_date || t.type !== 'content') return false;
            const d = new Date(t.due_date);
            return d.getMonth() === currentDate.getMonth() &&
                d.getFullYear() === currentDate.getFullYear();
        });
    }, [tasks, currentDate]);

    const activeGoals = useMemo(() => {
        return goals.map(goal => {
            let relevantTasks: Task[] = [];
            let label = "";

            if (goal.type === 'project') {
                relevantTasks = monthTasks;
                label = "Objetivo del Proyecto";
            } else if (goal.type === 'team') {
                const team = teams.find(t => t.id === goal.target_id);
                if (!team) return null;
                // Filter tasks assigned to team members
                relevantTasks = monthTasks.filter(t => t.assignee_id && team.member_ids.includes(t.assignee_id));
                label = `Equipo: ${team.name}`;
            } else if (goal.type === 'user') {
                // Filter tasks assigned to specific user
                if (goal.target_id !== user?.id && !project.role?.match(/owner|admin/)) return null; // Only show my goals or if admin
                relevantTasks = monthTasks.filter(t => t.assignee_id === goal.target_id);
                label = goal.target_id === user?.id ? "Mis Objetivos" : "Objetivo de Usuario";
            }

            if (!label) return null;

            const currentCount = relevantTasks.length;
            const currentWords = relevantTasks.reduce((sum, t) => sum + (t.metadata?.estimated_word_count || 0), 0);

            return {
                ...goal,
                label,
                currentCount,
                currentWords,
                metCount: !goal.monthly_count_target || currentCount >= goal.monthly_count_target,
                metWords: !goal.monthly_word_count_target || currentWords >= goal.monthly_word_count_target
            };
        }).filter(Boolean) as (ContentGoal & { label: string, currentCount: number, currentWords: number, metCount: boolean, metWords: boolean })[];
    }, [goals, monthTasks, teams, user, project.role]);

    if (activeGoals.length === 0) return null;

    // Filter to show only unmet or important goals to keep dashboard clean?
    // User said: "advertencia de que faltan contenidos por programar... no muy dramatica"
    const unmetGoals = activeGoals.filter(g => !g.metCount || !g.metWords);

    if (unmetGoals.length === 0) {
        // All good!
        /* return (
             <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-3 mb-4">
                 <CheckCircle2 className="text-emerald-500" size={20} />
                 <span className="text-sm text-emerald-700 font-medium">¡Todos los objetivos mensuales cumplidos!</span>
             </div>
         ); */
        return null; // Don't show anything if all good, to reduce noise? Or maybe a small badge.
    }

    return (
        <div className="grid gap-2 mb-4">
            {unmetGoals.map(goal => (
                <div key={goal.id} className="bg-amber-50 border border-amber-100/50 rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-amber-100 rounded-full text-amber-600">
                            <AlertCircle size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide opacity-80">{goal.label}</p>
                            <div className="flex gap-4 text-sm text-amber-900 font-medium">
                                {goal.monthly_count_target && (
                                    <span className={goal.metCount ? 'opacity-50' : ''}>
                                        {goal.currentCount} / {goal.monthly_count_target} contenidos
                                    </span>
                                )}
                                {goal.monthly_word_count_target && (
                                    <span className={goal.metWords ? 'opacity-50' : ''}>
                                        {goal.currentWords} / {goal.monthly_word_count_target} palabras
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
