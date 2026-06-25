"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { Activity } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export function CustomStatusesSettings({ teamId }: { teamId: string }) {
    const { teams, updateTeamSettings } = useProjectStore();
    const { user } = useAuthStore();
    
    const activeTeam = teams.find(t => t.id === teamId);
    const currentUserMember = activeTeam?.team_members?.find((m: any) => m.user_id === user?.id);
    const role = currentUserMember?.role;
    
    const canManageStatuses = role === 'owner' || role === 'partner' || role === 'manager' || role === 'admin';
    
    const [customStatuses, setCustomStatuses] = useState<string[]>([]);
    const [newStatus, setNewStatus] = useState('');

    useEffect(() => {
        if (activeTeam?.settings?.custom_statuses) {
            setCustomStatuses(activeTeam.settings.custom_statuses);
        } else {
            setCustomStatuses([]);
        }
    }, [activeTeam]);

    const handleSaveStatus = async (statusesToSave: string[]) => {
        if (!activeTeam) return;
        
        const updatedSettings = {
            ...(activeTeam.settings || {}),
            custom_statuses: statusesToSave
        };

        await updateTeamSettings(activeTeam.id, updatedSettings);
    };

    const handleAddStatus = async () => {
        if (newStatus.trim()) {
            const formatted = newStatus.trim().toLowerCase().replace(/\s+/g, '_');
            if (!customStatuses.includes(formatted)) {
                const updated = [...customStatuses, formatted];
                setCustomStatuses(updated);
                setNewStatus('');
                await handleSaveStatus(updated);
            }
        }
    };

    const handleRemoveStatus = async (status: string) => {
        const updated = customStatuses.filter(t => t !== status);
        setCustomStatuses(updated);
        await handleSaveStatus(updated);
    };

    if (!activeTeam) return null;

    return (
        <section className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Activity size={120} />
            </div>

            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm">
                    <Activity size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase italic">Estatus Personalizados</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Añade o personaliza los estatus globales para la agencia</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                    {['Idea', 'Investigando', 'Por Redactar', 'En Redacción', 'Por Humanizar', 'Por Corregir', 'Por Revisar', 'Por Maquetar', 'Publicado'].map(type => (
                        <div key={type} className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg text-[10px] font-bold">
                            {type} (Nativo)
                        </div>
                    ))}
                    {customStatuses.map(status => (
                        <div key={status} className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-2 group">
                            {status.replace(/_/g, ' ')}
                            {canManageStatuses && (
                                <button 
                                    onClick={() => handleRemoveStatus(status)}
                                    className="opacity-50 hover:opacity-100 hover:text-red-500 transition-colors"
                                >
                                    <span className="font-black">×</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {canManageStatuses ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    handleAddStatus();
                                }
                            }}
                            placeholder="Ej: Aprobación Legal (Presiona Enter)"
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 outline-none focus:border-rose-400"
                        />
                        <button
                            onClick={handleAddStatus}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                        >
                            Agregar
                        </button>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                            Solo los Administradores (Owner, Partner, Manager, Admin) pueden agregar o eliminar estatus personalizados.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
