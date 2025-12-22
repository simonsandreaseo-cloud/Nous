import React from 'react';
import App from '../../components/tools/MetricsAnalyst/App';
import ToolWrapper from '../../components/layout/ToolWrapper';

const ReportGeneratorPage: React.FC = () => {
    return (
        <ToolWrapper backTo="/" backLabel="Volver al Inicio">
            <App />
        </ToolWrapper>
    );
};
export default ReportGeneratorPage;
