import React from 'react';
import App from '../../components/tools/MetricsAnalyst/App';
import ToolWrapper from '../../components/layout/ToolWrapper';

const ReportGeneratorPage: React.FC = () => {
    return (
        <ToolWrapper breadcrumbs={[
            { label: 'Herramientas', path: '/herramientas' },
            { label: 'Analista de Métricas' }
        ]}>
            <App />
        </ToolWrapper>
    );
};
export default ReportGeneratorPage;
