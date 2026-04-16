import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ImageSlot } from './tiptap-image-slot';
import { LayoutRole } from './types/layout';

describe('ImageSlot Node', () => {
  it('should create a node with correct attributes', () => {
    const editor = new Editor({
      extensions: [StarterKit, ImageSlot],
    });

    editor.commands.insertContent({
      type: 'imageSlot',
      attrs: {
        role: LayoutRole.HERO,
        prompt: 'A cinematic view of a futuristic city',
      },
    });

    const json = editor.getJSON();
    const slot = json.content.find((node: any) => node.type === 'imageSlot');

    expect(slot).toBeDefined();
    expect(slot?.attrs?.role).toBe(LayoutRole.HERO);
    expect(slot?.attrs?.prompt).toBe('A cinematic view of a futuristic city');
  });

  it('should have default attributes when none are provided', () => {
    const editor = new Editor({
      extensions: [StarterKit, ImageSlot],
    });

    editor.commands.insertContent({ type: 'imageSlot' });

    const json = editor.getJSON();
    const slot = json.content.find((node: any) => node.type === 'imageSlot');

    expect(slot).toBeDefined();
    expect(slot?.attrs?.role).toBe(LayoutRole.INFO); // Default role
    expect(slot?.attrs?.prompt).toBe('');
  });
});
