import { create } from 'zustand';
import { Project } from '@/types/project';

interface ProjectState {
    projects: Project[];
    activeProject: Project | null;
    isLoading: boolean;
    setActiveProject: (projectId: string) => void;
    addProject: (project: Project) => void;
    updateProject: (projectId: string, updates: Partial<Project>) => void;
}

// Initial Mock Data
const MOCK_PROJECTS: Project[] = [
    {
        id: 'p1',
        name: 'Simonsandrea SEO',
        domain: 'simonsandreaseo.com',
        budgetMode: 'target',
        budgetSettings: {
            type: 'count',
            target: 20,
            current: 8
        },
        scraperSettings: {
            paths: ['/blog/', '/noticias/'],
            lastScan: '2026-02-09T08:00:00Z'
        }
    },
    {
        id: 'p2',
        name: 'Nous Tech',
        domain: 'nous.tech',
        budgetMode: 'freestyle',
        budgetSettings: {
            type: 'cost',
            target: 5000,
            current: 1200,
            currency: 'USD'
        },
        scraperSettings: {
            paths: ['/insights/'],
            lastScan: '2026-02-08T14:30:00Z'
        }
    }
];

export const useProjectStore = create<ProjectState>((set) => ({
    projects: MOCK_PROJECTS,
    activeProject: MOCK_PROJECTS[0],
    isLoading: false,

    setActiveProject: (projectId) => set((state) => ({
        activeProject: state.projects.find(p => p.id === projectId) || null
    })),

    addProject: (project) => set((state) => ({
        projects: [...state.projects, project]
    })),

    updateProject: (projectId, updates) => set((state) => ({
        projects: state.projects.map(p =>
            p.id === projectId ? { ...p, ...updates } : p
        ),
        activeProject: state.activeProject?.id === projectId
            ? { ...state.activeProject, ...updates }
            : state.activeProject
    }))
}));
