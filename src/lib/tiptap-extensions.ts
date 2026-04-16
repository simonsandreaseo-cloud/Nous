import { Extension } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Typography } from '@tiptap/extension-typography';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { FontFamily } from '@tiptap/extension-font-family';
import { CharacterCount } from '@tiptap/extension-character-count';
import { NousAsset } from './tiptap-nous-asset';
import { ImageSlot } from './tiptap-image-slot';

// Custom FontSize Extension
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    }
  }
}

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

export const getSharedExtensions = (placeholder: string) => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Typography,
  Placeholder.configure({
    placeholder,
  }),
  Image.configure({
    allowBase64: true,
    HTMLAttributes: {
      class: 'rounded-3xl shadow-2xl border-4 border-white my-12 mx-auto block hover:scale-[1.02] transition-transform duration-500',
    },
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  Subscript,
  Superscript,
  FontFamily,
  FontSize,
  CharacterCount,
  NousAsset,
  ImageSlot,
];
