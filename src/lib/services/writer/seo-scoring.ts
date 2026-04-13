/**
 * SEO Scoring Service
 * Pure functions for calculating SEO scores and checks.
 * This service is context-agnostic and does not depend on React or any global state.
 */

export interface SEOScoringContext {
    keyword: string;
    content: string;
    metrics: {
        title: string;
        description: string;
        slug: string;
        h1: string;
    };
    links: { url: string; title?: string }[];
}

export interface SEOCheck {
    label: string;
    passed: boolean;
    score: number;
}

export interface RankMathResult {
    score: number;
    checks: SEOCheck[];
}

export interface YoastRule {
    text: string;
    status: 'good' | 'ok' | 'bad';
}

/**
 * Utility: Calculate word count
 */
export const getWordCount = (text: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Utility: Count occurrences of a string in text
 */
export const countOccurrences = (text: string, searchStr: string): number => {
    if (!searchStr) return 0;
    const regex = new RegExp(searchStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    return (text.match(regex) || []).length;
};

/**
 * Utility: Calculate keyword density
 */
export const calculateKeywordDensity = (text: string, searchStr: string): number => {
    if (!searchStr || !text) return 0;
    const occurrences = countOccurrences(text, searchStr);
    const searchWords = getWordCount(searchStr);
    const totalWords = getWordCount(text);
    if (totalWords === 0) return 0;
    return ((occurrences * searchWords) / totalWords) * 100;
};

/**
 * Rank Math Scoring Logic
 */
export const calculateRankMath = (context: SEOScoringContext): RankMathResult => {
    const { keyword, content, metrics, links } = context;
    let score = 0;
    const checks: SEOCheck[] = [];
    const hasKeyword = !!keyword;
    const wordCount = getWordCount(content);
    const primaryDensity = calculateKeywordDensity(content, keyword);

    // 1. Focus Keyword in SEO Title
    const keywordInTitle = hasKeyword && (metrics.title || '').toLowerCase().includes(keyword.toLowerCase());
    checks.push({ label: "Focus Keyword en el SEO Title", passed: keywordInTitle, score: 10 });
    if (keywordInTitle) score += 10;

    // 2. Focus Keyword in Meta Description
    const keywordInDesc = hasKeyword && (metrics.description || '').toLowerCase().includes(keyword.toLowerCase());
    checks.push({ label: "Focus Keyword en la Meta Descripción", passed: keywordInDesc, score: 10 });
    if (keywordInDesc) score += 10;

    // 3. Focus Keyword in URL
    const keywordInUrl = hasKeyword && (metrics.slug || '').toLowerCase().includes(keyword.toLowerCase().replace(/\s+/g, '-'));
    checks.push({ label: "Focus Keyword en la URL", passed: keywordInUrl, score: 10 });
    if (keywordInUrl) score += 10;

    // 4. Focus Keyword in first 10%
    const first10Percent = content.substring(0, Math.max(100, content.length * 0.1));
    const keywordInFirst10Percent = hasKeyword && first10Percent.toLowerCase().includes(keyword.toLowerCase());
    checks.push({ label: "Focus Keyword en el inicio del contenido", passed: keywordInFirst10Percent, score: 10 });
    if (keywordInFirst10Percent) score += 10;

    // 5. Content Length
    const isContentLongEnough = wordCount >= 600;
    checks.push({ label: `Longitud del contenido (${wordCount} palabras)`, passed: isContentLongEnough, score: 10 });
    if (isContentLongEnough) score += 10;

    // 6. Density
    const densityOk = primaryDensity >= 1.0;
    const densityViable = primaryDensity >= 0.5;
    checks.push({ label: `Densidad de Focus Keyword (${primaryDensity.toFixed(2)}%)`, passed: densityOk || densityViable, score: densityOk ? 10 : 5 });
    if (densityOk) score += 10;
    else if (densityViable) score += 5;

    // 7. Internal Links
    const hasInternalLinks = links.length > 0;
    checks.push({ label: `Enlaces internos (${links.length})`, passed: hasInternalLinks, score: 10 });
    if (hasInternalLinks) score += 10;

    // 8. Title Length
    const titleLength = (metrics.title || '').length;
    const titleLengthOk = titleLength > 40 && titleLength < 60;
    checks.push({ label: `Longitud del SEO Title (${titleLength} chars)`, passed: titleLengthOk, score: 10 });
    if (titleLengthOk) score += 10;

    // 9. Desc Length
    const descLength = (metrics.description || '').length;
    const descLengthOk = descLength > 120 && descLength < 160;
    checks.push({ label: `Longitud Meta Descripción (${descLength} chars)`, passed: descLengthOk, score: 10 });
    if (descLengthOk) score += 10;

    // 10. Subheadings
    const hasSubheadings = countOccurrences(content, '<h2') > 0 || countOccurrences(content, '##') > 0;
    checks.push({ label: "Uso de subtítulos (H2, H3)", passed: hasSubheadings, score: 10 });
    if (hasSubheadings) score += 10;

    return { score, checks };
};

/**
 * Yoast Scoring Logic
 */
export const calculateYoast = (context: SEOScoringContext): YoastRule[] => {
    const { keyword, content, metrics, links } = context;
    const rules: YoastRule[] = [];
    const hasKeyword = !!keyword;
    const wordCount = getWordCount(content);
    const primaryDensity = calculateKeywordDensity(content, keyword);

    // 1. Internal Links
    if (links.length > 0) {
        rules.push({ text: "Enlaces internos: Hay suficientes enlaces internos.", status: "good" });
    } else {
        rules.push({ text: "Enlaces internos: No hay enlaces internos. Añade algunos.", status: "bad" });
    }

    // 2. Introduction
    const firstParagrah = content.substring(0, 300);
    if (hasKeyword && firstParagrah.toLowerCase().includes(keyword.toLowerCase())) {
        rules.push({ text: "Frase clave en la introducción: ¡Bien hecho!", status: "good" });
    } else {
        rules.push({ text: "Frase clave en la introducción: La frase clave no aparece en el primer párrafo.", status: "bad" });
    }

    // 3. Keyphrase length / existence
    if (hasKeyword) {
        rules.push({ text: "Longitud de frase clave: ¡Buen trabajo!", status: "good" });
    } else {
        rules.push({ text: "Frase clave: No has establecido una frase clave.", status: "bad" });
    }

    // 4. Density
    if (primaryDensity === 0) {
        rules.push({ text: "Densidad de frase clave: La frase clave no se encontró.", status: "bad" });
    } else if (primaryDensity > 2.5) {
        rules.push({ text: `Densidad de frase clave: (${primaryDensity.toFixed(2)}%) es muy alta.`, status: "bad" });
    } else if (primaryDensity < 0.5) {
        rules.push({ text: `Densidad de frase clave: (${primaryDensity.toFixed(2)}%) es muy baja.`, status: "ok" });
    } else {
        rules.push({ text: `Densidad de frase clave: (${primaryDensity.toFixed(2)}%) Excelente.`, status: "good" });
    }

    // 5. Meta description length
    const descLength = (metrics.description || '').length;
    if (descLength === 0) {
        rules.push({ text: "Longitud meta descripción: No se ha especificado meta descripción.", status: "bad" });
    } else if (descLength < 120) {
        rules.push({ text: "Longitud meta descripción: Es muy corta.", status: "ok" });
    } else if (descLength > 156) {
        rules.push({ text: "Longitud meta descripción: Es muy larga.", status: "ok" });
    } else {
        rules.push({ text: "Longitud meta descripción: ¡Bien hecho!", status: "good" });
    }

    // 6. SEO Title width
    const titleLength = (metrics.title || '').length;
    if (titleLength === 0) {
        rules.push({ text: "Ancho del título SEO: Por favor crea un título SEO.", status: "bad" });
    } else if (titleLength < 40) {
        rules.push({ text: "Ancho del título SEO: Es muy corto.", status: "ok" });
    } else if (titleLength > 60) {
        rules.push({ text: "Ancho del título SEO: Es muy largo.", status: "ok" });
    } else {
        rules.push({ text: "Ancho del título SEO: ¡Buen trabajo!", status: "good" });
    }

    // 7. Text length
    if (wordCount < 300) {
        rules.push({ text: `Longitud del texto: El texto contiene ${wordCount} palabras. Es muy poco.`, status: "bad" });
    } else {
        rules.push({ text: `Longitud del texto: El texto contiene ${wordCount} palabras. ¡Buen trabajo!`, status: "good" });
    }

    return rules;
};
