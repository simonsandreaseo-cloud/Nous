"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";

/**
 * ProjectSettingsLayout
 * ---------------------
 * Este layout se encarga de que el "activeProject" del Store coincida 
 * siempre con el ID que viene en la URL (/settings/projects/[projectId]/...).
 * 
 * Esto soluciona el problema de navegación desde el Directorio donde
 * se abría la configuración pero se mostraban datos del proyecto anterior.
 */
export default function ProjectSettingsLayout({ 
    children 
}: { 
    children: React.ReactNode 
}) {
    const params = useParams();
    const projectId = params?.projectId;
    const { projects, setActiveProject, fetchProjects } = useProjectStore();

    // 1. Asegurar que los proyectos estén cargados (útil en deep-linking / refresh)
    useEffect(() => {
        if (projects.length === 0) {
            console.log("🚀 [SettingsLayout] No projects in store, fetching...");
            fetchProjects();
        }
    }, [projects.length, fetchProjects]);

    // 2. Sincronizar el proyecto activo con el ID de la URL
    useEffect(() => {
        if (projectId && typeof projectId === 'string') {
            console.log("🎯 [SettingsLayout] Syncing active project to:", projectId);
            setActiveProject(projectId);
        }
    }, [projectId, setActiveProject]);

    return (
        <div className="w-full">
            {children}
        </div>
    );
}
