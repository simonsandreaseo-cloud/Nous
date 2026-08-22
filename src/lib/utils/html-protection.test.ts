import { describe, it, expect } from 'vitest';
import { HtmlProtectionService, sizeAwareChunkHtml } from './html-protection';

describe('HtmlProtectionService', () => {
  describe('protect', () => {
    it('should replace a single table with an atomic token', () => {
      const html = '<div><p>Hello</p><table><tr><td>Data</td></tr></table><p>World</p></div>';
      const { blindedHtml, map } = HtmlProtectionService.protect(html);
      
      expect(blindedHtml).toBe('<div><p>Hello</p>[[ATOMIC_BLOCK_0]]<p>World</p></div>');
      expect(map.get('[[ATOMIC_BLOCK_0]]')).toBe('<table><tr><td>Data</td></tr></table>');
    });

    it('should replace multiple tables with sequential tokens', () => {
      const html = '<table>T1</table><p>Text</p><table>T2</table>';
      const { blindedHtml, map } = HtmlProtectionService.protect(html);
      
      expect(blindedHtml).toBe('[[ATOMIC_BLOCK_0]]<p>Text</p>[[ATOMIC_BLOCK_1]]');
      expect(map.get('[[ATOMIC_BLOCK_0]]')).toBe('<table>T1</table>');
      expect(map.get('[[ATOMIC_BLOCK_1]]')).toBe('<table>T2</table>');
    });

    it('should protect tables with attributes', () => {
      const html = '<table class="test-table" border="1"><tr><td>Data</td></tr></table>';
      const { blindedHtml, map } = HtmlProtectionService.protect(html);
      
      expect(blindedHtml).toBe('[[ATOMIC_BLOCK_0]]');
      expect(map.get('[[ATOMIC_BLOCK_0]]')).toBe(html);
    });

    it('should protect callout divs and blockquotes as atomic tokens', () => {
      const html = '<div class="pro-tip"><p>Tip</p></div><blockquote><p>Quote</p></blockquote>';
      const { blindedHtml, map } = HtmlProtectionService.protect(html);
      
      expect(blindedHtml).toBe('[[ATOMIC_BLOCK_0]][[ATOMIC_BLOCK_1]]');
      expect(map.get('[[ATOMIC_BLOCK_0]]')).toBe('<div class="pro-tip"><p>Tip</p></div>');
      expect(map.get('[[ATOMIC_BLOCK_1]]')).toBe('<blockquote><p>Quote</p></blockquote>');
    });

    it('should return original HTML if no tables, callouts, or blockquotes are present', () => {
      const html = '<div><p>No tables here</p></div>';
      const { blindedHtml, map } = HtmlProtectionService.protect(html);
      
      expect(blindedHtml).toBe(html);
      expect(map.size).toBe(0);
    });
  });

  describe('restore', () => {
    it('should restore a single table from its token', () => {
      const blindedHtml = '<div>[[ATOMIC_BLOCK_0]]</div>';
      const map = new Map([['[[ATOMIC_BLOCK_0]]', '<table>T1</table>']]);
      const restored = HtmlProtectionService.restore(blindedHtml, map);
      
      expect(restored).toBe('<div><table>T1</table></div>');
    });

    it('should restore multiple tables in correct positions', () => {
      const blindedHtml = '[[ATOMIC_BLOCK_0]] text [[ATOMIC_BLOCK_1]]';
      const map = new Map([
        ['[[ATOMIC_BLOCK_0]]', '<table>T1</table>'],
        ['[[ATOMIC_BLOCK_1]]', '<table>T2</table>']
      ]);
      const restored = HtmlProtectionService.restore(blindedHtml, map);
      
      expect(restored).toBe('<table>T1</table> text <table>T2</table>');
    });

    it('should handle case where AI modified surrounding text but tokens remain', () => {
      const blindedHtml = 'Here is the data: [[ATOMIC_BLOCK_0]], as requested.';
      const map = new Map([['[[ATOMIC_BLOCK_0]]', '<table>T1</table>']]);
      const restored = HtmlProtectionService.restore(blindedHtml, map);
      
      expect(restored).toBe('Here is the data: <table>T1</table>, as requested.');
    });
  });
});

describe('sizeAwareChunkHtml', () => {
  it('should split HTML into chunks approximately maxChars', () => {
    const html = '<p>Paragraph 1</p><p>Paragraph 2</p><p>Paragraph 3</p>';
    const maxChars = 30;
    const chunks = sizeAwareChunkHtml(html, maxChars);
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.flat().join('')).toBe(html);
  });

  it('should not split boundary elements', () => {
    const html = '<div><p>Very long paragraph that should stay together</p></div>';
    const maxChars = 10;
    const chunks = sizeAwareChunkHtml(html, maxChars);
    
    const allChunksFlattened = chunks.flat().join('');
    expect(allChunksFlattened).toContain('<p>Very long paragraph that should stay together</p>');
    
    // Verify that the paragraph was not split across different blocks
    const paragraph = '<p>Very long paragraph that should stay together</p>';
    const foundInSingleBlock = chunks.flat().some(block => block.includes(paragraph));
    expect(foundInSingleBlock).toBe(true);
  });

  it('should treat protected tokens as atomic units', () => {
    const html = '<p>Text</p>[[ATOMIC_BLOCK_0]]<p>More text</p>';
    const maxChars = 10;
    const chunks = sizeAwareChunkHtml(html, maxChars);
    
    // [[ATOMIC_BLOCK_0]] should never be split
    const allContent = chunks.flat().join('');
    expect(allContent).toContain('[[ATOMIC_BLOCK_0]]');
    
    // Check if any chunk contains only a partial token
    chunks.flat().forEach(chunk => {
      if (chunk.includes('[[') || chunk.includes(']]')) {
        expect(chunk).toContain('[[ATOMIC_BLOCK_0]]');
      }
    });
  });
});
