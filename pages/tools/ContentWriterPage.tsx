import React from 'react';
import App from '../../components/tools/ContentWriter/index';
import ToolWrapper from '../../components/layout/ToolWrapper';

const ContentWriterPage: React.FC = () => {
    return (
        <ToolWrapper breadcrumbs={[
            { label: 'Herramientas', path: '/herramientas' },
            { label: 'Content Writer' }
        ]}>
            <App />
        </ToolWrapper>
    );
};
export default ContentWriterPage;
