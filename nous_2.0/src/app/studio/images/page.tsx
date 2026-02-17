"use client";

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Wand2, Download, FileText, AlertCircle, Loader2, CheckCircle2, Settings2, MessageSquare, Globe, X, Hash, Sparkles, Cpu, Zap } from 'lucide-react';

import { FileUpload } from '@/components/studio/images/FileUpload';
import { ArticlePreview } from '@/components/studio/images/ArticlePreview';
import { parseDocx } from '@/lib/services/images/docxService';
import { analyzeTextAndPlanImagesAction, generateImageAction } from '@/app/actions/image-actions';
import { applyWatermark } from '@/lib/services/images/watermarkService';
import { BlogPost, GeneratedImage, ProcessingStatus, AspectRatio, SupportedLanguage, CustomDimensions, InlineImageCount } from '@/types/images';
import { cn } from '@/utils/cn';
import { useProjectStore } from '@/store/useProjectStore';
import { supabase } from '@/lib/supabase';

// Simple Translation Dictionary
const TRANSLATIONS = {
    en: {
        title: "BlogViz AI",
        downloadAll: "Download All",
        settings: "Visual Intelligence",
        uploadDoc: "Upload Article (.docx)",
        uploadLogo: "Watermark Logo (PNG/WebP)",
        featuredSize: "Front Page Aspect",
        bodySize: "Inline Aspect",
        guidelines: "Style Guidelines",
        guidelinesPlaceholder: "E.g., 'Flat vector art', 'Dark and cinematic', 'Cyberpunk'...",
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
        noArticleDesc: "Upload a document to begin the AI visual generation process.",
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
        uploadLogo: "Marca de Agua (PNG/WebP)",
        featuredSize: "Ratio Portada",
        bodySize: "Ratio Imágenes",
        guidelines: "Pautas de Estilo",
        guidelinesPlaceholder: "Ej., 'Arte vector plano', 'Cinemático y oscuro', 'Cyberpunk'...",
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
        noArticleDesc: "Sube un documento para iniciar el proceso de generación visual por IA.",
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
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Maximum Quality & Context', icon: Sparkles },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Balanced Speed & Quality', icon: Zap },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Next-Gen Performance', icon: Sparkles },
    { id: 'imagen-3.0-generate-001', name: 'Imagen 3 Standard', description: 'High Quality Generation', icon: Cpu },
];



export default function ImagesPage() {
    const { activeProject } = useProjectStore();
    // Language Detection
    const [language, setLanguage] = useState<SupportedLanguage>('es');

    useEffect(() => {
        const browserLang = navigator.language.split('-')[0];
        if (browserLang === 'en') setLanguage('en');
    }, []);

    const t = TRANSLATIONS[language];

    // Files
    const [docxFile, setDocxFile] = useState<File | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(activeProject?.logo_url || null);

    // Sync logo from store
    useEffect(() => {
        if (activeProject?.logo_url) {
            setLogoUrl(activeProject.logo_url);
        }
    }, [activeProject?.logo_url]);

    // Settings
    const [instructions, setInstructions] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-pro');
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

    // Handle File Selection
    const handleDocxSelect = (file: File) => setDocxFile(file);

    const handleLogoSelect = (file: File) => {
        setLogoFile(file);
        const url = URL.createObjectURL(file);
        setLogoUrl(url);
    };

    // Main Process Logic
    const processArticle = async () => {
        if (!docxFile) return;

        try {
            setError(null);
            setGeneratedImages([]);

            // 1. Read DOCX
            setStatus(ProcessingStatus.READING_DOC);
            setStatusMessage(t.reading);
            const post = await parseDocx(docxFile);
            setBlogPost(post);

            // 2. Analyze with Gemini
            setStatus(ProcessingStatus.ANALYZING_TEXT);
            setStatusMessage(t.analyzing);
            const plan = await analyzeTextAndPlanImagesAction(post.paragraphs, instructions, language, inlineImageCount);

            // 3. Generate Images
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
            setError(err.message || "An unexpected error occurred.");
            setStatus(ProcessingStatus.ERROR);
        }
    };

    // Helper for Generation + Watermark
    const processImageGeneration = async (prompt: string, ratio: AspectRatio, customDim: CustomDimensions): Promise<string> => {
        const finalPrompt = instructions
            ? `${prompt}. Pautas globales: ${instructions}`
            : prompt;

        let base64 = await generateImageAction(
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

    // Regenerate Single Image
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
            alert("Failed to regenerate: " + err.message);
        } finally {
            setRegeneratingId(null);
        }
    };

    // Download All Logic
    const handleDownloadAll = async () => {
        if (generatedImages.length === 0) return;

        const zip = new JSZip();
        const folder = zip.folder("nous-assets");

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
        saveAs(content, "paquete-imagenes-nous.zip");
    };

    const reset = () => {
        setDocxFile(null);
        setLogoFile(null);
        setLogoUrl(null);
        setBlogPost(null);
        setGeneratedImages([]);
        setStatus(ProcessingStatus.IDLE);
        setError(null);
        setInstructions("");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-24 pb-12">
            <main className="flex-1 max-w-[1600px] mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Left Sidebar: Controls */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100/50">
                        <header className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                                <Wand2 size={24} className="text-emerald-500" />
                                {t.settings}
                            </h2>
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
                        </header>

                        <div className="space-y-6">
                            <FileUpload
                                label={t.uploadDoc}
                                accept=".docx"
                                selectedFile={docxFile}
                                onFileSelect={handleDocxSelect}
                                onClear={() => setDocxFile(null)}
                                icon="doc"
                            />

                            <FileUpload
                                label={t.uploadLogo}
                                accept="image/png,image/jpeg,image/webp"
                                selectedFile={logoFile}
                                onFileSelect={handleLogoSelect}
                                onClear={() => { setLogoFile(null); setLogoUrl(null); }}
                                icon="image"
                            />

                            {/* Model Selector */}
                            <div className="pt-2">
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
                                                    : "bg-white border-slate-100 hover:border-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-xl transition-colors",
                                                selectedModel === model.id ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                            )}>
                                                <model.icon size={18} />
                                            </div>
                                            <div>
                                                <p className={cn("text-xs font-bold uppercase tracking-tight", selectedModel === model.id ? "text-emerald-900" : "text-slate-700")}>{model.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{model.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{t.imageCount}</label>
                                    <select
                                        value={inlineImageCount}
                                        onChange={(e) => setInlineImageCount(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value) as any)}
                                        className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
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
                                        className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    >
                                        <option value="16:9">Widescreen (16:9)</option>
                                        <option value="4:3">Standard (4:3)</option>
                                        <option value="1:1">Square (1:1)</option>
                                        <option value="9:16">Story (9:16)</option>
                                        <option value="custom">{t.custom}...</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">{t.guidelines}</label>
                                <textarea
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder={t.guidelinesPlaceholder}
                                    className="w-full text-xs font-medium border border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 h-28 resize-none placeholder:text-slate-300 transition-all shadow-inner"
                                />
                                <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest text-center">
                                    {t.guidelinesHint}
                                </p>
                            </div>
                        </div>

                        {status === ProcessingStatus.IDLE || status === ProcessingStatus.ERROR ? (
                            <button
                                onClick={processArticle}
                                disabled={!docxFile}
                                className={cn(
                                    "w-full mt-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl active:scale-[0.98]",
                                    docxFile
                                        ? "bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-emerald-200"
                                        : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200"
                                )}
                            >
                                {t.generateBtn}
                            </button>
                        ) : (
                            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                                {status === ProcessingStatus.COMPLETED ? (
                                    <>
                                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">{t.complete}</span>
                                        <button onClick={reset} className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline mt-2 decoration-2 underline-offset-4">{t.startNew}</button>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} />
                                        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest animate-pulse">{statusMessage}</div>
                                    </>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="mt-6 p-4 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-2xl flex items-start gap-3 border border-red-100 shadow-sm">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>

                    {generatedImages.length > 0 && (
                        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100/50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">{t.projectStats}</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Portada</span>
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{t.featuredReady}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Cuerpo</span>
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                        {generatedImages.filter(i => i.type === 'inline').length} {t.inlineReady}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleDownloadAll}
                                className="w-full mt-6 flex items-center justify-center gap-3 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-500 hover:text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm active:scale-95 group"
                            >
                                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                                {t.downloadAll}
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Content: Preview */}
                <div className="lg:col-span-8">
                    {blogPost ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="flex items-center justify-between mb-6 px-4">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{t.previewTitle}</h2>
                                {logoUrl && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{t.watermarkActive}</span>}
                            </div>

                            <div className="relative">
                                {regeneratingId && (
                                    <div className="absolute inset-x-0 top-20 z-10 flex items-center justify-center pointer-events-none">
                                        <div className="bg-white/90 backdrop-blur-xl shadow-2xl px-6 py-4 rounded-full flex items-center gap-4 border border-slate-100 animate-in zoom-in-95 duration-300">
                                            <Loader2 className="animate-spin text-emerald-500" size={20} />
                                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Re-Imaginando...</span>
                                        </div>
                                    </div>
                                )}
                                <div className={cn("transition-opacity duration-300", regeneratingId ? "opacity-50 grayscale-[0.2]" : "opacity-100")}>
                                    <ArticlePreview
                                        blogPost={blogPost}
                                        generatedImages={generatedImages}
                                        onRegenerate={handleRegenerate}
                                        labels={t}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[600px] bg-white rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center text-slate-400 p-12 text-center group">
                            <div className="bg-slate-50 p-8 rounded-[2rem] mb-6 transition-all group-hover:bg-emerald-50 group-hover:text-emerald-500">
                                <FileText size={48} className="stroke-[1.5]" />
                            </div>
                            <p className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">{t.noArticle}</p>
                            <p className="text-xs font-medium mt-3 max-w-sm leading-relaxed text-slate-400">{t.noArticleDesc}</p>
                            <div className="mt-8 flex gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-100 animate-bounce" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-100 animate-bounce [animation-delay:0.2s]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-100 animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
