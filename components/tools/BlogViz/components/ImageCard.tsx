import React, { useState } from 'react';
import { Download, RefreshCw, X, Check, MessageSquarePlus } from 'lucide-react';
import { GeneratedImage } from '../types';
import saveAs from 'file-saver';

interface ImageCardProps {
  image: GeneratedImage;
  className?: string;
  onRegenerate?: (image: GeneratedImage, refinement?: string) => void;
  isRegenerating?: boolean;
  labels?: {
    regenerate: string;
    download: string;
    refinePlaceholder: string;
    cancel: string;
    submit: string;
  };
}

export const ImageCard: React.FC<ImageCardProps> = ({ 
  image, 
  className = "", 
  onRegenerate, 
  isRegenerating,
  labels = {
    regenerate: "Regenerate",
    download: "Download",
    refinePlaceholder: "Optional instructions (e.g., 'Make it blue')...",
    cancel: "Cancel",
    submit: "Go"
  }
}) => {
  const [showRefine, setShowRefine] = useState(false);
  const [refinement, setRefinement] = useState("");

  const handleDownload = () => {
    saveAs(image.url, image.filename);
  };

  const handleRegenerateClick = () => {
    if (showRefine) {
      setShowRefine(false);
    } else {
      setShowRefine(true);
    }
  };

  const handleSubmitRegeneration = () => {
    if (onRegenerate) {
      onRegenerate(image, refinement);
      setShowRefine(false);
      setRefinement("");
    }
  };

  return (
    <div className={`group relative rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white ${className}`}>
      <div className="relative">
        <img 
          src={image.url} 
          alt={image.altText} 
          title={image.title}
          className="w-full h-auto object-cover"
        />
        
        {/* Refinement Overlay */}
        {showRefine && (
          <div className="absolute inset-0 bg-white/95 z-20 p-4 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <MessageSquarePlus size={16} className="text-indigo-600"/>
              {labels.regenerate}
            </h4>
            <textarea
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder={labels.refinePlaceholder}
              className="w-full text-sm border border-slate-300 rounded-lg p-2 h-20 resize-none focus:ring-2 focus:ring-indigo-500 outline-none mb-3 text-slate-700 bg-slate-50"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowRefine(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                {labels.cancel}
              </button>
              <button 
                onClick={handleSubmitRegeneration}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors flex items-center gap-1"
              >
                {labels.submit} <Check size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Action Overlay (Hidden when refining) */}
        {!showRefine && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
            <div className="flex justify-between items-start">
              <div className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                {image.type === 'featured' ? 'Featured' : 'Inline'}
              </div>
              
              {onRegenerate && (
                <button 
                  onClick={handleRegenerateClick}
                  disabled={isRegenerating}
                  className="p-2 bg-white/90 text-indigo-600 rounded-lg hover:bg-white transition-colors shadow-lg disabled:opacity-50"
                  title={labels.regenerate}
                >
                  <RefreshCw size={16} className={isRegenerating ? "animate-spin" : ""} />
                </button>
              )}
            </div>
            
            <div className="flex items-end justify-between gap-2">
              <p className="text-white text-xs line-clamp-2 flex-1 font-light opacity-90">
                {image.prompt}
              </p>
              <button 
                onClick={handleDownload}
                className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors shadow-lg"
                title={labels.download}
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEO Info Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs space-y-1">
        <div className="flex gap-2">
          <span className="font-semibold text-slate-500 min-w-[40px]">Title:</span>
          <span className="text-slate-700 truncate">{image.title}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold text-slate-500 min-w-[40px]">Alt:</span>
          <span className="text-slate-700 truncate">{image.altText}</span>
        </div>
         <div className="flex gap-2">
          <span className="font-semibold text-slate-500 min-w-[40px]">File:</span>
          <span className="text-slate-500 italic truncate">{image.filename}</span>
        </div>
      </div>
    </div>
  );
};