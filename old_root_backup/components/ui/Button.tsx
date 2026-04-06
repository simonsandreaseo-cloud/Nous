import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'link';
  href?: string;
  onClick?: () => void;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  href, 
  onClick, 
  className = '' 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold tracking-wide transition-colors duration-300 relative overflow-hidden group interactive";
  
  const variants = {
    primary: "bg-brand-power text-brand-white px-8 py-4 text-lg md:text-xl",
    outline: "border border-brand-power text-brand-power px-8 py-4 text-lg hover:bg-brand-power hover:text-brand-white",
    ghost: "text-brand-power hover:bg-brand-soft/50 px-6 py-3",
    link: "text-xl md:text-2xl text-brand-power border-b-2 border-brand-power pb-1 hover:text-brand-accent hover:border-brand-accent p-0"
  };

  const content = (
    <>
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {variant !== 'link' && (
             <motion.span 
                className="inline-block"
                variants={{
                    rest: { x: 0 },
                    hover: { x: 4 }
                }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
             >
                 →
             </motion.span>
        )}
      </span>
      
      {/* Liquid Fill Effect for Primary Buttons - Optimized Curve */}
      {variant === 'primary' && (
        <motion.div 
            className="absolute inset-0 bg-brand-accent z-0"
            initial={{ x: '-100%' }}
            whileHover={{ x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} // Premium Ease
        />
      )}
    </>
  );

  const Component = href ? motion.a : motion.button;
  const props = href ? { href } : { onClick };

  return (
    <Component
      {...props}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
    >
      {content}
    </Component>
  );
};

export default Button;