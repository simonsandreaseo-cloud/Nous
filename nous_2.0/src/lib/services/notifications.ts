import { LocalNodeBridge } from '@/lib/local-node/bridge';

export class NotificationService {
    /**
     * Sends a native system notification if the local node is available.
     * Falls back to console/alert if in web mode.
     */
    static async notify(title: string, body?: string) {
        if (LocalNodeBridge.isTauriAvailable()) {
            try {
                // Use Tauri notification plugin if available
                const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
                const permission = await isPermissionGranted();
                if (!permission) {
                    const request = await requestPermission();
                    if (request !== 'granted') return;
                }

                sendNotification({ title, body });
            } catch (e) {
                console.warn("Notification error:", e);
            }
        } else {
            // Browser fallback
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(title, { body });
            }
        }
    }
}
