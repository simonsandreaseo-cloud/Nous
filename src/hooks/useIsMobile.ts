'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current screen width is below a given breakpoint (default: 768px - md).
 * Safely handles SSR by returning false initially, then updating after mount.
 */
export function useIsMobile(breakpoint = 768): boolean {
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        // Check initially on mount
        checkIsMobile();

        // Listen for window resize
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, [breakpoint]);

    return isMobile;
}
