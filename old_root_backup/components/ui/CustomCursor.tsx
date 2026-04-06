import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const CustomCursor: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  // Use MotionValues for high performance without re-renders
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Adjusted physics for 1:1 feel (no lag) but smooth rendering
  // Stiffness increased significantly, mass decreased.
  const springConfig = { damping: 50, stiffness: 1000, mass: 0.1 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16); // Center the 32px cursor
      mouseY.set(e.clientY - 16);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Detect interactive elements
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('interactive')
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [mouseX, mouseY]);

  // Only render on desktop to avoid touch screen issues
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    setIsDesktop(window.matchMedia("(pointer: fine)").matches);
  }, []);

  if (!isDesktop) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[9999] mix-blend-exclusion bg-brand-white"
      style={{
        x: cursorX,
        y: cursorY,
        scale: isHovered ? 2.5 : 1,
      }}
    >
      {/* Inner Dot for precision */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-brand-power rounded-full transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`} />
    </motion.div>
  );
};

export default CustomCursor;