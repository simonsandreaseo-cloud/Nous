
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { styles } from './styles';
import { IconUpload, IconSparkles, IconCopy, IconFile, IconSEO, IconImage, IconDownload, IconRefresh, IconMagic, IconZip, IconSearch, IconChevronLeft, IconMenu, IconArrowRight, IconSettings, IconUser, IconRadar, IconEdit, IconCheck, IconTrash, IconJson, IconLink, IconPlus, IconExternal, IconPalette, IconChevronDown, IconChevronUp, IconGhost, LoadingSpinner, IconSave, IconCloud } from './components';
import { MetadataField } from './components';
import { parseCSV, parseJSON, buildPrompt, generateArticleStream, findCampaignAssets, suggestImagePlacements, generateRealImage, ArticleConfig, VisualResource, AIImageRequest, runSEOAnalysis, SEOAnalysisResult, generateSchemaMarkup, ContentItem, ImageGenConfig, compositeWatermark, autoInterlink, runHumanizerPipeline, HumanizerConfig, runSmartEditor, generateOutlineStrategy, searchMoreLinks, cleanAndFormatHtml, refineStyling, refineArticleContent } from './services';

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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit, sans-serif' }}>
                    <IconSettings /> Gestión de API Keys
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>
                    Ingresa una API Key por línea. Si una se agota (Error 429), el sistema usará automáticamente la siguiente.
                </p>
                <textarea
                    style={{ ...styles.input, marginBottom: '16px', height: '150px', fontFamily: 'monospace', fontSize: '12px' }}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="AIzaSy...&#10;AIzaSy...&#10;AIzaSy..."
                />
                <div style={{ display: 'flex', justifyContent: 'end', gap: '8px' }}>
                    <button style={styles.button as any} onClick={onClose}>Cancelar</button>
                    <button style={{ ...styles.button, backgroundColor: '#0F172A', color: 'white' } as any} onClick={handleSave}>Guardar Keys ({text.split('\n').filter(k => k.trim()).length})</button>
                </div>
            </div>
        </div>
    )
}

const ContentWriter = () => {
    const { user } = useAuth();
    const [draftId, setDraftId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // --- APP STATE ---
    const [viewMode, setViewMode] = useState<'setup' | 'seo-review' | 'structure-review' | 'workspace'>('setup');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [configStep, setConfigStep] = useState<'data' | 'keyword'>('data');

    // Configuration State
    const [apiKeys, setApiKeys] = useState<string[]>([]);
    const [showKeyModal, setShowKeyModal] = useState(false);

    const [model, setModel] = useState('gemini-2.5-flash');
    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvFileName, setCsvFileName] = useState<string | null>(null);
    const [projectName, setProjectName] = useState('Mi Proyecto SEO');

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

    // --- EFFECTS ---

    // Load user keys from Supabase
    useEffect(() => {
        if (user) {
            loadUserKeys();
        }
    }, [user]);

    const loadUserKeys = async () => {
        try {
            const { data, error } = await supabase
                .from('user_api_keys')
                .select('*');

            if (error) throw error;

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
        } catch (e) {
            console.error("Error loading keys:", e);
        }
    };

    const checkIfKeySaved = async (val: string, provider: string) => {
        if (!user || !val || val.length < 10) return;

        try {
            const { data } = await supabase
                .from('user_api_keys')
                .select('id')
                .eq('key_value', val)
                .eq('provider', provider);

            if (!data || data.length === 0) {
                if (confirm(`¿Deseas guardar esta nueva API Key de ${provider} en tu perfil para usarla automáticamente después?`)) {
                    await supabase.from('user_api_keys').insert([
                        { user_id: user.id, provider, key_value: val, label: 'Auto-guardada' }
                    ]);
                    alert("Clave guardada con éxito.");
                }
            }
        } catch (e) {
            console.error("Error saving key:", e);
        }
    };

    // Parse AI output
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

    // Cloud Saving
    const handleSaveCloud = async () => {
        if (!user) return alert("Debes iniciar sesión para guardar en la nube.");
        if (!htmlContent && !strategyH1) return alert("No hay contenido para guardar.");

        setIsSaving(true);
        try {
            const draftData = {
                user_id: user.id,
                title: strategyH1 || projectName || 'Borrador sin título',
                html_content: htmlContent,
                strategy_data: {
                    projectName,
                    targetKeyword,
                    detectedNiche,
                    strategyOutline,
                    strategyTone,
                    apiKeys,
                    metadata,
                    strategyLSI,
                    strategyLongTail,
                    strategyQuestions
                },
                updated_at: new Date().toISOString()
            };

            let error;
            let data;

            if (draftId) {
                const res = await supabase.from('content_drafts').update(draftData).eq('id', draftId).select();
                error = res.error;
                data = res.data;
            } else {
                const res = await supabase.from('content_drafts').insert([draftData]).select();
                error = res.error;
                data = res.data;
            }

            if (error) throw error;

            if (data && data[0]) {
                setDraftId(data[0].id);
                setLastSaved(new Date());
                alert("✓ Guardado en mis artículos.");
            }
        } catch (e: any) {
            console.error("Error saving to cloud:", e);
            alert("Error al guardar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Error Handler Helper ---
    const handleApiError = (e: any) => {
        console.error("API Error caught:", e);
        if (e.status === 429 || e.code === 429 || e.status === 403 || e.status === 500 || e.status === 400 || (e.message && e.message.includes('quota'))) {
            setShowKeyModal(true);
            alert("⚠️ Se han agotado todas las API Keys o ha ocurrido un error. Por favor configura nuevas keys.");
        } else {
            alert("Error: " + (e.message || String(e)));
        }
    }

    // --- Handlers ---
    const handleSaveKeys = (keys: string[]) => {
        setApiKeys(keys);
        setShowKeyModal(false);
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
            setDraftId(null);
            setLastSaved(null);

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
        setCsvFileName(file.name);
        setStatus("Analizando base de datos...");

        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                let resultData = [];
                try {
                    setStatus("Clasificando URLs...");
                    if (file.name.endsWith('.json')) {
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
                    alert("El archivo parece corrupto o mal formateado.");
                }
            };
            reader.readAsText(file);
        }, 100);
    };

    // STEP 1: SEO Analysis
    const performSEO = async () => {
        if (!targetKeyword) return alert("Introduce una palabra clave.");
        if (!serperKey && !valueSerpKey && !jinaKey && !unstructuredKey) {
            return alert("¡Error! Debes ingresar al menos una API Key de consulta externa (Serper, ValueSERP, Jina o Unstructured).");
        }
        if (apiKeys.length === 0) return alert("Debes configurar al menos una Google AI Key.");

        setIsAnalyzingSEO(true);
        setStatus("Fase 1/2: Consultando SERP Trends...");

        try {
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

            // Auto-save keys if new
            checkIfKeySaved(serperKey, 'serper');
            checkIfKeySaved(valueSerpKey, 'valueserp');
            checkIfKeySaved(jinaKey, 'jina');
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
        setStatus("Diseñando estructura del artículo...");

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
        if (!strategyH1) return alert("Necesitas un H1.");

        setViewMode('workspace');
        setIsGenerating(true);
        setFullResponse("");
        setHtmlContent("");
        setMetadata(null);
        setAiImages([]);
        setFeaturedImage(null);
        setGeneratedSchema('');

        setStatus("Iniciando redacción estructurada...");

        try {
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
                isStrictMode: isStrictMode,
                strictFrequency: strictFrequency
            };

            const prompt = buildPrompt(config);
            setStatus("Redactando contenido...");
            const stream = await generateArticleStream(apiKeys, model, prompt);

            let buffer = "";
            for await (const chunk of stream) {
                const text = chunk.text;
                if (text) {
                    buffer += text;
                    setFullResponse(buffer);
                }
            }

            setStatus("Optimizando enlazado interno...");
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

            setStatus("Artículo finalizado.");
            setIsSidebarOpen(false);

        } catch (error: any) {
            handleApiError(error);
            setStatus("Error en generación.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Sidebar Handlers ---
    const handleRefineContent = async () => {
        if (!htmlContent || !refinementInstructions) return;
        setIsRefining(true);
        setStatus("Refinando artículo...");
        try {
            const refined = await refineArticleContent(apiKeys, htmlContent, refinementInstructions);
            setHtmlContent(refineStyling(refined));
            setRefinementInstructions('');
            setStatus("Refinamiento completado.");
        } catch (e: any) {
            handleApiError(e);
        } finally {
            setIsRefining(false);
        }
    };

    const handleHumanize = async () => {
        if (!htmlContent) return;
        setIsHumanizing(true);
        setHumanizerStatus("Humanizando...");
        try {
            const { html } = await runHumanizerPipeline(apiKeys, htmlContent, {
                niche: detectedNiche, audience: 'Público General', keywords: targetKeyword, notes: humanizerNotes,
                lsiKeywords: strategyLSI.map(l => l.keyword).concat(strategyLongTail),
                isStrictMode, strictFrequency, questions: strategyQuestions
            }, humanizerPercent, (msg) => setHumanizerStatus(msg));
            setHtmlContent(refineStyling(html));
            setHumanizerStatus(`✅ Completado al ${humanizerPercent}%`);
        } catch (e: any) { handleApiError(e); } finally { setIsHumanizing(false); }
    };

    const handleSmartEdit = async () => {
        if (!htmlContent) return;
        setIsEditing(true);
        setStatus("Mejorando texto...");
        try {
            const newHtml = await runSmartEditor(apiKeys, htmlContent, editorPercentage, editorNotes, (msg) => setEditorStatus(msg), isStrictMode, strictFrequency, strategyLSI.map(l => l.keyword).concat(strategyLongTail), strategyQuestions);
            setHtmlContent(refineStyling(newHtml));
            setEditorStatus(`✅ Edición completada.`);
        } catch (e: any) { handleApiError(e); } finally { setIsEditing(false); }
    };

    const handleRunCombined = async () => {
        if (!htmlContent) return;
        setIsRunningCombined(true);
        try {
            setStatus("Fase 1: Humanizando...");
            const { html: humanized } = await runHumanizerPipeline(apiKeys, htmlContent, {
                niche: detectedNiche, audience: 'Público General', keywords: targetKeyword,
                lsiKeywords: strategyLSI.map(l => l.keyword).concat(strategyLongTail),
                isStrictMode, strictFrequency, questions: strategyQuestions
            }, humanizerPercent, (msg) => setCombinedStatus("H: " + msg));

            setStatus("Fase 2: Editando...");
            const final = await runSmartEditor(apiKeys, humanized, editorPercentage, editorNotes, (msg) => setCombinedStatus("E: " + msg), isStrictMode, strictFrequency, strategyLSI.map(l => l.keyword).concat(strategyLongTail), strategyQuestions);

            setHtmlContent(refineStyling(final));
            setStatus("✅ Completado.");
        } catch (e: any) { handleApiError(e); } finally { setIsRunningCombined(false); }
    };

    // --- Visuals ---
    const handleGenerateAllImages = async () => {
        if (!strategyH1 || !htmlContent) return alert("Se necesita contenido.");
        setIsGeneratingImages(true);
        try {
            setStatus("Generando Portada...");
            const featuredPrompt = `Hero image for article titled "${strategyH1}". ${metadata?.description || ''}.`;
            const rawFeatured = await generateRealImage(apiKeys, featuredPrompt, imageConfig, 'featured', '16:9');
            const finalFeatured = watermarkFile ? await compositeWatermark(rawFeatured, watermarkFile) : rawFeatured;

            setFeaturedImage({
                id: 'featured', type: 'featured', context: 'Cover', prompt: featuredPrompt, alt: strategyH1, title: strategyH1,
                filename: `portada-${strategySlug}.webp`, placement: 'Cabecera', status: 'done', imageUrl: finalFeatured
            });

            setStatus("Generando imágenes cuerpo...");
            const suggestions = await suggestImagePlacements(apiKeys, htmlContent, imageConfig.count);
            setAiImages(suggestions.map(s => ({ ...s, status: 'pending' })));

            const updated = [...suggestions];
            for (let i = 0; i < updated.length; i++) {
                updated[i].status = 'generating';
                setAiImages([...updated]);
                const raw = await generateRealImage(apiKeys, updated[i].prompt, imageConfig, 'body');
                updated[i].imageUrl = watermarkFile ? await compositeWatermark(raw, watermarkFile) : raw;
                updated[i].status = 'done';
                setAiImages([...updated]);
            }
            setStatus("Set gráfico listo.");
        } catch (e: any) { handleApiError(e); } finally { setIsGeneratingImages(false); }
    };

    // --- Strategy Editors ---
    const handleUpdateOutlineItem = (index: number, field: string, value: string) => {
        const newOutline = [...strategyOutline];
        (newOutline[index] as any)[field] = value;
        setStrategyOutline(newOutline);
    };
    const handleDeleteOutlineItem = (index: number) => setStrategyOutline(strategyOutline.filter((_, i) => i !== index));
    const handleAddOutlineItem = () => setStrategyOutline([...strategyOutline, { type: 'H2', text: 'Nueva Sección', wordCount: '200 palabras' }]);

    const handleAddLSI = () => { if (tempLsiInput.trim()) { setStrategyLSI([...strategyLSI, { keyword: tempLsiInput, count: "1" }]); setTempLsiInput(''); } };
    const handleRemoveLSI = (idx: number) => setStrategyLSI(strategyLSI.filter((_, i) => i !== idx));
    const handleAddFAQ = () => { if (tempFaqInput.trim()) { setStrategyQuestions([...strategyQuestions, tempFaqInput]); setTempFaqInput(''); } };
    const handleRemoveFAQ = (idx: number) => setStrategyQuestions(strategyQuestions.filter((_, i) => i !== idx));
    const handleRemoveLink = (url: string) => setStrategyLinks(strategyLinks.filter(l => l.url !== url));
    const handleAddLink = () => {
        if (tempLinkUrl && tempLinkTitle) {
            setStrategyLinks(prev => [...prev, { url: tempLinkUrl, title: tempLinkTitle, type: 'other', search_index: '' }]);
            setTempLinkUrl(''); setTempLinkTitle(''); setIsAddingLink(false);
        }
    };
    const handleSearchMoreLinks = async () => {
        try { const more = await searchMoreLinks(apiKeys, targetKeyword, csvData); setStrategyLinks(prev => [...prev, ...more.filter(m => !prev.find(p => p.url === m.url))]); } catch (e) { }
    };
    const handleRegenerateLinks = async () => {
        try { const re = await searchMoreLinks(apiKeys, targetKeyword, csvData); setStrategyLinks(re); } catch (e) { }
    };

    const handleUploadWatermark = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const r = new FileReader();
            r.onload = (ev) => setWatermarkFile(ev.target?.result as string);
            r.readAsDataURL(file);
        }
    };

    const handleUpdateColor = (idx: number, val: string) => {
        const newColors = [...imageConfig.colors];
        newColors[idx] = val;
        setImageConfig({ ...imageConfig, colors: newColors });
    };
    const handleRemoveColor = (idx: number) => setImageConfig({ ...imageConfig, colors: imageConfig.colors.filter((_, i) => i !== idx) });
    const handleAddColor = () => { if (imageConfig.colors.length < 5) setImageConfig({ ...imageConfig, colors: [...imageConfig.colors, '#000000'] }); };

    const handleDownloadSingle = (img: AIImageRequest) => {
        if (!img.imageUrl) return;
        fetch(img.imageUrl).then(res => res.blob()).then(blob => downloadBlob(blob, img.filename || 'image.webp'));
    };

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        const folder = zip.folder("assets");
        if (featuredImage?.imageUrl) folder?.file(featuredImage.filename, featuredImage.imageUrl.split(',')[1], { base64: true });
        aiImages.forEach((img, i) => { if (img.imageUrl) folder?.file(img.filename || `img-${i}.webp`, img.imageUrl.split(',')[1], { base64: true }); });
        const content = await zip.generateAsync({ type: "blob" });
        downloadBlob(content, "visuals.zip");
    };

    const copyRichText = async () => {
        if (!previewRef.current) return;
        try {
            const blobHtml = new Blob([previewRef.current.innerHTML], { type: 'text/html' });
            const blobText = new Blob([previewRef.current.innerText], { type: 'text/plain' });
            await navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]);
            setStatus("¡Copiado!"); setTimeout(() => setStatus(""), 2000);
        } catch (err) { setStatus("Error al copiar."); }
    };

    const getStrictLabel = (val: number) => {
        if (val <= 30) return "Óptimo SEO (1-2% densidad).";
        if (val <= 60) return "Alta Densidad (3-4%).";
        return "Riesgo Spam (>5%). Saturación.";
    };

    const steps = [
        { id: 'setup', label: 'Inicio', icon: <IconSettings />, enabled: true },
        { id: 'seo-review', label: 'Estrategia', icon: <IconRadar />, enabled: !!rawSeoData },
        { id: 'structure-review', label: 'Estructura', icon: <IconFile />, enabled: !!strategyH1 || !!rawSeoData },
        { id: 'workspace', label: 'Editor', icon: <IconEdit />, enabled: true }
    ];

    return (
        <div style={styles.appLayout as any}>
            <MultiKeyModal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)} onSave={handleSaveKeys} currentKeys={apiKeys} />

            <div style={styles.navBar as any}>
                <div style={styles.navGroup as any}>
                    {steps.map(step => (
                        <div key={step.id} style={{ ...styles.navTab, ...(viewMode === step.id ? styles.navTabActive : {}), ...(!step.enabled ? styles.navTabDisabled : {}) } as any} onClick={() => step.enabled && setViewMode(step.id as any)}>
                            {step.icon} {step.label}
                        </div>
                    ))}
                </div>
                {lastSaved && <div style={{ fontSize: '12px', color: '#64748B', marginRight: '16px' }}>Guardado: {lastSaved.toLocaleTimeString()}</div>}
            </div>

            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {viewMode === 'setup' && (
                    <div style={styles.hubContainer as any}>
                        <div style={{ ...styles.hubContent, maxWidth: '700px' } as any}>
                            <div style={styles.hubHeader as any}>
                                <div style={styles.hubTitle}>Content Studio AI</div>
                                <p style={styles.hubSubtitle}>Crea contenido SEO avanzado con datos reales del SERP</p>
                            </div>
                            <div style={styles.stepCard as any}>
                                <div style={styles.stepTitle}>Configuración</div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={styles.label}>Nombre Proyecto</label>
                                    <input style={styles.input} value={projectName} onChange={e => setProjectName(e.target.value)} />
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={styles.label}>Gemini API Keys</label> <button onClick={() => setShowKeyModal(true)} style={{ fontSize: '11px', background: 'none', color: '#6366F1', border: 'none', cursor: 'pointer' }}>Gestionar ({apiKeys.length})</button></div>
                                    <input type="password" style={styles.input} value={apiKeys[0] || ''} onChange={e => setApiKeys([e.target.value])} placeholder="AIzaSy..." />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div><label style={styles.label}>Serper Key</label><input type="password" style={styles.input} value={serperKey} onChange={e => setSerperKey(e.target.value)} /></div>
                                    <div><label style={styles.label}>ValueSERP Key</label><input type="password" style={styles.input} value={valueSerpKey} onChange={e => setValueSerpKey(e.target.value)} /></div>
                                </div>
                            </div>
                            <div style={styles.stepCard as any}>
                                <div style={styles.stepTitle}>Base de Datos</div>
                                {configStep === 'data' ? (
                                    <div style={{ ...styles.dropzone, ...(dragActive ? styles.dropzoneActive : {}) } as any} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                                        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                                        <IconUpload /> <span>{csvFileName || "Sube CSV/JSON de productos"}</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#F1F5F9', padding: '12px', borderRadius: '8px' }}>{csvFileName} <b>{csvData.length} URLs</b></div>
                                )}
                            </div>
                            {configStep === 'keyword' && (
                                <div style={styles.stepCard as any}>
                                    <label style={styles.label}>Keyword Objetivo</label>
                                    <input style={styles.inputLarge} value={targetKeyword} onChange={e => setTargetKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && performSEO()} />
                                    <button style={styles.bigButton as any} onClick={performSEO} disabled={isAnalyzingSEO}>{isAnalyzingSEO ? <LoadingSpinner /> : "Analizar SERP"}</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {viewMode === 'seo-review' && (
                    <div style={styles.hubContainer as any}>
                        <div style={styles.hubContent as any}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div><h2 style={styles.hubTitle}>Estrategia SEO</h2><p>{detectedNiche}</p></div>
                                <button style={styles.bigButton as any} onClick={handlePlanStructure} disabled={isPlanningStructure}>{isPlanningStructure ? <LoadingSpinner /> : "Planificar Estructura"}</button>
                            </div>
                            <div style={styles.gridContainer as any}>
                                <div style={{ ...styles.gridCard, gridColumn: 'span 1' } as any}>
                                    <label style={styles.label}>Tono</label>
                                    <select style={styles.select as any} value={strategyTone} onChange={e => setStrategyTone(e.target.value)}>
                                        <option>Profesional y Estiloso</option><option>Técnico</option><option>Cercano</option>
                                    </select>
                                    <label style={styles.label}>Palabras</label>
                                    <input style={styles.input} value={strategyWordCount} onChange={e => setStrategyWordCount(e.target.value)} />
                                </div>
                                <div style={{ ...styles.gridCard, gridColumn: 'span 2' } as any}>
                                    <label style={styles.label}>LSI Keywords</label>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}><input style={styles.miniInput} value={tempLsiInput} onChange={e => setTempLsiInput(e.target.value)} /><button onClick={handleAddLSI} style={styles.miniAddBtn}>+</button></div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{strategyLSI.map((k, i) => <div key={i} style={styles.keywordTag as any}>{k.keyword}<span onClick={() => handleRemoveLSI(i)} style={{ cursor: 'pointer' }}>×</span></div>)}</div>
                                </div>
                                <div style={{ ...styles.gridCard, gridColumn: 'span 3' } as any}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>Enlaces Internos</b> <button onClick={handleSearchMoreLinks} style={styles.button as any}>Buscar más</button></div>
                                    <div style={styles.linkListContainer as any}>{strategyLinks.map((l, i) => <div key={i} style={styles.linkRow as any}><span>{l.title}</span><a href={l.url} target="_blank">{l.url}</a><IconTrash onClick={() => handleRemoveLink(l.url)} /></div>)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'structure-review' && (
                    <div style={styles.hubContainer as any}>
                        <div style={styles.hubContent as any}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2 style={styles.hubTitle}>Estructura</h2>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '4px 12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                        <input type="checkbox" checked={isStrictMode} onChange={e => setIsStrictMode(e.target.checked)} /> <b>SEO Estricto</b>
                                        {isStrictMode && <input type="range" value={strictFrequency} onChange={e => setStrictFrequency(parseInt(e.target.value))} />}
                                    </div>
                                    <button style={styles.bigButton as any} onClick={generateArticle} disabled={isGenerating}>{isGenerating ? <LoadingSpinner /> : "Empezar Redacción"}</button>
                                </div>
                            </div>
                            <div style={styles.gridCard as any}>
                                <label style={styles.label}>H1</label><input style={styles.input} value={strategyH1} onChange={e => setStrategyH1(e.target.value)} />
                                <label style={styles.label}>Headers</label>
                                {strategyOutline.map((h, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <input style={{ width: '60px' }} value={h.type} onChange={e => handleUpdateOutlineItem(i, 'type', e.target.value)} />
                                        <input style={{ flex: 1 }} value={h.text} onChange={e => handleUpdateOutlineItem(i, 'text', e.target.value)} />
                                        <IconTrash onClick={() => handleDeleteOutlineItem(i)} />
                                    </div>
                                ))}
                                <button onClick={handleAddOutlineItem} style={styles.button as any}>+ Header</button>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'workspace' && (
                    <div style={styles.workspaceContainer as any}>
                        <div style={{ ...styles.sidebar, width: isSidebarOpen ? '300px' : '60px' } as any}>
                            <div style={styles.sidebarHeader as any}>{isSidebarOpen && "Herramientas"} <IconMenu onClick={() => setIsSidebarOpen(!isSidebarOpen)} /></div>
                            {isSidebarOpen && (
                                <div style={styles.sidebarContent as any}>
                                    <button onClick={handleSaveCloud} style={{ ...styles.button, background: '#166534', color: 'white', width: '100%' }} disabled={isSaving}><IconCloud /> {isSaving ? "Guardando..." : "Guardar en Nube"}</button>
                                    <div style={styles.sectionTitle}>Refinar con IA</div>
                                    <textarea style={styles.input} value={refinementInstructions} onChange={e => setRefinementInstructions(e.target.value)} placeholder="Instrucciones..." />
                                    <button onClick={handleRefineContent} style={styles.button as any} disabled={isRefining}>Refinar</button>
                                    <div style={{ marginTop: 'auto' }}><button onClick={handleNewContent} style={styles.button as any}><IconPlus /> Nuevo</button></div>
                                </div>
                            )}
                        </div>
                        <div style={styles.main as any}>
                            <header style={styles.header as any}>
                                <div>{status && <span><LoadingSpinner /> {status}</span>}</div>
                                <button onClick={copyRichText} style={styles.button as any}><IconCopy /> Copiar</button>
                            </header>
                            <div style={styles.contentArea as any}>
                                <div style={styles.paper as any}>
                                    <div className="article-content" ref={previewRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
                                </div>
                            </div>
                        </div>
                        <div style={styles.rightSidebar as any}>
                            <div style={{ padding: '16px', borderBottom: '1px solid #ddd' }}>
                                <button onClick={handleRunCombined} style={styles.bigButton as any} disabled={isRunningCombined}>Humanizar + Editar</button>
                            </div>
                            <div style={styles.inspectorScroll as any}>
                                <div style={styles.toolCard as any}>
                                    <b>Visuales AI</b>
                                    <button onClick={handleGenerateAllImages} style={styles.button as any} disabled={isGeneratingImages}>Generar Set Gráfico</button>
                                    {featuredImage?.imageUrl && <img src={featuredImage.imageUrl} style={{ width: '100%', marginTop: '8px' }} />}
                                    {aiImages.map((img, i) => img.imageUrl && <img key={i} src={img.imageUrl} style={{ width: '100%', marginTop: '8px' }} />)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentWriter;
