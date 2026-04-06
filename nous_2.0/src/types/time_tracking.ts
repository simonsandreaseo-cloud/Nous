export interface TimeEntry {
    id: string;
    user_id: string;
    task_id?: string;
    start_time: string;
    end_time?: string;
    description?: string;
    is_manual: boolean;
    created_at: string;
    // Computed fields
    duration?: number; // in seconds
    task?: {
        title: string;
        project?: {
            name: string;
        }
    }
}

export interface ActivityLog {
    id: string;
    entry_id: string;
    screenshot_url?: string;
    activity_level: number;
    keyboard_events: number;
    mouse_events: number;
    captured_at: string;
}

export interface TimeTrackingState {
    activeEntry: TimeEntry | null;
    isLoading: boolean;
    error: string | null;
}
