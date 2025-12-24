import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../../pages/Home';
import ToolsDashboard from '../../pages/ToolsDashboard';
import SeoSuitePage from '../../pages/tools/SeoSuitePage';
import BlogVizPage from '../../pages/tools/BlogVizPage';
import ReportGeneratorPage from '../../pages/tools/ReportGeneratorPage';
import ContentWriterPage from '../../pages/tools/ContentWriterPage';
import ContentWriter2Page from '../../pages/tools/ContentWriter2Page';
import TimeTrackerPage from '../../pages/tools/TimeTrackerPage';
import ProjectsDashboard from '../../pages/projects';
import PublicView from '../../pages/shared/PublicView';


// Project Layout & Pages
import ProjectLayout from '../../components/layouts/ProjectLayout';
import ProjectDashboard from '../../pages/projects/ProjectDashboard';
import StrategyView from '../../pages/projects/StrategyView';
import ProjectSettings from '../../pages/projects/ProjectSettings';
import TaskBoard from '../../components/projects/TaskBoard';
import { EditorialCalendar } from '../../components/projects/EditorialCalendar';
import VirtualOfficePage from '../virtual-office/VirtualOfficePage';

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
            <Route path="/herramientas/time-tracker" element={<TimeTrackerPage />} />
            {/* Legacy path support */}
            <Route path="/herramientas/content-writer" element={<Navigate to="/herramientas/redactor-ia" replace />} />

            {/* Projects Dashboard (List) */}
            <Route path="/proyectos" element={<ProjectsDashboard />} />

            {/* Project Workspace (Nested Routes) */}
            <Route path="/proyectos/:id" element={<ProjectLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ProjectDashboard />} />
                <Route path="tareas" element={<TaskBoard />} />
                <Route path="calendario" element={<EditorialCalendar />} />
                <Route path="estrategia" element={<StrategyView />} />
                <Route path="oficina" element={<VirtualOfficePage />} />
                <Route path="configuracion" element={<ProjectSettings />} />
            </Route>

            <Route path="/dashboard" element={<UserDashboard />} />

            {/* Public Shared Views */}
            <Route path="/compartir/:type/:token" element={<PublicView />} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AnimatedRoutes;
