import { LocalNodeBridge } from '@/lib/local-node/bridge';

export class NotificationService {
    /**
     * Sends a native system notification if the local node is available.
     * Falls back to console/alert if in web mode.
     */
    static async notify(title: string, body: string): Promise<void> {
        if (LocalNodeBridge.isAvailable()) {
            try {
                const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');

                let permissionGranted = await isPermissionGranted();
                if (!permissionGranted) {
                    const permission = await requestPermission();
                    permissionGranted = permission === 'granted';
                }

                if (permissionGranted) {
                    sendNotification({ title, body, icon: 'shield' });
                }
            } catch (e) {
                console.error("Notification Error:", e);
            }
        } else {
            console.log(`[Notification] ${title}: ${body}`);
        }
    }
}
