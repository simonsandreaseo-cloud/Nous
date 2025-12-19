import React from 'react';
import { motion } from 'framer-motion';
import { METRICS } from '../../constants';

const Impact: React.FC = () => {
  return (
    <section id="impacto" className="py-24 bg-brand-power text-brand-white">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-end gap-8 mb-16 border-b border-brand-white/10 pb-8">
            <motion.div 
              className="md:w-1/2"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
                <span className="text-brand-accent font-mono text-xs uppercase tracking-[0.2em] mb-4 block">
                    Evidencia
                </span>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                    El dato mata al relato.
                </h2>
            </motion.div>
            <motion.div 
              className="md:w-1/2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
                <p className="text-brand-white/60 text-sm md:text-base leading-relaxed max-w-xl ml-auto">
                    El SEO no es magia, es ingeniería inversa aplicada. Mis estrategias se validan con crecimiento medible, no con promesas vacías.
                </p>
            </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {METRICS.map((metric, idx) => (
                <motion.div 
                  key={metric.id}
                  className="relative group"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15, duration: 0.7, ease: "easeOut" }}
                >
                    <div className="absolute -left-4 top-0 h-full w-px bg-brand-white/10 group-hover:bg-brand-accent/50 transition-colors duration-500"></div>
                    <div className="pl-6">
                        <div className="text-6xl md:text-7xl font-bold text-brand-white mb-2 tracking-tighter">
                            {metric.value}
                        </div>
                        <h3 className="text-xl text-brand-accent font-medium mb-4">
                            {metric.label}
                        </h3>
                        <p className="text-brand-white/50 text-sm leading-relaxed border-t border-brand-white/5 pt-4">
                            {metric.context}
                        </p>
                    </div>
                </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default Impact;