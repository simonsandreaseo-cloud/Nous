import React from 'react';
import { motion } from 'framer-motion';
import { TECH_STACK } from '../../constants';

const TechStack: React.FC = () => {
  return (
    <section className="py-16 bg-brand-white border-b border-brand-power/5 overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center gap-12">
        
        <div className="md:w-1/4 flex-shrink-0">
             <h3 className="text-brand-power font-bold text-lg mb-2">Arsenal Tecnológico</h3>
             <p className="text-xs text-brand-power/50 font-mono uppercase tracking-wide">
                 Stack de Ingeniería
             </p>
        </div>

        <div className="md:w-3/4 w-full relative">
            {/* Simple gradient masks for slider effect feeling */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10"></div>

            <motion.div 
              className="flex gap-4 md:gap-8 overflow-x-auto pb-4 md:pb-0 scrollbar-hide"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
                {TECH_STACK.map((item, idx) => (
                    <motion.div 
                        key={item.id}
                        className="flex-shrink-0 px-6 py-3 border border-brand-power/10 rounded-full bg-brand-soft/30 text-brand-power/80 font-mono text-sm hover:bg-brand-power hover:text-brand-white hover:border-brand-power transition-all duration-300 cursor-default"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        {item.name}
                    </motion.div>
                ))}
            </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TechStack;