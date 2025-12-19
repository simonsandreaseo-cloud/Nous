import React from 'react';
import SectionHeading from '../ui/SectionHeading';
import Button from '../ui/Button';

const Contact: React.FC = () => {
  return (
    <section id="contacto" className="py-40 bg-brand-white relative">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-brand-soft/30 blur-[100px] rounded-full -z-10"></div>

      <div className="max-w-screen-xl mx-auto px-6 md:px-12 relative z-10">
        
        <div className="flex flex-col items-center text-center">
            <SectionHeading 
                number="04"
                eyebrow="Ejecución"
                title="¿Asaltamos el mercado?"
                align="center"
                className="mb-8"
            />
            
            <div className="max-w-lg mx-auto border border-brand-power/10 bg-brand-soft/20 p-8 mb-12 rounded-sm text-left">
                <p className="text-xs font-bold text-brand-power/60 uppercase tracking-widest mb-4">Criterio de Viabilidad</p>
                <p className="text-sm text-brand-power/80 leading-relaxed mb-6">
                    No trabajo con todos los que llaman. Mi capacidad de ejecución es limitada y la dedico a proyectos donde el realismo estratégico pueda generar un dominio real:
                </p>
                <ul className="text-xs space-y-3 text-brand-power/70 font-mono uppercase tracking-tight">
                    <li className="flex gap-3"><span>—</span> Negocios con datos crudos listos para ser analizados.</li>
                    <li className="flex gap-3"><span>—</span> Directivos que prefieren resultados a "tener razón".</li>
                    <li className="flex gap-3"><span>—</span> Proyectos con ambición de dominio, no de supervivencia.</li>
                </ul>
                <p className="text-xs text-brand-power/50 mt-6 italic">
                    Si buscas "trucos" rápidos o presupuestos bajos sin compromiso técnico, hay miles de agencias ahí fuera esperándote.
                </p>
            </div>

            <div className="mt-4">
                <Button 
                    href="mailto:contacto@simonsandrea.com" 
                    variant="primary"
                >
                    Solicitar Diagnóstico Realista
                </Button>
            </div>
            
            <p className="mt-8 text-brand-power/40 text-sm font-mono uppercase tracking-widest">
                Search Console no miente. Tu negocio tampoco debería.
            </p>
        </div>

      </div>
    </section>
  );
};

export default Contact;