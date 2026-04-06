export const calculateTFIDF = (documents: string[]): { keyword: string; score: number }[] => {
    if (!documents || documents.length === 0) return [];

    const stopwords = new Set(['esta', 'este', 'esas', 'esos', 'donde', 'desde', 'hasta', 'para', 'con', 'del', 'los', 'las', 'que', 'sus', 'como', 'una', 'un', 'el', 'la', 'en', 'de', 'por', 'sobre', 'entre', 'también', 'cuando', 'este', 'esta', 'estos', 'estas', 'pero', 'porque', 'nuestro', 'nuestra', 'desde', 'hasta']);

    const tokenize = (text: string) => {
        return text.toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3 && !stopwords.has(w));
    };

    const docFeaturized = documents.map(doc => {
        const tokens = tokenize(doc);
        const counts: Record<string, number> = {};
        tokens.forEach(t => counts[t] = (counts[t] || 0) + 1);
        return counts;
    });

    const allWords = new Set<string>();
    docFeaturized.forEach(doc => Object.keys(doc).forEach(w => allWords.add(w)));

    const scores = Array.from(allWords).map(word => {
        const df = docFeaturized.filter(doc => doc[word]).length;
        const idf = Math.log(documents.length / (1 + df));
        
        let tfSum = 0;
        docFeaturized.forEach(doc => {
            if (doc[word]) tfSum += doc[word];
        });
        const tf = tfSum / documents.length;

        return { keyword: word, score: tf * idf };
    });

    return scores.sort((a, b) => b.score - a.score).slice(0, 50);
};
