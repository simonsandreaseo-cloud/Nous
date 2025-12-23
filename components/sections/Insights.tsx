import React from 'react';
import { motion } from 'framer-motion';
import { INSIGHTS } from '../../constants';

const Insights: React.FC = () => {
  return (
    <section id="insights" className="py-32 bg-brand-white border-t border-brand-power/5">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-brand-accent font-mono text-xs uppercase tracking-[0.2em] mb-4 block">
              Bitácora
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-brand-power tracking-tight">
              Insights Técnicos
            </h2>
          </motion.div>
          <motion.a
            href="#"
            className="hidden md:inline-block text-brand-power font-bold border-b-2 border-brand-accent hover:border-brand-power transition-colors pb-1"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Ver todos los contenidos
          </motion.a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 gap-x-8">
          {INSIGHTS.map((insight, idx) => (
            <motion.article
              key={insight.id}
              className="group cursor-pointer flex flex-col h-full justify-between"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
            >
              <div>
                <div className="flex justify-between items-center mb-6 text-xs font-mono uppercase tracking-wider text-brand-power/40">
                  <span>{insight.category}</span>
                  <span>{insight.date}</span>
                </div>
                <h3 className="text-2xl font-bold text-brand-power mb-4 leading-tight group-hover:text-brand-power/70 transition-colors">
                  {insight.title}
                </h3>
                <p className="text-brand-power/60 text-sm leading-relaxed mb-6">
                  {insight.excerpt}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-accent">
                Leer Contenido
                <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-12 md:hidden text-center">
          <a href="#" className="inline-block text-brand-power font-bold border-b-2 border-brand-accent pb-1">
            Ver archivo completo
          </a>
        </div>
      </div>
    </section>
  );
};

export default Insights;