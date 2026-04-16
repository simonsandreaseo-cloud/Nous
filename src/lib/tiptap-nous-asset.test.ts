import { describe, it, expect } from 'vitest';
import { NousAsset } from './tiptap-nous-asset';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

describe('NousAsset Portable HTML Export', () => {
  const createEditor = (attrs: any) => {
    const editor = new Editor({
      extensions: [StarterKit, NousAsset],
    });
    editor.commands.insertContent({
      type: 'nousAsset',
      attrs: attrs,
    });
    return editor;
  };

  it('should render center alignment as block with auto margins', () => {
    const editor = createEditor({
      url: 'test.jpg',
      align: 'center',
      width: '100%',
    });
    const html = editor.getHTML();
    expect(html).toMatch(/style="[^"]*display:\s*block;[^"]*margin-left:\s*auto;[^"]*margin-right:\s*auto/);
  });

  it('should render left alignment as float left', () => {
    const editor = createEditor({
      url: 'test.jpg',
      align: 'left',
      width: '50%',
    });
    const html = editor.getHTML();
    expect(html).toMatch(/style="[^"]*float:\s*left;[^"]*width:\s*50%/);
  });

  it('should render wrap wrapping with correct margins for left align', () => {
    const editor = createEditor({
      url: 'test.jpg',
      align: 'left',
      wrapping: 'wrap',
    });
    const html = editor.getHTML();
    expect(html).toMatch(/margin:\s*0px\s*1\.5rem\s*1rem\s*0px/);
  });

  it('should render inline wrapping as inline-block', () => {
    const editor = createEditor({
      url: 'test.jpg',
      wrapping: 'inline',
    });
    const html = editor.getHTML();
    expect(html).toMatch(/display:\s*inline-block/);
    expect(html).toMatch(/vertical-align:\s*middle/);
  });

  it('should render custom dimensions correctly', () => {
    const editor = createEditor({
      url: 'test.jpg',
      width: '300px',
      height: '200px',
    });
    const html = editor.getHTML();
    expect(html).toMatch(/width:\s*300px/);
    expect(html).toMatch(/height:\s*200px/);
  });
});
