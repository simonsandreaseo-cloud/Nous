"use client";

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { 
    Bold, Italic, Strikethrough, Code, List, ListOrdered, 
    Heading1, Heading2, Heading3, Quote 
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface CorrectionEditorProps {
    content: string;
    onChange: (html: string) => void;
}

export function CorrectionEditor({ content, onChange }: CorrectionEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder: 'Edita el contenido aquí...',
            }),
            Link.configure({
                openOnClick: true,
                autolink: true,
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-lg prose-indigo focus:outline-none max-w-none min-h-[700px] pb-32 transition-all duration-500 mx-auto ' +
                       'prose-h1:text-5xl prose-h1:font-black prose-h1:text-slate-900 prose-h1:mb-10 prose-h1:tracking-tight prose-h1:leading-tight ' +
                       'prose-h2:text-3xl prose-h2:font-black prose-h2:text-slate-800 prose-h2:mt-16 prose-h2:mb-8 prose-h2:pb-4 prose-h2:border-b-2 prose-h2:border-slate-100 ' +
                       'prose-h3:text-2xl prose-h3:font-black prose-h3:text-indigo-900 prose-h3:mt-12 prose-h3:mb-6 ' +
                       'prose-p:text-slate-600 prose-p:leading-[1.9] prose-p:text-[18px] prose-p:mb-10 ' +
                       'prose-li:text-slate-600 prose-li:leading-relaxed prose-li:mb-2 ' +
                       'prose-strong:text-slate-900 prose-strong:font-black ' +
                       'prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/30 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-3xl prose-blockquote:not-italic prose-blockquote:text-indigo-900 prose-blockquote:text-xl prose-blockquote:font-medium',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            if (!editor.isFocused) {
                editor.commands.setContent(content, false);
            }
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="relative w-full h-full bg-white rounded-3xl border border-slate-100 shadow-inner overflow-hidden flex flex-col">
            <style>{`
                .ProseMirror p { margin-bottom: 2rem !important; line-height: 1.9 !important; }
                .ProseMirror h1 { margin-bottom: 2.5rem !important; font-weight: 900 !important; color: #0f172a !important; }
                .ProseMirror h2 { margin-top: 4rem !important; margin-bottom: 2rem !important; font-weight: 900 !important; border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem; color: #1e293b; }
                .ProseMirror h3 { margin-top: 3rem !important; margin-bottom: 1rem !important; font-weight: 900 !important; color: #334155; }
                .ProseMirror ul { list-style-type: disc !important; margin-bottom: 2rem !important; padding-left: 2rem !important; }
                .ProseMirror ol { list-style-type: decimal !important; margin-bottom: 2rem !important; padding-left: 2rem !important; }
                .ProseMirror li { margin-bottom: 0.75rem !important; line-height: 1.7 !important; color: #475569; }
                .ProseMirror li strong { color: #0f172a; font-weight: 800; }
                .ProseMirror strong { font-weight: 900 !important; color: #0f172a; }
                .ProseMirror a { 
                    color: #2563eb !important; 
                    text-decoration: underline !important; 
                    text-underline-offset: 4px !important;
                    text-decoration-thickness: 2px !important;
                    font-weight: 700 !important;
                    transition: all 0.2s ease;
                }
                .ProseMirror a:hover { 
                    color: #1d4ed8 !important; 
                    background-color: #eff6ff;
                    text-decoration-thickness: 3px !important;
                }
            `}</style>

            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn("p-2 rounded-lg hover:bg-white transition-all", editor.isActive('bold') ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                >
                    <Bold size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn("p-2 rounded-lg hover:bg-white transition-all", editor.isActive('italic') ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                >
                    <Italic size={16} />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn("p-2 rounded-lg hover:bg-white transition-all", editor.isActive('heading', { level: 1 }) ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                >
                    <Heading1 size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn("p-2 rounded-lg hover:bg-white transition-all", editor.isActive('heading', { level: 2 }) ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                >
                    <Heading2 size={16} />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn("p-2 rounded-lg hover:bg-white transition-all", editor.isActive('bulletList') ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                >
                    <List size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={cn("p-2 rounded-lg hover:bg-white transition-all", editor.isActive('blockquote') ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                >
                    <Quote size={16} />
                </button>
            </div>

            <BubbleMenu editor={editor}>
                <div className="flex bg-slate-900 rounded-xl p-1 shadow-2xl gap-1">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className="p-2 text-white hover:bg-white/10 rounded-lg"><Bold size={14}/></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className="p-2 text-white hover:bg-white/10 rounded-lg"><Italic size={14}/></button>
                </div>
            </BubbleMenu>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
