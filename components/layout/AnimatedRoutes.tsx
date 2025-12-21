import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../../pages/Home';
import ToolsDashboard from '../../pages/ToolsDashboard';
import SeoSuitePage from '../../pages/tools/SeoSuitePage';
import BlogVizPage from '../../pages/tools/BlogVizPage';
import ReportGeneratorPage from '../../pages/tools/ReportGeneratorPage';
import ContentWriterPage from '../../pages/tools/ContentWriterPage';
import ContentWriter2Page from '../../pages/tools/ContentWriter2Page';
import UserDashboard from '../../pages/UserDashboard';
import ServiceDetail from '../../pages/ServiceDetail';

const AnimatedRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/servicios/:slug" element={<ServiceDetail />} />
            <Route path="/herramientas" element={<ToolsDashboard />} />
            <Route path="/herramientas/seo-suite" element={<SeoSuitePage />} />
            <Route path="/herramientas/blog-viz" element={<BlogVizPage />} />
            <Route path="/herramientas/generador-informes" element={<ReportGeneratorPage />} />
            <Route path="/herramientas/redactor-ia" element={<ContentWriterPage />} />
            <Route path="/herramientas/redactor-ia/" element={<ContentWriterPage />} />
            <Route path="/herramientas/redactor-ia-2" element={<ContentWriter2Page />} />
            {/* Legacy path support */}
            <Route path="/herramientas/content-writer" element={<Navigate to="/herramientas/redactor-ia" replace />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AnimatedRoutes;
