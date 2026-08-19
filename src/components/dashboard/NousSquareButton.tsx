import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const NousSquareButton = ({ onClick }: { onClick: () => void }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const buttonRef = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    
    const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!buttonRef.current) return;
        const { clientX, clientY } = e;
        const { height, width, left, top } = buttonRef.current.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);
        x.set(middleX * 0.2);
        y.set(middleY * 0.2);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    return (
        <motion.button
            onClick={onClick}
            ref={buttonRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={() => setIsHovered(true)}
            style={{ 
                x: springX, 
                y: springY,
                boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 -1px 1px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1)"
            }}
            className="relative flex items-center justify-center overflow-hidden group bg-[#1C1C1C] rounded-[18px] w-[72px] h-[72px] shrink-0 transition-transform cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <motion.div 
                className="absolute inset-0 bg-indigo-500/20 z-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
            />
            
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[inherit]">
                <motion.div
                    className="absolute top-0 bottom-0 w-[100%] bg-gradient-to-r from-transparent via-white/15 to-transparent"
                    style={{ skewX: "-20deg" }}
                    initial={{ x: "-150%" }}
                    animate={{ x: isHovered ? ["-150%", "250%"] : "-150%" }}
                    transition={{
                        duration: 1,
                        ease: "linear",
                        repeat: isHovered ? Infinity : 0,
                        repeatDelay: 0.7
                    }}
                />
            </div>
            
            <motion.div
                className="relative z-10 w-10 h-10"
                animate={isHovered ? { 
                    rotate: [0, -10, 10, -5, 5, 0],
                    scale: [1, 1.1, 1] 
                } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
            >
                <img src="/LogoNous.png" alt="Nous Logo" className="w-full h-full object-contain opacity-90" />
            </motion.div>
        </motion.button>
    );
};
