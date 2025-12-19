import React from 'react';
import { motion } from 'framer-motion';
import { ANIMATION_CONFIG } from '../../constants';

interface SectionHeadingProps {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
  light?: boolean; // If true, uses light text for dark backgrounds
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({
  number,
  eyebrow,
  title,
  description,
  light = false,
  align = 'left',
  className = ''
}) => {
  const textColor = light ? 'text-brand-white' : 'text-brand-power';
  const accentColor = light ? 'text-brand-white/60' : 'text-brand-accent';
  
  return (
    <div className={`flex flex-col ${align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left'} ${className}`}>
      
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={ANIMATION_CONFIG.viewport}
        transition={ANIMATION_CONFIG.transition}
      >
        <span className={`${accentColor} font-mono text-xs uppercase tracking-[0.2em] mb-4 block`}>
          {number} — {eyebrow}
        </span>
      </motion.div>

      <motion.h2
        className={`text-5xl md:text-7xl font-bold ${textColor} mb-8 tracking-tighter leading-none`}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={ANIMATION_CONFIG.viewport}
        transition={{ ...ANIMATION_CONFIG.transition, delay: 0.1 }}
      >
        {title}
      </motion.h2>

      {description && (
        <motion.p
          className={`text-xl ${light ? 'text-brand-white/70' : 'text-brand-power/60'} font-light leading-relaxed max-w-lg`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={ANIMATION_CONFIG.viewport}
          transition={{ ...ANIMATION_CONFIG.transition, delay: 0.2 }}
        >
          {description}
        </motion.p>
      )}

      <motion.div 
        className={`mt-12 h-px w-24 ${light ? 'bg-brand-white/20' : 'bg-brand-power/10'}`}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={ANIMATION_CONFIG.viewport}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        style={{ originX: align === 'right' ? 1 : 0 }} // Expands from correct side
      />
    </div>
  );
};

export default SectionHeading;