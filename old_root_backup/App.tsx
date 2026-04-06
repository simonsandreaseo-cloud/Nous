import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CustomCursor from './components/ui/CustomCursor';
import AnimatedRoutes from './components/layout/AnimatedRoutes';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="antialiased selection:bg-brand-accent selection:text-brand-power bg-brand-white cursor-none">
          <CustomCursor />
          <Header />
          <AnimatedRoutes />
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;