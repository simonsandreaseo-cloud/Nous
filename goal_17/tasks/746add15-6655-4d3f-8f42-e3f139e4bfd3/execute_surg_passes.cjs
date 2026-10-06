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
 * 1 targeted single-word vocabulary upgrade per eligible chunk (36 chunks)
 */
const PASS1_REPLACEMENTS = [
    // Chunk 1 (58w): agarras -> eliges (1w, 1.72%)
    ['agarras estos anteojos', 'eliges estos anteojos'],
    // Chunk 3 (107w): buenísimas -> excelentes (1w, 0.93%)
    ['tres opciones buenísimas,', 'tres opciones excelentes,'],
    // Chunk 5 (173w): súper -> sumamente (1w, 0.58%)
    ['metal súper liviano', 'metal sumamente liviano'],
    // Chunk 8 (85w): cuidan -> protegen (1w, 1.18%)
    ['cuidan los ojos del sol.', 'protegen los ojos del sol.'],
    // Chunk 11 (129w): tapan -> cubren (1w, 0.78%)
    ['y tapan bastante la frente.', 'y cubren bastante la frente.'],
    // Chunk 14 (74w): cara -> rostro (1w, 1.35%)
    ['tu propia cara,', 'tu propio rostro,'],
    // Chunk 16 (26w): pareja -> simétrica (1w, 3.85%)
    ['bastante pareja, todo', 'bastante simétrica, todo'],
    // Chunk 17 (21w): ven -> perciben (1w, 4.76%)
    ['se ven más anchos,', 'se perciben más anchos,'],
    // Chunk 19 (24w): notan -> aprecian (1w, 4.17%)
    ['se notan con líneas', 'se aprecian con líneas'],
    // Chunk 21 (55w): suerte -> ventaja (1w, 1.82%)
    ['es una suerte, Tus', 'es una ventaja, Tus'],
    // Chunk 22 (52w): fácil -> sencillo (1w, 1.92%)
    ['la tienes fácil, casi', 'lo tienes sencillo, casi'],
    // Chunk 24 (64w): montón -> bastante (1w, 1.56%)
    ['ayuda un montón, eso', 'ayuda bastante, eso'],
    // Chunk 27 (24w): quedar -> lucir (1w, 4.17%)
    ['quedar muy bien, las', 'lucir muy bien, las'],
    // Chunk 28 (26w): pones -> colocas (1w, 3.85%)
    ['Te pones unos lentes', 'Te colocas unos lentes'],
    // Chunk 32 (31w): Capaz -> Quizás (1w, 3.23%)
    ['Capaz piensas que', 'Quizás piensas que'],
    // Chunk 33 (38w): súper -> sumamente (1w, 2.63%)
    ['bordes súper delgados que', 'bordes sumamente delgados que'],
    // Chunk 35 (80w): chica -> mujer (1w, 1.25%)
    ['Guess para chica, el', 'Guess para mujer, el'],
    // Chunk 37 (44w): rápido -> pronto (1w, 2.27%)
    ['disimulas rápido esa barbilla', 'disimulas pronto esa barbilla'],
    // Chunk 38 (35w): tapan -> cubren (1w, 2.86%)
    ['gota, tapan mucha cara', 'gota, cubren mucha cara'],
    // Chunk 39 (39w): quitas -> restas (1w, 2.56%)
    ['así le quitas peso', 'así le restas peso'],
    // Chunk 41 (72w): enorme -> notable (1w, 1.39%)
    ['una ventaja enorme, casi', 'una ventaja notable, casi'],
    // Chunk 42 (48w): tira -> malgasta (1w, 2.08%)
    ['gente tira su dinero', 'gente malgasta su dinero'],
    // Chunk 43 (66w): delgadito -> fino (1w, 1.52%)
    ['metal bien delgadito, los', 'metal bien fino, los'],
    // Chunk 44 (37w): rápido -> pronto (1w, 2.70%)
    ['pómulos anchos rápido, solucionando', 'pómulos anchos pronto, solucionando'],
    // Chunk 46 (107w): aprieten -> opriman (1w, 0.93%)
    ['las patillas no aprieten,', 'las patillas no opriman,'],
    // Chunk 47 (68w): bonitas -> atractivas (1w, 1.47%)
    ['parecen bonitas, fíjate', 'parecen atractivas, fíjate'],
    // Chunk 50 (83w): compra -> adquiere (1w, 1.20%)
    ['uno compra rápido cualquier', 'uno adquiere rápido cualquier'],
    // Chunk 51 (60w): nota -> percibe (1w, 1.67%)
    ['la cara se nota más pareja', 'la cara se percibe más pareja'],
    // Chunk 53 (77w): patas -> patillas (1w, 1.30%)
    ['las patas de los lentes', 'las patillas de los lentes'],
    // Chunk 54 (39w): juego -> armonía (1w, 2.56%)
    ['haga juego con tus', 'haga armonía con tus'],
    // Chunk 55 (50w): fija -> enfoca (1w, 2.00%)
    ['gente se fija directo', 'gente se enfoca directo'],
    // Chunk 56 (54w): ponte -> elige (1w, 1.85%)
    ['ahí ponte unas <a', 'ahí elige unas <a'],
    // Chunk 57 (69w): súper -> sumamente (1w, 1.45%)
    ['eso queda súper bien,', 'eso queda sumamente bien,'],
    // Chunk 58 (63w): vidrios -> cristales (1w, 1.59%)
    ['ensucias los vidrios muy', 'ensucias los cristales muy'],
    // Chunk 60 (50w): fascina -> cautiva (1w, 2.00%)
    ['le fascina lo clásico', 'le cautiva lo clásico'],
    // Chunk 61 (95w): bolsillo -> presupuesto (1w, 1.05%)
    ['cuidas tu bolsillo porque', 'cuidas tu presupuesto porque']
];

/**
 * PASS 2 REPLACEMENTS: Applied cumulatively on top of PASS 1
 * 1 targeted single-word vocabulary upgrade per eligible chunk (36 chunks)
 */
const PASS2_REPLACEMENTS = [
    // Chunk 1 (58w): apurado -> apresurado (1w, 1.72%)
    ['sales apurado a la', 'sales apresurado a la'],
    // Chunk 3 (107w): aguanta -> resiste (1w, 0.93%)
    ['el plástico aguanta bien', 'el plástico resiste bien'],
    // Chunk 5 (173w): tapan -> cubren (1w, 0.58%)
    ['te tapan todo el ojo', 'te cubren todo el ojo'],
    // Chunk 8 (85w): simple -> sobrio (1w, 1.18%)
    ['bastante simple en la patilla,', 'bastante sobrio en la patilla,'],
    // Chunk 11 (129w): bien -> muy (1w, 0.78%)
    ['cristales bien oscuros para', 'cristales muy oscuros para'],
    // Chunk 14 (74w): aprietan -> oprimen (1w, 1.35%)
    ['no te aprietan la cabeza', 'no te oprimen la cabeza'],
    // Chunk 16 (26w): balanceado -> equilibrado (1w, 3.85%)
    ['bien balanceado de arriba', 'bien equilibrado de arriba'],
    // Chunk 17 (21w): suaves -> sutiles (1w, 4.76%)
    ['Tiene curvas suaves,', 'Tiene curvas sutiles,'],
    // Chunk 19 (24w): resalta -> destaca (1w, 4.17%)
    ['La mandíbula resalta, la', 'La mandíbula destaca, la'],
    // Chunk 21 (55w): parejas -> equilibradas (1w, 1.82%)
    ['son muy parejas, en', 'son muy equilibradas, en'],
    // Chunk 22 (52w): raros -> singulares (1w, 1.92%)
    ['llamativos o raros sin', 'llamativos o singulares sin'],
    // Chunk 24 (64w): flaco -> estilizado (1w, 1.56%)
    ['hasta te ves más flaco.', 'hasta te ves más estilizado.'],
    // Chunk 27 (24w): sirven -> ayudan (1w, 4.17%)
    ['también sirven para hacer', 'también ayudan para hacer'],
    // Chunk 28 (26w): rápido -> pronto (1w, 3.85%)
    ['los rasgos rápido, la cara', 'los rasgos pronto, la cara'],
    // Chunk 32 (31w): notan -> marcan (1w, 3.23%)
    ['pómulos se te notan un', 'pómulos se te marcan un'],
    // Chunk 33 (38w): ven -> aprecian (1w, 2.63%)
    ['casi ni se ven, parece', 'casi ni se aprecian, parece'],
    // Chunk 35 (80w): lujo -> maravilla (1w, 1.25%)
    ['quedar de lujo, esta', 'quedar de maravilla, esta'],
    // Chunk 37 (44w): parejo -> armónico (1w, 2.27%)
    ['mucho más parejo. Tienen', 'mucho más armónico. Tienen'],
    // Chunk 38 (35w): usan -> eligen (1w, 2.86%)
    ['famosos los usan para', 'famosos los eligen para'],
    // Chunk 39 (39w): atraen -> dirigen (1w, 2.56%)
    ['atraen las miradas a', 'dirigen las miradas a'],
    // Chunk 41 (72w): cara -> semblante (1w, 1.39%)
    ['tu cara se relaja', 'tu semblante se relaja'],
    // Chunk 42 (48w): feos -> inadecuados (1w, 2.08%)
    ['comprando armazones feos.', 'comprando armazones inadecuados.'],
    // Chunk 43 (66w): tapan -> cubren (1w, 1.52%)
    ['no te tapan media cara.', 'no te cubren media cara.'],
    // Chunk 44 (37w): bastante -> notablemente (1w, 2.70%)
    ['te alargan la cara bastante.', 'te alargan la cara notablemente.'],
    // Chunk 46 (107w): puesto -> distribuido (1w, 0.93%)
    ['el peso mal puesto.', 'el peso mal distribuido.'],
    // Chunk 47 (68w): resbalan -> deslizan (1w, 1.47%)
    ['se resbalan todo el', 'se deslizan todo el'],
    // Chunk 50 (83w): tipo -> como (1w, 1.20%)
    ['marcas tipo Guess con', 'marcas como Guess con'],
    // Chunk 51 (60w): ven -> lucen (1w, 1.67%)
    ['puestas se ven bien.', 'puestas lucen bien.'],
    // Chunk 53 (77w): tapa -> cubre (1w, 1.30%)
    ['porque te tapa la cara,', 'porque te cubre la cara,'],
    // Chunk 54 (39w): verte -> lucir (1w, 2.56%)
    ['Quieres verte bien y', 'Quieres lucir bien y'],
    // Chunk 55 (50w): salva -> ayuda (1w, 2.00%)
    ['coleta alta también te salva', 'coleta alta también te ayuda'],
    // Chunk 56 (54w): cara -> rostro (1w, 1.85%)
    ['tu cara resalta mucho', 'tu rostro resalta mucho'],
    // Chunk 57 (69w): tapas -> cubres (1w, 1.45%)
    ['si los tapas con el pelo.', 'si los cubres con el pelo.'],
    // Chunk 58 (63w): pegue -> roce (1w, 1.59%)
    ['no pegue contra el marco,', 'no roce contra el marco,'],
    // Chunk 60 (50w): recomiendan -> aconsejan (1w, 2.00%)
    ['ahí recomiendan directo el', 'ahí aconsejan directo el'],
    // Chunk 61 (95w): dan -> aportan (1w, 1.05%)
    ['te dan mucha luz', 'te aportan mucha luz']
];

/**
 * PASS 3 REPLACEMENTS: Applied cumulatively on top of PASS 2
 * 1 targeted single-word vocabulary upgrade per eligible chunk (36 chunks)
 */
const PASS3_REPLACEMENTS = [
    // Chunk 1 (58w): salvan -> favorecen (1w, 1.72%)
    ['y te salvan, combinan', 'y te favorecen, combinan'],
    // Chunk 3 (107w): fuerte -> intenso (1w, 0.93%)
    ['el sol fuerte si sales', 'el sol intenso si sales'],
    // Chunk 5 (173w): métete -> accede (1w, 0.58%)
    ['y métete a <a', 'y accede a <a'],
    // Chunk 8 (85w): doblan -> deforman (1w, 1.18%)
    ['no se doblan fácil y', 'no se deforman fácil y'],
    // Chunk 11 (129w): sientes -> percibes (1w, 0.78%)
    ['las sientes muy seguras', 'las percibes muy seguras'],
    // Chunk 14 (74w): raro -> extraño (1w, 1.35%)
    ['nadie te mira raro por', 'nadie te mira extraño por'],
    // Chunk 16 (26w): cara -> rostro (1w, 3.85%)
    ['forma de cara bastante', 'forma de rostro bastante'],
    // Chunk 17 (21w): casi -> prácticamente (1w, 4.76%)
    ['mide casi lo mismo', 'mide prácticamente lo mismo'],
    // Chunk 19 (24w): similar -> semejante (1w, 4.17%)
    ['con un tamaño similar,', 'con un tamaño semejante,'],
    // Chunk 21 (55w): bonitas -> elegantes (1w, 1.82%)
    ['opciones muy bonitas y', 'opciones muy elegantes y'],
    // Chunk 22 (52w): vueltas -> rodeos (1w, 1.92%)
    ['sin darle tantas vueltas.', 'sin darle tantos rodeos.'],
    // Chunk 24 (64w): ponen -> colocan (1w, 1.56%)
    ['y les ponen unas', 'y les colocan unas'],
    // Chunk 27 (24w): marcos -> armazones (1w, 4.17%)
    ['Los marcos rectangulares', 'Los armazones rectangulares'],
    // Chunk 28 (26w): ves -> aprecias (1w, 3.85%)
    ['hasta te ves más interesante.', 'hasta te aprecias más interesante.'],
    // Chunk 32 (31w): arruinan -> deslucen (1w, 3.23%)
    ['pero te arruinan el estilo.', 'pero te deslucen el estilo.'],
    // Chunk 33 (38w): quitan -> restan (1w, 2.63%)
    ['te quitan todo el', 'te restan todo el'],
    // Chunk 35 (80w): nota -> percibe (1w, 1.25%)
    ['se nota mucho menos.', 'se percibe mucho menos.'],
    // Chunk 37 (44w): elegante -> distinguido (1w, 2.27%)
    ['toque retro y elegante muy marcado.', 'toque retro y distinguido muy marcado.'],
    // Chunk 38 (35w): salir -> lucir (1w, 2.86%)
    ['para salir bien en las fotos.', 'para lucir bien en las fotos.'],
    // Chunk 39 (39w): fina -> delgada (1w, 2.56%)
    ['suele ser más fina.', 'suele ser más delgada.'],
    // Chunk 41 (72w): pasas -> dedicas (1w, 1.39%)
    ['y te pasas buscando el', 'y te dedicas buscando el'],
    // Chunk 42 (48w): parejo -> armónico (1w, 2.08%)
    ['más parejo con este detalle,', 'más armónico con este detalle,'],
    // Chunk 43 (66w): sentir -> percibir (1w, 1.52%)
    ['sentir en la nariz aunque', 'percibir en la nariz aunque'],
    // Chunk 44 (37w): solucionando -> resolviendo (1w, 2.70%)
    ['solucionando este inconveniente.', 'resolviendo este inconveniente.'],
    // Chunk 46 (107w): manda -> prima (1w, 0.93%)
    ['la comodidad física manda al', 'la comodidad física prima al'],
    // Chunk 47 (68w): mucho -> bien (1w, 1.47%)
    ['fíjate mucho en la forma,', 'fíjate bien en la forma,'],
    // Chunk 50 (83w): horribles -> molestas (1w, 1.20%)
    ['marcas horribles al quitártelos.', 'marcas molestas al quitártelos.'],
    // Chunk 51 (60w): evita -> previene (1w, 1.67%)
    ['te evita esas marcas', 'te previene esas marcas'],
    // Chunk 53 (77w): presumir -> lucir (1w, 1.30%)
    ['querían presumir las gafas', 'querían lucir las gafas'],
    // Chunk 54 (39w): mira -> evalúa (1w, 2.56%)
    ['mira bien el tamaño', 'evalúa bien el tamaño'],
    // Chunk 55 (50w): lados -> laterales (1w, 2.00%)
    ['despeja los lados de la', 'despeja los laterales de la'],
    // Chunk 56 (54w): arruina -> estropea (1w, 1.85%)
    ['a veces arruina los peinados', 'a veces estropea los peinados'],
    // Chunk 57 (69w): gastar -> invertir (1w, 1.45%)
    ['gastar en accesorios bonitos', 'invertir en accesorios bonitos'],
    // Chunk 58 (63w): tíralo -> llévalo (1w, 1.59%)
    ['o tíralo para los lados,', 'o llévalo para los lados,'],
    // Chunk 60 (50w): lados -> partes (1w, 2.00%)
    ['en 2026 los verás por todos lados.', 'en 2026 los verás por todas partes.'],
    // Chunk 61 (95w): pones -> llevas (1w, 1.05%)
    ['y te las pones con cualquier', 'y te las llevas con cualquier']
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
