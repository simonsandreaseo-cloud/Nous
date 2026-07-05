'use client';
import { motion, AnimatePresence } from "framer-motion";

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered,
    Heading1, Heading2, Heading3, Sparkles,
    CheckCircle2, Search, Layout, FileText, Zap, Loader2,
    Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Type, Palette, Highlighter, ChevronDown, Link as LinkIcon, X, Trash2, Languages,
    Send, ChevronLeft, ChevronRight, ImagePlus
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { getSharedExtensions } from '@/lib/tiptap-extensions';
import { LinkPopover } from '@/components/shared/LinkPopover';
import SlashMenu from './SlashMenu';
import { useWriterActions } from './useWriterActions';
import { FeaturedImageSlot } from './WriterStudio';
import ImageLightbox from './modals/ImageLightbox';
import { EditorView } from '@tiptap/pm/view';
import PresenceAvatars from './PresenceAvatars';
import beautify from 'js-beautify';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { useImageUpload } from '@/hooks/useImageUpload';

let updateContentTimeout: NodeJS.Timeout | null = null;

const StepIcon = ({ active, done, icon: Icon, label }: any) => (
    <div className="flex flex-col items-center gap-1 group/step relative">
        <div className={cn(
            "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-500 border",
            active ? "bg-indigo-50 border-indigo-200 text-indigo-600 scale-110 shadow-sm shadow-indigo-100" : 
            done ? "bg-emerald-50 border-emerald-100 text-emerald-500" : 
            "bg-slate-50 border-slate-100 text-slate-300"
        )}>
            {done ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Icon size={13} className={cn(active && "animate-pulse")} />}
        </div>
        {/* Tooltip-like label */}
        <span className={cn(
            "absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none",
            active ? "bg-indigo-600 text-white" : done ? "bg-emerald-600 text-white" : "bg-slate-800 text-white"
        )}>
            {label}
        </span>
    </div>
);

export default function WriterEditor() {
    const { 
        content, setContent, isGenerating, isHumanizing, isSurgicalEditing, isRefining, editorTab,
        strategyOutline, setEditor,
        statusMessage, linkedTaskId, isRemoteUpdate,
        setWordCountReal, draftId, currentLanguage, contentVersions
    } = useWriterStore(useShallow(state => ({
        content: state.content,
        setContent: state.setContent,
        isGenerating: state.isGenerating,
        isHumanizing: state.isHumanizing,
        isSurgicalEditing: state.isSurgicalEditing,
        isRefining: state.isRefining,
        editorTab: state.editorTab,
        strategyOutline: state.strategyOutline,
        setEditor: state.setEditor,
        statusMessage: state.statusMessage,
        linkedTaskId: state.linkedTaskId,
        isRemoteUpdate: state.isRemoteUpdate,
        setWordCountReal: state.setWordCountReal,
        draftId: state.draftId,
        currentLanguage: state.currentLanguage,
        contentVersions: state.contentVersions
    })));
    const [fullscreenImage, setFullscreenImage] = useState<any>(null);

    const { updateTask } = useProjectStore();
    const { handleRegenerateOutline, handleGenerate, handleHumanize } = useWriterActions();

    // --- Image Upload ---
    const { isUploading: isUploadingImage, openFilePicker, handlePaste: handleImagePaste, handleFileDrop } = useImageUpload({
        folder: `editor-uploads/${draftId || 'draft'}`,
        onSuccess: (url, fileName) => {
            if (!editor) return;
            editor.chain().focus().setImage({ src: url, alt: fileName, title: fileName }).run();
        },
    });

    const targetLanguages = useProjectStore(useShallow(state => 
        state.activeProject?.settings?.content_preferences?.default_translator_languages || []
    ));


    // Specific Status Logic
    const isPostProd = isGenerating && (
        statusMessage.toLowerCase().includes('vínculos') || 
        statusMessage.toLowerCase().includes('optimizando') || 
        statusMessage.toLowerCase().includes('interlinking') ||
        statusMessage.toLowerCase().includes('estilos')
    );
    const isDrafting = isGenerating && !isPostProd;

    const [slashMenuPos, setSlashMenuPos] = useState<{ x: number, y: number } | null>(null);
    const [dropLinePos, setDropLinePos] = useState<{ top: number, left: number, width: number } | null>(null);

    // --- Language Gallery Logic ---
    const galleryRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = useCallback(() => {
        if (galleryRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = galleryRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(checkScroll, 100);
        return () => clearTimeout(timer);
    }, [checkScroll, contentVersions, targetLanguages, currentLanguage]);

    const handleGalleryScroll = (direction: 'left' | 'right') => {
        if (galleryRef.current) {
            const scrollAmount = 150;
            galleryRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    const extensions = useMemo(() => 
        getSharedExtensions('Escribe algo increíble... (Teclea "/nous" para llamar a la IA o "/" para comandos)'), 
    []);

    const editor = useEditor({
        extensions,
        content: content,
        immediatelyRender: false,
        editorProps: {
            attributes: {

                class: cn(
                    'prose prose-lg prose-indigo focus:outline-none max-w-none min-h-[700px] pb-32 transition-all duration-700 mx-auto',
                    'prose-h1:text-4xl prose-h1:md:text-5xl prose-h1:font-extrabold prose-h1:text-slate-900 prose-h1:mb-8 prose-h1:tracking-tight prose-h1:leading-tight',
                    'prose-h2:text-3xl prose-h2:font-bold prose-h2:text-slate-800 prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200 prose-h2:tracking-tight',
                    'prose-h3:text-2xl prose-h3:font-semibold prose-h3:text-indigo-600 prose-h3:mt-8 prose-h3:mb-4 prose-h3:tracking-normal',
                    'prose-h4:text-xl prose-h4:font-semibold prose-h4:text-slate-700 prose-h4:mt-6 prose-h4:mb-3',
                    'prose-h5:text-lg prose-h5:font-medium prose-h5:text-slate-500 prose-h5:mt-6 prose-h5:mb-2',
                    'prose-h6:text-base prose-h6:font-medium prose-h6:text-slate-500 prose-h6:uppercase prose-h6:tracking-wider prose-h6:mt-6 prose-h6:mb-2',
                    'prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-lg prose-p:mb-6',
                    'prose-li:text-slate-600 prose-li:text-lg prose-li:leading-relaxed prose-li:mb-2',
                    'prose-strong:text-slate-900 prose-strong:font-bold',
                    'prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-slate-700 prose-blockquote:text-lg prose-blockquote:font-medium prose-blockquote:shadow-sm'
                ),

            },
            handleDragOver: (view: EditorView, event: DragEvent) => {
                const data = event.dataTransfer?.types.includes('application/nous-asset');

                if (!data) return false;

                event.preventDefault();
                const coords = { left: event.clientX, top: event.clientY };
                const pos = view.posAtCoords(coords);
                
                if (pos) {
                    const resolvedPos = view.state.doc.resolve(pos.pos);
                    // Find the nearest block boundary
                    const coordsAtPos = view.coordsAtPos(resolvedPos.pos);
                    const editorBounds = view.dom.getBoundingClientRect();
                    
                    setDropLinePos({
                        top: coordsAtPos.top - editorBounds.top + view.dom.offsetTop,
                        left: 0,
                        width: editorBounds.width
                    });
                }
                return true;
            },
            handleDragLeave: () => {
                setDropLinePos(null);
            },
            handleDrop: (view: EditorView, event: DragEvent) => {
                setDropLinePos(null);
                // 1. Try Nous asset drop first
                const data = event.dataTransfer?.getData('application/nous-asset');
                if (data && editor) {
                    event.preventDefault();
                    const assetData = JSON.parse(data);
                    
                    editor.chain().focus().insertContent({
                        type: 'nousAsset',
                        attrs: {
                            id: assetData.id,
                            url: assetData.url,
                            alt: assetData.alt || '',
                            title: assetData.title || '',
                            role: assetData.role || 'feature',
                            status: 'final',
                            width: '100%',
                            align: 'center',
                            wrapping: 'break'
                        }
                    }).run();
                    return true;
                }
                // 2. Try local image file drop
                return handleFileDrop(event);
            }
        } as any,
        handlePaste: (_view: any, event: ClipboardEvent) => {
            return handleImagePaste(event);
        },
        onUpdate: ({ editor }) => {
            // Only update store from editor if NOT generating and NOT in code tab
            if (!isGenerating && useWriterStore.getState().editorTab !== 'code') {
                if (updateContentTimeout) clearTimeout(updateContentTimeout);
                updateContentTimeout = setTimeout(() => {
                    setContent(editor.getHTML());
                }, 800);
            }

            // Simple Slash Detection optimizing Keystroke performance
            const { state } = editor;
            const selection = state.selection;
            
            // Only run the check if selection is empty (cursor point) to save performance
            if (selection.empty) {
                const { $from } = selection;
                const textBefore = $from.parent.textContent.substring(0, $from.parentOffset);
                if (textBefore.endsWith('/')) {
                    const coords = editor.view.coordsAtPos($from.pos);
                    setSlashMenuPos({ x: coords.left, y: coords.bottom });
                } else if (slashMenuPos && textBefore.trim().length > 0) {
                    // Cierra el menu si el caracter no es '/' y hay texto
                    setSlashMenuPos(null);
                }
            } else if (slashMenuPos) {
                 setSlashMenuPos(null);
            }
        },
    });

    // Format HTML when switching to code tab
    useEffect(() => {
        if (editorTab === 'code' && content) {
            const formatted = beautify.html(content, { 
                indent_size: 4, 
                wrap_line_length: 0, 
                preserve_newlines: true,
                max_preserve_newlines: 2 
            });
            if (formatted !== content) {
                setContent(formatted);
            }
        }
    }, [editorTab]);

    // --- Sync editor instance with store ---
    useEffect(() => {
        if (editor) setEditor(editor);
        return () => { setEditor(null); };
    }, [editor, setEditor]);

    // --- Real-time Persistence: Actual word count sync with DB ---
    useEffect(() => {
        if (!editor || !linkedTaskId || isGenerating) return;

        const timer = setTimeout(() => {
            const hasCharacterCount = editor.storage?.characterCount;
            const words = hasCharacterCount ? editor.storage.characterCount.words() : 0;
            
            if (hasCharacterCount && words > 0) {
                const currentCount = useWriterStore.getState().wordCountReal;
                if (words !== currentCount) {
                    console.log(`[WRITER] Syncing word count to store: ${words}`);
                    setWordCountReal(words);
                }
            } else if (hasCharacterCount && words === 0 && editor.getText().trim().length > 0) {
                // If there is text but words() returns 0, it might be a temporary state or a different method name
                // Fallback to simple regex count if needed, or just skip to avoid overwriting with 0
                console.warn('[WRITER] CharacterCount reported 0 words despite having text.');
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [content, editor, linkedTaskId, isGenerating, setWordCountReal]);

    // Real-time section word count tracker (Sync with strategyOutline)
    // Batched update to avoid infinite loop / maximum update depth
    useEffect(() => {
        if (!editor || strategyOutline.length === 0 || isGenerating) return;

        const text = editor.getText();
        let lastHeaderIdx = 0;
        let hasChanges = false;

        const newOutline = strategyOutline.map((item, index) => {
            if (!item) return item;
            
            const currentHeaderText = (item.text || "").trim();
            const nextHeader = strategyOutline[index + 1];

            // Search for current header starting after the last one found to handle duplicates
            const startIdx = currentHeaderText 
                ? text.toLowerCase().indexOf(currentHeaderText.toLowerCase(), lastHeaderIdx)
                : -1;

            if (startIdx === -1) {
                if (item.currentWordCount !== 0) hasChanges = true;
                return { ...item, currentWordCount: 0 };
            }

            // Update last found index (plus length of header itself)
            const afterHeaderIdx = startIdx + currentHeaderText.length;
            lastHeaderIdx = afterHeaderIdx;

            // Find start of next section
            let endIdx = text.length;
            if (nextHeader && nextHeader.text) {
                const nextHeaderIdx = text.toLowerCase().indexOf(nextHeader.text.toLowerCase(), afterHeaderIdx);
                if (nextHeaderIdx !== -1) {
                    endIdx = nextHeaderIdx;
                }
            }

            const sectionContent = text.substring(afterHeaderIdx, endIdx).trim();
            const wordCount = sectionContent === '' ? 0 : sectionContent.split(/\s+/).length;

            if (item.currentWordCount !== wordCount) {
                hasChanges = true;
            }

            return { ...item, currentWordCount: wordCount };
        });

        // Only update store if there's an actual change to avoid loop
        if (hasChanges) {
            useWriterStore.getState().setStrategyOutline(newOutline);
        }
    }, [content, editor, strategyOutline, isGenerating]);

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
                editor.commands.insertContent(" *[AI Generando...]* ");
                break;
            case 'ai-nous':
                const prompt = window.prompt("¿Qué deseas que redacte Nous?");
                if (prompt) {
                     editor.commands.insertContent(`\n**[Nous]:** *Generando respuesta para "${prompt}"...*\n`);
                }
                break;
        }
        setSlashMenuPos(null);
    };

    // Sync content if changed externally (e.g. streaming, remote update or reset)
    useEffect(() => {
        if (!editor) return;
        
        const currentHtml = editor.getHTML();
        if (content !== currentHtml) {
            // Solo actualizamos el editor si:
            // 1. Estamos generando (streaming IA) o humanizando/refinando/surgical
            // 2. Es una actualización remota (colaboración o comando forzado)
            // 3. El editor está vacío (caso carga inicial demorada)
            // 4. Estamos en modo código (el textarea text es la fuente de verdad y Tiptap está background)
            const isEmpty = currentHtml === '<p></p>' || currentHtml === '';

            if (isGenerating || isHumanizing || isSurgicalEditing || isRefining || isRemoteUpdate || isEmpty || editorTab === 'code') {
               const { from, to } = editor.state.selection;
               editor.commands.setContent(content, false, { preserveWhitespace: 'full' });
               try {
                   editor.commands.setTextSelection({ from, to });
               } catch (e) {
                   editor.commands.setTextSelection(editor.state.doc.content.size);
               }
               if (isRemoteUpdate) {
                   useWriterStore.getState().setIsRemoteUpdate(false);
               }
            }
        }
    }, [content, editor, isGenerating, isHumanizing, isSurgicalEditing, isRefining, isRemoteUpdate, editorTab]);

    if (!editor) return null;

    return (
        <div className="relative w-full h-full flex flex-col">

            <div className={cn("relative flex-1 mt-6", editorTab !== 'visual' && 'hidden')}>
                <FeaturedImageSlot 
                    taskId={draftId} 
                    onFullscreen={(img) => setFullscreenImage(img)} 
                />

                <SlashMenu
                    position={slashMenuPos}
                    onSelect={handleSlashCommand}
                    onClose={() => setSlashMenuPos(null)}
                />

                {/* BUBBLE MENU (Enhanced Selection) */}
                {editor && (
                    <BubbleMenu 
                        editor={editor} 
                        pluginKey="writerMainBubbleMenu"
                        {...({ tippyOptions: { duration: 150 } } as any)}
                        shouldShow={({ editor }) => !editor.isActive('link') && editor.state.selection.content().size > 0}
                    >

                        <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-xl shadow-2xl border border-slate-200/50 rounded-2xl p-1.5 animate-in zoom-in-95 duration-200">
                            {/* Block Type Group */}
                            <div className="flex items-center gap-1 px-1 border-r border-slate-100 group/block relative">
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer">
                                    <Type size={14} className="text-slate-600" />
                                    <span className="text-[10px] font-black text-slate-700 min-w-[30px] text-center">
                                        {editor.isActive('heading', { level: 1 }) ? 'H1' :
                                         editor.isActive('heading', { level: 2 }) ? 'H2' :
                                         editor.isActive('heading', { level: 3 }) ? 'H3' :
                                         editor.isActive('heading', { level: 4 }) ? 'H4' : 'Texto'}
                                    </span>
                                    <ChevronDown size={10} className="text-slate-400" />
                                </div>
                                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 hidden group-hover/block:flex flex-col min-w-[120px] z-50">
                                    <button
                                        onClick={() => editor.chain().focus().setParagraph().run()}
                                        className={cn("px-3 py-1.5 text-[12px] font-medium rounded-lg text-left transition-colors", editor.isActive('paragraph') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50')}
                                    >
                                        Párrafo
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                        className={cn("px-3 py-1.5 text-[12px] font-bold rounded-lg text-left transition-colors", editor.isActive('heading', { level: 1 }) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50')}
                                    >
                                        Título 1 (H1)
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                        className={cn("px-3 py-1.5 text-[12px] font-bold rounded-lg text-left transition-colors", editor.isActive('heading', { level: 2 }) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50')}
                                    >
                                        Título 2 (H2)
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                        className={cn("px-3 py-1.5 text-[12px] font-bold rounded-lg text-left transition-colors", editor.isActive('heading', { level: 3 }) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50')}
                                    >
                                        Título 3 (H3)
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                                        className={cn("px-3 py-1.5 text-[12px] font-bold rounded-lg text-left transition-colors", editor.isActive('heading', { level: 4 }) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50')}
                                    >
                                        Título 4 (H4)
                                    </button>
                                </div>
                            </div>

                            {/* Text Style Group */}
                            <div className="flex items-center gap-0.5 pr-1 border-r border-slate-100">
                                <button
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive('bold') ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}
                                    title="Negrita"
                                >
                                    <Bold size={15} />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive('italic') ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}
                                    title="Cursiva"
                                >
                                    <Italic size={15} />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                                    className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive('underline') ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}
                                    title="Subrayado"
                                >
                                    <UnderlineIcon size={15} />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive('strike') ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}
                                    title="Tachado"
                                >
                                    <Strikethrough size={15} />
                                </button>
                            </div>

                            {/* Font Size Group */}
                            <div className="flex items-center gap-1 px-1 border-r border-slate-100 group/size relative">
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer">
                                    <span className="text-[10px] font-black text-slate-700 min-w-[24px] text-center">
                                        {editor.getAttributes('textStyle').fontSize || '16px'}
                                    </span>
                                    <ChevronDown size={10} className="text-slate-400" />
                                </div>
                                {/* Size Dropdown (Simplified for Bubble Menu) */}
                                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 hidden group-hover/size:flex flex-col min-w-[60px] z-50">
                                    {['12px', '14px', '16px', '18px', '20px', '24px', '32px'].map(size => (
                                        <button
                                            key={size}
                                            onClick={() => editor.chain().focus().setFontSize(size).run()}
                                            className="px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-left"
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Alignment Group */}
                            <div className="flex items-center gap-0.5 px-1 border-r border-slate-100">
                                <button
                                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                                    className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}
                                >
                                    <AlignLeft size={15} />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                                    className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}
                                >
                                    <AlignCenter size={15} />
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                                    className={cn("p-2 rounded-xl transition-all hover:bg-slate-100", editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500')}
                                >
                                    <AlignRight size={15} />
                                </button>
                            </div>

                            {/* Colors Group */}
                            <div className="flex items-center gap-0.5 pl-1">
                                <div className="relative group/color">
                                    <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
                                        <Palette size={15} />
                                    </button>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 hidden group-hover/color:grid grid-cols-4 gap-1 z-50">
                                        {['#000000', '#475569', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea', '#db2777'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => editor.chain().focus().setColor(color).run()}
                                                className="w-5 h-5 rounded-md border border-slate-100 shadow-sm shrink-0"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="relative group/highlight">
                                    <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
                                        <Highlighter size={15} />
                                    </button>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 hidden group-hover/highlight:grid grid-cols-4 gap-1 z-50">
                                        {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#ddd6fe', '#fed7aa', '#f1f5f9', 'transparent'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => color === 'transparent' ? editor.chain().focus().unsetHighlight().run() : editor.chain().focus().setHighlight({ color }).run()}
                                                className="w-5 h-5 rounded-md border border-slate-100 shadow-sm shrink-0 flex items-center justify-center"
                                                style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                                            >
                                                {color === 'transparent' && <X size={10} className="text-slate-400" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </BubbleMenu>
                )}

                {editor && <LinkPopover editor={editor} />}

                {/* FLOATING MENU (Empty Line) */}
                {editor && (
                    <FloatingMenu editor={editor} {...({ tippyOptions: { duration: 100 } } as any)}>

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
                                title="Cita"
                            >
                                <Quote size={16} />
                            </button>
                            <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                            <button
                                onClick={openFilePicker}
                                disabled={isUploadingImage}
                                className="p-1.5 rounded hover:bg-indigo-100 text-indigo-600 disabled:opacity-50 disabled:cursor-wait transition-colors"
                                title="Insertar imagen (sube a Supabase)"
                            >
                                {isUploadingImage
                                    ? <Loader2 size={16} className="animate-spin" />
                                    : <ImagePlus size={16} />}
                            </button>
                        </div>
                    </FloatingMenu>
                )}

                <style>{`
                    .ProseMirror p { margin-bottom: 1.5rem !important; line-height: 1.8 !important; }
                    .ProseMirror ul { list-style-type: disc !important; margin-bottom: 1.5rem !important; padding-left: 1.5rem !important; }
                    .ProseMirror ol { list-style-type: decimal !important; margin-bottom: 1.5rem !important; padding-left: 1.5rem !important; }
                    .ProseMirror li { margin-bottom: 0.5rem !important; line-height: 1.7 !important; color: #475569; }
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
                    .ProseMirror img {
                        max-width: 100%;
                        height: auto;
                        box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.15);
                        cursor: zoom-in;
                    }
                    .ProseMirror img.ProseMirror-selectednode {
                        outline: 4px solid #6366f1;
                        outline-offset: 4px;
                    }
                    .ProseMirror table {
                        border-collapse: collapse;
                        table-layout: fixed;
                        width: 100%;
                        margin: 2rem 0;
                        overflow: hidden;
                    }
                    .ProseMirror table td,
                    .ProseMirror table th {
                        min-width: 1em;
                        border: 1px solid #cbd5e1;
                        padding: 8px 12px;
                        vertical-align: top;
                        box-sizing: border-box;
                        position: relative;
                    }
                    .ProseMirror table th {
                        font-weight: 700;
                        text-align: left;
                        background-color: #f8fafc;
                        color: #1e293b;
                    }
                    .ProseMirror table .column-resize-handle {
                        position: absolute;
                        right: -2px;
                        top: 0;
                        bottom: 0;
                        width: 4px;
                        background-color: #cbd5e1;
                        pointer-events: none;
                    }
                `}</style>
                 <EditorContent editor={editor} className="relative" />

                {/* Drop Indicator Line */}
                <AnimatePresence>
                    {dropLinePos && (
                        <motion.div 
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute z-50 h-1 bg-indigo-500 rounded-full pointer-events-none"
                            style={{ 
                                top: dropLinePos.top,
                                left: dropLinePos.left,
                                width: dropLinePos.width
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>

            <div className={cn("relative animate-in fade-in duration-300", editorTab !== 'code' && 'hidden')}>
                <div className="w-full min-h-[600px] bg-[#282c34] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl [&_.cm-editor]:min-h-[600px] [&_.cm-scroller]:custom-scrollbar">
                    <CodeMirror
                        value={content}
                        minHeight="600px"
                        theme="dark"
                        extensions={[html()]}
                        onChange={(value) => setContent(value)}
                        className="text-[15px] font-mono leading-relaxed"
                    />
                </div>
            </div>

            {fullscreenImage && (
                <ImageLightbox 
                    isOpen={!!fullscreenImage}
                    onClose={() => setFullscreenImage(null)}
                    asset={{
                        id: fullscreenImage.id,
                        url: fullscreenImage.url,
                        title: fullscreenImage.title || "Portada",
                        alt: fullscreenImage.alt_text || '',
                        prompt: fullscreenImage.prompt || '',
                        status: 'final',
                        type: 'image',
                        role: fullscreenImage.type === 'featured' ? 'hero' : 'feature',
                        design: {
                            width: '100%',
                            align: 'center',
                            wrapping: 'break',
                            aspectRatio: '16:9'
                        },
                        positioning: {
                            paragraphIndex: fullscreenImage.paragraph_index || 0
                        }
                    }}
                />
            )}
        </div>

    );
}