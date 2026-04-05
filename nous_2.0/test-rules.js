const uniqueRows = [
  { url: 'https://www.opticabassol.com/blogs/news/luxury-eyewear-collection', category: 'Blog' },
  { url: 'https://www.opticabassol.com/collections/gafas-de-sol', category: 'Colecciones' },
  { url: 'https://www.opticabassol.com/products/ray-ban-rj9052s', category: 'Prodcutos' },
  { url: 'https://www.opticabassol.com/pages/bassol-valencia', category: 'Otras Páginas' }
];

const rulesByCategory = {};
uniqueRows.forEach(row => {
    if (row.category && row.category !== "Otras") {
        if (!rulesByCategory[row.category]) rulesByCategory[row.category] = [];
        rulesByCategory[row.category].push(row.url);
    }
});

const suggestedRules = [];
Object.entries(rulesByCategory).forEach(([category, urls]) => {
    try {
        const paths = urls.map(u => {
            try { return new URL(u).pathname; } catch(e) { return null; }
        }).filter(p => p && p !== '/');
        
        if (paths.length === 0) return;

        const samplePath = paths[0];
        const segments = samplePath.split('/').filter(Boolean);
        if (segments.length >= 1) {
            const prefix = segments.length >= 2 
                ? `/${segments[0]}/${segments[1]}/.*`
                : `/${segments[0]}/.*`;
            
            suggestedRules.push({ name: category, regex: prefix });
        }
    } catch (e) {
        console.log("Error for category", category, e);
    }
});

console.log("Suggested Rules:", JSON.stringify(suggestedRules, null, 2));
