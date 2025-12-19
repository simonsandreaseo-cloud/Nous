import React from 'react';
import App from '../../components/tools/BlogViz/App';
import ToolWrapper from '../../components/layout/ToolWrapper';

const BlogVizPage: React.FC = () => {
    return (
        <ToolWrapper backTo="/" backLabel="Volver al Inicio">
            <App />
        </ToolWrapper>
    );
};
export default BlogVizPage;
