import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SERVICES, ANIMATION_CONFIG } from '../constants';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

const ServiceDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const service = SERVICES.find(s => s.slug === slug);

    if (!service) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Servicio no encontrado</h1>
                    <Link to="/" className="text-brand-accent hover:underline">Volver al inicio</Link>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.5 } }}
            transition={ANIMATION_CONFIG.transition}
            className="min-h-screen pt-32 pb-20 px-6 md:px-12 bg-brand-white"
        >
            <div className="max-w-4xl mx-auto">
                <Breadcrumbs items={[{ label: service.title }]} className="mb-8" />

                <motion.h1
                    className="text-6xl md:text-8xl font-bold text-brand-power mb-8 tracking-tighter"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...ANIMATION_CONFIG.transition, delay: 0.2 }}
                >
                    {service.title}
                </motion.h1>

                <motion.div
                    className="flex flex-wrap gap-4 mb-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    {service.tags.map(tag => (
                        <span key={tag} className="px-4 py-2 bg-brand-soft/50 rounded-full text-sm font-medium border border-brand-power/5">
                            {tag}
                        </span>
                    ))}
                </motion.div>

                <motion.p
                    className="text-xl md:text-2xl font-light text-brand-power/80 leading-relaxed mb-16"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...ANIMATION_CONFIG.transition, delay: 0.3 }}
                >
                    {service.description}
                </motion.p>

                <div className="p-8 bg-brand-soft/30 rounded-lg border border-brand-soft">
                    <h3 className="text-lg font-bold mb-4">¿Te interesa este enfoque?</h3>
                    <p className="mb-6 opacity-80">
                        Mi agenda funciona por aplicación. No trabajo con cualquiera, solo con proyectos donde la viabilidad matemática es clara.
                    </p>
                    <a href="#contacto" className="inline-block bg-brand-power text-brand-white px-8 py-4 font-bold rounded hover:bg-brand-accent hover:text-brand-power transition-all duration-300">
                        Agendar Diagnóstico Gratuito
                    </a>
                </div>

            </div>
        </motion.div>
    );
};

export default ServiceDetail;
