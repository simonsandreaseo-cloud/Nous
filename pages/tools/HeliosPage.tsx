import React from 'react';
import HeliosApp from '../../components/tools/Helios/HeliosApp';
import ToolWrapper from '../../components/layout/ToolWrapper';

const HeliosPage: React.FC = () => {
    return (
        <ToolWrapper breadcrumbs={[
            { label: 'Herramientas', path: '/herramientas' },
            { label: 'Helios AI Engine' }
        ]}>
            <HeliosApp />
        </ToolWrapper>
    );
};

export default HeliosPage;
