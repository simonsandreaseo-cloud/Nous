import { Project, Task, Team, TeamMember } from '@/types/project';

export interface ProjectStoreState {
    projects: Project[];
    activeProjectIds: string[];
    activeProject: Project | null;
    teams: Team[];
    teamMembers: TeamMember[];
    activeTeam: Team | null;
    tasks: Task[];
    unassignedMembers: any[];
    isLoading: boolean;
}

export interface ProjectActions {
    toggleProjectActive: (projectId: string) => void;
    setAllProjectsActive: (active: boolean) => void;
    setActiveProject: (projectId: string) => void;
    fetchProjects: (teamId?: string) => Promise<void>;
    createProject: (project: Omit<Project, 'id' | 'created_at' | 'user_id'>) => Promise<Project | null>;
    updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
}

export interface TaskActions {
    fetchProjectTasks: (projectId?: string) => Promise<void>;
    fetchTaskDetails: (taskId: string) => Promise<Task | null>;
    fetchTaskContent: (taskId: string) => Promise<string>;
    fetchTaskResearch: (taskId: string) => Promise<any>;
    fetchTasksFullData: (taskIds: string[]) => Promise<Task[]>;
    addTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<{ data: Task | null, error: any }>;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    deleteTasks: (taskIds: string[]) => Promise<void>;
    updateTasks: (taskIds: string[], updates: Partial<Task>) => Promise<void>;
    fetchPersonalTasks: () => Promise<void>;
    assignTask: (taskId: string, userId: string | null) => Promise<void>;
    claimTask: (taskId: string) => Promise<void>;
    validateStatusTransition: (task: Task, nextStatus: string, updates?: Partial<Task>) => { valid: boolean; error?: string };
    selectiveDeleteTask: (taskId: string, options: { research?: boolean, writing?: boolean, images?: boolean, translations?: boolean, all?: boolean }) => Promise<void>;

}

export interface TeamActions {
    fetchTeams: () => Promise<void>;
    createTeam: (name: string) => Promise<void>;
    setActiveTeam: (teamId: string) => Promise<void>;
    fetchTeamMembers: (teamId?: string) => Promise<void>;
    fetchUnassignedMembers: () => Promise<void>;
    updateTeamStyling: (teamId: string, updates: { header_color?: string, icon_color?: string, icon_library?: string }) => Promise<void>;
}

export interface SyncActions {
    syncGscData: (siteUrl: string, startDate: string, endDate: string) => Promise<void>;
    syncProjectInventory: (projectId: string, siteUrl: string) => Promise<void>;
    fetchProjectInventory: (projectId: string) => Promise<{url: string, title?: string, category?: string, top_query?: string, strategic_score?: number}[]>;
}

export type ProjectStore = ProjectStoreState & ProjectActions & TaskActions & TeamActions & SyncActions;
