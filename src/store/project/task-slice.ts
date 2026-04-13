import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import { ProjectStore, TaskActions } from './types';
import { NotificationService } from '@/lib/services/notifications';
import { Task } from '@/types/project';

const LIGHT_TASK_COLUMNS = `
    id, project_id, title, brief, scheduled_date, status, content_type, priority, 
    target_keyword, target_url_slug, metadata, volume, viability, 
    word_count, target_word_count, word_count_real, ai_percentage, docs_url, layout_status, outline_structure,
    creator_id, researcher_id, writer_id, corrector_id, assigned_to, 
    assigned_at, completed_at, created_at,
    seo_title, meta_description, h1, excerpt, language, content_body
`;

export const createTaskSlice: StateCreator<ProjectStore, [], [], TaskActions> = (set, get) => ({
    fetchProjectTasks: async (projectId) => {
        let activeIds = projectId ? [projectId] : get().activeProjectIds;
        activeIds = activeIds.filter(id => id && typeof id === 'string' && id.length === 36);

        if (activeIds.length === 0) {
            set({ tasks: [] });
            return;
        }

        const { data, error } = await supabase
            .from('tasks')
            .select(LIGHT_TASK_COLUMNS)
            .in('project_id', activeIds)
            .is('translation_parent_id', null)
            .order('scheduled_date', { ascending: true });

        if (error) {
            console.error('[Supabase Error] Error fetching tasks:', error);
            return;
        }

        set({ tasks: data as Task[] });
    },

    fetchTaskDetails: async (taskId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error) {
            console.error('Error fetching task details:', error);
            return null;
        }

        // Update local state to include full data for this task
        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? (data as Task) : t)
        }));

        return data as Task;
    },

    fetchTasksFullData: async (taskIds) => {
        if (!taskIds || taskIds.length === 0) return [];
        
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .in('id', taskIds);

        if (error) {
            console.error('Error fetching tasks full data:', error);
            return [];
        }

        return data as Task[];
    },

    validateStatusTransition: (task: Task, nextStatus: string) => {
        // Workflow flexibilizado según requerimientos previos
        return { valid: true };
    },

    addTask: async (newTask) => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                ...newTask,
                creator_id: user?.id,
                assigned_to: newTask.assigned_to || user?.id,
                assigned_at: (newTask.assigned_to || user?.id) ? new Date().toISOString() : null
            }])
            .select()
            .maybeSingle();

        if (error || !data) {
            NotificationService.error('Error al crear tarea', error?.message || 'No se pudo recuperar la tarea creada');
            return { data: null, error };
        }

        set(state => ({ tasks: [...state.tasks, data as Task] }));
        NotificationService.success('Tarea creada');
        return { data: data as Task, error: null };
    },

    updateTask: async (taskId, updates) => {
        const currentTask = get().tasks.find(t => t.id === taskId);
        
        // Automatic Tracking Logic
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        const finalUpdates: any = { ...updates };

        if (userId) {
            // Researcher Tracking
            if (updates.research_dossier && !currentTask?.researcher_id) {
                finalUpdates.researcher_id = userId;
                if (!currentTask?.assigned_to) {
                    finalUpdates.assigned_to = userId;
                    finalUpdates.assigned_at = new Date().toISOString();
                }
            }

            // Writer Tracking & Auto-Status
            if (updates.content_body !== undefined && updates.content_body.trim() !== '') {
                if (!currentTask?.writer_id) {
                    finalUpdates.writer_id = userId;
                    if (!currentTask?.assigned_to) {
                        finalUpdates.assigned_to = userId;
                        finalUpdates.assigned_at = new Date().toISOString();
                    }
                }
                
                if (!updates.status && (!currentTask?.status || ['idea', 'por_redactar', 'en_investigacion'].includes(currentTask.status))) {
                    finalUpdates.status = 'por_corregir';
                }
            }

            // Corrector Tracking
            const approvalStatuses = ['por_maquetar', 'publicado'];
            if (updates.status && approvalStatuses.includes(updates.status) && !currentTask?.corrector_id) {
                finalUpdates.corrector_id = userId;
            }
        }

        const { data, error } = await supabase
            .from('tasks')
            .update(finalUpdates)
            .eq('id', taskId)
            .select()
            .maybeSingle();

        if (error) {
            NotificationService.error('Error al actualizar tarea', error.message);
            return;
        }

        if (!data) {
            console.warn(`[TaskSlice] Update succeeded but row not returned for ID: ${taskId}. Possibly deleted or RLS restriction.`);
            return;
        }

        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? (data as Task) : t)
        }));
    },

    deleteTask: async (taskId) => {
        if (!taskId) return;
        
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            NotificationService.error('Error al eliminar tarea', `Asegúrate de que no haya dependencias: ${error.message}`);
            return;
        }

        set(state => ({ tasks: state.tasks.filter(t => t.id !== taskId) }));
        NotificationService.notify('Tarea eliminada correctamente');
    },

    selectiveDeleteTask: async (taskId, options) => {
        if (options.all) return get().deleteTask(taskId);

        const currentTask = get().tasks.find(t => t.id === taskId);
        if (!currentTask) return;

        const updates: any = {};
        
        if (options.research) {
            updates.research_dossier = {};
            updates.seo_title = "";
            updates.meta_description = "";
            updates.target_keyword = "";
            updates.volume = 0;
            updates.lsi_keywords = [];
            updates.status = 'idea';
        }

        if (options.writing) {
            updates.content_body = "";
            updates.outline_structure = {};
            updates.word_count = 0;
            updates.metadata = { 
                ...(currentTask.metadata || {}), 
                is_humanized: false, 
                humanized_at: null 
            };
            if (!options.research) {
                updates.status = 'por_redactar';
            }
        }

        if (options.images) {
            updates.metadata = { 
                ...(updates.metadata || currentTask.metadata || {}), 
                images: [] 
            };
        }

        if (options.translations) {
            // Delete all tasks that are translations of this one
            const { error: transError } = await supabase
                .from('tasks')
                .delete()
                .eq('translation_parent_id', taskId);
                
            if (transError) {
                console.error("Error deleting translation child tasks:", transError);
            }
        }

        if (options.research && options.writing) {
            updates.status = 'idea';
        }

        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId)
            .select()
            .maybeSingle();

        if (error) {
            NotificationService.error("Error al limpiar contenido", error.message);
            return;
        }

        if (!data) return;

        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? (data as Task) : t)
        }));
        NotificationService.success('Contenido limpiado correctamente');
    },

    deleteTasks: async (taskIds) => {
        if (!taskIds || taskIds.length === 0) return;
        
        const { error } = await supabase
            .from('tasks')
            .delete()
            .in('id', taskIds);

        if (error) {
            NotificationService.error('Error al eliminar tareas', error.message);
            return;
        }

        set(state => ({
            tasks: state.tasks.filter(t => !taskIds.includes(t.id))
        }));
        NotificationService.notify(`${taskIds.length} tareas eliminadas`);
    },

    updateTasks: async (taskIds, updates) => {
        if (!taskIds || taskIds.length === 0) return;

        const { error } = await supabase
            .from('tasks')
            .update(updates)
            .in('id', taskIds);

        if (error) {
            NotificationService.error('Error al actualizar tareas', error.message);
            return;
        }

        set(state => ({
            tasks: state.tasks.map(t => taskIds.includes(t.id) ? { ...t, ...updates } : t)
        }));
        NotificationService.notify('Tareas actualizadas');
    },

    fetchPersonalTasks: async () => {
        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
            .from('tasks')
            .select(LIGHT_TASK_COLUMNS)
            .eq('assigned_to', session.user.id)
            .order('scheduled_date', { ascending: true });

        if (error) {
            console.error('Error fetching personal tasks:', error);
            set({ isLoading: false });
            return;
        }

        set({ tasks: data as Task[], isLoading: false });
    },

    assignTask: async (taskId, userId) => {
        const updates: any = {
            assigned_to: userId,
            assigned_at: userId ? new Date().toISOString() : null
        };

        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId)
            .select()
            .maybeSingle();

        if (error || !data) {
            NotificationService.error('Error al asignar tarea', error?.message || 'Tarea no encontrada');
            return;
        }
        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? (data as Task) : t)
        }));
        NotificationService.notify('Tarea asignada');
    },

    claimTask: async (taskId) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await get().assignTask(taskId, session.user.id);
    },
});
