import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { X, Save, User } from 'lucide-react';

interface AvatarEditorProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig?: any;
    onSave?: (config: any) => void;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({ isOpen, onClose, currentConfig, onSave }) => {
    const { user } = useAuth();
    const [color, setColor] = useState(currentConfig?.color || '#00ff99');
    const [loading, setLoading] = useState(false);

    const colors = ['#00ff99', '#00ccff', '#ff0099', '#ffcc00', '#ff3333', '#ffffff', '#888888'];

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const newConfig = { color };

            const { error } = await supabase
                .from('avatars')
                .upsert({
                    user_id: user.id,
                    config: newConfig
                });

            if (error) throw error;

            if (onSave) onSave(newConfig);
            onClose();
        } catch (e) {
            console.error('Error saving avatar:', e);
            alert('Error al guardar avatar');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-80">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <User size={20} />
                        Personalizar Avatar
                    </h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Color del Traje</label>
                        <div className="flex flex-wrap gap-2">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-brand-power scale-110 shadow-lg' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Future: Hair, Accessories, etc. */}
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 py-2 bg-brand-power text-white rounded-lg font-bold hover:bg-brand-power/90 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AvatarEditor;
