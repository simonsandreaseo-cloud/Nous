import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Extension para manejar in-place replacement de chunks.
 * Define un contenedor block (<div data-chunk-id="x">) que Tiptap entenderá
 * para envolver múltiples elementos y darles feedback de procesamiento.
 */
export const ChunkContainer = Node.create({
  name: 'chunkContainer',
  group: 'block',
  content: 'block+',

  parseHTML() {
    return [
      { tag: 'div[data-chunk-id]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'nous-chunk-container relative' }), 0];
  },

  addAttributes() {
    return {
      'data-chunk-id': {
        default: null,
      },
      'data-processing-state': {
        default: 'idle',
        renderHTML: attributes => {
          if (!attributes['data-processing-state']) return {};
          
          const isProcessing = attributes['data-processing-state'] === 'processing';
          const classes = isProcessing 
            ? 'animate-pulse bg-indigo-50/50 border-l-4 border-indigo-500 pl-4 py-2 my-2 rounded-r-md transition-all duration-300' 
            : '';

          return { 
              'data-processing-state': attributes['data-processing-state'],
              class: classes
          };
        }
      }
    };
  }
});
