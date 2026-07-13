'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Settings, Check, Loader2, Download, 
    FolderArchive, FileCode, Info, HelpCircle, 
    ToggleLeft, ToggleRight, AlertCircle
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { getCoverImage } from '@/components/contents/writer/NousAssetNodeView';
import { LinkPatcherService } from '@/lib/services/link-patcher';

interface ZipExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    draftId: string | null;
}

export default function ZipExportModal({ isOpen, onClose, draftId }: ZipExportModalProps) {
    const { taskImages, keyword, strategyH1, content } = useWriterStore() as any;
    const { activeProject } = useProjectStore();
    
    // UI states
    const [format, setFormat] = useState<'zip' | 'html'>('zip');
    const [exportMode, setExportMode] = useState<'full' | 'embedded'>('full');
    const [includeH1, setIncludeH1] = useState(true);
    const [includeCover, setIncludeCover] = useState(true);
    const [includeBodyImages, setIncludeBodyImages] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // Progress states
    const [isExporting, setIsExporting] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Reset states on open/close
    useEffect(() => {
        if (isOpen) {
            setSuccessMessage('');
            setErrorMessage('');
            setStatusMessage('');
            setIsExporting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getCleanFilename = (text: string) => {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric characters with hyphens
            .replace(/(^-|-$)+/g, ""); // trim trailing and leading hyphens
    };

    const handleExport = async () => {
        if (isExporting) return;
        setIsExporting(true);
        setErrorMessage('');
        setSuccessMessage('');
        setStatusMessage('📦 Iniciando procesamiento...');

        try {
            const titleText = strategyH1 || keyword || "articulo-nous";
            const cleanSlug = getCleanFilename(titleText) || "articulo";

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
                    // Check if user turned off body images
                    if (!includeBodyImages) {
                        asset.parentNode?.removeChild(asset);
                        return;
                    }

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
                    img.className = 'rounded-[2rem] shadow-2xl border border-slate-200/60 max-w-full hover:scale-[1.01] transition-transform duration-500';
                    img.style.width = width;
                    img.style.height = 'auto';

                    figure.appendChild(img);

                    if (titleTextAttr) {
                        const figcaption = document.createElement('figcaption');
                        figcaption.className = 'mt-4 text-center text-sm text-slate-400 font-medium italic';
                        figcaption.textContent = titleTextAttr;
                        figure.appendChild(figcaption);
                    }

                    asset.parentNode?.replaceChild(figure, asset);
                } else if (statusAttr === 'pending') {
                    asset.parentNode?.removeChild(asset);
                }
            });

            // Strip normal images if includeBodyImages is disabled
            const images = tempDiv.querySelectorAll('img:not(figure img)');
            images.forEach((img) => {
                if (!includeBodyImages) {
                    // Check if it is a normal body image, remove if disabled
                    img.parentNode?.removeChild(img);
                } else if (!img.className) {
                    img.className = 'rounded-[2rem] shadow-2xl border border-slate-200/60 max-w-full my-12 mx-auto block';
                }
            });

            // Find cover/featured image
            const featured = getCoverImage(taskImages.find((img: any) => img.type === 'hero' || img.type === 'featured'));
            
            // Get active patchers for export
            const zipExportPatchers = LinkPatcherService.getPatchersForProcess(activeProject, 'zip_export');

            if (format === 'zip') {
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();
                
                const imageDownloads: { url: string; localPath: string; element?: HTMLImageElement }[] = [];
                const seenUrls = new Set<string>();

                // Add cover hero image task if cover is enabled and exists
                if (includeCover && featured && featured.url) {
                    const originalUrl = featured.url;
                    const urlParts = originalUrl.split('/');
                    const rawFilename = urlParts[urlParts.length - 1];
                    const extension = rawFilename.split('.').pop() || 'webp';
                    // Cover sits in ZIP root: portada-[cleanSlug].webp
                    const localPath = `portada-${cleanSlug}.${extension}`;
                    
                    imageDownloads.push({ url: originalUrl, localPath });
                    seenUrls.add(originalUrl);
                }

                // Add body image tasks if enabled
                if (includeBodyImages) {
                    const allImgElements = Array.from(tempDiv.querySelectorAll('img'));
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
                            
                            let finalSrc = localPath;
                            if (zipExportPatchers.length > 0) {
                                let pUrl = originalUrl;
                                zipExportPatchers.forEach(p => pUrl = LinkPatcherService.patchUrl(pUrl, p.config?.rules || []));
                                if (pUrl !== originalUrl) {
                                    finalSrc = pUrl;
                                }
                            }
                            
                            // Replace remote src with relative local path inside ZIP HTML or patched URL
                            img.setAttribute('src', finalSrc);
                        }
                    });
                }

                // Patch <a> links inside the ZIP HTML
                if (zipExportPatchers.length > 0) {
                    const links = tempDiv.querySelectorAll('a');
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('http')) {
                            let pUrl = href;
                            zipExportPatchers.forEach(p => pUrl = LinkPatcherService.patchUrl(pUrl, p.config?.rules || []));
                            if (pUrl !== href) {
                                link.setAttribute('href', pUrl);
                            }
                        }
                    });
                }

                // Download images concurrently
                if (imageDownloads.length > 0) {
                    setStatusMessage(`📥 Descargando ${imageDownloads.length} imágenes...`);
                    
                    const fetchPromises = imageDownloads.map(async (item) => {
                        try {
                            const response = await fetch(item.url, { mode: 'cors' });
                            if (!response.ok) throw new Error(`HTTP ${response.status}`);
                            const blob = await response.blob();
                            zip.file(item.localPath, blob);
                        } catch (err) {
                            console.error(`Error downloading image for ZIP: ${item.url}`, err);
                            // Fallback to remote URL in HTML if download fails
                            if (item.element) {
                                item.element.setAttribute('src', item.url);
                            }
                        }
                    });

                    await Promise.all(fetchPromises);
                }

                // Compile HTML content
                const processedHtml = tempDiv.innerHTML;
                let finalHeroPath = (includeCover && featured && featured.url && seenUrls.has(featured.url))
                    ? imageDownloads.find(d => d.url === featured.url)?.localPath
                    : '';
                
                if (finalHeroPath && zipExportPatchers.length > 0 && featured?.url) {
                    let pUrl = featured.url;
                    zipExportPatchers.forEach(p => pUrl = LinkPatcherService.patchUrl(pUrl, p.config?.rules || []));
                    if (pUrl !== featured.url) {
                        finalHeroPath = pUrl;
                    }
                }

                let heroHtml = '';
                if (finalHeroPath) {
                    heroHtml = `
                    <header class="mb-10">
                        <div class="relative w-full aspect-[21/9] overflow-hidden rounded-[2.5rem] bg-slate-50 border border-slate-200/40 shadow-2xl mb-8">
                            <img src="${finalHeroPath}" alt="${featured?.alt_text || ''}" class="w-full h-full object-cover" />
                        </div>
                        ${includeH1 ? `<h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 font-title">${titleText}</h1>\n<div class="w-20 h-1 bg-indigo-500 rounded-full"></div>` : ''}
                    </header>`;
                } else if (includeH1) {
                    heroHtml = `
                    <header class="mb-10">
                        <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 font-title">${titleText}</h1>
                        <div class="w-20 h-1 bg-indigo-500 rounded-full"></div>
                    </header>`;
                }

                let finalOutput = '';
                if (exportMode === 'full') {
                    finalOutput = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleText}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Plus Jakarta Sans', 'sans-serif'],
                        title: ['Outfit', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
        }
        h1, h2, h3, h4, h5, h6 {
            font-family: 'Outfit', sans-serif !important;
        }
    </style>
</head>
<body class="antialiased selection:bg-indigo-500 selection:text-white leading-relaxed">
    <main class="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 bg-white md:my-12 md:rounded-[3rem] md:shadow-2xl/10 border border-slate-100/50">
        ${heroHtml}
        <article class="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-[2rem] prose-img:shadow-2xl">
            ${processedHtml}
        </article>
    </main>
</body>
</html>`;
                } else {
                    finalOutput = `
<style>
    .nous-embedded-container {
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #1e293b;
        line-height: 1.8;
    }
    .nous-embedded-container h1, .nous-embedded-container h2, .nous-embedded-container h3, .nous-embedded-container h4, .nous-embedded-container h5, .nous-embedded-container h6 {
        font-family: 'Outfit', sans-serif !important;
    }
    .nous-embedded-container .prose-img {
        border-radius: 2rem;
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    }
</style>
<div class="nous-embedded-container prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-[2rem] prose-img:shadow-2xl">
    ${heroHtml}
    ${processedHtml}
</div>`;
                }

                zip.file(`${cleanSlug}.html`, finalOutput);
                
                setStatusMessage('📦 Creando empaquetado comprimido...');
                const zipBlob = await zip.generateAsync({ type: "blob" });
                saveAs(zipBlob, `${cleanSlug}.zip`);


            } else {
                // HTML Puro Format (images point to remote cloud urls)
                setStatusMessage('📄 Compilando HTML Puro...');
                
                // Patch <a> and <img> links for pure HTML export if patchers are active
                if (zipExportPatchers.length > 0) {
                    const allImgs = tempDiv.querySelectorAll('img');
                    allImgs.forEach(img => {
                        const src = img.getAttribute('src');
                        if (src && src.startsWith('http')) {
                            let pUrl = src;
                            zipExportPatchers.forEach(p => pUrl = LinkPatcherService.patchUrl(pUrl, p.config?.rules || []));
                            if (pUrl !== src) {
                                img.setAttribute('src', pUrl);
                            }
                        }
                    });

                    const allLinks = tempDiv.querySelectorAll('a');
                    allLinks.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('http')) {
                            let pUrl = href;
                            zipExportPatchers.forEach(p => pUrl = LinkPatcherService.patchUrl(pUrl, p.config?.rules || []));
                            if (pUrl !== href) {
                                link.setAttribute('href', pUrl);
                            }
                        }
                    });
                }

                const processedHtml = tempDiv.innerHTML;
                let finalHeroPath = (includeCover && featured && featured.url) ? featured.url : '';

                if (finalHeroPath && zipExportPatchers.length > 0) {
                    let pUrl = finalHeroPath;
                    zipExportPatchers.forEach(p => pUrl = LinkPatcherService.patchUrl(pUrl, p.config?.rules || []));
                    if (pUrl !== finalHeroPath) {
                        finalHeroPath = pUrl;
                    }
                }

                let heroHtml = '';
                if (finalHeroPath) {
                    heroHtml = `
                    <header class="mb-10">
                        <div class="relative w-full aspect-[21/9] overflow-hidden rounded-[2.5rem] bg-slate-50 border border-slate-200/40 shadow-2xl mb-8">
                            <img src="${finalHeroPath}" alt="${featured?.alt_text || ''}" class="w-full h-full object-cover" />
                        </div>
                        ${includeH1 ? `<h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 font-title">${titleText}</h1>\n<div class="w-20 h-1 bg-indigo-500 rounded-full"></div>` : ''}
                    </header>`;
                } else if (includeH1) {
                    heroHtml = `
                    <header class="mb-10">
                        <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 font-title">${titleText}</h1>
                        <div class="w-20 h-1 bg-indigo-500 rounded-full"></div>
                    </header>`;
                }

                let finalOutput = '';
                if (exportMode === 'full') {
                    finalOutput = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleText}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Plus Jakarta Sans', 'sans-serif'],
                        title: ['Outfit', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
        }
        h1, h2, h3, h4, h5, h6 {
            font-family: 'Outfit', sans-serif !important;
        }
    </style>
</head>
<body class="antialiased selection:bg-indigo-500 selection:text-white leading-relaxed">
    <main class="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 bg-white md:my-12 md:rounded-[3rem] md:shadow-2xl/10 border border-slate-100/50">
        ${heroHtml}
        <article class="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-[2rem] prose-img:shadow-2xl">
            ${processedHtml}
        </article>
    </main>
</body>
</html>`;
                } else {
                    finalOutput = `
<style>
    .nous-embedded-container {
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #1e293b;
        line-height: 1.8;
    }
    .nous-embedded-container h1, .nous-embedded-container h2, .nous-embedded-container h3, .nous-embedded-container h4, .nous-embedded-container h5, .nous-embedded-container h6 {
        font-family: 'Outfit', sans-serif !important;
    }
    .nous-embedded-container .prose-img {
        border-radius: 2rem;
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    }
</style>
<div class="nous-embedded-container prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-[2rem] prose-img:shadow-2xl">
    ${heroHtml}
    ${processedHtml}
</div>`;
                }

                const htmlBlob = new Blob([finalOutput], { type: 'text/html;charset=utf-8' });
                saveAs(htmlBlob, `${cleanSlug}.html`);

            }

            setSuccessMessage('¡Exportación completada de forma magistral, hermano!');
            setStatusMessage('');
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (error: any) {
            console.error('Error in ZipExportModal export:', error);
            setErrorMessage(error.message || 'Fallo inesperado al empaquetar el contenido');
            setStatusMessage('');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop glassmorphic */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/65 backdrop-blur-[6px]"
                />

                {/* Modal box */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-3xl z-10 flex flex-col"
                >
                    {/* Upper decorative color bar */}
                    <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                    {/* Header */}
                    <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                                <FolderArchive size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight font-title">Exportar Contenido</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Centro de Empaquetado Premium</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-50 active:scale-95 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[60vh]">
                        {/* Selector de Formato */}
                        <div className="space-y-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Elegí Formato de Salida</span>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Formato ZIP */}
                                <div 
                                    onClick={() => !isExporting && setFormat('zip')}
                                    className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-3 group ${
                                        format === 'zip' 
                                            ? 'border-indigo-600 bg-indigo-50/25 shadow-xl shadow-indigo-500/5' 
                                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/40'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                        format === 'zip' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 group-hover:bg-slate-100'
                                    }`}>
                                        <FolderArchive size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">ZIP Portable</h4>
                                        <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">HTML autónomo + carpeta física con tus imágenes optimizadas.</p>
                                    </div>
                                    {format === 'zip' && (
                                        <div className="absolute top-4 right-4 text-indigo-600">
                                            <Check size={16} className="stroke-[3]" />
                                        </div>
                                    )}
                                </div>

                                {/* Formato HTML Puro */}
                                <div 
                                    onClick={() => !isExporting && setFormat('html')}
                                    className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-3 group ${
                                        format === 'html' 
                                            ? 'border-indigo-600 bg-indigo-50/25 shadow-xl shadow-indigo-500/5' 
                                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/40'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                        format === 'html' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 group-hover:bg-slate-100'
                                    }`}>
                                        <FileCode size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">HTML Puro</h4>
                                        <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">Archivo HTML directo con las imágenes apuntando a URLs remotas.</p>
                                    </div>
                                    {format === 'html' && (
                                        <div className="absolute top-4 right-4 text-indigo-600">
                                            <Check size={16} className="stroke-[3]" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tuerquita / Sección Avanzada Header */}
                        <div 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-between py-3 border-t border-b border-slate-100 cursor-pointer group hover:bg-slate-50/50 px-2 rounded-xl transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Settings size={14} className={`text-slate-400 group-hover:text-slate-700 transition-colors ${showAdvanced && 'animate-spin'}`} />
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors">Ajustes Avanzados</span>
                            </div>
                            <span className="text-[10px] text-indigo-500 font-black uppercase tracking-wider group-hover:underline">
                                {showAdvanced ? 'Ocultar' : 'Configurar'}
                            </span>
                        </div>

                        {/* Switches Avanzados de Configuración */}
                        <AnimatePresence>
                            {showAdvanced && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-4 overflow-hidden"
                                >
                                     {/* Switch: Modo de Exportación */}
                                     <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 border border-slate-100/30">
                                         <div className="space-y-0.5">
                                             <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Modo de Código</span>
                                             <p className="text-[9px] text-slate-400 font-medium max-w-sm leading-normal">
                                                 {exportMode === 'full' 
                                                     ? 'HTML Completo: Incluye estructura de documento, scripts de Tailwind y fuentes.' 
                                                     : 'Código Incrustado: Solo estilos y contenido, ideal para CMS (WordPress, Ghost, etc.).'}
                                             </p>
                                         </div>
                                         <button 
                                             disabled={isExporting}
                                             onClick={() => setExportMode(exportMode === 'full' ? 'embedded' : 'full')}
                                             className={`transition-colors p-1 rounded-full ${exportMode === 'full' ? 'text-indigo-600' : 'text-slate-300'}`}
                                         >
                                             {exportMode === 'full' ? <ToggleRight size={28} className="stroke-[1.5]" /> : <ToggleLeft size={28} className="stroke-[1.5]" />}
                                         </button>
                                     </div>

                                     {/* Switch: Incluir Título como H1 */}
                                     <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 border border-slate-100/30">
                                        <div className="space-y-0.5">
                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Incluir Título como H1</span>
                                            <p className="text-[9px] text-slate-400 font-medium max-w-sm leading-normal">Inserta una cabecera h1 estilizada al inicio del documento HTML.</p>
                                        </div>
                                        <button 
                                            disabled={isExporting}
                                            onClick={() => setIncludeH1(!includeH1)}
                                            className={`transition-colors p-1 rounded-full ${includeH1 ? 'text-indigo-600' : 'text-slate-300'}`}
                                        >
                                            {includeH1 ? <ToggleRight size={28} className="stroke-[1.5]" /> : <ToggleLeft size={28} className="stroke-[1.5]" />}
                                        </button>
                                    </div>

                                    {/* Switch: Incluir Portada */}
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 border border-slate-100/30">
                                        <div className="space-y-0.5">
                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Incluir Imagen de Portada</span>
                                            <p className="text-[9px] text-slate-400 font-medium max-w-sm leading-normal">Incorpora la imagen de portada y su maquetación al inicio del HTML.</p>
                                        </div>
                                        <button 
                                            disabled={isExporting}
                                            onClick={() => setIncludeCover(!includeCover)}
                                            className={`transition-colors p-1 rounded-full ${includeCover ? 'text-indigo-600' : 'text-slate-300'}`}
                                        >
                                            {includeCover ? <ToggleRight size={28} className="stroke-[1.5]" /> : <ToggleLeft size={28} className="stroke-[1.5]" />}
                                        </button>
                                    </div>

                                    {/* Switch: Incluir Imágenes del Cuerpo */}
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 border border-slate-100/30">
                                        <div className="space-y-0.5">
                                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Incluir Imágenes del Cuerpo</span>
                                            <p className="text-[9px] text-slate-400 font-medium max-w-sm leading-normal">Mantiene y procesa las imágenes incrustadas en el editor.</p>
                                        </div>
                                        <button 
                                            disabled={isExporting}
                                            onClick={() => setIncludeBodyImages(!includeBodyImages)}
                                            className={`transition-colors p-1 rounded-full ${includeBodyImages ? 'text-indigo-600' : 'text-slate-300'}`}
                                        >
                                            {includeBodyImages ? <ToggleRight size={28} className="stroke-[1.5]" /> : <ToggleLeft size={28} className="stroke-[1.5]" />}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Status Messages Box */}
                        {statusMessage && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/30 text-indigo-600 animate-pulse">
                                <Loader2 className="animate-spin flex-shrink-0" size={16} />
                                <span className="text-xs font-black uppercase tracking-wider">{statusMessage}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100/30 text-emerald-600">
                                <Check size={16} className="stroke-[3] flex-shrink-0" />
                                <span className="text-xs font-black uppercase tracking-wider">{successMessage}</span>
                            </div>
                        )}

                        {errorMessage && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50/40 border border-rose-100/30 text-rose-600">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                <span className="text-xs font-black uppercase tracking-wider">{errorMessage}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer / Trigger */}
                    <div className="px-8 pb-8 pt-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button 
                            disabled={isExporting}
                            onClick={onClose}
                            className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-500 font-black uppercase tracking-wider hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all text-[11px]"
                        >
                            Cancelar
                        </button>
                        <button 
                            disabled={isExporting}
                            onClick={handleExport}
                            className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-wider hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 active:scale-95 transition-all text-[11px] flex items-center gap-2"
                        >
                            {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                            {isExporting ? 'Procesando...' : 'Descargar Ahora'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
