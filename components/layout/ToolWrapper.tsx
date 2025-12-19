import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ANIMATION_CONFIG } from '../../constants';

interface ToolWrapperProps {
    children: React.ReactNode;
    backTo?: string;
    backLabel?: string;
}

const ToolWrapper: React.FC<ToolWrapperProps> = ({ children, backTo = "/herramientas", backLabel = "Volver al Dashboard" }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.3 } }}
            transition={ANIMATION_CONFIG.transition}
            className="min-h-screen pt-32 px-4 md:px-8 bg-brand-white relative"
        >
            <div className="max-w-screen-2xl mx-auto">
                <div className="mb-6">
                    <Link to={backTo} className="inline-flex items-center text-sm font-bold text-brand-power/50 hover:text-brand-accent transition-colors">
                        <ArrowLeft className="mr-2 w-4 h-4" /> {backLabel}
                    </Link>
                </div>
                {children}
            </div>
        </motion.div>
    );
};

export default ToolWrapper;
