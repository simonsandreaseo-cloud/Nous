import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/utils/cn';

interface VersionPreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onRestore: () => void;
    contentHtml: string;
    versionName: string;
    isRestoring: boolean;
}

export const VersionPreviewDialog: React.FC<VersionPreviewDialogProps> = ({
    isOpen,
    onClose,
    onRestore,
    contentHtml,
    versionName,
    isRestoring
}) => {
    // We use a read-only Tiptap instance to render the HTML exactly as the main editor does
    const editor = useEditor({
        extensions: [StarterKit],
        content: contentHtml,
        editable: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-invert max-w-none focus:outline-none'
            }
        }
    }, [contentHtml]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-100">Vista Previa: {versionName}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Modo de solo lectura. Revisa el contenido antes de restaurar.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onRestore}
                            disabled={isRestoring}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <RotateCcw size={16} className={isRestoring ? "animate-spin" : ""} />
                            {isRestoring ? "Restaurando..." : "Restaurar esta versión"}
                        </button>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-inner min-h-full">
                        <EditorContent editor={editor} />
                    </div>
                </div>
                
            </div>
        </div>
    );
};
