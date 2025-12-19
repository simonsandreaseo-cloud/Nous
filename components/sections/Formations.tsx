import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FORMATIONS, ANIMATION_CONFIG } from '../../constants';
import SectionHeading from '../ui/SectionHeading';
import Button from '../ui/Button';

const Formations: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const xTitle = useTransform(scrollYProgress, [0, 1], [-50, 50]);

  return (
    <section id="formaciones" ref={containerRef} className="py-32 bg-brand-power text-brand-soft overflow-hidden relative">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 relative z-10">
        
        <div className="mb-24 relative">
            <motion.div 
                className="absolute -top-20 -left-20 text-[20vw] leading-none font-black text-brand-white opacity-[0.03] select-none whitespace-nowrap pointer-events-none transform-gpu will-change-transform"
                style={{ x: xTitle }}
            >
                ACADEMIA
            </motion.div>

           <SectionHeading 
             number="02"
             eyebrow="Estrategia"
             title="Formación de Élite"
             light={true}
             align="left"
           />
        </div>

        <div className="flex flex-col">
          {FORMATIONS.map((formation, idx) => (
            <motion.div 
              key={formation.id}
              className="group border-t border-brand-soft/10 py-12 hover:bg-brand-white/5 transition-colors duration-500 cursor-default relative overflow-hidden transform-gpu"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.1, ...ANIMATION_CONFIG.transition }}
            >
              <div className="absolute inset-0 bg-brand-accent/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.22,1,0.36,1] will-change-transform"></div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="flex items-baseline gap-6 md:w-1/2">
                   <span className="font-mono text-brand-accent text-sm transition-opacity duration-300 group-hover:opacity-100 opacity-60">0{idx + 1}</span>
                   <h3 className="text-3xl md:text-4xl font-bold text-brand-white group-hover:text-brand-accent transition-all duration-300">
                     {formation.title}
                   </h3>
                </div>
                
                <div className="md:w-1/4">
                  <span className={`inline-block px-3 py-1 text-[10px] uppercase tracking-widest border transition-colors duration-300 ${
                    formation.level === 'Nivel Senior' 
                        ? 'border-brand-accent text-brand-accent group-hover:bg-brand-accent group-hover:text-brand-power' 
                        : 'border-brand-soft/30 text-brand-soft/50 group-hover:border-brand-soft group-hover:text-brand-soft'
                  }`}>
                    {formation.level}
                  </span>
                </div>

                <div className="md:w-1/4 text-brand-soft/60 text-sm leading-relaxed text-right group-hover:text-brand-soft transition-colors duration-300 font-light">
                  {formation.description}
                </div>
              </div>
            </motion.div>
          ))}
          <motion.div 
            className="border-t border-brand-soft/10"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "circOut" }}
            style={{ originX: 0 }}
          ></motion.div>
        </div>
        
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={ANIMATION_CONFIG.viewport}
        >
             <Button variant="outline" className="border-brand-soft text-brand-soft hover:bg-brand-soft hover:text-brand-power">
                 Ver Próximos Talleres Directivos
             </Button>
        </motion.div>

      </div>
    </section>
  );
};

export default Formations;