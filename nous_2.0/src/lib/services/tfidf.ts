export function calculateTFIDF(corpus: string[]): { keyword: string; score: number }[] {
  if (!corpus || corpus.length === 0) return [];

  // Stopwords extendidos (Español + Inglés + Web Noise) para limpiar el análisis SEO
  const stopwords = new Set([
     // Español
    'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'para', 'por', 'con', 'que', 'de', 'su', 'sus', 'lo', 'como', 'se', 'del', 'al', 'es', 'son', 'si', 'no', 'mi', 'tu', 'esta', 'este', 'esto', 'ese', 'eso', 'aquello', 'cuando', 'donde', 'quien', 'porque', 'pero', 'mas', 'muy', 'tan', 'ante', 'bajo', 'cabe', 'contra', 'desde', 'durante', 'entre', 'hacia', 'hasta', 'mediante', 'segun', 'sin', 'so', 'sobre', 'tras', 'versus', 'via', 'casa', 'todo', 'todos', 'bien', 'solo', 'ahora', 'despues', 'antes', 'luego', 'dentro', 'fuera', 'arriba', 'abajo',
    // Inglés (común en scrapings técnicos)
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'have', 'more', 'about', 'will', 'been', 'their', 'which', 'their', 'when', 'into', 'must', 'been', 'each', 'most', 'some', 'could', 'should', 'than', 'then', 'they', 'them', 'these', 'those', 'also', 'made', 'said', 'where', 'while', 'under', 'over', 'both', 'once', 'after', 'upon', 'been', 'here', 'there',
    // Web UI / Social Media Noise
    'instagram', 'facebook', 'twitter', 'click', 'button', 'share', 'close', 'open', 'menu', 'search', 'login', 'signup', 'account', 'profile', 'policy', 'cookies', 'terms', 'service', 'rights', 'reserved', 'copyright', 'contact', 'about', 'product', 'products', 'items', 'item', 'price', 'pricing', 'shipping', 'delivery', 'days', 'order', 'orders', 'meta', 'header', 'footer', 'sidebar', 'link', 'links', 'download'
  ]);

  const termDocs: Record<string, number> = {};
  const docCount = corpus.length;

  const docTerms = corpus.map(text => {
    // Normalización: Eliminar caracteres especiales y números aislados
    const tokens = text.toLowerCase()
      .replace(/[^\p{L}\s]/gu, ' ') // Solo letras (ignoramos números para LSI)
      .split(/\s+/)
      .filter(t => t.length > 3 && !stopwords.has(t));
    
    const uniqueTokens = new Set(tokens);
    uniqueTokens.forEach(token => {
      termDocs[token] = (termDocs[token] || 0) + 1;
    });
    
    return tokens;
  });

  const allUniqueTerms = Object.keys(termDocs);
  const tfidfResults = allUniqueTerms.map(term => {
    const idf = Math.log(docCount / (termDocs[term] || 1));
    let totalTf = 0;
    docTerms.forEach(tokens => {
      // TF Score: Frecuencia del término en cada documento
      const count = tokens.filter(t => t === term).length;
      totalTf += count / (tokens.length || 1);
    });
    
    return {
      keyword: term,
      score: (totalTf / docCount) * idf
    };
  });

  // Retornar top 50, ordenados por score de relevancia (TF-IDF)
  return tfidfResults.sort((a, b) => b.score - a.score).slice(0, 50);
}
