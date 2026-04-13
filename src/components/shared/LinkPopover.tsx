import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Link as LinkIcon, Unlink, ExternalLink, Trash2, Check, X, History } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';

interface LinkPopoverProps {
    editor: Editor;
}

export function LinkPopover({ editor }: LinkPopoverProps) {
    const [tempLink, setTempLink] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const attributes = editor.getAttributes('link');
    const originalUrl = attributes['data-original-url'] || attributes.dataOriginalUrl; // Support both cases

    const updateTempLink = useCallback(() => {
        const url = editor.getAttributes('link').href || "";
        setTempLink(url);
    }, [editor]);

    const handleSetLink = useCallback(() => {
        if (tempLink) {
            editor.chain().focus().setLink({ href: tempLink }).run();
        } else {
            editor.chain().focus().unsetLink().run();
        }
        setIsEditing(false);
    }, [editor, tempLink]);

    const handleUnsetLink = useCallback(() => {
        editor.chain().focus().unsetLink().run();
    }, [editor]);

    return (
        <BubbleMenu 
            editor={editor} 
            pluginKey="linkMenuPopover"
            tippyOptions={{ 
                duration: 150, 
                placement: 'bottom',
                onShow: updateTempLink,
                onHide: () => setIsEditing(false)
            }}
            shouldShow={({ editor }) => editor.isActive('link')}
        >
            <div className="flex flex-col bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-200/50 rounded-2xl p-1.5 gap-1.5 min-w-[320px] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                <div className="flex items-center gap-1.5">
                    {!isEditing ? (
                        <>
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden">
                                <LinkIcon size={14} className="text-indigo-400 shrink-0" />
                                <span className="text-[11px] font-bold text-slate-600 truncate max-w-[180px]">
                                    {editor.getAttributes('link').href || "Sin enlace"}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all active:scale-90"
                                    title="Editar enlace"
                                >
                                    <ExternalLink size={16} />
                                </button>
                                <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
                                <button 
                                    onClick={handleUnsetLink}
                                    className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all active:scale-90"
                                    title="Eliminar enlace"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                                <LinkIcon size={14} className="text-indigo-500 shrink-0" />
                                <input 
                                    type="text" 
                                    className="bg-transparent text-[11px] font-bold text-slate-800 outline-none w-full placeholder:text-slate-300"
                                    placeholder="https://..."
                                    value={tempLink}
                                    autoFocus
                                    onChange={(e) => setTempLink(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSetLink();
                                        if (e.key === 'Escape') setIsEditing(false);
                                    }}
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={handleSetLink}
                                    className="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-90"
                                    title="Confirmar"
                                >
                                    <Check size={16} />
                                </button>
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
                                    title="Cancelar"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Original URL Section (Only if it differs or is recorded) */}
                {originalUrl && originalUrl !== editor.getAttributes('link').href && (
                    <div className="mx-0.5 mb-0.5 px-3 py-2 bg-amber-50/40 rounded-xl border border-amber-100/50 flex flex-col gap-1 anim-in fade-in slide-in-from-top-1 duration-300">
                        <div className="flex items-center gap-1.5 opacity-60">
                            <History size={10} className="text-amber-600" />
                            <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest">URL Original Detectada</span>
                        </div>
                        <p className="text-[9px] font-mono text-amber-800 break-all leading-tight opacity-70">
                            {originalUrl}
                        </p>
                    </div>
                )}
            </div>
        </BubbleMenu>
    );
}
