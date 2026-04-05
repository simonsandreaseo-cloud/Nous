import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';
import '@testing-library/jest-dom';

describe('Breadcrumbs Component', () => {
    const mockItems = [
        { label: 'Category', path: '/category' },
        { label: 'Sub-category', path: '/category/sub' },
        { label: 'Current Page' }
    ];

    it('renders the home link by default', () => {
        render(
            <MemoryRouter>
                <Breadcrumbs items={[]} />
            </MemoryRouter>
        );

        const homeLink = screen.getByRole('link', { name: /inicio/i });
        expect(homeLink).toBeInTheDocument();
        expect(homeLink).toHaveAttribute('href', '/');
    });

    it('renders all breadcrumb items correctly', () => {
        render(
            <MemoryRouter>
                <Breadcrumbs items={mockItems} />
            </MemoryRouter>
        );

        // Check if all labels are present
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Sub-category')).toBeInTheDocument();
        expect(screen.getByText('Current Page')).toBeInTheDocument();

        // Check for correct number of links (Home + 2 items with paths)
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(3);
    });

    it('renders links for items with paths and spans for items without paths', () => {
        render(
            <MemoryRouter>
                <Breadcrumbs items={mockItems} />
            </MemoryRouter>
        );

        const categoryLink = screen.getByText('Category').closest('a');
        expect(categoryLink).toHaveAttribute('href', '/category');

        const currentItem = screen.getByText('Current Page');
        expect(currentItem.tagName).toBe('SPAN');
        expect(currentItem).not.toHaveAttribute('href');
    });

    it('applies custom className to the nav element', () => {
        const customClass = "custom-test-class";
        const { container } = render(
            <MemoryRouter>
                <Breadcrumbs items={[]} className={customClass} />
            </MemoryRouter>
        );

        const nav = container.querySelector('nav');
        expect(nav).toHaveClass(customClass);
    });

    it('has the correct accessibility attributes', () => {
        render(
            <MemoryRouter>
                <Breadcrumbs items={mockItems} />
            </MemoryRouter>
        );

        const nav = screen.getByRole('navigation');
        expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');

        const ol = screen.getByRole('list');
        expect(ol).toBeInTheDocument();
    });
});
