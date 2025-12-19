import React, { useState, useEffect } from 'react';
import { SITE_CONFIG } from '../../constants';
import { motion, AnimatePresence } from 'framer-motion';
import AuthButton from '../auth/AuthButton';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldBeScrolled = window.scrollY > 250;
          setIsScrolled(prev => {
            if (prev !== shouldBeScrolled) return shouldBeScrolled;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`absolute top-0 left-0 w-full z-50 transition-all duration-700 ease-[0.22,1,0.36,1] ${isScrolled
        ? 'py-4 bg-brand-white/95 backdrop-blur-md border-b border-brand-power/5 shadow-sm'
        : 'py-8 bg-transparent'
        }`}
    >
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 flex justify-between items-center">

        <div className="relative h-[30px] w-[450px] overflow-hidden flex items-center">
          <AnimatePresence mode="wait">
            {!isScrolled ? (
              <motion.a
                key="author"
                href="#"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 font-bold tracking-tight text-lg text-brand-power whitespace-nowrap"
              >
                {SITE_CONFIG.author}
              </motion.a>
            ) : (
              <motion.div
                key="title"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 flex items-baseline gap-3"
              >
                <h1 className="text-lg font-extrabold text-brand-power tracking-tight leading-none whitespace-nowrap">
                  ESTRATEGIA CLARA, REALISTA Y POTENTE
                </h1>
                <span className="text-xs text-brand-power/40 font-mono hidden lg:inline-block">
                  by {SITE_CONFIG.author}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <AuthButton />
        </div>

      </div>
    </header>
  );
};

export default Header;