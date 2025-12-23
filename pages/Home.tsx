import React, { useState, Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import HeroPhase1 from '../components/sections/HeroPhase1';
import About from '../components/sections/About'; // Core Narrative Component
import Preloader from '../components/layout/Preloader';
import ScrollProgress from '../components/ui/ScrollProgress';
import SideNavigation from '../components/ui/SideNavigation';
import CustomCursor from '../components/ui/CustomCursor';

// Lazy load heavy/below-the-fold components for Performance (Phase 3 Requirement)
const Services = lazy(() => import('../components/sections/Services'));     // Clara
const Formations = lazy(() => import('../components/sections/Formations')); // Potente
const Tools = lazy(() => import('../components/sections/Tools'));           // Creativa
const Contact = lazy(() => import('../components/sections/Contact'));

// Loading Fallback (Minimalist)
const SectionLoader = () => (
  <div className="w-full h-[50vh] flex items-center justify-center bg-brand-white">
    <div className="w-8 h-8 border-2 border-brand-power/10 border-t-brand-power rounded-full animate-spin" aria-label="Cargando contenido..."></div>
  </div>
);

const Home: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Lock body scroll during preloader
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [loading]);

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && <Preloader onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      <ScrollProgress />
      <SideNavigation />

      <motion.main
        id="main-content"
        className="flex-grow focus:outline-none"
        tabIndex={-1}
        exit={{ opacity: 0, transition: { duration: 0.5 } }}
      >
        <motion.div exit={{ x: '-100vw', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}>
          <HeroPhase1 />
        </motion.div>

        <motion.div exit={{ x: '100vw', transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 } }}>
          <About />
        </motion.div>

        <Suspense fallback={<SectionLoader />}>
          <motion.div exit={{ y: 100, opacity: 0, transition: { duration: 0.5, delay: 0.2 } }}>
            <Services />    {/* Pilar 1: Clara */}
            <Formations />  {/* Pilar 2: Potente */}
            <Tools />       {/* Pilar 3: Creativa */}
            <Contact />
          </motion.div>
        </Suspense>
      </motion.main>
    </>
  );
};

export default Home;
