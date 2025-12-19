
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { styles } from './styles';
import { IconUpload, IconSparkles, IconCopy, IconFile, IconSEO, IconImage, IconDownload, IconRefresh, IconMagic, IconZip, IconSearch, IconChevronLeft, IconMenu, IconArrowRight, IconSettings, IconUser, IconRadar, IconEdit, IconCheck, IconTrash, IconJson, IconLink, IconPlus, IconExternal, IconPalette, IconChevronDown, IconChevronUp, IconGhost, LoadingSpinner } from './components';
import { MetadataField } from './components';
import { parseCSV, parseJSON, buildPrompt, generateArticleStream, findCampaignAssets, suggestImagePlacements, generateRealImage, ArticleConfig, VisualResource, AIImageRequest, runSEOAnalysis, SEOAnalysisResult, generateSchemaMarkup, ContentItem, ImageGenConfig, compositeWatermark, autoInterlink, runHumanizerPipeline, HumanizerConfig, runSmartEditor, generateOutlineStrategy, searchMoreLinks, cleanAndFormatHtml, refineStyling, refineArticleContent } from './services';

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
                <h3 style={{ marginTop: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit, sans-serif' }}><IconSettings /> Gestión de API Keys</h3>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>Ingresa una API Key por línea para rotación automática.</p>
                <textarea style={{ ...styles.input, marginBottom: '16px', height: '150px', fontFamily: 'monospace', fontSize: '12px' }} value={text} onChange={(e) => setText(e.target.value)} placeholder="AIzaSy..." />
                <div style={{ display: 'flex', justifyContent: 'end', gap: '8px' }}>
                    <button style={styles.button as any} onClick={onClose}>Cancelar</button>
                    <button style={{ ...styles.button, backgroundColor: '#0F172A', color: 'white' } as any} onClick={handleSave}>Guardar Keys</button>
                </div>
            </div>
        </div>
    )
}

const App = () => {
    const { user } = useAuth();
    const [draftId, setDraftId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<'setup' | 'seo-review' | 'structure-review' | 'workspace'>('setup');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [configStep, setConfigStep] = useState<'data' | 'keyword'>('data');

    // SAFE INIT: Check for API Key safely using Vite standard or falling back to process.env
    // We try multiple common patterns because of the complex environment mixing.
    const getInitKey = () => {
        try {
            // Priority 1: import.meta.env (Vite standard)
            if (typeof import.meta !== 'undefined' && import.meta.env) {
                if (import.meta.env.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
                if (import.meta.env.GEMINI_API_KEY) return import.meta.env.GEMINI_API_KEY;
            }
            // Priority 2: process.env (Vite 'define' or Node-like)
            if (typeof process !== 'undefined' && process.env) {
                if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
                if (process.env.API_KEY) return process.env.API_KEY;
            }
        } catch (e) {
            console.warn("Env check failed", e);
        }
        return '';
    };

    const [apiKeys, setApiKeys] = useState<string[]>(() => {
        const key = getInitKey();
        return key ? [key] : [];
    });

    console.log("ContentWriter Rendered. ViewMode:", viewMode, "Keys:", apiKeys.length); // DEBUG

    const [showKeyModal, setShowKeyModal] = useState(false);
    // Cambiado a gemini-2.5-flash según disponibilidad del usuario
    const [model, setModel] = useState('gemini-2.5-flash');
    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvFileName, setCsvFileName] = useState<string | null>(null);
    const [projectName, setProjectName] = useState('Mi Proyecto SEO');
    const [serperKey, setSerperKey] = useState('');
    const [valueSerpKey, setValueSerpKey] = useState('');
    const [jinaKey, setJinaKey] = useState('');
    const [targetKeyword, setTargetKeyword] = useState('');
    const [detectedNiche, setDetectedNiche] = useState('');
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
    const [isStrictMode, setIsStrictMode] = useState(false);
    const [strictFrequency, setStrictFrequency] = useState(30);
    const [strategyLSI, setStrategyLSI] = useState<{ keyword: string, count: string }[]>([]);
    const [strategyLongTail, setStrategyLongTail] = useState<string[]>([]);
    const [strategyQuestions, setStrategyQuestions] = useState<string[]>([]);
    const [tempLsiInput, setTempLsiInput] = useState('');
    const [tempFaqInput, setTempFaqInput] = useState('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [tempLinkUrl, setTempLinkUrl] = useState('');
    const [tempLinkTitle, setTempLinkTitle] = useState('');
    const [rawSeoData, setRawSeoData] = useState<SEOAnalysisResult | null>(null);
    const [isAnalyzingSEO, setIsAnalyzingSEO] = useState(false);
    const [isPlanningStructure, setIsPlanningStructure] = useState(false);
    const [visualResources, setVisualResources] = useState<VisualResource[]>([]);
    const [isSearchingVisuals, setIsSearchingVisuals] = useState(false);
    const [isImageConfigOpen, setIsImageConfigOpen] = useState(false);
    const [imageConfig, setImageConfig] = useState<ImageGenConfig>({ style: 'Auto', colors: [], customDimensions: { w: '1200', h: '630' }, count: 'auto', userPrompt: '' });
    const [watermarkFile, setWatermarkFile] = useState<string | null>(null);
    const [aiImages, setAiImages] = useState<AIImageRequest[]>([]);
    const [featuredImage, setFeaturedImage] = useState<AIImageRequest | null>(null);
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [regenNotes, setRegenNotes] = useState<{ [key: string]: string }>({});
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
    const [refinementInstructions, setRefinementInstructions] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [fullResponse, setFullResponse] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [metadata, setMetadata] = useState<any>(null);
    const [status, setStatus] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [generatedSchema, setGeneratedSchema] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const watermarkInputRef = useRef<HTMLInputElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cleanText = fullResponse;
        if (cleanText.includes('```html')) cleanText = cleanText.replace(/```html/g, '').replace(/```/g, '');
        else if (cleanText.includes('```')) cleanText = cleanText.replace(/```/g, '');
        const separator = "<!-- METADATA_START -->";
        if (cleanText.includes(separator)) {
            const parts = cleanText.split(separator);
            setHtmlContent(cleanAndFormatHtml(parts[0]));
            try {
                const jsonStr = parts[1].trim().replace(/```json/g, '').replace(/```/g, '');
                setMetadata(JSON.parse(jsonStr));
            } catch (e) { }
        } else {
            setHtmlContent(cleanAndFormatHtml(cleanText));
        }
    }, [fullResponse]);

    // LOAD DRAFT LOGIC
    useEffect(() => {
        // Simple check: if URL has ?draft=ID, load it. (Or just load latest for now if user logged in)
        // For this iteration, let's just allow loading via parent or auto-load latest if in "setup" mode? 
        // Better: The UserDashboard handles navigation. If we come here, maybe check URL params later.
        // For now, let's implement the SAVE logic first.
    }, []);

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
                    apiKeys
                },
                updated_at: new Date().toISOString()
            };

            let error;
            let data;

            if (draftId) {
                // Update
                const res = await supabase.from('content_drafts').update(draftData).eq('id', draftId).select();
                error = res.error;
                data = res.data;
            } else {
                // Insert
                const res = await supabase.from('content_drafts').insert([draftData]).select();
                error = res.error;
                data = res.data;
            }

            if (error) throw error;

            if (data && data[0]) {
                setDraftId(data[0].id);
                setLastSaved(new Date());
            }
        } catch (e: any) {
            console.error("Error saving to cloud:", e);
            alert("Error al guardar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleApiError = (e: any) => {
        if (e.status === 429 || (e.message && e.message.includes('quota'))) { setShowKeyModal(true); alert("Quota superada. Añade más keys."); }
        else alert("Error: " + (e.message || String(e)));
    }

    const handleSaveKeys = (keys: string[]) => { setApiKeys(keys); setShowKeyModal(false); };

    const handleNewContent = () => {
        if (confirm("Se borrará el contenido actual. ¿Continuar?")) {
            setTargetKeyword(''); setStrategyTitle(''); setStrategyH1(''); setStrategySlug(''); setStrategyDesc('');
            setStrategyOutline([]); setStrategyLinks([]); setStrategyLSI([]); setStrategyLongTail([]); setStrategyQuestions([]);
            setFullResponse(''); setHtmlContent(''); setMetadata(null); setAiImages([]); setFeaturedImage(null);
            setViewMode('setup'); setConfigStep(csvData.length > 0 ? 'keyword' : 'data'); setStatus('');
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const { data } = file.name.endsWith('.json') ? parseJSON(text) : parseCSV(text);
                setCsvData(data); setCsvFileName(file.name); setConfigStep('keyword');
            } catch (err) { alert("Error al procesar archivo."); }
        };
        reader.readAsText(file);
    };

    const performSEO = async () => {
        if (!targetKeyword) return alert("Introduce una palabra clave.");
        if (!serperKey && !valueSerpKey && !jinaKey) return alert("Configura una key de consulta SERP.");
        setIsAnalyzingSEO(true); setStatus("Consultando SERP Trends...");
        try {
            const data = await runSEOAnalysis(apiKeys, targetKeyword, csvData, projectName, serperKey, valueSerpKey, jinaKey);
            setRawSeoData(data); setStrategyCompetitors(data.top10Urls?.map(u => u.url).join('\n') || "");
            setDetectedNiche(data.nicheDetected || "General"); setStrategyLinks(data.suggestedInternalLinks || []);
            setStrategyWordCount(data.recommendedWordCount || "1500"); setStrategyLSI(data.lsiKeywords || []);
            setStrategyLongTail(data.autocompleteLongTail || []); setStrategyQuestions(data.frequentQuestions || []);
            setViewMode('seo-review'); setStatus("");
        } catch (e: any) { handleApiError(e); } finally { setIsAnalyzingSEO(false); }
    };

    const handlePlanStructure = async () => {
        setIsPlanningStructure(true); setStatus("Diseñando estructura SEO...");
        try {
            const structureData = await generateOutlineStrategy(apiKeys, { projectName, niche: detectedNiche, topic: targetKeyword, keywords: targetKeyword, tone: strategyTone, wordCount: strategyWordCount, refUrls: strategyCompetitors, refContent: "", csvData: [] }, targetKeyword);
            setStrategyTitle(structureData.snippet.metaTitle); setStrategyH1(structureData.snippet.h1);
            setStrategySlug(structureData.snippet.slug); setStrategyDesc(structureData.snippet.metaDescription);
            setStrategyOutline(structureData.outline.headers); setStrategyNotes(structureData.outline.introNote);
            setViewMode('structure-review'); setStatus("");
        } catch (e: any) { handleApiError(e); } finally { setIsPlanningStructure(false); }
    };

    const generateArticle = async () => {
        if (!strategyH1) return;
        setViewMode('workspace'); setIsGenerating(true); setFullResponse("");
        setStatus("Redactando contenido optimizado...");
        try {
            const config: ArticleConfig = { projectName, niche: detectedNiche, topic: strategyH1, metaTitle: strategyTitle, keywords: targetKeyword, tone: strategyTone, wordCount: strategyWordCount, refUrls: strategyCompetitors, refContent: strategyNotes, csvData, outlineStructure: strategyOutline, approvedLinks: strategyLinks, questions: strategyQuestions, lsiKeywords: strategyLSI.map(l => l.keyword).concat(strategyLongTail), creativityLevel, contextInstructions, isStrictMode, strictFrequency };
            const stream = await generateArticleStream(apiKeys, model, buildPrompt(config));
            let buffer = "";
            for await (const chunk of stream) { buffer += chunk.text; setFullResponse(buffer); }
            const finalHtml = autoInterlink(buffer.split("<!-- METADATA_START -->")[0], csvData);
            setHtmlContent(cleanAndFormatHtml(finalHtml));
            setStatus("Finalizado."); setIsSidebarOpen(false);
        } catch (e: any) { handleApiError(e); } finally { setIsGenerating(false); }
    };

    const copyRichText = async () => {
        if (!previewRef.current) return;
        try {
            const html = previewRef.current.innerHTML;
            const text = previewRef.current.innerText;
            const blobHtml = new Blob([html], { type: 'text/html' });
            const blobText = new Blob([text], { type: 'text/plain' });
            const data = [new ClipboardItem({
                'text/html': blobHtml,
                'text/plain': blobText
            })];
            await navigator.clipboard.write(data);
            alert("Contenido copiado al portapapeles con éxito.");
        } catch (err) {
            console.error(err);
            navigator.clipboard.writeText(previewRef.current?.innerText || "");
            alert("Copiado como texto plano.");
        }
    };

    const handleHumanize = async () => {
        if (!htmlContent || isHumanizing) return;
        setIsHumanizing(true);
        setHumanizerStatus("Humanizando contenido...");
        try {
            const config: HumanizerConfig = {
                niche: detectedNiche,
                audience: "General",
                keywords: targetKeyword,
                notes: humanizerNotes,
                lsiKeywords: strategyLSI.map(l => l.keyword),
                links: strategyLinks,
                isStrictMode,
                strictFrequency,
                questions: strategyQuestions
            };
            const result = await runHumanizerPipeline(apiKeys, htmlContent, config, humanizerPercent, setHumanizerStatus);
            setHtmlContent(result.html);
            setHumanizerStatus("Humanización completada");
        } catch (e: any) {
            handleApiError(e);
        } finally {
            setIsHumanizing(false);
        }
    };

    const handleRunCombined = async () => {
        if (!htmlContent || isRunningCombined) return;
        setIsRunningCombined(true);
        setCombinedStatus("Ejecutando proceso combinado...");
        try {
            setCombinedStatus("Paso 1: Humanizando...");
            const hRes = await runHumanizerPipeline(apiKeys, htmlContent, { niche: detectedNiche, keywords: targetKeyword }, 100, setCombinedStatus);

            setCombinedStatus("Paso 2: Editando...");
            const editedHtml = await runSmartEditor(
                apiKeys,
                hRes.html,
                editorPercentage,
                editorNotes,
                setCombinedStatus,
                isStrictMode,
                strictFrequency,
                strategyLSI.map(l => l.keyword),
                strategyQuestions
            );

            setHtmlContent(editedHtml);
            setCombinedStatus("Proceso finalizado con éxito");
        } catch (e: any) {
            handleApiError(e);
        } finally {
            setIsRunningCombined(false);
        }
    };

    const getStrictLegend = (val: number) => {
        if (val <= 30) return "Óptimo SEO: Densidad natural (1-2%), máxima legibilidad.";
        if (val <= 60) return "Densidad Alta: Repetición estratégica para nichos competidos.";
        return "Modo Agresivo: Prioridad total a keywords sobre el flujo narrativo.";
    };

    const steps = [
        { id: 'setup', label: 'Configuración', icon: <IconSettings />, enabled: true },
        { id: 'seo-review', label: 'Estrategia SEO', icon: <IconRadar />, enabled: !!rawSeoData },
        { id: 'structure-review', label: 'Estructura', icon: <IconFile />, enabled: !!strategyOutline.length },
        { id: 'workspace', label: 'Editor & Visuales', icon: <IconEdit />, enabled: !!htmlContent || isGenerating }
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
            </div>

            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {viewMode === 'setup' && (
                    <div style={styles.hubContainer as any}>
                        <div style={{ ...styles.hubContent, maxWidth: '700px' } as any}>
                            <div style={styles.hubHeader as any}>
                                <div style={styles.hubTitle}>Content Studio IA</div>
                                <div style={styles.hubSubtitle}>Crea contenido SEO de alta calidad con datos reales del SERP</div>
                            </div>
                            <div style={styles.stepCard as any}>
                                <div style={styles.stepTitle}>Configuración de Proyecto</div>
                                <input style={styles.input} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Nombre del proyecto..." />
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={styles.label}>Google AI Keys</label>
                                        <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#4F46E5', textDecoration: 'underline', cursor: 'pointer' }}>Obtener Key</a>
                                    </div>
                                    <input
                                        type="password"
                                        style={styles.input}
                                        value={apiKeys[0] || ''}
                                        onChange={(e) => setApiKeys([e.target.value])}
                                        placeholder="Pega tu API Key aquí..."
                                    />
                                </div>
                                <select style={styles.select as any} value={model} onChange={(e) => setModel(e.target.value)}>
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado)</option>
                                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Velocidad)</option>
                                </select>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                    <input type="password" style={styles.input} value={serperKey} onChange={(e) => setSerperKey(e.target.value)} placeholder="Serper Key" />
                                    <input type="password" style={styles.input} value={valueSerpKey} onChange={(e) => setValueSerpKey(e.target.value)} placeholder="ValueSERP" />
                                    <input type="password" style={styles.input} value={jinaKey} onChange={(e) => setJinaKey(e.target.value)} placeholder="Jina AI" />
                                </div>
                            </div>
                            <div style={styles.stepCard as any}>
                                <div style={styles.stepTitle}>Base de Datos (CSV/JSON)</div>
                                <div style={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
                                    <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
                                    <IconUpload /> {csvFileName || "Sube tu base de datos de productos/URLs"}
                                </div>
                            </div>
                            {configStep === 'keyword' && (
                                <div style={styles.stepCard as any}>
                                    <div style={styles.stepTitle}>Estrategia Objetivo</div>
                                    <input style={styles.inputLarge} placeholder="Palabra Clave Principal..." value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)} />
                                    <button style={styles.bigButton as any} onClick={performSEO} disabled={isAnalyzingSEO}>
                                        {isAnalyzingSEO ? <LoadingSpinner /> : <><IconRadar /> Analizar & Planificar</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {viewMode === 'seo-review' && (
                    <div style={styles.hubContainer as any}>
                        <div style={styles.hubContent as any}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={styles.hubTitle}>Revisión de Datos SEO</div>
                                <button style={{ ...styles.bigButton, width: 'auto' } as any} onClick={handlePlanStructure} disabled={isPlanningStructure}>
                                    {isPlanningStructure ? <LoadingSpinner /> : <><IconSEO /> Generar Estructura</>}
                                </button>
                            </div>
                            <div style={styles.gridContainer as any}>
                                <div style={{ ...styles.gridCard, gridColumn: 'span 1' } as any}>
                                    <div style={styles.gridCardTitle}>Parámetros</div>
                                    <label style={styles.label}>Tono</label>
                                    <select style={styles.select as any} value={strategyTone} onChange={e => setStrategyTone(e.target.value)}>
                                        <option>Profesional y Estiloso</option><option>Técnico</option><option>Cercano</option>
                                    </select>
                                    <label style={styles.label}>Extensión</label>
                                    <input style={styles.input} value={strategyWordCount} onChange={e => setStrategyWordCount(e.target.value)} />
                                </div>
                                <div style={{ ...styles.gridCard, gridColumn: 'span 2' } as any}>
                                    <div style={styles.gridCardTitle}>Keywords & Preguntas</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {strategyLSI.map((k, i) => <span key={i} style={styles.keywordTag as any}>{k.keyword}</span>)}
                                    </div>
                                    <div style={{ marginTop: '12px' }}>
                                        {strategyQuestions.slice(0, 4).map((q, i) => <div key={i} style={styles.faqCard as any}>? {q}</div>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'structure-review' && (
                    <div style={styles.hubContainer as any}>
                        <div style={styles.hubContent as any}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <div style={styles.hubTitle}>Definición de Estructura</div>
                                    <div style={styles.hubSubtitle}>Esqueleto generado con datos reales del SERP</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                    <button style={{ ...styles.bigButton, width: 'auto', padding: '16px 32px' } as any} onClick={generateArticle} disabled={isGenerating}>
                                        {isGenerating ? <LoadingSpinner /> : <><IconArrowRight /> Aprobar y Redactar</>}
                                    </button>
                                    <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', width: '300px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <input type="checkbox" id="st" checked={isStrictMode} onChange={e => setIsStrictMode(e.target.checked)} />
                                            <label htmlFor="st" style={{ fontSize: '13px', fontWeight: 700 }}>Modo Estricto SEO</label>
                                        </div>
                                        {isStrictMode && (
                                            <>
                                                <input type="range" min="10" max="100" step="10" value={strictFrequency} onChange={e => setStrictFrequency(parseInt(e.target.value))} style={{ width: '100%' }} />
                                                <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>{getStrictLegend(strictFrequency)}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div style={styles.gridCard as any}>
                                {strategyOutline.map((item, idx) => (
                                    <div key={idx} style={{ ...styles.outlineRow, marginBottom: '10px' } as any}>
                                        <span style={{ width: '40px', fontWeight: 700 }}>{item.type}</span>
                                        <input style={{ ...styles.input, flex: 1 }} value={item.text} onChange={e => { const n = [...strategyOutline]; n[idx].text = e.target.value; setStrategyOutline(n); }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'workspace' && (
                    <div style={styles.workspaceContainer as any}>
                        <div style={{ ...styles.sidebar, ...(isSidebarOpen ? styles.sidebarOpen : styles.sidebarCollapsed) } as any}>
                            <div style={styles.sidebarHeader as any}>
                                {isSidebarOpen && <span style={{ fontWeight: 700 }}>Navegación</span>}
                                <button style={styles.toggleBtn} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? <IconChevronLeft /> : <IconMenu />}</button>
                            </div>
                            {isSidebarOpen && (
                                <div style={styles.sidebarContent as any}>
                                    <button style={styles.button as any} onClick={handleNewContent}><IconPlus /> Nuevo Contenido</button>
                                    <div style={styles.sectionTitle}>Refinar con IA</div>
                                    <textarea style={styles.input} placeholder="Instrucciones..." value={refinementInstructions} onChange={e => setRefinementInstructions(e.target.value)} />
                                    <button style={{ ...styles.button, width: '100%', justifyContent: 'center' } as any} onClick={() => alert("Refinando...")}>Refinar Artículo</button>
                                </div>
                            )}
                        </div>

                        <div style={styles.main as any}>
                            <header style={styles.header as any}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {status && <><LoadingSpinner /> {status}</>}
                                    {user && (
                                        <button
                                            style={{ ...styles.button, backgroundColor: isSaving ? '#E2E8F0' : '#DCFCE7', color: isSaving ? '#64748B' : '#166534', border: '1px solid #BBF7D0' } as any}
                                            onClick={handleSaveCloud}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <LoadingSpinner /> : <IconUpload />}
                                            {isSaving ? 'Guardando...' : (lastSaved ? 'Guardado' : 'Guardar en Nube')}
                                        </button>
                                    )}
                                </div>
                                <button style={styles.button as any} onClick={() => copyRichText()}><IconCopy /> Copiar</button>
                            </header>
                            <div style={styles.contentArea as any}>
                                <div style={styles.paper as any}>
                                    <div style={styles.articleScroll as any} ref={previewRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
                                </div>
                            </div>
                        </div>

                        <div style={styles.rightSidebar as any}>
                            <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
                                <div style={styles.sectionTitle}>Asistente Creativo</div>
                                <button style={{ ...styles.button, width: '100%', justifyContent: 'center', backgroundColor: '#0F172A', color: '#fff' } as any} onClick={handleRunCombined} disabled={isRunningCombined}>
                                    {isRunningCombined ? <LoadingSpinner /> : "Humanizar + Editar (Auto)"}
                                </button>
                                {combinedStatus && <div style={{ fontSize: '10px', color: '#6366F1', textAlign: 'center', marginTop: '4px' }}>{combinedStatus}</div>}
                            </div>
                            <div style={styles.inspectorScroll as any}>
                                <div style={styles.toolCard as any}>
                                    <div style={styles.toolCardHeader}><IconGhost /> Humanizador</div>
                                    <div style={styles.toolCardBody}>
                                        <input type="range" value={humanizerPercent} onChange={e => setHumanizerPercent(parseInt(e.target.value))} style={{ width: '100%' }} />
                                        <button style={styles.button as any} onClick={handleHumanize} disabled={isHumanizing}>
                                            {isHumanizing ? <LoadingSpinner /> : "Ejecutar"}
                                        </button>
                                        {humanizerStatus && <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>{humanizerStatus}</div>}
                                    </div>
                                </div>
                                {metadata && (
                                    <>
                                        <div style={styles.sectionTitle}>SEO Metadata</div>
                                        <MetadataField label="SEO Title" value={metadata.title} />
                                        <MetadataField label="Description" value={metadata.description} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
