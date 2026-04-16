import { describe, it, expect } from 'vitest';
import { cleanDimension, toTiptapWidth } from '../image-utils';

describe('image-utils', () => {
  describe('cleanDimension', () => {
    it('should strip percentage and return a number', () => {
      expect(cleanDimension('50%')).toBe(50);
    });

    it('should strip px and return a number', () => {
      expect(cleanDimension('800px')).toBe(800);
    });

    it('should return the same number if a number is passed', () => {
      expect(cleanDimension(75)).toBe(75);
    });

    it('should handle undefined or empty strings gracefully', () => {
      expect(cleanDimension('')).toBe(0);
      expect(cleanDimension(undefined as any)).toBe(0);
    });
  });

  describe('toTiptapWidth', () => {
    it('should append % for values <= 100', () => {
      expect(toTiptapWidth(50)).toBe('50%');
      expect(toTiptapWidth(100)).toBe('100%');
    });

    it('should append px for values > 100', () => {
      expect(toTiptapWidth(800)).toBe('800px');
    });

    it('should handle strings that already have units', () => {
      expect(toTiptapWidth('75%')).toBe('75%');
      expect(toTiptapWidth('1024px')).toBe('1024px');
    });
  });
});
