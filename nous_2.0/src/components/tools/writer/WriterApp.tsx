"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
// Keeping styles for gradual migration, but will replace usage with Tailwind
import { styles } from './styles';
import {
    Save, Cloud, Upload, Sparkles, Copy, FileText, Globe, Image as ImageIcon,
    Download, RefreshCw, Wand2, FileArchive, Search, Menu, ChevronLeft,
    ArrowRight, Settings, User, Radar, Edit, Check, Trash, Code, Link as LinkIcon,
    Plus, ExternalLink, Palette, ChevronDown, ChevronUp, Ghost, Loader2
} from 'lucide-react';

import { MetadataField } from './components'; // Might need to inline this or update it
import {
    parseCSV, parseJSON, buildPrompt, generateArticleStream, suggestImagePlacements,
    generateRealImage, runSEOAnalysis, SEOAnalysisResult, ContentItem,
    ImageGenConfig, compositeWatermark, autoInterlink, runHumanizerPipeline,
    cleanAndFormatHtml, refineStyling, refineArticleContent, generateOutlineStrategy,
    searchMoreLinks, VisualResource, AIImageRequest, ArticleConfig, findCampaignAssets,
    generateSchemaMarkup, runSmartEditor, HumanizerConfig
} from './services';
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

const App = () => {
    const { user } = useAuthStore();
    const router = useRouter();
    const [draftId, setDraftId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // TASK CONTEXT STATE
    const [linkedTaskId, setLinkedTaskId] = useState<number | null>(null);
    const [linkedTaskTitle, setLinkedTaskTitle] = useState<string | null>(null);

    const [linkedProjectId, setLinkedProjectId] = useState<number | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [publicAccess, setPublicAccess] = useState<'none' | 'view' | 'edit'>('none');
    const [shareToken, setShareToken] = useState<string | null>(null);

    // --- APP STATE ---
    const [viewMode, setViewMode] = useState<'setup' | 'seo-review' | 'structure-review' | 'workspace'>('setup');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [configStep, setConfigStep] = useState<'data' | 'keyword'>('data');

    // Configuration State
    const [apiKeys, setApiKeys] = useState<string[]>(process.env.API_KEY ? [process.env.API_KEY] : []);
    const [showKeyModal, setShowKeyModal] = useState(false);

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
                const { data, error } = await supabase.from('tasks').select('*').eq('id', tid).single();
                if (error) throw error;
                if (data) {
                    setLinkedTaskId(data.id);
                    setLinkedTaskTitle(data.title);
                    setLinkedProjectId(data.project_id);
                    if (data.target_keyword) setTargetKeyword(data.target_keyword);
                    if (data.title && !strategyH1) setStrategyH1(data.title);
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

    // Output/Process State
    const [isGenerating, setIsGenerating] = useState(false);
    const [fullResponse, setFullResponse] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [metadata, setMetadata] = useState<any>(null);
    const [status, setStatus] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const [generatedSchema, setGeneratedSchema] = useState('');

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

            let jsonStr = parts[1].trim();
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
            if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
                try {
                    const meta = JSON.parse(jsonStr);
                    setMetadata(meta);
                } catch (e) { }
            }
        } else {
            let safeContent = cleanAndFormatHtml(cleanText);
            setHtmlContent(safeContent);
        }
    }, [fullResponse]);

    const loadUserKeys = async () => {
        try {
            const { data } = await supabase.from('user_api_keys').select('*');
            if (data) {
                const gKeys = data.filter(k => k.provider === 'gemini').map(k => k.key_value);
                if (gKeys.length > 0) setApiKeys(gKeys);

                const sKey = data.find(k => k.provider === 'serper');
                if (sKey) setSerperKey(sKey.key_value);

                const vKey = data.find(k => k.provider === 'valueserp');
                if (vKey) setValueSerpKey(vKey.key_value);

                const jKey = data.find(k => k.provider === 'jina');
                if (jKey) setJinaKey(jKey.key_value);

                const uKey = data.find(k => k.provider === 'unstructured');
                if (uKey) setUnstructuredKey(uKey.key_value);
            }
        } catch (e) { console.error("Error loading keys", e); }
    };

    const checkIfKeySaved = async (val: string, provider: string) => {
        if (!user || !val || val.length < 10) return;
        const { data } = await supabase.from('user_api_keys').select('id').eq('key_value', val).eq('provider', provider);
        if (!data || data.length === 0) {
            if (confirm(`¿Deseas guardar esta nueva API Key de ${provider} en tu perfil para usarla automáticamente después?`)) {
                await supabase.from('user_api_keys').insert([{ user_id: user.id, provider, key_value: val, label: 'Auto-guardada' }]);
                alert("Clave guardada con éxito.");
            }
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

        if (apiKeys.length === 0) {
            alert("Debes configurar al menos una Google AI Key.");
            return;
        }

        setIsAnalyzingSEO(true);
        setStatus("Fase 1/2: Consultando SERP Trends (Prioridad Serper > ValueSERP > Jina)...");

        try {
            // Pass all keys
            const data = await runSEOAnalysis(apiKeys, targetKeyword, csvData, projectName, serperKey, valueSerpKey, jinaKey);
            setRawSeoData(data);

            setStrategyCompetitors(data.top10Urls?.map(u => u.url).join('\n') || "");
            setDetectedNiche(data.nicheDetected || "General");
            setStrategyLinks(data.suggestedInternalLinks || []);
            setStrategyWordCount(data.recommendedWordCount || "1500");

            setStrategyLSI(data.lsiKeywords || []);
            setStrategyLongTail(data.autocompleteLongTail || []);
            setStrategyQuestions(data.frequentQuestions || []);

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

            const structureData = await generateOutlineStrategy(apiKeys, currentConfig, targetKeyword);

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
        setIsRefining(true);
        setStatus("Refinando artículo con IA...");

        try {
            const refined = await refineArticleContent(apiKeys, htmlContent, refinementInstructions);
            const styled = refineStyling(refined); // Maintain style
            setHtmlContent(styled);
            setRefinementInstructions(''); // Clear after success
            setStatus("Refinamiento completado.");
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

    // --- Humanizer Handler ---
    const handleHumanize = async () => {
        if (!htmlContent) return;

        setIsHumanizing(true);
        setHumanizerStatus("Iniciando pipeline de humanización...");
        setStatus("Humanizando contenido...");

        const config: HumanizerConfig = {
            niche: detectedNiche || 'General',
            audience: 'Público General y Expertos',
            keywords: targetKeyword,
            notes: humanizerNotes,
            lsiKeywords: strategyLSI.map(l => l.keyword).concat(strategyLongTail), // Ensure LSI passed
            links: strategyLinks,
            isStrictMode,
            strictFrequency,
            questions: strategyQuestions
        };

        try {
            const { html } = await runHumanizerPipeline(
                apiKeys,
                htmlContent,
                config,
                humanizerPercent,
                (msg) => setHumanizerStatus(msg)
            );

            // Post-Processing: Refine Styles
            const refinedHtml = refineStyling(html);

            setHtmlContent(refinedHtml);
            setHumanizerStatus(`✅ Completado al ${humanizerPercent}% + Estilos Refinados.`);
            setStatus("Humanización completada.");

        } catch (e: any) {
            handleApiError(e, handleHumanize);
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
                    strategyH1
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
            await supabase.from('tasks').update({ status: 'review' }).eq('id', linkedTaskId);

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

    // --- NAVIGATION HELPERS ---
    const steps = [
        { id: 'setup', label: 'Configuración', icon: <IconSettings />, enabled: true },
        { id: 'seo-review', label: 'Estrategia SEO', icon: <IconRadar />, enabled: true },
        { id: 'structure-review', label: 'Estructura', icon: <IconFile />, enabled: true },
        { id: 'workspace', label: 'Editor & Visuales', icon: <IconEdit />, enabled: true }
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
                                            to={`/herramientas/blog-viz?draftId=${draftId}`}
                                            style={{ ...styles.button, background: '#6366F1', color: 'white', width: '100%', justifyContent: 'center', marginTop: '8px', textDecoration: 'none' } as any}
                                        >
                                            <IconSparkles /> Diseñar con BlogViz AI
                                        </Link>
                                    )}

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
                                    {draftId && <PresenceAvatars itemType="draft" channelId={draftId.toString()} />}
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
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
                                            <div className="article-content" ref={previewRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
                                        )}
                                        <div style={{ height: '100px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDEBAR: FINAL TOOLS */}
                        <div style={{ ...styles.rightSidebar, height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 } as any}>

                            {/* FIXED HEADER AREA IN SIDEBAR */}
                            <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', background: '#fff', zIndex: 20 }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '12px', fontFamily: "'Outfit', sans-serif" }}>Asistente Creativo</div>
                                <button
                                    onClick={handleRunCombined}
                                    disabled={!htmlContent || isRunningCombined || isHumanizing || isEditing}
                                    style={{ ...styles.button, width: '100%', justifyContent: 'center', fontSize: '12px' } as any}
                                >
                                    {isRunningCombined ? <LoadingSpinner /> : "Humanizar + Editar (Auto)"}
                                </button>
                                {combinedStatus && <div style={{ textAlign: 'center', fontSize: '10px', color: '#6366F1', marginTop: '4px', fontWeight: 600 }}>{combinedStatus}</div>}
                            </div>

                            <div style={{ ...styles.inspectorScroll, flexGrow: 1, overflowY: 'auto', minHeight: 0 } as any}>
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
                                            onClick={handleHumanize}
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

                                {metadata && (
                                    <div>
                                        <div style={styles.sectionTitle}>SEO Metadata</div>
                                        <MetadataField label="Title Tag" value={metadata.title} />
                                        <MetadataField label="Meta Description" value={metadata.description} />
                                        <MetadataField label="Slug" value={metadata.slug} />
                                        <div style={{ borderTop: '1px solid #F1F5F9', margin: '20px 0' }}></div>
                                    </div>
                                )}

                                {/* Schema Generator */}
                                {/* ... (Rest of sidebar remains same) ... */}
                                {/* SHOOTING AI */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsImageConfigOpen(!isImageConfigOpen)}>
                                        <div style={styles.sectionTitle}>Shooting AI (Generación)</div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {(aiImages.length > 0 || featuredImage) && <button onClick={(e) => { e.stopPropagation(); handleDownloadZip(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6366F1' }}><IconZip /></button>}
                                            {isImageConfigOpen ? <IconChevronUp /> : <IconChevronDown />}
                                        </div>
                                    </div>

                                    {/* Configuration Section */}
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

                                            <label style={styles.label}>Paleta de Colores (Max 5)</label>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                                {imageConfig.colors.map((col, idx) => (
                                                    <div key={idx} style={{ position: 'relative' }}>
                                                        <input
                                                            type="color"
                                                            value={col}
                                                            onChange={e => handleUpdateColor(idx, e.target.value)}
                                                            style={{ width: '24px', height: '24px', border: 'none', padding: 0, borderRadius: '4px', cursor: 'pointer' }}
                                                        />
                                                        <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', width: '10px', height: '10px', borderRadius: '50%', cursor: 'pointer' }} onClick={() => handleRemoveColor(idx)}></div>
                                                    </div>
                                                ))}
                                                {imageConfig.colors.length < 5 && (
                                                    <button onClick={handleAddColor} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px dashed #94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>+</button>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={styles.label}>Tamaño Portada</label>
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        <input style={styles.smallInput} value={imageConfig.customDimensions.w} onChange={e => setImageConfig({ ...imageConfig, customDimensions: { ...imageConfig.customDimensions, w: e.target.value } })} placeholder="W" />
                                                        <span style={{ fontSize: '10px' }}>x</span>
                                                        <input style={styles.smallInput} value={imageConfig.customDimensions.h} onChange={e => setImageConfig({ ...imageConfig, customDimensions: { ...imageConfig.customDimensions, h: e.target.value } })} placeholder="H" />
                                                    </div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={styles.label}>Cant. Cuerpo</label>
                                                    <select style={styles.select} value={imageConfig.count} onChange={e => setImageConfig({ ...imageConfig, count: e.target.value })}>
                                                        <option value="auto">Auto</option>
                                                        <option value="1">1 Imagen</option>
                                                        <option value="3">3 Imágenes</option>
                                                        <option value="5">5 Imágenes</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        style={{ ...styles.button, ...styles.accentBtn, width: '100%', justifyContent: 'center', marginBottom: '20px' }}
                                        onClick={handleGenerateAllImages}
                                        disabled={!htmlContent || isGeneratingImages}
                                    >
                                        {isGeneratingImages ? <><LoadingSpinner /> Generando Set...</> : <><IconMagic /> Generar Todo el Set Gráfico</>}
                                    </button>

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
                                                    <input style={{ ...styles.input, marginTop: '8px', padding: '6px', fontSize: '11px' }} value={regenNotes['featured'] || ''} onChange={(e) => setRegenNotes({ ...regenNotes, 'featured': e.target.value })} placeholder="Ajustes portada..." />
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
                                                        <input style={{ ...styles.input, marginTop: '8px', padding: '6px', fontSize: '11px' }} value={regenNotes[img.id] || ''} onChange={(e) => setRegenNotes({ ...regenNotes, [img.id]: e.target.value })} placeholder="Ajustes visuales..." />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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