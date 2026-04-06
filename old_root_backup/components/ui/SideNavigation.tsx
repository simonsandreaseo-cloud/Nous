import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from '../../constants';

const SideNavigation: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Performance: Use IntersectionObserver instead of scroll event listeners
    // to avoid layout thrashing and main thread blocking.
    const observerOptions = {
      root: null,
      rootMargin: '-45% 0px -45% 0px', // Active when element is in the middle 10% of screen
      threshold: 0
    };

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    // Observe all sections defined in NAV_ITEMS
    NAV_ITEMS.forEach(item => {
      const sectionId = item.href.substring(1);
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <nav className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-6" aria-label="Navegación de sección">
      {NAV_ITEMS.map((item) => {
        const isActive = activeId === item.href.substring(1);
        
        return (
          <a
            key={item.id}
            href={item.href}
            className="group flex items-center justify-end relative pl-8 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-full"
            aria-label={`Ir a sección ${item.label}`}
            aria-current={isActive ? 'location' : undefined}
          >
            {/* Label Reveal on Hover */}
            <motion.span 
                className="absolute right-6 text-[10px] font-mono uppercase tracking-widest text-brand-power bg-brand-white/90 px-2 py-1 rounded-sm pointer-events-none"
                initial={{ opacity: 0, x: 10 }}
                animate={{ 
                    opacity: isActive ? 1 : 0, 
                    x: isActive ? 0 : 10 
                }}
                whileHover={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                {item.label}
            </motion.span>

            {/* The Dot */}
            <motion.div
              className={`rounded-full border transition-all duration-500 ${
                isActive 
                  ? 'w-3 h-3 bg-brand-power border-brand-power' 
                  : 'w-2 h-2 bg-transparent border-brand-power/30 group-hover:border-brand-power'
              }`}
              whileHover={{ scale: 1.5 }}
              layoutId="navDot"
            />
          </a>
        );
      })}
    </nav>
  );
};

export default SideNavigation;