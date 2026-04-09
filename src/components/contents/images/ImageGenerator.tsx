
"use client";

import React, { useState, useEffect } from 'react';
import { 
    Wand2, 
    Download, 
    Settings2, 
    ChevronRight, 
    Sparkles, 
    Layout, 
    Image as ImageIcon,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Copy,
    Save,
    Camera,
    Zap,
    Maximize2,
    History,
    Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BlogPost, 
    GeneratedImage, 
    ProcessingStatus, 
    AspectRatio, 
    InlineImageCount,
    ImagePlan
} from '@/types/images';
import { PollinationsService } from '@/lib/services/pollinationsService';
import { ImagePlanningService } from '@/lib/services/imagePlanningService';
import { uploadGeneratedImage } from '@/lib/actions/imageActions';
import { ContentSelector } from './ContentSelector';
import { ArticlePreview } from './ArticlePreview';
import { supabase } from '@/lib/supabase';

const TRANSLATIONS = {
    es: {
        title: "Nous Designer AI",
        subtitle: "Generador de Imágenes para Contenidos",
        settings: "Configuración del Proyecto",
        selectContent: "Seleccionar Contenido",
        styleGuidelines: "Estilo Visual",
        stylePlaceholder: "Ej: 'Arte vectorial minimalista', 'Fotografía cinemática real', '3D Render Soft'.",
        imageCount: "Imágenes de Apoyo",
        featuredSize: "Tamaño Portada",
        generateBtn: "Diseñar Imágenes",
        analyzing: "Analizando contenido...",
        planning: "Planificando visuales...",
        generating: "Generando imagen...",
        saving: "Guardando en la nube...",
        complete: "¡Diseño Completado!",
        error: "Ha ocurrido un error",
        previewTitle: "Previsualización del Artículo",
        noSelection: "Selecciona un contenido de la lista para empezar a generar imágenes.",
        saveToProject: "Guardar en el Proyecto",
        downloadAll: "Descargar Todo (ZIP)",
        startNew: "Nuevo Diseño",
        realismLevel: "Nivel de Realismo",
        optimizePrompt: "Optimizar con IA",
        customSize: "Tamaño Personalizado",
        widthLabel: "Ancho",
        heightLabel: "Alto",
        existingImages: "Galería Existente"
    }
};

export default function ImageGenerator() {
    const t = TRANSLATIONS.es;
    // const supabase = createClientComponentClient(); 
    // Use the imported supabase instead

    // UI States
    const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Form/Settings States
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [instructions, setInstructions] = useState("");
    const [featuredRatio, setFeaturedRatio] = useState<AspectRatio>('16:9');
    const [inlineImageCount, setInlineImageCount] = useState<InlineImageCount>('auto');
    
    // Realism/Model States
    const [realismMode, setRealismMode] = useState<'standard' | 'hyperrealistic'>('standard');
    const [sourceModel, setSourceModel] = useState<string>('flux');
    const [optimizePrompt, setOptimizePrompt] = useState(false);

    // Custom Dimensions States
    const [useCustomSize, setUseCustomSize] = useState(false);
    const [customWidth, setCustomWidth] = useState(1280);
    const [customHeight, setCustomHeight] = useState(720);
    const [applyCustomToBody, setApplyCustomToBody] = useState(false);

    // Data States
    const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
    const [imagePlan, setImagePlan] = useState<ImagePlan | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [existingImages, setExistingImages] = useState<any[]>([]);

    const handleContentSelection = async (task: any) => {
        setSelectedTask(task);
        setBlogPost(null);
        setGeneratedImages([]);
        setImagePlan(null);
        setStatus(ProcessingStatus.IDLE);

        // Load existing images
        if (task) {
            const { data, error } = await supabase
                .from('task_images')
                .select('*')
                .eq('task_id', task.id)
                .order('created_at', { ascending: true });
            
            if (!error && data) {
                setExistingImages(data);
                // If there are existing images, we show them as the "current" state
                const mapped: GeneratedImage[] = data.map(img => ({
                    id: img.id,
                    url: img.url,
                    prompt: img.prompt,
                    filename: img.filename,
                    type: img.type,
                    paragraphIndex: img.paragraph_index,
                    altText: img.alt_text,
                    title: img.title
                }));
                setGeneratedImages(mapped);
                
                // Also set blog post structure so ArticlePreview works
                const paragraphs = task.content_body 
                    ? task.content_body.split(/<p>|<\/p>/).filter((p: string) => p.trim() !== "")
                    : ["Contenido sin párrafos detectados."];
                
                setBlogPost({ paragraphs, rawText: task.content_body || "" });
            }
        }
    };

    const processGeneration = async () => {
        if (!selectedTask) return;

        try {
            setError(null);
            setStatus(ProcessingStatus.READING_CONTENT);
            setStatusMessage(t.analyzing);

            // 1. Prepare Content
            const paragraphs = selectedTask.content_body 
                ? selectedTask.content_body.split(/<p>|<\/p>/).filter((p: string) => p.trim() !== "")
                : ["Contenido sin párrafos detectados."];
            
            const post: BlogPost = {
                paragraphs,
                rawText: selectedTask.content_body || ""
            };
            setBlogPost(post);

            // 2. Planning
            setStatus(ProcessingStatus.ANALYZING_TEXT);
            setStatusMessage(t.planning);
            const plan = await ImagePlanningService.planImages(
                paragraphs, 
                instructions, 
                'es', 
                inlineImageCount,
                realismMode
            );
            setImagePlan(plan);

            // 3. Batch Generation
            setStatus(ProcessingStatus.GENERATING_IMAGES);
            const imagesStore: GeneratedImage[] = [];

            // Featured Image logic for dimensions
            let fWidth = 1280;
            let fHeight = 720;
            
            if (useCustomSize) {
                fWidth = customWidth;
                fHeight = customHeight;
            } else {
                if (featuredRatio === '1:1') { fWidth = 1024; fHeight = 1024; }
                else if (featuredRatio === '4:3') { fWidth = 1024; fHeight = 768; }
            }

            // Featured Image
            setStatusMessage(`${t.generating} (Portada)`);
            const featuredUrl = PollinationsService.generateImageUrl(plan.featuredImage.prompt, {
                width: fWidth,
                height: fHeight,
                model: sourceModel,
                enhance: optimizePrompt
            });
            
            const featuredImg: GeneratedImage = {
                id: Math.random().toString(36).substr(2, 9),
                url: featuredUrl,
                prompt: plan.featuredImage.prompt,
                filename: plan.featuredImage.filename,
                type: 'featured',
                altText: plan.featuredImage.altText,
                title: plan.featuredImage.title
            };
            imagesStore.push(featuredImg);
            setGeneratedImages([...imagesStore]);

            // Inline Images
            for (let i = 0; i < plan.inlineImages.length; i++) {
                const item = plan.inlineImages[i];
                setStatusMessage(`${t.generating} (${i + 1}/${plan.inlineImages.length})`);
                
                // Inline dimensions logic
                let iWidth = 1024;
                let iHeight = 576;
                if (useCustomSize && applyCustomToBody) {
                    iWidth = customWidth;
                    iHeight = customHeight;
                }

                const url = PollinationsService.generateImageUrl(item.prompt, {
                    width: iWidth,
                    height: iHeight,
                    model: sourceModel,
                    enhance: optimizePrompt
                });

                imagesStore.push({
                    id: Math.random().toString(36).substr(2, 9),
                    url,
                    prompt: item.prompt,
                    filename: item.filename,
                    type: 'inline',
                    paragraphIndex: item.paragraphIndex,
                    altText: item.altText,
                    title: item.title
                });
                setGeneratedImages([...imagesStore]);
            }

            // 4. Persistence in Supabase (via Server Actions)
            setStatus(ProcessingStatus.SAVING);
            setStatusMessage(t.saving);
            await saveToSupabase(imagesStore);

            setStatus(ProcessingStatus.COMPLETED);
            setStatusMessage(t.complete);

            // Refresh existing
            handleContentSelection(selectedTask);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error inesperado");
            setStatus(ProcessingStatus.ERROR);
        }
    };

    const saveToSupabase = async (images: GeneratedImage[]) => {
        if (!selectedTask) return;

        for (const img of images) {
            try {
                // Use Server Action with optional logo watermark
                const result = await uploadGeneratedImage({
                    url: img.url,
                    taskId: selectedTask.id,
                    imageId: img.id,
                    prompt: img.prompt,
                    altText: img.altText,
                    title: img.title,
                    type: img.type as 'featured' | 'inline',
                    paragraphIndex: img.paragraphIndex,
                    logoUrl: selectedTask.project_logo_url // Automatically loaded from ContentSelector
                });

                if (result.success && result.publicUrl) {
                    setGeneratedImages(prev => prev.map(p => 
                        p.id === img.id ? { ...p, url: result.publicUrl!, storage_path: result.storagePath } : p
                    ));
                } else {
                    throw new Error(result.error || "Error al subir imagen");
                }

            } catch (e: any) {
                console.error("Error saving image via Server Action:", e);
            }
        }
    };

    const handleRegenerate = async (image: GeneratedImage, refinement?: string) => {
        if (status === ProcessingStatus.GENERATING_IMAGES || status === ProcessingStatus.SAVING) return;

        try {
            const prevStatus = status;
            setStatus(ProcessingStatus.REGENERATING);
            
            let activePrompt = image.prompt;
            if (refinement) activePrompt = `${activePrompt}. Requirement: ${refinement}`;
            
            // Regeneration logic for dimensions
            let rWidth = image.type === 'featured' ? 1280 : 1024;
            let rHeight = image.type === 'featured' ? 720 : 576;

            if (useCustomSize) {
                if (image.type === 'featured' || applyCustomToBody) {
                    rWidth = customWidth;
                    rHeight = customHeight;
                }
            }

            const newUrl = PollinationsService.generateImageUrl(activePrompt, {
                width: rWidth,
                height: rHeight,
                model: sourceModel,
                enhance: optimizePrompt
            });

            // Updating in state
            setGeneratedImages(prev => prev.map(img => img.id === image.id ? { ...img, url: newUrl } : img));
            
            // Re-save specific image using Server Action
            const updatedImg = { ...image, url: newUrl };
            await saveToSupabase([updatedImg]);

            setStatus(prevStatus);
        } catch (err: any) {
            alert("Error al regenerar: " + err.message);
            setStatus(ProcessingStatus.COMPLETED);
        }
    };

    const handleDownloadAll = async () => {
        if (generatedImages.length === 0) return;
        const JSZip = (await import('jszip')).default;
        const saveAs = (await import('file-saver')).saveAs;
        
        const zip = new JSZip();
        const folder = zip.folder("nous-assets");
        
        for (const img of generatedImages) {
            try {
                const response = await fetch(img.url);
                const blob = await response.blob();
                if (folder) folder.file(img.filename, blob);
            } catch (e) {
                console.error("Error zipping image:", img.filename, e);
            }
        }

        const seoLog = generatedImages.map(img => 
            `Archivo: ${img.filename}\nAlt: ${img.altText}\nTítulo: ${img.title}\nPrompt: ${img.prompt}\n---`
        ).join('\n');
        
        if (folder) folder.file("seo-metadata.txt", seoLog);
        
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `imagenes-${selectedTask.title || 'contenido'}.zip`);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
                            <Wand2 className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t.title}</h1>
                            <p className="text-sm text-slate-400 font-medium">{t.subtitle}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <AnimatePresence>
                            {status === ProcessingStatus.COMPLETED && (
                                <motion.button
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100"
                                >
                                    <CheckCircle2 size={16} />
                                    {t.complete}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden">
                <div className="h-full flex px-8 py-8 gap-8 max-w-[1600px] mx-auto">
                    
                    {/* Sidebar de Configuración */}
                    <div className="w-[400px] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                        
                        {/* Selector de Tarea */}
                        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Layout size={16} />
                                {t.selectContent}
                            </h2>
                            <ContentSelector onSelect={handleContentSelection} selectedId={selectedTask?.id} />
                        </section>

                        {existingImages.length > 0 && (
                            <section className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white">
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                                    <History size={16} />
                                    {t.existingImages}
                                </h2>
                                <div className="grid grid-cols-3 gap-2">
                                    {existingImages.map((img) => (
                                        <div key={img.id} className="aspect-square rounded-xl overflow-hidden border border-white/10 group relative">
                                            <img src={img.url} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                                <span className="text-[8px] font-black uppercase">{img.type === 'featured' ? 'C' : `P${img.paragraph_index}`}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Estilo y Parámetros */}
                        <section className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-100 transition-opacity ${!selectedTask ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Settings2 size={16} />
                                {t.settings}
                            </h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tight">{t.styleGuidelines}</label>
                                    <textarea
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                        placeholder={t.stylePlaceholder}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none transition-all"
                                    />
                                </div>

                                {/* Dynamic Realism UI */}
                                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest cursor-pointer">
                                            <Camera size={14} />
                                            {t.realismLevel}
                                        </label>
                                        <div className="flex bg-white p-1 rounded-lg border border-indigo-100">
                                            <button 
                                                onClick={() => { setRealismMode('standard'); setSourceModel('flux'); }}
                                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${realismMode === 'standard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-600'}`}
                                            >
                                                Standard
                                            </button>
                                            <button 
                                                onClick={() => { setRealismMode('hyperrealistic'); setSourceModel('grok-imagine'); }}
                                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${realismMode === 'hyperrealistic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-600'}`}
                                            >
                                                Ultra
                                            </button>
                                        </div>
                                    </div>

                                    {realismMode === 'hyperrealistic' && (
                                        <div className="space-y-3 pt-2 border-t border-indigo-100">
                                            <label className="block text-[10px] font-black text-indigo-400 uppercase">Modelo de Motor</label>
                                            <select 
                                                value={sourceModel}
                                                onChange={(e) => setSourceModel(e.target.value)}
                                                className="w-full bg-white border border-indigo-100 rounded-xl p-2.5 text-xs font-bold text-indigo-900 outline-none"
                                            >
                                                <option value="grok-imagine">Grok Imagine (Crudo/Real)</option>
                                                <option value="wan-image-pro">Wan Image Pro (Casta/HD)</option>
                                                <option value="flux">Flux (Equilibrado)</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className={optimizePrompt ? 'text-amber-500' : 'text-slate-300'} />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{t.optimizePrompt}</span>
                                        </div>
                                        <button 
                                            onClick={() => setOptimizePrompt(!optimizePrompt)}
                                            className={`w-10 h-5 rounded-full p-1 transition-colors ${optimizePrompt ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <motion.div 
                                                animate={{ x: optimizePrompt ? 20 : 0 }}
                                                className="w-3 h-3 bg-white rounded-full"
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Custom Dimensions UI */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer">
                                            <Maximize2 size={14} />
                                            {t.customSize}
                                        </label>
                                        <button 
                                            onClick={() => setUseCustomSize(!useCustomSize)}
                                            className={`w-10 h-5 rounded-full p-1 transition-colors ${useCustomSize ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <motion.div 
                                                animate={{ x: useCustomSize ? 20 : 0 }}
                                                className="w-3 h-3 bg-white rounded-full"
                                            />
                                        </button>
                                    </div>

                                    {useCustomSize && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-4 pt-2 border-t border-slate-100 overflow-hidden"
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t.widthLabel}</span>
                                                    <input 
                                                        type="number" 
                                                        value={customWidth}
                                                        onChange={(e) => setCustomWidth(parseInt(e.target.value) || 256)}
                                                        className="w-full bg-white border border-slate-100 rounded-lg p-2 text-xs font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{t.heightLabel}</span>
                                                    <input 
                                                        type="number" 
                                                        value={customHeight}
                                                        onChange={(e) => setCustomHeight(parseInt(e.target.value) || 256)}
                                                        className="w-full bg-white border border-slate-100 rounded-lg p-2 text-xs font-bold"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="applyToBody"
                                                    checked={applyCustomToBody}
                                                    onChange={(e) => setApplyCustomToBody(e.target.checked)}
                                                    className="w-4 h-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label htmlFor="applyToBody" className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer">
                                                    Aplicar también al cuerpo
                                                </label>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <div className={`grid grid-cols-2 gap-4 transition-opacity ${useCustomSize ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase">{t.imageCount}</label>
                                        <select 
                                            value={inlineImageCount} 
                                            onChange={(e) => setInlineImageCount(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value))}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="auto">Automático</option>
                                            <option value={1}>1 Imagen</option>
                                            <option value={2}>2 Imágenes</option>
                                            <option value={3}>3 Imágenes</option>
                                            <option value={4}>4 Imágenes</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase">{t.featuredSize}</label>
                                        <select 
                                            value={featuredRatio} 
                                            onChange={(e) => setFeaturedRatio(e.target.value as AspectRatio)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="16:9">Panorámico (16:9)</option>
                                            <option value="1:1">Cuadrado (1:1)</option>
                                            <option value="4:3">Estándar (4:3)</option>
                                        </select>
                                    </div>
                                </div>

                                {status === ProcessingStatus.IDLE || status === ProcessingStatus.COMPLETED || status === ProcessingStatus.ERROR ? (
                                    <button
                                        onClick={processGeneration}
                                        disabled={!selectedTask}
                                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest transition-all shadow-lg ${
                                            selectedTask 
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] shadow-indigo-100' 
                                                : 'bg-slate-200 text-slate-400'
                                        }`}
                                    >
                                        <Sparkles size={18} />
                                        {t.generateBtn}
                                    </button>
                                ) : (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                                        <div>
                                            <p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">{statusMessage}</p>
                                            <div className="w-32 h-1 bg-indigo-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    className="h-full bg-indigo-600"
                                                    animate={{ x: [-128, 128] }}
                                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                                        <AlertCircle className="text-rose-500 shrink-0" size={18} />
                                        <p className="text-xs text-rose-600 font-medium leading-relaxed">{error}</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Área Principal - Vista Previa */}
                    <div className="flex-1 overflow-hidden flex flex-col gap-6">
                        <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
                            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <ImageIcon size={16} />
                                    {t.previewTitle}
                                </h3>
                                {generatedImages.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                            <Copy size={20} />
                                        </button>
                                        <button 
                                            onClick={handleDownloadAll}
                                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            <Download size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
                                {blogPost ? (
                                    <div className="p-8">
                                        <ArticlePreview 
                                            blogPost={blogPost} 
                                            generatedImages={generatedImages} 
                                            onRegenerate={handleRegenerate}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-20">
                                        <div className="w-24 h-24 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                                            <Layout className="text-slate-200" size={48} />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-400 mb-2">Editor Visual Vacío</h4>
                                        <p className="text-sm text-slate-300 max-w-xs">{t.noSelection}</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Barra de Acciones Finales */}
                        <AnimatePresence>
                            {status === ProcessingStatus.COMPLETED && (
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 50, opacity: 0 }}
                                    className="h-20 bg-indigo-900 rounded-[2rem] shadow-2xl shadow-indigo-200 flex items-center justify-between px-10 border border-indigo-800"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-700/50 rounded-full flex items-center justify-center">
                                            <Save className="text-indigo-200" size={20} />
                                        </div>
                                        <p className="text-indigo-100 font-bold text-sm">Contenido actualizado con {generatedImages.length} imágenes.</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setSelectedTask(null);
                                            setBlogPost(null);
                                            setGeneratedImages([]);
                                            setStatus(ProcessingStatus.IDLE);
                                        }}
                                        className="bg-white text-indigo-900 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                                    >
                                        {t.startNew}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
