import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NousAssistantMenu from './NousAssistantMenu';

describe('NousAssistantMenu', () => {
    const defaultProps = {
        viewMode: 'writer',
        tasks: [],
        onAction: vi.fn(),
        onWriterAction: vi.fn(),
        selectedCount: 0,
        isProcessing: false,
        processingProgress: 0,
    };

    it('should render writer actions when viewMode is writer', () => {
        render(<NousAssistantMenu {...defaultProps} />);
        expect(screen.getByText('Acciones de Edición')).toBeInTheDocument();
        expect(screen.getByText('Humanizar')).toBeInTheDocument();
        expect(screen.queryByText('Acciones Inteligentes')).not.toBeInTheDocument();
    });

    it('should render planner actions when viewMode is planner', () => {
        render(<NousAssistantMenu {...defaultProps} viewMode="planner" />);
        expect(screen.getByText('Acciones Inteligentes')).toBeInTheDocument();
        expect(screen.getByText('¡A Trabajar!')).toBeInTheDocument();
        expect(screen.queryByText('Acciones de Edición')).not.toBeInTheDocument();
    });

    it('should call onWriterAction when humanize is clicked', () => {
        const onWriterAction = vi.fn();
        render(<NousAssistantMenu {...defaultProps} onWriterAction={onWriterAction} />);
        
        const button = screen.getByText('Humanizar');
        fireEvent.click(button);
        
        expect(onWriterAction).toHaveBeenCalledWith('humanize');
    });

    it('should call onAction with pipeline config when batch button is clicked', () => {
        const onAction = vi.fn();
        render(<NousAssistantMenu {...defaultProps} viewMode="planner" onAction={onAction} />);
        
        const button = screen.getByText('¡A Trabajar!');
        fireEvent.click(button);
        
        expect(onAction).toHaveBeenCalledWith('batch_pipeline', expect.any(Object));
        const config = onAction.mock.calls[0][1];
        expect(config).toHaveProperty('research');
        expect(config).toHaveProperty('draft');
        expect(config).toHaveProperty('humanize');
        expect(config).toHaveProperty('translate');
        expect(config).toHaveProperty('finalStatus');
    });
});
