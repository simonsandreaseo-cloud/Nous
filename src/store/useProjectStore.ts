import { create } from 'zustand';
import { createProjectSlice } from './project/project-slice';
import { createTaskSlice } from './project/task-slice';
import { createTeamSlice } from './project/team-slice';
import { createSyncSlice } from './project/sync-slice';
import { ProjectStore } from './project/types';

/**
 * useProjectStore - Refactored Operational Store
 * 
 * Composed of specialized slices:
 * - ProjectSlice: Project lifecycle and active selection.
 * - TaskSlice: Content management, status transitions, and assignments.
 * - TeamSlice: Multi-team support and member management.
 * - SyncSlice: External integrations with GSC and Inventory.
 * 
 * @GentlemanAI: "El orden es la base de la libertad. Hemos desarticulado 
 * el caos para construir una estructura de mando impecable."
 */

export const useProjectStore = create<ProjectStore>()((...a) => ({
    // Initial State
    projects: [],
    activeProjectIds: [],
    activeProject: null,
    teams: [],
    teamMembers: [],
    activeTeam: null,
    tasks: [],
    isLoading: false,

    // Slices
    ...createProjectSlice(...a),
    ...createTaskSlice(...a),
    ...createTeamSlice(...a),
    ...createSyncSlice(...a),
}));

// Re-export constants for backward compatibility if needed in components
export { STATUS_LABELS, STATUS_COLORS } from '@/constants/status';
export type { TaskStatus } from '@/constants/status';
export type { Project, Task, Team, TeamMember } from '@/types/project';
