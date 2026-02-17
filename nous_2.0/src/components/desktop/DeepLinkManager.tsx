import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export function DeepLinkManager() {
    useEffect(() => {
        // 1. Listen for deep link events (Hot start)
        const unlisten = listen<string>('nous-deep-link', (event) => {
            console.log('Deep link received (Event):', event.payload);
            handleDeepLink(event.payload);
        });

        // 2. Check for pending deep link (Cold start)
        invoke<string | null>('get_pending_deep_link')
            .then((link) => {
                if (link) {
                    console.log('Deep link received (Pending):', link);
                    handleDeepLink(link);
                }
            })
            .catch(err => console.error('Failed to check pending deep link:', err));

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const handleDeepLink = (url: string) => {
        // nous://auth-callback?token=xyz
        try {
            const urlObj = new URL(url);
            const token = urlObj.searchParams.get('token');
            if (token) {
                console.log("Authentication Token Found:", token);
                // TODO: Save token to store/localStorage and notify user
            }
        } catch (e) {
            console.error("Invalid deep link URL:", url);
        }
    };

    return null; // Headless component
}
