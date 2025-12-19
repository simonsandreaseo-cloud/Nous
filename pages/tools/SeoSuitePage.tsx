import React from 'react';
import App from '../../components/tools/SeoSuite/App';
import ToolWrapper from '../../components/layout/ToolWrapper';

const SeoSuitePage: React.FC = () => {
    return (
        <ToolWrapper backTo="/" backLabel="Volver al Inicio">
            <App />
        </ToolWrapper>
    );
};
export default SeoSuitePage;
