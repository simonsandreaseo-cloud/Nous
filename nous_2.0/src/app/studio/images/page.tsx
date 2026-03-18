"use client";

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Wand2, Download, FileText, AlertCircle, Loader2, CheckCircle2, Settings2, MessageSquare, Globe, X, Hash, Sparkles, Cpu, Zap, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { FileUpload } from '@/components/studio/images/FileUpload';
import { ArticlePreview } from '@/components/studio/images/ArticlePreview';
import { parseDocx } from '@/lib/services/images/docxService';
import { analyzeTextAndPlanImagesAction, generateImageAction } from '@/app/node-tasks/image-actions';
import { applyWatermark } from '@/lib/services/images/watermarkService';
import { BlogPost, GeneratedImage, ProcessingStatus, AspectRatio, SupportedLanguage, CustomDimensions, InlineImageCount } from '@/types/images';
import { cn } from '@/utils/cn';
import { useProjectStore } from '@/store/useProjectStore';
import { useWriterStore } from '@/store/useWriterStore';

// Simple Translation Dictionary
const TRANSLATIONS = {
    en: {
        title: "Nous Visuals",
        downloadAll: "Download All",        settings: "Visual Intelligence",
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
        one: "Single Focus",
        two: "Dual Path",
        three: "Trio View",
        four: "Quad Mapping",
        errorTitle: "Neural Link Interrupted",
        errorDesc: "An error occurred during image synthesis. Please try again.",
        successTitle: "Intelligence Synchronized",
        successDesc: "All images generated and processed successfully.",
        regenerate: "Refine",
        download: "Source",
        refinePlaceholder: "Describe changes (e.g., 'Make it more blue', 'Add more neon')...",
        cancel: "Abort",
        submit: "Apply",
        language: "Analysis Language"
    },
    es: {
        title: "Nous Visuals",
        downloadAll: "Descargar Todo",        settings: "Inteligencia Visual",
        uploadDoc: "Subir Artículo (.docx)",
        uploadLogo: "Logo para Marca de Agua",
        featuredSize: "Relación Portada",
        bodySize: "Relación Contenido",
        guidelines: "Pautas de Estilo",
        guidelinesPlaceholder: "Ej: 'Arte vectorial flat', 'Cinematográfico oscuro', 'Cyberpunk'...",
        guidelinesHint: "Estas instrucciones guiarán a la IA en todas las imágenes.",
        generateBtn: "Sintetizar Visuales",
        complete: "Síntesis Completa",
        startNew: "Nuevo Proyecto",
        reading: "Leyendo flujo de datos...",
        analyzing: "Análisis de contexto IA en progreso...",
        generating: "Generando representación latente...",
        projectStats: "Métricas del Proyecto",
        featuredReady: "Portada Lista",
        inlineReady: "Contenido Listo",
        previewTitle: "Vista Previa de Inteligencia",
        watermarkActive: "Marca de Agua Aplicada",
        noArticle: "Esperando Entrada",
        noArticleDesc: "Sube un documento para iniciar el proceso de generación visual IA.",
        width: "Ancho",
        height: "Alto",
        custom: "Personalizado",
        imageCount: "Densidad de Imágenes",
        auto: "Auto Neural",
        one: "Enfoque Único",
        two: "Doble Trayecto",
        three: "Vista Triple",
        four: "Mapeo Cuádruple",
        errorTitle: "Enlace Neural Interrumpido",
        errorDesc: "Ocurrió un error durante la síntesis. Inténtalo de nuevo.",
        successTitle: "Inteligencia Sincronizada",
        successDesc: "Todas las imágenes generadas y procesadas con éxito.",
        regenerate: "Refinar",
        download: "Origen",
        refinePlaceholder: "Describe cambios (ej: 'Hazlo más azul', 'Más neón')...",
        cancel: "Abortar",
        submit: "Aplicar",
        language: "Idioma de Análisis"
    }
};

const MODELS = [
    { id: 'gemini-2.5-flash-image', name: 'Nous Express', description: 'Gemini 2.5 Flash Image (Original)', icon: Zap }
];
export default function ImagesPage() {
    const [mounted, setMounted] = useState(false);
    const { activeProject } = useProjectStore();
    const { content: storeContent, title: storeTitle, setMetadata, metadata: storeMetadata } = useWriterStore();

    const [language, setLanguage] = useState<SupportedLanguage>('es');
    const t = TRANSLATIONS[language];

    // State
    const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
    const [logo, setLogo] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
    const [error, setError] = useState<string | null>(null);

    // Settings
    const [instructions, setInstructions] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-image');
    const [featuredRatio, setFeaturedRatio] = useState<AspectRatio>('16:9');
    const [inlineRatio, setInlineRatio] = useState<AspectRatio>('16:9');
    const [inlineImageCount, setInlineImageCount] = useState<InlineImageCount>('auto');

    useEffect(() => {
        setMounted(true);
        // Auto-load article from store if available
        if (storeContent && !blogPost) {
            const paragraphs = storeContent
                .split(/\n\s*\n/)
                .map(p => p.replace(/<[^>]*>/g, '').trim())
                .filter(p => p.length > 0);

            setBlogPost({
                title: storeTitle,
                paragraphs: paragraphs
            });
        }
    }, [storeContent, storeTitle, blogPost]);

    if (!mounted) return (
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-300" size={32} />
        </div>
    );

    const handleSyncToArticle = () => {
        if (!generatedImages.length) return;

        const visualMetadata = {
            images: generatedImages.map(img => ({
                id: img.id,
                type: img.type,
                filename: img.filename,
                altText: img.altText,
                title: img.title,
                prompt: img.prompt,
                rationale: img.rationale
            }))
        };

        setMetadata({
            ...(storeMetadata || {}),
            visuals: visualMetadata
        });

        alert(language === 'es' ? "¡Inteligencia visual sincronizada con el artículo!" : "Visual intelligence synchronized with article!");
    };

    const handleDocUpload = async (file: File) => {
        try {
            const post = await parseDocx(file);
            setBlogPost(post);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleLogoUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => setLogo(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!blogPost) return;

        setStatus(ProcessingStatus.ANALYZING_TEXT);
        setError(null);
        setGeneratedImages([]);

        try {
            // 1. Analyze and Plan via Server Action
            const plan = await analyzeTextAndPlanImagesAction(
                blogPost.paragraphs,
                instructions,
                language,
                inlineImageCount
            );

            setStatus(ProcessingStatus.GENERATING_IMAGES);

            const images: GeneratedImage[] = [];

            // 2. Generate Featured Image
            const featuredBase64 = await generateImageAction(
                plan.featuredImage.prompt,
                selectedModel,
                featuredRatio
            );

            let featuredFinal = featuredBase64;
            if (logo) {
                try {
                    featuredFinal = await applyWatermark(featuredBase64, logo);
                } catch (wErr) {
                    console.warn("Watermark failed for featured image", wErr);
                }
            }

            images.push({
                id: 'featured',
                type: 'featured',
                url: featuredFinal,
                ...plan.featuredImage
            });

            setGeneratedImages([...images]);

            // 3. Generate Inline Images
            for (let i = 0; i < plan.inlineImages.length; i++) {
                const inlinePlan = plan.inlineImages[i];
                const inlineBase64 = await generateImageAction(
                    inlinePlan.prompt,
                    selectedModel,
                    inlineRatio
                );

                let inlineFinal = inlineBase64;
                if (logo) {
                    try {
                        inlineFinal = await applyWatermark(inlineBase64, logo);
                    } catch (wErr) {
                        console.warn("Watermark failed for inline image", wErr);
                    }
                }

                images.push({
                    id: `inline-${i}`,
                    type: 'inline',
                    url: inlineFinal,
                    ...inlinePlan
                });

                setGeneratedImages([...images]);
            }

            setStatus(ProcessingStatus.COMPLETED);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setStatus(ProcessingStatus.ERROR);
        }
    };

    const handleRegenerate = async (img: GeneratedImage, refinement?: string) => {
        try {
            const newPrompt = refinement ? `${img.prompt} (Adjustment: ${refinement})` : img.prompt;
            const ratio = img.type === 'featured' ? featuredRatio : inlineRatio;

            const base64 = await generateImageAction(newPrompt, selectedModel, ratio);

            let finalUrl = base64;
            if (logo) {
                try {
                    finalUrl = await applyWatermark(base64, logo);
                } catch (wErr) {
                    console.warn("Watermark refinement failed", wErr);
                }
            }

            setGeneratedImages(prev => prev.map(item =>
                item.id === img.id ? { ...item, url: finalUrl, prompt: newPrompt } : item
            ));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();

        // 1. Add images
        for (const img of generatedImages) {
            const base64Data = img.url.split(',')[1];
            zip.file(`${img.filename}.png`, base64Data, { base64: true });
        }

        // 2. Add metadata manifest
        const manifest = {
            project: activeProject,
            generatedDate: new Date().toISOString(),
            images: generatedImages.map(img => ({
                filename: img.filename,
                altText: img.altText,
                title: img.title,
                type: img.type,
                rationale: img.rationale
            }))
        };
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `blogviz-pack-${new Date().getTime()}.zip`);
    };

    const reset = () => {
        setBlogPost(null);
        setGeneratedImages([]);
        setStatus(ProcessingStatus.IDLE);
        setError(null);
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB] selection:bg-emerald-100 pb-32">
            {/* Clinical Top Bar */}
            <div className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-white/80">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-200">
                        <Wand2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">{t.title}</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Neural Visualization Engine</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
                        <button
                            onClick={() => setLanguage('es')}
                            className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", language === 'es' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                        >ES</button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", language === 'en' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                        >EN</button>
                    </div>

                    {status === ProcessingStatus.COMPLETED && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSyncToArticle}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100"
                            >
                                <Sparkles size={14} /> {language === 'es' ? 'Sincronizar' : 'Sync to Article'}
                            </button>
                            <button
                                onClick={handleDownloadAll}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                            >
                                <Download size={14} /> {t.downloadAll}
                            </button>
                            <button
                                onClick={reset}
                                className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                {t.startNew}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Panel: Article Context */}
                <div className="lg:col-span-8 space-y-8">
                    {!blogPost ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center flex flex-col items-center justify-center min-h-[600px] group transition-all hover:border-slate-300">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                <FileText size={48} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">{t.noArticle}</h2>
                            <p className="text-slate-400 max-w-sm mx-auto font-medium leading-relaxed mb-12">
                                {t.noArticleDesc}
                            </p>
                            <div className="w-full max-w-md">
                                <FileUpload
                                    label={t.uploadDoc}
                                    accept=".docx"
                                    onFileSelect={handleDocUpload}
                                    selectedFile={null}
                                    onClear={() => { }}
                                    icon="doc"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <ArticlePreview
                                blogPost={blogPost}
                                generatedImages={generatedImages}
                                onRegenerate={handleRegenerate}
                                labels={{
                                    regenerate: t.regenerate,
                                    download: t.download,
                                    refinePlaceholder: t.refinePlaceholder,
                                    cancel: t.cancel,
                                    submit: t.submit
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Right Panel: Settings & Status */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sticky top-28">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                <Settings2 size={18} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{t.settings}</h3>
                        </div>

                        {/* Model Selector */}
                        <div className="space-y-4 mb-10">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block italic text-center mb-6 py-2 border-2 border-slate-900 bg-slate-900 text-white rounded-xl">Módulos de Generación</label>
                            <div className="grid grid-cols-1 gap-3">
                                {MODELS.map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => setSelectedModel(model.id)}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                                            selectedModel === model.id
                                                ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2.5 rounded-xl transition-colors",
                                            selectedModel === model.id ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 group-hover:text-slate-600"
                                        )}>
                                            <model.icon size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight">{model.name}</p>
                                            <p className={cn("text-[9px] font-medium tracking-tight", selectedModel === model.id ? "text-slate-400" : "text-slate-400")}>{model.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ratios & Density */}
                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <div className="w-1 h-3 bg-emerald-500 rounded-full" /> {t.featuredSize}
                                </label>
                                <select
                                    value={featuredRatio}
                                    onChange={(e) => setFeaturedRatio(e.target.value as AspectRatio)}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all appearance-none"
                                >
                                    <option value="16:9">Widescreen 16:9</option>
                                    <option value="4:3">Standard 4:3</option>
                                    <option value="1:1">Square 1:1</option>
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <div className="w-1 h-3 bg-blue-500 rounded-full" /> {t.bodySize}
                                </label>
                                <select
                                    value={inlineRatio}
                                    onChange={(e) => setInlineRatio(e.target.value as AspectRatio)}
                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all appearance-none"
                                >
                                    <option value="16:9">Widescreen 16:9</option>
                                    <option value="4:3">Standard 4:3</option>
                                    <option value="1:1">Square 1:1</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 mb-10">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                <Hash size={12} /> {t.imageCount}
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {(['auto', '1', '2', '3', '4'] as InlineImageCount[]).map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setInlineImageCount(val)}
                                        className={cn(
                                            "py-2.5 rounded-xl text-[10px] font-black border transition-all uppercase",
                                            inlineImageCount === val ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                                        )}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Styles */}
                        <div className="space-y-4 mb-10">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                <Sparkles size={12} /> {t.guidelines}
                            </label>
                            <div className="relative">
                                <textarea
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder={t.guidelinesPlaceholder}
                                    rows={4}
                                    className="w-full bg-slate-50 border-none rounded-[2rem] p-6 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all resize-none italic leading-relaxed"
                                />
                                <div className="absolute top-6 right-6 text-slate-200">
                                    <MessageSquare size={16} />
                                </div>
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium pl-2 italic">
                                {t.guidelinesHint}
                            </p>
                        </div>

                        {/* Logo for Watermark */}
                        <div className="space-y-4 mb-12">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                <ImageIcon size={12} /> {t.uploadLogo}
                            </label>
                            <FileUpload
                                label={t.uploadLogo}
                                accept="image/*"
                                onFileSelect={handleLogoUpload}
                                selectedFile={logo ? new File([], "logo_active.png") : null}
                                onClear={() => setLogo(null)}
                                icon="image"
                            />
                        </div>

                        {/* Action CTA */}
                        <button
                            onClick={handleGenerate}
                            disabled={!blogPost || status === ProcessingStatus.ANALYZING_TEXT || status === ProcessingStatus.GENERATING_IMAGES}
                            className={cn(
                                "w-full py-6 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl",
                                !blogPost || status === ProcessingStatus.ANALYZING_TEXT || status === ProcessingStatus.GENERATING_IMAGES
                                    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                    : "bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:scale-[1.02] active:scale-95 shadow-slate-200"
                            )}
                        >
                            {status === ProcessingStatus.GENERATING_IMAGES || status === ProcessingStatus.ANALYZING_TEXT ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {status === ProcessingStatus.ANALYZING_TEXT ? t.analyzing : t.generating}
                                </>
                            ) : (
                                <>
                                    <Cpu size={16} />
                                    {t.generateBtn}
                                </>
                            )}
                        </button>

                        {/* Status Messages */}
                        <AnimatePresence>
                            {status === ProcessingStatus.COMPLETED && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 p-4 bg-emerald-50 rounded-2xl flex items-center gap-3"
                                >
                                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-full">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{t.complete}</p>
                                </motion.div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 p-4 bg-rose-50 rounded-2xl flex items-start gap-3"
                                >
                                    <div className="p-1.5 bg-rose-100 text-rose-600 rounded-full shrink-0">
                                        <AlertCircle size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Error Neural</p>
                                        <p className="text-[10px] font-medium text-rose-600 leading-tight">{error}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
