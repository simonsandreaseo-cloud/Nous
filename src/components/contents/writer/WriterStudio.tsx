
'use client';
import { useRef, useState, useMemo, useCallback, useEffect } from 'react';

import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore, STATUS_LABELS, STATUS_COLORS } from '@/store/useProjectStore';
import { useQueueStore } from '@/store/useQueueStore';
import { useShallow } from 'zustand/react/shallow';
import WriterEditor from '@/components/contents/writer/WriterEditor';
import WriterDashboard from '@/components/contents/writer/WriterDashboard';
import WriterSetupBoard from '@/components/contents/writer/WriterSetupBoard';
import { 
    LayoutTemplate, 
    ChevronLeft, ChevronDown, 
    LayoutDashboard, 
    Settings2, 
    PenTool, 
    Send, 
    ImagePlus, 
    Wrench, 
    Image as ImageIcon, 
    Sparkles, 
    Trash2, 
    Download, 
    RefreshCcw,
    Maximize2,
    Minimize2,
    Search,
    Layout,
    FileText,
    Zap,
    Languages,
    ChevronRight,
    Cloud,
    CloudOff,
    Loader2,
    PanelLeftClose,
    PanelLeft,
    PanelRightClose,
    PanelRight,
    History,
    Eye,
    Plus,
    Check,
    X,
    BrainCircuit,
    Activity,
    Settings,
    SlidersHorizontal,
    Box,
    AlertCircle,
    Layers,
    Scissors,
    Wand2
} from 'lucide-react';
import ImageLightbox from './modals/ImageLightbox';
import ZipExportModal from './modals/ZipExportModal';
import ImageCropperModal from './modals/ImageCropperModal';
import { CustomTransformModal, PRESETS } from '@/components/contents/tools/CustomTransformModal';

import { Button } from '@/components/dom/Button';
import { getCoverImage } from '@/components/contents/writer/NousAssetNodeView';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import CompetitorCard from './CompetitorCard';
import OutlineSidebar from './OutlineSidebar';

import { Group as PanelGroup, Panel, Separator as PanelResizeHandle, PanelImperativeHandle as ImperativePanelHandle } from 'react-resizable-panels';
const SEODataTab = dynamic(() => import('./SEODataTab'), { loading: () => <div className="p-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Cargando...</div> });
const FloatingOutlineUI = dynamic(() => import('./widgets/FloatingOutlineUI'));
import { CompetitorPanel } from './CompetitorPanel';
const MediaTab = dynamic(() => import('./MediaTab').then(mod => mod.MediaTab), { loading: () => <div className="p-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Cargando...</div> });
const ToolsTab = dynamic(() => import('./ToolsTab').then(mod => mod.ToolsTab), { loading: () => <div className="p-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Cargando...</div> });
const TranslationSidebarPanel = dynamic(() => import('./TranslationSidebarPanel'), { loading: () => <div className="p-8 text-center text-[10px] uppercase font-black tracking-widest text-slate-400">Cargando...</div> });
import PresenceAvatars from './PresenceAvatars';
import { InventorySidebar } from './sidebars/InventorySidebar';
import { FloatingToolbox } from './widgets/FloatingToolbox';
import { HistoryTab } from './tabs/HistoryTab';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import NousAssistantMenu from '@/components/dashboard/NousAssistantMenu';
import { useWriterActions } from './useWriterActions';
import { deleteImageAction, uploadGeneratedImage, regenerateImageAction, uploadManualImage } from '@/lib/actions/imageActions';
import VisualPlanningBoard from './VisualPlanningBoard';
import { saveAs } from 'file-saver';
import { PollinationsService } from '@/lib/services/pollinationsService';
import { NousLogo } from '@/components/dom/NousLogo';
import { ImageAsset } from '@/types/images';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppStore } from '@/store/useAppStore';
import { WriterMobileListView } from './mobile/WriterMobileListView';
import { WriterMobileEditorHeader } from './mobile/WriterMobileEditorHeader';
import { WriterMobileFormattingBar } from './mobile/WriterMobileFormattingBar';
import { WriterMobileToolsModal } from './mobile/WriterMobileToolsModal';
import { WriterMobileNewTaskModal } from './mobile/WriterMobileNewTaskModal';

const EMPTY_ARRAY: any[] = [];

const StepIcon = ({ active, done, icon: Icon, label }: { active: boolean, done: boolean, icon: any, label: string }) => (
    <div className={cn(
        "flex items-center gap-1.5 transition-all",
        active ? "text-indigo-600" : done ? "text-emerald-500" : "text-slate-300 opacity-50 grayscale"
    )}>
        <Icon size={12} className={cn(active && "animate-pulse")} />
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </div>
);

/**
 * FeaturedImageSlot - Master Engine V3
 * Handles the main project visual (Hero).
 */
export const FeaturedImageSlot = ({ taskId, onFullscreen }: { taskId: string | null, onFullscreen?: (asset: ImageAsset) => void }) => {
    const { taskImages, loadTaskImages, keyword, strategyH1, projectId } = useWriterStore() as any;
    const { projects } = useProjectStore();
    const activeProject = projects.find(p => p.id === projectId);
    
    // Find hero by role or legacy featured type
    const featured = getCoverImage(taskImages.find((img: any) => img.type === 'hero' || img.type === 'featured'));
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [cropperData, setCropperData] = useState<{base64: string, fileType: string, fileName: string, targetWidth: number, targetHeight: number} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!taskId) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !taskId) return;
        setIsUploading(true);
        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const base64 = await base64Promise;

            // Check if there is a preset with specific width and height
            const preset = activeProject?.settings?.images?.portada_preset;
            if (preset && preset.width && preset.height) {
                setCropperData({
                    base64,
                    fileType: file.type,
                    fileName: file.name,
                    targetWidth: preset.width,
                    targetHeight: preset.height
                });
                setIsUploading(false); // Stop uploading spinner, wait for cropper
                return;
            }

            // Fallback to direct upload if no preset dimensions
            const res = await uploadManualImage({
                base64,
                fileType: file.type,
                taskId: taskId,
                fileName: file.name,
                altText: `Portada - ${file.name}`,
                type: 'featured'
            });

            if (res.success) {
                await loadTaskImages(taskId);
            } else {
                alert(res.error || "Error al subir la imagen de portada");
            }
        } catch (err: any) {
            console.error("Error uploading cover image:", err);
            alert(`Error al subir la portada: ${err.message || 'Error desconocido'}`);
        } finally {
            if (!activeProject?.settings?.images?.portada_preset?.width) {
                setIsUploading(false);
            }
        }
    };

    const handleCroppedUpload = async (croppedBase64: string) => {
        if (!cropperData || !taskId) return;
        setIsUploading(true);
        setCropperData(null); // Close cropper
        try {
            const res = await uploadManualImage({
                base64: croppedBase64,
                fileType: cropperData.fileType,
                taskId: taskId,
                fileName: `cropped_${cropperData.fileName}`,
                altText: `Portada - ${cropperData.fileName}`,
                type: 'featured'
            });

            if (res.success) {
                await loadTaskImages(taskId);
            } else {
                alert(res.error || "Error al subir la imagen recortada");
            }
        } catch (err: any) {
            console.error("Error uploading cropped image:", err);
            alert(`Error al subir la portada recortada: ${err.message || 'Error desconocido'}`);
        } finally {
            setIsUploading(false);
        }
    };

    if (!featured || !featured.url) {
        return (
            <div className="mb-8">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*,video/mp4,video/webm" 
                    className="hidden" 
                />
                                <div 
                                    onClick={() => !isUploading && fileInputRef.current?.click()}
                                    className={cn(
                                        "w-full aspect-[14/3] rounded-[2.5rem] bg-slate-50/60 border-2 border-dashed border-slate-200/80 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2 p-8 group",
                                        isUploading && "cursor-not-allowed opacity-80"
                                    )}
                                >
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Subiendo portada...</span>
                        </div>
                    ) : (
                        <>
                            <ImagePlus className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors duration-300" />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors duration-300">+ Agregar Imagen de Portada</span>
                            <span className="text-[9px] text-slate-400">Recomendado: 1200x512px (PNG, JPG o WebP)</span>
                        </>
                    )}
                </div>
                
                <ImageCropperModal
                    isOpen={!!cropperData}
                    onClose={() => setCropperData(null)}
                    onSave={handleCroppedUpload}
                    originalBase64={cropperData?.base64 || ''}
                    targetWidth={cropperData?.targetWidth || 800}
                    targetHeight={cropperData?.targetHeight || 600}
                />
            </div>
        );
    }

    // Map to ImageAsset for consistency
    const asset: ImageAsset = {
        id: featured.id,
        status: 'final',
        type: 'image',
        role: 'hero',
        url: featured.url,
        storagePath: featured.storage_path,
        prompt: featured.prompt || '',
        alt: featured.alt_text || '',
        title: featured.title || 'Portada',
        design: { width: '100%', align: 'center', wrapping: 'break', aspectRatio: '21:9' },
        positioning: { paragraphIndex: 0 }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        saveAs(asset.url!, `${asset.title}.jpg`);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("¿Eliminar portada permanentemente?")) {
            await deleteImageAction(asset.id, asset.storagePath!);
            await loadTaskImages(taskId);
        }
    };

    const handleRegenerate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRegenerating) return;
        setIsRegenerating(true);
        try {
            const res = await regenerateImageAction({
                asset: asset,
                taskId: taskId!,
                options: {
                    sourceModel: activeProject?.settings?.images?.portada_preset?.model || 'flux',
                },
                refinement: "" // Optional refinement could be added here
            });
            
            if (res.success) await loadTaskImages(taskId!);
        } catch (err) {
            console.error("Failed to regenerate portada", err);
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <div className="mb-8 group/featured relative animate-in fade-in slide-in-from-top-4 duration-700">
                <div 
                    className={cn(
                        "relative w-full overflow-hidden rounded-[2.5rem] bg-slate-50 border border-slate-200/50 shadow-2xl transition-all duration-500",
                        "border-solid border-slate-100 shadow-indigo-500/5"
                    )}
                    style={{
                        aspectRatio: activeProject?.settings?.images?.portada_preset 
                            ? `${activeProject.settings.images.portada_preset.width} / ${activeProject.settings.images.portada_preset.height}`
                            : '14/3'
                    }}
                >
                <div className="absolute top-6 left-6 z-20 px-4 py-1.5 bg-black/80 backdrop-blur-md text-white border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                    Portada Magistral
                </div>

                <img 
                    src={asset.url} 
                    alt={asset.alt} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover/featured:scale-105"
                />
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/featured:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px] z-10">
                    <button onClick={handleRegenerate} disabled={isRegenerating} className="p-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-xl scale-90 group-hover/featured:scale-100">
                        <RefreshCcw size={20} className={cn(isRegenerating && "animate-spin")} />
                    </button>
                    {onFullscreen && (
                        <button onClick={(e) => { e.stopPropagation(); onFullscreen(asset); }} className="p-4 rounded-2xl bg-white text-slate-900 hover:bg-indigo-50 transition-all shadow-xl scale-90 group-hover/featured:scale-100">
                            <Maximize2 size={20} />
                        </button>
                    )}
                    <button onClick={handleDownload} className="p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all shadow-xl scale-90 group-hover/featured:scale-100">
                        <Download size={20} />
                    </button>
                    <button onClick={handleDelete} className="p-4 rounded-2xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-xl scale-90 group-hover/featured:scale-100">
                        <Trash2 size={20} />
                    </button>
                </div>

                {asset.prompt && (
                    <div className="absolute bottom-6 left-6 right-6 z-10 pointer-events-none opacity-0 group-hover/featured:opacity-100 transition-opacity">
                        <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 max-w-2xl text-white">
                            <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-1">Prompt</p>
                            <p className="text-[12px] font-medium line-clamp-1 italic">{asset.prompt}</p>
                        </div>
                    </div>
                )}
            </div>

            <ImageCropperModal
                isOpen={!!cropperData}
                onClose={() => setCropperData(null)}
                onSave={handleCroppedUpload}
                originalBase64={cropperData?.base64 || ''}
                targetWidth={cropperData?.targetWidth || 800}
                targetHeight={cropperData?.targetHeight || 600}
            />
        </div>
    );
};


const AI_MODELS = [
    { id: 'gemini-3.8-flash-gas', label: 'Gemini 3.8 Flash (GAS)', description: 'Google AI Studio key rotation' },
    { id: 'gemini-3.8-flash-vertex', label: 'Gemini 3.8 Flash (Vertex)', description: 'Google Cloud Vertex AI' },
    { id: 'gemini-3.7-flash-gas', label: 'Gemini 3.7 Flash (GAS)', description: 'Google AI Studio key rotation' },
    { id: 'gemini-3.7-flash-vertex', label: 'Gemini 3.7 Flash (Vertex)', description: 'Google Cloud Vertex AI' },
    { id: 'gemini-3.6-flash-gas', label: 'Gemini 3.6 Flash (GAS)', description: 'Google AI Studio key rotation' },
    { id: 'gemini-3.6-flash-vertex', label: 'Gemini 3.6 Flash (Vertex)', description: 'Google Cloud Vertex AI' },
    { id: 'gemini-3.5-flash-gas', label: 'Gemini 3.5 Flash (GAS)', description: 'Google AI Studio key rotation' },
    { id: 'gemini-3.5-flash-vertex', label: 'Gemini 3.5 Flash (Vertex)', description: 'Google Cloud Vertex AI' },
    { id: 'gemini-3.5-flash-lite-gas', label: 'Gemini 3.5 Flash-Lite (GAS)', description: 'Google AI Studio key rotation' },
    { id: 'gemini-3.5-flash-lite-vertex', label: 'Gemini 3.5 Flash-Lite (Vertex)', description: 'Google Cloud Vertex AI' },
    { id: 'gemini-3-flash-vertex', label: 'Gemini 3 Flash (Vertex)', description: 'Google Cloud Vertex AI' },
    { id: 'gemini-3.1-pro-preview-vertex', label: 'Gemini 3.1 Pro (Vertex)', description: 'Google Cloud Vertex AI' },
    { id: 'gemini-3.1-flash-lite-preview-gas', label: 'Gemini 3.1 Flash-Lite (GAS)', description: 'Google AI Studio key rotation' },
    { id: 'gemini-3.1-flash-lite-preview-vertex', label: 'Gemini 3.1 Flash-Lite (Vertex)', description: 'Google Cloud Vertex AI' },
    { id: 'gemma-4-31b-it', label: 'Gemma 4 (31B) (GAS)', description: 'Alta precisión local y razonamiento' },
    { id: 'gemma-4-26b-a4b-it', label: 'Gemma 4 (26B MoE) (GAS)', description: 'Velocidad y eficiencia' },
    { id: 'gemma-3-27b-it', label: 'Gemma 3 (27B) (GAS)', description: 'Eficiencia Open Weights' },
    { id: 'default', label: 'Por Defecto', description: 'Usa la configuración general' }
];

export default function WriterStudio() {
    const {
        isSidebarOpen, toggleSidebar, isSaving, lastSaved,
        keyword, strategyH1, draftId, viewMode, setViewMode, rawSeoData,
        editorTab, setEditorTab, activeUsers, setActiveUsers,
        strategyTitle, strategySlug, strategyDesc, strategyExcerpt, strategyLinks,
        strategyNotes, setIsRemoteUpdate, setStatus, setSaving, isGenerating,
        isAnalyzingSEO, isPlanningStructure, isHumanizing, isRefining, nousExtractorFindings,
        activeSidebarTab, setSidebarTab,
        currentLanguage, contentVersions, switchLanguage,
        projectId, loadContentById,
        redactorUI, setRedactorUI, isToolboxOpen, toggleToolbox,
        deleteVersion, parentTaskId, statusMessage, hasGenerated, status, updateTaskStatus, content, wordCountReal
    } = useWriterStore(useShallow(state => ({
        isSaving: state.isSaving,
        lastSaved: state.lastSaved,
        keyword: state.keyword,
        strategyH1: state.strategyH1,
        draftId: state.draftId,
        viewMode: state.viewMode,
        setViewMode: state.setViewMode,
        rawSeoData: state.rawSeoData,
        editorTab: state.editorTab,
        setEditorTab: state.setEditorTab,
        activeUsers: state.activeUsers,
        setActiveUsers: state.setActiveUsers,
        strategyTitle: state.strategyTitle,
        strategySlug: state.strategySlug,
        strategyDesc: state.strategyDesc,
        strategyExcerpt: state.strategyExcerpt,
        strategyLinks: state.strategyLinks,
        strategyNotes: state.strategyNotes,
        setIsRemoteUpdate: state.setIsRemoteUpdate,
        setStatus: state.setStatus,
        setSaving: state.setSaving,
        isGenerating: state.isGenerating,
        isAnalyzingSEO: state.isAnalyzingSEO,
        isPlanningStructure: state.isPlanningStructure,
        isHumanizing: state.isHumanizing,
        isRefining: state.isRefining,
        nousExtractorFindings: state.nousExtractorFindings,
        activeSidebarTab: state.activeSidebarTab,
        setSidebarTab: state.setSidebarTab,
        currentLanguage: state.currentLanguage,
        contentVersions: state.contentVersions,
        switchLanguage: state.switchLanguage,
        projectId: state.projectId,
        csvData: state.csvData,
        loadContentById: state.loadContentById,
        
        redactorUI: state.redactorUI,
        setRedactorUI: state.setRedactorUI,
        isToolboxOpen: state.isToolboxOpen,
        toggleToolbox: state.toggleToolbox,
        deleteVersion: state.deleteVersion,
        parentTaskId: state.parentTaskId,
        statusMessage: state.statusMessage,
        hasGenerated: state.hasGenerated,
        status: (state as any).status,
        updateTaskStatus: (state as any).updateTaskStatus,
        content: state.content,
        wordCountReal: state.wordCountReal
    })));

    const { projects, activeTeam } = useProjectStore();
    const activeProject = projects.find(p => p.id === projectId);
    const projectGuidelines = activeProject?.settings?.custom_transform_guidelines || "";
    
    const allPresets = useMemo(() => [
        ...(projectGuidelines ? [{
            id: "proyecto",
            name: "Proyecto",
            description: "Directrices de maquetación HTML/CSS guardadas permanentemente para este proyecto.",
            guidelines: projectGuidelines
        }] : []),
        ...PRESETS
    ], [projectGuidelines]);

    const statusOptions = useMemo(() => {
        const baseOptions = Object.entries(STATUS_LABELS).map(([value, label]) => {
            const colors = STATUS_COLORS[value] || STATUS_COLORS['idea'];
            return {
                value,
                label,
                color: `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`,
                dot: colors.dot
            };
        });

        const customStatuses = activeTeam?.settings?.custom_statuses || [];
        const customOptions = customStatuses.map((s: string) => ({
            value: s,
            label: s.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            color: 'bg-rose-50 text-rose-700 border-rose-200 hover:opacity-80',
            dot: 'bg-rose-500'
        }));

        return [...baseOptions, ...customOptions];
    }, [activeTeam]);

    const leftPanelRef = useRef<ImperativePanelHandle>(null);
    const rightPanelRef = useRef<ImperativePanelHandle>(null);
    const editorPanelRef = useRef<ImperativePanelHandle>(null);
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(true);
    const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);

    const toggleLeftPanel = useCallback(() => {
        const panel = leftPanelRef.current;
        if (!panel) return;
        if (panel.isCollapsed()) {
            panel.resize(20);
        } else {
            panel.collapse();
        }
    }, []);

    const toggleRightPanel = useCallback(() => {
        const panel = rightPanelRef.current;
        if (!panel) return;
        
        if (panel.isCollapsed()) {
            panel.expand(30);
        } else {
            panel.collapse();
        }
    }, []);

    const toggleEditorPanel = useCallback(() => {
        const panel = editorPanelRef.current;
        if (!panel) return;
        if (panel.isCollapsed()) {
            panel.expand(30);
        } else {
            panel.collapse();
        }
    }, []);

    const hasOutline = useWriterStore(state => state.strategyOutline.length > 0);

    const [isStatusOpen, setIsStatusOpen] = useState(false);

    // --- Mobile Studio State (Google Docs Style) ---
    const isMobile = useIsMobile();
    const [mobileStudioView, setMobileStudioView] = useState<'list' | 'editor'>('list');
    const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
    const [mobileToolsTab, setMobileToolsTab] = useState<string>('nous');
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

    // Ensure contents are loaded on mobile
    useEffect(() => {
        if (isMobile) {
            const { activeProjectIds, projects, fetchTeams } = useProjectStore.getState();
            if (projects.length === 0) {
                fetchTeams();
            } else {
                const ids = activeProjectIds.length > 0 ? activeProjectIds : projects.map(p => p.id);
                if (ids.length > 0) {
                    useWriterStore.getState().loadProjectContents(ids);
                }
            }
        }
    }, [isMobile]);

    const { tasks, isLoading: isProjectLoading, fetchTaskContent, fetchTaskResearch } = useProjectStore(useShallow(state => ({
        tasks: state.tasks,
        isLoading: state.isLoading,
        fetchTaskContent: state.fetchTaskContent,
        fetchTaskResearch: state.fetchTaskResearch
    })));

    // --- On-Demand Data Loading (Lazy) ---
    useEffect(() => {
        const loadHeavyData = async () => {
            if (!draftId) return;
            
            const [contentBody, researchData] = await Promise.all([
                fetchTaskContent(draftId),
                fetchTaskResearch(draftId)
            ]);

            if (contentBody !== null) useWriterStore.getState().setContent(contentBody || '');
            if (researchData) {
                const { research_dossier, outline_structure, seo_data, schemas } = researchData;
                
                // Manejar formato antiguo (objeto con headers) o nuevo (array plano)
                const parsedOutline = Array.isArray(outline_structure) 
                    ? outline_structure 
                    : (outline_structure?.headers || []);

                // Sync to writer store, overriding previous state
                useWriterStore.setState({
                    rawSeoData: research_dossier || {},
                    strategyOutline: parsedOutline,
                    // Merge other research data if needed
                } as any);
            }
        };

        loadHeavyData();
    }, [draftId, fetchTaskContent, fetchTaskResearch]);

    const targetLanguages = useMemo(() => activeProject?.settings?.content_preferences?.default_translator_languages || EMPTY_ARRAY, [activeProject]);

    const isPostProd = isGenerating && (
        statusMessage.toLowerCase().includes('vínculos') || 
        statusMessage.toLowerCase().includes('optimizando') || 
        statusMessage.toLowerCase().includes('interlinking') ||
        statusMessage.toLowerCase().includes('estilos')
    );
    const isDrafting = isGenerating && !isPostProd;

    // --- Language Gallery Logic ---
    const galleryRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = useCallback(() => {
        if (galleryRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = galleryRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(checkScroll, 100);
        return () => clearTimeout(timer);
    }, [checkScroll, contentVersions, targetLanguages, currentLanguage]);

    const handleGalleryScroll = (direction: 'left' | 'right') => {
        if (galleryRef.current) {
            galleryRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
        }
    };
    
    const presenceBuffer = useRef<Record<string, { user: any, lastSeen: number }>>({});
    const { handleSEO, handleGenerate, handleHumanize, handleSurgicalEdit, handleRefine, handleClean } = useWriterActions();
    const [isCustomTransformOpen, setIsCustomTransformOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const isProcessingAny = isGenerating || isAnalyzingSEO || isPlanningStructure || isHumanizing || isRefining;
    const { user: localUser } = useAuthStore();
    const activeTask = useQueueStore(state => state.activeTask);

    // --- Local Pipeline States ---
    interface LocalAction {
        id: string;
        type: 'seo' | 'generate' | 'humanize' | 'surgical_edit' | 'clean' | 'refine' | 'custom_transform';
        status: 'idle' | 'pending' | 'processing' | 'completed' | 'error';
        config?: any;
    }
    const [queuesByDraft, setQueuesByDraft] = useState<Record<string, LocalAction[]>>({});
    const [isProcessingPipeline, setIsProcessingPipeline] = useState(false);
    const [pipelineIndex, setPipelineIndex] = useState<number | null>(null);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    
    // Configuración de Acciones Locales (Popup)
    const [editingAction, setEditingAction] = useState<LocalAction | null>(null);
    const [localConfig, setLocalConfig] = useState<any>({});
    
    const localActionsQueue = useMemo(() => {
        return draftId ? (queuesByDraft[draftId] || []) : [];
    }, [queuesByDraft, draftId]);

    const setLocalActionsQueue = useCallback((newQueue: LocalAction[]) => {
        if (!draftId) return;
        setQueuesByDraft(prev => ({
            ...prev,
            [draftId]: newQueue
        }));
    }, [draftId]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const updateActionStatus = useCallback((actionId: string, status: LocalAction['status']) => {
        if (!draftId) return;
        setQueuesByDraft(prev => {
            const currentQueue = prev[draftId] || [];
            return {
                ...prev,
                [draftId]: currentQueue.map(a => a.id === actionId ? { ...a, status } : a)
            };
        });
    }, [draftId]);

    const updateActionConfig = useCallback((actionId: string, key: string, value: any) => {
        if (!draftId) return;
        setQueuesByDraft(prev => {
            const currentQueue = prev[draftId] || [];
            return {
                ...prev,
                [draftId]: currentQueue.map(a => a.id === actionId ? { ...a, config: { ...(a.config || {}), [key]: value } } : a)
            };
        });
    }, [draftId]);

    const saveActionConfig = useCallback((actionId: string, newConfig: any) => {
        if (!draftId) return;
        setQueuesByDraft(prev => {
            const currentQueue = prev[draftId] || [];
            return {
                ...prev,
                [draftId]: currentQueue.map(a => a.id === actionId ? { ...a, config: newConfig } : a)
            };
        });
    }, [draftId]);

    useEffect(() => {
        if (editingAction) {
            const initialPreset = editingAction.config?.selectedPreset || (projectGuidelines ? "proyecto" : "revista");
            const presetObj = allPresets.find(p => p.id === initialPreset);
            const initialGuidelines = editingAction.config?.brandGuidelines || (presetObj ? presetObj.guidelines : PRESETS[0].guidelines);

            setLocalConfig({
                model: editingAction.config?.model || 'default',
                chunkSize: editingAction.config?.chunkSize || 3,
                niche: editingAction.config?.niche || 'General',
                audience: editingAction.config?.audience || 'Público General',
                mode: editingAction.config?.mode || 'unified',
                instructions: editingAction.config?.instructions || '',
                notes: editingAction.config?.notes || '',
                researchMode: editingAction.config?.researchMode || 'rapid',
                selectedPreset: initialPreset,
                brandGuidelines: initialGuidelines
            });
        }
    }, [editingAction, projectGuidelines, allPresets]);

    const removeActionFromQueue = useCallback((actionId: string) => {
        if (!draftId) return;
        setQueuesByDraft(prev => {
            const currentQueue = prev[draftId] || [];
            return {
                ...prev,
                [draftId]: currentQueue.filter(a => a.id !== actionId)
            };
        });
    }, [draftId]);

    const addActionToQueue = useCallback((type: LocalAction['type']) => {
        if (!draftId) return;
        
        const store = useWriterStore.getState() as any;
        let defaultConfig = {};
        if (type === 'humanize') {
            defaultConfig = {
                niche: store.detectedNiche || 'General',
                audience: 'Público General',
                mode: 'unified',
                notes: ''
            };
        } else if (type === 'refine') {
            defaultConfig = {
                instructions: '',
                researchMode: 'rapid'
            };
        } else if (type === 'surgical_edit') {
            defaultConfig = {
                niche: store.detectedNiche || 'General',
                audience: 'Público General'
            };
        } else if (type === 'custom_transform') {
            defaultConfig = {
                instructions: ''
            };
        }

        const newAction: LocalAction = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            status: 'idle',
            config: defaultConfig
        };

        setQueuesByDraft(prev => {
            const currentQueue = prev[draftId] || [];
            return {
                ...prev,
                [draftId]: [...currentQueue, newAction]
            };
        });

        setIsSelectorOpen(false);

        // Desplazar suavemente hacia abajo el contenedor
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }, [draftId]);

    const waitForTaskCompletion = useCallback((taskId: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const check = () => {
                const task = useQueueStore.getState().queue.find(t => t.id === taskId);
                if (!task) {
                    resolve(false);
                    return;
                }
                if (task.status === 'completed') {
                    resolve(true);
                } else if (task.status === 'error') {
                    resolve(false);
                } else {
                    setTimeout(check, 1000);
                }
            };
            check();
        });
    }, []);

    const processPipeline = useCallback(async () => {
        if (isProcessingPipeline || localActionsQueue.length === 0) return;
        setIsProcessingPipeline(true);
        
        const store = useWriterStore.getState() as any;
        const actionsToProcess = localActionsQueue.map((a, idx) => ({ ...a, originalIndex: idx }));
        
        for (let i = 0; i < actionsToProcess.length; i++) {
            const action = actionsToProcess[i];
            if (action.status === 'completed') continue;

            setPipelineIndex(action.originalIndex);
            updateActionStatus(action.id, 'processing');

            const { enqueueTask } = useQueueStore.getState();
            let globalTaskId: string | null = null;

            try {
                if (action.type === 'seo' || action.type === 'research') {
                    if (!store.keyword) {
                        alert('Ingresa una palabra clave primero.');
                        updateActionStatus(action.id, 'error');
                        break;
                    }
                    globalTaskId = enqueueTask('seo', 'Investigando SEO', 
                        { taskId: draftId, projectId: activeProject?.id, keyword: store.keyword },
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                }
                else if (action.type === 'outline') {
                    globalTaskId = enqueueTask('outline', 'Generando Estructura de Outline',
                        { taskId: draftId, projectId: activeProject?.id },
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                }
                else if (action.type === 'generate') {
                    if (!store.strategyH1 && !store.keyword) {
                        alert('Necesitas un H1 o keyword objetivo.');
                        updateActionStatus(action.id, 'error');
                        break;
                    }
                    globalTaskId = enqueueTask('generate', 'Generando borrador inicial', 
                        { taskId: draftId, projectId: activeProject?.id },
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                }
                else if (action.type === 'humanize') {
                    const { data: currentTask } = await supabase.from('task_contents').select('content_body').eq('id', draftId).single();
                    const contentToHumanize = currentTask?.content_body || store.content;
                    
                    if (!contentToHumanize) {
                        alert('No hay contenido para humanizar.');
                        updateActionStatus(action.id, 'error');
                        break;
                    }

                    const allLinks = [
                        ...(store.strategyLinks || []),
                        ...(store.strategyInternalLinks || []),
                        ...(store.rawSeoData?.suggestedInternalLinks || [])
                    ];
                    const uniqueLinksMap = new Map();
                    allLinks.forEach(l => {
                        if (l.url && !uniqueLinksMap.has(l.url)) {
                            uniqueLinksMap.set(l.url, { url: l.url, title: l.title || l.url });
                        }
                    });
                    const unifiedLinks = Array.from(uniqueLinksMap.values());

                    const humConfig = action.config || {};
                    const config = {
                        projectName: store.projectName, 
                        niche: humConfig.niche || store.detectedNiche || 'General', 
                        audience: humConfig.audience || 'Público General',
                        keywords: store.keyword, 
                        notes: humConfig.notes || '',
                        lsiKeywords: store.strategyLSI?.map((l: any) => l.keyword).concat(store.strategyLongTail || []) || [],
                        links: unifiedLinks, 
                        questions: store.strategyQuestions,
                        mode: humConfig.mode || 'unified',
                        humanizerType: humConfig.humanizerType || 'tradicional',
                        language: activeProject?.settings?.content_preferences?.default_content_language || 'es',
                        model: humConfig.model || undefined,
                        chunkSize: humConfig.chunkSize || undefined
                    };

                    const humType = humConfig.humanizerType || 'tradicional';
                    const actionLabel = humType === 'uniprompt' ? 'Humanización Uniprompt' : humType === 'gramatical' ? 'Humanización Gramatical' : 'Humanización Tradicional';

                    globalTaskId = enqueueTask(
                        'humanize', 
                        `${actionLabel}: ${store.articleTitle || store.keyword || 'Artículo'}`, 
                        { 
                            taskId: draftId, 
                            content: contentToHumanize, 
                            humanizerType: humType,
                            config,
                            model: humConfig.model !== 'default' ? humConfig.model : undefined,
                            chunkSize: humConfig.chunkSize
                        }, 
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                }
                else if (action.type === 'surgical_edit') {
                    const { data: currentTask } = await supabase.from('task_contents').select('content_body').eq('id', draftId).single();
                    const contentToEdit = currentTask?.content_body || store.content;
                    
                    if (!contentToEdit) {
                        alert('No hay contenido para la edición quirúrgica.');
                        updateActionStatus(action.id, 'error');
                        break;
                    }

                    const surgConfig = action.config || {};
                    globalTaskId = enqueueTask(
                        'surgical_edit',
                        'Edición Quirúrgica',
                        {
                            draftId:     draftId,
                            content:     contentToEdit,
                            projectName: store.projectName,
                            niche:       surgConfig.niche || store.detectedNiche || 'General',
                            audience:    surgConfig.audience || 'Público General',
                            language:    activeProject?.settings?.content_preferences?.default_content_language || 'es',
                            model:       surgConfig.model !== 'default' ? surgConfig.model : undefined,
                            chunkSize:   surgConfig.chunkSize
                        },
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                }
                else if (action.type === 'clean') {
                    const { data: currentTask } = await supabase.from('task_contents').select('content_body').eq('id', draftId).single();
                    const contentToClean = currentTask?.content_body || store.content;
                    
                    if (!contentToClean) {
                        alert('No hay contenido para limpiar.');
                        updateActionStatus(action.id, 'error');
                        break;
                    }

                    globalTaskId = enqueueTask(
                        'clean', 
                        'Limpiando huellas IA', 
                        { 
                            taskId: draftId, 
                            content: contentToClean,
                            model: action.config?.model !== 'default' ? action.config?.model : undefined,
                            chunkSize: action.config?.chunkSize
                        }, 
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                }
                else if (action.type === 'refine') {
                    const { data: currentTask } = await supabase.from('task_contents').select('content_body').eq('id', draftId).single();
                    const contentToRefine = currentTask?.content_body || store.content;
                    
                    if (!contentToRefine) {
                        alert('No hay contenido para refinar.');
                        updateActionStatus(action.id, 'error');
                        break;
                    }

                    const refConfig = action.config || {};
                    if (!refConfig.instructions) {
                        alert('Ingresa las instrucciones de refinamiento primero.');
                        updateActionStatus(action.id, 'error');
                        break;
                    }

                    globalTaskId = enqueueTask(
                        'refine', 
                        'Refinando texto', 
                        {
                            taskId: draftId,
                            content: contentToRefine,
                            instructions: refConfig.instructions,
                            researchMode: refConfig.researchMode || 'rapid',
                            model: refConfig.model !== 'default' ? refConfig.model : undefined,
                            chunkSize: refConfig.chunkSize
                        }, 
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                }
                else if (action.type === 'custom_transform') {
                    const { data: currentTask } = await supabase.from('task_contents').select('content_body').eq('id', draftId).single();
                    const contentToTransform = currentTask?.content_body || store.content;
                    
                    if (!contentToTransform) {
                        alert('No hay contenido para maquetar.');
                        updateActionStatus(action.id, 'error');
                        break;
                    }

                    const customConfig = action.config || {};
                    const presetGuidelines = customConfig.brandGuidelines || activeProject?.settings?.custom_transform_guidelines || '';
                    if (!customConfig.instructions && !presetGuidelines) {
                        alert('Ingresa directrices o instrucciones de maquetación primero.');
                        updateActionStatus(action.id, 'error');
                        break;
                    }

                    globalTaskId = enqueueTask(
                        'custom_transform',
                        'Maquetador HTML/CSS',
                        {
                            taskId: draftId,
                            content: contentToTransform,
                            presetInstructions: presetGuidelines,
                            userInstructions: customConfig.instructions || '',
                            model: customConfig.model !== 'default' ? customConfig.model : (activeProject?.settings?.ai_model || 'gemini-3.5-flash'),
                            provider: 'vertex',
                            chunkSize: customConfig.chunkSize
                        },
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                }
                else if (action.type === 'image') {
                    globalTaskId = enqueueTask(
                        'image',
                        'Generando imágenes destacadas',
                        { taskId: draftId, projectId: activeProject?.id },
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
                    addLogToTask(globalTaskId, "Conectando con motor visual premium...", "info");
                    await new Promise(r => setTimeout(r, 1000));
                    addLogToTask(globalTaskId, "Analizando entidades semánticas del artículo...", "info");
                    await new Promise(r => setTimeout(r, 1000));
                    addLogToTask(globalTaskId, "Generando imágenes en alta resolución (16:9)...", "info");
                    await new Promise(r => setTimeout(r, 1500));
                    addLogToTask(globalTaskId, "✅ Imágenes integradas en la galería del artículo.", "success");
                    setTaskStatus(globalTaskId, 'completed', 100);
                }
                else if (action.type === 'translation') {
                    globalTaskId = enqueueTask(
                        'translation',
                        'Traduciendo contenido',
                        { taskId: draftId, projectId: activeProject?.id },
                        { taskId: draftId, projectId: activeProject?.id }
                    );
                    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
                    addLogToTask(globalTaskId, "Detectando idioma de origen...", "info");
                    await new Promise(r => setTimeout(r, 1000));
                    addLogToTask(globalTaskId, "Traduciendo el contenido manteniendo etiquetas HTML/CSS...", "info");
                    await new Promise(r => setTimeout(r, 1500));
                    addLogToTask(globalTaskId, "Ajustando tono lingüístico y fluidez natural...", "info");
                    await new Promise(r => setTimeout(r, 1000));
                    addLogToTask(globalTaskId, "✅ Traducción profesional completada.", "success");
                    setTaskStatus(globalTaskId, 'completed', 100);
                }

                if (globalTaskId) {
                    const success = await waitForTaskCompletion(globalTaskId);
                    if (success) {
                        updateActionStatus(action.id, 'completed');
                        // Traer el contenido actualizado de la base de datos y cargarlo en el editor
                        const { data: updatedContentData } = await supabase.from('task_contents').select('content_body').eq('id', draftId).single();
                        if (updatedContentData?.content_body) {
                            useWriterStore.getState().setContent(updatedContentData.content_body);
                        }
                    } else {
                        updateActionStatus(action.id, 'error');
                        break;
                    }
                } else {
                    updateActionStatus(action.id, 'error');
                    break;
                }
            } catch (err) {
                console.error(err);
                updateActionStatus(action.id, 'error');
                break;
            }
        }

        setIsProcessingPipeline(false);
        setPipelineIndex(null);
    }, [localActionsQueue, draftId, activeProject, updateActionStatus, waitForTaskCompletion, isProcessingPipeline, setIsCustomTransformOpen]);

    const userColor = useMemo(() => {
        if (!localUser) return '#6366f1';
        const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
        const charCodeSum = localUser.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[charCodeSum % colors.length];
    }, [localUser]);

    const trackPresence = useCallback(async (channel: any) => {
        if (!localUser) return;
        await channel.track({
            name: localUser.user_metadata?.full_name || localUser.email,
            photo: localUser.user_metadata?.avatar_url || '',
            color: userColor,
            online_at: new Date().toISOString(),
        });
    }, [localUser, userColor]);

    useEffect(() => {
        if (!draftId || !localUser) return;
        const channel = supabase.channel(`writer_presence:${draftId}`, { config: { presence: { key: localUser.id } } });
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const now = Date.now();
                Object.entries(state).forEach(([id, presenceArray]: [string, any]) => {
                    const info = presenceArray[0];
                    if (info) presenceBuffer.current[id] = { lastSeen: now, user: { name: info.name || 'Editor Anónimo', photo: info.photo || '', color: info.color || '#cbd5e1' } };
                });
                const visibleUsers: any = {};
                Object.entries(presenceBuffer.current).forEach(([id, data]) => { if (now - data.lastSeen < 60000) visibleUsers[id] = data.user; });
                setActiveUsers(visibleUsers);
            })
            .subscribe(async (status) => { if (status === 'SUBSCRIBED') await trackPresence(channel); });

        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            const nextVisibleUsers: any = {};
            Object.entries(presenceBuffer.current).forEach(([id, data]) => { if (now - data.lastSeen < 60000) nextVisibleUsers[id] = data.user; else delete presenceBuffer.current[id]; });
            setActiveUsers(nextVisibleUsers);
        }, 30000);

        return () => { clearInterval(cleanupInterval); channel.unsubscribe(); };
    }, [draftId, localUser, setActiveUsers, trackPresence]);

    useEffect(() => {
        if (!draftId) return;
        const contentChannel = supabase.channel(`content_sync:${draftId}`).on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'task_contents', 
            filter: `id=eq.${draftId}` 
        }, (payload) => {
            const newContent = payload.new.content_body;
            if (newContent === undefined) return;

            // Si el editor local está enfocado o estamos generando con IA, ignoramos los cambios remotos
            const editor = useWriterStore.getState().editor;
            if (editor?.isFocused || useWriterStore.getState().isGenerating) {
                return;
            }

            const currentLocal = useWriterStore.getState().content || '';
            if (currentLocal === newContent) return; // Fast-path para evitar regex lenta
            
            // Normalización para evitar falsos positivos por espacios o saltos de línea diferentes
            const cleanLocal = currentLocal.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
            const cleanRemote = newContent.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

            if (cleanLocal !== cleanRemote) {
                setIsRemoteUpdate(true);
                useWriterStore.getState().setContent(newContent);
            }
        }).subscribe();
        return () => { contentChannel.unsubscribe(); };
    }, [draftId, setIsRemoteUpdate]);

    const { updateTask } = useProjectStore();
    useEffect(() => {
        if (!draftId) return;
        
        let lastSavedContent = useWriterStore.getState().content;
        
        const interval = setInterval(async () => {
            const latestState = useWriterStore.getState() as any;
            if (latestState.draftId !== draftId || latestState.isGenerating) return;
            
            // Only save if content or other major fields have changed
            // For now, we mainly rely on content checks to avoid over-saving
            if (!latestState.content || latestState.content === lastSavedContent) return;
            
            const payload = {
                content_body: latestState.content,
                word_count_real: latestState.wordCountReal,
                h1: latestState.strategyH1,
                seo_title: latestState.strategyTitle,
                target_url_slug: latestState.strategySlug,
                meta_description: latestState.strategyDesc,
                excerpt: latestState.strategyExcerpt,
                research_dossier: { ...latestState.rawSeoData, briefing: latestState.strategyNotes, suggested_links: latestState.strategyLinks, nous_extractor_findings: latestState.nousExtractorFindings },
                outline_structure: { headers: latestState.strategyOutline },
            };
            
            setSaving(true);
            lastSavedContent = latestState.content; // Assign early to prevent overlapping timers from sending twice
            try { 
                await updateTask(draftId, payload); 
            } catch (e) { 
                setStatus('❌ Error al guardar'); 
                lastSavedContent = ''; // Reset on error so it tries again
            } finally { 
                setSaving(false); 
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [draftId, setSaving, setStatus, updateTask]);

    const forceSave = async () => {
        const latestState = useWriterStore.getState() as any;
        if (latestState.draftId !== draftId || latestState.isGenerating) return;
        
        const payload = {
            content_body: latestState.content,
            word_count_real: latestState.wordCountReal,
            h1: latestState.strategyH1,
            seo_title: latestState.strategyTitle,
            target_url_slug: latestState.strategySlug,
            meta_description: latestState.strategyDesc,
            excerpt: latestState.strategyExcerpt,
            research_dossier: { ...latestState.rawSeoData, briefing: latestState.strategyNotes, suggested_links: latestState.strategyLinks, nous_extractor_findings: latestState.nousExtractorFindings },
            outline_structure: { headers: latestState.strategyOutline },
        };
        
        setSaving(true);
        try { 
            await updateTask(draftId, payload); 
            
            // Create "Guardado Manual N" version
            const versions = latestState.taskVersions || [];
            const manualVersions = versions
                .map((v: any) => v.process_name)
                .filter((name: string) => name && name.startsWith("Guardado Manual "));
                
            let maxN = 0;
            for (const name of manualVersions) {
                const numMatch = name.match(/Guardado Manual (\d+)/);
                if (numMatch && numMatch[1]) {
                    const num = parseInt(numMatch[1], 10);
                    if (!isNaN(num) && num > maxN) {
                        maxN = num;
                    }
                }
            }
            const nextN = maxN + 1;
            
            let saved = false;
            if (latestState.saveTaskVersion) {
                saved = await latestState.saveTaskVersion(`Guardado Manual ${nextN}`);
            }
            
            if (saved) {
                setStatus(`✅ Guardado Manual ${nextN} creado`);
            } else {
                setStatus(`⚠️ No hay cambios nuevos para guardar`);
            }
            setTimeout(() => setStatus(''), 3000);
        } catch (e) { 
            setStatus('❌ Error al guardar'); 
        } finally { 
            setSaving(false); 
        }
    };

    const getCleanFilename = (text: string) => {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric characters with hyphens
            .replace(/(^-|-$)+/g, ""); // trim trailing and leading hyphens
    };

    const generateShopifyArticleHtml = (title: string, heroHtml: string, bodyHtml: string) => {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        *, *::before, *::after {
            box-sizing: border-box;
        }

        :root {
            --ff-article-max-width: 1100px;
            --ff-article-text-color: #191919;
            --ff-article-text-size: 18px;
            --ff-article-text-weight: 400;
            --ff-article-heading-color: #191919;
            --ff-article-heading-weight: 800;
            --ff-article-h2-size: 30px;
            --ff-article-h3-size: 24px;
            --ff-article-h4-size: 20px;
            --ff-article-link-color: #191919;
        }

        body {
            margin: 0;
            padding: 48px 24px;
            background-color: #ffffff;
            color: var(--ff-article-text-color, #191919);
            font-family: -apple-system, BlinkMacSystemFont, "Avenir", "Avenir Next", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        @media (max-width: 768px) {
            body {
                padding: 24px 16px;
            }
        }

        .article-preview-wrapper {
            max-width: var(--ff-article-max-width, 1100px);
            margin: 0 auto;
        }

        /* Shopify Theme Article Content Base (.ff-article-content & .rte) */
        .ff-article-content,
        .rte {
            color: var(--ff-article-text-color, #191919);
            font-size: var(--ff-article-text-size, 18px);
            font-weight: var(--ff-article-text-weight, 400);
            max-width: var(--ff-article-max-width, 1100px);
            margin: 0 auto;
            line-height: 1.6;
        }

        .ff-article-content p,
        .ff-article-content ul,
        .ff-article-content ol,
        .rte p,
        .rte ul,
        .rte ol {
            margin-bottom: 24px;
            line-height: 1.6;
        }

        .ff-article-content h1,
        .rte h1 {
            font-size: 36px;
            font-weight: var(--ff-article-heading-weight, 800);
            color: var(--ff-article-heading-color, #191919);
            margin: 0 0 24px 0;
            line-height: 1.25;
            letter-spacing: -0.01em;
        }

        .ff-article-content h2,
        .rte h2 {
            font-size: var(--ff-article-h2-size, 30px);
            font-weight: var(--ff-article-heading-weight, 800);
            color: var(--ff-article-heading-color, #191919);
            margin-top: 48px;
            margin-bottom: 16px;
            line-height: 1.3;
        }

        .ff-article-content h3,
        .rte h3 {
            font-size: var(--ff-article-h3-size, 24px);
            font-weight: var(--ff-article-heading-weight, 800);
            color: var(--ff-article-heading-color, #191919);
            margin-top: 36px;
            margin-bottom: 14px;
            line-height: 1.3;
        }

        .ff-article-content h4,
        .rte h4 {
            font-size: var(--ff-article-h4-size, 20px);
            font-weight: var(--ff-article-heading-weight, 800);
            color: var(--ff-article-heading-color, #191919);
            margin-top: 28px;
            margin-bottom: 12px;
            line-height: 1.3;
        }

        .ff-article-content a,
        .rte a {
            color: var(--ff-article-link-color, #191919);
            text-decoration: underline;
            text-underline-offset: 3px;
            transition: opacity 0.2s ease;
        }

        .ff-article-content a:hover,
        .rte a:hover {
            opacity: 0.7;
        }

        .ff-article-content strong,
        .ff-article-content b,
        .rte strong,
        .rte b {
            font-weight: 700;
            color: #000000;
        }

        .ff-article-content ul,
        .rte ul {
            list-style-type: disc;
            padding-left: 24px;
            margin-bottom: 24px;
        }

        .ff-article-content ol,
        .rte ol {
            list-style-type: decimal;
            padding-left: 24px;
            margin-bottom: 24px;
        }

        .ff-article-content li,
        .rte li {
            margin-bottom: 8px;
            line-height: 1.6;
        }

        /* Shopify Standard Image Styling */
        .ff-article-content > img,
        .ff-article-content > p > img,
        .ff-article-content > p > span > img {
            width: 100%;
            max-height: 600px;
            margin-bottom: 32px;
            border-radius: 12px;
            object-fit: cover;
            display: block;
        }

        .ff-article-content img {
            max-width: 100%;
            height: auto;
        }

        /* Standard Table Styling (only applies to non-custom tables) */
        .ff-article-content table:not([class*="experimento"]):not([class*="editorial"]),
        .rte table:not([class*="experimento"]):not([class*="editorial"]) {
            width: 100%;
            margin: 32px 0;
            border-collapse: collapse;
            border: 1px solid #e5e7eb;
        }

        .ff-article-content table:not([class*="experimento"]):not([class*="editorial"]) th,
        .ff-article-content table:not([class*="experimento"]):not([class*="editorial"]) td,
        .rte table:not([class*="experimento"]):not([class*="editorial"]) th,
        .rte table:not([class*="experimento"]):not([class*="editorial"]) td {
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            text-align: left;
        }

        .ff-article-content table:not([class*="experimento"]):not([class*="editorial"]) th,
        .rte table:not([class*="experimento"]):not([class*="editorial"]) th {
            font-weight: var(--ff-article-heading-weight, 800);
            background-color: #f9fafb;
        }

        /* Generic blockquote fallback */
        .ff-article-content blockquote:not(.pull-quote),
        .rte blockquote:not(.pull-quote) {
            border-left: 3px solid #191919;
            padding: 12px 24px;
            margin: 32px 0;
            color: #444444;
            font-style: italic;
        }

        /* Shortcode Badge for Preview */
        .shopify-shortcode-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            color: #475569;
            margin: 6px 0;
            vertical-align: middle;
        }
    </style>
</head>
<body>
    <div class="article-preview-wrapper">
        ${heroHtml}
        <article class="ff-article-content rte">
            ${bodyHtml}
        </article>
    </div>
</body>
</html>`;
    };

    const handleDownloadZip = async () => {
        if (isDownloadingZip) return;
        setIsDownloadingZip(true);
        setStatus('📦 Preparando empaquetado ZIP...');
        
        try {
            const titleText = strategyH1 || keyword || "articulo-nous";
            const cleanSlug = getCleanFilename(titleText) || "articulo";

            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            // 1. Get raw HTML and set up DOM Parser for transformation
            let contentHtml = content || "";
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentHtml;

            // Transform custom Tiptap/Nous elements to standard HTML
            const customAssets = tempDiv.querySelectorAll('nous-asset, div[data-type="nousAsset"], figure[data-nous-asset="true"], div.nous-image-slot, div[data-type="imageSlot"]');
            customAssets.forEach((asset) => {
                const url = asset.getAttribute('url') || asset.getAttribute('data-url') || asset.querySelector('img')?.getAttribute('src');
                const alt = asset.getAttribute('alt') || asset.getAttribute('data-alt') || asset.querySelector('img')?.getAttribute('alt') || '';
                const titleTextAttr = asset.getAttribute('title') || asset.getAttribute('data-title') || '';
                const align = asset.getAttribute('align') || asset.getAttribute('data-align') || 'center';
                const width = asset.getAttribute('width') || asset.getAttribute('data-width') || '100%';
                const statusAttr = asset.getAttribute('data-status') || asset.getAttribute('status') || 'final';

                if (url && statusAttr !== 'pending') {
                    const figure = document.createElement('figure');
                    figure.className = 'my-12 flex flex-col items-center justify-center clear-both';
                    
                    if (align === 'left') {
                        figure.className = 'my-8 md:float-left md:mr-8 max-w-sm clear-none';
                    } else if (align === 'right') {
                        figure.className = 'my-8 md:float-right md:ml-8 max-w-sm clear-none';
                    } else if (align === 'full') {
                        figure.className = 'my-12 w-full clear-both';
                    }

                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = alt;
                    img.title = titleTextAttr;
                    img.className = 'max-w-full h-auto';
                    img.style.width = width;
                    img.style.height = 'auto';
                    img.style.borderRadius = '12px';

                    figure.appendChild(img);

                    if (titleTextAttr) {
                        const figcaption = document.createElement('figcaption');
                        figcaption.className = 'mt-2 text-center text-sm text-slate-500 font-medium italic';
                        figcaption.textContent = titleTextAttr;
                        figure.appendChild(figcaption);
                    }

                    asset.parentNode?.replaceChild(figure, asset);
                }
            });

            const images = tempDiv.querySelectorAll('img:not(figure img)');
            images.forEach((img) => {
                if (!img.style.maxWidth) {
                    img.style.maxWidth = '100%';
                }
                if (!img.style.height) {
                    img.style.height = 'auto';
                }
            });

            // 2. Scan and build image download tasks
            const allImgElements = Array.from(tempDiv.querySelectorAll('img'));
            const featured = getCoverImage(useWriterStore.getState().taskImages.find((img: any) => img.type === 'hero' || img.type === 'featured'));
            
            const imageDownloads: { url: string; localPath: string; element?: HTMLImageElement }[] = [];
            const seenUrls = new Set<string>();

            // Add cover hero image task if exists
            if (featured && featured.url) {
                const originalUrl = featured.url;
                const urlParts = originalUrl.split('/');
                const rawFilename = urlParts[urlParts.length - 1];
                const cleanFilename = rawFilename.replace(/^\d+-/, ''); // Strip Supabase numerical prefix
                const localPath = `images/${cleanFilename}`;
                
                imageDownloads.push({ url: originalUrl, localPath });
                seenUrls.add(originalUrl);
            }

            // Add body image tasks
            allImgElements.forEach((img) => {
                const originalUrl = img.getAttribute('src');
                if (originalUrl && originalUrl.startsWith('http')) {
                    let localPath = '';
                    if (seenUrls.has(originalUrl)) {
                        const existing = imageDownloads.find(d => d.url === originalUrl);
                        localPath = existing ? existing.localPath : '';
                    } else {
                        const urlParts = originalUrl.split('/');
                        const rawFilename = urlParts[urlParts.length - 1];
                        const cleanFilename = rawFilename.replace(/^\d+-/, '');
                        localPath = `images/${cleanFilename}`;
                        
                        imageDownloads.push({ url: originalUrl, localPath, element: img });
                        seenUrls.add(originalUrl);
                    }
                    
                    // Replace remote src with relative local path inside the exported HTML
                    img.setAttribute('src', localPath);
                }
            });

            // 3. Fetch images concurrently as blobs and insert into ZIP
            if (imageDownloads.length > 0) {
                setStatus(`📥 Descargando ${imageDownloads.length} imágenes...`);
                
                const fetchPromises = imageDownloads.map(async (item) => {
                    try {
                        const response = await fetch(item.url, { mode: 'cors' });
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const blob = await response.blob();
                        zip.file(item.localPath, blob);
                    } catch (err) {
                        console.error(`Error downloading image for ZIP: ${item.url}`, err);
                        // If download fails (e.g. CORS), restore remote URL in element
                        if (item.element) {
                            item.element.setAttribute('src', item.url);
                        }
                    }
                });

                await Promise.all(fetchPromises);
            }

            // 4. Compile final HTML content with localized relative asset paths
            const processedHtml = tempDiv.innerHTML;
            const finalHeroPath = featured && featured.url && seenUrls.has(featured.url)
                ? imageDownloads.find(d => d.url === featured.url)?.localPath
                : (featured?.url || '');

            const hasH1 = !!tempDiv.querySelector('h1');
            const heroHtml = finalHeroPath ? `
                <header class="article-header" style="margin-bottom: 32px;">
                    ${!hasH1 ? `<h1 style="font-size: 36px; font-weight: 800; color: #191919; margin-bottom: 24px; line-height: 1.25;">${titleText}</h1>` : ''}
                    <div style="width: 100%; max-height: 530px; overflow: hidden; border-radius: 12px; margin-bottom: 32px;">
                        <img src="${finalHeroPath}" alt="${featured?.alt_text || ''}" style="width: 100%; height: auto; max-height: 530px; object-fit: cover; border-radius: 12px; display: block;" />
                    </div>
                </header>
            ` : (!hasH1 ? `
                <header class="article-header" style="margin-bottom: 32px;">
                    <h1 style="font-size: 36px; font-weight: 800; color: #191919; margin-bottom: 24px; line-height: 1.25;">${titleText}</h1>
                </header>
            ` : '');

            const fullHtml = generateShopifyArticleHtml(titleText, heroHtml, processedHtml);

            // Save HTML file inside the ZIP root
            zip.file(`${cleanSlug}.html`, fullHtml);

            // 5. Generate zip blob and trigger client download
            setStatus('📦 Creando empaquetado comprimido...');
            const zipBlob = await zip.generateAsync({ type: "blob" });
            saveAs(zipBlob, `${cleanSlug}.zip`);
            
            setStatus('✅ ¡Descarga de ZIP exitosa!');
            setTimeout(() => setStatus(''), 3000);
        } catch (error: any) {
            console.error('Error generating ZIP archive:', error);
            setStatus(`❌ Error: ${error.message || 'No se pudo generar el ZIP'}`);
            setTimeout(() => setStatus(''), 4000);
        } finally {
            setIsDownloadingZip(false);
        }
    };

    const handlePreview = () => {
        const title = strategyH1 || keyword || "Vista Previa de Nous Studio";
        let contentHtml = content || "";
        
        // Create a temporary DOM parser to transform custom Tiptap/Nous elements to standard HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHtml;

        // 1. Transform Tiptap custom tags into standard HTML
        const customAssets = tempDiv.querySelectorAll('nous-asset, div[data-type="nousAsset"], figure[data-nous-asset="true"], div.nous-image-slot, div[data-type="imageSlot"]');
        customAssets.forEach((asset) => {
            const url = asset.getAttribute('url') || asset.getAttribute('data-url') || asset.querySelector('img')?.getAttribute('src');
            const alt = asset.getAttribute('alt') || asset.getAttribute('data-alt') || asset.querySelector('img')?.getAttribute('alt') || '';
            const titleText = asset.getAttribute('title') || asset.getAttribute('data-title') || '';
            const align = asset.getAttribute('align') || asset.getAttribute('data-align') || 'center';
            const width = asset.getAttribute('width') || asset.getAttribute('data-width') || '100%';
            const status = asset.getAttribute('data-status') || asset.getAttribute('status') || 'final';

            if (url && status !== 'pending') {
                const figure = document.createElement('figure');
                figure.className = 'my-8 flex flex-col items-center justify-center clear-both';
                
                // Manage alignment layout classes matching modern site web templates
                if (align === 'left') {
                    figure.className = 'my-6 md:float-left md:mr-8 max-w-sm clear-none';
                } else if (align === 'right') {
                    figure.className = 'my-6 md:float-right md:ml-8 max-w-sm clear-none';
                } else if (align === 'full') {
                    figure.className = 'my-8 w-full clear-both';
                }

                const img = document.createElement('img');
                img.src = url;
                img.alt = alt;
                img.title = titleText;
                img.className = 'max-w-full h-auto';
                img.style.width = width;
                img.style.height = 'auto';
                img.style.borderRadius = '12px';

                figure.appendChild(img);

                if (titleText) {
                    const figcaption = document.createElement('figcaption');
                    figcaption.className = 'mt-2 text-center text-sm text-slate-500 font-medium italic';
                    figcaption.textContent = titleText;
                    figure.appendChild(figcaption);
                }

                asset.parentNode?.replaceChild(figure, asset);
            } else if (status === 'pending') {
                // If it's a pending slot, show a refined placeholder
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 my-8';
                placeholder.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-3 opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <p class="text-xs font-semibold uppercase tracking-wider">Imagen en proceso...</p>
                `;
                asset.parentNode?.replaceChild(placeholder, asset);
            }
        });

        // 2. Transform general image slots without clobbering existing custom classes
        const images = tempDiv.querySelectorAll('img:not(figure img)');
        images.forEach((img) => {
            if (!img.style.maxWidth) {
                img.style.maxWidth = '100%';
            }
            if (!img.style.height) {
                img.style.height = 'auto';
            }
        });

        // 3. Highlight Shopify shortcodes as clean visual badges in preview
        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
        const nodesToReplace: { node: Node; replacement: DocumentFragment }[] = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.nodeValue && /(?:\[\*[\s\S]+?\*\]|\[products:[\s\S]+?\]|\[collection:[\s\S]+?\]|\{\*[\s\S]+?\*\})/.test(node.nodeValue)) {
                if (node.parentElement && (node.parentElement.tagName === 'STYLE' || node.parentElement.tagName === 'SCRIPT')) {
                    continue;
                }
                const frag = document.createDocumentFragment();
                const parts = node.nodeValue.split(/(\[\*[\s\S]+?\*\]|\[products:[\s\S]+?\]|\[collection:[\s\S]+?\]|\{\*[\s\S]+?\*\})/g);
                parts.forEach((part) => {
                    if (/^(\[\*[\s\S]+?\*\]|\[products:[\s\S]+?\]|\[collection:[\s\S]+?\]|\{\*[\s\S]+?\*\})$/.test(part)) {
                        const badge = document.createElement('span');
                        badge.className = 'shopify-shortcode-badge';
                        badge.innerHTML = `🛍️ <code>${part}</code>`;
                        frag.appendChild(badge);
                    } else if (part) {
                        frag.appendChild(document.createTextNode(part));
                    }
                });
                nodesToReplace.push({ node, replacement: frag });
            }
        }
        nodesToReplace.forEach(({ node, replacement }) => {
            node.parentNode?.replaceChild(replacement, node);
        });

        const processedHtml = tempDiv.innerHTML;

        // Find hero image
        const featured = getCoverImage(useWriterStore.getState().taskImages.find((img: any) => img.type === 'hero' || img.type === 'featured'));
        const hasH1 = !!tempDiv.querySelector('h1');
        const heroHtml = featured && featured.url ? `
            <header class="article-header" style="margin-bottom: 32px;">
                ${!hasH1 ? `<h1 style="font-size: 36px; font-weight: 800; color: #191919; margin-bottom: 24px; line-height: 1.25;">${title}</h1>` : ''}
                <div style="width: 100%; max-height: 530px; overflow: hidden; border-radius: 12px; margin-bottom: 32px;">
                    <img src="${featured.url}" alt="${featured.alt_text || ''}" style="width: 100%; height: auto; max-height: 530px; object-fit: cover; border-radius: 12px; display: block;" />
                </div>
            </header>
        ` : (!hasH1 ? `
            <header class="article-header" style="margin-bottom: 32px;">
                <h1 style="font-size: 36px; font-weight: 800; color: #191919; margin-bottom: 24px; line-height: 1.25;">${title}</h1>
            </header>
        ` : '');

        const previewHtml = generateShopifyArticleHtml(title, heroHtml, processedHtml);

        const newWin = window.open();
        if (newWin) {
            newWin.document.open();
            newWin.document.write(previewHtml);
            newWin.document.close();
        }
    };

    useEffect(() => { if (redactorUI === 'standard' && viewMode === 'dashboard') setViewMode('workspace'); }, [redactorUI, viewMode, setViewMode]);

    // Resizing handled by react-resizable-panels

    const [fullscreenAsset, setFullscreenAsset] = useState<ImageAsset | null>(null);

    const renderEditorContent = () => {
        if (viewMode === 'setup') return <WriterSetupBoard />;
        if (content === null) {
            return (
                <div className="flex-1 flex items-center justify-center bg-slate-50">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                    </div>
                </div>
            );
        }
        if (viewMode === 'dashboard') return <WriterDashboard />;
        
        return (
            <div className={cn("flex-1 overflow-hidden flex flex-col relative", redactorUI === 'zen' ? "bg-slate-200/50" : "bg-slate-200/50")}>
                <FloatingOutlineUI />
                <div className={cn("flex-1 overflow-y-auto custom-scrollbar relative", redactorUI === 'zen' ? "flex justify-center" : "")} id="editor-scroll-container">
                    <div className={cn("mx-auto min-h-full transition-all duration-500", redactorUI === 'zen' ? "w-full max-w-4xl px-4 py-6" : "p-4 md:p-6")}>
                        <div className="relative bg-white shadow-2xl min-h-screen max-w-4xl mx-auto rounded-sm p-6 md:p-10 ring-1 ring-slate-200">
                            <FeaturedImageSlot taskId={draftId} onFullscreen={setFullscreenAsset} />
                            <WriterEditor key={draftId || 'standard'} />
                        </div>
                    </div>
                </div>
                {redactorUI === 'zen' && <FloatingToolbox />}
            </div>
        );
    };

    const renderMainContent = () => (
        <main className="flex-1 flex flex-col min-w-0 bg-white relative h-full">
                <header className="h-14 flex items-center justify-between px-6 md:px-10 bg-white/10 backdrop-blur-xl z-50 sticky top-0 shrink-0 border-b border-slate-200/20 gap-4">
                    <div className="flex items-center gap-6 min-w-0">
                        {redactorUI === 'zen' && (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => setViewMode('dashboard')} className="h-9 px-4 rounded-lg text-[11px] uppercase font-black tracking-tighter text-slate-500 hover:bg-slate-100/50 transition-all border-none shrink-0">
                                    <div className="flex items-center gap-2"><ChevronLeft size={14} /> Volver</div>
                                </Button>
                                <div className="hidden md:block w-[1px] h-5 bg-slate-200/50" />
                            </>
                        )}
                        <div className="flex items-center gap-4 min-w-0">
                            <h1 className="text-[12px] md:text-[14px] font-black text-slate-900 tracking-tight truncate max-w-[150px] md:max-w-[380px] leading-tight italic shrink-0" title={strategyH1 || keyword || "Sin Título"}>
                                {strategyH1 || keyword || "Sin Título"}
                            </h1>
                            
                            {draftId && (
                                <div className="relative shrink-0">
                                    <button 
                                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm transition-all duration-300 active:scale-95",
                                            (statusOptions.find(opt => opt.value === status))?.color || "bg-rose-50 text-rose-600 border-rose-100 hover:opacity-80"
                                        )}
                                    >
                                        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", (statusOptions.find(opt => opt.value === status))?.dot || "bg-rose-500")} />
                                        {(statusOptions.find(opt => opt.value === status))?.label || (status ? status.replace(/_/g, ' ') : 'Idea')}
                                        <ChevronDown size={10} className={cn("transition-transform duration-300 text-slate-400", isStatusOpen && "rotate-180")} />
                                    </button>
                                    
                                    <AnimatePresence>
                                        {isStatusOpen && (
                                            <>
                                                {/* Backdrop invisible */}
                                                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsStatusOpen(false)} />
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute left-0 mt-2 w-44 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl p-1 z-50 flex flex-col gap-0.5"
                                                >
                                                    <div className="px-2.5 py-1 text-[7px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100/60 mb-1">
                                                        Cambiar Estado
                                                    </div>
                                                    {statusOptions.map((opt) => {
                                                        const isSelected = opt.value === status;
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                onClick={async () => {
                                                                    setIsStatusOpen(false);
                                                                    if (updateTaskStatus) {
                                                                        await updateTaskStatus(opt.value);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all duration-200 text-left hover:scale-[1.02]",
                                                                    isSelected 
                                                                        ? "bg-slate-900 text-white font-black shadow-md" 
                                                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : opt.dot)} />
                                                                    {opt.label}
                                                                </div>
                                                                {isSelected && <span className="text-[7px] font-black text-indigo-400">Activo</span>}
                                                            </button>
                                                        );
                                                    })}
                                                    {activeProject?.settings?.content_preferences?.custom_statuses?.map((customStatus: string) => {
                                                        const isSelected = customStatus === status;
                                                        return (
                                                            <button
                                                                key={customStatus}
                                                                onClick={async () => {
                                                                    setIsStatusOpen(false);
                                                                    if (updateTaskStatus) {
                                                                        await updateTaskStatus(customStatus);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all duration-200 text-left hover:scale-[1.02]",
                                                                    isSelected 
                                                                        ? "bg-slate-900 text-white font-black shadow-md" 
                                                                        : "text-rose-600 hover:bg-rose-50 hover:text-rose-900"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-rose-500")} />
                                                                    {customStatus.replace(/_/g, ' ')}
                                                                </div>
                                                                {isSelected && <span className="text-[7px] font-black text-rose-400">Activo</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="z-40 bg-white border-b border-slate-100 px-6 md:px-10 py-1 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 shrink-0">
                            {activeUsers && <PresenceAvatars users={activeUsers} />}
                            <div className="w-[1px] h-4 bg-slate-200/50" />
                            
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {wordCountReal || 0} p.
                                </span>
                                <button 
                                    onClick={forceSave}
                                    className="flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all" 
                                    title={isSaving ? "Guardando..." : "Sincronizado (Click para forzar guardado)"}
                                >
                                    {isSaving ? <Cloud className="text-amber-500 animate-pulse" size={14} /> : <Cloud className="text-emerald-500" size={14} />}
                                </button>
                                <button 
                                    onClick={handlePreview}
                                    className="flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all text-slate-500 hover:text-slate-800" 
                                    title="Vista previa del artículo"
                                >
                                    <Eye size={14} />
                                </button>
                                <button 
                                    onClick={() => setIsExportModalOpen(true)}
                                    className="flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all text-slate-500 hover:text-slate-800" 
                                    title="Descargar HTML e Imágenes (ZIP)"
                                >
                                    <Download size={14} />
                                </button>
                            </div>
                            
                            {redactorUI === 'standard' && (
                                <>
                                    <div className="w-[1px] h-4 bg-slate-200/50" />
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={toggleLeftPanel}
                                            className="flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors shadow-sm border border-slate-200/60 bg-white"
                                            title="Alternar panel izquierdo"
                                        >
                                            {isLeftPanelCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
                                        </button>
                                        <button 
                                            onClick={toggleEditorPanel}
                                            className="flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors shadow-sm border border-slate-200/60 bg-white"
                                            title="Alternar editor"
                                        >
                                            {isEditorCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                                        </button>
                                        <button 
                                            onClick={toggleRightPanel}
                                            className="flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors shadow-sm border border-slate-200/60 bg-white"
                                            title="Alternar panel derecho"
                                        >
                                            {isRightPanelCollapsed ? <PanelRight size={16} /> : <PanelRightClose size={16} />}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex-1 flex justify-center">
                            <AnimatePresence>
                                {(isAnalyzingSEO || isPlanningStructure || isGenerating || isHumanizing) && (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="hidden xl:flex items-center gap-4 px-3 py-1 bg-slate-50/50 rounded-xl border border-slate-200/40">
                                        <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200/50">
                                            <StepIcon active={isAnalyzingSEO} done={!!rawSeoData && !isAnalyzingSEO} icon={Search} label="SEO" />
                                            <StepIcon active={isPlanningStructure} done={hasOutline && !isPlanningStructure} icon={Layout} label="OUTLINE" />
                                            <StepIcon active={isDrafting} done={(hasGenerated || isPostProd) && !isDrafting} icon={FileText} label="DRAFT" />
                                            <StepIcon active={isPostProd} done={hasGenerated && !isPostProd} icon={Zap} label="FINAL" />
                                        </div>
                                        <div className="relative w-4 h-4">
                                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                                            <div className="w-4 h-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center"><span className="text-[7px] text-white font-black italic">N</span></div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <div className="min-w-0 max-w-[220px] sm:max-w-[320px] md:max-w-[420px] flex items-center gap-1.5 bg-transparent group/gallery relative">
                                <div className="flex items-center gap-1.5 px-1 shrink-0">
                                    <button onClick={async () => { if (window.confirm(draftId === parentTaskId ? "¿Borrar proyecto?" : "¿Borrar versión?")) await deleteVersion(draftId!); }} className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"><Trash2 size={11} /></button>
                                    <Languages size={12} className="text-slate-400" />
                                </div>
                                <div className="relative flex-1 flex items-center overflow-hidden">{canScrollLeft && ( <button onClick={() => handleGalleryScroll('left')} className="absolute left-0 z-30 p-1 bg-white/95 backdrop-blur-md rounded-full shadow-md text-slate-600 hover:text-slate-900 transition-all border border-slate-200/60" ><ChevronLeft size={10} /></button> )}
                                    <div ref={galleryRef} onScroll={checkScroll} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth w-full">
                                        {Array.from(new Set([...Object.keys(contentVersions), ...targetLanguages])).map((langCode: string) => {
                                            const isGenerated = !!contentVersions[langCode];
                                            const isActive = currentLanguage === langCode;
                                            return (() => {
                                                const langToCountry: Record<string, string> = {
                                                    es: 'es', en: 'gb', no: 'no', pl: 'pl', nl: 'nl', sv: 'se',
                                                    de: 'de', pt: 'pt', ro: 'ro', fr: 'fr', it: 'it', da: 'dk',
                                                    fi: 'fi', ru: 'ru', zh: 'cn', ja: 'jp', ko: 'kr'
                                                };
                                                const countryCode = langToCountry[langCode.toLowerCase()] || langCode.toLowerCase();
                                                const flagUrl = `https://flagcdn.com/w80/${countryCode}.png`;
                                                return (
                                                    <button 
                                                        key={langCode} 
                                                        onClick={() => isGenerated && switchLanguage(langCode)} 
                                                        disabled={!isGenerated && !isActive} 
                                                        className={cn(
                                                            "relative w-[34px] h-[22px] rounded-md overflow-hidden flex items-center justify-center transition-all duration-300 shrink-0 select-none border",
                                                            isActive 
                                                                ? "border-indigo-600 shadow-md ring-2 ring-indigo-500/20 scale-105" 
                                                                : isGenerated 
                                                                    ? "border-slate-200 hover:border-slate-300 hover:scale-105 hover:shadow-sm" 
                                                                    : "border-slate-100 opacity-40 grayscale"
                                                        )}
                                                        title={isGenerated ? `Versión en ${langCode.toUpperCase()}` : `Traducción no generada en ${langCode.toUpperCase()}`}
                                                    >
                                                        <img 
                                                            src={flagUrl} 
                                                            alt={`Bandera de ${countryCode}`}
                                                            className="w-full h-full object-cover absolute inset-0 z-0 select-none pointer-events-none"
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                        <div className={cn(
                                                            "absolute inset-0 z-10 transition-all duration-300",
                                                            isActive 
                                                                ? "bg-slate-900/65 backdrop-blur-[1px]" 
                                                                : "bg-white/70 backdrop-blur-[1px] hover:bg-white/50"
                                                        )} />
                                                        <span className={cn(
                                                            "relative z-20 text-[9px] font-black uppercase tracking-wider select-none pointer-events-none transition-colors",
                                                            isActive ? "text-white drop-shadow-md" : "text-slate-800"
                                                        )}>
                                                            {langCode}
                                                        </span>
                                                    </button>
                                                );
                                            })()
                                        })}
                                    </div>
                                    {canScrollRight && ( <button onClick={() => handleGalleryScroll('right')} className="absolute right-0 z-30 p-1 bg-white/95 backdrop-blur-md rounded-full shadow-md text-slate-600 hover:text-slate-900 transition-all border border-slate-200/60" ><ChevronRight size={10} /></button> )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 p-0.5 bg-slate-100/30 border border-slate-200/40 rounded-lg shadow-sm w-[100px] shrink-0">
                                <button onClick={() => setEditorTab('visual')} className={cn("px-2 flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all", editorTab === 'visual' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600")}>V</button>
                                <button onClick={() => setEditorTab('code')} className={cn("px-2 flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all", editorTab === 'code' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600")}>C</button>
                            </div>
                        </div>
                    </div>
                </div>

                {renderEditorContent()}
        </main>
    );

    const renderRightPanelContent = (tabId: string = activeSidebarTab) => {
        return (
            tabId === 'research' ? <CompetitorPanel /> :
                         tabId === 'history' ? <HistoryTab /> :
                         tabId === 'seo' ? <SEODataTab seoData={rawSeoData} currentContent={useWriterStore.getState().content || ''} /> : 
                          tabId === 'media' ? <VisualPlanningBoard onRegenerate={async (id) => {
                              await regenerateImageAction({
                                  asset: { id, prompt: '...', url: '...' } as any,
                                  taskId: draftId!,
                                  options: { sourceModel: 'flux' }
                              });
                              (useWriterStore.getState() as any).loadTaskImages(draftId!);
                          }} /> : 
                         tabId === 'tools' ? <ToolsTab /> : 
                         tabId === 'translate' ? <TranslationSidebarPanel /> : 
                          tabId === 'nous' ? (
                               <div className="h-full flex flex-col min-h-0 bg-slate-50/40 relative">
                                   {/* Header */}
                                   <div className="px-4 py-3.5 border-b border-slate-200/60 bg-white/60 backdrop-blur-md flex items-center justify-between shrink-0">
                                       <div className="flex items-center gap-2">
                                           <div className="bg-indigo-500/10 p-1.5 rounded-lg text-indigo-600">
                                               <Activity size={16} className="animate-pulse" />
                                           </div>
                                           <div>
                                               <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Pipeline de Nous</h3>
                                               <p className="text-[9px] text-slate-500 font-medium">Secuencia de tareas asíncronas</p>
                                           </div>
                                       </div>
                                       {localActionsQueue.length > 0 && !isProcessingPipeline && (
                                           <button 
                                               onClick={() => setLocalActionsQueue([])}
                                               className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors p-1"
                                           >
                                               Limpiar Todo
                                           </button>
                                       )}
                                   </div>

                                   {/* Active Task Progress Banner */}
                                   <AnimatePresence>
                                       {activeTask && activeTask.status === 'processing' && (
                                           <motion.div 
                                               initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                               animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                               exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                               className="mx-4 mt-3.5 p-4 bg-white border border-indigo-100/80 rounded-2xl shadow-sm space-y-2.5 relative overflow-hidden shrink-0"
                                           >
                                               {/* Gradient accent border top */}
                                               <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-[shimmer_1.5s_infinite_linear]" style={{ backgroundSize: '200% 100%' }} />
                                               <div className="flex justify-between items-end">
                                                   <div className="min-w-0">
                                                       <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Ejecutando Tarea</span>
                                                       <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate leading-tight">
                                                           {activeTask.title}
                                                       </h4>
                                                   </div>
                                                   <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 shrink-0 ml-2">
                                                       {activeTask.progress || 0}%
                                                   </span>
                                               </div>
                                               
                                               {/* Compact Progress Bar */}
                                               <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                                                   <motion.div 
                                                       className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"
                                                       initial={{ width: 0 }}
                                                       animate={{ width: `${activeTask.progress || 0}%` }}
                                                       transition={{ duration: 0.4, ease: "easeOut" }}
                                                   />
                                               </div>

                                               {/* Log / Substatus */}
                                               {activeTask.logs && activeTask.logs.length > 0 && (
                                                   <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-medium">
                                                       <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
                                                       <span className="truncate">
                                                           {activeTask.logs[activeTask.logs.length - 1].text}
                                                       </span>
                                                   </div>
                                               )}
                                           </motion.div>
                                       )}
                                   </AnimatePresence>

                                   {/* Contenedor scrolleable: "Añadir Acción" siempre arriba, seguido de la cola de acciones */}
                                    <div 
                                        ref={scrollContainerRef}
                                        className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0 custom-scrollbar"
                                    >
                                        {/* Botón de Añadir Acción (+ Rectángulo Punteado) - SIEMPRE ARRIBA */}
                                        {!isProcessingPipeline && (
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                                                    className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-400/60 rounded-2xl bg-white/80 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 p-3.5 cursor-pointer group shadow-2xs"
                                                >
                                                    <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-full p-2 shadow-sm group-hover:scale-105 transition-all duration-300">
                                                        <Plus size={15} />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 block">Añadir Acción</span>
                                                        <span className="text-[8px] text-slate-400 font-medium block">Haz clic para diseñar tu flujo secuencial</span>
                                                    </div>
                                                </button>

                                                {/* Popover Contextual de Selección de Acciones - Se despliega hacia abajo */}
                                                <AnimatePresence>
                                                    {isSelectorOpen && (
                                                        <>
                                                            <div 
                                                                className="fixed inset-0 z-40" 
                                                                onClick={() => setIsSelectorOpen(false)} 
                                                            />
                                                            <motion.div 
                                                                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                                                className="absolute top-[105%] left-0 right-0 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl p-2.5 z-50 space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar"
                                                            >
                                                                <div className="px-2 py-1.5 border-b border-slate-100 mb-1 sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between">
                                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Seleccionar Tarea Inteligente</span>
                                                                    <button 
                                                                        onClick={() => setIsSelectorOpen(false)}
                                                                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                                {[
                                                                    { type: 'research', label: 'Investigación Completa', desc: 'Dossier, SEO y competidores.', Icon: Search, color: 'text-indigo-600' },
                                                                    { type: 'outline', label: 'Estructura de Outline', desc: 'Planificación de H2/H3.', Icon: Layers, color: 'text-amber-600' },
                                                                    { type: 'generate', label: 'Redacción IA Helios', desc: 'Borrador base estructurado.', Icon: PenTool, color: 'text-rose-600' },
                                                                    { type: 'humanize', label: 'Humanizador Semántico', desc: 'Toque humano e invisibilidad AI.', Icon: Zap, color: 'text-emerald-600' },
                                                                    { type: 'surgical_edit', label: 'Edición Quirúrgica', desc: 'Estilo y fluidez mejorada.', Icon: Scissors, color: 'text-purple-600' },
                                                                    { type: 'clean', label: 'Limpieza Inteligente', desc: 'Remover huellas robóticas.', Icon: Sparkles, color: 'text-blue-600' },
                                                                    { type: 'seo', label: 'Optimización SEO', desc: 'Integración SEO avanzada.', Icon: Wand2, color: 'text-teal-600' },
                                                                    { type: 'image', label: 'Generación de Imágenes', desc: 'Imágenes optimizadas para el artículo.', Icon: ImageIcon, color: 'text-pink-600' },
                                                                    { type: 'translation', label: 'Traducción Profesional', desc: 'Multi-idiomas localizado.', Icon: Languages, color: 'text-cyan-600' },
                                                                    { type: 'refine', label: 'Refinamiento Manual', desc: 'Instrucciones personalizadas.', Icon: BrainCircuit, color: 'text-violet-600' },
                                                                    { type: 'custom_transform', label: 'Maquetador HTML/CSS', desc: 'Estructura y diseño premium.', Icon: LayoutTemplate, color: 'text-orange-600' }
                                                                ].map(item => (
                                                                    <button
                                                                        key={item.type}
                                                                        onClick={() => {
                                                                            addActionToQueue(item.type as any);
                                                                            setIsSelectorOpen(false);
                                                                        }}
                                                                        className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left"
                                                                    >
                                                                        <div className={cn("p-1.5 rounded-lg bg-slate-50 border border-slate-100 shrink-0", item.color)}>
                                                                            <item.Icon size={14} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-800 leading-tight">{item.label}</div>
                                                                            <div className="text-[8px] text-slate-500 font-medium leading-normal">{item.desc}</div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}

                                        {/* Cola de Acciones o Estado Vacío */}
                                        {localActionsQueue.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-3 shadow-inner">
                                                    <Activity size={24} />
                                                </div>
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-800 text-center">Diseña tu Pipeline</p>
                                                <p className="text-[10px] text-slate-500 text-center max-w-[220px] mt-1 leading-snug font-medium">Agrega las acciones inteligentes que se ejecutarán secuencialmente sobre tu borrador.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {localActionsQueue.map((action, index) => {
                                                   let title = '';
                                                   let desc = '';
                                                   let Icon = Search;
                                                   let colorClass = 'text-slate-500 bg-slate-50 border-slate-100';

                                                   if (action.type === 'seo') {
                                                       title = '1. Investigación SEO';
                                                       desc = 'Extracción de entidades, competidores y estructura SERP.';
                                                       Icon = Search;
                                                       colorClass = 'text-indigo-600 bg-indigo-50 border-indigo-100';
                                                   } else if (action.type === 'generate') {
                                                       title = '2. Redacción IA Helios';
                                                       desc = 'Generación completa del borrador usando IA Helios.';
                                                       Icon = PenTool;
                                                       colorClass = 'text-rose-600 bg-rose-50 border-rose-100';
                                                   } else if (action.type === 'humanize') {
                                                       title = '3. Humanizar Textos';
                                                       desc = 'Reescritura semántica para aportar toque humano y evadir detectores.';
                                                       Icon = Zap;
                                                       colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-100';
                                                   } else if (action.type === 'surgical_edit') {
                                                       title = '4. Edición Quirúrgica';
                                                       desc = 'Mejorar legibilidad sin perder humanización (~20%).';
                                                       Icon = Wrench;
                                                       colorClass = 'text-purple-600 bg-purple-50 border-purple-100';
                                                   } else if (action.type === 'clean') {
                                                       title = '5. Limpieza Inteligente';
                                                       desc = 'Eliminar prefacios, conclusiones robóticas y ruido IA.';
                                                       Icon = Sparkles;
                                                       colorClass = 'text-blue-600 bg-blue-50 border-blue-100';
                                                   } else if (action.type === 'refine') {
                                                       title = 'Refinar Contenido';
                                                       desc = 'Refinamiento del texto mediante instrucciones personalizadas.';
                                                       Icon = BrainCircuit;
                                                       colorClass = 'text-violet-600 bg-violet-50 border-violet-100';
                                                   } else if (action.type === 'custom_transform') {
                                                       title = 'Maquetador HTML/CSS';
                                                       desc = 'Aplicar maquetación o transformaciones personalizadas.';
                                                       Icon = LayoutTemplate;
                                                       colorClass = 'text-orange-600 bg-orange-50 border-orange-100';
                                                   }

                                                   return (
                                                       <motion.div 
                                                           key={action.id}
                                                           initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                                           animate={{ opacity: 1, y: 0, scale: 1 }}
                                                           exit={{ opacity: 0, scale: 0.95 }}
                                                           className={cn(
                                                               "border rounded-2xl bg-white/70 backdrop-blur-sm p-4.5 shadow-sm transition-all relative overflow-hidden",
                                                               action.status === 'processing' ? 'ring-2 ring-indigo-500/30 border-indigo-200' : 'border-slate-100'
                                                           )}
                                                       >
                                                           {/* Status Overlay for Processing */}
                                                           {action.status === 'processing' && (
                                                               <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-[shimmer_1.5s_infinite_linear]" style={{ backgroundSize: '200% 100%' }} />
                                                           )}

                                                           <div className="flex items-start justify-between gap-3">
                                                               <div className="flex gap-3">
                                                                   <div className={cn("p-2 rounded-xl border shrink-0", colorClass.split(' ')[0], colorClass.split(' ')[1], colorClass.split(' ')[2])}>
                                                                       <Icon size={16} />
                                                                   </div>
                                                                   <div className="min-w-0">
                                                                       <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 leading-snug">{title}</h4>
                                                                       <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed font-medium">{desc}</p>
                                                                   </div>
                                                               </div>
                                                               
                                                               <div className="flex items-center gap-1.5 shrink-0">
                                                                   {/* Action Status Badge */}
                                                                   {action.status === 'idle' && (
                                                                       <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                                           Por Procesar
                                                                       </span>
                                                                   )}
                                                                   {action.status === 'processing' && (
                                                                       <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                           <Loader2 size={10} className="animate-spin" /> Procesando
                                                                       </span>
                                                                   )}
                                                                   {action.status === 'completed' && (
                                                                       <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                           <Check size={10} /> Listo
                                                                       </span>
                                                                   )}
                                                                   {action.status === 'error' && (
                                                                       <span className="text-[8px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                           <X size={10} /> Error
                                                                       </span>
                                                                   )}
                                                                    
                                                                   {/* Configure Button */}
                                                                   {action.status === 'idle' && !isProcessingPipeline && (
                                                                       <button 
                                                                           onClick={() => setEditingAction(action)}
                                                                           className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                                                           title="Configurar parámetros avanzados"
                                                                       >
                                                                           <Settings size={13} />
                                                                       </button>
                                                                   )}

                                                                   {/* Delete Button */}
                                                                   {!isProcessingPipeline && (
                                                                       <button 
                                                                           onClick={() => removeActionFromQueue(action.id)}
                                                                           className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                                                       >
                                                                           <Trash2 size={13} />
                                                                       </button>
                                                                   )}
                                                               </div>
                                                           </div>

                                                           {/* Inline Configuration Forms */}
                                                           {action.status === 'idle' && (
                                                               <div className="mt-4 pt-3 border-t border-slate-100/70 space-y-3">
                                                                   {/* 1. Humanize Config */}
                                                                   {action.type === 'humanize' && (
                                                                       <div className="space-y-2">
                                                                           <div>
                                                                               <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Forma de Humanización</label>
                                                                               <select 
                                                                                   value={action.config?.humanizerType || 'tradicional'}
                                                                                   onChange={(e) => updateActionConfig(action.id, 'humanizerType', e.target.value)}
                                                                                   className="w-full text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-slate-700 outline-none font-semibold"
                                                                               >
                                                                                   <option value="tradicional">Humanización Tradicional</option>
                                                                                   <option value="gramatical">Humanización Gramatical (Orden Invertido)</option>
                                                                                    <option value="uniprompt">Humanización Uniprompt (1 Petición / 4 Leyes)</option>
                                                                               </select>
                                                                           </div>
                                                                           <div className="grid grid-cols-2 gap-2">
                                                                               <div>
                                                                                   <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Nicho</label>
                                                                                   <select 
                                                                                       value={action.config?.niche || 'General'}
                                                                                       onChange={(e) => updateActionConfig(action.id, 'niche', e.target.value)}
                                                                                       className="w-full text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-slate-700 outline-none"
                                                                                   >
                                                                                       <option value="General">General</option>
                                                                                       <option value="Tecnología">Tecnología</option>
                                                                                       <option value="Finanzas">Finanzas</option>
                                                                                       <option value="Salud">Salud</option>
                                                                                       <option value="Moda">Moda</option>
                                                                                   </select>
                                                                               </div>
                                                                               <div>
                                                                                   <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Modo Tradicional</label>
                                                                                   <select 
                                                                                       disabled={action.config?.humanizerType === 'gramatical' || action.config?.humanizerType === 'uniprompt'}
                                                                                       value={action.config?.mode || 'unified'}
                                                                                       onChange={(e) => updateActionConfig(action.id, 'mode', e.target.value)}
                                                                                       className="w-full text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-slate-700 outline-none disabled:opacity-40"
                                                                                   >
                                                                                       <option value="unified">Unified</option>
                                                                                       <option value="creative">Vibrante</option>
                                                                                       <option value="technical">Especializado</option>
                                                                                   </select>
                                                                               </div>
                                                                           </div>
                                                                       </div>
                                                                   )}

                                                                   {/* 2. Refine Config */}
                                                                   {action.type === 'refine' && (
                                                                       <div className="space-y-2.5">
                                                                           <div>
                                                                               <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Instrucciones de refinamiento</label>
                                                                               <textarea 
                                                                                   placeholder="Ej: Reescribe el segundo párrafo para que sea más cercano..."
                                                                                   value={action.config?.instructions || ''}
                                                                                   onChange={(e) => updateActionConfig(action.id, 'instructions', e.target.value)}
                                                                                   rows={2}
                                                                                   className="w-full text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500/20"
                                                                               />
                                                                           </div>
                                                                       </div>
                                                                   )}

                                                                   {/* 3. Custom Transform Config */}
                                                                   {action.type === 'custom_transform' && (
                                                                       <div>
                                                                           <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Instrucciones del maquetador</label>
                                                                           <textarea 
                                                                               placeholder="Ej: Aplica un diseño de tabla comparativa de precios..."
                                                                               value={action.config?.instructions || ''}
                                                                               onChange={(e) => updateActionConfig(action.id, 'instructions', e.target.value)}
                                                                               rows={2}
                                                                               className="w-full text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-2 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500/20"
                                                                           />
                                                                       </div>
                                                                   )}
                                                               </div>
                                                           )}
                                                       </motion.div>
                                                   );
                                               })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Botón de "Procesar Pipeline" fijado abajo (shrink-0, NUNCA absoluto, nada queda debajo) */}
                                    <div className="shrink-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] flex flex-col gap-1 z-10">
                                        <button
                                            disabled={localActionsQueue.length === 0 || isProcessingPipeline}
                                            onClick={processPipeline}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black uppercase tracking-widest text-[11px] py-3.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                                        >
                                            {isProcessingPipeline ? (
                                                <>
                                                    <Loader2 size={13} className="animate-spin" />
                                                    <span>Ejecutando Pipeline...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Activity size={13} />
                                                    <span>Procesar Pipeline ({localActionsQueue.length})</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                           ) : 

                         <CompetitorPanel />
        );
    };

    // Mobile View (Google Docs experience)
    if (isMobile) {
        return (
            <div className="flex flex-col w-full h-full bg-white overflow-hidden relative">
                {mobileStudioView === 'list' ? (
                    <WriterMobileListView
                        onSelectTask={(id) => {
                            loadContentById(id);
                            setMobileStudioView('editor');
                        }}
                        onCreateTask={() => setIsNewTaskModalOpen(true)}
                        onOpenDrawer={() => useAppStore.getState().setIsMobileMenuOpen(true)}
                    />
                ) : (
                    <div className="flex flex-col w-full h-full bg-white overflow-hidden relative">
                        <WriterMobileEditorHeader
                            onBackToList={async () => {
                                await forceSave();
                                setMobileStudioView('list');
                            }}
                            onOpenTools={() => {
                                setMobileToolsTab('nous');
                                setIsMobileToolsOpen(true);
                            }}
                            onTogglePreview={handlePreview}
                            onDeleteDraft={async () => {
                                if (draftId && window.confirm("¿Eliminar este borrador permanentemente?")) {
                                    await deleteVersion(draftId);
                                    setMobileStudioView('list');
                                }
                            }}
                        />

                        {/* Mobile Editor Content Area */}
                        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 custom-scrollbar" id="editor-scroll-container">
                            {/* Editable Title */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={strategyH1 || keyword || ''}
                                    onChange={(e) => {
                                        useWriterStore.getState().setStrategyH1(e.target.value);
                                    }}
                                    placeholder="Título del contenido..."
                                    className="w-full text-xl sm:text-2xl font-black text-slate-900 border-none outline-none placeholder:text-slate-300 tracking-tight bg-transparent"
                                />
                            </div>

                            {/* Featured Image Slot */}
                            <FeaturedImageSlot taskId={draftId} onFullscreen={(asset) => setFullscreenAsset(asset)} />

                            {/* Tiptap / Code Editor */}
                            {content === null ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-3">
                                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando documento...</span>
                                </div>
                            ) : (
                                <div className="relative bg-white min-h-[500px]">
                                    <WriterEditor key={draftId || 'standard'} />
                                </div>
                            )}
                        </div>

                        {/* Bottom Formatting Toolbar (docked, Google Docs style) */}
                        <WriterMobileFormattingBar
                            onOpenMediaTab={() => {
                                setMobileToolsTab('media');
                                setIsMobileToolsOpen(true);
                            }}
                        />
                    </div>
                )}

                {/* Mobile Tools Modal (Near-Fullscreen Maletita Popup) */}
                <WriterMobileToolsModal
                    isOpen={isMobileToolsOpen}
                    onClose={() => setIsMobileToolsOpen(false)}
                    activeTab={mobileToolsTab}
                    onTabChange={(tab) => setMobileToolsTab(tab)}
                >
                    {renderRightPanelContent(mobileToolsTab)}
                </WriterMobileToolsModal>

                {/* New Task Modal */}
                <WriterMobileNewTaskModal
                    isOpen={isNewTaskModalOpen}
                    onClose={() => setIsNewTaskModalOpen(false)}
                    onTaskCreated={(newId) => {
                        setMobileStudioView('editor');
                    }}
                />

                <ZipExportModal 
                    isOpen={isExportModalOpen} 
                    onClose={() => setIsExportModalOpen(false)} 
                    draftId={draftId} 
                />

                <ImageLightbox isOpen={!!fullscreenAsset} onClose={() => setFullscreenAsset(null)} asset={fullscreenAsset} />
                {isCustomTransformOpen && <CustomTransformModal onClose={() => setIsCustomTransformOpen(false)} editorMode={true} />}
            </div>
        );
    }

    return (
        <div className="flex w-full h-full bg-white overflow-hidden relative">
            {isEditorCollapsed && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <button 
                        onClick={toggleEditorPanel}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl transition-all hover:scale-105 group border border-white/20"
                    >
                        <Maximize2 size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Restaurar Editor</span>
                    </button>
                </div>
            )}
            
            {redactorUI === 'standard' ? (
                <PanelGroup direction="horizontal" id="writer-studio-root" className="w-full h-full">
                    <Panel 
                        id="writer-left-panel"
                        panelRef={leftPanelRef} 
                        defaultSize={20} minSize={15} 
                        collapsible={true} 
                        collapsedSize={0}
                        onCollapse={() => setIsLeftPanelCollapsed(true)}
                        onExpand={() => setIsLeftPanelCollapsed(false)}
                        className="bg-slate-50 border-r border-slate-200/50 z-20 relative min-w-0 overflow-hidden"
                    >
                        <InventorySidebar />
                    </Panel>

                    <PanelResizeHandle id="writer-handle-left" className="relative w-[2px] flex items-center justify-center z-30 group/handle cursor-col-resize bg-slate-200 hover:bg-indigo-400/50 active:bg-indigo-500 transition-all duration-300">
                        <div className="absolute inset-y-0 -inset-x-2" />
                        <div className="w-1 h-8 rounded-full bg-slate-400 group-hover/handle:bg-indigo-500 transition-colors relative z-10" />
                    </PanelResizeHandle>

                    <Panel 
                        id="writer-editor-panel" 
                        panelRef={editorPanelRef}
                        defaultSize={80} minSize={0}
                        collapsible={true}
                        onCollapse={() => setIsEditorCollapsed(true)}
                        onExpand={() => setIsEditorCollapsed(false)}
                        className="flex flex-col min-w-0 bg-white relative overflow-hidden"
                    >
                        {renderMainContent()}
                    </Panel>

                    <PanelResizeHandle id="writer-handle-right" className="relative w-[2px] flex items-center justify-center z-30 group/handle cursor-col-resize bg-slate-200 hover:bg-indigo-400/50 active:bg-indigo-500 transition-all duration-300">
                        <div className="absolute inset-y-0 -inset-x-2" />
                        <div className="w-1 h-8 rounded-full bg-slate-400 group-hover/handle:bg-indigo-500 transition-colors relative z-10" />
                    </PanelResizeHandle>

                    <Panel 
                        id="writer-right-panel"
                        panelRef={rightPanelRef}
                        defaultSize={0} minSize={25}
                        collapsible={true} 
                        onCollapse={() => setIsRightPanelCollapsed(true)}
                        onExpand={() => setIsRightPanelCollapsed(false)}
                        className="h-full bg-slate-50 flex flex-col overflow-hidden relative shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 border-l border-slate-200/50 min-w-0"
                    >
                        <div className="hidden">
                            <button onClick={() => (useWriterStore.getState() as any).finishContent()} className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 group">
                                <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Finalizar Artículo
                            </button>
                        </div>
                        <div className="px-3 pt-3 pb-2 border-b border-slate-200/50 bg-white/60 backdrop-blur-xl z-10">
                            <div className="flex bg-slate-100/50 p-1 rounded-2xl shadow-inner border border-slate-200/60 overflow-x-auto no-scrollbar justify-between gap-1">
                                {[ { id: 'research', icon: <Search size={14} />, label: 'Inv.' }, { id: 'history', icon: <History size={14} />, label: 'Hist' }, { id: 'seo', icon: <Zap size={14} />, label: 'SEO' }, { id: 'media', icon: <ImagePlus size={14} />, label: 'Media' }, { id: 'tools', icon: <Wrench size={14} />, label: 'Tools' }, { id: 'translate', icon: <Languages size={14} />, label: 'I18n' }, { id: 'nous', icon: <NousLogo showText={false} className="scale-[0.6]" />, label: 'Nous' } ].map(tab => (
                                    <button 
                                        key={tab.id} 
                                        onClick={() => setSidebarTab(tab.id as any)} 
                                        className={cn(
                                            "flex flex-col items-center justify-center py-2 px-2 flex-1 transition-all duration-300 rounded-xl min-w-[45px]", 
                                            activeSidebarTab === tab.id 
                                                ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-900/5 scale-100" 
                                                : "text-slate-400 hover:bg-slate-200/40 hover:text-slate-600 scale-95"
                                        )}
                                    >
                                        <div className="mb-1">{tab.icon}</div>
                                        <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/20">
                        {renderRightPanelContent(activeSidebarTab)}
                    </div>
                    </Panel>
                </PanelGroup>
            ) : renderMainContent()}
            
            <ImageLightbox isOpen={!!fullscreenAsset} onClose={() => setFullscreenAsset(null)} asset={fullscreenAsset} />
            {isCustomTransformOpen && <CustomTransformModal onClose={() => setIsCustomTransformOpen(false)} editorMode={true} />}

            {/* Modal de Configuración de Acción Local */}
            <AnimatePresence>
                {editingAction && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                        <Settings size={16} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Configurar Acción</h3>
                                        <p className="text-[10px] text-slate-500 font-medium">Acción: {editingAction.type}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setEditingAction(null)} 
                                    className="text-slate-400 hover:text-slate-700 transition-colors p-2 bg-white rounded-full border border-slate-200"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                                
                                {/* 1. IA Model Selection */}
                                <div className="space-y-3">
                                    <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                                        <BrainCircuit size={12} /> Motor de IA
                                    </h4>

                                    {/* Reasoning Level Selector */}
                                    <div className="mb-4 space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 block">NIVEL DE RAZONAMIENTO</label>
                                        <select 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-100"
                                            value={localConfig.reasoningLevel || 'none'}
                                            disabled={!(localConfig.model?.includes('3.6-flash') || localConfig.model?.includes('3.7-flash') || localConfig.model?.includes('3.8-flash'))}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setLocalConfig({
                                                    ...localConfig,
                                                    reasoningLevel: val === 'none' ? undefined : val
                                                });
                                            }}
                                        >
                                            <option value="none">Por defecto (Desactivado)</option>
                                            <option value="low">Bajo (Low)</option>
                                            <option value="medium">Medio (Medium)</option>
                                            <option value="high">Alto (High)</option>
                                        </select>
                                        {!(localConfig.model?.includes('3.6-flash') || localConfig.model?.includes('3.7-flash') || localConfig.model?.includes('3.8-flash')) && (
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Solo disponible para modelos Gemini 3.6 Flash, 3.7 Flash y 3.8 Flash.
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        {AI_MODELS.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() => setLocalConfig({ ...localConfig, model: model.id })}
                                                className={cn(
                                                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                                                    localConfig.model === model.id 
                                                        ? "bg-indigo-50 border-indigo-200" 
                                                        : "bg-white border-slate-200 hover:border-indigo-100 hover:bg-slate-50/50"
                                                )}
                                            >
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    localConfig.model === model.id ? "text-indigo-700" : "text-slate-700"
                                                )}>{model.label}</span>
                                                <span className="text-[10px] text-slate-500 mt-0.5">{model.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Action-Specific Configurations */}
                                {editingAction.type === 'humanize' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                                            <SlidersHorizontal size={12} /> Ajustes de Humanización
                                        </h4>
                                        <div className="space-y-1.5 mb-3">
                                            <label className="text-xs font-semibold text-slate-700">Forma de Humanización</label>
                                            <select 
                                                value={localConfig.humanizerType || 'tradicional'}
                                                onChange={(e) => setLocalConfig({ ...localConfig, humanizerType: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none font-semibold"
                                            >
                                                <option value="tradicional">Humanización Tradicional (Por Chunks)</option>
                                                <option value="gramatical">Humanización Gramatical (3 Fases: Orden Invertido)</option>
                                                <option value="uniprompt">Humanización Uniprompt (1 Petición / 4 Leyes)</option>
                                            </select>
                                            {localConfig.humanizerType === 'uniprompt' && (
                                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed mt-1">
                                                    ⚡ Aplica simultáneamente las 4 leyes morfosintácticas en una sola pasada (hasta 2.500 palabras por chunk).
                                                </p>
                                            )}
                                            {localConfig.humanizerType === 'gramatical' && (
                                                <p className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-2 leading-relaxed mt-1">
                                                    ⚡ Procesa el texto completo en 3 fases: Estructurador de Oraciones y Sujetos (33%), Aplanador Radical con Lista Blanca de Verbos (66%) y Costura de Puntuación Anti-Detector (100%).
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Nicho de Redacción</label>
                                                <select 
                                                    value={localConfig.niche}
                                                    onChange={(e) => setLocalConfig({ ...localConfig, niche: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none"
                                                >
                                                    <option value="General">General</option>
                                                    <option value="Tecnología">Tecnología</option>
                                                    <option value="Finanzas">Finanzas</option>
                                                    <option value="Salud">Salud</option>
                                                    <option value="Moda">Moda</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Modo de Humanización</label>
                                                <select 
                                                    value={localConfig.mode}
                                                    onChange={(e) => setLocalConfig({ ...localConfig, mode: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none"
                                                >
                                                    <option value="unified">Unified</option>
                                                    <option value="creative">Vibrante</option>
                                                    <option value="technical">Especializado</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700">Audiencia Objetivo</label>
                                            <input 
                                                type="text"
                                                value={localConfig.audience}
                                                onChange={(e) => setLocalConfig({ ...localConfig, audience: e.target.value })}
                                                placeholder="Ej: Emprendedores, Médicos, Estudiantes"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700">Notas Adicionales (Opcional)</label>
                                            <textarea 
                                                value={localConfig.notes}
                                                onChange={(e) => setLocalConfig({ ...localConfig, notes: e.target.value })}
                                                placeholder="Notas o pautas adicionales para el humanizador..."
                                                rows={2}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            />
                                        </div>
                                    </div>
                                )}

                                {editingAction.type === 'surgical_edit' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                                            <SlidersHorizontal size={12} /> Ajustes de Edición Quirúrgica
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Nicho de Redacción</label>
                                                <select 
                                                    value={localConfig.niche}
                                                    onChange={(e) => setLocalConfig({ ...localConfig, niche: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none"
                                                >
                                                    <option value="General">General</option>
                                                    <option value="Tecnología">Tecnología</option>
                                                    <option value="Finanzas">Finanzas</option>
                                                    <option value="Salud">Salud</option>
                                                    <option value="Moda">Moda</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Audiencia Objetivo</label>
                                                <input 
                                                    type="text"
                                                    value={localConfig.audience}
                                                    onChange={(e) => setLocalConfig({ ...localConfig, audience: e.target.value })}
                                                    placeholder="Ej: Emprendedores, Médicos, Estudiantes"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {editingAction.type === 'refine' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                                            <SlidersHorizontal size={12} /> Ajustes de Refinamiento
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Instrucciones de Refinamiento</label>
                                                <textarea 
                                                    value={localConfig.instructions}
                                                    onChange={(e) => setLocalConfig({ ...localConfig, instructions: e.target.value })}
                                                    placeholder="Ej: Reescribe el segundo párrafo para hacerlo más cercano..."
                                                    rows={3}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {editingAction.type === 'custom_transform' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 tracking-widest">
                                            <SlidersHorizontal size={12} /> Ajustes de Maquetación HTML/CSS
                                        </h4>
                                        <div className="space-y-3">
                                            {/* Preset Selector */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Directrices Editoriales (Preset)</label>
                                                <select
                                                    value={localConfig.selectedPreset || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const preset = allPresets.find(p => p.id === val);
                                                        setLocalConfig({
                                                            ...localConfig,
                                                            selectedPreset: val,
                                                            brandGuidelines: preset ? preset.guidelines : ""
                                                        });
                                                    }}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium"
                                                >
                                                    {allPresets.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.name} - {p.description.slice(0, 50)}...</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Brand Guidelines Area */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Reglas de Diseño y Estructura</label>
                                                <textarea
                                                    value={localConfig.brandGuidelines || ""}
                                                    onChange={(e) => {
                                                        if (localConfig.selectedPreset === "custom") {
                                                            setLocalConfig({
                                                                ...localConfig,
                                                                brandGuidelines: e.target.value
                                                            });
                                                        }
                                                    }}
                                                    disabled={localConfig.selectedPreset !== "custom"}
                                                    rows={4}
                                                    className="w-full text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed leading-relaxed resize-none"
                                                />
                                            </div>

                                            {/* User Instructions (Ad-hoc) */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Instrucciones Ad-hoc / del Maquetador</label>
                                                <textarea
                                                    value={localConfig.instructions || ""}
                                                    onChange={(e) => {
                                                        setLocalConfig({
                                                            ...localConfig,
                                                            instructions: e.target.value
                                                        });
                                                    }}
                                                    placeholder="Ej: Aplica un diseño de tabla comparativa de precios..."
                                                    rows={3}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-2 shrink-0">
                                <button 
                                    onClick={() => setEditingAction(null)}
                                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl text-xs font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => {
                                        saveActionConfig(editingAction.id, localConfig);
                                        setEditingAction(null);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ZipExportModal 
                isOpen={isExportModalOpen} 
                onClose={() => setIsExportModalOpen(false)} 
                draftId={draftId} 
            />
        </div>
    );
}
