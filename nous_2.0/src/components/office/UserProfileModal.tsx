import React, { useState, useEffect } from 'react';
import { X, Upload, User, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export function UserProfileModal({ isOpen, onClose, userId }: UserProfileModalProps) {
    const [profile, setProfile] = useState<any>(null);
    const [fullName, setFullName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            fetchProfile();
        }
    }, [isOpen, userId]);

    const fetchProfile = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            setProfile(data);
            setFullName(data.full_name || "");
            setAvatarUrl(data.avatar_url);
        } else if (error && error.code === 'PGRST116') {
            // Profile doesn't exist yet, fetch from auth and create one? 
            // Better to upsert
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const newProfile = { id: user.id, email: user.email };
                await supabase.from('profiles').upsert([newProfile]);
                setProfile(newProfile);
            }
        }
    };

    const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setIsUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                return;
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            let { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            setAvatarUrl(publicUrl);
            await updateProfile({ avatar_url: publicUrl });

        } catch (error: any) {
            alert('Error subiendo imagen: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const updateProfile = async (updates: any) => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (error) throw error;
        } catch (error: any) {
            alert('Error actualizando perfil: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        await updateProfile({ full_name: fullName });
        onClose();
        // Option to reload to show new avatar globally
        window.location.reload();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[32px] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase italic">Mi Perfil</h3>
                        <p className="text-xs text-slate-500">Personaliza tu cuenta de Nous.</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden relative">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-slate-300" />
                                )}
                                
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                                    {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                                    <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Cambiar</span>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleUploadAvatar}
                                disabled={isUploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-bold text-slate-500">{profile?.email}</p>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                            <input
                                type="text"
                                placeholder="Tu nombre..."
                                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold focus:bg-white focus:ring-4 ring-cyan-500/10 outline-none transition-all"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white/80 backdrop-blur-sm z-10">
                    <button onClick={onClose} className="px-6 py-3 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-800">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={isSaving || isUploading} className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-600 shadow-xl shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2">
                        {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                        Guardar Perfil
                    </button>
                </div>
            </div>
        </div>
    );
}
