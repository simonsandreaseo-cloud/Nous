import React from 'react';
import { motion } from 'framer-motion';
import { ANIMATION_CONFIG } from '../../constants';
import Button from '../ui/Button';

const HeroPhase1: React.FC = () => {
  return (
    <section className="relative min-h-screen flex flex-col justify-center bg-brand-white pt-20 overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 w-full z-10">
        
        <div className="space-y-6">
          
          <div className="overflow-hidden">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ ...ANIMATION_CONFIG.transition, delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="h-px w-12 bg-brand-power/20"></div>
              <h2 className="text-lg md:text-xl text-brand-power/60 font-light tracking-wide uppercase font-mono">
                Estrategia Clara. Realista. <span className="text-brand-power font-bold">Potente.</span>
              </h2>
            </motion.div>
          </div>

          <div className="overflow-hidden py-2 relative">
            <motion.h1 
              className="text-[11vw] lg:text-[10vw] leading-[0.85] font-extrabold text-brand-power tracking-tighter gpu-accelerated"
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={ANIMATION_CONFIG.transition}
            >
              SEO <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-power via-brand-power to-brand-power/60">
                INTELIGENTE
              </span>
            </motion.h1>
          </div>
          
          <motion.p 
            className="text-xl md:text-2xl text-brand-power/50 max-w-2xl font-light leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...ANIMATION_CONFIG.transition, delay: 0.6 }}
          >
             Ni trucos, ni promesas de humo. Evalúo la viabilidad de tu proyecto, diseño su arquitectura y ejecuto el plan que tus datos de Search Console llevan tiempo pidiéndote.
          </motion.p>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ ...ANIMATION_CONFIG.transition, delay: 0.8 }}
             className="pt-8 flex flex-col sm:flex-row gap-6 items-start"
          >
              <Button href="#contacto">
                 Solicitar Diagnóstico Realista
              </Button>
              <div className="text-xs text-brand-power/40 max-w-[200px] font-mono uppercase tracking-tight pt-2">
                Basado en datos crudos y realismo estratégico.
              </div>
          </motion.div>

        </div>

        <motion.div 
          className="absolute bottom-12 left-6 md:left-12 flex items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          <div className="text-xs font-mono uppercase tracking-widest text-brand-power/30">Hacia la Verdad</div>
          <motion.div 
            className="w-px h-12 bg-brand-power/10 overflow-hidden"
          >
              <motion.div 
                 className="w-full h-full bg-brand-power/40"
                 animate={{ y: ["-100%", "100%"] }}
                 transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
          </motion.div>
        </motion.div>

      </div>
      
      <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-b from-brand-soft/40 to-transparent -z-10 blur-3xl opacity-60 transform-gpu pointer-events-none"></div>
    </section>
  );
};

export default HeroPhase1;