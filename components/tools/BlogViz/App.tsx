import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { Wand2, Download, FileText, AlertCircle, Loader2, CheckCircle2, Settings2, MessageSquare, Globe, X, Hash } from 'lucide-react';

import { FileUpload } from './components/FileUpload';
import { ArticlePreview } from './components/ArticlePreview';
import { parseDocx } from './services/docxService';
import { analyzeTextAndPlanImages, generateImage } from './services/geminiService';
import { applyWatermark } from './services/watermarkService';
import { BlogPost, GeneratedImage, ProcessingStatus, AspectRatio, SupportedLanguage, CustomDimensions, InlineImageCount } from './types';

// Simple Translation Dictionary
const TRANSLATIONS = {
  en: {
    title: "BlogViz AI",
    downloadAll: "Download All",
    settings: "Project Setup",
    uploadDoc: "Upload Article (.docx)",
    uploadLogo: "Project Logo (Transparent PNG)",
    featuredSize: "Featured Size",
    bodySize: "Body Image Size",
    guidelines: "AI Guidelines / Chat",
    guidelinesPlaceholder: "E.g., 'Use a flat vector art style', 'Make images moody and dark'.",
    guidelinesHint: "Update this and click regenerate on an image to change its style.",
    generateBtn: "Generate Visuals",
    complete: "Generation Complete",
    startNew: "Start New Project",
    reading: "Reading DOCX file...",
    analyzing: "AI is analyzing context and planning visuals...",
    generating: "Generating images...",
    projectStats: "Project Stats",
    featuredReady: "Featured Image Ready",
    inlineReady: "Inline Images Ready",
    previewTitle: "Live Preview",
    watermarkActive: "Watermark Active",
    noArticle: "No article loaded yet",
    noArticleDesc: "Upload a DOCX file to see the AI analyze your content and place illustrations magically within the text.",
    width: "Width",
    height: "Height",
    custom: "Custom",
    imageCount: "Inline Images",
    auto: "Auto (AI Decides)",
    // Card Actions
    regenerate: "Regenerate",
    download: "Download",
    refinePlaceholder: "Modify this image (e.g., 'Add a cat')...",
    cancel: "Cancel",
    submit: "Go"
  },
  es: {
    title: "BlogViz AI",
    downloadAll: "Descargar Todo",
    settings: "Configuración",
    uploadDoc: "Subir Artículo (.docx)",
    uploadLogo: "Logo del Proyecto (PNG Transparente)",
    featuredSize: "Tamaño Portada",
    bodySize: "Tamaño Cuerpo",
    guidelines: "Pautas IA / Chat",
    guidelinesPlaceholder: "Ej., 'Usa estilo vector plano', 'Imágenes oscuras y serias'.",
    guidelinesHint: "Actualiza esto y regenera una imagen para cambiar su estilo.",
    generateBtn: "Generar Visuales",
    complete: "Generación Completa",
    startNew: "Nuevo Proyecto",
    reading: "Leyendo archivo DOCX...",
    analyzing: "Analizando contexto y planeando visuales...",
    generating: "Generando imágenes...",
    projectStats: "Estadísticas",
    featuredReady: "Portada Lista",
    inlineReady: "Imágenes del cuerpo listas",
    previewTitle: "Vista Previa",
    watermarkActive: "Marca de Agua Activa",
    noArticle: "Aún no hay artículo",
    noArticleDesc: "Sube un archivo DOCX para ver cómo la IA analiza tu contenido e inserta ilustraciones mágicamente.",
    width: "Ancho",
    height: "Alto",
    custom: "Personalizado",
    imageCount: "Imágenes en cuerpo",
    auto: "Auto (La IA decide)",
    // Card Actions
    regenerate: "Regenerar",
    download: "Descargar",
    refinePlaceholder: "Modificar esta imagen (ej., 'Agrega un gato')...",
    cancel: "Cancelar",
    submit: "Ir"
  }
};

const App: React.FC = () => {
  // Language Detection
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'es') setLanguage('es');
  }, []);

  const t = TRANSLATIONS[language];

  // Files
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Settings
  const [instructions, setInstructions] = useState<string>("");
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
      const plan = await analyzeTextAndPlanImages(post.paragraphs, instructions, language, inlineImageCount);
      
      // 3. Generate Images
      setStatus(ProcessingStatus.GENERATING_IMAGES);
      const newImages: GeneratedImage[] = [];

      // Execute Featured Image
      setStatusMessage(`${t.generating} (${plan.featuredImage.filename})`);
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
    // Combine instructions with prompt.
    // Logic: prompt + (global instructions)
    // NOTE: This helper is used by initial generation. 
    // For regeneration with SPECIFIC refinement, the prompt passed in includes the refinement.
    
    const finalPrompt = instructions 
      ? `${prompt}. Global Style Guidelines: ${instructions}`
      : prompt;

    let base64 = await generateImage(
      finalPrompt, 
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

      // Construct the prompt for this specific regeneration
      let activePrompt = image.prompt;
      if (refinement) {
        activePrompt = `${activePrompt}. Modification Requirement: ${refinement}`;
      }

      // Note: processImageGeneration will ALSO append the global instructions.
      // This is desired: (Base Prompt + Modification) + Global Style.
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
    const folder = zip.folder("blog-assets");

    generatedImages.forEach((img) => {
      const data = img.url.split(',')[1];
      if (folder) {
        folder.file(img.filename, data, { base64: true });
      }
    });

    const seoLog = generatedImages.map(img => 
      `--------------------------------------------------
File:   ${img.filename}
Type:   ${img.type}
Title:  ${img.title}
Alt:    ${img.altText}
Prompt: ${img.prompt}
--------------------------------------------------`
    ).join('\n');
    
    if(folder) folder.file("seo-metadata.txt", seoLog);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "blog-images-package.zip");
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
               <Wand2 className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">{t.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-medium">
               <button 
                 onClick={() => setLanguage('en')}
                 className={`px-3 py-1.5 rounded-md transition-colors ${language === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 EN
               </button>
               <button 
                 onClick={() => setLanguage('es')}
                 className={`px-3 py-1.5 rounded-md transition-colors ${language === 'es' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 ES
               </button>
            </div>

             {generatedImages.length > 0 && (
                <button 
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">{t.downloadAll}</span>
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Settings2 size={18} className="text-slate-500" />
              {t.settings}
            </h2>
            
            <div className="space-y-4">
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

              <div className="grid grid-cols-1 gap-4 pt-2">
                 {/* Count Selector */}
                 <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                     <Hash size={12} />
                     {t.imageCount}
                  </label>
                  <select
                    value={inlineImageCount}
                    onChange={(e) => setInlineImageCount(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value) as any)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                  >
                    <option value="auto">{t.auto}</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                 </div>

                {/* Featured Image Size Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t.featuredSize}</label>
                  <select 
                    value={featuredRatio}
                    onChange={(e) => setFeaturedRatio(e.target.value as AspectRatio)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                  >
                    <option value="16:9">16:9 (Wide)</option>
                    <option value="4:3">4:3 (Standard)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="9:16">9:16 (Story)</option>
                    <option value="custom">{t.custom}...</option>
                  </select>
                  {featuredRatio === 'custom' && (
                    <div className="flex gap-2 mt-2">
                      <div className="relative">
                        <input 
                          type="number" 
                          value={featuredDim.width}
                          onChange={(e) => setFeaturedDim({...featuredDim, width: parseInt(e.target.value)})}
                          className="w-full text-sm border border-slate-200 rounded-lg p-2 pl-6 outline-none"
                          placeholder="W"
                        />
                        <span className="absolute left-2 top-2 text-xs text-slate-400">W</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={featuredDim.height}
                          onChange={(e) => setFeaturedDim({...featuredDim, height: parseInt(e.target.value)})}
                          className="w-full text-sm border border-slate-200 rounded-lg p-2 pl-6 outline-none"
                          placeholder="H"
                        />
                         <span className="absolute left-2 top-2 text-xs text-slate-400">H</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Body Image Size Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t.bodySize}</label>
                  <select 
                    value={inlineRatio}
                    onChange={(e) => setInlineRatio(e.target.value as AspectRatio)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                  >
                     <option value="16:9">16:9 (Wide)</option>
                     <option value="4:3">4:3 (Standard)</option>
                     <option value="1:1">1:1 (Square)</option>
                     <option value="custom">{t.custom}...</option>
                  </select>
                  {inlineRatio === 'custom' && (
                    <div className="flex gap-2 mt-2">
                      <div className="relative">
                        <input 
                          type="number" 
                          value={inlineDim.width}
                          onChange={(e) => setInlineDim({...inlineDim, width: parseInt(e.target.value)})}
                          className="w-full text-sm border border-slate-200 rounded-lg p-2 pl-6 outline-none"
                          placeholder="W"
                        />
                        <span className="absolute left-2 top-2 text-xs text-slate-400">W</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={inlineDim.height}
                          onChange={(e) => setInlineDim({...inlineDim, height: parseInt(e.target.value)})}
                          className="w-full text-sm border border-slate-200 rounded-lg p-2 pl-6 outline-none"
                          placeholder="H"
                        />
                        <span className="absolute left-2 top-2 text-xs text-slate-400">H</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                  <MessageSquare size={12} />
                  {t.guidelines}
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder={t.guidelinesPlaceholder}
                  className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 h-24 resize-none placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {t.guidelinesHint}
                </p>
              </div>
            </div>

            {status === ProcessingStatus.IDLE || status === ProcessingStatus.ERROR ? (
              <button 
                onClick={processArticle}
                disabled={!docxFile}
                className={`w-full mt-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all ${
                  docxFile 
                    ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200' 
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {t.generateBtn}
              </button>
            ) : (
              <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
                 {status === ProcessingStatus.COMPLETED ? (
                   <>
                     <CheckCircle2 className="text-green-500 w-8 h-8" />
                     <span className="font-medium text-green-700">{t.complete}</span>
                     <button onClick={reset} className="text-xs text-indigo-600 underline mt-2">{t.startNew}</button>
                   </>
                 ) : (
                   <>
                     <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
                     <div className="text-sm font-medium text-indigo-900">{statusMessage}</div>
                   </>
                 )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {generatedImages.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="font-semibold text-slate-700 mb-3">{t.projectStats}</h3>
               <ul className="space-y-3">
                 <li className="flex items-center justify-between text-sm">
                   <span className="text-slate-500">Featured</span>
                   <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">{t.featuredReady}</span>
                 </li>
                 <li className="flex items-center justify-between text-sm">
                   <span className="text-slate-500">Inline</span>
                   <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                     {generatedImages.filter(i => i.type === 'inline').length} {t.inlineReady}
                   </span>
                 </li>
               </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
           {blogPost ? (
             <div className="animate-in fade-in duration-500">
               <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-semibold text-slate-800">{t.previewTitle}</h2>
                 {logoUrl && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">{t.watermarkActive}</span>}
               </div>
               
               <div className="relative">
                 {regeneratingId && (
                   <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-2xl">
                      <div className="bg-white shadow-xl p-4 rounded-full flex items-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600" />
                        <span className="font-medium text-slate-700">Regenerating...</span>
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
             <div className="h-full min-h-[400px] bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
               <div className="bg-slate-50 p-4 rounded-full mb-4">
                 <FileText size={32} className="text-slate-300" />
               </div>
               <p className="font-medium text-slate-500">{t.noArticle}</p>
               <p className="text-sm mt-2 max-w-md">{t.noArticleDesc}</p>
             </div>
           )}
        </div>

      </main>
    </div>
  );
};

export default App;