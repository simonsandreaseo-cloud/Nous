import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CustomCursor from './components/ui/CustomCursor';
import Home from './pages/Home';
import ToolsDashboard from './pages/ToolsDashboard';
import SeoSuitePage from './pages/tools/SeoSuitePage';
import BlogVizPage from './pages/tools/BlogVizPage';
import ReportGeneratorPage from './pages/tools/ReportGeneratorPage';
import ContentWriterPage from './pages/tools/ContentWriterPage';

const App: React.FC = () => {
  return (
    <Router>
      <div className="antialiased selection:bg-brand-accent selection:text-brand-power bg-brand-white cursor-none">
        <CustomCursor />
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/herramientas" element={<ToolsDashboard />} />
          <Route path="/herramientas/seo-suite" element={<SeoSuitePage />} />
          <Route path="/herramientas/blog-viz" element={<BlogVizPage />} />
          <Route path="/herramientas/generador-informes" element={<ReportGeneratorPage />} />
          <Route path="/herramientas/redactor-ia" element={<ContentWriterPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
};

export default App;