
"use client";

import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { BlogPost, GeneratedImage } from '@/types/images';
import { ImageCard } from './ImageCard';

interface ArticlePreviewProps {
    blogPost: BlogPost;
    generatedImages: GeneratedImage[];
    onRegenerate?: (img: GeneratedImage, refinement?: string) => void;
    labels?: {
        regenerate: string;
        download: string;
        refinePlaceholder: string;
        cancel: string;
        submit: string;
    };
}

export const ArticlePreview: React.FC<ArticlePreviewProps> = ({ blogPost, generatedImages, onRegenerate, labels }) => {

    const featuredImage = generatedImages.find(img => img.type === 'featured');
    const inlineImages = generatedImages.filter(img => img.type === 'inline');

    // Default labels if not provided
    const textLabels = labels || {
        regenerate: "Regenerar",
        download: "Descargar",
        refinePlaceholder: "Refinar imagen...",
        cancel: "Cancelar",
        submit: "Actualizar"
    };

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-slate-100/50 my-8">
            {/* Header / Featured Image */}
            <div className={`relative w-full min-h-[400px] flex items-center justify-center transition-all bg-slate-50`}>
                {featuredImage ? (
                    <div className="w-full h-full">
                        <ImageCard image={featuredImage} onRegenerate={onRegenerate} labels={textLabels} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                        <div className="w-20 h-1 bg-slate-200 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Área de Portada</span>
                        <div className="w-10 h-1 bg-slate-100 rounded-full" />
                    </div>
                )}
            </div>

            <div className="p-10 md:p-20">
                <div className="space-y-12">
                   {blogPost.paragraphs.map((paragraph, index) => {
                        // Check if there's an image scheduled AFTER this paragraph
                        const imagesForThisSlot = inlineImages.filter(img => img.paragraphIndex === index);

                        return (
                            <React.Fragment key={index}>
                                <div 
                                    className="text-slate-600 leading-[1.8] text-xl font-medium tracking-tight prose prose-slate max-w-none"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraph) }}
                                />

                                {/* Insert Image if it belongs here */}
                                {imagesForThisSlot.length > 0 && (
                                    <div className="space-y-8 my-16">
                                        {imagesForThisSlot.map(img => (
                                            <div key={img.id} className="relative group">
                                                <ImageCard image={img} onRegenerate={onRegenerate} labels={textLabels} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
