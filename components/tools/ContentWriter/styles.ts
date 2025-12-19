
export const styles = {
    // --- GLOBAL LAYOUT ---
    appLayout: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#F8FAFC'
    },
    navBar: {
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center', // Centered Menu
        padding: '0 24px',
        flexShrink: 0,
        zIndex: 50
    },
    navGroup: {
        display: 'flex',
        gap: '4px',
        height: '100%',
        alignItems: 'center'
    },
    navTab: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748B',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: '1px solid transparent',
        height: '40px'
    },
    navTabActive: {
        backgroundColor: '#F1F5F9',
        color: '#0F172A',
        borderColor: '#E2E8F0'
    },
    navTabDisabled: {
        opacity: 0.4,
        cursor: 'not-allowed',
        filter: 'grayscale(1)'
    },

    // --- OLD LAYOUTS ADAPTED ---

    // FULL SCREEN SETUP HUB (Now fits in flex)
    hubContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        overflowY: 'auto'
    },
    hubContent: {
        width: '100%',
        maxWidth: '1200px', // Wider for dashboard
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        paddingBottom: '60px', // Space for bottom scroll
        animation: 'fadeIn 0.6s ease-out'
    },
    hubHeader: {
        textAlign: 'center',
        marginBottom: '20px'
    },
    hubTitle: {
        fontFamily: "'Outfit', sans-serif",
        fontSize: '48px',
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: '12px',
        letterSpacing: '-0.02em'
    },
    hubSubtitle: {
        fontSize: '18px',
        color: '#64748B',
        fontWeight: '400'
    },

    // WORKSPACE LAYOUT (Generated State)
    workspaceContainer: {
        display: 'flex',
        width: '100%',
        height: '100%', // Changed from 100vh to fit parent
        backgroundColor: '#F8FAFC',
        overflow: 'hidden'
    },

    // --- LEFT SIDEBAR (Collapsible) ---
    sidebar: {
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 30,
        height: '100%',
        position: 'relative'
    },
    sidebarOpen: {
        width: '340px',
    },
    sidebarCollapsed: {
        width: '64px',
    },

    sidebarHeader: {
        height: '64px',
        borderBottom: '1px solid #F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0
    },
    toggleBtn: {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: '#94A3B8',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px'
    },

    // Sidebar Content
    sidebarContent: {
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        opacity: 1,
        transition: 'opacity 0.2s',
    },

    // Collapsed Icons Rail
    iconRail: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '20px',
        gap: '20px'
    },
    railIcon: {
        color: '#64748B',
        cursor: 'pointer',
        padding: '10px',
        borderRadius: '8px',
        transition: 'background 0.2s',
        display: 'flex',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        alignItems: 'center'
    },

    // --- MAIN CANVAS ---
    main: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: '#F1F5F9'
    },
    header: {
        height: '64px',
        backgroundColor: '#FFFFFF', // White header
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 32px',
        flexShrink: 0
    },
    contentArea: {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        padding: '40px'
    },
    paper: {
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '850px',
        height: '100%',
        borderRadius: '2px', // Sharper editorial feel
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        padding: '60px 80px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #E2E8F0'
    },
    articleScroll: {
        flex: 1,
        overflowY: 'auto',
        paddingRight: '10px' // Space for scrollbar
    },

    // --- RIGHT SIDEBAR (Tools) ---
    rightSidebar: {
        width: '320px',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 25
    },

    // --- COMPONENTS ---

    // Cards for Setup
    stepCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    stepTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: "'Outfit', sans-serif",
    },
    stepNumber: {
        backgroundColor: '#F1F5F9',
        color: '#0F172A',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: '700'
    },

    // Form Elements
    label: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#64748B',
        marginBottom: '8px',
        display: 'block',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontFamily: "'Outfit', sans-serif",
    },
    inputLarge: {
        width: '100%',
        padding: '20px 24px',
        fontSize: '24px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        outline: 'none',
        backgroundColor: '#F8FAFC',
        transition: 'all 0.2s',
        color: '#0F172A',
        fontFamily: "'Outfit', sans-serif",
        fontWeight: 500
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        fontSize: '14px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        outline: 'none',
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        transition: 'border-color 0.2s'
    },
    miniInput: {
        flex: 1,
        padding: '8px 12px',
        fontSize: '12px',
        borderRadius: '6px',
        border: '1px solid #E2E8F0',
        outline: 'none',
        backgroundColor: '#F8FAFC',
        color: '#0F172A'
    },
    miniAddBtn: {
        padding: '0 12px',
        backgroundColor: '#0F172A',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold'
    },
    textarea: {
        width: '100%',
        padding: '16px',
        fontSize: '14px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        outline: 'none',
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        minHeight: '100px',
        resize: 'vertical',
        lineHeight: '1.6'
    },
    select: {
        width: '100%',
        padding: '12px 16px',
        fontSize: '14px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        backgroundColor: '#F8FAFC',
        outline: 'none',
        cursor: 'pointer',
        color: '#0F172A'
    },
    outlineRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
    },

    // Big Action Button
    bigButton: {
        width: '100%',
        padding: '24px',
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        fontSize: '18px',
        fontWeight: '600',
        borderRadius: '16px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        transition: 'transform 0.1s, box-shadow 0.2s',
        boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1)',
        fontFamily: "'Outfit', sans-serif"
    },

    // Magic/Premium Button - NOW SIMPLIFIED
    magicButton: {
        // Just an alias for simple styling now as per request
    },

    // Dropzone
    dropzone: {
        border: '2px dashed #CBD5E1',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: '#F8FAFC',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
    },
    dropzoneActive: {
        borderColor: '#0F172A',
        backgroundColor: '#E2E8F0'
    },

    // Status
    statusText: {
        textAlign: 'center',
        color: '#64748B',
        fontSize: '14px',
        marginTop: '16px',
        fontStyle: 'italic'
    },

    // Standard Buttons
    button: {
        padding: '10px 16px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        backgroundColor: 'white',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#334155',
        transition: 'all 0.1s'
    },
    primaryBtn: {
        backgroundColor: '#0F172A',
        color: 'white',
        border: 'none'
    },
    accentBtn: {
        backgroundColor: '#6366F1',
        color: 'white',
        border: 'none'
    },

    // Right Sidebar Specifics
    inspectorHeader: {
        padding: '20px',
        borderBottom: '1px solid #F1F5F9',
        fontWeight: '600',
        color: '#0F172A',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: "'Outfit', sans-serif"
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#64748B',
        marginBottom: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    inspectorScroll: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
    },

    // New Tool Card for Sidebar (High Visibility)
    toolCard: {
        marginBottom: '16px',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    },
    toolCardHeader: {
        padding: '12px',
        backgroundColor: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#0F172A'
    },
    toolCardBody: {
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },

    visualCard: {
        display: 'flex',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        backgroundColor: 'white',
        textDecoration: 'none',
        color: 'inherit',
        fontSize: '13px',
        transition: 'box-shadow 0.2s',
        marginBottom: '8px'
    },
    schemaBox: {
        backgroundColor: '#1E293B',
        color: '#A5F3FC',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        overflowX: 'auto',
        fontFamily: 'monospace',
        position: 'relative'
    },

    // AI Image Cards
    aiImageCard: {
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        backgroundColor: 'white'
    },
    aiImagePreview: {
        aspectRatio: '16/9',
        backgroundColor: '#F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    aiImageMeta: {
        padding: '12px'
    },
    metaLabel: {
        fontSize: '10px',
        color: '#64748B',
        marginBottom: '2px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    },
    iconBtn: {
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #E2E8F0',
        backgroundColor: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#475569'
    },

    aiActions: {
        display: 'flex',
        gap: '8px',
        marginTop: '8px'
    },

    // Custom Size Inputs
    customSizeBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '8px',
        background: '#F1F5F9',
        padding: '8px',
        borderRadius: '8px'
    },
    smallInput: {
        width: '60px',
        padding: '6px',
        borderRadius: '4px',
        border: '1px solid #E2E8F0',
        fontSize: '12px',
        textAlign: 'center'
    },

    // --- METADATA PANEL STYLES ---
    metadataRow: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '16px'
    },
    metadataLabel: {
        fontSize: '11px',
        fontWeight: '700',
        color: '#94A3B8',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    metadataValue: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '13px',
        color: '#334155',
        lineHeight: '1.4',
        wordBreak: 'break-word',
        gap: '8px'
    },
    copyIconBtn: {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: '#64748B',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        transition: 'color 0.2s',
        flexShrink: 0
    },

    // --- SEO DASHBOARD GRID ---
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        width: '100%'
    },
    gridCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
    },
    gridCardTitle: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'Outfit', sans-serif"
    },

    // Links List (Cleaned)
    linkListContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '350px',
        overflowY: 'auto'
    },
    linkRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        borderRadius: '8px',
        borderBottom: '1px solid #F1F5F9',
        backgroundColor: '#FFFFFF',
        transition: 'background 0.1s',
    },
    linkBadge: (type: string) => ({
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderRadius: '6px',
        textAlign: 'center',
        color: type === 'product' ? '#166534' : type === 'collection' ? '#1E40AF' : '#854D0E',
        backgroundColor: type === 'product' ? '#DCFCE7' : type === 'collection' ? '#DBEAFE' : '#FEF9C3',
    }),
    urlLink: {
        color: '#6366F1',
        textDecoration: 'none',
        fontWeight: 400,
        fontSize: '12px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '300px'
    },

    // New Strategy Elements
    keywordTag: {
        padding: '6px 10px',
        backgroundColor: '#F1F5F9',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#334155',
        border: '1px solid #E2E8F0'
    },
    faqCard: {
        padding: '10px',
        backgroundColor: '#FFFBEB',
        color: '#92400E',
        fontSize: '12px',
        borderRadius: '6px',
        border: '1px solid #FEF3C7',
        fontStyle: 'italic'
    },

    // Loading Spinner
    spinner: {
        border: '2px solid rgba(255,255,255,0.3)',
        borderTop: '2px solid #ffffff',
        borderRadius: '50%',
        width: '16px',
        height: '16px',
        animation: 'spin 1s linear infinite'
    },
    // Adding animation style via js as inline styles can't handle @keyframes well in pure objects
    '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
    }
};

// Add keyframes via style tag injection for simplicity in this structure
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.article-content {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    line-height: 1.7;
    color: #1e293b;
    font-size: 16px;
}

.article-content h1 {
    font-family: 'Outfit', sans-serif;
    font-size: 36px;
    font-weight: 800;
    margin-bottom: 24px;
    color: #0f172a;
    line-height: 1.2;
}

.article-content h2 {
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 700;
    margin-top: 40px;
    margin-bottom: 16px;
    color: #0f172a;
    border-bottom: 2px solid #f1f5f9;
    padding-bottom: 8px;
}

.article-content h3 {
    font-family: 'Outfit', sans-serif;
    font-size: 22px;
    font-weight: 600;
    margin-top: 32px;
    margin-bottom: 12px;
    color: #1e293b;
}

.article-content h4 {
    font-family: 'Outfit', sans-serif;
    font-size: 18px;
    font-weight: 600;
    margin-top: 24px;
    margin-bottom: 8px;
    color: #334155;
}

.article-content p {
    margin-bottom: 20px;
}

.article-content ul, .article-content ol {
    margin-bottom: 20px;
    padding-left: 24px;
}

.article-content li {
    margin-bottom: 8px;
}

.article-content strong {
    font-weight: 700;
    color: #0f172a;
}

.article-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    font-size: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
}

.article-content th {
    background-color: #f8fafc;
    font-weight: 700;
    text-align: left;
    padding: 12px 16px;
    border-bottom: 2px solid #e2e8f0;
    color: #475569;
}

.article-content td {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #475569;
}

.article-content tr:last-child td {
    border-bottom: none;
}

.article-content tr:hover td {
    background-color: #f8fafc;
}

.article-content blockquote {
    border-left: 4px solid #6366f1;
    padding: 16px 24px;
    margin: 24px 0;
    background-color: #f5f7ff;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #4338ca;
}

.article-content a {
    color: #6366f1;
    text-decoration: underline;
    font-weight: 500;
}

.article-content img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 24px 0;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
`;
document.head.appendChild(styleSheet);
