import React from 'react';
import { StrategicAttribute } from '../../types';
import SectionHeading from '../ui/SectionHeading';
import WireframeBox from '../ui/WireframeBox';

interface Props {
  attribute: StrategicAttribute;
  index: number;
}

const StrategicSection: React.FC<Props> = ({ attribute, index }) => {
  const isEven = index % 2 === 0;

  return (
    <section 
        id={attribute.id} 
        className="min-h-[90vh] flex items-center py-24 bg-brand-white border-t border-brand-soft/40 relative overflow-hidden"
    >
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 w-full relative z-10">
        
        <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} justify-between items-center gap-16 md:gap-32`}>
          
          {/* Typography / Concept - Using UI Kit */}
          <div className="md:w-1/2 w-full">
            <SectionHeading 
                number={`0${index + 1}`}
                eyebrow={attribute.title}
                title={attribute.subtitle}
                description={attribute.description}
                align="left"
            />
          </div>

          {/* Visual Placeholder - Using UI Kit */}
          <div className="md:w-1/2 w-full">
             <WireframeBox 
                label={`Visualización ${attribute.title}`}
             />
          </div>

        </div>
      </div>
    </section>
  );
};

export default StrategicSection;