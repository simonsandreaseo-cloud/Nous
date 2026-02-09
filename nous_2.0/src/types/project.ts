export interface Project {
    id: string;
    user_id: string;
    name: string;
    domain: string;
    budget_settings: {
        type: 'cost' | 'volume' | 'count';
        target: number;
        current: number;
        currency?: string;
        mode: 'target' | 'freestyle'; // Added mode here as per previous requirements
    };
    scraper_settings: {
        paths: string[];
        lastScan?: string;
    };
    gsc_connected: boolean;
    created_at?: string;
}

export type ProjectContextState = {
    projects: Project[];
    activeProject: Project | null;
    isLoading: boolean;
};
