"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import {
    Settings as SettingsIcon,
    Wallet,
    Shield,
    Globe,
    Save,
    Plus,
    Trash2,
    Loader2,
    BarChart3,
    RefreshCw,
    Search,
    Zap,
    Code,
    ListFilter,
    Terminal,
    Database
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import { TeamSettings } from "./TeamSettings";
import { NOUS_PALETTE } from "@/constants/colors";
import { getProjectNameFromDomain, getFaviconUrl, sanitizeUrl } from "@/utils/domain";
import { analyzeManualUrlsAction } from "@/app/node-tasks/report-actions";

export default function SettingsPage() {
    const { 
        activeProject, 
        projects, 
        createProject, 
        deleteProject, 
        fetchProjects, 
        updateProject, 
        setActiveProject,
        activeTeam,
        teams,
        setActiveTeam,
        fetchTeams,
        createTeam
    } = useProjectStore();
    const [newProjectName, setNewProjectName] = useState("");
    const [newProjectDomain, setNewProjectDomain] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);
    const [activeTab, setActiveTab] = useState<'projects' | 'integrations' | 'billing' | 'team'>('projects');
    const [isUserGscConnected, setIsUserGscConnected] = useState(false);
    const [connectedAccounts, setConnectedAccounts] = useState<{ id: string, email: string }[]>([]);

    // Editing state for the active project
    const [editName, setEditName] = useState("");
    const [editDomain, setEditDomain] = useState("");
    const [editWpUrl, setEditWpUrl] = useState("");
    const [editWpToken, setEditWpToken] = useState("");
    const [editTargetCountry, setEditTargetCountry] = useState("ES"); // Default Spain
    const [editLogoUrl, setEditLogoUrl] = useState("");
    const [editColor, setEditColor] = useState("#06b6d4"); // Default Cyan
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastCreatedProjectId, setLastCreatedProjectId] = useState("");
    const [newTeamId, setNewTeamId] = useState("");
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    
    // Architecture & Internal Linking State
    const [editArchitectureRules, setEditArchitectureRules] = useState<{ name: string; regex: string }[]>([]);
    const [editArchitectureInstructions, setEditArchitectureInstructions] = useState("");
    const [newRuleName, setNewRuleName] = useState("");
    const [newRuleRegex, setNewRuleRegex] = useState("");

    const [gscSites, setGscSites] = useState<{ url: string; permission: string; accountEmail?: string }[]>([]);
    const [ga4Properties, setGa4Properties] = useState<{ id: string; name: string; accountEmail?: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncingGsc, setIsSyncingGsc] = useState(false);

    // NEW: Smart Architecture Sampling Info
    const [samplingStats, setSamplingStats] = useState<{
        totalUrls: number;
        totalSample: number;
        categoriesCount: number;
        urlsPerCategory: Record<string, number>;
        timestamp: string;
    } | null>(null);

    const handleRegenerateRegex = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            // 1. Get real total count (exact head-only)
            const { count: realCount, error: countError } = await supabase
                .from('project_urls')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', activeProject.id);

            if (countError) throw countError;

            // 2. Get distinct categories and filter NULLs early
            const { data: catData, error: catError } = await supabase
                .from('project_urls')
                .select('category')
                .eq('project_id', activeProject.id)
                .not('category', 'is', null)
                .limit(5000); // 5k fetch is fast and likely covers all categories
            
            if (catError) throw catError;
            let categories = Array.from(new Set(catData.map(r => r.category).filter(Boolean))) as string[];

            let dbUrls: { url: string, category: string }[] = [];

            if (categories.length > 0) {
                // 3. Fetch representative URLs from EACH category (handling large DBs)
                const fetchBatches = categories.map(cat => 
                    supabase
                        .from('project_urls')
                        .select('url, category')
                        .eq('project_id', activeProject.id)
                        .eq('category', cat)
                        .limit(200) 
                );

                const results = await Promise.all(fetchBatches);
                results.forEach(res => {
                    if (res.data) dbUrls = [...dbUrls, ...res.data];
                });
            } else {
                // Fallback: If no categories detected after 5k fetch, pull first 1k URLs for raw sampling
                const { data: fallbackUrls } = await supabase
                    .from('project_urls')
                    .select('url, category')
                    .eq('project_id', activeProject.id)
                    .limit(1000);
                
                if (fallbackUrls && fallbackUrls.length > 0) {
                    dbUrls = fallbackUrls.map(r => ({ 
                        url: r.url, 
                        category: r.category || "Uncategorized" 
                    }));
                    categories = Array.from(new Set(dbUrls.map(r => r.category)));
                }
            }

            if (dbUrls.length === 0) {
                alert("No hay URLs en el inventario para analizar. Sube un CSV primero.");
                return;
            }

            // --- REPLICATE DIVERSITY SAMPLER ---
            let sampleEntries: { url: string, category: string }[] = [];
            let urlsPerCategoryStats: Record<string, number> = {};
            
            categories.forEach(cat => {
                const catRows = dbUrls.filter(r => r.category === cat);
                urlsPerCategoryStats[cat] = 0;
                const groups = new Map<string, typeof catRows>();
                
                catRows.forEach(row => {
                    try {
                        const parsed = new URL(row.url);
                        const segments = parsed.pathname.split('/').filter(Boolean);
                        const hasDigits = /\d/.test(parsed.pathname) ? 'num' : 'alpha';
                        const dashCount = (parsed.pathname.match(/-/g) || []).length;
                        const dashBucket = Math.min(Math.floor(dashCount / 2), 3);
                        const totalCharCount = segments.join('').length;
                        const lengthBucket = Math.floor(totalCharCount / 10);
                        const fingerprint = `${segments.length}:${segments.slice(0, 1).join('/')}:${hasDigits}:${dashBucket}:${lengthBucket}`;
                        if (!groups.has(fingerprint)) groups.set(fingerprint, []);
                        groups.get(fingerprint)!.push(row);
                    } catch (e) {
                        if (!groups.has('root')) groups.set('root', []);
                        groups.get('root')!.push(row);
                    }
                });

                groups.forEach(groupRows => {
                    const picked = groupRows.slice(0, 5).map(r => ({ url: r.url, category: cat }));
                    sampleEntries = [...sampleEntries, ...picked];
                    urlsPerCategoryStats[cat] += picked.length;
                });
            });

            sampleEntries = sampleEntries.slice(0, 1000);

            const result = await analyzeManualUrlsAction(sampleEntries);
            if (result.success && result.proposedRules) {
                setEditArchitectureRules(result.proposedRules);
                await updateProject(activeProject.id, { architecture_rules: result.proposedRules });
                
                setSamplingStats({
                    totalUrls: realCount || dbUrls.length,
                    totalSample: sampleEntries.length,
                    categoriesCount: categories.length,
                    urlsPerCategory: urlsPerCategoryStats,
                    timestamp: new Date().toLocaleTimeString()
                });
            } else {
                throw new Error(result.error || "Error en el análisis de IA");
            }
        } catch (err: any) {
            alert("Error al regenerar: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };
    const [syncProgress, setSyncProgress] = useState("");
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    const [isLoadingGa4, setIsLoadingGa4] = useState(false);

    useEffect(() => {
        fetchProjects();
        fetchTeams();

        // Check for GSC auth callback params
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('google') === 'connected') {
                alert("Cuenta de Google vinculada correctamente.");
                window.history.replaceState({}, '', window.location.pathname);
                setActiveTab('integrations');
            }
            if (params.get('gsc') === 'connected') {
                fetchProjects().then(() => {
                    alert("Google Search Console conectado exitosamente.");
                });
                setActiveTab('integrations');
                window.history.replaceState({}, '', window.location.pathname);
            } else if (params.get('error')) {
                alert(`Error al conectar GSC: ${params.get('error')}`);
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [fetchProjects]);

    // Check if user has GSC token at user level
    useEffect(() => {
        const checkUserGsc = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    console.log("[DEBUG] Current Session User ID:", session.user.id);
                    if (activeProject) {
                        console.log("[DEBUG] Active Project User ID:", activeProject.user_id);
                    }

                    const { data: tokens, error } = await supabase
                        .from('user_gsc_tokens')
                        .select('id, user_id')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (error) {
                        console.error("[DEBUG] Error checking user GSC status:", error);
                    }
                    setIsUserGscConnected(!!tokens);
                }
            } catch (e) {
                console.warn("GSC Token check failed:", e);
            }
        };
        checkUserGsc();
    }, [activeProject?.id]);

    useEffect(() => {
        if (activeProject) {
            setEditName(activeProject.name);
            setEditDomain(activeProject.domain);
            setEditWpUrl(activeProject.wp_url || "");
            setEditWpUrl(activeProject.wp_url || "");
            setEditWpToken(activeProject.wp_token || "");
            setEditTargetCountry(activeProject.target_country || "ES");
            setEditLogoUrl(activeProject.logo_url || "");
            setEditColor(activeProject.color || "#06b6d4");
            setEditArchitectureRules(activeProject.architecture_rules || []);
            setEditArchitectureInstructions(activeProject.architecture_instructions || "");

            // Initial Inventory Count for Console
            const fetchInventoryCount = async () => {
                const { count, error } = await supabase
                    .from('project_urls')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', activeProject.id);

                if (!error && count !== null) {
                    setSamplingStats(prev => ({
                        totalUrls: count,
                        totalSample: prev?.totalSample || 0,
                        categoriesCount: prev?.categoriesCount || 0,
                        urlsPerCategory: prev?.urlsPerCategory || {},
                        timestamp: prev?.timestamp || new Date().toLocaleTimeString()
                    }));
                }
            };
            fetchInventoryCount();
        }
    }, [activeProject?.id]);

    useEffect(() => {
        const fetchAllSites = async () => {
            if (isUserGscConnected || activeProject?.gsc_connected) {
                await Promise.all([
                    fetchGscSites(),
                    fetchGa4Sites(),
                    fetchConnectedAccounts()
                ]);
            }
        };
        fetchAllSites();
    }, [activeProject?.id, isUserGscConnected, activeTab]);

    const handleSaveAll = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            await updateProject(activeProject.id, {
                name: editName,
                domain: editDomain,
                wp_url: editWpUrl,

                wp_token: editWpToken,
                target_country: editTargetCountry,
                logo_url: editLogoUrl,
                color: editColor,
                team_id: newTeamId || activeProject.team_id,
                architecture_rules: editArchitectureRules,
                architecture_instructions: editArchitectureInstructions
            });
            alert("Cambios guardados correctamente.");
        } catch (e: any) {
            alert("Error al guardar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar el proyecto "${name}"? Esta acción no se puede deshacer.`)) return;

        setIsSaving(true);
        try {
            await deleteProject(id);
            // After successful delete, we don't necessarily need to fetchProjects if the store is updated
            // but fetching ensures we are in sync with any DB-side changes.
            await fetchProjects();
            alert("Proyecto eliminado correctamente.");
        } catch (e: any) {
            console.error("Delete failed:", e);
            alert("No se pudo eliminar el proyecto. Probablemente tenga datos asociados (tareas, informes) que bloquean el borrado. \n\nError: " + (e.message || "Error desconocido"));
        } finally {
            setIsSaving(false);
        }
    };

    const fetchGscSites = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        setIsLoadingSites(true);
        try {
            const res = await fetch('/api/gsc/sites', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            const data = await res.json();
            if (data.success) setGscSites(data.sites);
        } catch (e) {
            console.error("Failed to fetch GSC sites:", e);
        } finally {
            setIsLoadingSites(false);
        }
    };

    const fetchGa4Sites = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        setIsLoadingGa4(true);
        try {
            const res = await fetch('/api/ga4/properties', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setGa4Properties(data.sites);
            }
        } catch (e: any) {
            console.error("Failed to fetch GA4 sites:", e);
        } finally {
            setIsLoadingGa4(false);
        }
    };

    const fetchConnectedAccounts = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('user_gsc_tokens')
                .select('id, email')
                .eq('user_id', session.user.id);
            if (data) setConnectedAccounts(data);
            setIsUserGscConnected((data?.length || 0) > 0);
        } catch (e) {
            console.error("Error fetching accounts:", e);
        }
    };

    useEffect(() => {
        fetchConnectedAccounts();
        if (isUserGscConnected && activeTab === 'integrations') {
            fetchGscSites();
            fetchGa4Sites();
        }
    }, [isUserGscConnected, activeTab]);

    const handleUpdateGscSite = async (siteUrl: string) => {
        if (!activeProject) return;
        const selectedSite = gscSites.find(s => s.url === siteUrl);
        try {
            await updateProject(activeProject.id, {
                gsc_site_url: siteUrl,
                gsc_connected: siteUrl !== "",
                gsc_account_email: selectedSite?.accountEmail
            });
            console.log("[DEBUG] Project GSC site updated to:", siteUrl);
        } catch (e) {
            console.error("Failed to update GSC site:", e);
        }
    };

    const handleUpdateGa4Property = async (propertyId: string) => {
        if (!activeProject) return;
        const selectedProp = ga4Properties.find(p => p.id === propertyId);
        try {
            await updateProject(activeProject.id, {
                ga4_property_id: propertyId,
                ga4_connected: propertyId !== "",
                ga4_account_email: selectedProp?.accountEmail
            });
            console.log("[DEBUG] Project GA4 property updated to:", propertyId);
        } catch (e) {
            console.error("Failed to update GA4 property:", e);
        }
    };

    const handleSyncGscInventory = async () => {
        if (!activeProject || !activeProject.gsc_site_url) return alert("Selecciona una propiedad GSC primero.");
        
        setIsSyncingGsc(true);
        setSyncProgress("Iniciando sincronización...");
        try {
            const response = await fetch('/api/gsc/sync-urls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: activeProject.id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Error al sincronizar");
            
            alert(`Sincronización completada: ${data.count} URLs indexadas han sido guardadas.`);
        } catch (e: any) {
            console.error("GSC Sync Failed:", e);
            alert("Error: " + e.message);
        } finally {
            setIsSyncingGsc(false);
            setSyncProgress("");
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject) return;

        setIsUploadingLogo(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${activeProject.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from('project-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('project-assets')
                .getPublicUrl(filePath);

            setEditLogoUrl(publicUrl);
        } catch (error: any) {
            alert("Error al subir el logo: " + error.message);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleCsvInventoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject) return;

        setIsSaving(true);
        try {
            const text = await file.text();
            
            // Basic CSV parsing with header support
            const lines = text.split(/\r\n|\n/).filter(l => l.trim());
            if (lines.length < 2) throw new Error("El archivo CSV debe tener al menos una cabecera y una fila de datos.");

            const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase());
            const urlIdx = headers.indexOf('url');
            const catIdx = headers.indexOf('categoria') !== -1 ? headers.indexOf('categoria') : headers.indexOf('category');

            let rows: any[] = [];

            if (urlIdx !== -1) {
                // Format A: Standard Columnar (url, category)
                rows = lines.slice(1).map(line => {
                    const parts = line.split(/[;,]/);
                    const rawUrl = parts[urlIdx]?.trim();
                    if (!rawUrl) return null;
                    
                    let url = rawUrl;
                    if (!url.startsWith('http') && !url.startsWith('/')) url = 'https://' + url;
                    url = sanitizeUrl(url);

                    const category = catIdx !== -1 ? parts[catIdx]?.trim() : null;
                    
                    return {
                        project_id: activeProject.id,
                        url,
                        category,
                        status: 'indexed',
                        updated_at: new Date().toISOString()
                    };
                }).filter(Boolean);
            } else {
                // Format B: Matrix (Headers = Categories, Cells = URLs)
                // Use Regex to find URLs in cells as per user's request
                const urlRegex = /(https?:\/\/[^\s,;"]+)/g;
                const matrixHeaders = lines[0].split(/[;,]/).map(h => h.trim());
                
                lines.slice(1).forEach(line => {
                    const parts = line.split(/[;,]/);
                    parts.forEach((cell, idx) => {
                        const matches = cell.match(urlRegex);
                        if (matches) {
                            matches.forEach(urlStr => {
                                rows.push({
                                    project_id: activeProject.id,
                                    url: sanitizeUrl(urlStr),
                                    category: matrixHeaders[idx] || "Otras",
                                    status: 'indexed',
                                    updated_at: new Date().toISOString()
                                });
                            });
                        }
                    });
                });
            }

            if (rows.length === 0) throw new Error("No se encontraron URLs válidas en el archivo.");

            // Deduplicate by URL to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time" error
            const uniqueRowsMap = new Map();
            rows.forEach(row => {
                uniqueRowsMap.set(row.url, row);
            });
            const uniqueRows = Array.from(uniqueRowsMap.values());

            // Chunking for performance (Supabase limit safety)
            const chunkSize = 1000;
            let totalProcessed = 0;
            for (let i = 0; i < uniqueRows.length; i += chunkSize) {
                const chunk = uniqueRows.slice(i, i + chunkSize);
                const { error, count } = await supabase
                    .from('project_urls')
                    .upsert(chunk, { onConflict: 'project_id,url' });
                if (error) throw error;
                totalProcessed += (count || chunk.length);
            }

            // AUTO-DETECT ARCHITECTURE RULES WITH IA (DIVERSITY-AWARE)
            const categories = Array.from(new Set(uniqueRows.map(r => r.category).filter(Boolean)));
            let sampleEntries: { url: string, category: string }[] = [];
            
            categories.forEach(cat => {
                const catRows = uniqueRows.filter(r => r.category === cat);
                // Group by structural "fingerprint" (depth and first segments) to ensure diversity
                const groups = new Map<string, typeof catRows>();
                
                catRows.forEach(row => {
                    try {
                        const parsed = new URL(row.url);
                        const segments = parsed.pathname.split('/').filter(Boolean);
                        // Fingerprint includes depth, first segments, presence of numbers, dash count, and rough length
                        const hasDigits = /\d/.test(parsed.pathname) ? 'num' : 'alpha';
                        const dashCount = (parsed.pathname.match(/-/g) || []).length;
                        const dashBucket = Math.min(Math.floor(dashCount / 2), 3); // Bucket by pairs, max 3
                        const totalCharCount = segments.join('').length;
                        const lengthBucket = Math.floor(totalCharCount / 10); // Bucket by 10 chars
                        
                        const fingerprint = `${segments.length}:${segments.slice(0, 1).join('/')}:${hasDigits}:${dashBucket}:${lengthBucket}`;
                        
                        if (!groups.has(fingerprint)) groups.set(fingerprint, []);
                        // @ts-ignore
                        groups.get(fingerprint).push(row);
                    } catch (e) {
                        if (!groups.has('root')) groups.set('root', []);
                        // @ts-ignore
                        groups.get('root').push(row);
                    }
                });

                // Pick samples from each structural group
                groups.forEach(groupRows => {
                    // Take 5 from each group for higher sample density
                    sampleEntries = [...sampleEntries, ...groupRows.slice(0, 5).map(r => ({ url: r.url, category: cat }))];
                });
            });

            // Limit total sample to ensure AI performance
            sampleEntries = sampleEntries.slice(0, 1000);

            if (sampleEntries.length > 0) {
                // Show a non-blocking toast or just let the user know we're analyzing
                const result = await analyzeManualUrlsAction(sampleEntries);
                if (result.success && result.proposedRules) {
                    const currentRules = [...(activeProject.architecture_rules || [])];
                    const existingNames = new Set(currentRules.map(r => r.name.toLowerCase()));
                    
                    let addedAny = false;
                    result.proposedRules.forEach((suggested: any) => {
                        if (!existingNames.has(suggested.name.toLowerCase())) {
                            currentRules.push(suggested);
                            addedAny = true;
                        }
                    });

                    if (addedAny) {
                        setEditArchitectureRules(currentRules);
                        await updateProject(activeProject.id, { architecture_rules: currentRules });
                    }

                    // Update Stats for Console
                    let urlsPerCategoryStats: Record<string, number> = {};
                    categories.forEach(cat => {
                        urlsPerCategoryStats[cat] = sampleEntries.filter(e => e.category === cat).length;
                    });

                    setSamplingStats({
                        totalUrls: uniqueRows.length,
                        totalSample: sampleEntries.length,
                        categoriesCount: categories.length,
                        urlsPerCategory: urlsPerCategoryStats,
                        timestamp: new Date().toLocaleTimeString()
                    });
                }
            }

            alert(`Se han cargado/actualizado ${uniqueRows.length} URLs únicas en el inventario.`);
        } catch (error: any) {
            alert("Error al procesar el CSV: " + error.message);
        } finally {
            setIsSaving(false);
            if (e.target) e.target.value = "";
        }
    };

    const handleCreate = async () => {
        if (!newProjectDomain) return;

        const derivedName = getProjectNameFromDomain(newProjectDomain);
        const faviconUrl = getFaviconUrl(newProjectDomain);

        const newProject = await createProject({
            name: derivedName,
            domain: newProjectDomain,

            scraper_settings: { paths: ["/"] },
            gsc_connected: false,
            ga4_connected: false,
            logo_url: faviconUrl
        });

        if (newProject) {
            setLastCreatedProjectId(newProject.id);
        }
        
        setNewProjectName("");
        setNewProjectDomain("");
        setIsCreating(false);
        setShowSuccessModal(true);
    };

    const handleCreateTeam = async () => {
        if (!newTeamName) return;
        setIsSaving(true);
        try {
            await createTeam(newTeamName);
            setNewTeamName("");
            setIsCreatingTeam(false);
            alert("Equipo creado correctamente.");
        } catch (e: any) {
            alert("Error al crear equipo: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-[#F5F7FA] text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900 transition-colors duration-500">
            <NavigationHeader />

            <main className="relative z-10 pt-32 pb-20 px-6 md:px-12 max-w-[1200px] mx-auto">

                <header className="mb-12">
                    <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-cyan-600 uppercase font-mono">
                        <SettingsIcon size={14} />
                        Centro de Control
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none mt-2 py-4">
                        {activeTab === 'projects' 
                            ? (activeProject?.name || "Proyectos") 
                            : activeTab === 'team' 
                                ? (activeTeam?.name || "Equipo")
                                : "Integraciones"} 
                        <span className="text-slate-400 px-2 leading-relaxed inline-block">Settings</span>
                    </h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Nav */}
                    <aside className="space-y-4">
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-4">Secciones</h3>
                            <nav className="space-y-1">
                                {[
                                    { id: 'projects', icon: Globe, label: "Proyectos & Dominios" },
                                    { id: 'team', icon: Shield, label: "Equipo y Proveedores" },
                                    { id: 'integrations', icon: Shield, label: "Integraciones API" },
                                    { id: 'billing', icon: Wallet, label: "Presupuesto" },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => item.id !== 'billing' && setActiveTab(item.id as any)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                                            activeTab === item.id
                                                ? "bg-[var(--color-nous-mist)]/20 text-slate-800 shadow-sm border border-[var(--color-nous-mist)]/30"
                                                : "text-slate-500 hover:bg-slate-50 border border-transparent",
                                            item.id === 'billing' && "opacity-40 cursor-not-allowed"
                                        )}
                                    >
                                        <item.icon size={16} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Quick Project Switcher - Only visible on projects tab */}
                        {activeTab === 'projects' && (
                            <div className="bg-white/60 backdrop-blur-md border border-[var(--color-nous-mist)]/30 text-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                                <div className="relative z-10">
                                    <h3 className="text-[10px] font-black text-[var(--color-nous-mist)] uppercase tracking-widest mb-4">Proyecto Seleccionado</h3>
                                    <div className="space-y-3">
                                        {projects.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No hay proyectos creados.</p>
                                        ) : (
                                            projects.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setActiveProject(p.id)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                                                        activeProject?.id === p.id
                                                            ? "bg-[var(--color-nous-mist)]/10 border-[var(--color-nous-mist)]/20 text-slate-800"
                                                            : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 truncate pr-4">
                                                        <div 
                                                            className="w-2 h-2 rounded-full shrink-0" 
                                                            style={{ backgroundColor: p.color || '#06b6d4' }} 
                                                        />
                                                        <span className="text-xs font-bold truncate">{p.name}</span>
                                                    </div>
                                                    {p.gsc_connected && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-nous-mist)] shadow-[0_0_8px_var(--color-nous-mist)]" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />
                            </div>
                        )}

                        {activeTab === 'team' && (
                            <div className="bg-white/60 backdrop-blur-md border border-cyan-100/30 text-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                                <div className="relative z-10">
                                    <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-4">Agencia / Equipo Activo</h3>
                                    <div className="space-y-3">
                                        {teams.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No tienes equipos creados.</p>
                                        ) : (
                                            teams.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setActiveTeam(t.id)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                                                        activeTeam?.id === t.id
                                                            ? "bg-cyan-500/10 border-cyan-500/20 text-slate-800"
                                                            : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50"
                                                    )}
                                                >
                                                    <span className="text-xs font-bold truncate pr-4">{t.name}</span>
                                                    {activeTeam?.id === t.id && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_cyan]" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all" />
                            </div>
                        )}
                    </aside>

                    {/* Main Settings Area */}
                    <div className="col-span-2 space-y-8">
                        {activeTab === 'projects' && (
                            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-center mb-8 relative z-10">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Editar Proyecto</h2>
                                        <p className="text-xs text-slate-400 font-medium italic">Configura la identidad y acceso de tu sitio.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="px-5 py-2.5 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-nous-mist)]/10 hover:text-[var(--color-nous-mist)] transition-all flex items-center gap-2 border border-slate-200"
                                    >
                                        <Plus size={14} /> Nuevo Proyecto
                                    </button>
                                </div>

                                {isCreating && (
                                    <div className="mb-8 p-8 bg-slate-50 rounded-3xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
                                        <h3 className="text-xs font-black mb-6 uppercase tracking-widest text-slate-900">Crear Nuevo Nodo</h3>
                                        <div className="grid grid-cols-1 gap-6 mb-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dominio / URL Raíz</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: sitio.com"
                                                    className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 ring-cyan-500/10 outline-none transition-all"
                                                    value={newProjectDomain}
                                                    onChange={(e) => setNewProjectDomain(e.target.value)}
                                                />
                                                <p className="text-[9px] text-slate-400 font-medium ml-1 italic">
                                                    Nous extraerá el nombre y el logo automáticamente a partir del dominio.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => setIsCreating(false)} className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800">Cancelar</button>
                                            <button onClick={handleCreate} className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-600 shadow-xl shadow-cyan-500/20 transition-all">Crear Proyecto</button>
                                        </div>
                                    </div>
                                )}

                                {activeProject ? (
                                    <div className="space-y-8 animate-in fade-in duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador Público</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 ring-slate-100 transition-all"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dominio / URL Raíz</label>
                                                <input
                                                    type="text"
                                                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 ring-slate-100 transition-all font-mono"
                                                    value={editDomain}
                                                    onChange={(e) => setEditDomain(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País Objetivo (SERP)</label>
                                                <select
                                                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 ring-slate-100 transition-all appearance-none cursor-pointer"
                                                    value={editTargetCountry}
                                                    onChange={(e) => setEditTargetCountry(e.target.value)}
                                                >
                                                    <option value="ES">España (ES)</option>
                                                    <option value="MX">México (MX)</option>
                                                    <option value="AR">Argentina (AR)</option>
                                                    <option value="CO">Colombia (CO)</option>
                                                    <option value="CL">Chile (CL)</option>
                                                    <option value="US">Estados Unidos (US)</option>
                                                    <option value="VE">Venezuela (VE)</option>
                                                    <option value="PE">Perú (PE)</option>
                                                    <option value="EC">Ecuador (EC)</option>
                                                </select>
                                                <p className="text-[9px] text-slate-400 font-medium ml-1">Determina los resultados de Google analizados.</p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agencia / Equipo</label>
                                                <select
                                                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 ring-slate-100 transition-all appearance-none cursor-pointer"
                                                    value={newTeamId || activeProject?.team_id || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setNewTeamId(val);
                                                        // Auto-save team change if we want, or just let handleSave do it
                                                    }}
                                                >
                                                    <option value="">Sin Equipo (Personal)</option>
                                                    {teams.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[9px] text-slate-400 font-medium ml-1">El equipo que gestiona este proyecto.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Color de Identidad</label>
                                            <div className="grid grid-cols-10 gap-2 bg-white p-4 rounded-3xl border border-slate-100 shadow-inner">
                                                {NOUS_PALETTE.map((c) => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setEditColor(c)}
                                                        className={cn(
                                                            "w-full aspect-square rounded-lg border-2 transition-all",
                                                            editColor === c ? "border-slate-900 scale-110 shadow-lg" : "border-transparent hover:scale-105"
                                                        )}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-medium ml-1 italic">
                                                Este color identificará visualmente al proyecto en el tablero, calendarios y reportes.
                                            </p>
                                        </div>

                                        {/* Logo Upload Section */}
                                        <div className="space-y-4 p-8 rounded-3xl border border-slate-100 bg-slate-50/50">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                    <Plus size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Identidad Visual</h3>
                                                    <p className="text-[10px] text-slate-500 font-medium tracking-tight">Sube el logo de tu marca para las imágenes generadas.</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="w-24 h-24 rounded-3xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center overflow-hidden relative group">
                                                    {editLogoUrl ? (
                                                        <>
                                                            <img src={editLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                                                            <button
                                                                onClick={() => setEditLogoUrl("")}
                                                                className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 size={24} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="text-slate-300">
                                                            <Globe size={32} className="opacity-20" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <input
                                                        type="file"
                                                        id="logo-upload"
                                                        className="hidden"
                                                        accept="image/png,image/webp"
                                                        onChange={handleLogoUpload}
                                                    />
                                                    <label
                                                        htmlFor="logo-upload"
                                                        className={cn(
                                                            "inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-50 transition-all shadow-sm",
                                                            isUploadingLogo && "opacity-50 pointer-events-none"
                                                        )}
                                                    >
                                                        {isUploadingLogo ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                                                        {editLogoUrl ? "Cambiar Logo" : "Subir Logo PNG"}
                                                    </label>
                                                    <p className="text-[9px] text-slate-400">Recomendado: PNG Transparente o WebP. Tamaño sugerido 400x400px.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Google Integrations Group */}
                                        <div className={cn(
                                            "p-8 rounded-[32px] border transition-all duration-700 relative overflow-hidden",
                                            isUserGscConnected ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100"
                                        )}>
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <div className="text-[8px] font-black text-cyan-500 uppercase tracking-tighter opacity-50 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">GSC v2.0</div>
                                                <div className="text-[8px] font-black text-amber-500 uppercase tracking-tighter opacity-50 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">GA4 v2.0</div>
                                            </div>

                                            <div className="flex items-center justify-between mb-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10">
                                                        <Globe size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Google Search & Analytics</h3>
                                                        <p className="text-[10px] text-slate-500 font-medium tracking-tight">Vincular con Google Ecosistema v2.0</p>
                                                    </div>
                                                </div>

                                                {/* MASTER SYNC BUTTON */}
                                                {isUserGscConnected && activeProject?.gsc_site_url && (
                                                    <button 
                                                        onClick={handleSyncGscInventory}
                                                        disabled={isSyncingGsc}
                                                        className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 border border-white/10 disabled:opacity-50"
                                                    >
                                                        {isSyncingGsc ? (
                                                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                                                        ) : (
                                                            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500 text-cyan-400" />
                                                        )}
                                                        <span>{isSyncingGsc ? "Procesando Nodos..." : "Sincronizar Datos SEO (GSC + GA4)"}</span>
                                                    </button>
                                                )}
                                            </div>

                                            {!isUserGscConnected ? (
                                                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-[24px] bg-white/50">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-6">Para empezar, vincula tu cuenta de Google en la pestaña de Integraciones</p>
                                                    <button 
                                                        onClick={() => setActiveTab('integrations')} 
                                                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-600 transition-all shadow-lg"
                                                    >
                                                        Ir a Integraciones
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    {/* GSC Column */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                                                                    <Globe size={14} />
                                                                </div>
                                                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Search Console</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => window.location.href = '/api/auth/gsc/login'}
                                                                className="text-[9px] font-black text-cyan-600 uppercase hover:underline flex items-center gap-1 bg-cyan-50 px-2 py-1 rounded-lg border border-cyan-100 transition-all hover:bg-cyan-100"
                                                            >
                                                                <Plus size={10} /> Vincular Cuenta
                                                            </button>
                                                        </div>
                                                        <div className="relative">
                                                            <select
                                                                value={activeProject.gsc_site_url || ''}
                                                                onChange={(e) => handleUpdateGscSite(e.target.value)}
                                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-4 ring-cyan-500/10 transition-all appearance-none cursor-pointer pr-10"
                                                                disabled={isLoadingSites}
                                                            >
                                                                <option value="">Selecciona Propiedad...</option>
                                                                {gscSites.map(site => (
                                                                    <option key={site.url} value={site.url}>{site.url}</option>
                                                                ))}
                                                            </select>
                                                            {isLoadingSites && (
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                                    <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        {activeProject.gsc_site_url && (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 w-fit mt-2">
                                                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-[8px] font-black uppercase tracking-tighter">Nodo GSC Activo</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* GA4 Column */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                                                    <BarChart3 size={14} />
                                                                </div>
                                                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">GA4 Property</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => window.location.href = '/api/auth/gsc/login'}
                                                                className="text-[9px] font-black text-amber-600 uppercase hover:underline flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 transition-all hover:bg-amber-100"
                                                            >
                                                                <Plus size={10} /> Vincular Cuenta
                                                            </button>
                                                        </div>
                                                        <div className="relative">
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={activeProject.ga4_property_id || ''}
                                                                    onChange={(e) => handleUpdateGa4Property(e.target.value)}
                                                                    className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-4 ring-amber-500/10 transition-all appearance-none cursor-pointer pr-10"
                                                                    disabled={isLoadingGa4}
                                                                >
                                                                    <option value="">Selecciona Propiedad...</option>
                                                                    {ga4Properties.map(prop => (
                                                                        <option key={prop.id} value={prop.id}>{prop.name}</option>
                                                                    ))}
                                                                </select>
                                                                <button 
                                                                    onClick={fetchGa4Sites}
                                                                    disabled={isLoadingGa4}
                                                                    className="p-4 bg-white border border-slate-100 rounded-2xl text-amber-500 hover:bg-amber-50 transition-all shadow-sm flex items-center justify-center"
                                                                    title="Refrescar Propiedades"
                                                                >
                                                                    <RefreshCw size={14} className={isLoadingGa4 ? "animate-spin" : ""} />
                                                                </button>
                                                            </div>
                                                            {ga4Properties.length === 0 && !isLoadingGa4 && isUserGscConnected && (
                                                                <p className="mt-2 text-[9px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-1.5 font-bold animate-fadeIn">
                                                                    <RefreshCw size={10} className="animate-spin" /> No se detectan propiedades. Revisa si la "Analytics Admin API" está activa en Google Cloud.
                                                                </p>
                                                            )}
                                                            {isLoadingGa4 && (
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        {activeProject.ga4_property_id && (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 w-fit">
                                                                <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                                                <span className="text-[8px] font-black uppercase tracking-tighter">Nodo GA4 Activo</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>



                                        <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50/30 space-y-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                    <Globe size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">WordPress Bridge</h3>
                                                    <p className="text-[10px] text-slate-500 font-medium tracking-tight">Conecta este proyecto con el plugin Nous Bridge en WordPress.</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL del Sitio WP</label>
                                                    <input
                                                        type="text"
                                                        placeholder="https://tusitio.com"
                                                        className="w-full p-4 rounded-xl border border-slate-100 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-4 ring-indigo-500/10 transition-all font-mono"
                                                        value={editWpUrl}
                                                        onChange={(e) => setEditWpUrl(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Token de Seguridad</label>
                                                    <input
                                                        type="password"
                                                        placeholder="••••••••••••"
                                                        className="w-full p-4 rounded-xl border border-slate-100 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-4 ring-indigo-500/10 transition-all font-mono"
                                                        value={editWpToken}
                                                        onChange={(e) => setEditWpToken(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-slate-400 bg-white/50 p-3 rounded-xl border border-dashed border-slate-200">
                                                Tip: Instala el plugin <strong>Nous Bridge</strong> en tu WordPress y copia el token configurado allí para permitir la publicación automática.
                                            </p>
                                        </div>

                                        {/* Smart Architecture & Internal Linking Section */}
                                        <div className="p-8 rounded-[40px] border border-slate-100 bg-white shadow-sm space-y-8">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                                        <Search size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Smart Architecture & Internal Linking</h3>
                                                        <p className="text-[10px] text-slate-500 font-medium tracking-tight">Define la estructura estratégica de tu sitio para el enlazado automático.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrucciones de Enlazado (IA)</label>
                                                    <textarea
                                                        placeholder="Ej: Prioriza siempre productos de temporada sobre el blog. No enlaces a páginas de agradecimiento..."
                                                        className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 ring-cyan-500/10 transition-all min-h-[100px]"
                                                        value={editArchitectureInstructions}
                                                        onChange={(e) => setEditArchitectureInstructions(e.target.value)}
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reglas de Arquitectura (Regex)</label>
                                                        <button 
                                                            onClick={handleRegenerateRegex}
                                                            disabled={isSaving}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
                                                        >
                                                            {isSaving ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                                                            Detectar con IA
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-tighter">
                                                                <tr>
                                                                    <th className="px-4 py-3 rounded-l-xl">Categoría / Silo</th>
                                                                    <th className="px-4 py-3">Regex Match</th>
                                                                    <th className="px-4 py-3 rounded-r-xl"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {editArchitectureRules.map((rule, idx) => (
                                                                    <tr key={idx} className="group">
                                                                        <td className="px-4 py-3 font-bold text-slate-700">{rule.name}</td>
                                                                        <td className="px-4 py-3 font-mono text-slate-400">{rule.regex}</td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newRules = [...editArchitectureRules];
                                                                                    newRules.splice(idx, 1);
                                                                                    setEditArchitectureRules(newRules);
                                                                                }}
                                                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                <tr className="bg-cyan-50/30">
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Ej: Productos Lujo"
                                                                            className="w-full p-2 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"
                                                                            value={newRuleName}
                                                                            onChange={(e) => setNewRuleName(e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Ej: /productos/marcas/.*"
                                                                            className="w-full p-2 bg-white border border-slate-100 rounded-lg text-[10px] font-mono outline-none"
                                                                            value={newRuleRegex}
                                                                            onChange={(e) => setNewRuleRegex(e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2 text-right">
                                                                        <button
                                                                            onClick={() => {
                                                                                if (!newRuleName || !newRuleRegex) return;
                                                                                setEditArchitectureRules([...editArchitectureRules, { name: newRuleName, regex: newRuleRegex }]);
                                                                                setNewRuleName("");
                                                                                setNewRuleRegex("");
                                                                            }}
                                                                            className="p-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all"
                                                                        >
                                                                            <Plus size={14} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>

                                                        {/* Mini Consola de Estado */}
                                                        {samplingStats && (
                                                            <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden animate-in zoom-in duration-300">
                                                                <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                                                                    <Terminal size={14} className="text-emerald-400" />
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Análisis de Estructura (Nodos IA)</span>
                                                                    <div className="ml-auto text-[8px] font-mono text-emerald-500/50">Last Update: {samplingStats.timestamp}</div>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-4 mb-4">
                                                                    <div className="space-y-1">
                                                                        <div className="text-[8px] text-slate-500 uppercase font-bold">Inventario</div>
                                                                        <div className="text-xs font-mono text-white flex items-center gap-2">
                                                                            <Database size={10} className="text-cyan-400" /> {samplingStats.totalUrls.toLocaleString()} <span className="text-[9px] text-slate-500">URLs</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[8px] text-slate-500 uppercase font-bold">Muestra IA</div>
                                                                        <div className="text-xs font-mono text-white flex items-center gap-2">
                                                                            <Zap size={10} className="text-amber-400" /> {samplingStats.totalSample} <span className="text-[9px] text-slate-500">Nodos</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[8px] text-slate-500 uppercase font-bold">Arquitectura</div>
                                                                        <div className="text-xs font-mono text-white flex items-center gap-2">
                                                                            <ListFilter size={10} className="text-indigo-400" /> {samplingStats.categoriesCount} <span className="text-[9px] text-slate-500">Silos</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                                                                    {Object.entries(samplingStats.urlsPerCategory).map(([cat, count]) => (
                                                                        <div key={cat} className="flex items-center justify-between text-[9px] font-mono group">
                                                                            <span className="text-slate-400 group-hover:text-cyan-300 transition-colors">[{cat}] tokens_analyzed...</span>
                                                                            <span className="text-emerald-400">{count} urls</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-50">
                                                <div className="flex items-center justify-between bg-slate-50 p-6 rounded-[32px] border border-dashed border-slate-200">
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-900 uppercase italic tracking-tight mb-1">Carga de Inventario (CSV)</h4>
                                                        <p className="text-[9px] text-slate-500 font-medium">Sube un CSV con columnas 'url' y 'categoria' para poblar el mapa de enlazado.</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="file"
                                                            id="csv-inventory-upload"
                                                            className="hidden"
                                                            accept=".csv"
                                                            onChange={handleCsvInventoryUpload}
                                                        />
                                                        <label
                                                            htmlFor="csv-inventory-upload"
                                                            className={cn(
                                                                "px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-cyan-500 hover:text-white transition-all shadow-sm",
                                                                isSaving && "opacity-50 pointer-events-none"
                                                            )}
                                                        >
                                                            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} className="inline mr-2" />}
                                                            Subir CSV Inventario
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-slate-50 pt-8">
                                            <button
                                                onClick={() => handleDelete(activeProject.id, activeProject.name)}
                                                className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} /> Eliminar Proyecto
                                            </button>
                                            <button
                                                onClick={handleSaveAll}
                                                disabled={isSaving}
                                                className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                                Guardar Configuración
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                                        <Globe size={48} className="mb-4 opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Selecciona un proyecto para configurar</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'team' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center mb-2 px-4">
                                    <div>
                                        <h2 className="text-sm font-black text-slate-800 uppercase italic tracking-wider">Gestión de Equipos</h2>
                                        <p className="text-[10px] text-slate-400 font-medium">Crea o selecciona un equipo para gestionar colaboradores.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsCreatingTeam(true)}
                                        className="px-4 py-2 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-50 hover:text-cyan-600 transition-all flex items-center gap-2 border border-slate-200"
                                    >
                                        <Plus size={14} /> Nuevo Equipo
                                    </button>
                                </div>

                                {isCreatingTeam && (
                                    <div className="p-8 bg-white rounded-[32px] border border-cyan-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                                        <h3 className="text-xs font-black mb-6 uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                            <Shield size={16} className="text-cyan-500" /> Registrar Nueva Agencia / Equipo
                                        </h3>
                                        <div className="space-y-4 mb-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Equipo</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Mi Agencia Creativa"
                                                    className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold focus:bg-white focus:ring-4 ring-cyan-500/10 outline-none transition-all"
                                                    value={newTeamName}
                                                    onChange={(e) => setNewTeamName(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => setIsCreatingTeam(false)} className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800">Cancelar</button>
                                            <button 
                                                onClick={handleCreateTeam} 
                                                disabled={isSaving || !newTeamName}
                                                className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-600 shadow-xl shadow-cyan-500/20 transition-all disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 className="animate-spin" size={14} /> : "Crear Equipo"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <TeamSettings teamId={activeTeam?.id || ''} />
                            </div>
                        )}

                        {activeTab === 'integrations' && (
                            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                                <header className="mb-8">
                                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Integraciones Neurales</h2>
                                    <p className="text-xs text-slate-400 font-medium italic">Gestiona tus conexiones externas de forma global.</p>
                                </header>

                                <div className="space-y-6">
                                    {/* Google Search Console - Global Connection */}
                                    <div className={cn(
                                        "p-8 rounded-[32px] border transition-all duration-700 relative overflow-hidden",
                                        isUserGscConnected ? "bg-emerald-50/20 border-emerald-100" : "bg-slate-50 border-slate-100"
                                    )}>
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex gap-5">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg",
                                                    isUserGscConnected ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-white text-slate-300"
                                                )}>
                                                    <Globe size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-900 uppercase italic leading-none mb-2">Google Search Console</h3>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", isUserGscConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                            {isUserGscConnected ? `${connectedAccounts.length} Cuenta(s) Conectada(s)` : "Sin Vincular"}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-3 max-w-sm">Permite que Simon SEO acceda a tus métricas de tráfico y rendimiento directamente desde Google.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => window.location.href = '/api/auth/gsc/login'}
                                                className={cn(
                                                    "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm",
                                                    isUserGscConnected
                                                        ? "bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 shadow-emerald-100/10"
                                                        : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                                                )}
                                            >
                                                {isUserGscConnected ? "Agregar Otra Cuenta" : "Vincular Ahora"}
                                            </button>
                                        </div>
                                        {/* Background Decor */}
                                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                                    </div>

                                    {/* Google Analytics 4 - Global Connection */}
                                    <div className={cn(
                                        "p-8 rounded-[32px] border transition-all duration-700 relative overflow-hidden",
                                        isUserGscConnected ? "bg-amber-50/20 border-amber-100" : "bg-slate-50 border-slate-100"
                                    )}>
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex gap-5">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg",
                                                    isUserGscConnected ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-white text-slate-300"
                                                )}>
                                                    <BarChart3 size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase italic leading-none mb-2 tracking-tight">Google Analytics 4</h3>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("w-2 h-2 rounded-full", isUserGscConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                            {isUserGscConnected ? `${connectedAccounts.length} CUENTA(S) CONECTADA(S)` : "Sin Configurar"}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-2 max-w-sm font-medium tracking-tight">Analiza el tráfico, rebote y fuentes de tus proyectos vinculando propiedades de GA4.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => window.location.href = '/api/auth/gsc/login'}
                                                className={cn(
                                                    "px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm",
                                                    isUserGscConnected
                                                        ? "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                        : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                                                )}
                                            >
                                                {isUserGscConnected ? "Agregar Otra Cuenta" : "Vincular Google"}
                                            </button>
                                        </div>
                                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />
                                    </div>

                                    {/* Connected Accounts List */}
                                    {connectedAccounts.length > 0 && (
                                        <div className="mt-12">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-2">Cuentas de Google Vinculadas</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {connectedAccounts.map((account) => (
                                                    <div key={account.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                                <Globe size={14} />
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">{account.email || "Cuenta de Google"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100/50 px-2 py-1 rounded-full">Activa</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Placeholder for future integrations */}
                                    <div className="p-8 rounded-[32px] border border-slate-50 bg-slate-50 opacity-40 grayscale pointer-events-none">
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-5">
                                                <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-sm text-slate-200">
                                                    <Shield size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-300 uppercase italic leading-none mb-2">Claude / OpenAI</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Próximamente</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 p-10 max-w-sm w-full text-center animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                            <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                                <Plus size={40} className="rotate-45" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-tight mb-2">¡Nodo Activado!</h2>
                            <p className="text-sm text-slate-500 font-medium mb-8">El proyecto se ha creado correctamente. ¿Quieres configurar los detalles ahora?</p>
                            
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        if (lastCreatedProjectId) {
                                            setActiveProject(lastCreatedProjectId);
                                            setActiveTab('projects');
                                        }
                                        setShowSuccessModal(false);
                                    }}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-600 transition-all shadow-lg"
                                >
                                    Configurar Ahora
                                </button>
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 hover:text-slate-600 transition-all"
                                >
                                    Quizás más tarde
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
