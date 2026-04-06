import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PreloaderProps {
  onComplete: () => void;
}

const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulating system check / asset loading
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        // Non-linear progress for organic feel
        const increment = Math.random() * 15; 
        return Math.min(prev + increment, 100);
      });
    }, 150);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const timeout = setTimeout(onComplete, 800); // Slight delay at 100% for impact
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-white pointer-events-none"
      exit={{ y: "-100%", transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } }}
    >
      <div className="w-64 relative">
        {/* Minimalist Progress Number */}
        <motion.div 
            className="text-8xl md:text-9xl font-bold text-brand-power tracking-tighter text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {Math.floor(progress)}%
        </motion.div>
        
        {/* Technical Label */}
        <div className="flex justify-between mt-4 text-xs font-mono uppercase tracking-widest text-brand-power/40">
            <span>Cargando</span>
            <span>2025</span>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full h-px bg-brand-power/10 mt-4 overflow-hidden">
            <motion.div 
                className="h-full bg-brand-power"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
            />
        </div>
      </div>
    </motion.div>
  );
};

export default Preloader;