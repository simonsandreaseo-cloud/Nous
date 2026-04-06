export interface SystemStatus {
    webSocketConnected: boolean; // Is the local node connected via WSS?
    activeCrawls: number; // Number of active Deep Crawler Pro tasks
    localResourceUsage: number; // 0-100% CPU/RAM load from local node
    lastSyncTimestamp: string; // ISO date of last Supabase sync
}

export interface CrawlerEvent {
    type: "crawler:status" | "data:refinery_progress" | "system:health" | "supabase:sync_complete";
    payload: any;
}

// Store extensions for local node communication would go here
