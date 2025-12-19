import React from 'react';

// This component represents the semantic architecture
// Currently, it acts as a placeholder to validate the structural flow.

const SectionWireframe: React.FC<{ 
  id: string; 
  title: string; 
  bgColor: string;
  align: 'left' | 'right' 
}> = ({ id, title, bgColor, align }) => {
  return (
    <section id={id} className={`min-h-[80vh] flex items-center py-24 ${bgColor}`}>
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 w-full">
        <div className={`flex flex-col ${align === 'right' ? 'md:items-end text-right' : 'md:items-start text-left'}`}>
            <span className="text-brand-accent font-mono text-sm mb-4 uppercase tracking-widest">
                Arquitectura
            </span>
            <h2 className="text-5xl md:text-7xl font-bold text-brand-power mb-12">
                {title}
            </h2>
            
            {/* Visual placeholder */}
            <div className="w-full md:w-2/3 h-64 border border-dashed border-brand-power/20 bg-brand-white/50 flex items-center justify-center">
                <p className="text-brand-power/40 font-mono text-sm">
                   [Visualización de {title}]
                </p>
            </div>
        </div>
      </div>
    </section>
  );
};

const ContentArchitecture: React.FC = () => {
  return (
    <div className="flex flex-col">
      <SectionWireframe 
        id="servicios" 
        title="Servicios SEO" 
        bgColor="bg-brand-white"
        align="right"
      />
      <SectionWireframe 
        id="formaciones" 
        title="Formaciones" 
        bgColor="bg-brand-soft"
        align="left"
      />
      <SectionWireframe 
        id="herramientas" 
        title="Herramientas" 
        bgColor="bg-brand-white"
        align="right"
      />
    </div>
  );
};

export default ContentArchitecture;