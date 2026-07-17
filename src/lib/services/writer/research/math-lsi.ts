/**
 * Motor LSI Matemático (TF-IDF & N-Grams)
 * 
 * Reemplaza la extracción basada en LLMs por cálculos de frecuencia estadísticamente precisos.
 * Permite descubrir las keywords semánticas reales de un nicho procesando los Top N competidores.
 */

// Diccionario unificado y básico de Stop Words (Español + Inglés)
const STOP_WORDS = new Set([
    // Español
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u', 'de', 'del', 
    'a', 'al', 'en', 'por', 'para', 'con', 'sin', 'sobre', 'entre', 'hacia', 'hasta', 'desde', 
    'que', 'quien', 'quienes', 'cual', 'cuales', 'donde', 'cuando', 'como', 'porque', 
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 
    'todo', 'toda', 'todos', 'todas', 'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca', 
    'mas', 'menos', 'muy', 'tan', 'asi', 'tambien', 'tampoco', 'solo', 'solamente', 'incluso', 
    'aun', 'ademas', 'sino', 'pero', 'aunque', 'pues', 'entonces', 'luego', 'si', 'no', 'ni', 
    'ser', 'estar', 'es', 'son', 'fue', 'fueron', 'ha', 'han', 'he', 'has', 'hay', 'tener', 
    'tiene', 'tienen', 'hacer', 'hace', 'hacen', 'poder', 'puede', 'pueden', 'deber', 'debe', 
    'deben', 'decir', 'dice', 'dicen', 'ver', 've', 'ven', 'ir', 'va', 'van', 'dar', 'da', 
    'dan', 'saber', 'sabe', 'saben', 'querer', 'quiere', 'quieren', 'llegar', 'llegó',
    'su', 'sus', 'mi', 'tu', 'te', 'me', 'se', 'nos', 'os', 'le', 'les', 'lo', 'esto', 'eso',
    
    // Inglés (Para contenido técnico o anglicismos)
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while', 'of', 'at', 
    'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 
    'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 
    'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 
    'don', 'should', 'now', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 
    'had', 'do', 'does', 'did', 'this', 'that', 'these', 'those', 'it', 'its'
]);

export interface LSIKeyword {
    term: string;
    score: number;
    type: 'unigram' | 'bigram' | 'trigram';
}

export class MathLSIEngine {
    
    /**
     * Tokeniza un texto, lo pasa a minúsculas, elimina puntuación y stop words.
     */
    private static tokenize(text: string): string[] {
        if (!text) return [];
        // Normalizar acentos y pasar a minúsculas
        const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        // Extraer palabras (solo letras y números)
        const words = normalized.split(/[^a-z0-9]+/);
        // Filtrar stop words y palabras muy cortas
        return words.filter(w => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
    }

    /**
     * Genera N-Grams a partir de una lista de tokens.
     */
    private static generateNGrams(tokens: string[], n: number): string[] {
        const ngrams: string[] = [];
        for (let i = 0; i <= tokens.length - n; i++) {
            ngrams.push(tokens.slice(i, i + n).join(' '));
        }
        return ngrams;
    }

    /**
     * Extrae las palabras semánticas LSI usando TF-IDF a través de múltiples documentos.
     * @param documents Arreglo de strings, donde cada string es el contenido de un competidor.
     * @param topN Cuántas keywords retornar en total.
     */
    static extractLSI(documents: string[], topN: number = 30): LSIKeyword[] {
        if (!documents || documents.length === 0) return [];

        const numDocs = documents.length;
        const docTokens: string[][] = [];
        const docBigrams: string[][] = [];
        const docTrigrams: string[][] = [];
        
        // Frecuencia de documento (DF): en cuántos documentos aparece un término
        const dfMap = new Map<string, number>();

        // 1. Procesamiento Inicial
        for (const doc of documents) {
            const tokens = this.tokenize(doc);
            const bigrams = this.generateNGrams(tokens, 2);
            const trigrams = this.generateNGrams(tokens, 3);
            
            docTokens.push(tokens);
            docBigrams.push(bigrams);
            docTrigrams.push(trigrams);
            
            // Usar Sets para contar 1 vez por documento
            const uniqueTerms = new Set([...tokens, ...bigrams, ...trigrams]);
            for (const term of uniqueTerms) {
                dfMap.set(term, (dfMap.get(term) || 0) + 1);
            }
        }

        const scoreMap = new Map<string, number>();

        // 2. Cálculo de TF-IDF para cada término en cada documento
        for (let i = 0; i < numDocs; i++) {
            const terms = [...docTokens[i], ...docBigrams[i], ...docTrigrams[i]];
            const termCounts = new Map<string, number>();
            const docLength = terms.length;

            if (docLength === 0) continue;

            // Frecuencia del término en el documento actual (TF)
            for (const term of terms) {
                termCounts.set(term, (termCounts.get(term) || 0) + 1);
            }

            for (const [term, count] of termCounts.entries()) {
                const tf = count / docLength;
                const df = dfMap.get(term) || 1;
                // IDF: Inversa de la frecuencia de documentos (con smoothing)
                const idf = Math.log((numDocs + 1) / (df + 1)) + 1; 
                
                const tfidf = tf * idf;

                // Sumar al score global del término
                scoreMap.set(term, (scoreMap.get(term) || 0) + tfidf);
            }
        }

        // 3. Filtrado y Ordenamiento
        const results: LSIKeyword[] = [];
        for (const [term, score] of scoreMap.entries()) {
            const wordCount = term.split(' ').length;
            // Descartar términos que solo aparecen en 1 documento si hay múltiples documentos
            // Esto asegura que sean patrones reales de mercado y no jerga de un solo autor.
            if (numDocs > 1 && (dfMap.get(term) || 0) < 2) continue;
            
            let type: LSIKeyword['type'] = 'unigram';
            if (wordCount === 2) type = 'bigram';
            else if (wordCount === 3) type = 'trigram';

            results.push({ term, score, type });
        }

        // Ordenar por score descendente
        results.sort((a, b) => b.score - a.score);

        // Prevenir redundancia: Si un bigrama contiene a un unigrama con puntaje similar, 
        // priorizamos el bigrama por tener más contexto.
        const filteredResults: LSIKeyword[] = [];
        const seenWords = new Set<string>();

        for (const item of results) {
            // Un chequeo de redundancia simple
            const isRedundant = Array.from(seenWords).some(seen => 
                (seen.includes(item.term) || item.term.includes(seen)) && 
                Math.abs(item.term.length - seen.length) < 5
            );

            if (!isRedundant) {
                filteredResults.push(item);
                seenWords.add(item.term);
            }

            if (filteredResults.length >= topN) break;
        }

        return filteredResults;
    }
}
