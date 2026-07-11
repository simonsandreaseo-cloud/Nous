import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeHumanizePipeline, executeSurgicalEditPipeline } from './pipeline';
import { HtmlProtectionService, sizeAwareChunkHtml } from '@/lib/utils/html-protection';
import { streamHumanize, streamSurgicalEdit } from './ai-streaming';
import { sanitizeLLMHtml } from '@/utils/html-parser';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
    single: vi.fn().mockResolvedValue({ data: null }),
  },
}));

vi.mock('./ai-streaming', () => ({
  streamHumanize: vi.fn(),
  streamSurgicalEdit: vi.fn(),
  streamGenerate: vi.fn(),
  streamFinalCleanup: vi.fn((html) => Promise.resolve(html)),
  streamSEOPostProcess: vi.fn(),
}));

vi.mock('@/lib/utils/html-protection', async () => {
  const actual = await vi.importActual('@/lib/utils/html-protection');
  return {
    ...actual,
    HtmlProtectionService: {
      protect: vi.fn(actual.HtmlProtectionService.protect),
      restore: vi.fn(actual.HtmlProtectionService.restore),
    },
    sizeAwareChunkHtml: vi.fn(actual.sizeAwareChunkHtml),
  };
});

describe('Writer Pipeline Protection Integration', () => {
  const mockTask = {
    id: 'test-task',
    title: 'Test Title',
    metadata: {},
  };
  const mockProject = {
    name: 'Test Project',
    settings: { content_preferences: { default_content_language: 'es' } },
  };
  const onLog = vi.fn();
  const onChunk = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeHumanizePipeline', () => {
    it('should follow the Protect -> Chunk -> AI -> Restore flow', async () => {
      const contentWithTable = '<p>Intro</p><table><tr><td>Data</td></tr></table><p>Outro</p>';
      
      // Mock streamHumanize to return the input as is (simulating AI not changing structure)
      (streamHumanize as any).mockImplementation(async (content, config, intensity, onPartial, onLog) => {
        onPartial(content);
        return { html: content };
      });

      await executeHumanizePipeline(
        mockTask as any,
        contentWithTable,
        mockProject as any,
        onLog,
        onChunk
      );

      // Verify Protection was called
      expect(HtmlProtectionService.protect).toHaveBeenCalledWith(sanitizeLLMHtml(contentWithTable));
      
      // Verify sizeAwareChunkHtml was called with blinded HTML
      const { blindedHtml } = HtmlProtectionService.protect(sanitizeLLMHtml(contentWithTable));
      expect(sizeAwareChunkHtml).toHaveBeenCalledWith(blindedHtml, expect.any(Number));
      
      // Verify Restoration was called
      expect(HtmlProtectionService.restore).toHaveBeenCalled();
    });
  });

  describe('executeSurgicalEditPipeline', () => {
    it('should follow the Protect -> Chunk -> AI -> Restore flow', async () => {
      const contentWithTable = '<p>Intro</p><table><tr><td>Data</td></tr></table><p>Outro</p>';
      
      (streamSurgicalEdit as any).mockImplementation(async (content, config, intensity, onPartial, onLog) => {
        onPartial(content);
        return { html: content };
      });

      await executeSurgicalEditPipeline(
        mockTask as any,
        contentWithTable,
        mockProject as any,
        onLog,
        onChunk
      );

      expect(HtmlProtectionService.protect).toHaveBeenCalledWith(sanitizeLLMHtml(contentWithTable));
      const { blindedHtml } = HtmlProtectionService.protect(sanitizeLLMHtml(contentWithTable));
      expect(sizeAwareChunkHtml).toHaveBeenCalledWith(blindedHtml, expect.any(Number));
      expect(HtmlProtectionService.restore).toHaveBeenCalled();
    });
  });
});
