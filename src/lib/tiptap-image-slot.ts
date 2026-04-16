import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageSlotNodeView from '@/components/contents/writer/ImageSlotNodeView';

/**
 * ImageSlot Node
 * Visual placeholder for AI-planned images.
 * Uses the same flattened attribute schema as NousAsset for consistency.
 */
export const ImageSlot = Node.create({
  name: 'imageSlot',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: { default: null },
      role: { default: 'feature' }, // 'hero' | 'feature' | 'icon' | 'info'
      prompt: { default: '' },
      status: { default: 'pending' },
      semanticAnchor: { default: null },
      paragraphIndex: { default: 0 },
      width: { default: '100%' },
      align: { default: 'center' },
      wrapping: { default: 'break' },
      aspectRatio: { default: '16:9' }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="imageSlot"]',
        getAttrs: element => {
          if (typeof element === 'string') return {};
          return {
            id: element.getAttribute('data-id'),
            role: element.getAttribute('data-role') || 'feature',
            prompt: element.getAttribute('data-prompt') || '',
            status: element.getAttribute('data-status') || 'pending',
            semanticAnchor: element.getAttribute('data-anchor'),
            paragraphIndex: parseInt(element.getAttribute('data-paragraph') || '0'),
            width: element.getAttribute('data-width') || '100%',
            align: element.getAttribute('data-align') || 'center',
            wrapping: element.getAttribute('data-wrapping') || 'break',
            aspectRatio: element.getAttribute('data-ratio') || '16:9'
          };
        }
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { 
        id, role, prompt, semanticAnchor, align, wrapping, width, ...rest 
    } = HTMLAttributes;

    const styles: Record<string, string> = {};

    styles['width'] = width || '100%';
    styles['max-width'] = '100%';

    if (align === 'center') {
        styles['display'] = 'block';
        styles['margin-left'] = 'auto';
        styles['margin-right'] = 'auto';
    } else if (align === 'full') {
        styles['width'] = '100%';
        styles['display'] = 'block';
        styles['clear'] = 'both';
    } else if (align === 'left' || align === 'right') {
        styles['float'] = align;
        styles['margin'] = align === 'left' ? '0 1.5rem 1rem 0' : '0 0 1rem 1.5rem';
    }

    const styleString = Object.entries(styles)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');

    return [
      'div', 
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'imageSlot',
        'class': 'nous-image-slot',
        'style': styleString,
        'data-id': id,
        'data-role': role,
        'data-anchor': semanticAnchor
      })
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageSlotNodeView);
  },
});
