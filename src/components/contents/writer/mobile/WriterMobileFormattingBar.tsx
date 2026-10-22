'use client';

import { useState, useEffect } from 'react';
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
    AlignJustify,
    ChevronDown, 
    Check, 
    X,
    Highlighter,
    Palette,
    ImagePlus, 
    Link as LinkIcon, 
    Plus,
    Quote,
    Minus,
    Table as TableIcon,
    Code2,
    Loader2,
    SlidersHorizontal,
    Image as ImageIcon,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useWriterStore } from '@/store/useWriterStore';
import { useImageUpload } from '@/hooks/useImageUpload';

interface WriterMobileFormattingBarProps {
    onInsertImage?: () => void;
    onOpenMediaTab?: () => void;
}

const TEXT_COLORS = [
    { label: 'Negro', value: '#0f172a' },
    { label: 'Gris', value: '#475569' },
    { label: 'Azul', value: '#2563eb' },
    { label: 'Índigo', value: '#6366f1' },
    { label: 'Verde', value: '#16a34a' },
    { label: 'Rojo', value: '#dc2626' },
    { label: 'Ámbar', value: '#d97706' },
    { label: 'Púrpura', value: '#9333ea' }
];

const HIGHLIGHT_COLORS = [
    { label: 'Amarillo', value: '#fef08a' },
    { label: 'Verde', value: '#bbf7d0' },
    { label: 'Azul', value: '#bfdbfe' },
    { label: 'Rosa', value: '#fbcfe8' },
    { label: 'Naranja', value: '#fed7aa' },
    { label: 'Lavanda', value: '#ddd6fe' },
    { label: 'Gris', value: '#f1f5f9' },
    { label: 'Ninguno', value: 'transparent' }
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px'];

export function WriterMobileFormattingBar({ onInsertImage, onOpenMediaTab }: WriterMobileFormattingBarProps) {
    const editor = useWriterStore((state) => state.editor);
    const draftId = useWriterStore((state) => state.draftId);

    const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false);
    const [isInsertSheetOpen, setIsInsertSheetOpen] = useState(false);
    const [isStyleSheetOpen, setIsStyleSheetOpen] = useState(false);
    const [isLinkPromptOpen, setIsLinkPromptOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [keyboardOffset, setKeyboardOffset] = useState(0);

    // Track mobile virtual keyboard via visualViewport API to keep toolbar sticky above keyboard
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            if (window.visualViewport) {
                const vv = window.visualViewport;
                const offset = Math.max(0, window.innerHeight - (vv.height + (vv.offsetTop || 0)));
                setKeyboardOffset(offset > 40 ? offset : 0);
            }
        };

        handleResize();

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
        }
        window.addEventListener('resize', handleResize);

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Native image upload hook to Supabase bucket
    const { isUploading: isUploadingImage, uploadProgress, openFilePicker } = useImageUpload({
        folder: `editor-uploads/${draftId || 'draft'}`,
        taskId: draftId || 'draft',
        onSuccess: (url, fileName) => {
            if (!editor) return;
            const assetId = Math.random().toString(36).substr(2, 9);
            editor.chain().focus().insertContent({
                type: 'nousAsset',
                attrs: {
                    id: assetId,
                    url: url,
                    alt: fileName,
                    title: fileName,
                    status: 'final',
                    role: 'inline',
                    width: '100%',
                    align: 'center',
                    wrapping: 'break',
                }
            }).run();
        },
    });

    if (!editor) return null;

    const currentHeadingLabel = () => {
        if (editor.isActive('heading', { level: 1 })) return 'H1';
        if (editor.isActive('heading', { level: 2 })) return 'H2';
        if (editor.isActive('heading', { level: 3 })) return 'H3';
        if (editor.isActive('heading', { level: 4 })) return 'H4';
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

    const handleImageClick = () => {
        if (onInsertImage) {
            onInsertImage();
        } else {
            openFilePicker();
        }
    };

    return (
        <>
            {/* Docked Primary Toolbar */}
            <div 
                style={{
                    bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : 0,
                    transition: 'bottom 0.15s cubic-bezier(0.1, 0.9, 0.2, 1)'
                }}
                className={cn(
                    "fixed inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-between select-none",
                    keyboardOffset > 0 ? "pb-1.5" : "pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                )}
            >
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full py-0.5">
                    
                    {/* Botón Insertar (+) - Estilo Google Docs */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsInsertSheetOpen(true);
                            setIsStyleSheetOpen(false);
                            setIsHeadingMenuOpen(false);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-black shadow-xs active:scale-95 transition-all shrink-0"
                        title="Insertar elementos"
                    >
                        <Plus size={15} strokeWidth={2.5} />
                        <span className="text-[11px] uppercase tracking-wider font-extrabold hidden sm:inline">Insertar</span>
                    </button>

                    <div className="w-[1px] h-5 bg-slate-200 mx-0.5 shrink-0" />

                    {/* Botón Adjuntar Imagen Directo */}
                    <button
                        type="button"
                        onClick={handleImageClick}
                        disabled={isUploadingImage}
                        className={cn(
                            "relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95",
                            isUploadingImage 
                                ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-300"
                                : "bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60"
                        )}
                        title="Adjuntar imagen desde tu dispositivo"
                    >
                        {isUploadingImage ? (
                            <>
                                <Loader2 size={15} className="animate-spin text-indigo-600" />
                                <span className="text-[10px] font-black">
                                    {uploadProgress ? `${uploadProgress}%` : 'Subiendo'}
                                </span>
                            </>
                        ) : (
                            <>
                                <ImagePlus size={16} className="text-indigo-600" />
                                <span className="text-[11px] font-bold">Imagen</span>
                            </>
                        )}
                    </button>

                    <div className="w-[1px] h-5 bg-slate-200 mx-0.5 shrink-0" />

                    {/* Selector de Encabezados (H1, H2, H3, P) */}
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setIsHeadingMenuOpen(!isHeadingMenuOpen);
                                setIsInsertSheetOpen(false);
                                setIsStyleSheetOpen(false);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors"
                            title="Tipo de encabezado"
                        >
                            <span>{currentHeadingLabel()}</span>
                            <ChevronDown size={11} className={cn("transition-transform duration-200", isHeadingMenuOpen && "rotate-180")} />
                        </button>

                        {isHeadingMenuOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsHeadingMenuOpen(false)} 
                                />
                                <div className="absolute bottom-full left-0 mb-2 w-44 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-1.5 z-50 animate-in fade-in zoom-in-95">
                                    <div className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                                        Formato de Texto
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            editor.chain().focus().setParagraph().run();
                                            setIsHeadingMenuOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between",
                                            editor.isActive('paragraph') ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        <span>Párrafo normal</span>
                                        {editor.isActive('paragraph') && <Check size={12} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            editor.chain().focus().toggleHeading({ level: 1 }).run();
                                            setIsHeadingMenuOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between",
                                            editor.isActive('heading', { level: 1 }) ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-50"
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
                                            "w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between",
                                            editor.isActive('heading', { level: 2 }) ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-50"
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
                                            "w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between",
                                            editor.isActive('heading', { level: 3 }) ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        <span>Título 3 (H3)</span>
                                        {editor.isActive('heading', { level: 3 }) && <Check size={12} />}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Negrita (Bold) */}
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

                    {/* Cursiva (Italic) */}
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

                    {/* Subrayado (Underline) */}
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

                    {/* Tachado (Strike) */}
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

                    <div className="w-[1px] h-5 bg-slate-200 mx-0.5 shrink-0" />

                    {/* Botón Formato Avanzado / Colores (A con paleta) */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsStyleSheetOpen(true);
                            setIsInsertSheetOpen(false);
                            setIsHeadingMenuOpen(false);
                        }}
                        className={cn(
                            "flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all shrink-0",
                            isStyleSheetOpen
                                ? "bg-indigo-600 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                        )}
                        title="Colores y estilos de texto"
                    >
                        <Palette size={16} />
                    </button>

                    {/* Cita rápida */}
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={cn(
                            "p-2 rounded-lg transition-colors shrink-0",
                            editor.isActive('blockquote')
                                ? "bg-slate-900 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-100"
                        )}
                        title="Cita destacada"
                    >
                        <Quote size={16} />
                    </button>

                    <div className="w-[1px] h-5 bg-slate-200 mx-0.5 shrink-0" />

                    {/* Alineaciones */}
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

                    <div className="w-[1px] h-5 bg-slate-200 mx-0.5 shrink-0" />

                    {/* Listas */}
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

                    <div className="w-[1px] h-5 bg-slate-200 mx-0.5 shrink-0" />

                    {/* Enlace */}
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
                            title="Insertar enlace"
                        >
                            <LinkIcon size={16} />
                        </button>

                        {isLinkPromptOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsLinkPromptOpen(false)} 
                                />
                                <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">
                                        Insertar Enlace
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="url"
                                            placeholder="https://ejemplo.com"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSetLink()}
                                            className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSetLink}
                                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 active:scale-95 transition-all shadow-xs"
                                        >
                                            <Check size={14} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Sheet 1: Insertar Elementos (+) */}
            <AnimatePresence>
                {isInsertSheetOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsInsertSheetOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl p-5 z-50 border-t border-slate-200 max-h-[80vh] overflow-y-auto"
                        >
                            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">
                                        Insertar en el documento
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                        Contenido y bloques
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsInsertSheetOpen(false)}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                {/* Adjuntar imagen desde dispositivo */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsInsertSheetOpen(false);
                                        openFilePicker();
                                    }}
                                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-left transition-all active:scale-95 group"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
                                        <ImagePlus size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-slate-900 leading-tight">Subir Imagen</div>
                                        <div className="text-[10px] text-indigo-600 font-semibold truncate">Cámara o galería</div>
                                    </div>
                                </button>

                                {/* Abrir Banco de Medios */}
                                {onOpenMediaTab && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsInsertSheetOpen(false);
                                            onOpenMediaTab();
                                        }}
                                        className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-left transition-all active:scale-95"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                                            <ImageIcon size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-slate-900 leading-tight">Banco Medios</div>
                                            <div className="text-[10px] text-slate-500 font-medium truncate">Biblioteca Nous</div>
                                        </div>
                                    </button>
                                )}

                                {/* Cita destacada */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleBlockquote().run();
                                        setIsInsertSheetOpen(false);
                                    }}
                                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-left transition-all active:scale-95"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                                        <Quote size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-slate-900 leading-tight">Cita en Bloque</div>
                                        <div className="text-[10px] text-slate-500 font-medium truncate">Párrafo destacado</div>
                                    </div>
                                </button>

                                {/* Separador horizontal */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().setHorizontalRule().run();
                                        setIsInsertSheetOpen(false);
                                    }}
                                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-left transition-all active:scale-95"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                                        <Minus size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-slate-900 leading-tight">Línea Divisoria</div>
                                        <div className="text-[10px] text-slate-500 font-medium truncate">Regla horizontal</div>
                                    </div>
                                </button>

                                {/* Tabla 3x3 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                                        setIsInsertSheetOpen(false);
                                    }}
                                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-left transition-all active:scale-95"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                        <TableIcon size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-slate-900 leading-tight">Tabla Rápida</div>
                                        <div className="text-[10px] text-slate-500 font-medium truncate">3 columnas x 3 filas</div>
                                    </div>
                                </button>

                                {/* Bloque de código */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        editor.chain().focus().toggleCodeBlock().run();
                                        setIsInsertSheetOpen(false);
                                    }}
                                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-left transition-all active:scale-95"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 border border-violet-500/20 flex items-center justify-center shrink-0">
                                        <Code2 size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black text-slate-900 leading-tight">Bloque Código</div>
                                        <div className="text-[10px] text-slate-500 font-medium truncate">Sintaxis técnica</div>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom Sheet 2: Formato y Estilos Avanzados (Colores, Tamaños) */}
            <AnimatePresence>
                {isStyleSheetOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsStyleSheetOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl p-5 z-50 border-t border-slate-200 max-h-[85vh] overflow-y-auto"
                        >
                            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">
                                        Estilos de Texto
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                        Color, Resaltado y Tamaño
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsStyleSheetOpen(false)}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Tamaño de Fuente */}
                            <div className="mb-4">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 block">
                                    Tamaño de Fuente
                                </label>
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                    {FONT_SIZES.map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => editor.chain().focus().setFontSize(size).run()}
                                            className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                                                editor.getAttributes('textStyle').fontSize === size
                                                    ? "bg-indigo-600 text-white shadow-xs"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            )}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color de Texto */}
                            <div className="mb-4">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 block">
                                    Color de Texto
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {TEXT_COLORS.map((col) => (
                                        <button
                                            key={col.value}
                                            type="button"
                                            onClick={() => editor.chain().focus().setColor(col.value).run()}
                                            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 transition-all text-left"
                                        >
                                            <span 
                                                className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-2xs" 
                                                style={{ backgroundColor: col.value }}
                                            />
                                            <span className="text-[11px] font-bold text-slate-800 truncate">
                                                {col.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resaltador / Marcatextos */}
                            <div className="mb-2">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 block">
                                    Color de Resaltado
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {HIGHLIGHT_COLORS.map((col) => (
                                        <button
                                            key={col.value}
                                            type="button"
                                            onClick={() => {
                                                if (col.value === 'transparent') {
                                                    editor.chain().focus().unsetHighlight().run();
                                                } else {
                                                    editor.chain().focus().setHighlight({ color: col.value }).run();
                                                }
                                            }}
                                            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 transition-all text-left"
                                        >
                                            <span 
                                                className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-2xs flex items-center justify-center text-[9px]" 
                                                style={{ backgroundColor: col.value === 'transparent' ? '#ffffff' : col.value }}
                                            >
                                                {col.value === 'transparent' && <X size={10} className="text-slate-400" />}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-800 truncate">
                                                {col.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
