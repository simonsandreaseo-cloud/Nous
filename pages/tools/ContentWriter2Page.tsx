import React from 'react';
import App from '../../components/tools/ContentWriter2/index';
import ToolWrapper from '../../components/layout/ToolWrapper';

const ContentWriter2Page: React.FC = () => {
    return (
        <ToolWrapper breadcrumbs={[
            { label: 'Herramientas', path: '/herramientas' },
            { label: 'Content Writer 2.0' }
        ]}>
            <App />
        </ToolWrapper>
    );
};
export default ContentWriter2Page;
