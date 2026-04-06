/**
 * Entorno seguro para extraer JSON de respuestas de IA que pueden contener markdown o texto adicional.
 */
export const safeJsonExtract = (text: string, fallback: any = []): any => {
    if (!text) return fallback;
    try {
        // 1. Intento directo
        return JSON.parse(text.trim());
    } catch (e) {
        try {
            // 2. Limpieza de bloques de código markdown
            const clean = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            
            // Buscar el primer '[' o '{' y el último ']' o '}'
            const startArr = clean.indexOf('[');
            const endArr = clean.lastIndexOf(']');
            const startObj = clean.indexOf('{');
            const endObj = clean.lastIndexOf('}');

            let finalJson = clean;
            
            if (startArr !== -1 && (startObj === -1 || startArr < startObj)) {
                finalJson = clean.substring(startArr, endArr + 1);
            } else if (startObj !== -1) {
                finalJson = clean.substring(startObj, endObj + 1);
            }

            return JSON.parse(finalJson);
        } catch (innerE) {
            console.warn("[JSON-Extract] Falló extracción segura:", text.substring(0, 100));
            return fallback;
        }
    }
};
