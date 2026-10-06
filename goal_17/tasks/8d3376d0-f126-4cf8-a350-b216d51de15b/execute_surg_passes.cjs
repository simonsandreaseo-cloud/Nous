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
    // Chunk 2 (53w): locas. -> audaces. (1w, 1.89%)
    ['Muy locas.', 'Muy audaces.'],
    // Chunk 3 (36w): dijeron -> declararon (1w, 2.78%)
    ['Lo que dijeron los', 'Lo que declararon los'],
    // Chunk 5 (58w): sacando -> capturando (1w, 1.72%)
    ['Karim Sadli sacando fotos,', 'Karim Sadli capturando fotos,'],
    // Chunk 12 (49w): viejos -> antiguos (1w, 2.04%)
    ['Edificios viejos gigantes.', 'Edificios antiguos gigantes.'],
    // Chunk 14 (30w): pillaron -> convocaron (1w, 3.33%)
    ['ADV SS26 pillaron a gente', 'ADV SS26 convocaron a gente'],
    // Chunk 18 (21w): Pega -> Armoniza (1w, 4.76%)
    ['Pega mil con las gafas', 'Armoniza mil con las gafas'],
    // Chunk 20 (63w): top. -> selectos. (1w, 1.59%)
    ['Materiales top. Ese', 'Materiales selectos. Ese'],
    // Chunk 22 (25w): viejas -> antiguas (1w, 4.00%)
    ['cosas viejas y nuevas.', 'cosas antiguas y nuevas.'],
    // Chunk 36 (28w): guapas. -> distinguidas. (1w, 3.57%)
    ['Gafas guapas. Lo de', 'Gafas distinguidas. Lo de'],
    // Chunk 37 (32w, line 28w): súper -> muy (1w, 3.13% chunk, 3.57% line)
    ['chill y súper cómodos.</p>', 'chill y muy cómodos.</p>'],
    // Chunk 38 (35w, line 31w): tope. -> total. (1w, 2.86% chunk, 3.23% line)
    ['<em>Oversize</em> a tope. Forma', '<em>Oversize</em> a total. Forma'],
    // Chunk 40 (26w): pa -> para (1w, 3.85%)
    ['Pero pa ver.</p>', 'Pero para ver.</p>'],
    // Chunk 54 (53w): súper -> muy (1w, 1.89%)
    ['Líneas así súper limpias.', 'Líneas así muy limpias.'],
    // Chunk 57 (50w): quemas -> dañas (1w, 2.00%)
    ['Además, te quemas los ojos.', 'Además, te dañas los ojos.'],
    // Chunk 60 (31w): patilla -> varilla (1w, 3.23%)
    ['En la patilla de la derecha.', 'En la varilla de la derecha.'],
    // Chunk 61 (26w): top -> selecta (1w, 3.85%)
    ['Tela top por dentro.', 'Tela selecta por dentro.'],
    // Chunk 62 (27w): gordo, -> grueso, (1w, 3.70%)
    ['Papel así gordo, de calidad.', 'Papel así grueso, de calidad.']
];

/**
 * PASS 2 REPLACEMENTS: Applied to surg_pass_1.html
 * 1 targeted single-word vocabulary upgrade per eligible chunk
 */
const PASS2_REPLACEMENTS = [
    // Chunk 2 (53w): pal -> al (1w, 1.89%)
    ['Mirando pal futuro', 'Mirando al futuro'],
    // Chunk 3 (36w): dinámica -> evolución (1w, 2.78%)
    ['en la dinámica del diseño', 'en la evolución del diseño'],
    // Chunk 5 (58w): top -> selecta (1w, 1.72%)
    ['Gente muy top metida', 'Gente muy selecta metida'],
    // Chunk 12 (49w): top. -> singular. (1w, 2.04%)
    ['Fondo top. Todo', 'Fondo singular. Todo'],
    // Chunk 14 (30w): enseñar -> mostrar (1w, 3.33%)
    ['Para enseñar bien lo', 'Para mostrar bien lo'],
    // Chunk 18 (21w): tío. -> modelo. (1w, 4.76%)
    ['Muy intenso el tío.', 'Muy intenso el modelo.'],
    // Chunk 20 (63w): pulidito -> pulido (1w, 1.59%)
    ['acetato pulidito a mano', 'acetato pulido a mano'],
    // Chunk 22 (25w): Rollo -> Como (1w, 4.00%)
    ['está. Rollo el mítico', 'está. Como el mítico'],
    // Chunk 36 (28w): locuras. -> audacias. (1w, 3.57%)
    ['mezclado con locuras. Diseños', 'mezclado con audacias. Diseños'],
    // Chunk 37 (32w, line 28w): tíos -> hombres (1w, 3.13% chunk, 3.57% line)
    ['Para tíos de lujo', 'Para hombres de lujo'],
    // Chunk 38 (35w, line 31w): Súper -> Muy (1w, 2.86% chunk, 3.23% line)
    ['patilla. Súper de mujer.', 'patilla. Muy de mujer.'],
    // Chunk 40 (26w): Locura -> Riqueza (1w, 3.85%)
    ['<p>Locura de detalles.', '<p>Riqueza de detalles.'],
    // Chunk 54 (53w): Rollo -> Estilo (1w, 1.89%)
    ['puestas. Rollo eterno.', 'puestas. Estilo eterno.'],
    // Chunk 57 (50w): Déjate -> Invierte (1w, 2.00%)
    ['leches. Déjate los billetes', 'leches. Invierte los billetes'],
    // Chunk 60 (31w): poner -> figurar (1w, 3.23%)
    ['Tiene que poner "DOLCE', 'Tiene que figurar "DOLCE'],
    // Chunk 61 (26w): raros -> anómalos (1w, 3.85%)
    ['pegamentos raros ni', 'pegamentos anómalos ni'],
    // Chunk 62 (27w): Mira -> Revisa (1w, 3.70%)
    ['calidad. Mira los números,', 'calidad. Revisa los números,']
];

/**
 * PASS 3 REPLACEMENTS: Applied to surg_pass_2.html
 * 1 targeted single-word vocabulary upgrade per eligible chunk
 */
const PASS3_REPLACEMENTS = [
    // Chunk 2 (53w): cara. -> rostro. (1w, 1.89%)
    ['en la cara. Muy audaces.', 'en el rostro. Muy audaces.'],
    // Chunk 3 (36w): integrándola -> articulándola (1w, 2.78%)
    ['clásica integrándola con', 'clásica articulándola con'],
    // Chunk 5 (58w): peli. -> cinematográfico. (1w, 1.72%)
    ['Rollo peli. Destacan', 'Rollo cinematográfico. Destacan'],
    // Chunk 12 (49w): metiendo -> aportando (1w, 2.04%)
    ['Roma metiendo historia', 'Roma aportando historia'],
    // Chunk 14 (30w): súper -> sumamente (1w, 3.33%)
    ['toque súper elegante.', 'toque sumamente elegante.'],
    // Chunk 18 (21w): mil -> plenamente (1w, 4.76%)
    ['Armoniza mil con las', 'Armoniza plenamente con las'],
    // Chunk 20 (63w): gente -> comunidad (1w, 1.59%)
    ['Toda la gente de las gafas', 'Toda la comunidad de las gafas'],
    // Chunk 22 (25w): rollo -> estilo (1w, 4.00%)
    ['Cambian de rollo pero', 'Cambian de estilo pero'],
    // Chunk 36 (28w): súper -> sumamente (1w, 3.57%)
    ['Diseños súper top.', 'Diseños sumamente top.'],
    // Chunk 37 (32w, line 28w): duro. -> sólido. (1w, 3.13% chunk, 3.57% line)
    ['Acetato del duro. Metal', 'Acetato del sólido. Metal'],
    // Chunk 38 (35w, line 31w): patilla. -> varilla. (1w, 2.86% chunk, 3.23% line)
    ['en la patilla. Muy de mujer.', 'en la varilla. Muy de mujer.'],
    // Chunk 40 (26w): parece -> resulta (1w, 3.85%)
    ['juro parece una joya.', 'juro resulta una joya.'],
    // Chunk 54 (53w): Flipa -> Asómbrate (1w, 1.89%)
    ['DG4513</a>. Flipa con la', 'DG4513</a>. Asómbrate con la'],
    // Chunk 57 (50w): movida -> situación (1w, 2.00%)
    ['piratas, movida muy chunga.', 'piratas, situación muy chunga.'],
    // Chunk 60 (31w): metido. -> grabado. (1w, 3.23%)
    ['fuego ahí metido. Con', 'fuego ahí grabado. Con'],
    // Chunk 61 (26w): hilitos -> hilos (1w, 3.85%)
    ['anómalos ni hilitos colgando.', 'anómalos ni hilos colgando.'],
    // Chunk 62 (27w): patillas. -> varillas. (1w, 3.70%)
    ['caja y las patillas.</li>', 'caja y las varillas.</li>']
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
