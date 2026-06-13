/**
 * Normaliza una cadena de texto para comparación:
 * - Convierte a minúsculas
 * - Elimina acentos/diacríticos
 * - Elimina caracteres no alfanuméricos (deja solo letras, números y espacios)
 * - Elimina espacios múltiples
 */
export function normalizeString(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // quita acentos
        .replace(/[^a-z0-9\s]/g, "") // quita puntuación
        .replace(/\s+/g, " ") // normaliza espacios
        .trim();
}

/**
 * Genera bigramas a partir de una cadena de texto.
 * Ej: "hola" -> ["ho", "ol", "la"]
 */
function getBigrams(str: string): string[] {
    const bigrams = [];
    for (let i = 0; i < str.length - 1; i++) {
        bigrams.push(str.slice(i, i + 2));
    }
    return bigrams;
}

/**
 * Calcula la similitud entre dos cadenas de texto usando el Coeficiente de Sørensen-Dice.
 * Devuelve un número entre 0 y 1 (1 = exacto).
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);

    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) return 0;

    const bg1 = getBigrams(s1);
    const bg2 = getBigrams(s2);

    let intersectionSize = 0;
    
    // Convertimos a array de booleanos o usamos un Map/Set para cruzar
    // Implementación eficiente para strings cortos (títulos)
    const usedBg2 = new Array(bg2.length).fill(false);
    
    for (let i = 0; i < bg1.length; i++) {
        for (let j = 0; j < bg2.length; j++) {
            if (bg1[i] === bg2[j] && !usedBg2[j]) {
                intersectionSize++;
                usedBg2[j] = true;
                break;
            }
        }
    }

    return (2.0 * intersectionSize) / (bg1.length + bg2.length);
}
