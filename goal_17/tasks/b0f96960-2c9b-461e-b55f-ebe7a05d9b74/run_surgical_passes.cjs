const fs = require('fs');
const path = require('path');

const dir = __dirname;
const baseFilePath = path.join(dir, 'latest_base.html');
const pass1FilePath = path.join(dir, 'surg_pass_1.html');
const pass2FilePath = path.join(dir, 'surg_pass_2.html');
const pass3FilePath = path.join(dir, 'surg_pass_3.html');

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
                    dp[i - 1][j],
                    dp[i][j - 1],
                    dp[i - 1][j - 1]
                );
            }
        }
    }
    return dp[m][n];
}

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

// PASS 1 replacements - applied chunk-by-chunk on latest_base.html
const pass1_replacements = {
    1: [["súper grueso", "muy robusto"]], // 42w: dist=2 (4.76%)
    3: [["para complacer el", "para satisfacer el"]], // 38w: dist=1 (2.63%)
    5: [["fungen como el", "constituyen el"]], // 60w: dist=2 (3.33%)
    8: [["te re salvan", "te protegen"]], // 57w: dist=2 (3.51%)
    11: [["Fíjate estas", "Descubre estas"]], // 56w: dist=1 (1.79%)
    13: [["agarran formas", "adoptan formas"]], // 78w: dist=1 (1.28%)
    15: [["la onda", "la línea"]], // 86w: dist=1 (1.16%)
    16: [["caminando por ahí.", "al caminar."]], // 77w: dist=2 (2.60%)
    18: [["La movida", "La propuesta"]], // 76w: dist=1 (1.32%)
    20: [["no le mete plástico", "no emplea plástico"]], // 92w: dist=2 (2.17%)
    21: [["abren re suaves", "abren con suavidad"]], // 72w: dist=2 (2.78%)
    23: [["pero reteniéndole la misma", "pero manteniendo la misma"]], // 66w: dist=1 (1.52%)
    25: [["miradas de una,", "miradas al instante,"]], // 54w: dist=2 (3.70%)
    26: [["y un tal CR-39", "y el reconocido CR-39"]], // 59w: dist=2 (3.39%)
    41: [["y súper rotunda;", "y muy rotunda;"]], // 42w: dist=1 (2.38%)
    42: [["así rectangulares", "marcadamente rectangulares"]], // 44w: dist=1 (2.27%)
    43: [["modelos colosales", "modelos imponentes"]], // 36w: dist=1 (2.78%)
    44: [["pero alzadas en las puntas", "pero elevadas en las puntas"]], // 37w: dist=1 (2.70%)
    45: [["barbilla finita,", "barbilla afilada,"]], // 40w: dist=1 (2.50%)
    47: [["prosiga destellando", "continúe resplandeciendo"]], // 54w: dist=2 (3.70%)
    48: [["con un poquitito de", "con unas gotas de"]], // 53w: dist=1 (1.89%)
    49: [["le resulta pésimo al", "daña notablemente al"]] // 64w: dist=2 (3.13%)
};

// PASS 2 replacements - applied chunk-by-chunk on surg_pass_1.html
const pass2_replacements = {
    1: [["súper bien,", "muy bien,"]], // 42w: dist=1 (2.38%)
    3: [["Aquí te exhibimos", "Aquí te presentamos"]], // 38w: dist=1 (2.63%)
    5: [["acetato negro súper grueso", "acetato negro muy robusto"]], // 59w: dist=2 (3.39%)
    8: [["re clarito", "muy claro"]], // 56w: dist=2 (3.57%)
    11: [["materiales re duros", "materiales muy sólidos"]], // 56w: dist=2 (3.57%)
    13: [["Hay un montón de terminaciones", "Hay gran variedad de terminaciones"]], // 78w: dist=2 (2.56%)
    15: [["agarraron y mezclaron", "fusionaron con maestría"]], // 86w: dist=3 (3.49%)
    16: [["patillas súper anchas", "patillas muy prominentes"]], // 76w: dist=2 (2.63%)
    18: [["poseas re privacidad.", "poseas gran privacidad."]], // 76w: dist=1 (1.32%)
    20: [["le mandan un acetato", "aplica un acetato"]], // 92w: dist=2 (2.17%)
    21: [["y se bancan el", "y resisten el"]], // 72w: dist=2 (2.78%)
    23: [["artesanos agarran cada montura", "artesanos tratan cada montura"]], // 66w: dist=1 (1.52%)
    25: [["lo que en rigor trasciende", "lo que en verdad trasciende"]], // 54w: dist=2 (3.70%)
    26: [["son re traslúcidos,", "son muy diáfanos,"]], // 59w: dist=2 (3.39%)
    41: [["Si te vas a adquirir", "Si vas a adquirir"]], // 42w: dist=1 (2.38%)
    42: [["tú búscate líneas", "prioriza líneas"]], // 44w: dist=2 (4.55%)
    43: [["la gran suerte y", "la gran ventaja y"]], // 36w: dist=1 (2.78%)
    44: [["y te disimulan si", "y te suavizan si"]], // 37w: dist=1 (2.70%)
    45: [["que exhiban la parte", "que presenten la parte"]], // 40w: dist=1 (2.50%)
    47: [["o las aseas con", "o las limpias con"]], // 54w: dist=1 (1.85%)
    48: [["el pañito ese de microfibra", "el paño de microfibra"]], // 53w: dist=2 (3.77%)
    49: [["apenas te las sacas,", "apenas te las retiras,"]] // 64w: dist=1 (1.56%)
};

// PASS 3 replacements - applied chunk-by-chunk on surg_pass_2.html
const pass3_replacements = {
    1: [["anhelas ponerte", "anhelas lucir"]], // 42w: dist=1 (2.38%)
    3: [["bien gruesas", "muy gruesas"]], // 38w: dist=1 (2.63%)
    5: [["un armazón gigante", "un armazón imponente"]], // 59w: dist=1 (1.69%)
    8: [["re cómoda.", "muy cómoda."]], // 56w: dist=1 (1.79%)
    11: [["y fijo te van a perdurar", "y seguro te van a perdurar"]], // 56w: dist=1 (1.79%)
    13: [["A la final te", "En definitiva te"]], // 78w: dist=2 (2.56%)
    15: [["marcos re gruesos", "marcos muy robustos"]], // 86w: dist=2 (2.33%)
    16: [["pómulos a mil.", "pómulos notablemente."]], // 76w: dist=2 (2.63%)
    18: [["rectos y súper grandotes", "rectos y muy amplios"]], // 76w: dist=2 (2.63%)
    20: [["no se te pandean", "no se deforman"]], // 91w: dist=2 (2.20%)
    21: [["aflojarse nada de nada.", "aflojarse en absoluto."]], // 71w: dist=2 (2.82%)
    23: [["textura súper suavecita", "textura muy sedosa"]], // 66w: dist=2 (3.03%)
    25: [["después de andar caminando al", "después de transitar al"]], // 54w: dist=2 (3.70%)
    26: [["traen unas capitas por dentro", "traen finas capas por dentro"]], // 59w: dist=2 (3.39%)
    41: [["cuando te las pones, te balancea el", "cuando te las pones, te equilibra el"]], // 41w: dist=1 (2.44%)
    42: [["lucir genial;", "lucir impecables;"]], // 43w: dist=1 (2.33%)
    43: [["asentar súper bien,", "asentar muy bien,"]], // 36w: dist=1 (2.78%)
    44: [["si luces la mandíbula", "si presentas la mandíbula"]], // 37w: dist=1 (2.70%)
    45: [["sin ponerte recargada", "sin lucir recargada"]], // 40w: dist=1 (2.50%)
    47: [["con cosas agresivas,", "con componentes agresivos,"]], // 54w: dist=2 (3.70%)
    48: [["y secarlas despacito con", "y secarlas suavemente con"]], // 52w: dist=1 (1.92%)
    49: [["por un montón de años.", "por gran cantidad de años."]] // 64w: dist=2 (3.13%)
};

const chunkRegex = /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>[\s\S]*?<\/p>|<li[^>]*>[\s\S]*?<\/li>|<blockquote[^>]*>[\s\S]*?<\/blockquote>|<caption[^>]*>[\s\S]*?<\/caption>|<th[^>]*>[\s\S]*?<\/th>|<td[^>]*>[\s\S]*?<\/td>)/gi;

function getChunks(html) {
    const chunks = [];
    let m;
    const re = new RegExp(chunkRegex);
    while ((m = re.exec(html)) !== null) {
        chunks.push(m[0]);
    }
    return chunks;
}

function applyPassChunkByChunk(inputHtml, replacementsObj, passName) {
    const re = new RegExp(chunkRegex);
    let chunkIndex = 0;
    
    const outputHtml = inputHtml.replace(re, (match) => {
        const idx = chunkIndex++;
        const reps = replacementsObj[idx];
        if (!reps || reps.length === 0) {
            return match;
        }
        
        let modified = match;
        for (const [target, replacement] of reps) {
            if (!modified.includes(target)) {
                throw new Error(`[${passName}] Target "${target}" not found in Chunk ${idx}: "${match}"`);
            }
            modified = modified.replace(target, replacement);
        }
        return modified;
    });
    
    return outputHtml;
}

function verifyLimitsAndTags(prevHtml, nextHtml, passName) {
    console.log(`\n================ ${passName} VERIFICATION ================`);
    const prevChunks = getChunks(prevHtml);
    const newChunks = getChunks(nextHtml);

    if (prevChunks.length !== newChunks.length) {
        throw new Error(`[${passName}] Chunk count mismatch: ${prevChunks.length} vs ${newChunks.length}`);
    }

    let maxLevRatio = 0;
    let maxLcsRatio = 0;
    let editedCount = 0;

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
            editedCount++;
            console.log(`Chunk ${i}: Lev=${(levRatio * 100).toFixed(2)}% (${levDist}/${m}w), LCS=${(lcsRatio * 100).toFixed(2)}% (${lcsEdits}/${m}w) | OK (<5%)`);
        }

        if (levRatio > maxLevRatio) maxLevRatio = levRatio;
        if (lcsRatio > maxLcsRatio) maxLcsRatio = lcsRatio;

        if (levRatio >= 0.05 || lcsRatio >= 0.05) {
            throw new Error(`[${passName}] VIOLATION on Chunk ${i}: Lev=${(levRatio * 100).toFixed(2)}%, LCS=${(lcsRatio * 100).toFixed(2)}% >= 5%!\nPrev: ${pText}\nNext: ${nText}`);
        }
    }

    console.log(`[${passName}] Edited chunks: ${editedCount}. Max Lev: ${(maxLevRatio * 100).toFixed(2)}%, Max LCS: ${(maxLcsRatio * 100).toFixed(2)}%`);

    // Verify HTML tags
    const getTags = str => (str.match(/<[^>]+>/g) || []).map(t => t.toLowerCase());
    const prevTags = getTags(prevHtml);
    const newTags = getTags(nextHtml);

    if (prevTags.length !== newTags.length) {
        throw new Error(`[${passName}] Tag count mismatch: ${prevTags.length} vs ${newTags.length}`);
    }
    for (let t = 0; t < prevTags.length; t++) {
        if (prevTags[t] !== newTags[t]) {
            throw new Error(`[${passName}] Tag mismatch at ${t}: "${prevTags[t]}" vs "${newTags[t]}"`);
        }
    }
    console.log(`[${passName}] All ${prevTags.length} HTML tags are 100% IDENTICAL and INTACT.`);
}

console.log('--- STARTING 3 SEQUENTIAL PASSES OF EDICIÓN QUIRÚRGICA ---');

// STEP 1: Read latest_base.html, apply Pass 1, save to surg_pass_1.html
console.log('\n[1/3] Reading latest_base.html and executing Pass 1...');
const baseHtml = fs.readFileSync(baseFilePath, 'utf8');
const pass1Html = applyPassChunkByChunk(baseHtml, pass1_replacements, 'Pass 1');
verifyLimitsAndTags(baseHtml, pass1Html, 'Pass 1');
fs.writeFileSync(pass1FilePath, pass1Html, 'utf8');
console.log(`-> surg_pass_1.html saved successfully (${fs.statSync(pass1FilePath).size} bytes)`);

// STEP 2: Read surg_pass_1.html, apply Pass 2, save to surg_pass_2.html
console.log('\n[2/3] Reading surg_pass_1.html and executing Pass 2...');
const readPass1Html = fs.readFileSync(pass1FilePath, 'utf8');
const pass2Html = applyPassChunkByChunk(readPass1Html, pass2_replacements, 'Pass 2');
verifyLimitsAndTags(readPass1Html, pass2Html, 'Pass 2');
fs.writeFileSync(pass2FilePath, pass2Html, 'utf8');
console.log(`-> surg_pass_2.html saved successfully (${fs.statSync(pass2FilePath).size} bytes)`);

// STEP 3: Read surg_pass_2.html, apply Pass 3, save to surg_pass_3.html
console.log('\n[3/3] Reading surg_pass_2.html and executing Pass 3...');
const readPass2Html = fs.readFileSync(pass2FilePath, 'utf8');
const pass3Html = applyPassChunkByChunk(readPass2Html, pass3_replacements, 'Pass 3');
verifyLimitsAndTags(readPass2Html, pass3Html, 'Pass 3');
fs.writeFileSync(pass3FilePath, pass3Html, 'utf8');
console.log(`-> surg_pass_3.html saved successfully (${fs.statSync(pass3FilePath).size} bytes)`);

// FINAL ENCODING & FILE INTEGRITY VERIFICATION
console.log('\n--- VERIFYING SAVED FILES ON DISK ---');
[pass1FilePath, pass2FilePath, pass3FilePath].forEach((f, idx) => {
    const content = fs.readFileSync(f, 'utf8');
    const bytes = fs.readFileSync(f);
    // Check BOM: UTF-8 BOM is EF BB BF
    const hasBOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    // Check double encoded characters like Ã¡, Ã©, etc.
    const doubleEncoded = /Ã[¡±³º©ª®¯°±²³´µ¶·¸¹º»¼½¾¿]/.test(content);
    console.log(`File: ${path.basename(f)}:`);
    console.log(`  Size: ${bytes.length} bytes`);
    console.log(`  Has BOM: ${hasBOM ? 'YES (Error)' : 'NO (Clean UTF-8)'}`);
    console.log(`  Double Encoded Artifacts: ${doubleEncoded ? 'YES (Error)' : 'NONE (Clean)'}`);
    if (hasBOM || doubleEncoded) {
        throw new Error(`Encoding issue detected in ${f}`);
    }
});

console.log('\nALL 3 FILES GENERATED, SAVED, AND VERIFIED WITH 100% SUCCESS!');
