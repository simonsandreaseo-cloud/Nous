import React from 'react';
import { Layout, CheckCircle, Clock, ExternalLink, Users } from 'lucide-react';
import PresenceAvatars from '../../../components/shared/PresenceAvatars';

interface ProjectPublicViewProps {
    item: any;
    accessLevel: 'view' | 'edit';
}

const ProjectPublicView: React.FC<ProjectPublicViewProps> = ({ item, accessLevel }) => {
    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Layout className="text-brand-accent" size={24} />
                        <h2 className="text-3xl font-bold text-brand-power">{item.name}</h2>
                    </div>
                    <p className="text-brand-power/60 text-lg">{item.description || 'Dashboard del proyecto compartido'}</p>
                </div>
                <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
                    <PresenceAvatars itemType="project" channelId={item.id.toString()} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Content Column */}
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-brand-power mb-6 flex items-center gap-2">
                            <CheckCircle size={20} className="text-emerald-500" /> Tareas Activas
                        </h3>
                        <div className="space-y-4">
                            <p className="text-sm text-brand-power/40 italic">La vista pública de tareas está siendo optimizada. Pronto podrás ver el progreso en tiempo real.</p>
                        </div>
                    </div>

                    {accessLevel === 'edit' && (
                        <div className="bg-brand-soft/30 rounded-3xl p-8 border border-dashed border-brand-power/10 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                                <ExternalLink size={32} />
                            </div>
                            <h4 className="font-bold text-brand-power mb-2">Editor del Proyecto</h4>
                            <p className="text-sm text-brand-power/60 max-w-sm mb-6">Como editor, puedes colaborar en la estrategia y gestión de tareas. Accede a las herramientas específicas para realizar cambios.</p>
                            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                Abrir Herramientas de Edición
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                        <h4 className="text-xs font-bold text-brand-power/40 uppercase tracking-widest mb-4">Detalles del Proyecto</h4>
                        <div className="space-y-4">
                            <DetailRow label="Propiedad GSC" value={item.gsc_property_url || 'No vinculada'} />
                            <DetailRow label="Creado el" value={new Date(item.created_at).toLocaleDateString()} />
                            <DetailRow label="Estado" value="Activo" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DetailRow = ({ label, value }: any) => (
    <div>
        <p className="text-[10px] font-bold text-brand-power/30 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-bold text-brand-power break-all">{value}</p>
    </div>
);

export default ProjectPublicView;
