import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Globe, Lock, Check, Copy, X, Loader2, Edit3, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemType: 'project' | 'draft' | 'report' | 'task';
    itemId: string | number;
    initialPublicAccess?: 'none' | 'view' | 'edit';
    initialShareToken?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    itemType,
    itemId,
    initialPublicAccess = 'none',
    initialShareToken
}) => {
    const [accessLevel, setAccessLevel] = useState<'none' | 'view' | 'edit'>(initialPublicAccess);
    const [shareToken, setShareToken] = useState<string>(initialShareToken || '');
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Table mapping
    const tableMap = {
        project: 'projects',
        draft: 'content_drafts',
        report: 'seo_reports',
        task: 'tasks'
    };

    const tableName = tableMap[itemType];

    useEffect(() => {
        if (isOpen) {
            setAccessLevel(initialPublicAccess);
            setShareToken(initialShareToken || '');
            setCopied(false);
        }
    }, [isOpen, initialPublicAccess, initialShareToken]);

    const handleUpdateAccess = async (level: 'none' | 'view' | 'edit') => {
        setIsSaving(true);
        try {
            // If we don't have a token, we should probably ensure one exists, 
            // but the SQL migration handles the default via uuid_generate_v4()

            const { data, error } = await supabase
                .from(tableName)
                .update({
                    public_access_level: level
                })
                .eq('id', itemId)
                .select('share_token, public_access_level')
                .single();

            if (error) throw error;

            if (data) {
                setAccessLevel(data.public_access_level);
                setShareToken(data.share_token);
            }
        } catch (error) {
            console.error('Error updating access level:', error);
            alert('Error al actualizar los permisos de compartido.');
        } finally {
            setIsSaving(false);
        }
    };

    const getShareUrl = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/compartir/${itemType}/${shareToken}`;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(getShareUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-brand-power/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-brand-power">
                                <Globe size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-brand-power">Compartir enlace</h3>
                                <p className="text-xs text-brand-power/40 uppercase tracking-widest font-bold">Configuración de acceso</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-brand-power/20 hover:text-brand-power hover:bg-brand-soft rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Access Quick Toggles */}
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-brand-power/40 uppercase tracking-widest">Quién tiene acceso</p>

                            {/* Private */}
                            <button
                                onClick={() => handleUpdateAccess('none')}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${accessLevel === 'none' ? 'border-brand-power bg-brand-soft/10 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accessLevel === 'none' ? 'text-brand-power' : 'text-brand-power/30'}`}>
                                        <Lock size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-brand-power">Restringido</p>
                                        <p className="text-xs text-brand-power/40">Solo tú y las personas añadidas</p>
                                    </div>
                                </div>
                                {accessLevel === 'none' && <Check size={18} className="text-brand-power" />}
                            </button>

                            {/* Public - Viewer */}
                            <button
                                onClick={() => handleUpdateAccess('view')}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${accessLevel === 'view' ? 'border-brand-accent bg-brand-accent/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accessLevel === 'view' ? 'text-brand-accent' : 'text-brand-power/30'}`}>
                                        <Eye size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-brand-power">Cualquiera con el enlace</p>
                                        <p className="text-xs text-brand-power/40">Puede ver este contenido</p>
                                    </div>
                                </div>
                                {accessLevel === 'view' && <Check size={18} className="text-brand-accent" />}
                            </button>

                            {/* Public - Editor */}
                            <button
                                onClick={() => handleUpdateAccess('edit')}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${accessLevel === 'edit' ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accessLevel === 'edit' ? 'text-indigo-600' : 'text-brand-power/30'}`}>
                                        <Edit3 size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-brand-power">Cualquiera con el enlace (Editor)</p>
                                        <p className="text-xs text-brand-power/40">Puede ver y editar este contenido</p>
                                    </div>
                                </div>
                                {accessLevel === 'edit' && <Check size={18} className="text-indigo-600" />}
                            </button>
                        </div>

                        {/* Link Display (Only if not hidden) */}
                        {accessLevel !== 'none' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="pt-4 border-t border-gray-100 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-brand-power/40 uppercase tracking-widest flex items-center gap-2">
                                        <Link2 size={12} /> Enlace de {accessLevel === 'edit' ? 'edición' : 'lectura'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-200 group">
                                    <input
                                        type="text"
                                        readOnly
                                        value={getShareUrl()}
                                        className="flex-1 bg-transparent border-none outline-none text-xs text-brand-power/60 font-mono px-2"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white shadow-md' : 'bg-brand-white text-brand-power hover:bg-brand-soft shadow-sm'}`}
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                        {copied ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-brand-power/30 leading-relaxed text-center">
                                    Al compartir este enlace, cualquier persona podrá acceder sin necesidad de estar registrada.
                                    {accessLevel === 'edit' ? ' ¡Ten cuidado, podrán modificar el contenido!' : ''}
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-gray-50 text-center">
                        <button
                            onClick={onClose}
                            className="text-xs font-bold text-brand-power/40 hover:text-brand-power uppercase tracking-widest transition-colors"
                        >
                            Cerrar ajustes de compartido
                        </button>
                    </div>

                    {/* Loading Overlay */}
                    {isSaving && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                            <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ShareModal;
