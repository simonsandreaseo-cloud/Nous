import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useDesktopStore } from '@/store/useDesktopStore';

export function DeepLinkManager() {
    const setWebConnected = useDesktopStore(state => state.setWebConnected);

    useEffect(() => {
        // 1. Listen for runtime events (Warm Start - App already open)
        const setupListener = async () => {
            const unlisten = await listen<string>('nous-deep-link', (event) => {
                console.log('Deep link received (Warm):', event.payload);
                handleDeepLink(event.payload);
            });
            return unlisten;
        };

        let unlistenFn: (() => void) | undefined;
        setupListener().then(fn => unlistenFn = fn);

        // 2. Check for pending link (Cold Start - App just launched)
        invoke<string | null>('get_pending_deep_link')
            .then((url) => {
                if (url) {
                    console.log('Deep link received (Cold):', url);
                    handleDeepLink(url);
                }
            })
            .catch(err => console.error('Failed to get pending deep link:', err));

        return () => {
            if (unlistenFn) unlistenFn();
        };
    }, []);

    const handleDeepLink = (rawUrl: string) => {
        try {
            console.log('Processing URL:', rawUrl);
            let urlToParse = rawUrl;
            if (!urlToParse.startsWith('http')) {
                urlToParse = urlToParse.replace('nous://', 'http://dummy/');
            }

            const urlObj = new URL(urlToParse);
            const token = urlObj.searchParams.get('token');

            if (token) {
                console.log('Token extracted:', token);
                setWebConnected(true, token);
                alert(`🔗 CONEXIÓN EXITOSA\nMotor sincronizado con la nube.`);
            }
        } catch (e) {
            console.error('Failed to parse deep link:', rawUrl, e);
        }
    };

    return null;
}
