import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../../pages/Home';
import ServiceDetail from '../../pages/ServiceDetail';

const AnimatedRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/servicios/:slug" element={<ServiceDetail />} />


            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AnimatedRoutes;
