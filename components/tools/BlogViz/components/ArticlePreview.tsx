import React from 'react';
import { BlogPost, GeneratedImage } from '../types';
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
    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl overflow-hidden border border-slate-100 my-8">
      {/* Header / Featured Image */}
      <div className="relative w-full bg-slate-100 min-h-[200px] flex items-center justify-center">
        {featuredImage ? (
          <div className="w-full">
             <ImageCard image={featuredImage} onRegenerate={onRegenerate} labels={labels} />
          </div>
        ) : (
          <div className="text-slate-400 text-sm py-12">Featured Image Area</div>
        )}
      </div>

      <div className="p-8 md:p-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Article Preview</h1>
        {blogPost.paragraphs.map((paragraph, index) => {
          // Check if there's an image scheduled AFTER this paragraph
          const imagesForThisSlot = inlineImages.filter(img => img.paragraphIndex === index);

          return (
            <React.Fragment key={index}>
              <p className="text-slate-700 leading-relaxed mb-6 text-lg">
                {paragraph}
              </p>
              
              {/* Insert Image if it belongs here */}
              {imagesForThisSlot.map(img => (
                <div key={img.id} className="my-8">
                  <ImageCard image={img} onRegenerate={onRegenerate} labels={labels} />
                  <div className="mt-2 flex flex-col items-center">
                     <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Filename: {img.filename}</p>
                  </div>
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};