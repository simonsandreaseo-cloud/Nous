"use client";

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Wand2, Download, FileText, AlertCircle, Loader2, CheckCircle2, Settings2, MessageSquare, Globe, X, Hash, Sparkles, Cpu, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { FileUpload } from './FileUpload';
import { ArticlePreview } from './ArticlePreview';
import { parseDocx } from '@/lib/services/images/docxService';
import { analyzeTextAndPlanImages, generateImage } from '@/lib/services/images/geminiService';
import { applyWatermark } from '@/lib/services/images/watermarkService';
import { BlogPost, GeneratedImage, ProcessingStatus, AspectRatio, SupportedLanguage, CustomDimensions, InlineImageCount } from '@/types/images';
import { cn } from '@/utils/cn';
import { Task } from '@/types/project';
import { supabase } from '@/lib/supabase';
import { useProjectStore } from '@/store/useProjectStore';

// Simple Translation Dictionary
const TRANSLATIONS = {
    en: {
        title: "BlogViz AI",
        downloadAll: "Download All",
        settings: "Visual Intelligence",
        uploadDoc: "Upload Article (.docx)",
        uploadLogo: "Watermark Logo",
        featuredSize: "Front Page Aspect",
        bodySize: "Inline Aspect",
        guidelines: "Style Guidelines",
        guidelinesPlaceholder: "E.g., 'Flat vector art', 'Dark and cinematic'...",
        guidelinesHint: "These instructions will guide the AI across all images.",
        generateBtn: "Synthesize Visuals",
        complete: "Synthesis Complete",
        startNew: "New Project",
        reading: "Reading data stream...",
        analyzing: "AI context analysis in progress...",
        generating: "Generating latent representation...",
        projectStats: "Project Metrics",
        featuredReady: "Front Page Ready",
        inlineReady: "Inlines Ready",
        previewTitle: "Intelligence Preview",
        watermarkActive: "Watermark Applied",
        noArticle: "Waiting for Input",
        noArticleHeading: "No Content Loaded",
        noArticleDesc: "We couldn't find a draft for this task. Please upload a .docx or paste content.",
        width: "Width",
        height: "Height",
        custom: "Custom",
        imageCount: "Inline Density",
        auto: "Neural Auto",
        modelSelection: "AI Core Model",
        // Card Actions
        regenerate: "Regenerate",
        download: "Download",
        refinePlaceholder: "How should we modify this?...",
        cancel: "Cancel",
        submit: "Apply"
    },
    es: {
        title: "Imágenes IA",
        downloadAll: "Descargar Todo",
        settings: "Inteligencia Visual",
        uploadDoc: "Subir Artículo (.docx)",
        uploadLogo: "Marca de Agua",
        featuredSize: "Ratio Portada",
        bodySize: "Ratio Imágenes",
        guidelines: "Pautas de Estilo",
        guidelinesPlaceholder: "Ej., 'Arte vector plano', 'Cinemático y oscuro'...",
        guidelinesHint: "Estas pautas guiarán a la IA en todas las imágenes.",
        generateBtn: "Sintetizar Visuales",
        complete: "Síntesis Completada",
        startNew: "Nuevo Proyecto",
        reading: "Leyendo flujo de datos...",
        analyzing: "Análisis de contexto IA...",
        generating: "Generando representación latente...",
        projectStats: "Métricas del Proyecto",
        featuredReady: "Portada Lista",
        inlineReady: "Imágenes de Cuerpo Listas",
        previewTitle: "Vista Previa",
        watermarkActive: "Marca de Agua Activa",
        noArticle: "Esperando Entrada",
        noArticleHeading: "Sin Contenido Cargado",
        noArticleDesc: "No encontramos un borrador para esta tarea. Sube un .docx o pega contenido.",
        width: "Ancho",
        height: "Alto",
        custom: "Personalizado",
        imageCount: "Densidad de Imágenes",
        auto: "Auto Neural",
        modelSelection: "Núcleo de IA",
        // Card Actions
        regenerate: "Regenerar",
        download: "Descargar",
        refinePlaceholder: "¿Cómo deberíamos modificar esto?...",
        cancel: "Cancelar",
        submit: "Aplicar"
    }
};

const MODELS = [
    { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro', description: 'Gemini 3 Pro Image (Quality)', icon: Sparkles },
    { id: 'gemini-2.5-flash-image', name: 'Nano Banana', description: 'Gemini 2.5 Flash (Speed)', icon: Zap },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4 Generate', description: 'Google Imagen 4 Standard', icon: Cpu },
    { id: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4 Ultra', description: 'Google Imagen 4 High Fidelity', icon: Sparkles },
    { id: 'imagen-4.0-fast-generate-001', name: 'Imagen 4 Fast', description: 'Google Imagen 4 Optimized', icon: Zap },
];

interface ImagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: Task | null;
}

export const ImagesModal: React.FC<ImagesModalProps> = ({ isOpen, onClose, task }) => {
    const { activeProject } = useProjectStore();
    const [language, setLanguage] = useState<SupportedLanguage>('es');

    useEffect(() => {
        const browserLang = navigator.language.split('-')[0];
        if (browserLang === 'en') setLanguage('en');
    }, []);

    const t = TRANSLATIONS[language];

    // Files
    const [docxFile, setDocxFile] = useState<File | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(activeProject?.logo_url || null);

    // Settings
    const [instructions, setInstructions] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-image-preview');
    const [featuredRatio, setFeaturedRatio] = useState<AspectRatio>('16:9');
    const [inlineRatio, setInlineRatio] = useState<AspectRatio>('16:9');
    const [inlineImageCount, setInlineImageCount] = useState<InlineImageCount>('auto');

    // Custom Dimensions
    const [featuredDim, setFeaturedDim] = useState<CustomDimensions>({ width: 1200, height: 630 });
    const [inlineDim, setInlineDim] = useState<CustomDimensions>({ width: 800, height: 600 });

    // Data
    const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

    // State
    const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [isLoadingTask, setIsLoadingTask] = useState(false);

    // Load logo from project if it changes
    useEffect(() => {
        if (activeProject?.logo_url) {
            setLogoUrl(activeProject.logo_url);
        }
    }, [activeProject?.logo_url]);

    // Load Task Content
    useEffect(() => {
        if (isOpen && task) {
            loadTaskContent();
        }
    }, [isOpen, task?.id]);

    const loadTaskContent = async () => {
        if (!task) return;
        setIsLoadingTask(true);
        try {
            // 1. Check for drafts linked to this task
            const { data: artifact } = await supabase
                .from('task_artifacts')
                .select('artifact_reference')
                .eq('task_id', task.id)
                .eq('artifact_type', 'draft')
                .maybeSingle();

            if (artifact) {
                const { data: draft } = await supabase
                    .from('content_drafts')
                    .select('html_content')
                    .eq('id', artifact.artifact_reference)
                    .single();

                if (draft && draft.html_content) {
                    // Simple HTML to Paragraphs conversion for the tool
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = draft.html_content;
                    const paragraphs = Array.from(tempDiv.querySelectorAll('p, h2, h3'))
                        .map(n => n.textContent?.trim())
                        .filter(t => t && t.length > 20) as string[];

                    if (paragraphs.length > 0) {
                        setBlogPost({
                            title: task.title,
                            paragraphs: paragraphs
                        });
                    }
                }
            } else if (task.brief) {
                // Fallback to brief
                setBlogPost({
                    title: task.title,
                    paragraphs: [task.brief]
                });
            }
        } catch (err) {
            console.error("Error loading task content:", err);
        } finally {
            setIsLoadingTask(false);
        }
    };

    const handleDocxSelect = async (file: File) => {
        setDocxFile(file);
        try {
            const post = await parseDocx(file);
            setBlogPost(post);
        } catch (err) {
            setError("Error leyendo el archivo .docx");
        }
    };

    const processArticle = async () => {
        if (!blogPost) return;

        try {
            setError(null);
            setGeneratedImages([]);

            // 1. Analyze with Gemini
            setStatus(ProcessingStatus.ANALYZING_TEXT);
            setStatusMessage(t.analyzing);
            const plan = await analyzeTextAndPlanImages(blogPost.paragraphs, instructions, language, inlineImageCount);

            // 2. Generate Images
            setStatus(ProcessingStatus.GENERATING_IMAGES);
            const newImages: GeneratedImage[] = [];

            // Execute Featured Image
            setStatusMessage(`${t.generating} (Portada)`);
            const featuredBase64 = await processImageGeneration(
                plan.featuredImage.prompt,
                featuredRatio,
                featuredDim
            );

            newImages.push({
                id: Math.random().toString(36).substr(2, 9),
                url: featuredBase64,
                prompt: plan.featuredImage.prompt,
                filename: plan.featuredImage.filename,
                type: 'featured',
                altText: plan.featuredImage.altText,
                title: plan.featuredImage.title
            });
            setGeneratedImages([...newImages]);

            // Execute Inline Images
            for (const item of plan.inlineImages) {
                setStatusMessage(`${t.generating} (${item.filename})`);
                const base64 = await processImageGeneration(item.prompt, inlineRatio, inlineDim);

                newImages.push({
                    id: Math.random().toString(36).substr(2, 9),
                    url: base64,
                    prompt: item.prompt,
                    filename: item.filename,
                    type: 'inline',
                    paragraphIndex: item.paragraphIndex,
                    altText: item.altText,
                    title: item.title
                });
                setGeneratedImages([...newImages]);
            }

            setStatus(ProcessingStatus.COMPLETED);
            setStatusMessage(t.complete);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Ocurrió un error inesperado.");
            setStatus(ProcessingStatus.ERROR);
        }
    };

    const processImageGeneration = async (prompt: string, ratio: AspectRatio, customDim: CustomDimensions): Promise<string> => {
        const finalPrompt = instructions
            ? `${prompt}. Pautas globales: ${instructions}`
            : prompt;

        let base64 = await generateImage(
            finalPrompt,
            selectedModel,
            ratio,
            customDim.width,
            customDim.height
        );

        if (logoUrl) {
            base64 = await applyWatermark(base64, logoUrl);
        }
        return base64;
    };

    const handleRegenerate = async (image: GeneratedImage, refinement?: string) => {
        if (status === ProcessingStatus.GENERATING_IMAGES || regeneratingId) return;

        try {
            setRegeneratingId(image.id);
            const prevStatus = status;
            setStatus(ProcessingStatus.REGENERATING);

            const ratio = image.type === 'featured' ? featuredRatio : inlineRatio;
            const dim = image.type === 'featured' ? featuredDim : inlineDim;

            let activePrompt = image.prompt;
            if (refinement) {
                activePrompt = `${activePrompt}. Modificación específica: ${refinement}`;
            }

            const newBase64 = await processImageGeneration(activePrompt, ratio, dim);

            setGeneratedImages(prev => prev.map(img =>
                img.id === image.id
                    ? { ...img, url: newBase64 }
                    : img
            ));

            setStatus(prevStatus === ProcessingStatus.COMPLETED ? ProcessingStatus.COMPLETED : prevStatus);
        } catch (err: any) {
            alert("Error al regenerar: " + err.message);
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleDownloadAll = async () => {
        if (generatedImages.length === 0) return;

        const zip = new JSZip();
        const folder = zip.folder(`${task?.title || 'nous'}-assets`);

        generatedImages.forEach((img) => {
            const data = img.url.split(',')[1];
            if (folder) {
                folder.file(img.filename, data, { base64: true });
            }
        });

        const seoLog = generatedImages.map(img =>
            `--------------------------------------------------
Archivo:   ${img.filename}
Tipo:      ${img.type === 'featured' ? 'Portada' : 'Cuerpo'}
Título:    ${img.title}
Alt:       ${img.altText}
Prompt:    ${img.prompt}
--------------------------------------------------`
        ).join('\n');

        if (folder) folder.file("metadatos-seo.txt", seoLog);

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `pack-imagenes-${task?.title ? task.title.toLowerCase().replace(/\s+/g, '-') : 'nous'}.zip`);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-slate-50 w-full max-w-[1400px] h-full max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
                >
                    {/* Header */}
                    <header className="px-10 py-6 bg-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                                <Wand2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{t.title}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{task?.title || "Generador Visual"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex bg-slate-100 rounded-full p-1 text-[10px] font-black tracking-widest uppercase">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={cn("px-3 py-1.5 rounded-full transition-all", language === 'en' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}
                                >EN</button>
                                <button
                                    onClick={() => setLanguage('es')}
                                    className={cn("px-3 py-1.5 rounded-full transition-all", language === 'es' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}
                                >ES</button>
                            </div>
                            <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                                <X size={24} />
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                        {/* Sidebar: Config */}
                        <aside className="w-full lg:w-[400px] bg-white border-r border-slate-100 overflow-y-auto p-8 custom-scrollbar space-y-8">

                            {!blogPost && (
                                <FileUpload
                                    label={t.uploadDoc}
                                    accept=".docx"
                                    selectedFile={docxFile}
                                    onFileSelect={handleDocxSelect}
                                    onClear={() => { setDocxFile(null); setBlogPost(null); }}
                                    icon="doc"
                                />
                            )}

                            {activeProject?.logo_url ? (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white border border-emerald-100 p-1 flex items-center justify-center overflow-hidden">
                                        <img src={activeProject.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Logo del Proyecto</p>
                                        <p className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-tight">Listo para watermarking</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-4 opacity-70">
                                    <Settings2 size={24} className="text-amber-500" />
                                    <div>
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Sin Logo</p>
                                        <p className="text-[9px] text-amber-500 font-bold uppercase tracking-tight">Vea Configuracin del Proyecto</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                {/* Model Selector */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">{t.modelSelection}</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {MODELS.map((model) => (
                                            <button
                                                key={model.id}
                                                onClick={() => setSelectedModel(model.id)}
                                                className={cn(
                                                    "flex items-center gap-4 p-3 rounded-2xl border transition-all text-left group",
                                                    selectedModel === model.id
                                                        ? "bg-emerald-50 border-emerald-500 shadow-sm"
                                                        : "bg-slate-50/50 border-slate-100 hover:border-slate-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-2 rounded-xl transition-colors",
                                                    selectedModel === model.id ? "bg-emerald-500 text-white" : "bg-white text-slate-400 group-hover:bg-slate-100"
                                                )}>
                                                    <model.icon size={16} />
                                                </div>
                                                <div>
                                                    <p className={cn("text-[10px] font-bold uppercase tracking-tight", selectedModel === model.id ? "text-emerald-900" : "text-slate-700")}>{model.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-medium">{model.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{t.imageCount}</label>
                                        <select
                                            value={inlineImageCount}
                                            onChange={(e) => setInlineImageCount(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value) as any)}
                                            className="w-full text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="auto">{t.auto}</option>
                                            {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{t.featuredSize}</label>
                                        <select
                                            value={featuredRatio}
                                            onChange={(e) => setFeaturedRatio(e.target.value as AspectRatio)}
                                            className="w-full text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="16:9">Widescreen (16:9)</option>
                                            <option value="4:3">Standard (4:3)</option>
                                            <option value="1:1">Square (1:1)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{t.guidelines}</label>
                                    <textarea
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                        placeholder={t.guidelinesPlaceholder}
                                        className="w-full text-xs font-medium border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 h-32 resize-none placeholder:text-slate-300 transition-all"
                                    />
                                </div>
                            </div>

                            {status === ProcessingStatus.IDLE || status === ProcessingStatus.ERROR ? (
                                <button
                                    onClick={processArticle}
                                    disabled={!blogPost}
                                    className={cn(
                                        "w-full py-5 rounded-[20px] font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl active:scale-[0.98]",
                                        blogPost
                                            ? "bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-emerald-200"
                                            : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200"
                                    )}
                                >
                                    {t.generateBtn}
                                </button>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                                    {status === ProcessingStatus.COMPLETED ? (
                                        <>
                                            <CheckCircle2 size={32} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{t.complete}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Loader2 className="animate-spin text-emerald-500" size={32} />
                                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest animate-pulse">{statusMessage}</div>
                                        </>
                                    )}
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 text-[9px] font-bold uppercase rounded-2xl flex items-start gap-3 border border-red-100">
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {generatedImages.length > 0 && (
                                <button
                                    onClick={handleDownloadAll}
                                    className="w-full flex items-center justify-center gap-3 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-500 hover:text-white px-6 py-5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm active:scale-95 group"
                                >
                                    <Download size={18} />
                                    {t.downloadAll}
                                </button>
                            )}
                        </aside>

                        {/* Content Area */}
                        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30">
                            {blogPost ? (
                                <div className="max-w-4xl mx-auto">
                                    <div className="flex items-center justify-between mb-8 px-4">
                                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t.previewTitle}</h2>
                                        {logoUrl && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{t.watermarkActive}</span>}
                                    </div>

                                    <div className="relative">
                                        {regeneratingId && (
                                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-[3rem]">
                                                <div className="bg-white shadow-2xl px-6 py-4 rounded-full flex items-center gap-4 border border-slate-100 animate-in zoom-in-95">
                                                    <Loader2 className="animate-spin text-emerald-500" size={20} />
                                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Ajustando Visión...</span>
                                                </div>
                                            </div>
                                        )}
                                        <ArticlePreview
                                            blogPost={blogPost}
                                            generatedImages={generatedImages}
                                            onRegenerate={handleRegenerate}
                                            labels={t}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20 px-10 text-center">
                                    {isLoadingTask ? (
                                        <Loader2 size={48} className="animate-spin text-slate-100 mb-6" />
                                    ) : (
                                        <>
                                            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 mb-8">
                                                <FileText size={64} className="stroke-[1.5] text-slate-200" />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic mb-4">{t.noArticleHeading}</h3>
                                            <p className="text-xs font-medium max-w-sm leading-relaxed text-slate-400 mb-10">{t.noArticleDesc}</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </main>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
