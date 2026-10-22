'use client';

import { useState } from 'react';
import { 
    Bold, 
    Italic, 
    Underline as UnderlineIcon, 
    Strikethrough, 
    List, 
    ListOrdered, 
    AlignLeft, 
    AlignCenter, 
    AlignRight, 
    Heading1, 
    Heading2, 
    Heading3, 
    Type, 
    Link as LinkIcon, 
    ImagePlus, 
    ChevronDown, 
    Check, 
    X,
    Highlighter,
    Palette
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useWriterStore } from '@/store/useWriterStore';

interface WriterMobileFormattingBarProps {
    onInsertImage?: () => void;
}

export function WriterMobileFormattingBar({ onInsertImage }: WriterMobileFormattingBarProps) {
    const editor = useWriterStore((state) => state.editor);
    const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false);
    const [isLinkPromptOpen, setIsLinkPromptOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    if (!editor) return null;

    const currentHeadingLabel = () => {
        if (editor.isActive('heading', { level: 1 })) return 'H1';
        if (editor.isActive('heading', { level: 2 })) return 'H2';
        if (editor.isActive('heading', { level: 3 })) return 'H3';
        return 'P';
    };

    const handleSetLink = () => {
        if (!linkUrl.trim()) {
            editor.chain().focus().unsetLink().run();
        } else {
            const formatted = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
            editor.chain().focus().setLink({ href: formatted }).run();
        }
        setIsLinkPromptOpen(false);
        setLinkUrl('');
    };

    return (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1.5 flex items-center justify-between select-none">
            {/* Scrollable Toolbar Container */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full py-0.5">
                {/* Heading Type Selector */}
                <div className="relative shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsHeadingMenuOpen(!isHeadingMenuOpen)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors"
                        title="Tipo de texto"
                    >
                        <span>{currentHeadingLabel()}</span>
                        <ChevronDown size={11} className={cn("transition-transform", isHeadingMenuOpen && "rotate-180")} />
                    </button>

                    {isHeadingMenuOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsHeadingMenuOpen(false)} 
                            />
                            <div className="absolute bottom-full left-0 mb-2 w-36 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-50 animate-in fade-in zoom-in-95">
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().setParagraph().run();
                                        setIsHeadingMenuOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between",
                                        editor.isActive('paragraph') ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    <span>Párrafo</span>
                                    {editor.isActive('paragraph') && <Check size={12} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleHeading({ level: 1 }).run();
                                        setIsHeadingMenuOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between",
                                        editor.isActive('heading', { level: 1 }) ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    <span>Título 1 (H1)</span>
                                    {editor.isActive('heading', { level: 1 }) && <Check size={12} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleHeading({ level: 2 }).run();
                                        setIsHeadingMenuOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between",
                                        editor.isActive('heading', { level: 2 }) ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    <span>Título 2 (H2)</span>
                                    {editor.isActive('heading', { level: 2 }) && <Check size={12} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleHeading({ level: 3 }).run();
                                        setIsHeadingMenuOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between",
                                        editor.isActive('heading', { level: 3 }) ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    <span>Título 3 (H3)</span>
                                    {editor.isActive('heading', { level: 3 }) && <Check size={12} />}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="w-[1px] h-5 bg-slate-200 mx-1 shrink-0" />

                {/* Bold */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        editor.isActive('bold')
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="Negrita"
                >
                    <Bold size={16} />
                </button>

                {/* Italic */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        editor.isActive('italic')
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="Cursiva"
                >
                    <Italic size={16} />
                </button>

                {/* Underline */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        editor.isActive('underline')
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="Subrayado"
                >
                    <UnderlineIcon size={16} />
                </button>

                {/* Strikethrough */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        editor.isActive('strike')
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="Tachado"
                >
                    <Strikethrough size={16} />
                </button>

                <div className="w-[1px] h-5 bg-slate-200 mx-1 shrink-0" />

                {/* Text Alignments */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        editor.isActive({ textAlign: 'left' })
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="Alinear izquierda"
                >
                    <AlignLeft size={16} />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        editor.isActive({ textAlign: 'center' })
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="Alinear centro"
                >
                    <AlignCenter size={16} />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        editor.isActive({ textAlign: 'right' })
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="Alinear derecha"
                >
                    <AlignRight size={16} />
                </button>

                <div className="w-[1px] h-5 bg-slate-200 mx-1 shrink-0" />

                {/* Bullet List */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        editor.isActive('bulletList')
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="Lista con viñetas"
                >
                    <List size={16} />
                </button>

                {/* Ordered List */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        editor.isActive('orderedList')
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                    )}
                    title="Lista numerada"
                >
                    <ListOrdered size={16} />
                </button>

                <div className="w-[1px] h-5 bg-slate-200 mx-1 shrink-0" />

                {/* Link */}
                <div className="relative shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            const previousUrl = editor.getAttributes('link').href || '';
                            setLinkUrl(previousUrl);
                            setIsLinkPromptOpen(!isLinkPromptOpen);
                        }}
                        className={cn(
                            "p-2 rounded-lg transition-colors shrink-0",
                            editor.isActive('link')
                                ? "bg-indigo-50 text-indigo-600 font-bold"
                                : "text-slate-600 hover:bg-slate-100"
                        )}
                        title="Enlace"
                    >
                        <LinkIcon size={16} />
                    </button>

                    {isLinkPromptOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsLinkPromptOpen(false)} 
                            />
                            <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1">
                                    Insertar Enlace
                                </div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="url"
                                        placeholder="https://ejemplo.com"
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSetLink()}
                                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSetLink}
                                        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                                    >
                                        <Check size={14} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Insert Image */}
                {onInsertImage && (
                    <button
                        type="button"
                        onClick={onInsertImage}
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                        title="Insertar imagen"
                    >
                        <ImagePlus size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
