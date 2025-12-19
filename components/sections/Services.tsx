import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SERVICES, ANIMATION_CONFIG } from '../../constants';
import SectionHeading from '../ui/SectionHeading';

const Services: React.FC = () => {
  return (
    <section id="servicios" className="py-32 bg-brand-white relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#1C1C1C 1px, transparent 1px), linear-gradient(90deg, #1C1C1C 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20">
          <SectionHeading
            number="01"
            eyebrow="Consultoría"
            title="Plan de Ejecución"
            description="No entregamos informes de 80 páginas que nadie lee. Entregamos arquitecturas diseñadas para convertir y asaltar los resultados de búsqueda."
            align="left"
          />
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <motion.div
            className="absolute top-0 left-0 w-full h-px bg-brand-power/10 hidden md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ originX: 0, top: '40px' }}
          />

          {SERVICES.map((service, idx) => (
            <Link to={`/servicios/${service.slug}`} key={service.id} className="block h-full">
              <motion.div
                className="group relative p-8 border border-brand-power/5 hover:border-brand-accent transition-colors duration-500 ease-[0.22,1,0.36,1] bg-brand-white flex flex-col justify-between min-h-[380px] interactive h-full"
                variants={{
                  hidden: { opacity: 0, y: 50 },
                  visible: { opacity: 1, y: 0, transition: ANIMATION_CONFIG.transition }
                }}
                whileHover={{ y: -5 }}
              >
                <motion.div
                  className="absolute top-0 left-8 w-px h-full bg-brand-power/5 group-hover:bg-brand-accent/20 transition-colors duration-500"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 + (idx * 0.1), ease: [0.22, 1, 0.36, 1] }}
                  style={{ originY: 0 }}
                />

                <div className="relative z-10">
                  <span className="text-brand-power/20 font-mono text-sm mb-6 block bg-brand-white w-fit pr-2">Táctica 0{idx + 1}</span>
                  <h3 className="text-2xl font-bold text-brand-power mb-4 group-hover:text-brand-accent transition-colors duration-300">
                    {service.title}
                  </h3>
                  <p className="text-brand-power/70 leading-relaxed text-sm font-light">
                    {service.description}
                  </p>
                </div>

                <div className="mt-8 relative z-10">
                  <div className="flex flex-wrap gap-2 mb-6">
                    {service.tags.map(tag => (
                      <span key={tag} className="text-[10px] uppercase tracking-wider text-brand-power/60 font-mono border border-brand-power/5 px-2 py-1 bg-brand-soft/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="w-full h-px bg-brand-power/10 group-hover:bg-brand-accent transition-colors duration-500 origin-left scale-x-50 group-hover:scale-x-100 ease-[0.22,1,0.36,1]"></div>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;