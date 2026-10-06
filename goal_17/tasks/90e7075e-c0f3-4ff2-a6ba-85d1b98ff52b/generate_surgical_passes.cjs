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
    return html.match(/<[^>]+>/g) || [];
}

/**
 * PASS 1: Targeted vocabulary upgrades (1 single word upgrade per 20 eligible paragraphs)
 * All blocks are >= 29 words, edit distance is 1, ratio <= 3.45% (< 5.00%).
 */
const PASS1_REPLACEMENTS = [
    // L2 (51w): formita -> silueta (1w, 1.96%)
    ['y una formita de gato', 'y una silueta de gato'],
    // L4 (32w): onda -> clave (1w, 3.13%)
    ['La onda es que peguen', 'La clave es que peguen'],
    // L6 (46w): puntitas -> puntas (1w, 2.17%)
    ['tienen las puntitas hacia', 'tienen las puntas hacia'],
    // L7 (36w): onda -> estética (1w, 2.78%)
    ['te da una onda retro', 'te da una estética retro'],
    // L10 (55w): viejas -> antiguas (1w, 1.82%)
    ['las fotos viejas, como de', 'las fotos antiguas, como de'],
    // L13 (45w): bomba -> maravilla (1w, 2.22%)
    ['con puntas son una bomba.', 'con puntas son una maravilla.'],
    // L16 (41w): viejitas -> ancianas (1w, 2.44%)
    ['Ya no son las viejitas del', 'Ya no son las ancianas del'],
    // L17 (44w): locas -> audaces (1w, 2.27%)
    ['unas gafas locas que llamen', 'unas gafas audaces que llamen'],
    // L18 (43w): Gastar -> Invertir (1w, 2.33%)
    ['Gastar en buenos lentes mejora', 'Invertir en buenos lentes mejora'],
    // L20 (37w): malo -> endeble (1w, 2.70%)
    ['del plástico malo; te van', 'del plástico endeble; te van'],
    // L21 (39w): plástico -> acetato (1w, 2.56%)
    ['metales caros y plástico artesanal', 'metales caros y acetato artesanal'],
    // L23 (35w): placard -> armario (1w, 2.86%)
    ['ropa negra del placard y lo armas', 'ropa negra del armario y lo armas'],
    // L54 (42w): grandotes -> voluminosos (1w, 2.38%)
    ['necesitas libros grandotes viejos', 'necesitas libros voluminosos viejos'],
    // L55 (41w): ropita -> prenda (1w, 2.44%)
    ['levanta cualquier ropita simple', 'levanta cualquier prenda simple'],
    // L58 (34w): cachetes -> pómulos (1w, 2.94%)
    ['la boca y los cachetes para', 'la boca y los pómulos para'],
    // L60 (29w): armada -> definida (1w, 3.45%)
    ['la ceja bien armada. Sobre', 'la ceja bien definida. Sobre'],
    // L61 (33w): onda -> estética (1w, 3.03%)
    ['te dan esa onda gótica', 'te dan esa estética gótica'],
    // L62 (38w): cachetes -> pómulos (1w, 2.63%)
    ['abajo de los cachetes para afinar', 'abajo de los pómulos para afinar'],
    // L63 (41w): tapa -> cubre (1w, 2.44%)
    ['sombrero te tapa la cara entera.', 'sombrero te cubre la cara entera.'],
    // L65 (45w): Gastar -> Invertir (1w, 2.22%)
    ['Gastar en algo bueno te asegura', 'Invertir en algo bueno te asegura']
];

/**
 * PASS 2: Cumulative vocabulary upgrades (1 single word upgrade per 20 eligible paragraphs)
 * Applied strictly on top of PASS 1.
 */
const PASS2_REPLACEMENTS = [
    // L2 (51w): matarte -> complicarte (1w, 1.96%)
    ['pro sin matarte.</p>', 'pro sin complicarte.</p>'],
    // L4 (32w): peguen -> armonicen (1w, 3.13%)
    ['que peguen bien con la ropa;', 'que armonicen bien con la ropa;'],
    // L6 (46w): plástico -> acetato (1w, 2.17%)
    ['son de plástico oscuro grueso,', 'son de acetato oscuro grueso,'],
    // L7 (36w): Ponte -> Elige (1w, 2.78%)
    ['Ponte <a target="_blank"', 'Elige <a target="_blank"'],
    // L10 (55w): vidrio -> cristal (1w, 1.82%)
    ['El tamaño del vidrio importa', 'El tamaño del cristal importa'],
    // L13 (45w): tipo -> como (1w, 2.22%)
    ['hexagonales tipo las <a', 'hexagonales como las <a'],
    // L16 (41w): cosas -> piezas (1w, 2.44%)
    ['ropa oscura y cosas místicas por', 'ropa oscura y piezas místicas por'],
    // L17 (44w): viejas -> antiguas (1w, 2.27%)
    ['plata medio viejas y unas', 'plata medio antiguas y unas'],
    // L18 (43w): vidrios -> cristales (1w, 2.33%)
    ['con vidrios oscuros o de', 'con cristales oscuros o de'],
    // L20 (37w): Comprate -> Adquiere (1w, 2.70%)
    ['Comprate unas gafas que', 'Adquiere unas gafas que'],
    // L21 (39w): mira -> consulta (1w, 2.56%)
    ['excepcional, mira <a target="_blank"', 'excepcional, consulta <a target="_blank"'],
    // L23 (35w): quedar -> lucir (1w, 2.86%)
    ['vas a quedar fabulosa sin', 'vas a lucir fabulosa sin'],
    // L54 (42w): gordito -> grueso (1w, 2.38%)
    ['marco gordito. No uses de', 'marco grueso. No uses de'],
    // L55 (41w): top -> elegante (1w, 2.44%)
    ['en negro es súper top. Transforma', 'en negro es súper elegante. Transforma'],
    // L58 (34w): truquitos -> trucos (1w, 2.94%)
    ['con estos truquitos quedas diosa', 'con estos trucos quedas diosa'],
    // L60 (29w): pintarlas -> delinearlas (1w, 3.45%)
    ['es crucial pintarlas con lápiz', 'es crucial delinearlas con lápiz'],
    // L61 (33w): tapan -> cubren (1w, 3.03%)
    ['lentes te tapan media cara,', 'lentes te cubren media cara,'],
    // L62 (38w): tape -> cubra (1w, 2.63%)
    ['base que tape todo. Después', 'base que cubra todo. Después'],
    // L63 (41w): rodete -> recogido (1w, 2.44%)
    ['hacerte un rodete tirante o', 'hacerte un recogido tirante o'],
    // L65 (45w): asegura -> garantiza (1w, 2.22%)
    ['bueno te asegura que duren', 'bueno te garantiza que duren']
];

/**
 * PASS 3: Cumulative vocabulary upgrades (1 single word upgrade per 20 eligible paragraphs)
 * Applied strictly on top of PASS 2.
 */
const PASS3_REPLACEMENTS = [
    // L2 (51w): pro -> sensacional (1w, 1.96%)
    ['hacen ver pro sin complicarte.', 'hacen ver sensacional sin complicarte.'],
    // L4 (32w): suman -> aportan (1w, 3.13%)
    ['gafas siempre suman mil puntos.', 'gafas siempre aportan mil puntos.'],
    // L6 (46w): dan -> brindan (1w, 2.17%)
    ['arriba te dan un aire mágico.', 'arriba te brindan un aire mágico.'],
    // L7 (36w): ideal -> idóneo (1w, 2.78%)
    ['resulta ideal para disfrazarse', 'resulta idóneo para disfrazarse'],
    // L10 (55w): meten -> aportan (1w, 1.82%)
    ['grandotes le meten un drama', 'grandotes le aportan un drama'],
    // L13 (45w): dejan -> brindan (1w, 2.22%)
    ['sea te dejan una mirada muy potente.', 'sea te brindan una mirada muy potente.'],
    // L16 (41w): sacan -> surgen (1w, 2.44%)
    ['pasarelas sacan looks que', 'pasarelas surgen looks que'],
    // L17 (44w): levantan -> elevan (1w, 2.27%)
    ['así te levantan el disfraz al', 'así te elevan el disfraz al'],
    // L18 (43w): caras -> exclusivas (1w, 2.33%)
    ['marcas caras hacen que tu', 'marcas exclusivas hacen que tu'],
    // L20 (37w): quedas -> luces (1w, 2.70%)
    ['inversión y quedas divina.</p>', 'inversión y luces divina.</p>'],
    // L21 (39w): cosas -> piezas (1w, 2.56%)
    ['para hacer cosas únicas y', 'para hacer piezas únicas y'],
    // L23 (35w): armas -> compones (1w, 2.86%)
    ['armario y lo armas al instante.', 'armario y lo compones al instante.'],
    // L54 (42w): onda -> idea (1w, 2.38%)
    ['queda postizo; la onda es parecer', 'queda postizo; la idea es parecer'],
    // L55 (41w): levanta -> realza (1w, 2.44%)
    ['tu rostro y levanta cualquier prenda', 'tu rostro y realza cualquier prenda'],
    // L58 (34w): diosa -> radiante (1w, 2.94%)
    ['trucos quedas diosa en nada', 'trucos quedas radiante en nada'],
    // L60 (29w): gafa -> montura (1w, 3.45%)
    ['Si la gafa es imponente', 'Si la montura es imponente'],
    // L61 (33w): dan -> brindan (1w, 3.03%)
    ['directamente te dan esa estética', 'directamente te brindan esa estética'],
    // L62 (38w): quedar -> lucir (1w, 2.63%)
    ['Trata de quedar muy mate', 'Trata de lucir muy mate'],
    // L63 (41w): aparte -> además (1w, 2.44%)
    ['lentes y aparte no se te desarma', 'lentes y además no se te desarma'],
    // L65 (45w): excelente -> magnífica (1w, 2.22%)
    ['Halloween es excelente idea. Después', 'Halloween es magnífica idea. Después']
];

function applyReplacements(content, replacements, passName) {
    let result = content;
    for (const [target, replacement] of replacements) {
        if (!result.includes(target)) {
            throw new Error(`[${passName}] Target string NOT FOUND: "${target}"`);
        }
        result = result.replace(target, replacement);
    }
    return result;
}

function verifyStrictLimits(prevContent, nextContent, passLabel) {
    const prevLines = prevContent.split('\n');
    const nextLines = nextContent.split('\n');

    if (prevLines.length !== nextLines.length) {
        throw new Error(`[${passLabel}] Line count mismatch: ${prevLines.length} vs ${nextLines.length}`);
    }

    // Verify tag conservation
    const prevTags = extractTags(prevContent);
    const nextTags = extractTags(nextContent);
    if (prevTags.length !== nextTags.length) {
        throw new Error(`[${passLabel}] HTML tag count mismatch: ${prevTags.length} vs ${nextTags.length}`);
    }
    for (let i = 0; i < prevTags.length; i++) {
        if (prevTags[i] !== nextTags[i]) {
            throw new Error(`[${passLabel}] HTML tag altered at index ${i}: "${prevTags[i]}" vs "${nextTags[i]}"`);
        }
    }

    // Verify chunk limits
    let editsCount = 0;
    let maxLev = 0;
    let maxLcs = 0;

    for (let i = 0; i < prevLines.length; i++) {
        const pLine = prevLines[i];
        const nLine = nextLines[i];

        if (pLine === nLine) continue;

        editsCount++;
        const pText = pLine.replace(/<[^>]+>/g, '').trim();
        const nText = nLine.replace(/<[^>]+>/g, '').trim();

        const pWords = pText.split(/\s+/).filter(Boolean);
        const nWords = nText.split(/\s+/).filter(Boolean);

        const m = pWords.length;
        if (m === 0) continue;

        const levDist = wordLevenshtein(pWords, nWords);
        const lcsLen = wordLCS(pWords, nWords);
        const lcsDist = m - lcsLen;

        const levRatio = levDist / m;
        const lcsRatio = lcsDist / m;

        if (levRatio > maxLev) maxLev = levRatio;
        if (lcsRatio > maxLcs) maxLcs = lcsRatio;

        if (levRatio >= 0.05 || lcsRatio >= 0.05) {
            throw new Error(`[${passLabel}] LIMIT VIOLATION on Line ${i+1}: Lev=${(levRatio * 100).toFixed(2)}%, LCS=${(lcsRatio * 100).toFixed(2)}% (Max permitted < 5.00%). Prev: "${pText}" | Next: "${nText}"`);
        }
    }

    console.log(`[${passLabel}] Verification PASSED: ${editsCount} chunks modified. Max Lev: ${(maxLev * 100).toFixed(2)}%, Max LCS: ${(maxLcs * 100).toFixed(2)}%. HTML tags 100% preserved.`);
}

function verifyEncoding(filePath) {
    const buf = fs.readFileSync(filePath);
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
        throw new Error(`[Encoding] UTF-8 BOM detected in ${filePath}`);
    }
    const text = buf.toString('utf8');
    if (/[\uFFFD]/.test(text)) {
        throw new Error(`[Encoding] Replacement character U+FFFD found in ${filePath}`);
    }
    // Check for double encoding patterns
    const mojibake = /Ã¡|Ã©|Ã­|Ã³|Ãº|Ã±|Ã|Ã‰|Ã|Ã“|Ãš|Ã‘/i;
    if (mojibake.test(text)) {
        throw new Error(`[Encoding] Mojibake double encoding detected in ${filePath}`);
    }
    console.log(`[Encoding] Clean UTF-8 verified for ${path.basename(filePath)}`);
}

function runPipeline() {
    console.log('--- EXECUTING SEQUENTIAL PASSES OF EDICIÓN QUIRÚRGICA ---\n');

    // 1. Read Base
    const baseContent = fs.readFileSync(BASE_FILE, 'utf8');

    // 2. Pass 1
    console.log('1. Applying Pass 1 to latest_base.html...');
    const pass1Content = applyReplacements(baseContent, PASS1_REPLACEMENTS, 'Pass 1');
    verifyStrictLimits(baseContent, pass1Content, 'Pass 1');
    fs.writeFileSync(PASS1_FILE, pass1Content, { encoding: 'utf8' });
    verifyEncoding(PASS1_FILE);
    console.log(`Saved: ${PASS1_FILE}\n`);

    // 3. Pass 2
    console.log('2. Reading surg_pass_1.html and applying Pass 2 cumulatively...');
    const p1Read = fs.readFileSync(PASS1_FILE, 'utf8');
    const pass2Content = applyReplacements(p1Read, PASS2_REPLACEMENTS, 'Pass 2');
    verifyStrictLimits(p1Read, pass2Content, 'Pass 2');
    fs.writeFileSync(PASS2_FILE, pass2Content, { encoding: 'utf8' });
    verifyEncoding(PASS2_FILE);
    console.log(`Saved: ${PASS2_FILE}\n`);

    // 4. Pass 3
    console.log('3. Reading surg_pass_2.html and applying Pass 3 cumulatively...');
    const p2Read = fs.readFileSync(PASS2_FILE, 'utf8');
    const pass3Content = applyReplacements(p2Read, PASS3_REPLACEMENTS, 'Pass 3');
    verifyStrictLimits(p2Read, pass3Content, 'Pass 3');
    fs.writeFileSync(PASS3_FILE, pass3Content, { encoding: 'utf8' });
    verifyEncoding(PASS3_FILE);
    console.log(`Saved: ${PASS3_FILE}\n`);

    console.log('--- ALL 3 SEQUENTIAL PASSES COMPLETED AND VERIFIED SUCCESSFULLY ---');
}

runPipeline();
