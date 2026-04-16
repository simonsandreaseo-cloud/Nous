import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useImageManager } from '../useImageManager';

// Mock dependencies to avoid Supabase/Store initialization errors
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(),
      })),
    },
  },
}));

vi.mock('@/store/useWriterStore', () => ({
  useWriterStore: {
    getState: vi.fn(() => ({
      draftId: 'test-draft',
      projectId: 'test-project',
    })),
  },
}));

vi.mock('@/lib/actions/imageActions', () => ({
    deleteImageAction: vi.fn().mockResolvedValue({ success: true }),
}));


// Mock del editor de Tiptap
const mockEditor = {
  state: {
    doc: {
      descendants: vi.fn(),
    },
    tr: {
      setNodeMarkup: vi.fn().mockReturnThis(),
    },
  },
  commands: {
    updateAttributes: vi.fn(),
  },
  view: {
    dispatch: vi.fn(),
  },
};

describe('useImageManager', () => {
  it('should extract images and slots from the editor document', () => {
    // Escenario: El documento tiene un slot y una imagen
    const mockNodes = [
      { 
        type: { name: 'imageSlot' }, 
        attrs: { id: 'slot_1', prompt: 'Prompt 1', type: 'inline' },
        isLeaf: true 
      },
      { 
        type: { name: 'nousAsset' }, 
        attrs: { 
          id: 'img_1', 
          url: 'url_1', 
          prompt: 'Prompt 2', 
          type: 'featured',
          width: '100%',
          align: 'center',
          wrapping: 'break'
        },
        isLeaf: true 
      },
    ];

    (mockEditor.state.doc.descendants as any).mockImplementation((cb: any) => {
      mockNodes.forEach((node, pos) => cb(node, pos));
    });

    const { result } = renderHook(() => useImageManager(mockEditor as any));

    expect(result.current.state.assets).toHaveLength(2);
    expect(result.current.state.assets[0].id).toBe('slot_1');
    expect(result.current.state.assets[0].type).toBe('slot');
    expect(result.current.state.assets[1].id).toBe('img_1');
    expect(result.current.state.assets[1].type).toBe('image');
    expect(result.current.state.assets[1].attributes.width).toBe('100%');
  });

  it('should update asset attributes using the unique ID', () => {
    // Este test fallará inicialmente porque la implementación actual busca por index
    const { result } = renderHook(() => useImageManager(mockEditor as any));
    
    act(() => {
      result.current.updateAssetAttributes('img_1', { width: '50%' });
    });

    // En Tiptap, buscamos por ID navegando el doc
    expect(mockEditor.state.doc.descendants).toHaveBeenCalled();
  });
});
