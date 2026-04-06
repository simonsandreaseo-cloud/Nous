import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  fallbackSrc = 'https://via.placeholder.com/800x1000/1C1C1C/FFFFFF?text=Simón+Sandrea',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-brand-power/5 ${className}`}>
      {/* Skeleton / Blur Placeholder */}
      <motion.div 
        className="absolute inset-0 bg-brand-power/10 z-0"
        animate={{ opacity: isLoaded ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      />
      
      <motion.img
        src={hasError ? fallbackSrc : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`relative z-10 w-full h-full object-cover transition-all duration-700 ${className}`}
        initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
        animate={{ 
          opacity: isLoaded ? 1 : 0, 
          scale: isLoaded ? 1 : 1.05,
          filter: isLoaded ? 'blur(0px)' : 'blur(10px)'
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;