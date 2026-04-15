"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import { 
    Bold, Italic, Strikethrough, Code, List, ListOrdered, 
    Heading1, Heading2, Heading3, Quote, Link as LinkIcon, Unlink, ExternalLink, Trash2, FileText, Code2, Check,
    Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Type, Palette, Highlighter, ChevronDown, X
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { getSharedExtensions } from '@/lib/tiptap-extensions';
import { LinkPopover } from '@/components/shared/LinkPopover';

interface CorrectionEditorProps {
    content: string;
    onChange: (html: string) => void;
}

export function CorrectionEditor({ content, onChange }: CorrectionEditorProps) {
    const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');

    const extensions = useMemo(() => 
        getSharedExtensions('Edita el contenido aquí...'), 
    []);

    const editor = useEditor({
        extensions,
        content: content,
        immediatelyRender: false,
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
                pluginKey="correctionMainBubbleMenu"
                tippyOptions={{ duration: 150 }}
                shouldShow={({ editor }) => !editor.isActive('link') && editor.state.selection.content().size > 0}
            >
                <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-xl shadow-2xl border border-slate-200/50 rounded-2xl p-1.5 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-0.5 pr-1 border-r border-slate-100">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive('bold') ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}><Bold size={15}/></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive('italic') ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}><Italic size={15}/></button>
                        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive('underline') ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}><UnderlineIcon size={15}/></button>
                    </div>

                    <div className="flex items-center gap-1 px-1 border-r border-slate-100 group/size relative">
                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer text-slate-700 font-black text-[10px]">
                            {editor.getAttributes('textStyle').fontSize || '16px'}
                            <ChevronDown size={10} className="text-slate-400" />
                        </div>
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 hidden group-hover/size:flex flex-col min-w-[60px] z-50">
                            {['12px', '14px', '16px', '18px', '20px', '24px', '32px'].map(size => (
                                <button key={size} onClick={() => editor.chain().focus().setFontSize(size).run()} className="px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left">{size}</button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5 px-1 border-r border-slate-100">
                        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("p-2 rounded-xl hover:bg-slate-100", editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500')}><AlignLeft size={15}/></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("p-2 rounded-xl hover:bg-slate-100", editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500')}><AlignCenter size={15}/></button>
                    </div>

                    <div className="flex items-center gap-0.5 pl-1">
                        <div className="relative group/color">
                            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"><Palette size={15}/></button>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 hidden group-hover/color:grid grid-cols-4 gap-1 z-50">
                                {['#000000', '#475569', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea', '#db2777'].map(color => (
                                    <button key={color} onClick={() => editor.chain().focus().setColor(color).run()} className="w-5 h-5 rounded-md border border-slate-100" style={{ backgroundColor: color }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </BubbleMenu>

            {/* Link Popover */}
            {editor && <LinkPopover editor={editor} />}

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
