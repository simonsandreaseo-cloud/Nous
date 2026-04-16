import { StateCreator } from 'zustand';
import { supabase } from '@/lib/supabase';
import { ProjectStore, TaskActions } from './types';
import { NotificationService } from '@/lib/services/notifications';
import { Task } from '@/types/project';

const LIGHT_TASK_COLUMNS = `
    id, project_id, title, brief, scheduled_date, status, content_type, priority, 
    target_keyword, target_url_slug, metadata, volume, viability, 
    word_count, target_word_count, word_count_real, ai_percentage, docs_url, layout_status,
    creator_id, researcher_id, writer_id, corrector_id, assigned_to, 
    assigned_at, completed_at, created_at,
    seo_title, meta_description, h1, excerpt, language
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
        // Fetch core metadata
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (taskError) {
            console.error('Error fetching task details:', taskError);
            return null;
        }

        // Fetch heavy data in parallel
        const [contentBody, researchData] = await Promise.all([
            get().fetchTaskContent(taskId),
            get().fetchTaskResearch(taskId)
        ]);

        // Aggregate into a full object for the frontend (backward compatibility)
        const fullTask = { 
            ...task, 
            content_body: contentBody, 
            ...researchData 
        } as Task;

        // Update local state to include full data for this task
        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? fullTask : t)
        }));

        return fullTask;
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
        const taskId = (newTask as any).id || crypto.randomUUID();

        // Prepare distributed data
        const taskData = {
            ...newTask,
            id: taskId,
            creator_id: user?.id,
            assigned_to: newTask.assigned_to || user?.id,
            assigned_at: (newTask.assigned_to || user?.id) ? new Date().toISOString() : null
        };

        // Extract heavy data
        const contentBody = taskData.content_body;
        const researchData = {
            research_dossier: taskData.research_dossier || {},
            outline_structure: taskData.outline_structure || {},
            seo_data: taskData.seo_data || {},
            schemas: taskData.schemas || {}
        };

        // Remove heavy fields from main task insert
        delete taskData.content_body;
        delete taskData.research_dossier;
        delete taskData.outline_structure;
        delete taskData.seo_data;
        delete taskData.schemas;

        // Execute inserts sequentially to avoid foreign key violations
        const { error: taskError } = await supabase.from('tasks').insert([taskData]);

        if (taskError) {
            NotificationService.error('Error al crear tarea', taskError.message);
            return { data: null, error: taskError };
        }

        const relatedPromises = [];
        if (contentBody) {
            relatedPromises.push(supabase.from('task_contents').insert([{ id: taskId, content_body: contentBody }]));
        }

        if (Object.keys(researchData).length > 0) {
            relatedPromises.push(supabase.from('task_research').insert([{ id: taskId, ...researchData }]));
        }

        if (relatedPromises.length > 0) {
            const relatedResults = await Promise.all(relatedPromises);
            const relatedError = relatedResults.find(r => r.error)?.error;

            if (relatedError) {
                NotificationService.error('Error al crear detalles de la tarea', relatedError.message);
                return { data: null, error: relatedError };
            }
        }

        // Optimistic update to local state
        const fullTask = { ...taskData, content_body: contentBody, ...researchData } as Task;
        set(state => ({ tasks: [...state.tasks, fullTask] }));
        
        NotificationService.success('Tarea creada');
        return { data: fullTask, error: null };
    },

    updateTask: async (taskId, updates) => {
        const currentTask = get().tasks.find(t => t.id === taskId);
        
        // Automatic Tracking Logic
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        const finalUpdates: any = { ...updates };

        // Distribute updates into specific buckets to save egress and maintain clean architecture
        const contentUpdates: any = {};
        const researchUpdates: any = {};
        const taskUpdates: any = {};

        // Mapping logic for distributed tables
        Object.entries(finalUpdates).forEach(([key, value]) => {
            if (key === 'content_body') {
                contentUpdates[key] = value;
            } else if (['research_dossier', 'outline_structure', 'seo_data', 'schemas'].includes(key)) {
                researchUpdates[key] = value;
            } else {
                taskUpdates[key] = value;
            }
        });

        if (userId) {
            // Researcher Tracking
            if (updates.research_dossier && !currentTask?.researcher_id) {
                taskUpdates.researcher_id = userId;
            }

            // Writer Tracking & Auto-Status
            if (updates.content_body !== undefined && updates.content_body.trim() !== '') {
                if (!currentTask?.writer_id) {
                    taskUpdates.writer_id = userId;
                }
                
                if (!updates.status && (!currentTask?.status || ['idea', 'por_redactar', 'en_investigacion'].includes(currentTask.status))) {
                    taskUpdates.status = 'por_corregir';
                }
            }
        }

        // Execute updates in parallel for better performance
        const promises = [];
        
        if (Object.keys(taskUpdates).length > 0) {
            promises.push(supabase.from('tasks').update(taskUpdates).eq('id', taskId));
        }
        
        if (Object.keys(contentUpdates).length > 0) {
            promises.push(supabase.from('task_contents').upsert({ id: taskId, ...contentUpdates }));
        }
        
        if (Object.keys(researchUpdates).length > 0) {
            promises.push(supabase.from('task_research').upsert({ id: taskId, ...researchUpdates }));
        }

        const results = await Promise.all(promises);
        const hasError = results.some(r => r.error);

        if (hasError) {
            const error = results.find(r => r.error)?.error;
            NotificationService.error('Error al actualizar tarea', error?.message || 'Error desconocido');
            return;
        }

        // Optimistic update: merging locally
        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...finalUpdates } as Task : t)
        }));
    },

    fetchTaskContent: async (taskId) => {
        const { data, error } = await supabase
            .from('task_contents')
            .select('content_body')
            .eq('id', taskId)
            .maybeSingle();
            
        if (error) console.error('Error fetching task content:', error);
        return data?.content_body || '';
    },

    fetchTaskResearch: async (taskId) => {
        const { data, error } = await supabase
            .from('task_research')
            .select('*')
            .eq('id', taskId)
            .maybeSingle();
            
        if (error) console.error('Error fetching task research:', error);
        return data || {};
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

        const { error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId);

        if (error) {
            NotificationService.error('Error al asignar tarea', error.message);
            return;
        }

        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates } as Task : t)
        }));
        NotificationService.notify('Tarea asignada');
    },

    claimTask: async (taskId) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        await get().assignTask(taskId, session.user.id);
    },
});
