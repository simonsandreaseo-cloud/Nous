import React from 'react';
import { motion } from 'framer-motion';
import { BIO_EVENTS } from '../../constants';
import OptimizedImage from '../ui/OptimizedImage';

const About: React.FC = () => {
  return (
    <section id="trayectoria" className="py-24 bg-brand-soft/30">
      <div className="max-w-screen-xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row gap-16 items-center">
          
          <motion.div 
            className="md:w-1/2 w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
             {/* Optimized Image Component Implementation */}
             <div className="relative aspect-[4/5] w-full max-w-md mx-auto md:max-w-full">
                <OptimizedImage 
                  src="/assets/simon-sandrea-portrait.jpg" // Path ready for real asset
                  alt="Retrato de Simón Sandrea, Estratega Digital"
                  className="rounded-sm shadow-2xl"
                />
                
                {/* Decorative Elements Layered on top */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/20 blur-3xl pointer-events-none"></div>
                
                <div className="absolute bottom-8 left-8 right-8 z-20">
                    <div className="text-6xl text-white/20 font-bold leading-none select-none mix-blend-overlay">
                        SIMÓN<br/>SANDREA
                    </div>
                </div>
             </div>
          </motion.div>

          <motion.div 
            className="md:w-1/2"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
             <h2 className="text-4xl font-bold text-brand-power mb-8">
                Más allá del <br/> <span className="text-brand-accent">algoritmo</span>.
             </h2>
             <div className="prose prose-lg text-brand-power/70 font-light mb-12">
                <p>
                    Comencé escribiendo código, no contenido. Esa base técnica me permitió ver el SEO no como una lista de tareas, sino como un sistema complejo de incentivos y señales.
                </p>
                <p>
                    Mi filosofía es simple: <strong>automatizar lo aburrido para enfocarnos en lo estratégico</strong>. Si una tarea se puede resolver con un script de Python, no deberíamos gastar horas humanas en ella.
                </p>
             </div>

             <div className="space-y-6 border-l-2 border-brand-power/10 pl-8">
                {BIO_EVENTS.map((event, idx) => (
                    <div key={idx} className="relative group">
                        <span className="absolute -left-[39px] top-1 h-3 w-3 rounded-full bg-brand-power/20 border-2 border-brand-soft group-hover:bg-brand-accent transition-colors duration-300"></span>
                        <div className="text-xs font-bold text-brand-accent mb-1">{event.year}</div>
                        <div className="font-bold text-brand-power group-hover:text-brand-accent transition-colors duration-300">{event.role}</div>
                        <div className="text-sm text-brand-power/50">{event.company}</div>
                    </div>
                ))}
             </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default About;