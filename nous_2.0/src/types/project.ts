export interface Project {
    id: string;
    user_id: string;
    name: string;
    domain: string;
    description?: string;
    budget_settings: {
        type: 'cost' | 'volume' | 'count';
        target: number;
        current: number;
        currency?: string;
        mode: 'target' | 'freestyle';
    };
    scraper_settings: {
        paths: string[];
        lastScan?: string;
    };
    settings?: Record<string, any>;
    gsc_connected: boolean;
    created_at?: string;
}

export interface Task {
    id: string;
    project_id: string;
    title: string;
    brief?: string;
    scheduled_date: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    content_type?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    target_keyword?: string;
    target_url_slug?: string;
    metadata?: Record<string, any>;
    created_at?: string;
}

export type ProjectContextState = {
    projects: Project[];
    activeProject: Project | null;
    isLoading: boolean;
};

