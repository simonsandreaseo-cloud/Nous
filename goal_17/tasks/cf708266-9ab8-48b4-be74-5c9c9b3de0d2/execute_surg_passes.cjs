const fs = require('fs');
const path = require('path');

const ORIG_DIR = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/cf656e15-4e25-4356-b689-0f16c251ed86';
const TARGET_DIR = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/cf708266-9ab8-48b4-be74-5c9c9b3de0d2';

const BASE_FILE = path.join(ORIG_DIR, 'latest_base.html');

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
const CHUNK_REGEX = /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>[\s\S]*?<\/p>|<li[^>]*>[\s\S]*?<\/li>|<blockquote[^>]*>[\s\S]*?<\/blockquote>|<th[^>]*>[\s\S]*?<\/th>|<td[^>]*>[\s\S]*?<\/td>)/gi;

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
 * 1 targeted single-word vocabulary upgrade per eligible chunk (>= 21 words)
 */
const PASS1_REPLACEMENTS = [
    // L2 (52w): súper -> muy (1w, 1.92%)
    ['acetatos súper exclusivos,', 'acetatos muy exclusivos,'],
    // L4 (69w): cosas -> toques (1w, 1.45%)
    ['clásico pero con cosas modernas.', 'clásico pero con toques modernos.'],
    // L6 (78w): Re -> Muy (1w, 1.28%)
    ['gris carbono. Re clásicas.', 'gris carbono. Muy clásicas.'],
    // L9 (66w): súper -> muy (1w, 1.52%)
    ['Las bisagras súper reforzadas', 'Las bisagras muy reforzadas'],
    // L12 (79w): tranqui -> discreto (1w, 1.27%)
    ['y ese lujo tranqui de la marca.', 'y ese lujo discreto de la marca.'],
    // L15 (53w): meten -> traen (1w, 1.89%)
    ['Siempre meten una historia', 'Siempre traen una historia'],
    // L16 (45w): acá, -> aquí, (1w, 2.22%)
    ['pura inspiración acá, te lo', 'pura inspiración aquí, te lo'],
    // L18 (31w): Agarran -> Toman (1w, 3.23%)
    ['la calidad. Agarran los estilos', 'la calidad. Toman los estilos'],
    // L20 (51w): Re -> Muy (1w, 1.96%)
    ['se nota. Re bien hechas.', 'se nota. Muy bien hechas.'],
    // L24 (22w): Onda -> Estilo (1w, 4.55%)
    ['</strong> Onda años setenta', '</strong> Estilo años setenta'],
    // L25 (44w): matás -> cansas (1w, 2.27%)
    ['y no te matás la vista.', 'y no te cansas la vista.'],
    // L26 (26w): re -> muy (1w, 3.85%)
    ['metal adentro, re livianos.', 'metal adentro, muy livianos.'],
    // L29 (43w): full, -> fondo, (1w, 2.33%)
    ['Las comprueban a full, se la', 'Las comprueban a fondo, se la'],
    // L30 (58w): re -> muy (1w, 1.72%)
    ['estas gafas es re complejo.', 'estas gafas es muy complejo.'],
    // L32 (40w): Re -> Muy (1w, 2.50%)
    ['celulosa vegetal. Re natural, se', 'celulosa vegetal. Muy natural, se'],
    // L33 (38w): diez, -> maravilla, (1w, 2.63%)
    ['horas y de diez, siempre con', 'horas y de maravilla, siempre con'],
    // L35 (51w): toque. -> instante. (1w, 1.96%)
    ['encajan al toque. Los cristales', 'encajan al instante. Los cristales'],
    // L36 (71w): re -> muy (1w, 1.41%)
    ['reglas ISO de protección, re de sobra.', 'reglas ISO de protección, muy de sobra.'],
    // L38 (44w): malísimos, -> deficientes, (1w, 2.27%)
    ['garantía, materiales malísimos, a la', 'garantía, materiales deficientes, a la'],
    // L39 (44w): trapito, -> gamuza, (1w, 2.27%)
    ['estuche original, trapito, la garantía', 'estuche original, gamuza, la garantía'],
    // L41 (37w): yanki -> estadounidense (1w, 2.70%)
    ['La marca yanki fabrica gafas', 'La marca estadounidense fabrica gafas'],
    // L43 (45w): chusmees -> consultes (1w, 2.22%)
    ['para que chusmees antes de', 'para que consultes antes de'],
    // L74 (54w): re -> muy (1w, 1.85%)
    ['Armazones re cómodos. Hay', 'Armazones muy cómodos. Hay'],
    // L75 (32w): pro -> elegante (1w, 3.13%)
    ['quedás re pro en la oficina.', 'quedás re elegante en la oficina.'],
    // L77 (67w): re -> muy (1w, 1.49%)
    ['incluye gafas re top, armadas', 'incluye gafas muy top, armadas'],
    // L78 (56w): tiro -> presento (1w, 1.79%)
    ['Acá abajo tiro una tabla', 'Acá abajo presento una tabla'],
    // L104 (62w): posta -> oficial (1w, 1.61%)
    ['a una óptica posta o fijate', 'a una óptica oficial o fijate'],
    // L106 (48w): re -> muy (1w, 2.08%)
    ['europeas re seguras. Cuidan', 'europeas muy seguras. Cuidan'],
    // L108 (29w): re -> muy (1w, 3.45%)
    ['el tamaño, re fácil errarle', 'el tamaño, muy fácil errarle'],
    // L109 (31w): Chequeá -> Revisa (1w, 3.23%)
    ['indica todo. Chequeá los números', 'indica todo. Revisa los números'],
    // L110 (39w): meten -> eligen (1w, 2.56%)
    ['Casi todos meten 3 o', 'Casi todos eligen 3 o'],
    // L111 (34w): toque -> instante (1w, 2.94%)
    ['todo al toque en la', 'todo al instante en la'],
    // L112 (34w): primer -> primera (1w, 2.94%)
    ['para la primer cuota. Entra', 'para la primera cuota. Entra']
];

/**
 * PASS 2 REPLACEMENTS: Applied to surg_pass_1.html
 * 1 targeted single-word vocabulary upgrade per eligible chunk
 */
const PASS2_REPLACEMENTS = [
    // L2 (52w): re -> muy (1w, 1.92%)
    ['metales son re ligeros... los', 'metales son muy ligeros... los'],
    // L4 (69w): re -> mucho (1w, 1.45%)
    ['mano se re nota, además', 'mano se nota mucho, además'],
    // L6 (78w): re -> muy (1w, 1.28%)
    ['nada, re cómodas por', 'nada, muy cómodas por'],
    // L9 (66w): onda -> esencia (1w, 1.52%)
    ['la onda de California total.', 'la esencia de California total.'],
    // L12 (79w): costado. -> lateral. (1w, 1.27%)
    ['frente y al costado. Te dan', 'frente y al lateral. Te dan'],
    // L15 (53w): onda -> estilo (1w, 1.89%)
    ['Hills, re onda California años', 'Hills, re estilo California años'],
    // L16 (45w): montañas. -> colinas. (1w, 2.22%)
    ['sol, palmeras, montañas. El cine', 'sol, palmeras, colinas. El cine'],
    // L18 (31w): viejos -> clásicos (1w, 3.23%)
    ['estilos viejos para los', 'estilos clásicos para los'],
    // L20 (51w): fijate -> revisa (1w, 1.96%)
    ['originales</a>, fijate los grabados', 'originales</a>, revisa los grabados'],
    // L24 (22w): aguantás -> llevas (1w, 4.55%)
    ['todo y las aguantás todo el', 'todo y las llevas todo el'],
    // L25 (44w): negro. -> oscuro. (1w, 2.27%)
    ['lente re negro. Ahora van', 'lente re oscuro. Ahora van'],
    // L26 (26w): calzás -> pones (1w, 3.85%)
    ['Te las calzás y no', 'Te las pones y no'],
    // L29 (43w): Bancan -> Resisten (1w, 2.33%)
    ['todos los días. Bancan el sudor,', 'todos los días. Resisten el sudor,'],
    // L30 (58w): maderitas -> maderas (1w, 1.72%)
    ['tambores con maderitas por días', 'tambores con maderas por días'],
    // L32 (40w): re -> muy (1w, 2.50%)
    ['relieve re bueno, aguantan', 'relieve muy bueno, aguantan'],
    // L33 (38w): Re -> Muy (1w, 2.63%)
    ['ni ahí. Re aguantadoras. Ni', 'ni ahí. Muy aguantadoras. Ni'],
    // L35 (51w): liquida. -> deslumbra. (1w, 1.96%)
    ['sol te liquida. Todos dicen', 'sol te deslumbra. Todos dicen'],
    // L36 (71w): adentro, -> interior, (1w, 1.41%)
    ['antirreflejo adentro, obligatorio. Esto', 'antirreflejo interior, obligatorio. Esto'],
    // L38 (44w): jugársela -> arriesgarse (1w, 2.27%)
    ['oficiales es jugársela mal con', 'oficiales es arriesgarse mal con'],
    // L39 (44w): mandar. -> enviar. (1w, 2.27%)
    ['antes de mandar. Incluyen sellos,', 'antes de enviar. Incluyen sellos,'],
    // L41 (37w): onda -> estilo (1w, 2.70%)
    ['con todo, onda California retro.', 'con todo, estilo California retro.'],
    // L43 (45w): onda: -> diferencia: (1w, 2.22%)
    ['ves la onda: Lerrue es', 'ves la diferencia: Lerrue es'],
    // L74 (54w): feo. -> monótono. (1w, 1.85%)
    ['por qué ser feo. Uno desea', 'por qué ser monótono. Uno desea'],
    // L75 (32w): re -> muy (1w, 3.13%)
    ['Son re cómodos como', 'Son muy cómodos como'],
    // L77 (67w): dibujitos -> grabados (1w, 1.49%)
    ['acetato, los dibujitos de metal', 'acetato, los grabados de metal'],
    // L78 (56w): re -> muy (1w, 1.79%)
    ['cristales re locos. Muchos', 'cristales muy locos. Muchos'],
    // L104 (62w): plata. -> dinero. (1w, 1.61%)
    ['no tirar plata. Los cristales', 'no tirar dinero. Los cristales'],
    // L106 (48w): raros. -> inesperados. (1w, 2.08%)
    ['cobros raros. Elegís el', 'cobros inesperados. Elegís el'],
    // L108 (29w): errarle -> errar (1w, 3.45%)
    ['muy fácil errarle a la', 'muy fácil errar a la'],
    // L109 (31w): salen -> muestran (1w, 3.23%)
    ['Ahí te salen los bancos', 'Ahí te muestran los bancos'],
    // L110 (39w): Fijate -> Comprueba (1w, 2.56%)
    ['hasta 12. Fijate los números', 'hasta 12. Comprueba los números'],
    // L111 (34w): celu. -> teléfono. (1w, 2.94%)
    ['DNI y tu celu. El banco', 'DNI y tu teléfono. El banco'],
    // L112 (34w): preparamos -> alistamos (1w, 2.94%)
    ['ya te preparamos la caja.', 'ya te alistamos la caja.']
];

/**
 * PASS 3 REPLACEMENTS: Applied to surg_pass_2.html
 * 1 targeted single-word vocabulary upgrade per eligible chunk
 */
const PASS3_REPLACEMENTS = [
    // L2 (52w): total. -> absoluta. (1w, 1.92%)
    ['marcan tendencia total.</p>', 'marcan tendencia absoluta.</p>'],
    // L4 (69w): data -> información (1w, 1.45%)
    ['dejo la data de cada', 'dejo la información de cada'],
    // L6 (78w): clarito. -> nítido. (1w, 1.28%)
    ['ves todo clarito. Para todos', 'ves todo nítido. Para todos'],
    // L9 (66w): marcadas -> definidas (1w, 1.52%)
    ['Líneas marcadas en la', 'Líneas definidas en la'],
    // L12 (79w): discreto -> distinguido (1w, 1.27%)
    ['ese lujo discreto de la', 'ese lujo distinguido de la'],
    // L15 (53w): usamos -> llevamos (1w, 1.89%)
    ['lo que usamos ahora.</p>', 'lo que llevamos ahora.</p>'],
    // L16 (45w): dicen -> expresan (1w, 2.22%)
    ['aquí, te lo dicen en su', 'aquí, te lo expresan en su'],
    // L18 (31w): cero -> nada (1w, 3.23%)
    ['de ahora, cero incómodas, lucen', 'de ahora, nada incómodas, lucen'],
    // L20 (51w): clásicos -> tradicionales (1w, 1.96%)
    ['los modelos clásicos para guardar.', 'los modelos tradicionales para guardar.'],
    // L24 (22w): hechas. -> elaboradas. (1w, 4.55%)
    ['pero mejor hechas. Pesan muy', 'pero mejor elaboradas. Pesan muy'],
    // L25 (44w): oscuro. -> profundo. (1w, 2.27%)
    ['lente re oscuro. Ahora van', 'lente re profundo. Ahora van'],
    // L26 (26w): sentís, -> notas, (1w, 3.85%)
    ['Ni las sentís, ideal para', 'Ni las notas, ideal para'],
    // L29 (43w): tener -> sufrir (1w, 2.33%)
    ['a tener contratiempos.</p>', 'a sufrir contratiempos.</p>'],
    // L30 (58w): chiquita -> minuciosa (1w, 1.72%)
    ['ingeniería chiquita y óptica', 'ingeniería minuciosa y óptica'],
    // L32 (40w): Cero -> Sin (1w, 2.50%)
    ['sin romperse. Cero alergias,', 'sin romperse. Sin alergias,'],
    // L33 (38w): notas -> percibes (1w, 2.63%)
    ['Ni las notas en las', 'Ni las percibes en las'],
    // L35 (51w): celu -> móvil (1w, 1.96%)
    ['tablero o el celu y listo,', 'tablero o el móvil y listo,'],
    // L36 (71w): full, -> fondo, (1w, 1.41%)
    ['UVB a full, los 400', 'UVB a fondo, los 400'],
    // L38 (44w): arruinás -> dañas (1w, 2.27%)
    ['larga te arruinás los ojos.', 'larga te dañas los ojos.'],
    // L39 (44w): miramos -> revisamos (1w, 2.27%)
    ['distribuidores, miramos todo bien', 'distribuidores, revisamos todo bien'],
    // L41 (37w): genialidad. -> maravilla. (1w, 2.70%)
    ['es una genialidad. Diseño que', 'es una maravilla. Diseño que'],
    // L43 (45w): clásico -> icono (1w, 2.22%)
    ['son el clásico eterno de', 'son el icono eterno de'],
    // L74 (54w): lucís -> luces (1w, 1.85%)
    ['estos lucís muy elegante.', 'estos luces muy elegante.'],
    // L75 (32w): cambiando -> alternando (1w, 3.13%)
    ['con andar cambiando a cada', 'con andar alternando a cada'],
    // L77 (67w): diez -> maravilla (1w, 1.49%)
    ['ajustarla de diez y recién', 'ajustarla de maravilla y recién'],
    // L78 (56w): alta -> gran (1w, 1.79%)
    ['Es alta inversión, vale', 'Es gran inversión, vale'],
    // L104 (62w): bailando. -> holgadas. (1w, 1.61%)
    ['no quedan bailando. El marco', 'no quedan holgadas. El marco'],
    // L106 (48w): seguras. -> fiables. (1w, 2.08%)
    ['europeas muy seguras. Cuidan', 'europeas muy fiables. Cuidan'],
    // L108 (29w): errar -> equivocarse (1w, 3.45%)
    ['muy fácil errar a la', 'muy fácil equivocarse a la'],
    // L109 (31w): página -> plataforma (1w, 3.23%)
    ['La página te indica todo.', 'La plataforma te indica todo.'],
    // L110 (39w): demás. -> recargos. (1w, 2.56%)
    ['ni pagar demás.</li>', 'ni pagar recargos.</li>'],
    // L111 (34w): compu. -> computadora. (1w, 2.94%)
    ['en la compu. Nada de', 'en la computadora. Nada de'],
    // L112 (34w): rapidísimo -> velozmente (1w, 2.94%)
    ['te llega rapidísimo como si', 'te llega velozmente como si']
];

function applyReplacements(content, replacements, passLabel) {
    let modified = content;
    for (const [target, replacement] of replacements) {
        if (!modified.includes(target)) {
            throw new Error(`[${passLabel}] Target string not found in content: "${target}"`);
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

    // Line-by-line verification
    const prevLines = prevContent.split('\n');
    const newLines = newContent.split('\n');
    if (prevLines.length !== newLines.length) {
        throw new Error(`[${passLabel}] Line count mismatch: ${prevLines.length} vs ${newLines.length}`);
    }

    let maxLineLevRatio = 0;
    for (let l = 0; l < prevLines.length; l++) {
        const pLText = prevLines[l].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const nLText = newLines[l].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        const pLWords = pLText.split(/\s+/).filter(Boolean);
        const nLWords = nLText.split(/\s+/).filter(Boolean);

        const len = pLWords.length;
        if (len === 0) continue;

        const lLev = wordLevenshtein(pLWords, nLWords);
        const lRatio = lLev / len;
        if (lRatio > maxLineLevRatio) maxLineLevRatio = lRatio;

        if (lRatio >= 0.05) {
            throw new Error(`[${passLabel}] Line ${l + 1} STRICT LIMIT VIOLATION: ${(lRatio * 100).toFixed(2)}% >= 5%`);
        }
    }

    // Tag verification
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

    console.log(`[${passLabel}] SUCCESS: ${editedChunksCount} chunks edited out of ${prevChunks.length}. Max Chunk Lev: ${(maxLevRatio * 100).toFixed(2)}%, Max Line Lev: ${(maxLineLevRatio * 100).toFixed(2)}%. All ${prevTags.length} tags intact.`);
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

function saveToBoth(fileName, content) {
    const targets = [ORIG_DIR, TARGET_DIR];
    for (const dir of targets) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const fullPath = path.join(dir, fileName);
        fs.writeFileSync(fullPath, content, 'utf8');
        verifyEncoding(fullPath);
        console.log(`   Saved: ${fullPath}`);
    }
}

function run() {
    console.log('=== STARTING 3 SEQUENTIAL PASSES OF EDICIÓN QUIRÚRGICA ===\n');

    // Ensure TARGET_DIR has latest_base.html
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }
    const targetBase = path.join(TARGET_DIR, 'latest_base.html');
    if (!fs.existsSync(targetBase)) {
        fs.copyFileSync(BASE_FILE, targetBase);
        console.log(`Copied latest_base.html to ${targetBase}`);
    }

    // STEP 1: Pass 1 on latest_base.html -> surg_pass_1.html
    console.log('\n1. Reading latest_base.html and applying Pass 1...');
    const baseContent = fs.readFileSync(BASE_FILE, 'utf8');
    const pass1Content = applyReplacements(baseContent, PASS1_REPLACEMENTS, 'Pass 1');
    verifyStrictLimits(baseContent, pass1Content, 'Pass 1');
    saveToBoth('surg_pass_1.html', pass1Content);

    // STEP 2: Pass 2 on surg_pass_1.html -> surg_pass_2.html
    console.log('\n2. Reading surg_pass_1.html and applying Pass 2 cumulatively...');
    const p1Read = fs.readFileSync(path.join(ORIG_DIR, 'surg_pass_1.html'), 'utf8');
    const pass2Content = applyReplacements(p1Read, PASS2_REPLACEMENTS, 'Pass 2');
    verifyStrictLimits(p1Read, pass2Content, 'Pass 2');
    saveToBoth('surg_pass_2.html', pass2Content);

    // STEP 3: Pass 3 on surg_pass_2.html -> surg_pass_3.html
    console.log('\n3. Reading surg_pass_2.html and applying Pass 3 cumulatively...');
    const p2Read = fs.readFileSync(path.join(ORIG_DIR, 'surg_pass_2.html'), 'utf8');
    const pass3Content = applyReplacements(p2Read, PASS3_REPLACEMENTS, 'Pass 3');
    verifyStrictLimits(p2Read, pass3Content, 'Pass 3');
    saveToBoth('surg_pass_3.html', pass3Content);

    console.log('\n=== ALL 3 SEQUENTIAL PASSES COMPLETED AND VERIFIED SUCCESSFULLY ===');
}

run();
