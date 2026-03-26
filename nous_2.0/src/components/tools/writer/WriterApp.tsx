"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProjectStore } from '@/store/useProjectStore';
import { useWriterStore } from '@/store/useWriterStore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
// Keeping styles for gradual migration, but will replace usage with Tailwind
import { styles } from './styles';
import {
    Save, Cloud, Upload, Sparkles, Copy, FileText, Globe, Image as ImageIcon,
    Download, RefreshCw, Wand2, FileArchive, Search, Menu, ChevronLeft,
    ArrowRight, Settings, User, Radar, Edit, Check, Trash, Code, Link as LinkIcon,
    Plus, ExternalLink, Palette, ChevronDown, ChevronUp, Ghost, Loader2, FileUp,
    LayoutDashboard, Calendar
} from 'lucide-react';

import { MetadataField } from './components'; // Might need to inline this or update it
import {
    parseCSV, parseJSON, buildPrompt, generateArticleStream, suggestImagePlacements,
    generateRealImage, runSEOAnalysis, SEOAnalysisResult, ContentItem,
    ImageGenConfig, compositeWatermark, autoInterlink, runHumanizerPipeline,
    cleanAndFormatHtml, refineStyling, refineArticleContent, generateOutlineStrategy,
    searchMoreLinks, VisualResource, AIImageRequest, ArticleConfig, findCampaignAssets,
    generateSchemaMarkup, runSmartEditor, HumanizerConfig, exportToGoogleDoc, exportToGoogleSlides
} from './services';
import { WordPressService } from '@/lib/services/wordpress';
import TimeTracker from '@/components/dashboard/TimeTracker';
// Remove shared components imports if they don't exist in nous_2.0 yet or mock them
// import ShareModal from '../../shared/ShareModal';
// import PresenceAvatars from '../../shared/PresenceAvatars';

// Define Icons mapping for compatibility with rest of code while refactoring
const IconSave = Save;
const IconCloud = Cloud;
const IconUpload = Upload;
const IconSparkles = Sparkles;
const IconRadar = Radar;
const IconJson = Code;
const IconCopy = Copy;
const IconFile = FileText;
const IconSEO = Globe;
const IconImage = ImageIcon;
const IconDownload = Download;
const IconRefresh = RefreshCw;
const IconMagic = Wand2;
const IconZip = FileArchive;
const IconSearch = Search;
const IconMenu = Menu;
const IconChevronLeft = ChevronLeft;
const IconSettings = Settings;
const IconArrowRight = ArrowRight;
const IconUser = User;
const IconEdit = Edit;
const IconCheck = Check;
const IconTrash = Trash;
const IconLink = LinkIcon;
const IconPlus = Plus;
const IconExternal = ExternalLink;
const IconPalette = Palette;
const IconChevronDown = ChevronDown;
const IconChevronUp = ChevronUp;
const IconGhost = Ghost;
const IconFileUp = FileUp;
const LoadingSpinner = () => <Loader2 className="animate-spin" />;

// --- Simple Save Function ---
const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// --- Multi API Key Modal Component ---
const MultiKeyModal = ({ isOpen, onClose, onSave, currentKeys }: { isOpen: boolean, onClose: () => void, onSave: (keys: string[]) => void, currentKeys: string[] }) => {
    const [text, setText] = useState(currentKeys.join('\n'));

    useEffect(() => { setText(currentKeys.join('\n')); }, [currentKeys, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        const keys = text.split('\n').map(k => k.trim()).filter(k => k.length > 5);
        onSave(keys);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '20px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
                        <IconSettings /> Gestión de API Keys
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
                </div>
                <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px', lineHeight: '1.5' }}>
                    Ingresa una API Key de <strong>Google Gemini</strong> por línea. El sistema rotará automáticamente entre ellas si se alcanza el límite de cuota (Error 429).
                </p>
                <textarea
                    style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '13px',
                        borderRadius: '12px',
                        border: '2px solid #F1F5F9',
                        outline: 'none',
                        backgroundColor: '#F8FAFC',
                        color: '#0F172A',
                        marginBottom: '24px',
                        height: '180px',
                        fontFamily: 'monospace',
                        transition: 'border-color 0.2s',
                        resize: 'none'
                    }}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="AIzaSy...&#10;AIzaSy...&#10;AIzaSy..."
                />
                <div style={{ display: 'flex', justifyContent: 'end', gap: '12px' }}>
                    <button style={{ ...styles.button, padding: '12px 20px' } as any} onClick={onClose}>Cancelar</button>
                    <button
                        style={{ ...styles.button, backgroundColor: '#6366F1', color: 'white', border: 'none', padding: '12px 24px', fontWeight: 700 } as any}
                        onClick={handleSave}
                    >
                        Guardar {text.split('\n').filter(k => k.trim()).length} Keys
                    </button>
                </div>
            </div>
        </div>
    )
}

const UploadModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (content: string) => void }) => {
    const [text, setText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setText(ev.target?.result as string || '');
        reader.readAsText(file);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '20px', width: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
                        <IconFileUp /> Cargar Artículo Existente
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
                </div>
                <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px', lineHeight: '1.5' }}>
                    Pega el contenido HTML/Texto de tu artículo o sube un archivo (.html, .txt, .md).
                </p>

                <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{ ...styles.button, backgroundColor: '#F1F5F9', color: '#475569' } as any}
                    >
                        <IconUpload size={16} /> Subir Archivo
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".html,.txt,.md"
                        onChange={handleFile}
                    />
                </div>

                <textarea
                    style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '13px',
                        borderRadius: '12px',
                        border: '2px solid #F1F5F9',
                        outline: 'none',
                        backgroundColor: '#F8FAFC',
                        color: '#0F172A',
                        marginBottom: '24px',
                        height: '300px',
                        fontFamily: 'monospace',
                        transition: 'border-color 0.2s',
                        resize: 'none'
                    }}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="<h1>Título...</h1><p>Contenido...</p>"
                />
                <div style={{ display: 'flex', justifyContent: 'end', gap: '12px' }}>
                    <button style={{ ...styles.button, padding: '12px 20px' } as any} onClick={onClose}>Cancelar</button>
                    <button
                        style={{ ...styles.button, backgroundColor: '#6366F1', color: 'white', border: 'none', padding: '12px 24px', fontWeight: 700 } as any}
                        onClick={() => onSave(text)}
                        disabled={!text.trim()}
                    >
                        Cargar al Editor
                    </button>
                </div>
            </div>
        </div>
    )
}

const App = () => {
    const { user } = useAuthStore();
    const { activeProject, tasks } = useProjectStore();
    const { apiKeys, setApiKeys, initializeFromTask } = useWriterStore();
    const router = useRouter();
    const [draftId, setDraftId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // TASK CONTEXT STATE
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
    const [linkedTaskTitle, setLinkedTaskTitle] = useState<string | null>(null);

    const [linkedProjectId, setLinkedProjectId] = useState<number | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [publicAccess, setPublicAccess] = useState<'none' | 'view' | 'edit'>('none');
    const [shareToken, setShareToken] = useState<string | null>(null);

    const searchParams = useSearchParams();

    // --- APP STATE ---
    const [viewMode, setViewMode] = useState<'dashboard' | 'new-content' | 'setup' | 'seo-review' | 'structure-review' | 'workspace' | 'humanize'>('dashboard');
    const [isTitleOnly, setIsTitleOnly] = useState(true); // true = Es un título, false = Es una idea

    useEffect(() => {
        const mode = searchParams?.get('mode');
        if (mode && ['dashboard', 'new-content', 'setup', 'seo-review', 'structure-review', 'workspace', 'humanize'].includes(mode)) {
            setViewMode(mode as any);
        }

        const taskId = searchParams?.get('activeTaskId');
        if (taskId) {
            setLinkedTaskId(taskId);
            
            // Check lock
            supabase.from('tasks').select('title, locked_by, locked_until').eq('id', taskId).single()
                .then(async ({ data }) => {
                    if (data) {
                        setLinkedTaskTitle(data.title);
                        if (data.locked_by && data.locked_by !== user?.id && new Date(data.locked_until) > new Date()) {
                            alert("⚠️ ALERTA DE COLISIÓN: Esta tarea está siendo editada por otro usuario.");
                        } else if (user?.id) {
                            const lockedUntil = new Date(new Date().getTime() + 30 * 60000).toISOString();
                            await supabase.from('tasks').update({ locked_by: user.id, locked_until: lockedUntil }).eq('id', taskId);
                        }
                    }
                });
        }

        const dId = searchParams?.get('draftId');
        if (dId) {
            setDraftId(dId);
            loadDraft(dId);
        }
    }, [searchParams]);

    const handleTaskSelect = (task: any) => {
        initializeFromTask(task, activeProject);
        setLinkedTaskId(task.id);
        setLinkedTaskTitle(task.title);
        setTargetKeyword(task.target_keyword || "");
        setStrategyH1(task.title);
        setViewMode('workspace');
    };

    const loadDraft = async (id: string) => {
        const { data, error } = await supabase.from('content_drafts').select('*').eq('id', id).single();
        if (data && !error) {
            setHtmlContent(data.html_content || "");
            if (data.strategy_data) {
                const s = data.strategy_data;
                setProjectName(s.projectName || "");
                setTargetKeyword(s.targetKeyword || "");
                setDetectedNiche(s.detectedNiche || "");
                setStrategyOutline(s.strategyOutline || []);
                setStrategyTone(s.strategyTone || "");
                setMetadata(s.metadata || { title: "", description: "" });
                setStrategyLSI(s.strategyLSI || []);
                setStrategyLongTail(s.strategyLongTail || []);
                setStrategyQuestions(s.strategyQuestions || []);
                setCreativityLevel(s.creativityLevel || 'medium');
                setStrategyH1(s.strategyH1 || "");
                setStrategyCompetitors(s.strategyCompetitors || "");
            }
        }
    }

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [configStep, setConfigStep] = useState<'data' | 'keyword'>('data');

    // Humanizer Interface State
    const [humanizeInput, setHumanizeInput] = useState('');

    // Configuration State
    const [showKeyModal, setShowKeyModal] = useState(false);

    const loadUserKeys = async () => {
        if (!user) return;
        try {
            // Check for keys in profiles settings or dedicated field
            const { data } = await supabase.from('profiles').select('settings').eq('id', user.id).maybeSingle();
            if (data?.settings?.api_keys) {
                setApiKeys(data.settings.api_keys);
            }
        } catch (e) {
            console.error("Error loading user keys:", e);
        }
    };

    const checkIfKeySaved = async (value: string, type: string) => {
        if (!value || !user) return;
        try {
            const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).maybeSingle();
            const settings = profile?.settings || {};
            const api_keys = settings.api_keys || {};
            
            // Avoid redundant updates
            if (api_keys[type] === value) return;
            
            api_keys[type] = value;
            await supabase.from('profiles').update({ settings: { ...settings, api_keys } }).eq('id', user.id);
        } catch (e) {
            console.error("Error auto-saving key", e);
        }
    };

    useEffect(() => {
        if (user) {
            loadUserKeys();
            loadDraftFromUrl();
            loadTaskFromUrl();
        }
    }, [user]);

    const loadTaskFromUrl = async () => {
        const params = new URLSearchParams(window.location.search);
        const tid = params.get('taskId');
        if (tid) {
            try {
                // 1. Task Locking / Checks
                const { data: lockCheck } = await supabase.from('tasks').select('locked_by, locked_until').eq('id', tid).single();
                if (lockCheck?.locked_by && lockCheck.locked_by !== user?.id && new Date(lockCheck.locked_until) > new Date()) {
                    alert("⚠️ ALERTA DE COLISIÓN: Esta tarea está siendo editada por otro usuario. Cualquier cambio que guardes podría sobrescribir su trabajo.");
                } else if (user?.id) {
                    // Lock for 30 mins
                    const lockedUntil = new Date(new Date().getTime() + 30 * 60000).toISOString();
                    await supabase.from('tasks').update({ locked_by: user.id, locked_until: lockedUntil }).eq('id', tid);
                }

                // 2. Load Task Data
                const { data, error } = await supabase.from('tasks').select('*').eq('id', tid).single();
                if (error) throw error;
                if (data) {
                    setLinkedTaskId(data.id);
                    setLinkedTaskTitle(data.title);
                    setLinkedProjectId(data.project_id);
                    if (data.target_keyword) setTargetKeyword(data.target_keyword);
                    if (data.title && !strategyH1) setStrategyH1(data.title);
                    if (data.associated_url) setAssociatedUrl(data.associated_url);
                    if (data.secondary_url) setSecondaryUrl(data.secondary_url);
                    setStatus(`Modo Tarea Activo: ${data.title}`);
                }
            } catch (e) {
                console.error("Error loading task", e);
            }
        }
    };

    const loadDraftFromUrl = async () => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('draftId');
        if (id) {
            setStatus("Cargando borrador...");
            try {
                const { data, error } = await supabase
                    .from('content_drafts')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setDraftId(data.id);
                    setHtmlContent(data.html_content || '');
                    setFullResponse(data.html_content || '');
                    setPublicAccess(data.public_access_level || 'none');
                    setShareToken(data.share_token || null);
                    if (data.strategy_data) {
                        const sd = data.strategy_data;
                        setProjectName(sd.projectName || 'Proyecto');
                        setTargetKeyword(sd.targetKeyword || '');
                        setDetectedNiche(sd.detectedNiche || '');
                        setStrategyOutline(sd.strategyOutline || []);
                        setStrategyTone(sd.strategyTone || 'Profesional');
                        setMetadata(sd.metadata || null);
                        setStrategyLSI(sd.strategyLSI || []);
                        setStrategyLongTail(sd.strategyLongTail || []);
                        setStrategyQuestions(sd.strategyQuestions || []);
                        setCreativityLevel(sd.creativityLevel || 'medium');
                        setStrategyH1(data.title || sd.strategyH1 || '');
                    }
                    setViewMode('workspace');
                    setIsSidebarOpen(false);
                }
            } catch (e: any) {
                console.error("Error loading draft", e);
                alert("No se pudo cargar el borrador: " + e.message);
            } finally {
                setStatus("");
            }
        }
    };

    const [model, setModel] = useState('gemini-2.5-flash');
    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvFileName, setCsvFileName] = useState<string | null>(null);
    const [projectName, setProjectName] = useState('Optica Bassol');

    // External Tools Keys
    const [serperKey, setSerperKey] = useState('');
    const [valueSerpKey, setValueSerpKey] = useState('');
    const [jinaKey, setJinaKey] = useState('');
    const [unstructuredKey, setUnstructuredKey] = useState('');

    const [targetKeyword, setTargetKeyword] = useState('');
    const [detectedNiche, setDetectedNiche] = useState('');
    const [associatedUrl, setAssociatedUrl] = useState('');
    const [secondaryUrl, setSecondaryUrl] = useState('');

    // Strategy Editable State
    const [strategyTitle, setStrategyTitle] = useState('');
    const [strategyH1, setStrategyH1] = useState('');
    const [strategySlug, setStrategySlug] = useState('');
    const [strategyDesc, setStrategyDesc] = useState('');
    const [strategyWordCount, setStrategyWordCount] = useState('1500');
    const [strategyTone, setStrategyTone] = useState('Profesional y Estiloso');
    const [strategyOutline, setStrategyOutline] = useState<{ type: string, text: string, wordCount: string, notes?: string }[]>([]);
    const [strategyCompetitors, setStrategyCompetitors] = useState('');
    const [strategyNotes, setStrategyNotes] = useState('');
    const [strategyLinks, setStrategyLinks] = useState<ContentItem[]>([]);

    const [creativityLevel, setCreativityLevel] = useState<'low' | 'medium' | 'high'>('medium');
    const [contextInstructions, setContextInstructions] = useState('');

    // STRICT MODE STATE
    const [isStrictMode, setIsStrictMode] = useState(false);
    const [strictFrequency, setStrictFrequency] = useState(30); // Default 30% (Optimal)

    // SEO Lists
    const [strategyLSI, setStrategyLSI] = useState<{ keyword: string, count: string }[]>([]);
    const [strategyLongTail, setStrategyLongTail] = useState<string[]>([]);
    const [strategyQuestions, setStrategyQuestions] = useState<string[]>([]);

    // UI Helpers
    const [tempLsiInput, setTempLsiInput] = useState('');
    const [tempFaqInput, setTempFaqInput] = useState('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [tempLinkUrl, setTempLinkUrl] = useState('');
    const [tempLinkTitle, setTempLinkTitle] = useState('');

    // Raw SEO Data
    const [rawSeoData, setRawSeoData] = useState<SEOAnalysisResult | null>(null);
    const [isAnalyzingSEO, setIsAnalyzingSEO] = useState(false);
    const [isPlanningStructure, setIsPlanningStructure] = useState(false);

    // Visual Resources State
    const [visualResources, setVisualResources] = useState<VisualResource[]>([]);
    const [isSearchingVisuals, setIsSearchingVisuals] = useState(false);

    // AI Images Configuration & State
    const [isImageConfigOpen, setIsImageConfigOpen] = useState(true);
    const [imageConfig, setImageConfig] = useState<ImageGenConfig>({
        style: 'Auto',
        colors: [],
        customDimensions: { w: '1200', h: '630' },
        count: 'auto',
        userPrompt: ''
    });
    const [watermarkFile, setWatermarkFile] = useState<string | null>(null);

    const [aiImages, setAiImages] = useState<AIImageRequest[]>([]);
    const [featuredImage, setFeaturedImage] = useState<AIImageRequest | null>(null);
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [regenNotes, setRegenNotes] = useState<{ [key: string]: string }>({});

    // Humanizer & Editor State
    const [humanizerStatus, setHumanizerStatus] = useState('');
    const [isHumanizing, setIsHumanizing] = useState(false);
    const [humanizerNotes, setHumanizerNotes] = useState('');
    const [humanizerPercent, setHumanizerPercent] = useState(100);

    const [editorStatus, setEditorStatus] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editorNotes, setEditorNotes] = useState('');
    const [editorPercentage, setEditorPercentage] = useState(20);

    const [isRunningCombined, setIsRunningCombined] = useState(false);
    const [combinedStatus, setCombinedStatus] = useState('');

    // Refinement State
    const [refinementInstructions, setRefinementInstructions] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    // Export State
    const [isExporting, setIsExporting] = useState(false);

    const handleExportToDocs = async () => {
        if (!htmlContent) return;
        setIsExporting(true);
        setStatus("Exportando a Google Docs...");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error("No hay sesión activa");

            const docTitle = strategyH1 || projectName || "Sin título";
            const url = await exportToGoogleDoc(docTitle, htmlContent, token);

            window.open(url, '_blank');
            setStatus("Exportado correctamente");

            // Also notify via toast if possible, or just alert?
            // alert("Documento creado: " + url);

        } catch (e: any) {
            console.error(e);
            alert("Error al exportar: " + (e.message || String(e)));
            setStatus("Error al exportar");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportToSlides = async () => {
        setIsExporting(true);
        setStatus("Generando presentación...");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error("No hay sesión activa");

            const slides = [];

            // Slide 1: Title
            slides.push({
                title: strategyH1 || targetKeyword || "Reporte SEO",
                content: [
                    `Proyecto: ${projectName}`,
                    `Query: ${targetKeyword}`,
                    `Fecha: ${new Date().toLocaleDateString()}`
                ]
            });

            // Slide 2: Metrics
            if (rawSeoData) {
                const metrics = [
                    `Nicho Detectado: ${rawSeoData.nicheDetected}`,
                    `Intención: ${rawSeoData.searchIntent || 'N/A'}`
                ];
                if (rawSeoData.keywordDifficulty) metrics.push(`Dificultad: ${rawSeoData.keywordDifficulty}`);
                if (rawSeoData.searchVolume) metrics.push(`Volumen: ${rawSeoData.searchVolume}`);

                slides.push({
                    title: "Métricas Clave",
                    content: metrics
                });
            }

            // Slide 3: Competitors
            if (rawSeoData?.top10Urls && rawSeoData.top10Urls.length > 0) {
                const competitors = rawSeoData.top10Urls.slice(0, 5).map(u => u.url);
                slides.push({
                    title: "Competencia (Top 5)",
                    content: competitors
                });
            }

            // Slide 4: LSI
            if (strategyLSI && strategyLSI.length > 0) {
                const lsi = strategyLSI.slice(0, 7).map(k => `${k.keyword} (${k.count})`);
                slides.push({
                    title: "Keywords LSI Recomendadas",
                    content: lsi
                });
            }

            // Slide 5: Structure
            if (strategyOutline && strategyOutline.length > 0) {
                const structure = strategyOutline.slice(0, 7).map(h => `${h.type}: ${h.text}`);
                slides.push({
                    title: "Estructura Propuesta",
                    content: structure
                });
            }

            const url = await exportToGoogleSlides(`Reporte SEO: ${targetKeyword}`, slides, token);
            window.open(url, '_blank');
            setStatus("Reporte creado con éxito en Google Slides.");

        } catch (e: any) {
            console.error(e);
            alert("Error Slides: " + e.message);
            setStatus("Error al exportar Slides");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportToWordPress = async () => {
        if (!htmlContent) return;
        if (!activeProject?.wp_url || !activeProject?.wp_token) {
            alert("Configura la URL y el Token de WordPress en los ajustes del proyecto antes de publicar.");
            return;
        }

        setIsExporting(true);
        setStatus("Publicando en WordPress...");
        try {
            const res = await WordPressService.publishPost(
                activeProject.wp_url,
                activeProject.wp_token,
                {
                    title: strategyH1 || projectName || "Sin título",
                    content: htmlContent,
                    status: 'draft',
                    featured_image_url: featuredImage?.url
                }
            );

            if (res.success) {
                if (confirm("Publicado con éxito como borrador. ¿Deseas abrir el editor de WordPress?")) {
                    window.open(res.edit_url, '_blank');
                }
                setStatus("Publicado en WordPress");
            }
        } catch (e: any) {
            console.error(e);
            alert("Error WordPress: " + (e.message || "Error desconocido"));
            setStatus("Error en WordPress");
        } finally {
            setIsExporting(false);
        }
    };

    // Output/Process State
    const [isGenerating, setIsGenerating] = useState(false);
    const [fullResponse, setFullResponse] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [metadata, setMetadata] = useState<any>(null);
    const [status, setStatus] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const [generatedSchema, setGeneratedSchema] = useState('');

    // UPLOAD ARTICLE STATE
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadContent, setUploadContent] = useState('');

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const watermarkInputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    // --- Effects ---

    useEffect(() => {
        let cleanText = fullResponse;
        if (cleanText.includes('```html')) {
            cleanText = cleanText.replace(/```html/g, '').replace(/```/g, '');
        } else if (cleanText.includes('```')) {
            cleanText = cleanText.replace(/```/g, '');
        }

        const separator = "<!-- METADATA_START -->";
        if (cleanText.includes(separator)) {
            const parts = cleanText.split(separator);
            let contentPart = parts[0];
            contentPart = cleanAndFormatHtml(contentPart);
            setHtmlContent(contentPart);
            setContent(contentPart); // Sync to store

            let jsonStr = parts[1].trim();
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
            if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
                try {
                    const meta = JSON.parse(jsonStr);
                    setMetadata(meta);
                } catch (e) { }
            }
        } else {
            const safeContent = cleanAndFormatHtml(cleanText);
            setHtmlContent(safeContent);
            setContent(safeContent); // Sync to store
        }
    }, [fullResponse, setContent]);

    // Sync local changes to store for SEO sidebar
    const handleEditorChange = () => {
        if (previewRef.current) {
            const newContent = previewRef.current.innerHTML;
            setHtmlContent(newContent);
            setContent(newContent);
        }
    };

    // --- Error Handler Helper ---
    const handleApiError = async (e: any, retryAction?: () => Promise<void>) => {
        console.error("API Error caught:", e);
        const isQuota = e.isQuota || e.status === 429 || (e.message && e.message.toLowerCase().includes('quota'));

        if (isQuota) {
            setShowKeyModal(true);
            const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3-flash', 'gemma-3-27b', 'gemma-3-12b', 'gemma-3-4b'];
            const currentIndex = models.indexOf(model);
            const nextModel = models[(currentIndex + 1) % models.length];

            const msg = `⚠️ Todas las API Keys han agotado su cuota para el modelo "${model}".\n\n¿Deseas intentar con el siguiente modelo disponible ("${nextModel}") usando las mismas keys?`;

            if (confirm(msg)) {
                setModel(nextModel);
                if (retryAction) {
                    setTimeout(async () => {
                        await retryAction();
                    }, 500);
                    return;
                }
            } else {
                alert("Por favor, añade nuevas API Keys para continuar con el modelo actual.");
            }
        } else {
            alert("Error: " + (e.message || String(e)));
        }
    }

    // --- Handlers ---
    const handleSaveKeys = (keys: string[]) => {
        setApiKeys(keys);
        setShowKeyModal(false);
        alert(`Guardadas ${keys.length} API Keys. Puedes reintentar la acción.`);
    };

    const handleSaveCloud = async () => {
        if (!user) return alert("Inicia sesión para guardar.");
        if (!htmlContent && !strategyH1) return alert("Nada que guardar.");
        setIsSaving(true);
        try {
            const draftData = {
                user_id: user.id,
                title: strategyH1 || projectName || 'Sin título',
                html_content: htmlContent,
                strategy_data: {
                    projectName, targetKeyword, detectedNiche, strategyOutline, strategyTone, apiKeys, metadata,
                    strategyLSI, strategyLongTail, strategyQuestions, creativityLevel
                },
                updated_at: new Date().toISOString()
            };
            const { data, error } = draftId
                ? await supabase.from('content_drafts').update(draftData).eq('id', draftId).select()
                : await supabase.from('content_drafts').insert([draftData]).select();
            if (error) throw error;
            if (data?.[0]) {
                setDraftId(data[0].id);
                setLastSaved(new Date());
            }
        } catch (e: any) { alert("Error al guardar: " + e.message); }
        finally { setIsSaving(false); }
    };

    const handleNewContent = () => {
        const confirmMsg = "Se iniciará un nuevo artículo. Se mantendrá el CSV y Proyecto, pero se borrará el contenido actual.";
        if (confirm(confirmMsg)) {
            // Reset Strategy
            setTargetKeyword('');
            setStrategyTitle('');
            setStrategyH1('');
            setStrategySlug('');
            setStrategyDesc('');
            setStrategyOutline([]);
            setStrategyLinks([]);
            setStrategyCompetitors('');
            setStrategyLSI([]);
            setStrategyLongTail([]);
            setStrategyQuestions([]);
            setRawSeoData(null);

            // Reset Workspace
            setFullResponse('');
            setHtmlContent('');
            setMetadata(null);
            setAiImages([]);
            setFeaturedImage(null);
            setGeneratedSchema('');
            setVisualResources([]);

            // Reset Tools
            setHumanizerStatus('');
            setIsHumanizing(false);
            setHumanizerPercent(100);
            setHumanizerNotes('');
            setEditorStatus('');
            setIsEditing(false);
            setEditorPercentage(20);
            setEditorNotes('');
            setIsRunningCombined(false);
            setCombinedStatus('');
            setContextInstructions('');
            setRefinementInstructions('');

            setIsStrictMode(false);
            setStrictFrequency(30);

            // State Logic
            setViewMode('setup');
            if (csvData && csvData.length > 0) {
                setConfigStep('keyword');
            } else {
                setConfigStep('data');
            }
            setStatus('');
            setIsSidebarOpen(true);
        }
    };

    const goToDataView = () => {
        setViewMode('setup');
        setConfigStep('data');
        setIsSidebarOpen(true);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
    };

    const processFile = (file: File) => {
        const isJson = file.name.endsWith('.json');
        const isCsv = file.name.endsWith('.csv');

        if (!isJson && !isCsv) {
            alert("Por favor sube un archivo CSV o JSON.");
            return;
        }

        setCsvFileName(file.name);
        setStatus("Analizando base de datos...");

        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                let resultData = [];
                try {
                    setStatus("Clasificando URLs...");
                    if (isJson) {
                        const { data } = parseJSON(text);
                        resultData = data;
                    } else {
                        const { data } = parseCSV(text);
                        resultData = data;
                    }
                    setCsvData(resultData);
                    setStatus("");
                    setConfigStep('keyword');
                } catch (err) {
                    console.error(err);
                    setStatus("Error al procesar el archivo.");
                    alert("El archivo parece corrupto o mal formateado. Revisa la consola.");
                }
            };
            reader.readAsText(file);
        }, 100);
    };



    // STEP 1: SEO Analysis
    const performSEO = async () => {
        if (!targetKeyword) {
            alert("Introduce una palabra clave.");
            return;
        }

        // --- NEW MANDATORY CHECK ---
        if (!serperKey && !valueSerpKey && !jinaKey && !unstructuredKey) {
            alert("¡Error! Debes ingresar al menos una API Key de consulta externa (Serper, ValueSERP, Jina AI o Unstructured) para continuar.");
            return;
        }

        // Check for state keys OR global environment keys (fallback)
        const hasEffectiveKeys = (apiKeys && apiKeys.length > 0) || !!(process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS);

        if (!hasEffectiveKeys) {
            alert("No hay API Keys configuradas. Por favor agrega tus Google AI Keys en los Ajustes o configura las llaves globales (NEXT_PUBLIC_GEMINI_API_KEYS) en el sistema.");
            return;
        }

        setIsAnalyzingSEO(true);
        setStatus("Fase 1/2: Consultando SERP Trends (Prioridad Serper > ValueSERP > Jina)...");

        try {
            // Pass all keys
            const data = await runSEOAnalysis(apiKeys, targetKeyword, csvData, projectName, serperKey, valueSerpKey, jinaKey, !isTitleOnly);
            
            // USE STORE ACTION FOR AUTOMATION
            updateStrategyFromSeo(data);
            
            setViewMode('seo-review');
            setStatus("");
        } catch (e: any) {
            handleApiError(e);
            setStatus("Error. Intenta nuevamente.");
        } finally {
            setIsAnalyzingSEO(false);
        }
    };

    // STEP 2: Plan Structure
    const handlePlanStructure = async () => {
        // Ensure we have keys
        const hasEffectiveKeys = (apiKeys && apiKeys.length > 0) || !!(process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS);
        if (!hasEffectiveKeys) return alert("Configura tus API Keys (plural) para planificar la estructura.");

        setIsPlanningStructure(true);
        setStatus("Diseñando estructura del artículo y analizando competidores...");

        try {
            const currentConfig: ArticleConfig = {
                projectName,
                niche: detectedNiche,
                topic: targetKeyword,
                metaTitle: "",
                keywords: targetKeyword,
                tone: strategyTone,
                wordCount: strategyWordCount,
                refUrls: strategyCompetitors,
                refContent: "",
                csvData: [],
                approvedLinks: strategyLinks,
                questions: strategyQuestions,
                lsiKeywords: strategyLSI.map(l => l.keyword).concat(strategyLongTail)
            };

            if (!rawSeoData) {
                alert("Primero debes realizar el Análisis SEO (Fase 1).");
                return;
            }

            const structureData = await generateOutlineStrategy(apiKeys, currentConfig, targetKeyword, rawSeoData, model);

            setStrategyTitle(structureData.snippet.metaTitle);
            setStrategyH1(structureData.snippet.h1);
            setStrategySlug(structureData.snippet.slug);
            setStrategyDesc(structureData.snippet.metaDescription);
            setStrategyOutline(structureData.outline.headers);
            setStrategyNotes(structureData.outline.introNote);

            setViewMode('structure-review');
            setStatus("");
        } catch (e: any) {
            handleApiError(e);
        } finally {
            setIsPlanningStructure(false);
        }
    };

    // STEP 3: Generate Article
    const generateArticle = async () => {
        if (!strategyH1) {
            alert("Necesitas un H1.");
            return;
        }

        // Ensure we have keys
        const hasEffectiveKeys = (apiKeys && apiKeys.length > 0) || !!(process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS);
        if (!hasEffectiveKeys) return alert("Configura tus API Keys (plural) para generar el artículo.");

        setViewMode('workspace');
        setIsGenerating(true);
        setFullResponse("");
        setHtmlContent("");
        setMetadata(null);
        setVisualResources([]);
        setAiImages([]);
        setFeaturedImage(null);
        setGeneratedSchema('');

        setHumanizerStatus('');
        setEditorStatus('');
        setCombinedStatus('');
        setRefinementInstructions('');

        setStatus("Iniciando redacción estructurada...");

        try {
            await new Promise(r => setTimeout(r, 500));

            const config: ArticleConfig = {
                projectName: projectName,
                niche: detectedNiche,
                topic: strategyH1,
                metaTitle: strategyTitle,
                keywords: rawSeoData?.keywordIdeas?.shortTail?.slice(0, 5).join(', ') || targetKeyword,
                tone: strategyTone,
                wordCount: strategyWordCount,
                refUrls: strategyCompetitors,
                refContent: strategyNotes,
                csvData: csvData,
                outlineStructure: strategyOutline,
                approvedLinks: strategyLinks,
                questions: strategyQuestions,
                lsiKeywords: strategyLSI.map(l => l.keyword).concat(strategyLongTail),
                creativityLevel: creativityLevel,
                contextInstructions: contextInstructions,
                isStrictMode: isStrictMode, // Pass Strict Mode
                strictFrequency: strictFrequency
            };

            const prompt = buildPrompt(config);
            setStatus("Redactando contenido...");
            // Use selected Model
            const stream = await generateArticleStream(apiKeys, model, prompt);

            let buffer = "";
            for await (const chunk of stream) {
                const text = chunk.text;
                if (text) {
                    buffer += text;
                    setFullResponse(buffer);
                }
            }

            setStatus("Buscando oportunidades de enlazado interno adicionales...");
            let cleanHtml = buffer;
            if (cleanHtml.includes("<!-- METADATA_START -->")) {
                cleanHtml = cleanHtml.split("<!-- METADATA_START -->")[0];
            }

            const linkedHtml = autoInterlink(cleanHtml, csvData);
            const formattedHtml = cleanAndFormatHtml(linkedHtml);

            if (buffer.includes("<!-- METADATA_START -->")) {
                const metaPart = buffer.split("<!-- METADATA_START -->")[1];
                setFullResponse(formattedHtml + "<!-- METADATA_START -->" + metaPart);
            } else {
                setFullResponse(formattedHtml);
            }

            setStatus("Artículo finalizado y optimizado.");
            setIsSidebarOpen(false);

        } catch (error: any) {
            handleApiError(error, generateArticle);
            setStatus("Error en generación.");
            setHtmlContent(`<p style="color:red">Error: ${error instanceof Error ? error.message : String(error)}. Por favor regenera.</p>`);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Refinement Handler ---
    const handleRefineContent = async () => {
        if (!htmlContent || !refinementInstructions) return;

        // Try to get current selection
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : '';
        const isSelection = selectedText.length > 0;

        // Ensure we have keys
        const hasEffectiveKeys = (apiKeys && apiKeys.length > 0) || !!(process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS);
        if (!hasEffectiveKeys) return alert("Configura tus API Keys (plural) para refinar el contenido.");

        setIsRefining(true);
        setStatus(isSelection ? "Refinando selección con IA..." : "Refinando artículo con IA...");

        try {
            const refined = await refineArticleContent(apiKeys, htmlContent, refinementInstructions, model, selectedText);
            
            if (isSelection) {
                // Replacement logic for selection in contentEditable is tricky via state,
                // but a simple string replace works for most cases.
                setStatus("Reemplazando selección...");
                const newHtml = htmlContent.replace(selectedText, refined);
                setHtmlContent(newHtml);
                setContent(newHtml);
            } else {
                const styled = refineStyling(refined); // Maintain style for full article
                setHtmlContent(styled);
                setContent(styled);
            }
            
            setRefinementInstructions(''); // Clear instructions
            setStatus(isSelection ? "Selección refinada." : "Refinamiento completado.");
        } catch (e: any) {
            handleApiError(e);
            setStatus("Error al refinar.");
        } finally {
            setIsRefining(false);
        }
    }

    // --- Strategy Editors ---
    const handleUpdateOutlineItem = (index: number, field: string, value: string) => {
        const newOutline = [...strategyOutline];
        (newOutline[index] as any)[field] = value;
        setStrategyOutline(newOutline);
    };

    const handleDeleteOutlineItem = (index: number) => {
        setStrategyOutline(strategyOutline.filter((_, i) => i !== index));
    };

    const handleAddOutlineItem = () => {
        setStrategyOutline([...strategyOutline, { type: 'H2', text: 'Nueva Sección', wordCount: '200 palabras', notes: '' }]);
    };

    const handleRemoveLink = (url: string) => {
        setStrategyLinks(strategyLinks.filter(l => l.url !== url));
    };

    const handleAddLink = () => {
        if (tempLinkUrl && tempLinkTitle) {
            const newLink: ContentItem = {
                url: tempLinkUrl,
                title: tempLinkTitle,
                type: 'other',
                search_index: ''
            };
            setStrategyLinks(prev => [...prev, newLink]);
            setTempLinkUrl('');
            setTempLinkTitle('');
            setIsAddingLink(false);
        }
    };

    const handleSearchMoreLinks = async () => {
        try {
            const moreLinks = await searchMoreLinks(apiKeys, targetKeyword, csvData);
            const currentUrls = new Set(strategyLinks.map(l => l.url));
            const uniqueNew = moreLinks.filter(l => !currentUrls.has(l.url));
            setStrategyLinks(prev => [...prev, ...uniqueNew]);
        } catch (e) { console.error(e); }
    };

    const handleRegenerateLinks = async () => {
        try {
            const moreLinks = await searchMoreLinks(apiKeys, targetKeyword, csvData);
            setStrategyLinks(moreLinks); // Replace
        } catch (e) { console.error(e); }
    };

    // --- LSI & FAQ Editors ---
    const handleAddLSI = () => {
        if (tempLsiInput.trim()) {
            setStrategyLSI([...strategyLSI, { keyword: tempLsiInput, count: "1" }]);
            setTempLsiInput('');
        }
    };
    const handleRemoveLSI = (idx: number) => {
        setStrategyLSI(strategyLSI.filter((_, i) => i !== idx));
    };

    const handleAddFAQ = () => {
        if (tempFaqInput.trim()) {
            setStrategyQuestions([...strategyQuestions, tempFaqInput]);
            setTempFaqInput('');
        }
    };
    const handleRemoveFAQ = (idx: number) => {
        setStrategyQuestions(strategyQuestions.filter((_, i) => i !== idx));
    };

    // --- Visuals & Metadata ---
    const handleSearchVisuals = async () => {
        const query = `${strategyH1} official brand assets`;
        setIsSearchingVisuals(true);
        setStatus("Buscando recursos OFICIALES externos (excluyendo proyecto)...");
        try {
            const results = await findCampaignAssets(apiKeys, query, projectName, csvData);
            setVisualResources(results);
            setStatus(results.length > 0 ? `✅ ${results.length} recursos externos encontrados.` : "No se encontraron recursos oficiales externos.");
        } catch (error: any) {
            handleApiError(error);
            setStatus("Error al buscar.");
        } finally {
            setIsSearchingVisuals(false);
        }
    };

    const handleGenerateSchema = async () => {
        if (!htmlContent || !metadata) return;
        setStatus("Generando Schema JSON-LD...");
        try {
            const schema = await generateSchemaMarkup(apiKeys, metadata, htmlContent);
            setGeneratedSchema(schema);
            setStatus("");
        } catch (e) {
            console.error(e);
            setStatus("Error generando Schema");
        }
    }

    const handleHumanize = async (directHtml?: string) => {
        const sourceHtml = directHtml || htmlContent;
        if (!sourceHtml) return;

        // Ensure we have keys for cloud or a local node active
        const hasEffectiveKeys = (apiKeys && apiKeys.length > 0) || !!(process.env.NEXT_PUBLIC_GEMINI_API_KEYS || process.env.GEMINI_API_KEYS);
        // Only skip if NOT local
        if (!hasEffectiveKeys && !model.startsWith('gemma')) {
             alert("Configura tus API Keys (plural) para usar el humanizador en la nube.");
             return;
        }

        setIsHumanizing(true);
        setHumanizerStatus("Iniciando pipeline de humanización...");
        setStatus("Humanizando contenido...");

        const config: HumanizerConfig = {
            niche: detectedNiche || 'General',
            audience: 'Público General y Expertos',
            keywords: targetKeyword,
            notes: humanizerNotes,
            lsiKeywords: strategyLSI.map(l => l.keyword).concat(strategyLongTail),
            links: strategyLinks,
            isStrictMode,
            strictFrequency,
            questions: strategyQuestions
        };

        try {
            const { html } = await runHumanizerPipeline(
                apiKeys,
                sourceHtml,
                config,
                humanizerPercent,
                (msg) => setHumanizerStatus(msg)
            );

            // Post-Processing: Refine Styles
            const refinedHtml = refineStyling(html);

            if (directHtml) {
                setHumanizeInput(refinedHtml);
            } else {
                setHtmlContent(refinedHtml);
            }
            setHumanizerStatus(`✅ Completado al ${humanizerPercent}% + Estilos Refinados.`);
            setStatus("Humanización completada.");

        } catch (e: any) {
            handleApiError(e, () => handleHumanize(directHtml));
            setHumanizerStatus("Error: " + (e instanceof Error ? e.message : 'Fallo en la API'));
        } finally {
            setIsHumanizing(false);
        }
    };

    const handleSmartEdit = async () => {
        if (!htmlContent) return;
        setIsEditing(true);
        setEditorStatus("Iniciando editor inteligente...");
        setStatus("Mejorando texto...");

        try {
            const lsiString = strategyLSI.map(l => l.keyword).join(', ');

            const newHtml = await runSmartEditor(
                apiKeys,
                htmlContent,
                editorPercentage,
                editorNotes + ` Integrate LSI Keywords nicely: ${lsiString}`,
                (msg) => setEditorStatus(msg),
                isStrictMode,
                strictFrequency,
                strategyLSI.map(l => l.keyword).concat(strategyLongTail),
                strategyQuestions
            );

            // Post-Processing: Refine Styles
            const refinedHtml = refineStyling(newHtml);

            setHtmlContent(refinedHtml);
            setEditorStatus(`✅ Edición completada + Estilos Refinados.`);
            setStatus("Edición completada.");
        } catch (e: any) {
            handleApiError(e, handleSmartEdit);
            setEditorStatus("Error en editor: " + e);
        } finally {
            setIsEditing(false);
        }
    }

    const handleRunCombined = async () => {
        if (!htmlContent) return;
        setIsRunningCombined(true);
        setCombinedStatus("Fase 1/2: Humanizando...");

        try {
            setStatus("Fase 1/2: Humanizando...");
            const config: HumanizerConfig = {
                niche: detectedNiche || 'General',
                audience: 'Público General y Expertos',
                keywords: targetKeyword,
                notes: humanizerNotes,
                lsiKeywords: strategyLSI.map(l => l.keyword).concat(strategyLongTail),
                links: strategyLinks,
                isStrictMode,
                strictFrequency,
                questions: strategyQuestions
            };

            const humanizedResult = await runHumanizerPipeline(
                apiKeys,
                htmlContent,
                config,
                humanizerPercent,
                (msg) => {
                    setCombinedStatus("Fase 1: " + msg);
                    setStatus("Fase 1: " + msg);
                }
            );

            setStatus("Fase 2/2: Editando...");
            const lsiString = strategyLSI.map(l => l.keyword).join(', ');
            const finalHtml = await runSmartEditor(
                apiKeys,
                humanizedResult.html,
                editorPercentage,
                editorNotes + ` Integrate LSI Keywords nicely: ${lsiString}`,
                (msg) => {
                    setCombinedStatus("Fase 2: " + msg);
                    setStatus("Fase 2: " + msg);
                },
                isStrictMode,
                strictFrequency,
                strategyLSI.map(l => l.keyword).concat(strategyLongTail),
                strategyQuestions
            );

            // Post-Processing: Refine Styles
            setStatus("Refinando Estilos (Negritas, Jerarquía)...");
            const refinedHtml = refineStyling(finalHtml);

            setHtmlContent(refinedHtml);
            setStatus("✅ Flujo completo finalizado.");
            setCombinedStatus("✅ Completado: Humanizado + Editado + Estilizado");

        } catch (e: any) {
            handleApiError(e);
            setStatus("Error en flujo combinado.");
            setCombinedStatus("Error.");
        } finally {
            setIsRunningCombined(false);
        }
    }

    // --- Unified Image Generation System ---
    const handleUploadWatermark = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setWatermarkFile(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddColor = () => {
        if (imageConfig.colors.length < 5) {
            setImageConfig({ ...imageConfig, colors: [...imageConfig.colors, '#000000'] });
        }
    }
    const handleUpdateColor = (idx: number, val: string) => {
        const newColors = [...imageConfig.colors];
        newColors[idx] = val;
        setImageConfig({ ...imageConfig, colors: newColors });
    }
    const handleRemoveColor = (idx: number) => {
        const newColors = imageConfig.colors.filter((_, i) => i !== idx);
        setImageConfig({ ...imageConfig, colors: newColors });
    }

    const processImageWithWatermark = async (base64Img: string): Promise<string> => {
        if (!watermarkFile) return base64Img;
        return await compositeWatermark(base64Img, watermarkFile);
    };

    const handleGenerateAllImages = async () => {
        if (!strategyH1 || !htmlContent) {
            alert("Se necesita contenido para generar imágenes.");
            return;
        }

        setIsGeneratingImages(true);
        setStatus("Generando set gráfico completo...");

        try {
            setStatus("Creando Portada Personalizada...");
            const featuredPrompt = `Hero image for article titled "${strategyH1}". ${metadata?.description || ''}.`;
            const rawFeatured = await generateRealImage(apiKeys, featuredPrompt, imageConfig, 'featured', '16:9');
            const finalFeatured = await processImageWithWatermark(rawFeatured);

            setFeaturedImage({
                id: 'featured',
                type: 'featured',
                context: 'Cover Image',
                prompt: featuredPrompt,
                alt: `Imagen destacada para ${strategyH1}`,
                title: strategyH1,
                filename: `portada-${strategySlug || 'cover'}.webp`,
                placement: 'Cabecera (Inicio del artículo)',
                status: 'done',
                imageUrl: finalFeatured,
                aspectRatio: 'custom'
            });

            setStatus("Analizando slots para imágenes del cuerpo...");
            const bodySuggestions = await suggestImagePlacements(apiKeys, htmlContent, imageConfig.count);
            setAiImages(bodySuggestions);

            setStatus("Renderizando imágenes del cuerpo...");
            const updatedImages = [...bodySuggestions];
            for (let i = 0; i < updatedImages.length; i++) {
                try {
                    updatedImages[i].status = 'generating';
                    setAiImages([...updatedImages]);
                    const rawUrl = await generateRealImage(apiKeys, updatedImages[i].prompt, imageConfig, 'body', '16:9');
                    const finalUrl = await processImageWithWatermark(rawUrl);
                    updatedImages[i].status = 'done';
                    updatedImages[i].imageUrl = finalUrl;
                    setAiImages([...updatedImages]);
                } catch (e) {
                    updatedImages[i].status = 'error';
                    setAiImages([...updatedImages]);
                }
            }
            setStatus("Generación de imágenes completada.");

        } catch (e: any) {
            handleApiError(e);
            setStatus("Error en proceso de imágenes.");
        } finally {
            setIsGeneratingImages(false);
        }
    }

    const handleRegenerateImage = async (index: number | 'featured') => {
        if (index === 'featured') {
            if (!featuredImage) return;
            const tempImg = { ...featuredImage, status: 'generating' as const };
            setFeaturedImage(tempImg);
            try {
                const notes = regenNotes['featured'] || "";
                const tempConfig = { ...imageConfig, userPrompt: imageConfig.userPrompt + " " + notes };
                const rawUrl = await generateRealImage(apiKeys, featuredImage.prompt, tempConfig, 'featured', '16:9');
                const finalUrl = await processImageWithWatermark(rawUrl);
                setFeaturedImage({ ...featuredImage, imageUrl: finalUrl, status: 'done' });
                const newNotes = { ...regenNotes };
                delete newNotes['featured'];
                setRegenNotes(newNotes);
            } catch (e) {
                setFeaturedImage({ ...featuredImage, status: 'error' });
            }
            return;
        }

        const img = aiImages[index];
        const newImages = [...aiImages];
        newImages[index].status = 'generating';
        setAiImages(newImages);

        try {
            const notes = regenNotes[img.id] || "";
            const tempConfig = { ...imageConfig, userPrompt: imageConfig.userPrompt + " " + notes };
            const rawUrl = await generateRealImage(apiKeys, img.prompt, tempConfig, 'body', '16:9');
            const finalUrl = await processImageWithWatermark(rawUrl);
            newImages[index].imageUrl = finalUrl;
            newImages[index].status = 'done';
            const newNotes = { ...regenNotes };
            delete newNotes[img.id];
            setRegenNotes(newNotes);
        } catch (e) {
            newImages[index].status = 'error';
        }
        setAiImages([...newImages]);
    };

    const handleDownloadSingle = (img: AIImageRequest) => {
        if (!img.imageUrl) return;
        fetch(img.imageUrl)
            .then(res => res.blob())
            .then(blob => downloadBlob(blob, img.filename || 'image.webp'));
    };

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        const folder = zip.folder("assets");
        let count = 0;

        if (featuredImage && featuredImage.imageUrl) {
            const data = featuredImage.imageUrl.split(',')[1];
            folder?.file(featuredImage.filename, data, { base64: true });
            count++;
        }

        aiImages.forEach((img, i) => {
            if (img.imageUrl) {
                const data = img.imageUrl.split(',')[1];
                folder?.file(img.filename || `img-${i}.webp`, data, { base64: true });
                count++;
            }
        });
        if (count === 0) { alert("No hay imágenes."); return; }
        const content = await zip.generateAsync({ type: "blob" });
        downloadBlob(content, "visuals-pack.zip");
    };

    const copyRichText = async () => {
        if (!previewRef.current) return;
        try {
            const content = previewRef.current.innerHTML;
            const textContent = previewRef.current.innerText;
            const blobHtml = new Blob([content], { type: 'text/html' });
            const blobText = new Blob([textContent], { type: 'text/plain' });
            const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
            await navigator.clipboard.write(data);
            setStatus("¡Copiado!");
            setTimeout(() => setStatus(""), 3000);
        } catch (err) {
            setStatus("Error al copiar.");
        }
    };

    const copySchema = () => {
        navigator.clipboard.writeText(generatedSchema);
        setStatus("Schema Copiado");
        setTimeout(() => setStatus(""), 2000);
    }

    const handleCompleteTask = async () => {
        if (!linkedTaskId) return;
        setIsSaving(true);
        setStatus("Guardando y vinculando tarea...");
        try {
            const draftData = {
                title: strategyH1 || targetKeyword,
                html_content: htmlContent,
                strategy_data: {
                    projectName,
                    targetKeyword,
                    detectedNiche,
                    strategyOutline,
                    strategyTone,
                    metadata,
                    strategyLSI,
                    strategyLongTail,
                    strategyQuestions,
                    creativityLevel,
                    strategyH1,
                    strategyCompetitors
                },
                user_id: user?.id,
                updated_at: new Date()
            };

            let currentDraftId = draftId;

            if (draftId) {
                await supabase.from('content_drafts').update(draftData).eq('id', draftId);
            } else {
                const { data, error } = await supabase.from('content_drafts').insert(draftData).select().single();
                if (error) throw error;
                currentDraftId = data.id;
                setDraftId(data.id);
            }

            // Link to Task
            const { error: artifactError } = await supabase.from('task_artifacts').insert({
                task_id: linkedTaskId,
                artifact_type: 'draft',
                artifact_reference: currentDraftId,
                name: `Borrador: ${strategyH1}`
            });

            if (artifactError && artifactError.code !== '23505') throw artifactError;

            // Update Task Status
            await supabase.from('tasks').update({ status: 'done' }).eq('id', linkedTaskId);

            setStatus("Tarea actualizada y borrador vinculado!");

            if (linkedProjectId) {
                setTimeout(() => router.push(`/proyectos/${linkedProjectId}`), 1000);
            }

        } catch (e: any) {
            console.error(e);
            setStatus("Error al completar tarea: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // --- SEO CALCULATIONS ---
    const calculateSeoStats = () => {
        const text = htmlContent.replace(/<[^>]*>/g, ' ').toLowerCase();
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const totalWords = words.length;

        const getCount = (kw: string) => {
            if (!kw) return 0;
            const regex = new RegExp(`\\b${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            return (text.match(regex) || []).length;
        };

        const density = (count: number) => totalWords > 0 ? ((count / totalWords) * 100).toFixed(2) : "0";

        return {
            totalWords,
            mainKeyword: {
                keyword: targetKeyword,
                count: getCount(targetKeyword),
                density: density(getCount(targetKeyword))
            },
            lsi: strategyLSI.map(k => ({
                keyword: k.keyword,
                count: getCount(k.keyword),
                density: density(getCount(k.keyword))
            }))
        };
    };

    const seoStats = calculateSeoStats();

    // --- NAVIGATION HELPERS ---
    const steps = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, enabled: true },
        { id: 'setup', label: 'Proyecto', icon: <IconSettings />, enabled: true },
        { id: 'seo-review', label: 'Estrategia SEO', icon: <IconRadar />, enabled: true },
        { id: 'structure-review', label: 'Estructura', icon: <IconFile />, enabled: true },
        { id: 'workspace', label: 'Editor & Visuales', icon: <IconEdit />, enabled: true },
        { id: 'humanize', label: 'Humanizador Directo', icon: <IconGhost />, enabled: true }
    ];

    const canNavigate = (id: string) => {
        const step = steps.find(s => s.id === id);
        return step ? step.enabled : false;
    };

    const handleNavClick = (id: any) => {
        if (canNavigate(id)) {
            setViewMode(id);
        }
    };

    const renderDashboard = () => {
        const scheduledTasks = tasks.filter(t => t.status !== 'done');

        return (
            <div style={styles.hubContainer as any}>
                <div style={{ ...styles.hubContent, maxWidth: '1000px' } as any}>
                    <div style={styles.hubHeader as any}>
                        <div style={styles.hubTitle}>Content Studio AI</div>
                        <div style={styles.hubSubtitle}>Gestiona tus contenidos programados o crea uno nuevo desde cero.</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginTop: '32px' }}>
                        {/* NEW CONTENT CARD */}
                        <div 
                            style={{ 
                                ...styles.stepCard, 
                                border: '2px dashed #CBD5E1', 
                                background: '#F8FAFC',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '200px',
                                gap: '16px',
                                transition: 'all 0.2s'
                            } as any}
                            onClick={() => setViewMode('new-content')}
                        >
                            <div style={{ padding: '12px', borderRadius: '50%', background: '#6366F1', color: 'white' }}>
                                <IconPlus size={32} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Nuevo Contenido</div>
                                <div style={{ fontSize: '13px', color: '#64748B' }}>Empieza una investigación desde cero.</div>
                            </div>
                        </div>

                        {/* SCHEDULED TASKS */}
                        {scheduledTasks.map(task => (
                            <div 
                                key={task.id}
                                style={{ ...styles.stepCard, cursor: 'pointer', border: '1px solid #E2E8F0', position: 'relative' } as any}
                                onClick={() => handleTaskSelect(task)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                    <div style={{ background: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                        {task.status}
                                    </div>
                                    <div style={{ color: '#94A3B8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={12} /> {task.scheduled_date}
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', lineHeight: '1.3' }}>{task.title}</h3>
                                <p style={{ fontSize: '13px', color: '#64748B', lineClamp: '2', overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, minHeight: '38px' }}>
                                    {task.target_keyword ? `Keyword: ${task.target_keyword}` : (task.brief || 'Sin descripción')}
                                </p>
                                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'end' }}>
                                    <button style={{ ...styles.button, padding: '6px 12px', fontSize: '11px', backgroundColor: '#F1F5F9' }}>
                                        Continuar <IconArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderNewContent = () => {
        return (
            <div style={styles.hubContainer as any}>
                <div style={{ ...styles.hubContent, maxWidth: '700px' } as any}>
                    <div style={styles.hubHeader as any}>
                        <div style={styles.hubTitle}>Nuevo Contenido</div>
                        <div style={styles.hubSubtitle}>Define el punto de partida para tu próximo artículo.</div>
                    </div>

                    <div style={styles.stepCard as any}>
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '12px', marginBottom: '20px' }}>
                                <button 
                                    onClick={() => setIsTitleOnly(true)}
                                    style={{ 
                                        flex: 1, 
                                        padding: '10px', 
                                        borderRadius: '8px', 
                                        fontSize: '12px', 
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        backgroundColor: isTitleOnly ? 'white' : 'transparent',
                                        color: isTitleOnly ? '#0F172A' : '#64748B',
                                        boxShadow: isTitleOnly ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Es un Título
                                </button>
                                <button 
                                    onClick={() => setIsTitleOnly(false)}
                                    style={{ 
                                        flex: 1, 
                                        padding: '10px', 
                                        borderRadius: '8px', 
                                        fontSize: '12px', 
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        backgroundColor: !isTitleOnly ? 'white' : 'transparent',
                                        color: !isTitleOnly ? '#0F172A' : '#64748B',
                                        boxShadow: !isTitleOnly ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Es una Idea
                                </button>
                            </div>

                            <label style={styles.label}>{isTitleOnly ? "Título del Artículo" : "Idea o Concepto del Contenido"}</label>
                            <input 
                                style={styles.inputLarge}
                                value={targetKeyword}
                                onChange={(e) => setTargetKeyword(e.target.value)}
                                placeholder={isTitleOnly ? "Ej: 10 Mejores Zapatillas de Running para 2024" : "Ej: Quiero un artículo sobre beneficios de correr por la mañana..."}
                            />
                            {!isTitleOnly && (
                                <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>🚀 La IA generará un título SEO optimizado basado en tu idea.</p>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <button 
                                style={{ ...styles.bigButton, background: '#6366F1' } as any}
                                onClick={performSEO}
                                disabled={isAnalyzingSEO || !targetKeyword.trim()}
                            >
                                {isAnalyzingSEO ? <LoadingSpinner /> : <><Sparkles size={18} /> Investigación Nous</>}
                            </button>
                            <button 
                                style={{ ...styles.bigButton, backgroundColor: '#0F172A', color: 'white' } as any}
                                onClick={() => {
                                    setStrategyH1(isTitleOnly ? targetKeyword : "Borrador IA");
                                    setViewMode('setup');
                                }}
                                disabled={!targetKeyword.trim()}
                            >
                                Configuración Manual
                            </button>
                        </div>
                        
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <button 
                                onClick={() => setViewMode('dashboard')}
                                style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <IconChevronLeft size={14} /> Volver al Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const getStrictLabel = (val: number) => {
        if (val <= 30) return "Óptimo SEO (1-2% densidad). Aparición natural.";
        if (val <= 60) return "Alta Densidad (3-4%). Frecuencia agresiva.";
        return "Riesgo Spam (>5%). Saturación de keywords.";
    };

    // --- MAIN RENDER ---
    return (
        <div style={styles.appLayout as any}>
            {/* TASK BANNER */}
            {linkedTaskId && (
                <div style={{ backgroundColor: '#EFF6FF', borderBottom: '1px solid #DBEAFE', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontSize: '13px', fontWeight: 600 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }}></div>
                        VINCUADO A TAREA #{linkedTaskId}: {linkedTaskTitle}
                    </div>
                    <button
                        onClick={() => router.push(`/proyectos/${linkedProjectId}`)}
                        style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Volver al Proyecto
                    </button>
                </div>
            )}
            <MultiKeyModal
                isOpen={showKeyModal}
                onClose={() => setShowKeyModal(false)}
                onSave={handleSaveKeys}
                currentKeys={apiKeys}
            />

            <UploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSave={(content) => {
                    setUploadContent(content);
                    // trigger logic immediately since setUploadContent is async, we pass content directly to a wrapper or rely on effect. 
                    // Actually handleLoadExisting uses uploadContent state. 
                    // Let's modify handleLoadExisting to accept arg or use ref.
                    // For simplicity, I'll update the state then call a modified handler logic.
                    // Or better, update handleLoadExisting to take content as argument.

                    if (!content.trim()) return;

                    // Logic from handleLoadExisting adapted to take content
                    if (!strategyH1) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(content, 'text/html');
                        const h1 = doc.querySelector('h1')?.textContent;
                        if (h1) setStrategyH1(h1);
                        else setStrategyH1("Artículo Importado");
                    }

                    setHtmlContent(content);
                    setFullResponse(content);
                    setStatus("Artículo cargado externamente.");
                    setShowUploadModal(false);
                    setViewMode('workspace');
                    setIsSidebarOpen(false);
                }}
            />

            {/* TOP NAVIGATION BAR - CLEANED */}
            <div style={styles.navBar as any}>
                <div style={styles.navGroup as any}>
                    {steps.map(step => (
                        <div
                            key={step.id}
                            style={{
                                ...styles.navTab,
                                ...(viewMode === step.id ? styles.navTabActive : {}),
                                ...(!step.enabled ? styles.navTabDisabled : {})
                            } as any}
                            onClick={() => handleNavClick(step.id)}
                            title={!step.enabled ? "Completa el paso anterior primero" : ""}
                        >
                            {step.icon}
                            {step.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

                {/* VIEW: DASHBOARD */}
                {viewMode === 'dashboard' && renderDashboard()}

                {/* VIEW: NEW CONTENT */}
                {viewMode === 'new-content' && renderNewContent()}

                {/* VIEW: SETUP */}
                {viewMode === 'setup' && (
                    <div style={styles.hubContainer as any}>
                        <div style={{ ...styles.hubContent, maxWidth: '700px' } as any}>
                            <div style={styles.hubHeader as any}>
                                <div style={styles.hubTitle}>Content Studio AI</div>
                                <div style={styles.hubSubtitle}>Crea contenido SEO sin alucinaciones y datos reales del SERP</div>
                            </div>
                            <div style={styles.stepCard as any}>
                                <div style={styles.stepTitle}>
                                    Configuración de Proyecto
                                </div>
                                <div>
                                    <label style={styles.label}>Nombre del Proyecto / Marca</label>
                                    <input
                                        style={styles.input}
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        placeholder="Ej: Optica Bassol, TechBlog..."
                                    />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={styles.label}>Google AI Studio Key(s)</label>
                                        <button
                                            onClick={() => setShowKeyModal(true)}
                                            style={{ ...styles.button, padding: '4px 8px', fontSize: '11px', height: 'auto', marginBottom: '4px' }}
                                        >
                                            <IconPlus /> Gestionar Keys ({apiKeys.length})
                                        </button>
                                    </div>
                                    <input
                                        type="password"
                                        style={styles.input}
                                        value={apiKeys[0] || ''}
                                        onChange={(e) => {
                                            const newKeys = [...apiKeys];
                                            newKeys[0] = e.target.value;
                                            setApiKeys(newKeys);
                                        }}
                                        placeholder="Pegar API Key principal..."
                                        disabled={apiKeys.length > 1}
                                        onBlur={(e) => checkIfKeySaved(e.target.value, 'gemini')}
                                    />
                                    {apiKeys.length > 1 && <p style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>✓ {apiKeys.length} Keys configuradas para rotación.</p>}
                                </div>
                                <div>
                                    <label style={styles.label}>Modelo Generativo</label>
                                    <select style={styles.select as any} value={model} onChange={(e) => setModel(e.target.value)}>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado)</option>
                                        <option value="gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                        <option value="gemini-3-flash">Gemini 3 Flash</option>
                                        <option value="gemma-3-27b">Gemma 3 27B</option>
                                        <option value="gemma-3-12b">Gemma 3 12B</option>
                                        <option value="gemma-3-4b">Gemma 3 4B</option>
                                    </select>
                                </div>

                                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: '8px' }}>
                                    <label style={styles.label}>Herramientas de Consulta Externa (Obligatorio 1)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <input
                                                type="password"
                                                style={{ ...styles.input, fontSize: '12px', borderColor: serperKey ? '#22C55E' : '#E2E8F0' }}
                                                value={serperKey}
                                                onChange={(e) => setSerperKey(e.target.value)}
                                                placeholder="Serper.dev Key (Recomendada)"
                                                onBlur={(e) => checkIfKeySaved(e.target.value, 'serper')}
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="password"
                                                style={{ ...styles.input, fontSize: '12px' }}
                                                value={valueSerpKey}
                                                onChange={(e) => setValueSerpKey(e.target.value)}
                                                placeholder="ValueSERP Key"
                                                onBlur={(e) => checkIfKeySaved(e.target.value, 'valueserp')}
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="password"
                                                style={{ ...styles.input, fontSize: '12px' }}
                                                value={jinaKey}
                                                onChange={(e) => setJinaKey(e.target.value)}
                                                placeholder="Jina AI Key"
                                                onBlur={(e) => checkIfKeySaved(e.target.value, 'jina')}
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="password"
                                                style={{ ...styles.input, fontSize: '12px' }}
                                                value={unstructuredKey}
                                                onChange={(e) => setUnstructuredKey(e.target.value)}
                                                placeholder="Unstructured.io Key"
                                                onBlur={(e) => checkIfKeySaved(e.target.value, 'unstructured')}
                                            />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Prioridad de uso: Serper &gt; ValueSERP &gt; Jina AI.</p>
                                </div>
                            </div>
                            <div style={styles.stepCard as any}>
                                <div style={styles.stepTitle}>
                                    Base de Datos (CSV/JSON)
                                </div>
                                {configStep === 'data' ? (
                                    <div
                                        style={{ ...styles.dropzone, ...(dragActive ? styles.dropzoneActive : {}) } as any}
                                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={handleFileChange} />
                                        <IconUpload />
                                        <span style={{ fontSize: '16px', color: '#64748B', fontWeight: 500 }}>
                                            {csvFileName || "Arrastra tu CSV/JSON de productos aquí"}
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F1F5F9', padding: '16px', borderRadius: '12px' }}>
                                        <span style={{ fontWeight: 600 }}>{csvFileName}</span>
                                        <span style={{ color: '#166534', fontSize: '13px', fontWeight: 600 }}>✅ {csvData.length.toLocaleString()} URLs activas</span>
                                    </div>
                                )}
                            </div>

                            {/* UPLOAD CARD */}
                            <div style={styles.stepCard as any}>
                                <div style={styles.stepTitle}>
                                    O carga un artículo existente
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748B', fontSize: '13px' }}>
                                    <button
                                        onClick={() => setShowUploadModal(true)}
                                        style={{ ...styles.button, backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', width: '100%', justifyContent: 'center', padding: '16px' } as any}
                                    >
                                        <IconFileUp /> Subir HTML / Texto / Markdown
                                    </button>
                                </div>
                                <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px', textAlign: 'center' }}>
                                    Saltarás directamente al editor para humanizar o generar imágenes.
                                </p>
                            </div>

                            {configStep === 'keyword' && (
                                <div style={{ ...styles.stepCard, animation: 'fadeIn 0.5s' } as any}>
                                    <div style={styles.stepTitle}>
                                        Estrategia Objetivo
                                    </div>
                                    <div>
                                        <label style={styles.label}>Palabra Clave Principal</label>
                                        <input
                                            style={styles.inputLarge}
                                            placeholder="ej. Zapatillas Running Baratas"
                                            value={targetKeyword}
                                            onChange={(e) => setTargetKeyword(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && performSEO()}
                                        />
                                    </div>
                                    <button
                                        style={styles.bigButton as any}
                                        onClick={performSEO}
                                        disabled={isAnalyzingSEO}
                                    >
                                        {isAnalyzingSEO ? <><LoadingSpinner /> Analizando Tendencias...</> : <><IconRadar /> Analizar & Planificar</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VIEW: SEO REVIEW */}
                {viewMode === 'seo-review' && (
                    <div style={styles.hubContainer as any}>
                        {/* ... (Previous SEO Review Code Remains) ... */}
                        <div style={styles.hubContent as any}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={styles.hubTitle}>Revisión de Datos SEO</div>
                                    <div style={styles.hubSubtitle}>Nicho: {detectedNiche} | Ajusta la información antes de planificar.</div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        style={{ ...styles.bigButton, padding: '16px 32px', width: 'auto', background: '#F59E0B' } as any}
                                        onClick={handleExportToSlides}
                                        disabled={isExporting}
                                    >
                                        {isExporting ? <LoadingSpinner /> : <><FileUp size={16} /> Exportar Reporte</>}
                                    </button>
                                    <button
                                        style={{ ...styles.bigButton, padding: '16px 32px', width: 'auto' } as any}
                                        onClick={handlePlanStructure}
                                        disabled={isPlanningStructure}
                                    >
                                        {isPlanningStructure ? <LoadingSpinner /> : <><IconSEO /> Generar Estructura</>}
                                    </button>
                                </div>
                            </div>

                            <div style={styles.gridContainer as any}>
                                <div style={{ ...styles.gridCard, gridColumn: 'span 1' } as any}>
                                    <div style={styles.gridCardTitle}><IconEdit /> Parámetros y Competencia</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={styles.label}>Modelo Prioritario</label>
                                            <select style={styles.select as any} value={model} onChange={e => setModel(e.target.value)}>
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                                <option value="gemini-3-flash">Gemini 3 Flash</option>
                                                <option value="gemma-3-27b">Gemma 3 27B</option>
                                                <option value="gemma-3-12b">Gemma 3 12B</option>
                                                <option value="gemma-3-4b">Gemma 3 4B</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={styles.label}>Tono de Voz</label>
                                            <select style={styles.select as any} value={strategyTone} onChange={e => setStrategyTone(e.target.value)}>
                                                <option>Profesional y Estiloso</option>
                                                <option>Técnico y Educativo</option>
                                                <option>Cercano y Divertido</option>
                                                <option>Lujo y Exclusividad</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={styles.label}>Objetivo de Palabras</label>
                                            <input
                                                style={styles.input}
                                                value={strategyWordCount}
                                                onChange={e => setStrategyWordCount(e.target.value)}
                                                placeholder="1500"
                                            />
                                        </div>
                                    </div>
                                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                                        <label style={styles.label}>URLs Competencia</label>
                                        <textarea
                                            style={{ ...styles.input, height: '200px', fontFamily: 'monospace', fontSize: '11px' }}
                                            value={strategyCompetitors}
                                            onChange={e => setStrategyCompetitors(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{ ...styles.gridCard, gridColumn: 'span 2' } as any}>
                                    <div style={styles.gridCardTitle}><IconRadar /> Palabras Clave y Preguntas</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <label style={styles.label}>Keywords LSI</label>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                                <input
                                                    style={styles.miniInput}
                                                    placeholder="Añadir Keyword..."
                                                    value={tempLsiInput}
                                                    onChange={(e) => setTempLsiInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddLSI()}
                                                />
                                                <button onClick={handleAddLSI} style={styles.miniAddBtn}>+</button>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {strategyLSI.map((k, i) => (
                                                    <div key={i} style={{ ...styles.keywordTag, display: 'flex', alignItems: 'center', gap: '4px' } as any}>
                                                        {k.keyword}
                                                        <button onClick={() => handleRemoveLSI(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 0 }}>×</button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ marginTop: '20px' }}>
                                                <label style={styles.label}>Long Tail Keywords</label>
                                                <textarea
                                                    style={{ ...styles.input, height: '100px', fontSize: '12px' }}
                                                    value={strategyLongTail.join('\n')}
                                                    onChange={(e) => setStrategyLongTail(e.target.value.split('\n'))}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <label style={styles.label}>Preguntas Frecuentes</label>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                                <input
                                                    style={styles.miniInput}
                                                    placeholder="Añadir Pregunta..."
                                                    value={tempFaqInput}
                                                    onChange={(e) => setTempFaqInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddFAQ()}
                                                />
                                                <button onClick={handleAddFAQ} style={styles.miniAddBtn}>+</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {strategyQuestions.map((q, i) => (
                                                    <div key={i} style={{ ...styles.faqCard, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } as any}>
                                                        <span>? {q}</span>
                                                        <button onClick={() => handleRemoveFAQ(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#92400E', padding: 0 }}>×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ ...styles.gridCard, gridColumn: 'span 3' } as any}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={styles.gridCardTitle}><IconLink /> Enlaces Sugeridos ({strategyLinks.length})</div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button style={{ ...styles.button, fontSize: '11px' }} onClick={handleSearchMoreLinks}>Buscar Más</button>
                                            <button style={{ ...styles.button, fontSize: '11px' }} onClick={handleRegenerateLinks}><IconRefresh /> Regenerar</button>
                                            <button style={{ ...styles.button, fontSize: '11px', backgroundColor: '#0F172A', color: 'white' }} onClick={() => setIsAddingLink(true)}><IconPlus /> Nuevo Enlace</button>
                                        </div>
                                    </div>

                                    {isAddingLink && (
                                        <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'end' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={styles.label}>URL</label>
                                                <input style={styles.input} value={tempLinkUrl} onChange={e => setTempLinkUrl(e.target.value)} placeholder="https://..." />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={styles.label}>Título / Anchor</label>
                                                <input style={styles.input} value={tempLinkTitle} onChange={e => setTempLinkTitle(e.target.value)} placeholder="Título del enlace..." />
                                            </div>
                                            <button type="button" onClick={handleAddLink} disabled={!tempLinkUrl || !tempLinkTitle} style={{ ...styles.button, height: '42px', opacity: (!tempLinkUrl || !tempLinkTitle) ? 0.5 : 1 }}>Guardar</button>
                                            <button type="button" onClick={() => setIsAddingLink(false)} style={{ ...styles.button, height: '42px', color: 'red' }}>Cancelar</button>
                                        </div>
                                    )}

                                    <div style={styles.linkListContainer as any}>
                                        {strategyLinks.length === 0 ? <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>No se encontraron coincidencias automáticas. Añade enlaces manuales.</span> : null}
                                        {strategyLinks.map((link, idx) => (
                                            <div key={idx} style={styles.linkRow as any}>
                                                <div style={{ width: '80px' }}><span style={styles.linkBadge(link.type) as any}>{link.type}</span></div>
                                                <div style={{ flex: 1, fontWeight: 600, fontSize: '13px' }}>{link.title}</div>
                                                <a href={link.url} target="_blank" rel="noreferrer" style={styles.urlLink}>{link.url}</a>
                                                <button style={{ ...styles.iconBtn, color: '#EF4444', borderColor: 'transparent' } as any} onClick={() => handleRemoveLink(link.url)}>
                                                    <IconTrash />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: STRUCTURE REVIEW */}
                {viewMode === 'structure-review' && (
                    <div style={styles.hubContainer as any}>
                        <div style={styles.hubContent as any}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={styles.hubTitle}>Definición de Estructura</div>
                                    <div style={styles.hubSubtitle}>El esqueleto del artículo, generado a partir de tus datos SEO.</div>
                                </div>
                                <div>
                                    <button
                                        style={{ ...styles.bigButton, padding: '16px 32px', width: 'auto', marginBottom: '8px' } as any}
                                        onClick={generateArticle}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? <LoadingSpinner /> : <><IconArrowRight /> Aprobar y Redactar</>}
                                    </button>

                                    {/* STRICT MODE CONTROLS */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input
                                                type="checkbox"
                                                id="strictMode"
                                                checked={isStrictMode}
                                                onChange={(e) => setIsStrictMode(e.target.checked)}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                            <label htmlFor="strictMode" style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>Modo Estricto</label>
                                        </div>
                                        {isStrictMode && (
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                        Intensidad: {strictFrequency}%
                                                    </span>
                                                    <input
                                                        type="range"
                                                        min="10" max="100" step="10"
                                                        value={strictFrequency}
                                                        onChange={(e) => setStrictFrequency(parseInt(e.target.value))}
                                                        style={{ width: '120px', cursor: 'pointer' }}
                                                    />
                                                </div>
                                                <div style={{ fontSize: '10px', color: strictFrequency > 60 ? '#DC2626' : '#166534', fontStyle: 'italic' }}>
                                                    {getStrictLabel(strictFrequency)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ ...styles.gridCard, marginBottom: '24px', width: '100%' } as any}>
                                <div style={styles.gridCardTitle}><IconSettings /> Instrucciones de Contexto Global</div>
                                <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
                                    Añade reglas de estilo, prohibiciones o contexto específico para que la IA lo tenga en cuenta durante toda la redacción.
                                </p>
                                <textarea
                                    style={{ ...styles.input, minHeight: '80px', fontFamily: 'monospace', fontSize: '13px' }}
                                    placeholder="Ej: No uses la palabra 'barato'. El tono debe ser muy técnico. Menciona siempre la garantía de 2 años."
                                    value={contextInstructions}
                                    onChange={(e) => setContextInstructions(e.target.value)}
                                />
                            </div>

                            <div style={styles.gridContainer as any}>
                                <div style={{ ...styles.gridCard, gridColumn: 'span 3' } as any}>
                                    <div style={styles.gridCardTitle}><IconSettings /> Configuración de Redacción</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={styles.label}>Nivel de Creatividad</label>
                                            <select style={styles.select as any} value={creativityLevel} onChange={e => setCreativityLevel(e.target.value as any)}>
                                                <option value="low">1. Conservador (Solo Tablas y Bullets)</option>
                                                <option value="medium">2. Equilibrado (Citas, Tablas y Bullets)</option>
                                                <option value="high">3. Alto Impacto (Rich Content)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={styles.label}>Meta Title</label>
                                            <input style={styles.input} value={strategyTitle} onChange={e => setStrategyTitle(e.target.value)} />
                                        </div>
                                        <div>
                                            <label style={styles.label}>H1</label>
                                            <input style={styles.input} value={strategyH1} onChange={e => setStrategyH1(e.target.value)} />
                                        </div>
                                        <div>
                                            <label style={styles.label}>Slug URL</label>
                                            <input style={styles.input} value={strategySlug} onChange={e => setStrategySlug(e.target.value)} />
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label style={styles.label}>Meta Description</label>
                                            <textarea style={styles.input} value={strategyDesc} onChange={e => setStrategyDesc(e.target.value)} rows={2} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ ...styles.gridCard, gridColumn: 'span 3' } as any}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={styles.gridCardTitle}><IconFile /> Estructura del Contenido</div>
                                        <button style={{ ...styles.button, fontSize: '12px' }} onClick={handleAddOutlineItem}>+ Añadir Header</button>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={styles.label}>Instrucciones Intro</label>
                                        <textarea style={styles.input} value={strategyNotes} onChange={e => setStrategyNotes(e.target.value)} rows={2} />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {strategyOutline.map((item, idx) => (
                                            <div key={idx} style={{ ...styles.outlineRow, flexDirection: 'column', alignItems: 'flex-start' } as any}>
                                                <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                                                    <select
                                                        style={{ ...styles.select, width: '80px' }}
                                                        value={item.type}
                                                        onChange={(e) => handleUpdateOutlineItem(idx, 'type', e.target.value)}
                                                    >
                                                        <option>H2</option><option>H3</option><option>H4</option>
                                                    </select>
                                                    <input
                                                        style={{ ...styles.input, flex: 1 }}
                                                        value={item.text}
                                                        onChange={(e) => handleUpdateOutlineItem(idx, 'text', e.target.value)}
                                                        placeholder="Texto del encabezado"
                                                    />
                                                    <input
                                                        style={{ ...styles.input, width: '100px' }}
                                                        value={item.wordCount}
                                                        onChange={(e) => handleUpdateOutlineItem(idx, 'wordCount', e.target.value)}
                                                        placeholder="Palabras"
                                                    />
                                                    <button style={styles.iconBtn as any} onClick={() => handleDeleteOutlineItem(idx)}>
                                                        <IconTrash />
                                                    </button>
                                                </div>
                                                <input
                                                    style={{ ...styles.input, fontSize: '12px', background: '#fff', borderTop: 'none' }}
                                                    value={item.notes || ''}
                                                    onChange={(e) => handleUpdateOutlineItem(idx, 'notes', e.target.value)}
                                                    placeholder="Instrucciones..."
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: DIRECT HUMANIZE */}
                {viewMode === 'humanize' && (
                    <div style={styles.hubContainer as any}>
                        <div style={styles.hubContent as any}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <div style={styles.hubTitle}>Humanizador Directo</div>
                                    <div style={styles.hubSubtitle}>Pega un texto o HTML existente para eliminar patrones de IA conservando enlaces y estructura.</div>
                                </div>
                                <button
                                    style={{ ...styles.bigButton, padding: '16px 32px', width: 'auto' } as any}
                                    onClick={() => handleHumanize(humanizeInput)}
                                    disabled={isHumanizing || !humanizeInput}
                                >
                                    {isHumanizing ? <LoadingSpinner /> : <><IconGhost /> Humanizar Ahora</>}
                                </button>
                            </div>

                            <div style={styles.gridContainer as any}>
                                <div style={{ ...styles.gridCard, gridColumn: 'span 2' } as any}>
                                    <div style={styles.gridCardTitle}><IconFile /> Contenido a Humanizar</div>
                                    <textarea
                                        style={{ ...styles.textarea, minHeight: '500px', fontSize: '14px', fontFamily: 'monospace' }}
                                        placeholder="Pega aquí tu HTML o Texto plano..."
                                        value={humanizeInput}
                                        onChange={(e) => setHumanizeInput(e.target.value)}
                                    />
                                </div>
                                <div style={{ ...styles.gridCard, gridColumn: 'span 1' } as any}>
                                    <div style={styles.gridCardTitle}><IconSettings /> Configuración</div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>
                                            <span>Intensidad de Humanización</span>
                                            <span>{humanizerPercent}%</span>
                                        </div>
                                        <input
                                            type="range" min="30" max="100" step="10"
                                            value={humanizerPercent}
                                            onChange={(e) => setHumanizerPercent(parseInt(e.target.value))}
                                            style={{ width: '100%', cursor: 'pointer' }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={styles.label}>Nicho de Re-escritura</label>
                                        <input
                                            style={styles.input}
                                            value={detectedNiche}
                                            onChange={(e) => setDetectedNiche(e.target.value)}
                                            placeholder="Ej: Decoración de Interiores"
                                        />
                                    </div>

                                    <div>
                                        <label style={styles.label}>Notas de Estilo</label>
                                        <textarea
                                            style={{ ...styles.input, minHeight: '100px' }}
                                            value={humanizerNotes}
                                            onChange={(e) => setHumanizerNotes(e.target.value)}
                                            placeholder="Ej: Usa un tono más sarcástico, evita frases largas..."
                                        />
                                    </div>

                                    {humanizerStatus && (
                                        <div style={{ marginTop: '20px', padding: '12px', background: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD', color: '#0369A1', fontSize: '13px' }}>
                                            {humanizerStatus}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: WORKSPACE */}
                {viewMode === 'workspace' && (
                    <div style={styles.workspaceContainer as any}>
                        {/* LEFT SIDEBAR */}
                        <div style={{ ...styles.sidebar, ...(isSidebarOpen ? styles.sidebarOpen : styles.sidebarCollapsed) } as any}>
                            <div style={styles.sidebarHeader as any}>
                                {isSidebarOpen && <span style={{ fontWeight: 700, fontSize: '14px' }}>Navegación</span>}
                                <button style={styles.toggleBtn} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                                    {isSidebarOpen ? <IconChevronLeft /> : <IconMenu />}
                                </button>
                            </div>

                            {isSidebarOpen ? (
                                <div style={styles.sidebarContent as any}>
                                    <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Datos del Proyecto</div>
                                        <div style={{ fontSize: '13px', color: '#166534' }}>● {csvData.length.toLocaleString()} URLs activas</div>
                                        <div style={{ fontSize: '13px', color: '#64748B' }}>● Nicho: {detectedNiche}</div>
                                    </div>

                                    {/* INTERLINKING SUGGESTIONS */}
                                    {(associatedUrl || secondaryUrl) && (
                                        <div style={{ padding: '12px', background: '#FEF3C7', borderRadius: '8px', border: '1px solid #FDE68A', marginTop: '8px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <IconLink size={14} /> Enlaces de Interlinking
                                            </div>
                                            {associatedUrl && (
                                                <div style={{ marginBottom: '6px' }}>
                                                    <div style={{ fontSize: '10px', color: '#B45309', fontWeight: 600 }}>Principal (associated_url)</div>
                                                    <a href={associatedUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#D97706', textDecoration: 'underline', wordBreak: 'break-all' }}>{associatedUrl}</a>
                                                </div>
                                            )}
                                            {secondaryUrl && (
                                                <div>
                                                    <div style={{ fontSize: '10px', color: '#B45309', fontWeight: 600 }}>Secundario (secondary_url)</div>
                                                    <a href={secondaryUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#D97706', textDecoration: 'underline', wordBreak: 'break-all' }}>{secondaryUrl}</a>
                                                </div>
                                            )}
                                            <p style={{ fontSize: '10px', color: '#92400E', marginTop: '8px', fontStyle: 'italic', lineHeight: 1.2 }}>
                                                Es mandatorio que incluyas estos enlaces en el contenido.
                                            </p>
                                        </div>
                                    )}

                                    <button style={{ ...styles.button, justifyContent: 'center' }} onClick={handleNewContent}>
                                        <IconPlus /> Nuevo Contenido
                                    </button>
                                    <button onClick={handleSaveCloud} style={{ ...styles.button, background: '#166534', color: 'white', width: '100%', justifyContent: 'center', marginTop: '8px' }} disabled={isSaving}><IconCloud /> {isSaving ? "Salvando..." : "Guardar en Nube"}</button>

                                    {draftId && (
                                        <button
                                            onClick={() => setShowShareModal(true)}
                                            style={{ ...styles.button, width: '100%', justifyContent: 'center', marginTop: '8px' }}
                                        >
                                            <Globe size={16} /> Compartir Borrador
                                        </button>
                                    )}

                                    {linkedTaskId && (
                                        <button
                                            onClick={handleCompleteTask}
                                            style={{ ...styles.button, background: '#4F46E5', color: 'white', width: '100%', justifyContent: 'center', marginTop: '8px', border: '1px solid #4338ca' }}
                                            disabled={isSaving}
                                        >
                                            <IconCheck /> {isSaving ? "Procesando..." : "Terminar Tarea"}
                                        </button>
                                    )}

                                    {draftId && (
                                        <Link
                                            href={`/herramientas/blog-viz?draftId=${draftId}`}
                                            style={{ ...styles.button, background: '#6366F1', color: 'white', width: '100%', justifyContent: 'center', marginTop: '8px', textDecoration: 'none' } as any}
                                        >
                                            <IconSparkles /> Diseñar con BlogViz AI
                                        </Link>
                                    )}

                                    <button
                                        onClick={handleExportToDocs}
                                        disabled={isExporting || !htmlContent}
                                        style={{ ...styles.button, background: '#0F9D58', color: 'white', width: '100%', justifyContent: 'center', marginTop: '8px' } as any}
                                    >
                                        <FileText size={16} /> {isExporting && status === "Exportando a Google Docs..." ? "Exportando..." : "Exportar a Google Docs"}
                                    </button>

                                    <button
                                        onClick={handleExportToWordPress}
                                        disabled={isExporting || !htmlContent}
                                        style={{ ...styles.button, border: '1px solid #0073AA', background: 'white', color: '#0073AA', width: '100%', justifyContent: 'center', marginTop: '8px' } as any}
                                    >
                                        <Globe size={16} /> {isExporting && status === "Publicando en WordPress..." ? "Publicando..." : "Distribuir a WordPress"}
                                    </button>

                                    <div>
                                        <div style={styles.sectionTitle}>Refinamiento de Artículo</div>
                                        <p style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
                                            Instruye a la IA para modificar el contenido actual (Ej: "Cambia el tono a uno más técnico", "Añade una tabla de precios").
                                        </p>
                                        <textarea
                                            style={{ ...styles.input, minHeight: '100px', fontSize: '12px' }}
                                            placeholder="Instrucciones para refinar..."
                                            value={refinementInstructions}
                                            onChange={(e) => setRefinementInstructions(e.target.value)}
                                        />
                                        <button
                                            style={{ ...styles.button, marginTop: '8px', width: '100%', justifyContent: 'center' }}
                                            onClick={handleRefineContent}
                                            disabled={isRefining || !htmlContent}
                                        >
                                            {isRefining ? <LoadingSpinner /> : "Refinar Artículo"}
                                        </button>
                                    </div>

                                    <button
                                        style={{ ...styles.button, ...styles.primaryBtn, marginTop: 'auto' }}
                                        onClick={generateArticle}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? <><LoadingSpinner /> Redactando...</> : <><IconRefresh /> Regenerar Todo (Reset)</>}
                                    </button>
                                </div>
                            ) : (
                                <div style={styles.iconRail as any}>
                                    <div style={styles.railIcon} title="Guardar" onClick={handleSaveCloud}><IconSave /></div>
                                    <div style={styles.railIcon} title="Nuevo" onClick={handleNewContent}><IconPlus /></div>
                                    <div style={styles.railIcon} title="Regenerar" onClick={() => setIsSidebarOpen(true)}><IconRefresh /></div>
                                </div>
                            )}
                        </div>

                        {/* MAIN CANVAS */}
                        <div style={styles.main as any}>
                            <header style={styles.header as any}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {status ? <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><LoadingSpinner /><span style={{ fontSize: '13px', color: '#6366F1', fontWeight: 500 }}>{status}</span></div> : null}
                                    {/* {draftId && <PresenceAvatars itemType="draft" channelId={draftId.toString()} />} */}
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <TimeTracker
                                        taskId={linkedTaskId || undefined}
                                        taskTitle={linkedTaskTitle || undefined}
                                        projectId={linkedProjectId || undefined}
                                    />
                                    {htmlContent && (
                                        <button 
                                            style={{ ...styles.button, backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #D1FAE5' } as any} 
                                            onClick={() => setSidebarTab('seo')}
                                        >
                                            <IconRadar size={16} /> Re-analizar SEO
                                        </button>
                                    )}
                                    {metadata && (
                                        <button style={styles.button as any} onClick={copyRichText}>
                                            <IconCopy /> Copiar
                                        </button>
                                    )}
                                </div>
                            </header>

                            <div style={styles.contentArea as any}>
                                <div style={styles.paper as any}>
                                    <div style={styles.articleScroll as any}>
                                        {!htmlContent && !isGenerating ? (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', flexDirection: 'column', gap: '16px' }}>
                                                <div style={{ transform: 'scale(2)', opacity: 0.5 }}><IconSparkles /></div>
                                                <p>Esperando contenido...</p>
                                            </div>
                                        ) : (
                                            <div 
                                                className="article-content custom-editor" 
                                                ref={previewRef} 
                                                contentEditable={!isGenerating}
                                                onBlur={handleEditorChange}
                                                onInput={handleEditorChange}
                                                dangerouslySetInnerHTML={{ __html: htmlContent }} 
                                                style={{ outline: 'none', minHeight: '500px' }}
                                            />
                                        )}
                                        <div style={{ height: '100px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDEBAR: FINAL TOOLS */}
                        <div style={{ ...styles.rightSidebar, height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 } as any}>

                            {/* FIXED HEADER AREA IN SIDEBAR */}
                            <div style={{ borderBottom: '1px solid #E2E8F0', background: '#fff', zIndex: 20 }}>
                                <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9' }}>
                                    <button 
                                        onClick={() => setSidebarTab('generate')}
                                        style={{ 
                                            flex: 1, 
                                            padding: '12px', 
                                            fontSize: '12px', 
                                            fontWeight: 700, 
                                            border: 'none', 
                                            background: activeSidebarTab === 'generate' ? '#fff' : '#F8FAFC',
                                            color: activeSidebarTab === 'generate' ? '#6366F1' : '#64748B',
                                            borderBottom: activeSidebarTab === 'generate' ? '2px solid #6366F1' : 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Generación
                                    </button>
                                    <button 
                                        onClick={() => setSidebarTab('seo')}
                                        style={{ 
                                            flex: 1, 
                                            padding: '12px', 
                                            fontSize: '12px', 
                                            fontWeight: 700, 
                                            border: 'none', 
                                            background: activeSidebarTab === 'seo' ? '#fff' : '#F8FAFC',
                                            color: activeSidebarTab === 'seo' ? '#6366F1' : '#64748B',
                                            borderBottom: activeSidebarTab === 'seo' ? '2px solid #6366F1' : 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        SEO Review
                                    </button>
                                </div>
                                <div style={{ padding: '16px' }}>
                                    {activeSidebarTab === 'generate' ? (
                                        <>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '12px', fontFamily: "'Outfit', sans-serif" }}>Asistente Creativo</div>
                                            <button
                                                onClick={handleRunCombined}
                                                disabled={!htmlContent || isRunningCombined || isHumanizing || isEditing}
                                                style={{ ...styles.button, width: '100%', justifyContent: 'center', fontSize: '12px' } as any}
                                            >
                                                {isRunningCombined ? <LoadingSpinner /> : "Humanizar + Editar (Auto)"}
                                            </button>
                                            {combinedStatus && <div style={{ textAlign: 'center', fontSize: '10px', color: '#6366F1', marginTop: '4px', fontWeight: 600 }}>{combinedStatus}</div>}
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '12px', fontFamily: "'Outfit', sans-serif" }}>Analizador SEO Real-Time</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                                                <span>Palabras: <strong>{seoStats.totalWords}</strong></span>
                                                <span style={{ color: '#166534' }}>Meta: {strategyWordCount}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ ...styles.inspectorScroll, flexGrow: 1, overflowY: 'auto', minHeight: 0 } as any}>
                                {activeSidebarTab === 'generate' ? (
                                    <>
                                        {/* HUMANIZER SECTION */}
                                        <div style={styles.toolCard as any}>
                                            <div style={styles.toolCardHeader}>
                                                <IconGhost /> <span>Humanizador Manual</span>
                                            </div>
                                            <div style={styles.toolCardBody}>
                                                <div style={{ marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#64748B' }}>
                                                        <span>Intensidad</span>
                                                        <span>{humanizerPercent}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="30" max="100" step="10"
                                                        value={humanizerPercent}
                                                        onChange={(e) => setHumanizerPercent(parseInt(e.target.value))}
                                                        style={{ width: '100%', cursor: 'pointer' }}
                                                    />
                                                </div>
                                                <textarea
                                                    style={{ ...styles.input, fontSize: '11px', minHeight: '50px', marginBottom: '8px' }}
                                                    placeholder="Notas de tono (ej: Imperfecto, casual...)"
                                                    value={humanizerNotes}
                                                    onChange={(e) => setHumanizerNotes(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => handleHumanize()}
                                                    disabled={!htmlContent || isHumanizing}
                                                    style={{ ...styles.button, width: '100%', justifyContent: 'center', fontSize: '12px' }}
                                                >
                                                    {isHumanizing ? <LoadingSpinner /> : "Ejecutar Humanizador"}
                                                </button>
                                                {humanizerStatus && <div style={{ fontSize: '10px', color: '#DC2626', marginTop: '8px', fontWeight: 600 }}>{humanizerStatus}</div>}
                                            </div>
                                        </div>

                                        {/* SMART EDITOR SECTION */}
                                        <div style={styles.toolCard as any}>
                                            <div style={styles.toolCardHeader}>
                                                <IconEdit /> <span>Editor Manual</span>
                                            </div>
                                            <div style={styles.toolCardBody}>
                                                <div style={{ marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#64748B' }}>
                                                        <span>Límite Edición</span>
                                                        <span>{editorPercentage}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="5" max="40" step="5"
                                                        value={editorPercentage}
                                                        onChange={(e) => setEditorPercentage(parseInt(e.target.value))}
                                                        style={{ width: '100%', cursor: 'pointer' }}
                                                    />
                                                </div>
                                                <textarea
                                                    style={{ ...styles.input, fontSize: '11px', minHeight: '50px', marginBottom: '8px' }}
                                                    placeholder="Instrucciones..."
                                                    value={editorNotes}
                                                    onChange={(e) => setEditorNotes(e.target.value)}
                                                />
                                                <button
                                                    onClick={handleSmartEdit}
                                                    disabled={!htmlContent || isEditing}
                                                    style={{ ...styles.button, width: '100%', justifyContent: 'center', fontSize: '12px' }}
                                                >
                                                    {isEditing ? <LoadingSpinner /> : "Ejecutar Editor"}
                                                </button>
                                                {editorStatus && <div style={{ fontSize: '10px', color: '#0F172A', marginTop: '8px', fontWeight: 600 }}>{editorStatus}</div>}
                                            </div>
                                        </div>

                                        {/* SHOOTING AI */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsImageConfigOpen(!isImageConfigOpen)}>
                                                <div style={styles.sectionTitle}>Shooting AI (Generación)</div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {(aiImages.length > 0 || featuredImage) && <button onClick={(e) => { e.stopPropagation(); handleDownloadZip(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6366F1' }}><IconZip /></button>}
                                                    {isImageConfigOpen ? <IconChevronUp /> : <IconChevronDown />}
                                                </div>
                                            </div>

                                            {isImageConfigOpen && (
                                                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>

                                                    <label style={styles.label}>Marca de Agua (PNG Logo)</label>
                                                    <div style={styles.customSizeBox as any}>
                                                        <input
                                                            type="file"
                                                            accept="image/png"
                                                            onChange={handleUploadWatermark}
                                                            ref={watermarkInputRef}
                                                            style={{ display: 'none' }}
                                                        />
                                                        <button
                                                            onClick={() => watermarkInputRef.current?.click()}
                                                            style={{ ...styles.button, fontSize: '11px', padding: '4px 8px' }}
                                                        >
                                                            {watermarkFile ? "✅ Logo Cargado (Guardado)" : "Subir PNG (Transparente)"}
                                                        </button>
                                                    </div>
                                                    <br />

                                                    <label style={styles.label}>Estilo & Prompt Global</label>
                                                    <select
                                                        style={{ ...styles.select, marginBottom: '8px' }}
                                                        value={imageConfig.style}
                                                        onChange={e => setImageConfig({ ...imageConfig, style: e.target.value })}
                                                    >
                                                        <option value="Auto">Auto (Recomendado)</option>
                                                        <option value="Hyperrealistic">Hiperrealista (Fotografía)</option>
                                                        <option value="2D Vector">Ilustración Vectorial 2D</option>
                                                        <option value="3D Isometric">3D Isométrico</option>
                                                        <option value="Minimalist">Minimalista Plano</option>
                                                        <option value="Cinematic">Cinemático / Película</option>
                                                    </select>
                                                    <textarea
                                                        style={{ ...styles.input, fontSize: '11px', minHeight: '50px', marginBottom: '12px' }}
                                                        placeholder="Instrucciones visuales extra..."
                                                        value={imageConfig.userPrompt}
                                                        onChange={e => setImageConfig({ ...imageConfig, userPrompt: e.target.value })}
                                                    />

                                                    <button
                                                        style={{ ...styles.button, ...styles.accentBtn, width: '100%', justifyContent: 'center' }}
                                                        onClick={handleGenerateAllImages}
                                                        disabled={!htmlContent || isGeneratingImages}
                                                    >
                                                        {isGeneratingImages ? <><LoadingSpinner /> Generando...</> : <><IconMagic /> Generar Set Gráfico</>}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {featuredImage && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <label style={styles.label}>Portada</label>
                                                <div style={styles.aiImageCard as any}>
                                                    <div style={styles.aiImagePreview as any}>
                                                        {featuredImage.status === 'generating' && <div className="shimmer" style={{ width: '100%', height: '100%', position: 'absolute' }}></div>}
                                                        <img src={featuredImage.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                    <div style={styles.aiImageMeta as any}>
                                                        <div style={styles.metaLabel}>{featuredImage.filename}</div>
                                                        <div style={styles.aiActions}>
                                                            <button style={styles.iconBtn as any} onClick={() => handleDownloadSingle(featuredImage)}><IconDownload /></button>
                                                            <button style={{ ...styles.iconBtn, flex: 1 } as any} onClick={() => handleRegenerateImage('featured')} disabled={featuredImage.status === 'generating'}><IconRefresh /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {aiImages.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <label style={styles.label}>Imágenes del Cuerpo</label>
                                                {aiImages.map((img, idx) => (
                                                    <div key={idx} style={styles.aiImageCard as any}>
                                                        <div style={styles.aiImagePreview as any}>
                                                            {img.status === 'generating' && <div className="shimmer" style={{ width: '100%', height: '100%', position: 'absolute' }}></div>}
                                                            {img.imageUrl && <img src={img.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                        </div>
                                                        <div style={styles.aiImageMeta as any}>
                                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6366F1', marginBottom: '4px' }}>{img.placement}</div>
                                                            <div style={styles.aiActions}>
                                                                <button style={styles.iconBtn as any} onClick={() => handleDownloadSingle(img)} disabled={!img.imageUrl}><IconDownload /></button>
                                                                <button style={{ ...styles.iconBtn, flex: 1 } as any} onClick={() => handleRegenerateImage(idx)} disabled={img.status === 'generating'}><IconRefresh /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                                      {/* SEO TAB CONTENT - Fully Interactive */}
                                        <div style={styles.toolCard as any}>
                                            <div style={styles.toolCardHeader}>
                                                <IconRadar /> <span>Keywords Principales</span>
                                            </div>
                                            <div style={styles.toolCardBody}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 700 }}>{seoStats.mainKeyword.keyword}</span>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{ 
                                                            fontSize: '12px', 
                                                            fontWeight: 800,
                                                            color: parseFloat(seoStats.mainKeyword.density) > 3 ? '#EF4444' : '#10B981'
                                                        }}>
                                                            {seoStats.mainKeyword.density}%
                                                        </span>
                                                        <span style={{ fontSize: '10px', color: '#64748B' }}>{seoStats.mainKeyword.count} veces</span>
                                                    </div>
                                                </div>

                                                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: '4px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>LSI & Semántica ({strategyLSI.length})</div>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                                        <input 
                                                            style={{ ...styles.input, fontSize: '11px', height: '32px' }} 
                                                            placeholder="Añadir Keyword..."
                                                            value={tempLsiInput}
                                                            onChange={e => setTempLsiInput(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && handleAddLSI()}
                                                        />
                                                        <button onClick={handleAddLSI} style={{ ...styles.button, width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}>+</button>
                                                    </div>

                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                                                        {seoStats.lsi.map((k, i) => (
                                                            <div key={i} style={{ 
                                                                ...styles.keywordTag, 
                                                                fontSize: '11px', 
                                                                padding: '4px 8px',
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '6px',
                                                                backgroundColor: k.count > 0 ? '#ECFDF5' : '#F8FAFC',
                                                                borderColor: k.count > 0 ? '#10B981' : '#E2E8F0',
                                                                color: k.count > 0 ? '#065F46' : '#64748B'
                                                            } as any}>
                                                                {k.count > 0 && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>}
                                                                {k.keyword} ({k.count})
                                                                <button onClick={() => handleRemoveLSI(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>×</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={styles.toolCard as any}>
                                            <div style={{ ...styles.toolCardHeader, justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><IconLink /> <span>Enlaces ({strategyLinks.length})</span></div>
                                                <button onClick={handleSearchMoreLinks} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6366F1', fontSize: '11px', fontWeight: 700 }}>Buscar Más</button>
                                            </div>
                                            <div style={{ ...styles.toolCardBody, maxHeight: '200px', overflowY: 'auto' }}>
                                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                                    <input 
                                                        style={{ ...styles.input, fontSize: '11px', height: '30px' }} 
                                                        placeholder="https://..."
                                                        value={tempLinkUrl}
                                                        onChange={e => setTempLinkUrl(e.target.value)}
                                                    />
                                                    <button onClick={handleAddLink} style={{ ...styles.button, width: '30px', height: '30px', padding: 0, justifyContent: 'center' }}>+</button>
                                                </div>
                                                {strategyLinks.map((l, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '6px', padding: '6px', background: '#F8FAFC', borderRadius: '6px' }}>
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={l.url}>
                                                            {l.title || l.url}
                                                        </div>
                                                        <button onClick={() => handleRemoveLink(l.url)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444' }}><IconTrash size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={styles.toolCard as any}>
                                            <div style={styles.toolCardHeader}>
                                                <IconRadar /> <span>FAQs Strategy ({strategyQuestions.length})</span>
                                            </div>
                                            <div style={{ ...styles.toolCardBody, maxHeight: '200px', overflowY: 'auto' }}>
                                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                                    <input 
                                                        style={{ ...styles.input, fontSize: '11px', height: '32px' }} 
                                                        placeholder="Nueva Pregunta..."
                                                        value={tempFaqInput}
                                                        onChange={e => setTempFaqInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleAddFAQ()}
                                                    />
                                                    <button onClick={handleAddFAQ} style={{ ...styles.button, width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}>+</button>
                                                </div>
                                                {strategyQuestions.map((q, i) => (
                                                    <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '11px', marginBottom: '8px', padding: '6px', borderLeft: '3px solid #6366F1', background: '#F5F3FF' }}>
                                                        <span style={{ flex: 1 }}>{q}</span>
                                                        <button onClick={() => handleRemoveFAQ(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8' }}>×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {metadata && (
                                            <div style={styles.toolCard as any}>
                                                <div style={styles.toolCardHeader}>
                                                    <IconSEO /> <span>Metadata SEO</span>
                                                </div>
                                                <div style={styles.toolCardBody}>
                                                    <MetadataField label="Title Tag" value={metadata.title} />
                                                    <MetadataField label="Description" value={metadata.description} />
                                                    <MetadataField label="URL Slug" value={metadata.slug} />
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button 
                                                onClick={handleGenerateSchema}
                                                style={{ ...styles.button, width: '100%', justifyContent: 'center', background: '#0F172A', color: 'white' }}
                                            >
                                                <IconJson size={16} /> Generar Schema JSON-LD
                                            </button>
                                            <button 
                                                onClick={performSEO}
                                                style={{ ...styles.button, width: '100%', justifyContent: 'center', border: '1px solid #6366F1', color: '#6366F1' }}
                                            >
                                                <IconRefresh size={16} /> Re-analizar SEO
                                            </button>
                                        </div>
                                    </>
                                )}
                                <div style={{ height: '100px' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                itemType="draft"
                itemId={draftId}
                initialPublicAccess={publicAccess}
                initialShareToken={shareToken || undefined}
            /> */}
        </div>
    );
};

export default App;