import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NousOrb from './NousOrb';

// Mock the stores to avoid provider issues
vi.mock('@/store/useAppStore', () => ({
    useAppStore: () => ({ nousMode: 'default', setNousMode: vi.fn() })
}));
vi.mock('@/store/useWriterStore', () => ({
    useWriterStore: () => ({
        researchMode: false, setResearchMode: vi.fn(),
        isConsoleOpen: false, setIsConsoleOpen: vi.fn(),
        debugPrompts: [], clearDebugPrompts: vi.fn(),
        strategyOutline: [],
        isAnalyzingSEO: false, isPlanningStructure: false, isGenerating: false, isHumanizing: false,
        statusMessage: '', humanizerStatus: '',
        strategyCannibalization: [],
        researchTopic: '',
        researchPhaseId: '',
        researchProgress: 0
    })
}));
vi.mock('@/store/useProjectStore', () => ({
    useProjectStore: () => ({ activeProject: { i18n_settings: { languages: [] } } })
}));

describe('NousOrb Positioning', () => {
    it('should have fixed positioning when variant is floating', () => {
        // @ts-ignore - testing before prop exists
        const { container } = render(<NousOrb variant="floating" />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain('fixed');
    });

    it('should have relative positioning when variant is header', () => {
        // @ts-ignore - testing before prop exists
        const { container } = render(<NousOrb variant="header" />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).not.toContain('fixed');
        expect(wrapper.className).toContain('relative');
    });
});
