import React from 'react';
import { motion } from 'framer-motion';
import { ANIMATION_CONFIG } from '../../constants';

interface WireframeBoxProps {
  label: string;
  aspectRatio?: string;
}

const WireframeBox: React.FC<WireframeBoxProps> = ({ label, aspectRatio = "aspect-[4/3]" }) => {
  return (
    <motion.div 
        className={`${aspectRatio} w-full border border-dashed border-brand-power/10 bg-brand-soft/30 flex items-center justify-center relative overflow-hidden group`}
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={ANIMATION_CONFIG.viewport}
        transition={ANIMATION_CONFIG.transition}
    >
        {/* Soft gradient background representing "Pureza de Pastel" */}
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-white/0 to-brand-white/60"></div>
        
        {/* Interaction hint */}
        <motion.div 
            className="absolute inset-0 bg-brand-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        />

        <div className="relative z-10 text-center p-6">
            <div className="w-12 h-12 border border-brand-power/20 rounded-full mx-auto mb-4 flex items-center justify-center text-brand-power/40">
                <span className="text-xl">+</span>
            </div>
            <p className="text-brand-power/40 font-mono text-xs uppercase tracking-widest">
                {label}
            </p>
        </div>
    </motion.div>
  );
};

export default WireframeBox;