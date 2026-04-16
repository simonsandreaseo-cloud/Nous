import { describe, it, expect, vi } from 'vitest';
import { SemanticAnchorManager } from '../../src/lib/services/images/SemanticAnchorManager';

describe('SemanticAnchorManager', () => {
  
  describe('normalize', () => {
    it('should convert to lowercase and remove accents', () => {
      const input = "¡Hola, cómo ESTÁS!";
      const expected = "hola como estas";
      expect(SemanticAnchorManager.normalize(input)).toBe(expected);
    });

    it('should handle special characters and extra spaces', () => {
      const input = "  IA & Maquetación: El Futuro...  ";
      const expected = "ia maquetacion el futuro";
      expect(SemanticAnchorManager.normalize(input)).toBe(expected);
    });
  });

  describe('findBestPosition', () => {
    const createMockDoc = (content: { text: string, pos: number }[]) => ({
      descendants: vi.fn((cb) => {
        content.forEach(item => {
          cb({ 
            isText: true, 
            text: item.text, 
            type: { name: 'text' } 
          }, item.pos);
        });
      })
    });

    it('should find exact match with 100% confidence', () => {
      const doc = createMockDoc([
        { text: "El futuro de la IA es brillante.", pos: 100 }
      ]);
      const result = SemanticAnchorManager.findBestPosition(doc, "futuro de la IA");
      
      expect(result.strategy).toBe('exact');
      expect(result.confidence).toBe(1);
      expect(result.pos).toBe(103); 
    });

    it('should find fuzzy match if exact fails (case/accents)', () => {
      const doc = createMockDoc([
        { text: "Maquetación Profesional en Nous.", pos: 200 }
      ]);
      const result = SemanticAnchorManager.findBestPosition(doc, "maquetacion profesional");
      
      expect(result.strategy).toBe('fuzzy');
      expect(result.confidence).toBe(0.8);
      expect(result.pos).toBe(200);
    });

    it('should return fallback if no match is found', () => {
      const doc = createMockDoc([
        { text: "Algún texto aleatorio.", pos: 300 }
      ]);
      const result = SemanticAnchorManager.findBestPosition(doc, "frase inexistente");
      
      expect(result.strategy).toBe('fallback');
      expect(result.confidence).toBe(0);
    });
  });
});
