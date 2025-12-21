import React from 'react';
import App from '../../components/tools/ContentWriter2/index';
import ToolWrapper from '../../components/layout/ToolWrapper';

const ContentWriter2Page: React.FC = () => {
    return (
        <ToolWrapper backTo="/" backLabel="Volver al Inicio">
            <App />
        </ToolWrapper>
    );
};
export default ContentWriter2Page;
