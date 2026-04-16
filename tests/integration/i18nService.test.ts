import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nService } from '../../src/lib/services/report/i18nService';
import * as aiCore from '../../src/lib/services/writer/ai-core';

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
    upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

describe('I18nService.translateText Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should select the Catalan expert model for Catalan translation', async () => {
    // Use spyOn on the exported object to intercept calls made by I18nService
    const rotationSpy = vi.spyOn(aiCore, 'executeWithKeyRotation').mockResolvedValue('Translated Text');
    
    await I18nService.translateText('Hello', 'Catalan');
    
    expect(rotationSpy).toHaveBeenCalledWith(
      expect.any(Function),
      'gemini-2.5-flash-lite', // Catalan expert
      expect.arrayContaining(['gemini-2.5-flash-lite']),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'Translation Cascade'
    );
  });

  it('should select the Asian expert model for Japanese translation', async () => {
    const rotationSpy = vi.spyOn(aiCore, 'executeWithKeyRotation').mockResolvedValue('Translated Text');
    
    await I18nService.translateText('Hello', 'Japanese');
    
    expect(rotationSpy).toHaveBeenCalledWith(
      expect.any(Function),
      'qwen/qwen3-32b', // Asian expert
      expect.arrayContaining(['qwen/qwen3-32b']),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'Translation Cascade'
    );
  });

  it('should select the Complex expert model for Arabic translation', async () => {
    const rotationSpy = vi.spyOn(aiCore, 'executeWithKeyRotation').mockResolvedValue('Translated Text');
    
    await I18nService.translateText('Hello', 'Arabic');
    
    expect(rotationSpy).toHaveBeenCalledWith(
      expect.any(Function),
      'llama-3.3-70b-versatile', // Complex expert
      expect.arrayContaining(['llama-3.3-70b-versatile']),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'Translation Cascade'
    );
  });

  it('should trigger console.warn when language detection falls back to default', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const mockSettings = {
      languages: ['English', 'Spanish'],
      default_language: 'English',
      pattern: 'subdirectory',
      locale_mapping: {}
    };
    
    // Test with a language not in the list
    const result = I18nService.detectLanguage('/fr/page', mockSettings);
    
    expect(result).toBe('English');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[I18nService] Language detection fallback to default: English'),
      expect.anything()
    );
  });
});