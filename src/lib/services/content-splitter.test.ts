import { describe, it, expect } from 'vitest';
import { ContentSplitterService } from './content-splitter';

describe('ContentSplitterService', () => {
    it('splits flat HTML with H2 tags into chunks of max limitValue words', () => {
        const html = `
            <h2>Header 1</h2>
            <p>${'word '.repeat(500)}</p>
            <h2>Header 2</h2>
            <p>${'word '.repeat(800)}</p>
            <h2>Header 3</h2>
            <p>${'word '.repeat(900)}</p>
        `;

        const chunks = ContentSplitterService.splitContent(html, {
            limitType: 'words',
            limitMode: 'max_h2',
            limitValue: 1000
        });

        expect(chunks.length).toBe(3);
        chunks.forEach(chunk => {
            expect(chunk.wordCount).toBeLessThanOrEqual(1000);
        });
    });

    it('splits HTML wrapped in a single root container <div>', () => {
        const html = `
            <div class="editor-content">
                <h2>Header 1</h2>
                <p>${'word '.repeat(500)}</p>
                <h2>Header 2</h2>
                <p>${'word '.repeat(800)}</p>
                <h2>Header 3</h2>
                <p>${'word '.repeat(900)}</p>
            </div>
        `;

        const chunks = ContentSplitterService.splitContent(html, {
            limitType: 'words',
            limitMode: 'max_h2',
            limitValue: 1000
        });

        expect(chunks.length).toBe(3);
        chunks.forEach(chunk => {
            expect(chunk.wordCount).toBeLessThanOrEqual(1000);
        });
    });

    it('splits HTML without any H2 tags', () => {
        const html = `
            <p>${'word '.repeat(800)}</p>
            <p>${'word '.repeat(800)}</p>
            <p>${'word '.repeat(800)}</p>
        `;

        const chunks = ContentSplitterService.splitContent(html, {
            limitType: 'words',
            limitMode: 'max_h2',
            limitValue: 1000
        });

        expect(chunks.length).toBe(3);
        chunks.forEach(chunk => {
            expect(chunk.wordCount).toBeLessThanOrEqual(1000);
        });
    });

    it('splits an H2 section that itself exceeds limitValue', () => {
        const html = `
            <h2>Huge Header</h2>
            <p>${'word '.repeat(1200)}</p>
            <p>${'word '.repeat(1200)}</p>
        `;

        const chunks = ContentSplitterService.splitContent(html, {
            limitType: 'words',
            limitMode: 'max_h2',
            limitValue: 1000
        });

        expect(chunks.length).toBeGreaterThanOrEqual(2);
        chunks.forEach(chunk => {
            expect(chunk.wordCount).toBeLessThanOrEqual(1000);
        });
    });

    it('splits exact mode properly', () => {
        const html = `
            <p>${'word '.repeat(600)}</p>
            <p>${'word '.repeat(600)}</p>
            <p>${'word '.repeat(600)}</p>
        `;

        const chunks = ContentSplitterService.splitContent(html, {
            limitType: 'words',
            limitMode: 'exact',
            limitValue: 1000
        });

        expect(chunks.length).toBe(3);
        chunks.forEach(chunk => {
            expect(chunk.wordCount).toBeLessThanOrEqual(1000);
        });
    });

    it('handles Optica Bassol "Para Originality" config (12000 chars, max_h2, excludeRegex)', () => {
        const html = `
            <div class="prose">
                <h2>Seccion 1 [*123,456*]</h2>
                <p>${'A'.repeat(5000)} {*789*}</p>
                <h2>Seccion 2</h2>
                <p>${'B'.repeat(8000)}</p>
                <h2>Seccion 3</h2>
                <p>${'C'.repeat(7000)}</p>
            </div>
        `;

        const chunks = ContentSplitterService.splitContent(html, {
            limitType: 'characters',
            limitMode: 'max_h2',
            limitValue: 12000,
            excludeRegex: ["\\[\\*\\d+(?:,\\d+)*\\*\\]", "\\{\\*\\d+(?:,\\d+)*\\*\\}"]
        });

        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(chunk => {
            expect(chunk.charCount).toBeLessThanOrEqual(12000);
            expect(chunk.text).not.toContain('[*123,456*]');
            expect(chunk.text).not.toContain('{*789*}');
        });
    });

    it('handles Optica Bassol "Corte Minimo" config (900 chars, exact)', () => {
        const html = `
            <p>${'X'.repeat(800)}</p>
            <p>${'Y'.repeat(800)}</p>
            <p>${'Z'.repeat(800)}</p>
        `;

        const chunks = ContentSplitterService.splitContent(html, {
            limitType: 'characters',
            limitMode: 'exact',
            limitValue: 900
        });

        expect(chunks.length).toBe(3);
        chunks.forEach(chunk => {
            expect(chunk.charCount).toBeLessThanOrEqual(900);
        });
    });
});
