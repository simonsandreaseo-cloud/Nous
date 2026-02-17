import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useDesktopStore } from '@/store/useDesktopStore';

export function DeepLinkManager() {
    const setWebConnected = useDesktopStore(state => state.setWebConnected);

    useEffect(() => {
        const processDeepLink = (rawUrl: string) => {
            try {
                console.log('[DeepLink] Processing:', rawUrl);
                let urlToParse = rawUrl;
                if (!urlToParse.startsWith('http')) {
                    urlToParse = urlToParse.replace('nous://', 'http://dummy/');
                }

                const urlObj = new URL(urlToParse);
                const token = urlObj.searchParams.get('token');

                if (token) {
                    console.log('[DeepLink] Token found:', token);
                    setWebConnected(true, token);
                    // Crucial for user feedback
                    alert(`🔗 CONEXIÓN EXITOSA\nSincronización con la nube completada.`);
                } else {
                    console.warn('[DeepLink] No token in URL:', rawUrl);
                }
            } catch (e) {
                console.error('[DeepLink] Processing error:', e);
            }
        };

        // 1. Listen for runtime events (Warm Start)
        let unlistenFn: (() => void) | undefined;

        const init = async () => {
            console.log('[DeepLink] Initializing listeners...');
            const unlisten = await listen<string>('nous-deep-link', (event) => {
                console.log('[DeepLink] Event received (Warm):', event.payload);
                processDeepLink(event.payload);
            });
            unlistenFn = unlisten;

            // 2. Check for pending link (Cold Start)
            try {
                const url = await invoke<string | null>('get_pending_deep_link');
                if (url) {
                    console.log('[DeepLink] Pending link found (Cold):', url);
                    processDeepLink(url);
                }
            } catch (err) {
                console.error('[DeepLink] Failed to fetch pending link:', err);
            }
        };

        init();

        return () => {
            if (unlistenFn) unlistenFn();
        };
    }, [setWebConnected]);

    return null;
}
