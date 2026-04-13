export interface Project {
    id: string;
    user_id: string;
    name: string;
    domain: string;
    description?: string;
    scraper_settings: {
        paths: string[];
        lastScan?: string;
    };
    settings?: {
        content_preferences?: {
            min_internal_links: number;
            max_internal_links: number;
            default_strategy?: 'auto' | 'ecommerce' | 'informational';
            default_translator_languages?: string[];
        };
        images?: {
            watermark_enabled: boolean;
            max_kb: number;
            portada: { width: number; height: number };
            body: { width: number; height: number };
        };
    } & Record<string, any>;
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
    color?: string; // Hex color for the project badge
    architecture_rules?: { name: string; regex: string }[];
    architecture_instructions?: string;
    nous_extractors?: NousExtractorRule[];
    custom_widgets?: CustomWidget[];
    created_at?: string;
    team_id?: string; // NEW: Project belongs to a team
    google_connection_id?: string; // NEW: Linked to global connection vault
    current_sprint_start?: string; // NEW: Manual sprint start date
    current_sprint_end?: string;   // NEW: Manual sprint end date
    budget_settings?: {
        // Content mode (Legacy/Volume)
        monthly_word_budget?: number;
        monthly_layout_budget?: number;
        
        // Mode control
        mode?: 'content' | 'financial';

        // Financial mode
        word_price_usd?: number;
        layout_price_usd?: number;
        word_budget_usd?: number;
        layout_budget_usd?: number;
        total_financial_budget?: number;

        // Legacy/Shared
        total_budget?: number; 
    };
    i18n_settings?: {
        pattern: 'subdirectory' | 'subdomain' | 'prefix' | 'custom';
        languages: string[];
        extraction_regex?: string;
        locale_mapping?: Record<string, string>;
        default_language?: string;
    };
    last_discovery_at?: string;
}

export interface LogicClause {
    id: string;
    field: 'url' | 'content';
    operator: 'matches' | 'regex' | 'contains' | 'not_contains';
    value: string;
}

export interface NousExtractorRule {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
    logic_operator: 'AND' | 'OR';
    clauses: LogicClause[];
    extraction_type: 'regex' | 'selector' | 'ai';
    extraction_value: string; 
    output_template: string; 
    target_phases: ('research' | 'planner' | 'writer')[];
    placement_mode?: 'inline' | 'new_line' | 'new_paragraph';
    show_in_writer?: boolean;
}

export interface CustomWidget {
    id: string;
    type: 'nous_extractor' | 'price_monitor' | 'entity_extractor' | 'link_patcher' | 'asset_patcher';
    name: string;
    description?: string;
    config: any;
    is_active: boolean;
    show_in_writer?: boolean;
    created_at?: string;
}

export interface Team {
    id: string;
    name: string;
    owner_id: string;
    header_color?: string;
    icon_color?: string;
    icon_url?: string;
    icon_library?: string;
    created_at: string;
    updated_at: string;
}

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    role: 'owner' | 'partner' | 'manager' | 'specialist' | 'client';
    custom_permissions?: CustomPermissions;
    presence_status?: 'online' | 'busy' | 'offline';

    last_seen_at?: string;
    current_task_id?: string;
    created_at: string;
    profile?: {
        id: string;
        full_name: string;
        avatar_url: string;
    };
}

export type TaskStatus = 
    | 'idea' 
    | 'en_investigacion' 
    | 'por_redactar' 
    | 'en_redaccion' 
    | 'por_corregir' 
    | 'por_maquetar' 
    | 'publicado';


export interface Task {
    id: string;
    project_id: string;
    title: string;
    brief?: string;
    scheduled_date: string;
    status: TaskStatus;
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
    associated_url?: string; // Interlinking target URL
    secondary_url?: string;  // Additional interlinking URL
    creator_id?: string;     // NEW: User ID who created the task
    researcher_id?: string;  // NEW: User ID who performed SEO research
    writer_id?: string;      // NEW: User ID who wrote the content
    corrector_id?: string;   // NEW: User ID who corrected/approved
    assigned_to?: string;    // User ID assigned to this task
    assigned_at?: string;    // Timestamp when task was assigned
    completed_at?: string;   // Timestamp when task was completed
    created_at?: string;
    content_body?: string;   // FOR CONSOLIDATION
    metrics?: any;           // FOR CONSOLIDATION
    seo_data?: any;          // FOR CONSOLIDATION
    target_word_count?: number; // Target word count for the piece
    word_count_real?: number;   // Actual word count synced from editor
    lsi_keywords?: string[];   // List of LSI keywords to track
    attachments?: any[];       // Attached images/files
    seo_title?: string;        // Optimized for SERP
    meta_description?: string; // Optimized for SERP
    h1?: string;               // Article Main Heading
    excerpt?: string;          // Short summary/intro for the article
    schemas?: any;             // JSON-LD or AI suggested schemas
    language?: string;         // ISO language code
    translation_parent_id?: string; // ID of the original task
    content_type?: string;     // Type of content (Blog, Landing, Review, etc.)
}


export interface CustomPermissions {
    admin: boolean;
    create_delete: boolean;
    edit_all: boolean;
    take_edit_tasks: boolean;
    take_edit_contents: boolean;
    take_edit_reports: boolean;
    all_tools_access: boolean;
    monthly_tokens_limit?: number;
    tokens_used_this_month?: number;
}

export interface ProjectMember {
    id: string;
    project_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    custom_permissions?: CustomPermissions;
    created_at?: string;
}

export interface ProjectInvite {
    id: string;
    project_id: string;
    email: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    custom_permissions?: CustomPermissions;
    token: string;
    invited_by: string;
    created_at: string;
    expires_at: string;
}

export type ProjectContextState = {
    projects: Project[];
    activeProject: Project | null;
    isLoading: boolean;
};

