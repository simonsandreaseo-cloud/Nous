import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Save, Loader2, Check, AlertCircle, Users } from 'lucide-react';
import PresenceAvatars from '../../../components/shared/PresenceAvatars';

interface ContentWriterViewProps {
    item: any;
    accessLevel: 'view' | 'edit';
}

const ContentWriterView: React.FC<ContentWriterViewProps> = ({ item, accessLevel }) => {
    const [content, setContent] = useState(item.html_content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSave = async () => {
        if (accessLevel !== 'edit') return;
        setIsSaving(true);
        setError(null);
        try {
            const { error: saveError } = await supabase
                .from('content_drafts')
                .update({
                    html_content: content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.id);

            if (saveError) throw saveError;
            setLastSaved(new Date());
        } catch (err: any) {
            console.error('Error saving:', err);
            setError('Error al guardar los cambios');
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save logic if editing
    useEffect(() => {
        if (accessLevel !== 'edit') return;

        const timeout = setTimeout(() => {
            if (content !== item.html_content) {
                handleSave();
            }
        }, 3000); // Auto save after 3 seconds of inactivity

        return () => clearTimeout(timeout);
    }, [content]);

    // Real-time synchronization
    useEffect(() => {
        const channel = supabase
            .channel(`content_sync:${item.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'content_drafts',
                    filter: `id=eq.${item.id}`
                },
                (payload) => {
                    // Only update if we are not the ones who just saved (to avoid cursor jump)
                    // and if the content actually changed
                    if (payload.new.html_content !== content) {
                        setContent(payload.new.html_content);
                        setLastSaved(new Date());
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [item.id, content]);

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-12">
            {/* Presence Indicators */}
            <div className="flex justify-end mb-4">
                <PresenceAvatars itemType="draft" channelId={item.id.toString()} />
            </div>

            {/* Toolbar for Editors */}
            {accessLevel === 'edit' && (
                <div className="flex items-center justify-between mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100 sticky top-20 z-40 shadow-sm">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-brand-power/40 uppercase tracking-widest">Modo Edición</span>
                        {lastSaved && (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                <Check size={12} /> Guardado {lastSaved.toLocaleTimeString()}
                            </span>
                        )}
                        {error && (
                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                <AlertCircle size={12} /> {error}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-power text-brand-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-brand-power transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            )}

            <div className="prose prose-slate max-w-none">
                {accessLevel === 'edit' ? (
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full min-h-[70vh] p-0 border-none outline-none font-serif text-lg leading-relaxed text-brand-power/80 resize-none bg-transparent focus:ring-0"
                        placeholder="Comienza a escribir..."
                    />
                ) : (
                    <div
                        className="font-serif text-lg leading-relaxed text-brand-power/80 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                )}
            </div>
        </div>
    );
};

export default ContentWriterView;
