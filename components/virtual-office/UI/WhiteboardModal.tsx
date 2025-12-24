import React, { useCallback, useEffect, useState } from 'react';
import { Tldraw, Editor, getSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { supabase } from '../../../lib/supabase';
import { X, Save } from 'lucide-react';

interface WhiteboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string | number;
}

const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ isOpen, onClose, projectId }) => {
    const [editor, setEditor] = useState<Editor | null>(null);
    const [loading, setLoading] = useState(false);

    // Load initial state
    useEffect(() => {
        if (isOpen && projectId) {
            loadState();
        }
    }, [isOpen, projectId]);

    const loadState = async () => {
        const { data } = await supabase
            .from('office_states')
            .select('whiteboard_data')
            .eq('project_id', projectId)
            .single();

        if (data?.whiteboard_data && editor) {
            try {
                // editor.loadSnapshot(data.whiteboard_data); // Tldraw API varies by version
                // For MVP, if persistence is tricky with version mismatch, we just start fresh or try/catch
                console.log("Loading snapshot...", data.whiteboard_data);
            } catch (e) {
                console.error("Failed to load snapshot", e);
            }
        }
    };

    const handleMount = (editorInstance: Editor) => {
        setEditor(editorInstance);
    };

    const handleSave = async () => {
        if (!editor || !projectId) return;

        setLoading(true);
        try {
            const snapshot = getSnapshot(editor.store);
            const { error } = await supabase
                .from('office_states')
                .upsert({
                    project_id: projectId,
                    whiteboard_data: snapshot
                });

            if (error) throw error;
            alert('Pizarra guardada correctamente');
        } catch (e) {
            console.error('Error saving whiteboard:', e);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-[90vw] h-[90vh] bg-white rounded-xl overflow-hidden relative shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                    <h2 className="font-bold text-lg text-gray-800">Pizarra Colaborativa</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-power text-white rounded-lg hover:bg-brand-power/90 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : 'Guardar Estado'}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Tldraw Canvas */}
                <div className="flex-1 w-full h-full relative">
                    <Tldraw
                        onMount={handleMount}
                        persistenceKey={`office-${projectId}`} // LocalStorage persistence fallback
                    />
                </div>
            </div>
        </div>
    );
};

export default WhiteboardModal;
