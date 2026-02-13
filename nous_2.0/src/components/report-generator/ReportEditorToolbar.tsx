import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Undo, Redo, Sparkles, Loader2, X, Layout } from 'lucide-react';
import { cn } from '@/utils/cn';
import { generateAiContentAction } from '@/app/actions/report-actions';

interface ToolbarProps {
    editor: Editor | null;
    onOpenSectionBuilder?: () => void;
}

export function ReportEditorToolbar({ editor, onOpenSectionBuilder }: ToolbarProps) {
    const [showAiMenu, setShowAiMenu] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!editor) return null;

    const handleAiGenerate = async (customPrompt?: string) => {
        setIsGenerating(true);
        const selectedText = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');

        const finalPrompt = customPrompt || prompt;
        if (!finalPrompt) { setIsGenerating(false); return; }

        try {
            const res = await generateAiContentAction(finalPrompt, selectedText);
            if (res.success && res.html) {
                editor.commands.insertContent(res.html);
                setShowAiMenu(false);
                setPrompt('');
            } else {
                alert("Error al generar: " + res.error);
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const ToolbarButton = ({ onClick, isActive, children, title }: { onClick: () => void, isActive?: boolean, children: React.ReactNode, title: string }) => (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "p-2 rounded-lg transition-colors",
                isActive ? "bg-purple-100 text-purple-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
        >
            {children}
        </button>
    );

    return (
        <div className="flex items-center gap-1 p-2 bg-white border border-slate-200 rounded-xl shadow-sm mb-4 sticky top-4 z-50 overflow-visible">
            <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Negrita"
                >
                    <Bold size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Cursiva"
                >
                    <Italic size={18} />
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1 px-2 border-r border-slate-200">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Título 1"
                >
                    <Heading1 size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Título 2"
                >
                    <Heading2 size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="Título 3"
                >
                    <Heading3 size={18} />
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1 px-2 border-r border-slate-200">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Lista con viñetas"
                >
                    <List size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Lista numerada"
                >
                    <ListOrdered size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Cita"
                >
                    <Quote size={18} />
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1 px-2 border-r border-slate-200">
                <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Deshacer">
                    <Undo size={18} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rehacer">
                    <Redo size={18} />
                </ToolbarButton>
            </div>

            {/* AI Tools (Moved to left, replacing Charts) */}
            <div className="px-2 relative">
                <button
                    onClick={() => setShowAiMenu(!showAiMenu)}
                    className={cn(
                        "p-2 rounded-lg transition-colors flex items-center gap-1",
                        showAiMenu ? "bg-purple-100 text-purple-700" : "text-slate-500 hover:bg-slate-100"
                    )}
                    title="IA Tools"
                >
                    <Sparkles size={18} />
                </button>
                {showAiMenu && (
                    <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black uppercase text-purple-600 flex items-center gap-2"><Sparkles size={12} /> Generar con IA</h4>
                            <button onClick={() => setShowAiMenu(false)}><X size={14} className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="space-y-2 mb-4">
                            <button disabled={isGenerating} onClick={() => handleAiGenerate("Mejora la redacción de este texto para que sea más profesional y persuasivo.")} className="w-full text-left text-xs p-2 hover:bg-purple-50 rounded-lg text-slate-700 font-medium transition-colors">✨ Mejorar redacción</button>
                            <button disabled={isGenerating} onClick={() => handleAiGenerate("Expande este punto con más detalles y ejemplos relevantes.")} className="w-full text-left text-xs p-2 hover:bg-purple-50 rounded-lg text-slate-700 font-medium transition-colors">📈 Expandir explicación</button>
                            <button disabled={isGenerating} onClick={() => handleAiGenerate("Genera una tabla comparativa basada en estos datos.")} className="w-full text-left text-xs p-2 hover:bg-purple-50 rounded-lg text-slate-700 font-medium transition-colors">📊 Crear Tabla</button>
                        </div>

                        <div className="relative">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="O describe qué quieres escribir..."
                                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-purple-100 resize-none"
                                rows={3}
                            />
                            <button
                                disabled={!prompt || isGenerating}
                                onClick={() => handleAiGenerate()}
                                className="mt-2 w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : "Generar"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Section Builder (Moved to right, highlighted) */}
            <div className="ml-auto pl-2">
                <button
                    onClick={onOpenSectionBuilder}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:shadow-md transition-all bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                    title="Constructor de Secciones"
                >
                    <Layout size={14} /> Constructor de Secciones
                </button>
            </div>
        </div>
    );
}
