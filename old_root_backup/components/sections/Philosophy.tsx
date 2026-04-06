import React from 'react';
import { motion } from 'framer-motion';

const Philosophy: React.FC = () => {
  return (
    <section id="manifiesto" className="py-24 md:py-32 bg-brand-soft border-b border-brand-power/5">
      <div className="max-w-screen-xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row gap-12 md:gap-24 items-start">
          
          <motion.div 
            className="md:w-1/3 sticky top-32"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-16 h-1 bg-brand-power mb-8"></div>
            <h2 className="text-4xl font-bold text-brand-power mb-6 leading-tight">
              El diagnóstico <br/> insobornable.
            </h2>
            <p className="text-sm text-brand-power/60 font-mono uppercase tracking-widest">
              El Portal de la Verdad
            </p>
          </motion.div>

          <motion.div 
            className="md:w-2/3 prose prose-lg text-brand-power/80 leading-relaxed font-light"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-xl md:text-2xl mb-8 font-medium">
              Si buscas un SEO que te diga lo que quieres oír, hay miles de agencias ahí fuera. Si buscas un estratega que te diga lo que necesitas ejecutar para ganar, quédate.
            </p>
            <p className="mb-6">
              Search Console no miente, aunque tú quieras engañarte. El mercado digital actual no premia al que tiene más contenido, sino al que tiene la <strong>visión de realidad</strong> más precisa. 
            </p>
            <p className="mb-6">
              Mi metodología de SEO Inteligente no se basa en "optimizar", sino en <strong>asaltar el SERP</strong> mediante tres ejes de potencia:
            </p>
            <ul className="list-none space-y-4 mb-8">
              <li><strong>1. Análisis de Viabilidad:</strong> Evaluamos si tu nicho es una oportunidad real o un sumidero de recursos antes de dar el primer paso.</li>
              <li><strong>2. Arquitectura de Dominio:</strong> Derribamos laberintos web. Construimos estructuras claras que Google entiende y prioriza por su lógica impecable.</li>
              <li><strong>3. Realismo Estratégico:</strong> Ejecutamos planes basados en datos crudos. Sin lenguaje corporativo vacío. Solo hitos técnicos y resultados financieros.</li>
            </ul>
            <p className="italic border-l-2 border-brand-accent pl-6 py-2">
              "No vendemos posiciones; vendemos la viabilidad de un negocio en las SERPs mediante ingeniería inversa aplicada."
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Philosophy;