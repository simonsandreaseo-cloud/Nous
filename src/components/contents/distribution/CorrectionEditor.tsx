"use client";

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { 
    Bold, Italic, Strikethrough, Code, List, ListOrdered, 
    Heading1, Heading2, Heading3, Quote, Link as LinkIcon, Unlink, ExternalLink, Trash2, FileText, Code2, Check
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';

interface CorrectionEditorProps {
    content: string;
    onChange: (html: string) => void;
}

export function CorrectionEditor({ content, onChange }: CorrectionEditorProps) {
    const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [tempLink, setTempLink] = useState("");

    const editor = useEditor({
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder: 'Edita el contenido aquí...',
            }),
            Link.configure({
                openOnClick: false, // Changed to false for better editing control
                autolink: true,
                HTMLAttributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    class: 'cursor-pointer'
                }
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

    const handleSetLink = useCallback(() => {
        if (tempLink) {
            editor?.chain().focus().setLink({ href: tempLink }).run();
        } else {
            editor?.chain().focus().unsetLink().run();
        }
    }, [editor, tempLink]);

    const handleUnsetLink = useCallback(() => {
        editor?.chain().focus().unsetLink().run();
    }, [editor]);

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
            <div className="flex items-center justify-between p-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-1">
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

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200/50 shadow-sm transform scale-90 origin-right">
                    <button 
                        onClick={() => setViewMode('visual')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            viewMode === 'visual' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <FileText size={12} />
                        Visual
                    </button>
                    <button 
                        onClick={() => setViewMode('code')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            viewMode === 'code' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Code2 size={12} />
                        Código
                    </button>
                </div>
            </div>

            {/* Selection Bubble Menu */}
            <BubbleMenu 
                editor={editor} 
                tippyOptions={{ duration: 100 }}
                shouldShow={({ editor }) => !editor.isActive('link') && editor.state.selection.content().size > 0}
            >
                <div className="flex bg-slate-900 rounded-xl p-1 shadow-2xl gap-1">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className="p-2 text-white hover:bg-white/10 rounded-lg"><Bold size={14}/></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className="p-2 text-white hover:bg-white/10 rounded-lg"><Italic size={14}/></button>
                </div>
            </BubbleMenu>

            {/* Link Popover Menu */}
            <BubbleMenu 
                editor={editor} 
                tippyOptions={{ 
                    duration: 100, 
                    placement: 'bottom',
                    onShow: () => {
                        const currentUrl = editor.getAttributes('link').href || "";
                        setTempLink(currentUrl);
                    }
                }}
                shouldShow={({ editor }) => editor.isActive('link')}
            >
                <div className="flex items-center bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-200 rounded-2xl p-1.5 gap-1.5 min-w-[280px]">
                    <div className="flex-1 flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-slate-100">
                        <LinkIcon size={12} className="text-slate-300" />
                        <input 
                            type="text" 
                            className="bg-transparent text-[10px] font-bold text-slate-800 outline-none w-full placeholder:text-slate-300"
                            placeholder="https://..."
                            value={tempLink}
                            onChange={(e) => setTempLink(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSetLink();
                                if (e.key === 'Escape') editor.chain().focus().run();
                            }}
                        />
                    </div>
                    <button 
                        onClick={handleSetLink}
                        className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                        title="Guardar Enlace"
                    >
                        <Check size={14} />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-100 mx-0.5" />
                    <button 
                        onClick={handleUnsetLink}
                        className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all active:scale-90"
                        title="Eliminar Enlace"
                    >
                        <Trash2 size={14} />
                    </button>
                    <a 
                        href={tempLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-slate-300 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-all active:scale-90"
                        title="Abrir en pestaña nueva"
                    >
                        <ExternalLink size={14} />
                    </a>
                </div>
            </BubbleMenu>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {viewMode === 'visual' ? (
                    <div className="p-8">
                        <EditorContent editor={editor} />
                    </div>
                ) : (
                    <div className="h-full flex flex-col p-4 bg-slate-900 border-t border-slate-800">
                        <textarea 
                            value={content}
                            onChange={(e) => onChange(e.target.value)}
                            className="flex-1 w-full p-8 bg-slate-900 text-emerald-400 font-mono text-[13px] leading-relaxed resize-none outline-none selection:bg-indigo-500/30 custom-scrollbar"
                            placeholder="Escribe tu HTML aquí..."
                            spellCheck={false}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
