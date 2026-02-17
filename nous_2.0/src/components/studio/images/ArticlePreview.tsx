"use client";

import React from 'react';
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

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-slate-100/50 my-8">
            {/* Header / Featured Image */}
            <div className="relative w-full bg-slate-50 min-h-[200px] flex items-center justify-center">
                {featuredImage ? (
                    <div className="w-full">
                        <ImageCard image={featuredImage} onRegenerate={onRegenerate} labels={labels} />
                    </div>
                ) : (
                    <div className="text-slate-300 text-[10px] py-12 font-black uppercase tracking-widest">Área de Portada</div>
                )}
            </div>

            <div className="p-10 md:p-16">
                <h1 className="text-4xl font-black text-slate-900 mb-12 tracking-tighter uppercase italic drop-shadow-sm">Vista Previa del Artículo</h1>
                {blogPost.paragraphs.map((paragraph, index) => {
                    // Check if there's an image scheduled AFTER this paragraph
                    const imagesForThisSlot = inlineImages.filter(img => img.paragraphIndex === index);

                    return (
                        <React.Fragment key={index}>
                            <p className="text-slate-600 leading-relaxed mb-8 text-lg font-medium tracking-tight">
                                {paragraph}
                            </p>

                            {/* Insert Image if it belongs here */}
                            {imagesForThisSlot.map(img => (
                                <div key={img.id} className="my-12">
                                    <ImageCard image={img} onRegenerate={onRegenerate} labels={labels} />
                                </div>
                            ))}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
