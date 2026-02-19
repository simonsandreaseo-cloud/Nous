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
    gsc_site_url?: string;
    gsc_account_email?: string;
    ga4_connected?: boolean;
    ga4_property_id?: string;
    ga4_account_email?: string;
    wp_url?: string;
    wp_token?: string;
    target_country?: string; // ISO 3166-1 alpha-2 or similar
    logo_url?: string;
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
    volume?: number; // Monthly search volume
    viability?: string; // e.g., 'optimo', 'no vendemos marca'
    refs?: string[]; // Reference URLs
    word_count?: number; // Target word count
    ai_percentage?: number; // Estimated AI content percentage
    docs_url?: string; // Link to Google Doc or similar
    layout_status?: boolean; // Whether content is formatted / maquetado
    research_dossier?: any;
    outline_structure?: any;
    quality_checklist?: any;
    semantic_refs?: any[];
    url?: string;
    created_at?: string;
}

export type ProjectContextState = {
    projects: Project[];
    activeProject: Project | null;
    isLoading: boolean;
};

