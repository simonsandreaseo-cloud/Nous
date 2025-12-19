import React from 'react';
import App from '../../components/tools/ContentWriter/index';
import ToolWrapper from '../../components/layout/ToolWrapper';

const ContentWriterPage: React.FC = () => {
    return (
        <ToolWrapper backTo="/" backLabel="Volver al Inicio">
            <App />
        </ToolWrapper>
    );
};
export default ContentWriterPage;
