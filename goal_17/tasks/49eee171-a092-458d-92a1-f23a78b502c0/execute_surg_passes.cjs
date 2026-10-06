const fs = require('fs');
const path = require('path');

const TASK_DIR = __dirname;
const BASE_FILE = path.join(TASK_DIR, 'latest_base.html');
const PASS1_FILE = path.join(TASK_DIR, 'surg_pass_1.html');
const PASS2_FILE = path.join(TASK_DIR, 'surg_pass_2.html');
const PASS3_FILE = path.join(TASK_DIR, 'surg_pass_3.html');

/**
 * Word-level Levenshtein distance
 */
function wordLevenshtein(words1, words2) {
    const m = words1.length;
    const n = words2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (words1[i - 1] === words2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1],     // insertion
                    dp[i - 1][j - 1]  // substitution
                );
            }
        }
    }
    return dp[m][n];
}

/**
 * Word-level Longest Common Subsequence (LCS)
 */
function wordLCS(words1, words2) {
    const m = words1.length;
    const n = words2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (words1[i - 1] === words2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}

/**
 * Extract HTML tags in order to ensure zero tag disruption
 */
function extractTags(html) {
    return (html.match(/<[^>]+>/g) || []).map(t => t.toLowerCase());
}

/**
 * Extract chunks matching standard pipeline regex
 */
const CHUNK_REGEX = /(<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>|<p\b[^>]*>[\s\S]*?<\/p>|<li\b[^>]*>[\s\S]*?<\/li>|<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<th\b[^>]*>[\s\S]*?<\/th>|<td\b[^>]*>[\s\S]*?<\/td>)/gi;

function extractChunks(html) {
    const chunks = [];
    let m;
    const re = new RegExp(CHUNK_REGEX);
    while ((m = re.exec(html)) !== null) {
        chunks.push(m[0]);
    }
    return chunks;
}

/**
 * PASS 1 REPLACEMENTS: Applied to latest_base.html
 * 1 targeted single-word vocabulary upgrade per eligible chunk (50 chunks)
 */
const PASS1_REPLACEMENTS = [
    // Line 2 (Chunk 1, 44w): tela -> tejido (1w, 2.27%)
    ['Examinar la tela', 'Examinar el tejido'],
    // Line 4 (Chunk 3, 24w): look -> estilo (1w, 4.17%)
    ['el look de verano', 'el estilo de verano'],
    // Line 6 (Chunk 5, 59w): livianas -> ligeras (1w, 1.69%)
    ['bastante livianas,', 'bastante ligeras,'],
    // Line 9 (Chunk 8, 77w): cuidan -> protegen (1w, 1.30%)
    ['te cuidan del sol', 'te protegen del sol'],
    // Line 12 (Chunk 11, 71w): ponerse -> lucir (1w, 1.41%)
    ['quiere ponerse lo mismo.', 'quiere lucir lo mismo.'],
    // Line 14 (Chunk 13, 70w): marcos -> armazones (1w, 1.43%)
    ['marcos resistentes.', 'armazones resistentes.'],
    // Line 16 (Chunk 15, 30w): regular -> convencional (1w, 3.33%)
    ['la indumentaria regular,', 'la indumentaria convencional,'],
    // Line 19 (Chunk 17, 30w): tiesas -> rígidas (1w, 3.33%)
    ['hombreras tiesas ni', 'hombreras rígidas ni'],
    // Line 20 (Chunk 18, 45w): lados -> partes (1w, 2.22%)
    ['en todos lados,', 'en todas partes,'],
    // Line 21 (Chunk 19, 40w): bien -> muy (1w, 2.50%)
    ['algodón bien fino,', 'algodón muy fino,'],
    // Line 22 (Chunk 20, 37w): tiras -> ceñidores (1w, 2.70%)
    ['tiras en la cintura,', 'ceñidores en la cintura,'],
    // Line 23 (Chunk 21, 53w): liviana -> ligera (1w, 1.89%)
    ['tela liviana también', 'tela ligera también'],
    // Line 25 (Chunk 22, 75w): fácil -> sencillo (1w, 1.33%)
    ['para combinar fácil,', 'para combinar sencillo,'],
    // Line 27 (Chunk 24, 28w): vital -> crucial (1w, 3.57%)
    ['es vital para asegurar', 'es crucial para asegurar'],
    // Line 29 (Chunk 26, 77w): clarito -> claramente (1w, 1.30%)
    ['notas los hilos clarito,', 'notas los hilos claramente,'],
    // Line 31 (Chunk 28, 77w): bien -> muy (1w, 1.30%)
    ['algodón bien reforzada,', 'algodón muy reforzada,'],
    // Line 33 (Chunk 30, 83w): meten -> aplican (1w, 1.20%)
    ['le meten una capa', 'le aplican una capa'],
    // Line 65 (Chunk 48, 59w): puso -> incorporó (1w, 1.69%)
    ['puso por todos lados', 'incorporó por todos lados'],
    // Line 66 (Chunk 49, 87w): gustaba -> atraía (1w, 1.15%)
    ['les gustaba todo el tema ecuestre,', 'les atraía todo el tema ecuestre,'],
    // Line 67 (Chunk 50, 77w): rápido -> pronto (1w, 1.30%)
    ['ubica rápido las franjas', 'ubica pronto las franjas'],
    // Line 68 (Chunk 51, 63w): nota -> percibe (1w, 1.59%)
    ['cuero liso, casi no se nota', 'cuero liso, casi no se percibe'],
    // Line 70 (Chunk 53, 50w): sacando -> creando (1w, 2.00%)
    ['años sacando calzado', 'años creando calzado'],
    // Line 72 (Chunk 55, 98w): medio -> algo (1w, 1.02%)
    ['punta es medio ovalada,', 'punta es algo ovalada,'],
    // Line 74 (Chunk 57, 92w): ven -> aprecian (1w, 1.09%)
    ['así que se ven usados', 'así que se aprecian usados'],
    // Line 76 (Chunk 59, 89w): livianas -> ligeras (1w, 1.12%)
    ['muy livianas y la', 'muy ligeras y la'],
    // Line 78 (Chunk 61, 41w): genera -> ocasiona (1w, 2.44%)
    ['genera inconvenientes.', 'ocasiona inconvenientes.'],
    // Line 80 (Chunk 63, 48w): usa -> emplea (1w, 2.08%)
    ['Gucci usa hormas', 'Gucci emplea hormas'],
    // Line 82 (Chunk 64, 22w): viene -> pasa (1w, 4.55%)
    ['25.0 cm, viene a ser', '25.0 cm, pasa a ser'],
    // Line 83 (Chunk 65, 25w): parecido -> similar (1w, 4.00%)
    ['siendo parecido a una', 'siendo similar a una'],
    // Line 84 (Chunk 66, 23w): usas -> empleas (1w, 4.35%)
    ['si usas esas referencias.', 'si empleas esas referencias.'],
    // Line 85 (Chunk 67, 27w): largo -> longitud (1w, 3.70%)
    ['de largo, equivale a', 'de longitud, equivale a'],
    // Line 86 (Chunk 68, 27w): largo -> longitud (1w, 3.70%)
    ['de largo, queda casi', 'de longitud, queda casi'],
    // Line 87 (Chunk 69, 27w): usas -> empleas (1w, 3.70%)
    ['si usas talla 11', 'si empleas talla 11'],
    // Line 88 (Chunk 70, 33w): aprieta -> oprime (1w, 3.03%)
    ['no te aprieta a', 'no te oprime a'],
    // Line 90 (Chunk 71, 64w): estira -> dilata (1w, 1.56%)
    ['el cuero se estira con', 'el cuero se dilata con'],
    // Line 92 (Chunk 73, 48w): simple -> sencilla (1w, 2.08%)
    ['forma bastante simple,', 'forma bastante sencilla,'],
    // Line 94 (Chunk 74, 25w): floja -> holgada (1w, 4.00%)
    ['nada floja.', 'nada holgada.'],
    // Line 95 (Chunk 75, 23w): aprieta -> oprime (1w, 4.35%)
    ['no aprieta nada.', 'no oprime nada.'],
    // Line 96 (Chunk 76, 28w): aprieta -> oprime (1w, 3.57%)
    ['ni aprieta nada cuando', 'ni oprime nada cuando'],
    // Line 97 (Chunk 77, 32w): justo -> ceñido (1w, 3.13%)
    ['que quede justo.', 'que quede ceñido.'],
    // Line 98 (Chunk 78, 25w): suelta -> holgada (1w, 4.00%)
    ['queda bastante suelta,', 'queda bastante holgada,'],
    // Line 100 (Chunk 79, 53w): ancha -> amplia (1w, 1.89%)
    ['bastante ancha. Varios', 'bastante amplia. Varios'],
    // Line 102 (Chunk 81, 56w): medio -> algo (1w, 1.79%)
    ['siente medio raro frente', 'siente algo raro frente'],
    // Line 104 (Chunk 83, 125w): usar -> vestir (1w, 0.80%)
    ['lo mejor es usar ropa', 'lo mejor es vestir ropa'],
    // Line 106 (Chunk 85, 150w): liviana -> ligera (1w, 0.67%)
    ['bomber liviana de nailon', 'bomber ligera de nailon'],
    // Line 108 (Chunk 87, 149w): aguanta -> soporta (1w, 0.67%)
    ['Nadie aguanta un traje', 'Nadie soporta un traje'],
    // Line 110 (Chunk 89, 33w): piezas -> artículos (1w, 3.03%)
    ['piezas de lujo requiere diligencia,', 'artículos de lujo requiere diligencia,'],
    // Line 112 (Chunk 91, 94w): agarra -> toma (1w, 1.06%)
    ['agarra un trapo blanco', 'toma un trapo blanco'],
    // Line 114 (Chunk 93, 92w): rápido -> pronto (1w, 1.09%)
    ['humedad rápido, ayuda bastante', 'humedad pronto, ayuda bastante'],
    // Line 116 (Chunk 95, 67w): fuertes -> agresivos (1w, 1.49%)
    ['limpiadores comerciales fuertes que', 'limpiadores comerciales agresivos que']
];

/**
 * PASS 2 REPLACEMENTS: Applied cumulatively on top of PASS 1
 * 1 targeted single-word vocabulary upgrade per eligible chunk (50 chunks)
 */
const PASS2_REPLACEMENTS = [
    // Line 2 (Chunk 1, 44w): vital -> crucial (1w, 2.27%)
    ['es vital para determinar', 'es crucial para determinar'],
    // Line 4 (Chunk 3, 24w): atuendo -> conjunto (1w, 4.17%)
    ['cualquier atuendo masculino', 'cualquier conjunto masculino'],
    // Line 6 (Chunk 5, 59w): fácil -> fácilmente (wait: fácil -> con soltura is 2 words. 1w: "diseño que llama la atención" -> "diseño que atrae la atención", llama -> atrae, 1w, 1.69%)
    ['diseño que llama la atención', 'diseño que atrae la atención'],
    // Line 9 (Chunk 8, 77w): tapan -> bloquean (1w, 1.30%)
    ['Te tapan bien los', 'Te bloquean bien los'],
    // Line 12 (Chunk 11, 71w): cara -> rostro (1w, 1.41%)
    ['cubre bien la cara,', 'cubre bien el rostro,'],
    // Line 14 (Chunk 13, 70w): suave -> fluido (1w, 1.43%)
    ['si abren suave y', 'si abren fluido y'],
    // Line 16 (Chunk 15, 30w): relajadas -> holgadas (1w, 3.33%)
    ['siluetas relajadas y', 'siluetas holgadas y'],
    // Line 19 (Chunk 17, 30w): fácil -> fluido (1w, 3.33%)
    ['la tela se mueve fácil y', 'la tela se mueve fluido y'],
    // Line 20 (Chunk 18, 45w): dibujos -> motivos (1w, 2.22%)
    ['o dibujos geométricos,', 'o motivos geométricos,'],
    // Line 21 (Chunk 19, 40w): sirven -> ayudan (1w, 2.50%)
    ['sirven un montón si', 'ayudan un montón si'],
    // Line 22 (Chunk 20, 37w): quedan -> lucen (1w, 2.70%)
    ['que quedan bien,', 'que lucen bien,'],
    // Line 23 (Chunk 21, 53w): salvan -> protegen (1w, 1.89%)
    ['y te salvan, o', 'y te protegen, o'],
    // Line 25 (Chunk 22, 75w): onda -> estética (1w, 1.33%)
    ['la onda deportiva se', 'la estética deportiva se'],
    // Line 27 (Chunk 24, 28w): evaluar -> examinar (1w, 3.57%)
    ['evaluar el material es', 'examinar el material es'],
    // Line 29 (Chunk 26, 77w): rápido -> pronto (1w, 1.30%)
    ['se mancha rápido con', 'se mancha pronto con'],
    // Line 31 (Chunk 28, 77w): dibujo -> motivo (1w, 1.30%)
    ['el típico dibujo de', 'el típico motivo de'],
    // Line 33 (Chunk 30, 83w): medio -> algo (1w, 1.20%)
    ['siente medio liso pero', 'siente algo liso pero'],
    // Line 65 (Chunk 48, 59w): vieja -> clásica (1w, 1.69%)
    ['la historia vieja de', 'la historia clásica de'],
    // Line 66 (Chunk 49, 87w): meten -> integran (1w, 1.15%)
    ['También lo meten en', 'También lo integran en'],
    // Line 67 (Chunk 50, 77w): bien -> muy (1w, 1.30%)
    ['jacquard bien dura, así', 'jacquard muy dura, así'],
    // Line 68 (Chunk 51, 63w): pegue -> incida (1w, 1.59%)
    ['le pegue la luz', 'le incida la luz'],
    // Line 70 (Chunk 53, 50w): mirar -> examinar (1w, 2.00%)
    ['la pena mirar bien', 'la pena examinar bien'],
    // Line 72 (Chunk 55, 98w): bien -> muy (1w, 1.02%)
    ['cueros bien suaves,', 'cueros muy suaves,'],
    // Line 74 (Chunk 57, 92w): raspones -> marcas (1w, 1.09%)
    ['les dejan raspones por', 'les dejan marcas por'],
    // Line 76 (Chunk 59, 89w): dibujos -> motivos (1w, 1.12%)
    ['retro o dibujos bien', 'retro o motivos bien'],
    // Line 78 (Chunk 61, 41w): diferente -> distinto (1w, 2.44%)
    ['diferente a los sistemas', 'distinto a los sistemas'],
    // Line 80 (Chunk 63, 48w): sueltos -> holgados (1w, 2.08%)
    ['quedan más sueltos que', 'quedan más holgados que'],
    // Line 82 (Chunk 64, 22w): corresponde -> aplica (1w, 4.55%)
    ['en UK corresponde a', 'en UK aplica a'],
    // Line 83 (Chunk 65, 25w): Tienen -> Miden (1w, 4.00%)
    ['Talla IT 40:</strong> Tienen como', 'Talla IT 40:</strong> Miden como'],
    // Line 84 (Chunk 66, 23w): queda -> resulta (1w, 4.35%)
    ['esto te queda casi', 'esto te resulta casi'],
    // Line 85 (Chunk 67, 27w): equivale -> corresponde (1w, 3.70%)
    ['longitud, equivale a una', 'longitud, corresponde a una'],
    // Line 86 (Chunk 68, 27w): medida -> dimensión (1w, 3.70%)
    ['para esta medida.', 'para esta dimensión.'],
    // Line 87 (Chunk 69, 27w): Mide -> Alcanza (1w, 3.70%)
    ['Talla IT 44:</strong> Mide cerca', 'Talla IT 44:</strong> Alcanza cerca'],
    // Line 88 (Chunk 70, 33w): largo -> longitud (1w, 3.03%)
    ['centímetros de largo, equivale', 'centímetros de longitud, equivale'],
    // Line 90 (Chunk 71, 64w): tema -> caso (1w, 1.56%)
    ['el tema es distinto,', 'el caso es distinto,'],
    // Line 92 (Chunk 73, 48w): sirve -> corresponde (1w, 2.08%)
    ['le sirve a alguien', 'le corresponde a alguien'],
    // Line 94 (Chunk 74, 25w): contextura -> complexión (1w, 4.00%)
    ['contextura delgada te', 'complexión delgada te'],
    // Line 95 (Chunk 75, 23w): queda -> sienta (1w, 4.35%)
    ['sastre y te queda bien al cuerpo', 'sastre y te sienta bien al cuerpo'],
    // Line 96 (Chunk 76, 28w): queda -> sienta (1w, 3.57%)
    ['pecho, te queda bien al cuerpo y', 'pecho, te sienta bien al cuerpo y'],
    // Line 97 (Chunk 77, 32w): sirve -> ayuda (1w, 3.13%)
    ['sirve un montón si', 'ayuda un montón si'],
    // Line 98 (Chunk 78, 25w): ancha -> amplia (1w, 4.00%)
    ['prenda ancha y', 'prenda amplia y'],
    // Line 100 (Chunk 79, 53w): resorte -> elástico (1w, 1.89%)
    ['traen resorte en', 'traen elástico en'],
    // Line 102 (Chunk 81, 56w): simples -> sencillas (1w, 1.79%)
    ['tres propuestas simples para', 'tres propuestas sencillas para'],
    // Line 104 (Chunk 83, 125w): telas -> tejidos (1w, 0.80%)
    ['telas mate para', 'tejidos mate para'],
    // Line 106 (Chunk 85, 150w): fácil -> sencillo (1w, 0.67%)
    ['combinan fácil con todo.', 'combinan sencillo con todo.'],
    // Line 108 (Chunk 87, 149w): telas -> tejidos (1w, 0.67%)
    ['telas suaves que', 'tejidos suaves que'],
    // Line 110 (Chunk 89, 33w): amenazan -> comprometen (1w, 3.03%)
    ['amenazan los textiles.', 'comprometen los textiles.'],
    // Line 112 (Chunk 91, 94w): común -> ordinaria (1w, 1.06%)
    ['tintorería común, los', 'tintorería ordinaria, los'],
    // Line 114 (Chunk 93, 92w): feo -> mal (1w, 1.09%)
    ['no huelan feo y', 'no huelan mal y'],
    // Line 116 (Chunk 95, 67w): poco -> breve (1w, 1.49%)
    ['en poco tiempo,', 'en breve tiempo,']
];

/**
 * PASS 3 REPLACEMENTS: Applied cumulatively on top of PASS 2
 * 1 targeted single-word vocabulary upgrade per eligible chunk (50 chunks)
 */
const PASS3_REPLACEMENTS = [
    // Line 2 (Chunk 1, 44w): utilidad -> funcionalidad (1w, 2.27%)
    ['su utilidad diaria.', 'su funcionalidad diaria.'],
    // Line 4 (Chunk 3, 24w): premium -> selectas (1w, 4.17%)
    ['unas gafas de sol premium redefinen', 'unas gafas de sol selectas redefinen'],
    // Line 6 (Chunk 5, 59w): puestas -> colocadas (1w, 1.69%)
    ['llevar puestas todo', 'llevar colocadas todo'],
    // Line 9 (Chunk 8, 77w): vuelta -> paseo (1w, 1.30%)
    ['dar una vuelta.', 'dar un paseo.'],
    // Line 12 (Chunk 11, 71w): gente -> público (1w, 1.41%)
    ['tanta gente busca referencias', 'tanto público busca referencias'],
    // Line 14 (Chunk 13, 70w): miran -> revisan (1w, 1.43%)
    ['miran el grabado del', 'revisan el grabado del'],
    // Line 16 (Chunk 15, 30w): preservando -> manteniendo (1w, 3.33%)
    ['preservando su sofisticación', 'manteniendo su sofisticación'],
    // Line 19 (Chunk 17, 30w): ponértelos -> vestirlos (1w, 3.33%)
    ['al ponértelos.', 'al vestirlos.'],
    // Line 20 (Chunk 18, 45w): sirven -> ayudan (1w, 2.22%)
    ['te sirven bastante para', 'te ayudan bastante para'],
    // Line 21 (Chunk 19, 40w): rápido -> pronto (1w, 2.50%)
    ['te vistes rápido.', 'te vistes pronto.'],
    // Line 22 (Chunk 20, 37w): arreglado -> distinguido (1w, 2.70%)
    ['te ves arreglado para', 'te ves distinguido para'],
    // Line 23 (Chunk 21, 53w): rápido -> pronto (1w, 1.89%)
    ['toca abrigarse rápido.', 'toca abrigarse pronto.'],
    // Line 25 (Chunk 22, 75w): lados -> partes (1w, 1.33%)
    ['en todos lados ahora.', 'en todas partes ahora.'],
    // Line 27 (Chunk 24, 28w): frecuente -> constante (1w, 3.57%)
    ['uso frecuente y', 'uso constante y'],
    // Line 29 (Chunk 26, 77w): ropa -> prenda (1w, 1.30%)
    ['como ropa común.', 'como prenda común.'],
    // Line 31 (Chunk 28, 77w): ponen -> aplican (1w, 1.30%)
    ['le ponen un tratamiento', 'le aplican un tratamiento'],
    // Line 33 (Chunk 30, 83w): hacen -> confeccionan (1w, 1.20%)
    ['hacen tantas carteras o', 'confeccionan tantas carteras o'],
    // Line 65 (Chunk 48, 59w): adorno -> ornamento (1w, 1.69%)
    ['nada más de adorno.', 'nada más de ornamento.'],
    // Line 66 (Chunk 49, 87w): ve -> aprecia (1w, 1.15%)
    ['se ve bien y', 'se aprecia bien y'],
    // Line 67 (Chunk 50, 77w): medio -> algo (1w, 1.30%)
    ['un toque medio retro', 'un toque algo retro'],
    // Line 68 (Chunk 51, 63w): probando -> evidenciando (1w, 1.59%)
    ['probando esta idea del', 'evidenciando esta idea del'],
    // Line 70 (Chunk 53, 50w): traen -> presentan (1w, 2.00%)
    ['qué detalles traen.', 'qué detalles presentan.'],
    // Line 72 (Chunk 55, 98w): tranquilo -> relajado (1w, 1.02%)
    ['caminar tranquilo en vacaciones.', 'caminar relajado en vacaciones.'],
    // Line 74 (Chunk 57, 92w): andar -> caminar (1w, 1.09%)
    ['para andar cómodo o', 'para caminar cómodo o'],
    // Line 76 (Chunk 59, 89w): salvan -> resuelven (1w, 1.12%)
    ['las zapatillas te salvan todo', 'las zapatillas te resuelven todo'],
    // Line 78 (Chunk 61, 41w): garantizar -> asegurar (1w, 2.44%)
    ['garantizar la talla correcta.', 'asegurar la talla correcta.'],
    // Line 80 (Chunk 63, 48w): comunes -> habituales (1w, 2.08%)
    ['unos tenis comunes y', 'unos tenis habituales y'],
    // Line 82 (Chunk 64, 22w): Equivale -> Corresponde (1w, 4.55%)
    ['Talla IT 39:</strong> Equivale a', 'Talla IT 39:</strong> Corresponde a'],
    // Line 83 (Chunk 65, 25w): largo -> longitud (1w, 4.00%)
    ['de largo, que viene', 'de longitud, que viene'],
    // Line 84 (Chunk 66, 23w): Son -> Miden (1w, 4.35%)
    ['Talla IT 41:</strong> Son 26.6', 'Talla IT 41:</strong> Miden 26.6'],
    // Line 85 (Chunk 67, 27w): Mide -> Alcanza (1w, 3.70%)
    ['Talla IT 42:</strong> Mide unos', 'Talla IT 42:</strong> Alcanza unos'],
    // Line 86 (Chunk 68, 27w): queda -> resulta (1w, 3.70%)
    ['longitud, queda casi como', 'longitud, resulta casi como'],
    // Line 87 (Chunk 69, 27w): queda -> sienta (1w, 3.70%)
    ['te queda bien si', 'te sienta bien si'],
    // Line 88 (Chunk 70, 33w): justo -> exacto (1w, 3.03%)
    ['equivale casi justo a', 'equivale casi exacto a'],
    // Line 90 (Chunk 71, 64w): relleno -> acolchado (1w, 1.56%)
    ['bastante relleno adentro,', 'bastante acolchado adentro,'],
    // Line 92 (Chunk 73, 48w): lado -> parte (1w, 2.08%)
    ['casi cualquier lado.', 'casi cualquier parte.'],
    // Line 94 (Chunk 74, 25w): quedar -> sentar (1w, 4.00%)
    ['va a quedar bastante bien,', 'va a sentar bastante bien,'],
    // Line 95 (Chunk 75, 23w): medida -> dimensión (1w, 4.35%)
    ['la medida clásica de', 'la dimensión clásica de'],
    // Line 96 (Chunk 76, 28w): siempre -> antaño (1w, 3.57%)
    ['corte clásico de siempre,', 'corte clásico de antaño,'],
    // Line 97 (Chunk 77, 32w): grandes -> robustos (1w, 3.13%)
    ['brazos grandes, siempre', 'brazos robustos, siempre'],
    // Line 98 (Chunk 78, 25w): diario -> cotidiano (1w, 4.00%)
    ['para el diario.', 'para el cotidiano.'],
    // Line 100 (Chunk 79, 53w): comprar -> adquirir (1w, 1.89%)
    ['al comprar pantalones', 'al adquirir pantalones'],
    // Line 102 (Chunk 81, 56w): Comprar -> Adquirir (1w, 1.79%)
    ['Comprar ropa de esta', 'Adquirir ropa de esta'],
    // Line 104 (Chunk 83, 125w): pegar -> calentar (1w, 0.80%)
    ['va a pegar fuerte.', 'va a calentar fuerte.'],
    // Line 106 (Chunk 85, 150w): andar -> caminar (1w, 0.67%)
    ['para andar todo el', 'para caminar todo el'],
    // Line 108 (Chunk 87, 149w): Agarra -> Elige (1w, 0.67%)
    ['Agarra un bolso de mano', 'Elige un bolso de mano'],
    // Line 110 (Chunk 89, 33w): garantice -> asegure (1w, 3.03%)
    ['garantice un almacenamiento óptimo.', 'asegure un almacenamiento óptimo.'],
    // Line 112 (Chunk 91, 94w): fuertes -> agresivos (1w, 1.06%)
    ['jabones fuertes que arruinen', 'jabones agresivos que arruinen'],
    // Line 114 (Chunk 93, 92w): echarles -> aplicarles (1w, 1.09%)
    ['echarles spray para el', 'aplicarles spray para el'],
    // Line 116 (Chunk 95, 67w): arruinando -> dañando (1w, 1.49%)
    ['terminas arruinando esos', 'terminas dañando esos']
];

function applyReplacements(content, replacements, passLabel) {
    let modified = content;
    for (let idx = 0; idx < replacements.length; idx++) {
        const [target, replacement] = replacements[idx];
        if (!modified.includes(target)) {
            throw new Error(`[${passLabel}] Target #${idx} not found in content: "${target}"`);
        }
        // Ensure uniqueness: target should appear exactly once
        const count = modified.split(target).length - 1;
        if (count > 1) {
            throw new Error(`[${passLabel}] Target #${idx} appears multiple times (${count}): "${target}"`);
        }
        modified = modified.replace(target, replacement);
    }
    return modified;
}

function verifyStrictLimits(prevContent, newContent, passLabel) {
    const prevChunks = extractChunks(prevContent);
    const newChunks = extractChunks(newContent);

    if (prevChunks.length !== newChunks.length) {
        throw new Error(`[${passLabel}] Chunk count mismatch: ${prevChunks.length} vs ${newChunks.length}`);
    }

    let maxLevRatio = 0;
    let maxLcsRatio = 0;
    let editedChunksCount = 0;

    for (let i = 0; i < prevChunks.length; i++) {
        const pRaw = prevChunks[i];
        const nRaw = newChunks[i];

        const pText = pRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const nText = nRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        const pWords = pText.split(/\s+/).filter(Boolean);
        const nWords = nText.split(/\s+/).filter(Boolean);

        const m = pWords.length;
        if (m === 0) continue;

        const levDist = wordLevenshtein(pWords, nWords);
        const lcs = wordLCS(pWords, nWords);
        const lcsEdits = m - lcs;

        const levRatio = levDist / m;
        const lcsRatio = lcsEdits / m;

        if (levDist > 0) {
            editedChunksCount++;
        }

        if (levRatio > maxLevRatio) maxLevRatio = levRatio;
        if (lcsRatio > maxLcsRatio) maxLcsRatio = lcsRatio;

        if (levRatio >= 0.05 || lcsRatio >= 0.05) {
            throw new Error(`[${passLabel}] STRICT LIMIT VIOLATION on Chunk ${i}: Lev=${(levRatio * 100).toFixed(2)}%, LCS=${(lcsRatio * 100).toFixed(2)}% (Max permitted < 5.00%).\nPrev words: ${m}, LevDist: ${levDist}\nPrev: "${pText}"\nNext: "${nText}"`);
        }
    }

    // Verify HTML tags
    const prevTags = extractTags(prevContent);
    const newTags = extractTags(newContent);

    if (prevTags.length !== newTags.length) {
        throw new Error(`[${passLabel}] HTML tag count mismatch: ${prevTags.length} vs ${newTags.length}`);
    }
    for (let t = 0; t < prevTags.length; t++) {
        if (prevTags[t] !== newTags[t]) {
            throw new Error(`[${passLabel}] Tag mismatch at index ${t}: "${prevTags[t]}" vs "${newTags[t]}"`);
        }
    }

    // Line-by-line check
    const prevLines = prevContent.split('\n');
    const newLines = newContent.split('\n');
    if (prevLines.length !== newLines.length) {
        throw new Error(`[${passLabel}] Line count mismatch: ${prevLines.length} vs ${newLines.length}`);
    }
    for (let l = 0; l < prevLines.length; l++) {
        const pLine = prevLines[l].trim();
        const nLine = newLines[l].trim();
        if (!pLine || /^<\/?(table|thead|tbody|tr|ul)>$/i.test(pLine)) continue;
        const pT = pLine.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const nT = nLine.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const pW = pT.split(/\s+/).filter(Boolean);
        const nW = nT.split(/\s+/).filter(Boolean);
        if (pW.length === 0) continue;
        const lLev = wordLevenshtein(pW, nW) / pW.length;
        const lLcs = (pW.length - wordLCS(pW, nW)) / pW.length;
        if (lLev >= 0.05 || lLcs >= 0.05) {
            throw new Error(`[${passLabel}] LINE-BASED LIMIT VIOLATION on Line ${l+1}: Lev=${(lLev*100).toFixed(2)}%, LCS=${(lLcs*100).toFixed(2)}%`);
        }
    }

    console.log(`[${passLabel}] Verified: ${editedChunksCount} chunks edited out of ${prevChunks.length}. Max Lev=${(maxLevRatio * 100).toFixed(2)}%, Max LCS=${(maxLcsRatio * 100).toFixed(2)}%. All ${prevTags.length} HTML tags 100% identical.`);
}

function verifyEncoding(filePath) {
    const bytes = fs.readFileSync(filePath);
    const hasBOM = bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    const content = bytes.toString('utf8');
    const hasReplacement = /[\uFFFD]/.test(content);
    const doubleEncoded = /Ã[¡±³º©ª®¯°±²³´µ¶·¸¹º»¼½¾¿]/.test(content);

    console.log(`[Encoding] File: ${path.basename(filePath)} (${bytes.length} bytes)`);
    console.log(`  BOM: ${hasBOM ? 'YES (Error)' : 'NO (Clean UTF-8)'}`);
    console.log(`  U+FFFD Replacement: ${hasReplacement ? 'YES (Error)' : 'NONE (Clean)'}`);
    console.log(`  Mojibake / Double-Encoding: ${doubleEncoded ? 'YES (Error)' : 'NONE (Clean)'}`);

    if (hasBOM || hasReplacement || doubleEncoded) {
        throw new Error(`Encoding validation failed for ${filePath}`);
    }
}

function run() {
    console.log('=== STARTING 3 SEQUENTIAL PASSES OF EDICIÓN QUIRÚRGICA ===\n');

    // STEP 1: Pass 1 on latest_base.html -> surg_pass_1.html
    console.log('1. Reading latest_base.html and applying Pass 1...');
    const baseContent = fs.readFileSync(BASE_FILE, 'utf8');
    const pass1Content = applyReplacements(baseContent, PASS1_REPLACEMENTS, 'Pass 1');
    verifyStrictLimits(baseContent, pass1Content, 'Pass 1');
    fs.writeFileSync(PASS1_FILE, pass1Content, 'utf8');
    verifyEncoding(PASS1_FILE);
    console.log(`   Saved: ${PASS1_FILE}\n`);

    // STEP 2: Pass 2 on surg_pass_1.html -> surg_pass_2.html
    console.log('2. Reading surg_pass_1.html and applying Pass 2 cumulatively...');
    const p1Read = fs.readFileSync(PASS1_FILE, 'utf8');
    const pass2Content = applyReplacements(p1Read, PASS2_REPLACEMENTS, 'Pass 2');
    verifyStrictLimits(p1Read, pass2Content, 'Pass 2');
    fs.writeFileSync(PASS2_FILE, pass2Content, 'utf8');
    verifyEncoding(PASS2_FILE);
    console.log(`   Saved: ${PASS2_FILE}\n`);

    // STEP 3: Pass 3 on surg_pass_2.html -> surg_pass_3.html
    console.log('3. Reading surg_pass_2.html and applying Pass 3 cumulatively...');
    const p2Read = fs.readFileSync(PASS2_FILE, 'utf8');
    const pass3Content = applyReplacements(p2Read, PASS3_REPLACEMENTS, 'Pass 3');
    verifyStrictLimits(p2Read, pass3Content, 'Pass 3');
    fs.writeFileSync(PASS3_FILE, pass3Content, 'utf8');
    verifyEncoding(PASS3_FILE);
    console.log(`   Saved: ${PASS3_FILE}\n`);

    console.log('=== ALL 3 SEQUENTIAL PASSES COMPLETED AND VERIFIED SUCCESSFULLY ===');
}

run();
