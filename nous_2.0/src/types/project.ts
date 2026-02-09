export interface Project {
    id: string;
    name: string;
    domain: string;
    budgetMode: 'target' | 'freestyle';
    budgetSettings: {
        type: 'cost' | 'volume' | 'count';
        target: number;
        current: number;
        currency?: string;
    };
    scraperSettings: {
        paths: string[];
        lastScan?: string;
    };
}

export type ProjectContextState = {
    projects: Project[];
    activeProject: Project | null;
    isLoading: boolean;
};
