import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionTemplate, useMotionValue } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TOOLS, ANIMATION_CONFIG } from '../../constants';
import SectionHeading from '../ui/SectionHeading';

const ToolCard: React.FC<{ tool: typeof TOOLS[0]; index: number }> = ({ tool, index }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      className="relative bg-brand-white/95 md:bg-brand-white/80 md:backdrop-blur-sm p-8 shadow-sm border border-brand-white transition-all duration-500 group will-change-transform overflow-hidden interactive"
      variants={{
        hidden: { opacity: 0, y: 50 + (index * 20) },
        visible: { opacity: 1, y: 0, transition: ANIMATION_CONFIG.transition }
      }}
      onMouseMove={handleMouseMove}
      whileHover={{
        y: -10,
        transition: { type: 'spring', stiffness: 300, damping: 20 }
      }}
    >
      {/* Spotlight Effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(176, 224, 230, 0.15),
              transparent 80%
            )
          `,
        }}
      />

      {/* Spotlight Border Reveal */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(176, 224, 230, 0.4),
              transparent 80%
            )
          `,
          zIndex: 0
        }}
      />

      {/* Content wrapper to stay above spotlight */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-brand-soft rounded-full text-brand-power flex items-center justify-center font-bold text-xl group-hover:scale-110 group-hover:bg-brand-accent group-hover:text-brand-white transition-all duration-500 ease-[0.22,1,0.36,1]">
            {tool.name.charAt(0)}
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-sm ${tool.status === 'Disponible' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
            }`}>
            {tool.status}
          </span>
        </div>

        <h3 className="text-xl font-bold text-brand-power mb-3">{tool.name}</h3>
        <p className="text-sm text-brand-power/60 mb-8 min-h-[40px] leading-relaxed">
          {tool.function}
        </p>

        <Link to={tool.path} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-power hover:text-brand-accent transition-colors">
          Acceder <span className="text-lg leading-none mb-[2px] group-hover:translate-x-1 transition-transform duration-300">→</span>
        </Link>
      </div>
    </motion.div>
  );
};

const Tools: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particleCount, setParticleCount] = useState(0);

  useEffect(() => {
    setParticleCount(window.innerWidth < 768 ? 6 : 20);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const yBg = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const yData = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section id="herramientas" ref={containerRef} className="py-32 bg-brand-soft relative overflow-hidden">
      {/* Dynamic Background Element (Parallax) - GPU Accelerated */}
      <motion.div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-accent/20 blur-[120px] rounded-full pointer-events-none transform-gpu will-change-transform"
        style={{ y: yBg }}
      />

      {/* Abstract Data Stream Effect */}
      <motion.div
        className="absolute left-10 top-0 bottom-0 w-full opacity-10 font-mono text-xs text-brand-power pointer-events-none select-none overflow-hidden"
        style={{ y: yData }}
      >
        {Array.from({ length: particleCount }).map((_, i) => (
          <div key={i} className="absolute transform-gpu" style={{
            left: `${Math.random() * 90}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random()
          }}>
            {Math.random() > 0.5 ? '10110' : '01001'} {['SEO', 'DATA', 'LOG', 'API'][Math.floor(Math.random() * 4)]}
          </div>
        ))}
      </motion.div>

      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 relative z-10">
        <div className="mb-20">
          <SectionHeading
            number="03"
            eyebrow="Creativa"
            title="Herramientas Propias"
            description="Software desarrollado in-house para resolver problemas que las herramientas comerciales ignoran."
            align="center"
          />
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={ANIMATION_CONFIG.viewport}
          variants={{
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {TOOLS.map((tool, idx) => (
            <ToolCard key={tool.id} tool={tool} index={idx} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Tools;