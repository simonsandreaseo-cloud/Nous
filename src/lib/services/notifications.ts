import { useToastStore } from "@/store/useToastStore";

// Web-first notification service (decoupled from local node / Tauri)
export class NotificationService {
    /**
     * Shows a browser notification if permission is granted, otherwise logs to console.
     */
    static async notify(title: string, body?: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
        // Trigger In-App Toast
        useToastStore.getState().addToast({ title, description: body, type });

        if (typeof window !== 'undefined') {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body });
            } else {
                console.info(`[Notification] ${title}: ${body ?? ''}`);
            }
        }
    }

    /** Success variant — alias for notify, can be extended with toast in the future. */
    static async success(title: string, body?: string) {
        console.info(`✅ ${title}${body ? ': ' + body : ''}`);
        await NotificationService.notify(title, body, 'success');
    }

    /** Error variant — alias for notify, can be extended with toast in the future. */
    static async error(title: string, body?: string) {
        console.error(`❌ ${title}${body ? ': ' + body : ''}`);
        useToastStore.getState().addToast({ title, description: body, type: 'error' });
        
        if (typeof window !== 'undefined') {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body });
            }
        }
    }

    /** Warning variant */
    static async warning(title: string, body?: string) {
        console.warn(`⚠️ ${title}${body ? ': ' + body : ''}`);
        await NotificationService.notify(title, body, 'warning');
    }
}
