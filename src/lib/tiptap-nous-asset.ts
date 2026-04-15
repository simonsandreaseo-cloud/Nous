import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import NousAssetNodeView from '@/components/contents/writer/NousAssetNodeView';

export const NousAsset = Node.create({
  name: 'nousAsset',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: { default: null },
      url: { default: null },
      type: { default: 'inline' }, // 'featured' | 'inline'
      alt: { default: '' },
      title: { default: '' },
      prompt: { default: '' },
      semanticAnchor: { default: null },
      status: { default: 'final' }, // 'ghost' | 'final'
      paragraphIndex: { default: null },
      width: { default: '100%' },
      height: { default: 'auto' },
      align: { default: 'center' },
      wrapping: { default: 'break' }, // 'inline' | 'wrap' | 'break' | 'behind' | 'front'
      storage_path: { default: null },
      pixelWidth: { default: null },  // Physical target px for WebP export
      pixelHeight: { default: null }, // Physical target px for WebP export
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-nous-asset]',
        getAttrs: element => {
          if (typeof element === 'string') return {};
          return {
            id: element.getAttribute('data-id'),
            url: element.getAttribute('src'),
            type: element.getAttribute('data-type'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            prompt: element.getAttribute('data-prompt'),
            paragraphIndex: element.getAttribute('data-paragraph-index') ? parseInt(element.getAttribute('data-paragraph-index') || '0') : null,
            width: element.getAttribute('width') || '100%',
            height: element.getAttribute('height') || 'auto',
            align: element.getAttribute('data-align') || 'center',
            wrapping: element.getAttribute('data-wrapping') || 'break',
            storage_path: element.getAttribute('data-storage-path'),
            pixelWidth: element.getAttribute('data-pixel-width') ? parseInt(element.getAttribute('data-pixel-width')!) : null,
            pixelHeight: element.getAttribute('data-pixel-height') ? parseInt(element.getAttribute('data-pixel-height')!) : null,
          };
        }
      },
      {
        tag: 'div[data-type="nousAsset"]',
        getAttrs: element => {
          if (typeof element === 'string') return {};
          return {
            id: element.getAttribute('data-id'),
            url: element.getAttribute('data-url'),
            type: element.getAttribute('data-type-attr') || element.getAttribute('data-type') || 'inline',
            alt: element.getAttribute('data-alt') || element.getAttribute('alt'),
            title: element.getAttribute('data-title') || element.getAttribute('title'),
            prompt: element.getAttribute('data-prompt'),
            paragraphIndex: element.getAttribute('data-paragraph-index') ? parseInt(element.getAttribute('data-paragraph-index') || '0') : null,
            width: element.getAttribute('width') || element.getAttribute('data-width') || '100%',
            height: element.getAttribute('height') || 'auto',
            align: element.getAttribute('data-align') || 'center',
            wrapping: element.getAttribute('data-wrapping') || 'break',
            storage_path: element.getAttribute('data-storage-path'),
            pixelWidth: element.getAttribute('data-pixel-width') ? parseInt(element.getAttribute('data-pixel-width')!) : null,
            pixelHeight: element.getAttribute('data-pixel-height') ? parseInt(element.getAttribute('data-pixel-height')!) : null,
          };
        }
      },
      // Backward compatibility for old nous-asset tags
      {
        tag: 'nous-asset',
        getAttrs: element => {
          if (typeof element === 'string') return {};
          return {
            id: element.getAttribute('id'),
            url: element.getAttribute('url'),
            type: element.getAttribute('type'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            prompt: element.getAttribute('prompt'),
            paragraphIndex: element.getAttribute('paragraph-index') ? parseInt(element.getAttribute('paragraph-index') || '0') : null,
            width: element.getAttribute('width') || '100%',
            height: element.getAttribute('height') || 'auto',
            align: element.getAttribute('align') || 'center',
            wrapping: element.getAttribute('wrapping') || 'break',
            storage_path: element.getAttribute('storage-path'),
            pixelWidth: element.getAttribute('pixel-width') ? parseInt(element.getAttribute('pixel-width')!) : null,
            pixelHeight: element.getAttribute('pixel-height') ? parseInt(element.getAttribute('pixel-height')!) : null,
          };
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { 
        url, id, type, prompt, paragraphIndex, align, wrapping, storage_path, pixelWidth, pixelHeight, ...rest 
    } = HTMLAttributes;

    return [
        'img', 
        mergeAttributes(rest, { 
          'src': url,
          'data-nous-asset': 'true',
          'data-id': id,
          'data-type': type,
          'data-prompt': prompt,
          'data-paragraph-index': paragraphIndex,
          'data-align': align,
          'data-wrapping': wrapping,
          'data-storage-path': storage_path,
          'data-pixel-width': pixelWidth,
          'data-pixel-height': pixelHeight,
        })
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NousAssetNodeView);
  },
});
