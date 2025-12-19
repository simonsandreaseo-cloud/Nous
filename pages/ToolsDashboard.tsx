import React from 'react';
import Tools from '../components/sections/Tools';

import { motion } from 'framer-motion';
import { ANIMATION_CONFIG } from '../constants';

const ToolsDashboard: React.FC = () => {
    return (
        <motion.div
            className="pt-20 min-h-screen bg-brand-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            transition={ANIMATION_CONFIG.transition}
        >
            <Tools />
        </motion.div>
    );
};
export default ToolsDashboard;
