import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_ITEMS, SITE_CONFIG } from '../../constants';

interface OverlayNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

const OverlayNavigation: React.FC<OverlayNavigationProps> = ({ isOpen, onClose }) => {
  // Cinematic Curtain Animation
  const menuVariants = {
    closed: {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1], // Custom Ease "Premium"
      }
    },
    open: {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }
    }
  };

  const containerVariants = {
    closed: { opacity: 0 },
    open: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    closed: { opacity: 0, y: 50, rotate: 5 },
    open: { opacity: 1, y: 0, rotate: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="closed"
          animate="open"
          exit="closed"
          variants={menuVariants}
          className="fixed inset-0 bg-brand-power z-[60] flex flex-col justify-center px-6 md:px-20 overflow-hidden"
        >
          {/* Background Texture for Depth */}
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-brand-accent/5 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

          <div className="max-w-screen-xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">

            {/* Navigation Links */}
            <motion.div variants={containerVariants} className="flex flex-col space-y-6">
              <motion.div variants={itemVariants} className="text-brand-white/40 font-mono text-xs uppercase tracking-widest mb-8">
                Mapa del Sitio
              </motion.div>

              {NAV_ITEMS.map((item, idx) => (
                <motion.a
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  variants={itemVariants}
                  className="text-5xl md:text-7xl font-bold text-transparent text-stroke-light hover:text-brand-white transition-colors duration-500 tracking-tighter"
                  style={{ WebkitTextStroke: "1px rgba(255,255,255,0.3)" }}
                  whileHover={{ x: 20 }}
                >
                  <span className="text-brand-accent text-lg align-top mr-4 font-mono font-normal">0{idx + 1}</span>
                  {item.label}
                </motion.a>
              ))}
            </motion.div>

            {/* Contact & Extra Info (Hidden on small mobile if needed, visible on desktop overlay) */}
            <motion.div
              variants={containerVariants}
              className="flex flex-col justify-end border-t border-brand-white/10 pt-10 md:border-t-0 md:pt-0"
            >
              <motion.div variants={itemVariants}>
                <h4 className="text-brand-white font-bold text-2xl mb-2">Contacto</h4>
                <a href={`mailto:${SITE_CONFIG.contactEmail}`} className="text-brand-accent text-xl font-light hover:text-brand-white transition-colors">
                  {SITE_CONFIG.contactEmail}
                </a>
              </motion.div>

              <motion.div variants={itemVariants} className="mt-12 flex gap-8">
                {/* Social links removed per User Request */}
              </motion.div>
            </motion.div>
          </div>

          {/* Close Button (Large/Accessible) */}
          <button
            onClick={onClose}
            className="absolute top-8 right-8 md:top-12 md:right-12 group flex items-center gap-4 text-brand-white"
          >
            <span className="hidden md:block font-mono text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Cerrar</span>
            <div className="w-12 h-12 rounded-full border border-brand-white/20 flex items-center justify-center group-hover:bg-brand-white group-hover:text-brand-power transition-all duration-300">
              <span className="text-xl">✕</span>
            </div>
          </button>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OverlayNavigation;