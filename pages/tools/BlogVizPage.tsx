import React from 'react';
import App from '../../components/tools/BlogViz/App';
import ToolWrapper from '../../components/layout/ToolWrapper';

const BlogVizPage: React.FC = () => {
    return (
        <ToolWrapper breadcrumbs={[
            { label: 'Herramientas', path: '/herramientas' },
            { label: 'Blog Viz AI' }
        ]}>
            <App />
        </ToolWrapper>
    );
};
export default BlogVizPage;
