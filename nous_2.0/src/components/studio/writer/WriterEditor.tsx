'use client';

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { useWriterStore } from '@/store/useWriterStore';
import { useEffect, useState } from 'react';
import {
    Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered,
    Heading1, Heading2, Heading3
} from 'lucide-react';
import { cn } from '@/utils/cn';
import SlashMenu from './SlashMenu';

export default function WriterEditor() {
    const { content, setContent, isGenerating } = useWriterStore();
    const [slashMenuPos, setSlashMenuPos] = useState<{ x: number, y: number } | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder: 'Escribe algo increíble... (Teclea "/" para comandos)',
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-lg prose-indigo focus:outline-none max-w-none min-h-[500px] pb-32 transition-all duration-500',
            },
        },
        onUpdate: ({ editor }) => {
            // Only update store from editor if NOT generating
            if (!isGenerating) {
                setContent(editor.getHTML());
            }

            // Simple Slash Detection
            const { state } = editor;
            const selection = state.selection;
            const { $from } = selection;
            const textBefore = $from.parent.textContent.substring(0, $from.parentOffset);

            if (textBefore.endsWith('/')) {
                const charBeforeSlash = textBefore.length > 1 ? textBefore[textBefore.length - 2] : ' ';
                if (charBeforeSlash === ' ' || textBefore.length === 1) {
                    const coords = editor.view.coordsAtPos($from.pos);
                    setSlashMenuPos({ x: coords.left, y: coords.bottom });
                }
            } else if (slashMenuPos) {
                setSlashMenuPos(null);
            }
        },
    });

    // Handle Slash Commands
    const handleSlashCommand = (commandId: string) => {
        if (!editor) return;
        editor.commands.deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from });

        switch (commandId) {
            case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
            case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
            case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
            case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
            case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
            case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
            case 'ai-write':
                // This will be handled in the future or via store
                break;
        }
        setSlashMenuPos(null);
    };

    // Sync content if changed externally (e.g. streaming or reset)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // During generation, we want to update the editor content
            // To avoid losing cursor position, we only do this if the content actually changed 
            // and it's not the user's own typing (which is blocked by !isGenerating in onUpdate)

            // If the content is being streamed, we might want to use a more surgical update 
            // or just setContent if it's a full replace.

            const isDifferent = content !== editor.getHTML();
            if (isDifferent) {
                const { from, to } = editor.state.selection;
                editor.commands.setContent(content, false);
                // Attempt to restore selection if not generating
                if (!isGenerating) {
                    editor.commands.setTextSelection({ from, to });
                }
            }
        }
    }, [content, editor, isGenerating]);

    if (!editor) return null;

    return (
        <div className="relative w-full max-w-4xl mx-auto py-12 px-6 md:px-12">

            <SlashMenu
                position={slashMenuPos}
                onSelect={handleSlashCommand}
                onClose={() => setSlashMenuPos(null)}
            />

            {/* BUBBLE MENU (Selection) */}
            {editor && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                    <div className="flex items-center gap-1 bg-white shadow-xl border border-slate-200 rounded-lg p-1">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('bold') && 'bg-slate-200 text-slate-900')}
                        >
                            <Bold size={16} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('italic') && 'bg-slate-200 text-slate-900')}
                        >
                            <Italic size={16} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('strike') && 'bg-slate-200 text-slate-900')}
                        >
                            <Strikethrough size={16} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('code') && 'bg-slate-200 text-slate-900')}
                        >
                            <Code size={16} />
                        </button>
                    </div>
                </BubbleMenu>
            )}

            {/* FLOATING MENU (Empty Line) */}
            {editor && (
                <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
                    <div className="flex items-center gap-1 bg-white shadow-xl border border-slate-200 rounded-lg p-1">
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('heading', { level: 1 }) && 'bg-slate-200 text-slate-900')}
                        >
                            <Heading1 size={16} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('heading', { level: 2 }) && 'bg-slate-200 text-slate-900')}
                        >
                            <Heading2 size={16} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('heading', { level: 3 }) && 'bg-slate-200 text-slate-900')}
                        >
                            <Heading3 size={16} />
                        </button>
                        <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                        <button
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('bulletList') && 'bg-slate-200 text-slate-900')}
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('orderedList') && 'bg-slate-200 text-slate-900')}
                        >
                            <ListOrdered size={16} />
                        </button>
                        <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                        <button
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            className={cn("p-1.5 rounded hover:bg-slate-100 text-slate-600", editor.isActive('blockquote') && 'bg-slate-200 text-slate-900')}
                        >
                            <Quote size={16} />
                        </button>
                    </div>
                </FloatingMenu>
            )}

            <EditorContent editor={editor} />
        </div>
    );
}
