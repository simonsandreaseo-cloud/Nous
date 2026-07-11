import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCustomTransformTask } from './customTransform';
import { HtmlProtectionService, sizeAwareChunkHtml } from '@/lib/utils/html-protection';
import { fetchCustomTransformPlan, streamCustomTransformChunk } from '@/lib/services/writer/ai-streaming';
import { supabase } from '@/lib/supabase';
import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock('@/lib/services/writer/ai-streaming', () => ({
  fetchCustomTransformPlan: vi.fn(),
  streamCustomTransformChunk: vi.fn(),
}));

vi.mock('@/store/useWriterStore', () => ({
  useWriterStore: {
    getState: vi.fn().mockReturnValue({
      draftId: 'test-draft',
      addDebugPrompt: vi.fn(),
      setContent: vi.fn(),
      saveTaskVersion: vi.fn().mockResolvedValue({}),
      setIsRemoteUpdate: vi.fn(),
    }),
  },
}));

vi.mock('@/store/useQueueStore', () => ({
  useQueueStore: {
    getState: vi.fn().mockReturnValue({
      addLogToTask: vi.fn(),
      setTaskStatus: vi.fn(),
    }),
  },
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

describe('Custom Transform Queue Handler Protection Integration', () => {
  const mockPayload = {
    taskId: 'test-task',
    content: '<p>Intro</p><table><tr><td>Data</td></tr></table><p>Outro</p>',
    config: { chunkSize: 4 },
    userInstructions: 'Make it premium',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should follow the Protect -> Chunk -> AI -> Restore flow', async () => {
    (fetchCustomTransformPlan as any).mockResolvedValue({
      stylesheet: '.custom-article { color: red; }',
      plan: [{ index: 0, focus: 'All', pautasEspecificas: 'Style it' }],
    });

    (streamCustomTransformChunk as any).mockImplementation(async (content, style, pautas, onPartial, onLog) => {
      onPartial(content);
      return { html: content };
    });

    await handleCustomTransformTask('test-task', mockPayload as any);

    // Verify Protection was called
    expect(HtmlProtectionService.protect).toHaveBeenCalled();
    
    // Verify sizeAwareChunkHtml was called
    expect(sizeAwareChunkHtml).toHaveBeenCalled();
    
    // Verify Restoration was called
    expect(HtmlProtectionService.restore).toHaveBeenCalled();
  });
});
