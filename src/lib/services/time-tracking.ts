export interface TimeEntry {
    taskId?: string;
    description: string;
    startTime: string;
    projectName?: string;
}

export class TimeTrackingService {
    /**
     * Starts a timer in TMetric.
     * Note: Requires TMETRIC_API_KEY and TMETRIC_WORKSPACE_ID in process.env
     */
    static async startTMetric(entry: TimeEntry): Promise<any> {
        const response = await fetch('/api/time-tracking/tmetric', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start', ...entry })
        });
        return await response.json();
    }

    /**
     * Stops current timer in TMetric.
     */
    static async stopTMetric(): Promise<any> {
        const response = await fetch('/api/time-tracking/tmetric', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
        });
        return await response.json();
    }

    /**
     * Updates a task status in ClickUp.
     */
    static async updateClickUpTask(taskId: string, status: string): Promise<any> {
        const response = await fetch('/api/time-tracking/clickup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, status })
        });
        return await response.json();
    }
}
