"use client";
import { useProjectStore } from "@/store/useProjectStore";
import { 
    Briefcase, 
    Settings, 
    ArrowRight, 
    Globe, 
    ExternalLink,
    Plus
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";

export default function ProjectDirectoryView() {
    const { projects, isLoading } = useProjectStore();

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Directorio de Proyectos</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestiona el ecosistema de marcas de la agencia</p>
                </div>
                {/* 
                   NOTA: La creación de proyectos sigue siendo global 
                   a través del NewContentModal o similar, pero aquí podríamos 
                   tener un acceso directo.
                */}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => (
                    <div key={project.id} className="group relative bg-white rounded-xl border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500">
                        <div className="flex items-start justify-between mb-8">
                            <div 
                                className="w-16 h-16 rounded-[24px] shadow-lg flex items-center justify-center text-white overflow-hidden border-4 border-white"
                                style={{ backgroundColor: project.color || '#6366f1' }}
                            >
                                {project.logo_url ? (
                                    <img src={project.logo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Briefcase size={28} />
                                ) }
                            </div>
                            <div className="flex items-center gap-2">
                                <a 
                                    href={`https://${project.domain}`} 
                                    target="_blank" 
                                    className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all"
                                >
                                    <ExternalLink size={18} />
                                </a>
                                <Link 
                                    href={`/settings/projects/${project.id}/general`}
                                    className="p-3 bg-slate-900 text-white hover:bg-indigo-600 rounded-2xl transition-all shadow-lg shadow-slate-200"
                                >
                                    <Settings size={18} />
                                </Link>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight group-hover:text-indigo-600 transition-colors">
                                {project.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <Globe size={12} className="text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{project.domain}</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex gap-1">
                                {project.gsc_connected ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="GSC Conectado" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-slate-200" />
                                )}
                                {project.wp_url ? (
                                    <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" title="WP Conectado" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-slate-200" />
                                )}
                            </div>
                            <Link 
                                href={`/settings/projects/${project.id}/general`}
                                className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all"
                            >
                                Configurar Proyecto
                                <ArrowRight size={12} />
                            </Link>
                        </div>
                    </div>
                ))}

                {/* Empty State / Add Placeholder */}
                <div className="bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-indigo-200 transition-all cursor-pointer group">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nuevo Proyecto de Marca</p>
                </div>
            </div>
        </div>
    );
}
