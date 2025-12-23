import React from 'react';
import App from '../../components/tools/SeoSuite/App';
import ToolWrapper from '../../components/layout/ToolWrapper';

const SeoSuitePage: React.FC = () => {
    return (
        <ToolWrapper breadcrumbs={[
            { label: 'Herramientas', path: '/herramientas' },
            { label: 'Navaja Suiza SEO' }
        ]}>
            <App />
        </ToolWrapper>
    );
};
export default SeoSuitePage;
