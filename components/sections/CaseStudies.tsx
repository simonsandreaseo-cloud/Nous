import React from 'react';
import { motion } from 'framer-motion';
import { CASE_STUDIES } from '../../constants';

const CaseStudies: React.FC = () => {
  return (
    <section id="proyectos" className="py-32 bg-brand-white border-t border-brand-power/5">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-brand-accent font-mono text-xs uppercase tracking-[0.2em] mb-4 block">
              Metodología Aplicada
            </span>
            <h2 className="text-4xl md:text-6xl font-bold text-brand-power tracking-tight">
              Ingeniería de <br />Resultados
            </h2>
          </motion.div>
        </div>

        <div className="space-y-24">
          {CASE_STUDIES.map((study, idx) => (
            <motion.div 
              key={study.id}
              className="flex flex-col md:flex-row gap-12 md:gap-24 border-b border-brand-power/5 pb-16 last:border-0"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              
              {/* Meta Info */}
              <div className="md:w-1/3">
                 <div className="text-brand-power/40 font-mono text-sm mb-2">0{idx + 1} — {study.industry}</div>
                 <h3 className="text-3xl font-bold text-brand-power mb-6">{study.client}</h3>
                 <div className="flex flex-wrap gap-2">
                    {study.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-brand-soft border border-brand-power/5 text-xs font-medium text-brand-power/60 rounded-full">
                            {tag}
                        </span>
                    ))}
                 </div>
              </div>

              {/* Problem/Solution */}
              <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-brand-power/30 mb-4">El Reto</h4>
                    <p className="text-brand-power/80 leading-relaxed text-lg font-light">
                        {study.challenge}
                    </p>
                 </div>
                 <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-brand-accent mb-4">La Solución</h4>
                    <p className="text-brand-power/80 leading-relaxed text-lg font-light">
                        {study.solution}
                    </p>
                    <div className="mt-8 pt-6 border-t border-brand-accent/30">
                        <span className="block text-xs font-mono text-brand-power/40 mb-1">Impacto Final</span>
                        <span className="text-xl font-bold text-brand-power">{study.result}</span>
                    </div>
                 </div>
              </div>

            </motion.div>
          ))}
        </div>
        
        <div className="mt-12 text-center md:text-right">
            <a href="#contacto" className="inline-flex items-center gap-2 text-brand-power font-bold border-b-2 border-brand-power hover:text-brand-accent hover:border-brand-accent transition-colors pb-1">
                Ver más casos confidenciales <span>→</span>
            </a>
        </div>

      </div>
    </section>
  );
};

export default CaseStudies;