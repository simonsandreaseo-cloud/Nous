import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Task, Project, TaskService } from '../../lib/task_manager';
import { ContentService, ContentItem } from '../../lib/ContentService';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Lock, Unlock, User, Calendar, Edit3, X, FileText, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TaskDetailModal from './TaskDetailModal';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { GoalTrackingWidget } from './GoalTrackingWidget';
import { ContentPerformanceDashboard } from './ContentPerformanceDashboard';

interface EditorialCalendarProps {
    projectId?: string | number;
    project?: Project;
    tasks?: Task[];
    onTaskUpdate?: () => void;
}

export const EditorialCalendar: React.FC<EditorialCalendarProps> = (props) => {
    // Try to get from Context (if rendered via Outlet)
    const context = useOutletContext<{ project: Project, tasks: Task[], refreshTasks: () => void }>();

    // Determine data source (Props > Context)
    const tasksFromContext = context?.tasks || [];
    const projectFromContext = context?.project;
    const refreshTasksFromContext = context?.refreshTasks || (() => { });

    const finalTasks = (props.tasks && props.tasks.length > 0) ? props.tasks : tasksFromContext;
    const finalProject = props.project || projectFromContext;
    const finalProjectId = props.projectId || finalProject?.id;
    const finalOnTaskUpdate = props.onTaskUpdate || refreshTasksFromContext;

    const { user } = useAuth();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
    const [selectedTask, setSelectedTask] = useState<ContentItem | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showSettings, setShowSettings] = useState(false);

    // --- Drag to Fill State ---
    const [dragState, setDragState] = useState<{
        active: boolean;
        startRowIndex: number; // Index in contentTasks
        currentRowIndex: number;
        field: string; // 'title' | 'status' | 'due_date' | 'directory' | 'slug' | 'created_at' | 'target_keyword'
        value: any;
    } | null>(null);

    // Premium Date Picker State
    const [activeDatePicker, setActiveDatePicker] = useState<{
        rowIndex: number;
        field: string;
        rect: DOMRect;
        value: string;
    } | null>(null);

    const [pickerDate, setPickerDate] = useState(new Date());

    // Memoized sorted tasks to ensure stable indices during interactions
    const contentTasks = React.useMemo(() => {
        return finalTasks
            .filter(t => t.type === 'content')
            .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime());
    }, [finalTasks]);

    // Handle Drag End (Execute Bulk Update)
    useEffect(() => {
        const handleGlobalMouseUp = async () => {
            if (!dragState?.active) return;

            const { startRowIndex, currentRowIndex, field, value } = dragState;
            setDragState(null); // Clear state immediately

            const minIndex = Math.min(startRowIndex, currentRowIndex);
            const maxIndex = Math.max(startRowIndex, currentRowIndex);

            // Identify tasks to update
            const tasksToUpdate = contentTasks.slice(minIndex, maxIndex + 1);

            // Don't update the source one if it's the only one (click without drag)
            if (tasksToUpdate.length <= 1 && minIndex === startRowIndex) return;

            // Format date for display if field is a date
            const displayValue = (field.includes('date') || field === 'created_at')
                ? new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : value;

            if (!confirm(`¿Actualizar ${tasksToUpdate.length} filas con el valor "${displayValue}"?`)) return;

            try {
                const updates = tasksToUpdate.map(task => {
                    const updatePayload: any = {};

                    if (field === 'directory') {
                        // Special case: Metadata Directory + Update URL
                        const newDir = value;
                        const slug = task.target_url_slug || '';
                        const domain = finalProject?.gsc_property_url?.replace(/\/$/, '') || '';
                        updatePayload.metadata = { ...task.metadata, directory: newDir };
                        updatePayload.secondary_url = `${domain}${newDir}${slug}`;
                    }
                    else if (field === 'slug') {
                        // Special case: Slug + Update URL
                        // Note: If value is copypasted slug, we use it. But slugs should be unique? 
                        // Google sheets usually increments if number? For now exact copy.
                        const newSlug = value;
                        const dir = task.metadata?.directory || '/';
                        const domain = finalProject?.gsc_property_url?.replace(/\/$/, '') || '';
                        updatePayload.target_url_slug = newSlug;
                        updatePayload.secondary_url = `${domain}${dir}${newSlug}`;
                    }
                    else if (field === 'title') updatePayload.title = value;
                    else if (field === 'status') updatePayload.status = value;
                    else if (field === 'due_date') updatePayload.due_date = value;
                    else if (field === 'created_at') updatePayload.created_at = value;
                    else if (field === 'keyword') updatePayload.target_keyword = value;

                    return TaskService.updateTask(task.id, updatePayload);
                });

                await Promise.all(updates);
                finalOnTaskUpdate();
            } catch (e: any) {
                alert("Error en actualización masiva: " + e.message);
            }
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [dragState, contentTasks, finalProject, finalOnTaskUpdate]);

    // Helper to render the drag handle
    const renderDragHandle = (rowIndex: number, field: string, value: any) => (
        <div
            className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-indigo-600 rounded-sm cursor-crosshair z-20 opacity-0 group-hover/cell:opacity-100 transition-opacity ring-1 ring-white"
            onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent text selection
                setDragState({
                    active: true,
                    startRowIndex: rowIndex,
                    currentRowIndex: rowIndex,
                    field,
                    value
                });
            }}
        />
    );

    // Helper to check if cell is in drag range
    const isInDragRange = (rowIndex: number, field: string) => {
        if (!dragState || dragState.field !== field) return false;
        const min = Math.min(dragState.startRowIndex, dragState.currentRowIndex);
        const max = Math.max(dragState.startRowIndex, dragState.currentRowIndex);
        if (rowIndex >= min && rowIndex <= max) return true;
        return false;
    };

    // If still no project ID, show loading
    if (!finalProjectId) return <div className="p-8 text-center text-slate-400">Cargando calendario...</div>;

    // Helper to get days in month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const getTasksForDay = (day: number) => {
        return finalTasks.filter(t => {
            if (!t.due_date) return false;
            const d = new Date(t.due_date);
            return d.getDate() === day &&
                d.getMonth() === currentDate.getMonth() &&
                d.getFullYear() === currentDate.getFullYear();
        });
    };

    const handleCreateTask = async (day: number) => {
        const title = prompt(`Nuevo contenido para el ${day} de ${monthName}:`);
        if (!title) return;

        // Use local date at noon to avoid timezone shifts
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0);
        const dueDate = date.toISOString();

        try {
            const newTask = await TaskService.createTask(finalProjectId, {
                title,
                status: 'idea',
                type: 'content',
                due_date: dueDate,
                priority: 'medium'
            });
            finalOnTaskUpdate();
            // Open modal immediately
            if (newTask) {
                setSelectedTask(newTask as ContentItem);
            }
        } catch (e: any) {
            console.error("Error creating task:", e);
            alert("Error al crear contenido: " + (e.message || "Error desconocido"));
        }
    };

    const handleOpenTask = (task: Task) => {
        setSelectedTask(task as ContentItem);
    };

    const handleEditContent = async (version: 1 | 2) => {
        if (!selectedTask || !user) return;

        // Check Lock
        if (ContentService.isLocked(selectedTask, user.id)) {
            alert("Este contenido está siendo editado por otro usuario.");
            return;
        }

        try {
            // Lock logic
            await ContentService.lockContent(selectedTask.id);
            // Navigate to Writer with ID
            if (version === 1) {
                navigate(`/herramientas/redactor-ia?draftId=${selectedTask.id}&context=project`);
            } else {
                navigate(`/herramientas/redactor-ia-2?taskId=${selectedTask.id}`);
            }
        } catch (e: any) {
            alert("Error al bloquear contenido: " + e.message);
        }
    };

    const handleAssignMe = async () => {
        if (!selectedTask) return;
        try {
            await ContentService.assignToMe(selectedTask.id);
            finalOnTaskUpdate();
            setSelectedTask({ ...selectedTask, assignee_id: user?.id });
        } catch (e: any) {
            alert("Error al asignar: " + e.message);
        }
    };

    const [isCreating, setIsCreating] = useState(false);

    const COLUMN_MAPPING = ['title', 'status', 'created_at', 'due_date', 'target_keyword', 'directory', 'slug'];

    const handlePaste = async (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text');
        if (!text) return;

        // Parse Grid
        const rows = text.split(/\r?\n/).filter(r => r.trim()); // Trim empty rows? usually yes, but if pasting block with empty middle row? Sheets gives "val\tval\n\t\nval". Keep empty? user said "others empty". Let's filter empty mainly for end.
        if (rows.length === 0) return;

        const grid = rows.map(r => r.split('\t')); // 2D array
        const isTabular = text.includes('\t') || rows.length > 1;

        // Target Info
        const target = e.target as HTMLElement;
        const startRowIndexStr = target.getAttribute('data-row-index');
        const startColIndexStr = target.getAttribute('data-col-index');

        // Logic 1: Grid Paste starting from a specific cell
        if (startRowIndexStr && startColIndexStr) {
            e.preventDefault();
            const startRow = parseInt(startRowIndexStr, 10);
            const startCol = parseInt(startColIndexStr, 10);

            if (!confirm(`Se pegarán ${rows.length} filas x ${Math.max(...grid.map(r => r.length))} columnas a partir de la celda seleccionada.\n¿Continuar?`)) return;

            setIsCreating(true);
            try {
                const updates = [];
                const creations = [];

                for (let r = 0; r < grid.length; r++) {
                    const rowData = grid[r];
                    const targetRowIndex = startRow + r;

                    // Prepare payload from the grid row
                    // We need to construct a partial update object based on columns falling into valid mapping
                    const payload: any = {};
                    let hasChanges = false;

                    for (let c = 0; c < rowData.length; c++) {
                        const targetColIndex = startCol + c;
                        const value = rowData[c]?.trim();

                        // If outside our known columns, skip
                        if (targetColIndex >= COLUMN_MAPPING.length) continue;

                        const field = COLUMN_MAPPING[targetColIndex];
                        if (value === undefined) continue; // Should not happen with split
                        else if (field === 'title') { payload.title = value; hasChanges = true; }
                        else if (field === 'status') {
                            // Normalize status
                            const s = value.toLowerCase();
                            if (['todo', 'por hacer'].includes(s)) payload.status = 'todo';
                            else if (['in_progress', 'en progreso', 'working'].includes(s)) payload.status = 'in_progress';
                            else if (['review', 'revisión', 'revision'].includes(s)) payload.status = 'review';
                            else if (['done', 'publicado', 'finalizado'].includes(s)) payload.status = 'done';
                            else if (['idea'].includes(s)) payload.status = 'idea';
                            else payload.status = 'idea'; // Default
                            hasChanges = true;
                        }
                        else if (field === 'created_at') {
                            const d = new Date(value);
                            if (!isNaN(d.getTime())) payload.created_at = d.toISOString();
                            hasChanges = true;
                        }
                        else if (field === 'due_date') {
                            const d = new Date(value);
                            if (!isNaN(d.getTime())) payload.due_date = d.toISOString();
                            hasChanges = true;
                        }
                        else if (field === 'target_keyword') { payload.target_keyword = value; hasChanges = true; }
                        else if (field === 'directory') {
                            // Will need to combine with slug later if both present, or merge with existing
                            payload.metadata = payload.metadata || {};
                            payload.metadata.directory = value;
                            hasChanges = true;
                        }
                        else if (field === 'slug') {
                            payload.target_url_slug = value;
                            hasChanges = true;
                        }
                    }

                    if (!hasChanges) continue;

                    // Check if updating existing or creating new
                    if (targetRowIndex < contentTasks.length) {
                        // UPDATE EXISTING
                        const task = contentTasks[targetRowIndex];
                        const mergedPayload = { ...payload };

                        // Handle URL reconstruction for existing task
                        // We need access to the final directory and slug to build secondary_url
                        // Use payload value if present, else fall back to existing task value
                        const finalDir = mergedPayload.metadata?.directory ?? task.metadata?.directory ?? '/';
                        const finalSlug = mergedPayload.target_url_slug ?? task.target_url_slug ?? '';

                        if (mergedPayload.metadata?.directory !== undefined || mergedPayload.target_url_slug !== undefined) {
                            const domain = finalProject?.gsc_property_url?.replace(/\/$/, '') || '';
                            mergedPayload.secondary_url = `${domain}${finalDir}${finalSlug}`;
                            // Ensure metadata is fully merged if we touched it
                            if (mergedPayload.metadata) {
                                mergedPayload.metadata = { ...task.metadata, ...mergedPayload.metadata };
                            }
                        }

                        updates.push(TaskService.updateTask(task.id, mergedPayload));
                    } else {
                        // CREATE NEW
                        // Require at least a title? Or default "Sin titulo"
                        const newTitle = payload.title || 'Nuevo Contenido';
                        const newStatus = payload.status || 'idea';
                        const newDate = payload.due_date || new Date().toISOString();
                        const newCreatedAt = payload.created_at || new Date().toISOString(); // Use current date if not provided

                        const domain = finalProject?.gsc_property_url?.replace(/\/$/, '') || '';
                        const finalDir = payload.metadata?.directory || '/';
                        const finalSlug = payload.target_url_slug || '';
                        const secondaryUrl = `${domain}${finalDir}${finalSlug}`;

                        const creationPayload = {
                            title: newTitle,
                            status: newStatus as any,
                            due_date: newDate,
                            created_at: newCreatedAt,
                            updated_at: new Date().toISOString(),
                            priority: 'medium' as const,
                            type: 'content' as const,
                            target_keyword: payload.target_keyword || '',
                            target_url_slug: finalSlug,
                            secondary_url: secondaryUrl,
                            metadata: {
                                slug: finalSlug,
                                directory: finalDir
                            }
                        };

                        creations.push(TaskService.createTask(finalProjectId, creationPayload));
                    }
                }

                await Promise.all([...updates, ...creations]);
                finalOnTaskUpdate();
                alert(`${updates.length} actualizados, ${creations.length} creados.`);

            } catch (err: any) {
                console.error(err);
                alert("Error al pegar tabla: " + err.message);
            } finally {
                setIsCreating(false);
            }
            return;
        }

        // Logic 2: Fallback - Append Rows (if paste didn't happen in a cell)
        // Only if it looks tabular
        if (isTabular) {
            e.preventDefault();
            // ... (Same as Logic 1 but startRow = contentTasks.length, startCol = 0)
            // Reuse logic? Or just direct redirect
            // Let's keep the user confirmed specific logic for general paste
            if (!confirm(`Se han detectado ${rows.length} filas nuevas fuera de la tabla.\n¿Importarlas al final?`)) return;

            // Simplified existing logic for appending
            setIsCreating(true);
            try {
                let createdCount = 0;
                for (const row of rows) {
                    const cols = row.split('\t').map(c => c.trim());
                    if (!cols[0]) continue;

                    // Simple Mapping based on expectation: Title|Status|Date|KW|Slug
                    // ... (keep existing simple append logic or unify? Unifying is better but complex to copy-paste strictly)
                    // Let's use the explicit logic we had before for robustness in "simple append"
                    const title = cols[0];
                    let status = 'idea';
                    if (cols[1] && ['todo', 'done', 'review', 'in_progress'].some(s => cols[1].toLowerCase().includes(s))) status = cols[1].toLowerCase(); // Simplified

                    await TaskService.createTask(finalProjectId, {
                        title: cols[0],
                        status: 'idea', // default
                        type: 'content',
                        due_date: new Date().toISOString(),
                        priority: 'medium',
                        target_keyword: cols[3] || '',
                        target_url_slug: cols[4] || '',
                        secondary_url: cols[4] ? (finalProject?.gsc_property_url || '') + cols[4] : ''
                    });
                    createdCount++;
                }
                finalOnTaskUpdate();
            } catch (e) { alert("Error: " + e); }
            finally { setIsCreating(false); }
        }
    };

    const handleQuickAdd = async () => {
        const title = prompt("Título del nuevo contenido:");
        if (!title) return;

        try {
            await TaskService.createTask(finalProjectId, {
                title,
                status: 'idea',
                type: 'content',
                due_date: new Date().toISOString(),
                priority: 'medium'
            });
            finalOnTaskUpdate();
        } catch (e: any) {
            alert("Error al crear: " + e.message);
        }
    };

    const calendarGrid = [];
    // Padding days
    for (let i = 0; i < firstDay; i++) {
        calendarGrid.push(<div key={`pad-${i}`} className="h-32 bg-slate-50/50 border-b border-r border-slate-100"></div>);
    }
    // Calendar Grid Body Transformation
    for (let day = 1; day <= days; day++) {
        const dayTasks = getTasksForDay(day);
        const dayObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const isToday = new Date().toDateString() === dayObj.toDateString();
        const isWeekend = dayObj.getDay() === 0 || dayObj.getDay() === 6;

        calendarGrid.push(
            <div
                key={`day-${day}`}
                className={`min-h-[140px] border-b border-r border-slate-100 p-3 transition-all duration-300 hover:bg-slate-50/80 group/day relative
                    ${isToday ? 'bg-indigo-50/30 ring-1 ring-inset ring-indigo-200/50' : ''}
                    ${isWeekend ? 'bg-slate-50/10' : 'bg-white'}
                `}
                onClick={() => handleCreateTask(day)}
            >
                {/* Day Header */}
                <div className="flex justify-between items-center mb-3 pointer-events-none">
                    <span className={`
                        text-xs font-bold w-7 h-7 flex items-center justify-center transition-all duration-300
                        ${isToday ? 'bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 scale-110' : 'text-slate-400 group-hover/day:text-slate-900 group-hover/day:scale-110'}
                    `}>
                        {day}
                    </span>
                    <div className="opacity-0 group-hover/day:opacity-100 transform translate-y-1 group-hover/day:translate-y-0 transition-all pointer-events-auto">
                        <button className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all duration-300 active:scale-90">
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                {/* Task Stack */}
                <div className="space-y-1.5 overflow-hidden">
                    {dayTasks.slice(0, 4).map(task => {
                        const isLocked = ContentService.isLocked(task as ContentItem, user?.id || '');
                        return (
                            <div
                                key={task.id}
                                className={`
                                    group/item relative text-[10px] px-2.5 py-1.5 rounded-xl truncate border cursor-pointer pointer-events-auto 
                                    flex items-center justify-between transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:z-10
                                    ${task.status === 'done' ? 'bg-emerald-50/40 border-emerald-100/50 text-emerald-700 hover:bg-emerald-50' :
                                        task.status === 'review' ? 'bg-amber-50/40 border-amber-100/50 text-amber-700 hover:bg-amber-50' :
                                            task.status === 'in_progress' ? 'bg-blue-50/40 border-blue-100/50 text-blue-700 hover:bg-blue-50' :
                                                'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'}
                                `}
                                title={task.title}
                                onClick={(e) => { e.stopPropagation(); handleOpenTask(task); }}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <div className={`w-1.5 h-1.5 rounded-full ${task.status === 'done' ? 'bg-emerald-500' :
                                        task.status === 'review' ? 'bg-amber-500' :
                                            task.status === 'in_progress' ? 'bg-blue-500' :
                                                'bg-slate-300'
                                        }`} />
                                    <span className="truncate font-semibold tracking-tight">{task.title || '(Sin título)'}</span>
                                </div>
                                {isLocked && <Lock size={8} className="text-red-500 bg-white rounded-full p-0.5 shadow-sm" />}
                            </div>
                        );
                    })}
                    {dayTasks.length > 4 && (
                        <div className="text-[9px] font-bold text-slate-400 text-center py-1 bg-slate-50/50 rounded-lg italic border border-dashed border-slate-200">
                            + {dayTasks.length - 4} contenidos
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative outline-none"
            onPaste={viewMode === 'table' ? handlePaste : undefined}
            tabIndex={0}
        >
            {isCreating && (
                <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center flex-col gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="text-sm font-bold text-indigo-600">Importando contenidos...</span>
                </div>
            )}
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    {/* View Toggles */}
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Calendario"
                        >
                            <Calendar size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Tabla"
                        >
                            <FileText size={16} />
                        </button>
                    </div>

                    <h2 className="text-lg font-bold text-slate-800 capitalize flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                        {monthName}
                    </h2>
                    <div className="flex gap-2 bg-slate-100/50 p-1 rounded-xl">
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all duration-200 active:scale-90"
                            title="Mes Anterior"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNextMonth(); }}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all duration-200 active:scale-90"
                            title="Mes Siguiente"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                    {viewMode === 'table' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 hidden lg:inline-block mr-2">
                                💡 Tip: Pega filas completas o columnas individuales (copia y pega desde Excel/Sheets)
                            </span>
                            <button
                                onClick={handleQuickAdd}
                                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                            >
                                <Plus size={14} /> Agregar Contenido
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => alert("Próximamente: Importar CSV")}
                        className="text-xs font-bold text-brand-power/50 hover:text-brand-power flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 hidden md:flex"
                    >
                        <FileText size={12} /> Importar CSV
                    </button>
                    <button
                        onClick={() => alert("Próximamente: Generar con IA")}
                        className="text-xs font-bold text-brand-accent hover:text-brand-accent/80 flex items-center gap-1 bg-brand-accent/5 px-2 py-1.5 rounded-lg border border-brand-accent/20 hidden md:flex"
                    >
                        <Edit3 size={12} /> Sugerencias IA
                    </button>
                    {project?.role === 'owner' || project?.role === 'admin' ? (
                        <button
                            onClick={() => setShowSettings(true)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200"
                            title="Configurar Categorías y Objetivos"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    ) : null}
                    <div className="text-xs text-slate-400 font-medium border-l border-slate-200 pl-3">
                        {tasks.filter(t => t.due_date).length} Tareas
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="px-4 pt-4">
                {project && <ContentPerformanceDashboard project={project} tasks={tasks} />}
                <GoalTrackingWidget project={project} tasks={tasks} currentDate={currentDate} />
            </div>

            {viewMode === 'calendar' ? (
                <>
                    {/* Grid Header */}
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Grid Body */}
                    <div className="grid grid-cols-7">
                        {calendarGrid}
                    </div>
                </>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[30%]">Título</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Creada</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Obj.</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Palabra Clave</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Directorio</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Slug</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {contentTasks.map((task, rowIndex) => {
                                const isLocked = ContentService.isLocked(task as ContentItem, user?.id || '');

                                const updateField = async (field: keyof Task, value: any) => {
                                    try {
                                        await TaskService.updateTask(task.id, { [field]: value });
                                        onTaskUpdate();
                                    } catch (e: any) {
                                        alert(`Error al actualizar ${field}: ${e.message}`);
                                    }
                                };

                                return (
                                    <tr key={task.id} className="hover.bg-slate-50 transition-colors">
                                        {/* TITLE */}
                                        <td className={`p-3 relative group/cell ${isInDragRange(rowIndex, 'title') ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300' : ''}`}
                                            onMouseEnter={() => dragState?.active && setDragState(s => s ? ({ ...s, currentRowIndex: rowIndex }) : null)}
                                        >
                                            <input
                                                className="w-full bg-transparent border-transparent border-b hover:border-slate-300 focus:border-brand-accent focus:ring-0 text-sm font-medium text-slate-700 transition-colors py-1"
                                                defaultValue={task.title}
                                                data-row-index={rowIndex}
                                                data-col-index={0}
                                                data-field="title"
                                                onBlur={(e) => {
                                                    if (e.target.value !== task.title) updateField('title', e.target.value);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                }}
                                            />
                                            {renderDragHandle(rowIndex, 'title', task.title)}
                                        </td>

                                        {/* STATUS */}
                                        <td className={`p-3 relative group/cell ${isInDragRange(rowIndex, 'status') ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300' : ''}`}
                                            onMouseEnter={() => dragState?.active && setDragState(s => s ? ({ ...s, currentRowIndex: rowIndex }) : null)}
                                        >
                                            <select
                                                value={task.status}
                                                data-row-index={rowIndex}
                                                data-col-index={1}
                                                data-field="status"
                                                onChange={(e) => updateField('status', e.target.value)}
                                                className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full border border-transparent hover:border-slate-200 cursor-pointer outline-none w-full
                                                        ${task.status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                                                        task.status === 'review' ? 'bg-amber-50 text-amber-600' :
                                                            task.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                                                                'bg-slate-100 text-slate-500'}`}
                                            >
                                                <option value="idea">Idea</option>
                                                <option value="todo">Por Hacer</option>
                                                <option value="in_progress">En Progreso</option>
                                                <option value="review">Revisión</option>
                                                <option value="done">Publicado</option>
                                            </select>
                                            {renderDragHandle(rowIndex, 'status', task.status)}
                                        </td>

                                        {/* CREATED AT */}
                                        <td className={`p-3 relative group/cell ${isInDragRange(rowIndex, 'created_at') ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300' : ''}`}
                                            onMouseEnter={() => dragState?.active && setDragState(s => s ? ({ ...s, currentRowIndex: rowIndex }) : null)}
                                        >
                                            <div
                                                className="bg-transparent text-[11px] text-slate-500 font-medium py-1 px-2 rounded-lg hover:bg-slate-100 hover:text-brand-power transition-all cursor-pointer border border-transparent hover:border-slate-200 flex items-center justify-between"
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActiveDatePicker({ rowIndex, field: 'created_at', rect, value: task.created_at || '' });
                                                    setPickerDate(task.created_at ? new Date(task.created_at) : new Date());
                                                }}
                                            >
                                                <span>{task.created_at ? new Date(task.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--/--/----'}</span>
                                                <Calendar size={12} className="opacity-40" />
                                            </div>
                                            {renderDragHandle(rowIndex, 'created_at', task.created_at)}
                                        </td>

                                        {/* DUE DATE */}
                                        <td className={`p-3 relative group/cell ${isInDragRange(rowIndex, 'due_date') ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300' : ''}`}
                                            onMouseEnter={() => dragState?.active && setDragState(s => s ? ({ ...s, currentRowIndex: rowIndex }) : null)}
                                        >
                                            <div
                                                className="bg-transparent text-[11px] text-slate-500 font-medium py-1 px-2 rounded-lg hover:bg-slate-100 hover:text-brand-power transition-all cursor-pointer border border-transparent hover:border-slate-200 flex items-center justify-between"
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setActiveDatePicker({ rowIndex, field: 'due_date', rect, value: task.due_date || '' });
                                                    setPickerDate(task.due_date ? new Date(task.due_date) : new Date());
                                                }}
                                            >
                                                <span className="font-bold text-slate-600">{task.due_date ? new Date(task.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--/--/----'}</span>
                                                <Calendar size={12} className="opacity-40" />
                                            </div>
                                            {renderDragHandle(rowIndex, 'due_date', task.due_date)}
                                        </td>

                                        {/* KEYWORD */}
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                {task.target_keyword ? (
                                                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded-md border border-slate-200 truncate max-w-[150px]" title={task.target_keyword}>
                                                        {task.target_keyword}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 italic">--</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* DIRECTORY */}
                                        <td className={`p-3 relative group/cell ${isInDragRange(rowIndex, 'directory') ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300' : ''}`}
                                            onMouseEnter={() => dragState?.active && setDragState(s => s ? ({ ...s, currentRowIndex: rowIndex }) : null)}
                                        >
                                            <select
                                                value={task.metadata?.directory || '/'}
                                                data-row-index={rowIndex}
                                                data-col-index={5}
                                                data-field="directory"
                                                onChange={async (e) => {
                                                    const newDir = e.target.value;
                                                    const slug = task.target_url_slug || '';
                                                    const domain = project?.gsc_property_url?.replace(/\/$/, '') || '';
                                                    const fullUrl = `${domain}${newDir}${slug}`;

                                                    try {
                                                        await TaskService.updateTask(task.id, {
                                                            secondary_url: fullUrl,
                                                            metadata: { ...task.metadata, directory: newDir }
                                                        });
                                                        onTaskUpdate();
                                                    } catch (e: any) { console.error(e); }
                                                }}
                                                className="w-full bg-transparent text-xs text-slate-500 font-medium outline-none border-b border-transparent hover:border-slate-300 focus:border-brand-accent cursor-pointer py-1"
                                            >
                                                <option value="/">/ (Raíz)</option>
                                                {project?.settings?.content_directories?.map((d: string) => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                            {renderDragHandle(rowIndex, 'directory', task.metadata?.directory || '/')}
                                        </td>

                                        {/* SLUG */}
                                        <td className={`p-3 relative group/cell ${isInDragRange(rowIndex, 'slug') ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300' : ''}`}
                                            onMouseEnter={() => dragState?.active && setDragState(s => s ? ({ ...s, currentRowIndex: rowIndex }) : null)}
                                        >
                                            <input
                                                className="w-full bg-transparent text-xs text-slate-500 font-mono outline-none border-b border-transparent hover:border-slate-300 focus:border-brand-accent transition-colors py-1 truncate"
                                                placeholder="slug-del-articulo"
                                                defaultValue={task.target_url_slug || ''}
                                                data-row-index={rowIndex}
                                                data-col-index={6}
                                                data-field="slug"
                                                onBlur={async (e) => {
                                                    const newSlug = e.target.value;
                                                    if (newSlug !== task.target_url_slug) {
                                                        const dir = task.metadata?.directory || '/';
                                                        const domain = project?.gsc_property_url?.replace(/\/$/, '') || '';
                                                        const fullUrl = `${domain}${dir}${newSlug}`;

                                                        try {
                                                            await TaskService.updateTask(task.id, {
                                                                target_url_slug: newSlug,
                                                                secondary_url: fullUrl
                                                            });
                                                            onTaskUpdate();
                                                        } catch (e: any) { console.error(e); }
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                }}
                                            />
                                            {renderDragHandle(rowIndex, 'slug', task.target_url_slug || '')}
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleOpenTask(task)}
                                                    className="p-1.5 text-slate-400 hover:text-brand-accent hover:bg-brand-accent/5 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!confirm(`¿Estás seguro de que quieres eliminar "${task.title}"?`)) return;
                                                        try {
                                                            await TaskService.deleteTask(task.id);
                                                            onTaskUpdate();
                                                        } catch (e: any) {
                                                            alert("Error al eliminar: " + e.message);
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {tasks.filter(t => t.type === 'content').length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                                        No hay contenidos planificados. Usa el botón de abajo o pega filas desde Excel.
                                    </td>
                                </tr>
                            )}
                            {/* Add New Row Button at the bottom */}
                            <tr>
                                <td colSpan={6} className="p-2 border-t border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors text-center">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await TaskService.createTask(projectId, {
                                                    title: '', // Empty title so user can type
                                                    status: 'idea',
                                                    type: 'content',
                                                    due_date: new Date().toISOString(),
                                                    priority: 'medium'
                                                });
                                                onTaskUpdate();
                                            } catch (e: any) { alert("Error al crear fila: " + e.message); }
                                        }}
                                        className="w-full py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 border border-dashed border-slate-300 hover:border-indigo-300 rounded-lg flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Plus size={14} /> Agregar Fila Vacía
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Task Detail Modal */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    project={project}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={() => {
                        onTaskUpdate();
                    }}
                />
            )}

            {/* Premium Custom Date Picker Popover */}
            {activeDatePicker && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setActiveDatePicker(null)} />
                    <div
                        className="fixed z-[101] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200"
                        style={{
                            top: `${activeDatePicker.rect.bottom + 8}px`,
                            left: `${activeDatePicker.rect.left}px`,
                            minWidth: '280px'
                        }}
                    >
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider px-2 py-0.5 bg-slate-200/50 rounded-md">
                                {activeDatePicker.field === 'created_at' ? 'Fecha Creación' : 'Fecha Objetivo'}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1))}
                                    className="p-1 hover:bg-white rounded-md transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button
                                    onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1))}
                                    className="p-1 hover:bg-white rounded-md transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 text-center capitalize">
                                {pickerDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                            </h4>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
                                    <div key={d} className="text-[10px] font-bold text-slate-400 text-center">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: new Date(pickerDate.getFullYear(), pickerDate.getMonth(), 1).getDay() }).map((_, i) => (
                                    <div key={`pad-${i}`} />
                                ))}
                                {Array.from({ length: new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                    const day = i + 1;
                                    const isSelected = activeDatePicker.value && new Date(activeDatePicker.value).toDateString() === new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day).toDateString();
                                    return (
                                        <button
                                            key={day}
                                            onClick={async () => {
                                                const selDate = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day, 12, 0, 0);
                                                const val = selDate.toISOString();
                                                const task = contentTasks[activeDatePicker.rowIndex];

                                                try {
                                                    const payload: any = { [activeDatePicker.field]: val };
                                                    if (activeDatePicker.field === 'due_date' && task.status === 'done') {
                                                        payload.completed_at = val;
                                                    }
                                                    await TaskService.updateTask(task.id, payload);
                                                    onTaskUpdate();
                                                    setActiveDatePicker(null);
                                                } catch (e) { console.error(e); }
                                            }}
                                            className={`
                                                aspect-square text-[11px] font-medium rounded-lg flex items-center justify-center transition-all
                                                ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-indigo-50 text-slate-600 hover:text-indigo-600'}
                                            `}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Project Settings Modal */}
            {project && (
                <ProjectSettingsModal
                    project={project}
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    onUpdate={onTaskUpdate}
                />
            )}
        </div>
    );
};

