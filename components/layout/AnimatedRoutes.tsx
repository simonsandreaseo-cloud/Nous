import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from '../../pages/Home';
import ToolsDashboard from '../../pages/ToolsDashboard';
import SeoSuitePage from '../../pages/tools/SeoSuitePage';
import BlogVizPage from '../../pages/tools/BlogVizPage';
import ReportGeneratorPage from '../../pages/tools/ReportGeneratorPage';
import ContentWriterPage from '../../pages/tools/ContentWriterPage';
import ServiceDetail from '../../pages/ServiceDetail';

const AnimatedRoutes: React.FC = () => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Home />} />
                <Route path="/servicios/:slug" element={<ServiceDetail />} />
                <Route path="/herramientas" element={<ToolsDashboard />} />
                <Route path="/herramientas/seo-suite" element={<SeoSuitePage />} />
                <Route path="/herramientas/blog-viz" element={<BlogVizPage />} />
                <Route path="/herramientas/generador-informes" element={<ReportGeneratorPage />} />
                <Route path="/herramientas/redactor-ia" element={<ContentWriterPage />} />
            </Routes>
        </AnimatePresence>
    );
};

export default AnimatedRoutes;
