const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/9240d45b-6ad4-4c60-9e6f-cc5fa5314db9';
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
            if (words1[i - 1] === words2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
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
            if (words1[i - 1] === words2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}

// PASS 1 (Applied on latest_base.html)
const pass1_replacements = [
    // L2 (51w): "grande" -> "holgada" (1w, 1.96%)
    ["quedan bien con ropa grande,", "quedan bien con ropa holgada,"],

    // L4 (44w): "finos" -> "nobles" (1w, 2.27%)
    ["materiales muy finos para este modelo,", "materiales muy nobles para este modelo,"],

    // L6 (40w): "aguantan" -> "resisten" (1w, 2.50%)
    ["aguantan golpes en el suelo,", "resisten golpes en el suelo,"],

    // L7 (42w): "tocar" -> "tacto" (1w, 2.38%)
    ["Son suaves al tocar,", "Son suaves al tacto,"],

    // L8 (39w): "vidrio" -> "cristal" (1w, 2.56%)
    ["resbala por el vidrio,", "resbala por el cristal,"],

    // L10 (35w): "Junté" -> "Reuní" (1w, 2.86%)
    ["Junté las tres máscaras de Gucci", "Reuní las tres máscaras de Gucci"],

    // L48 (72w): "Agarraron" -> "Rescataron" (1w, 1.39%)
    ["Agarraron las gafas gigantes de esquiar", "Rescataron las gafas gigantes de esquiar"],

    // L49 (56w): "tapa" -> "cubre" (1w, 1.79%)
    ["la gafa tapa casi toda la cara,", "la gafa cubre casi toda la cara,"],

    // L50 (51w): "vidrios" -> "cristales" (1w, 1.96%)
    ["Traen vidrios gigantes de deporte,", "Traen cristales gigantes de deporte,"],

    // L52 (62w): "caro" -> "exclusivo" (1w, 1.61%)
    ["El mercado caro se partió", "El mercado exclusivo se partió"],

    // L53 (56w): "cosas" -> "creaciones" (1w, 1.79%)
    ["Comparas las cosas de Gucci,", "Comparas las creaciones de Gucci,"],

    // L54 (60w): "Ponen" -> "Integran" (1w, 1.67%)
    ["Ponen cristales que brillan,", "Integran cristales que brillan,"],

    // L56 (45w): "riesgos" -> "peligros" (1w, 2.22%)
    ["existen riesgos de estafa.", "existen peligros de estafa."],

    // L57 (76w): "letras" -> "inscripciones" (1w, 1.32%)
    ["revisa las letras de adentro,", "revisa las inscripciones de adentro,"],

    // L58 (46w): "plata" -> "inversión" (1w, 2.17%)
    ["perder su plata, ir a lo seguro", "perder su inversión, ir a lo seguro"],

    // L59 (45w): "presumir" -> "ostentar" (1w, 2.22%)
    ["solo para presumir, duran", "solo para ostentar, duran"],

    // L61 (40w): "escondido" -> "desapercibido" (1w, 2.50%)
    ["imposible pasar escondido,", "imposible pasar desapercibido,"],

    // L63 (54w): "cara" -> "exclusiva" (1w, 1.85%)
    ["ropa técnica cara.", "ropa técnica exclusiva."],

    // L65 (54w): "agarras" -> "eliges" (1w, 1.85%)
    ["agarras unas gafas gigantes tipo máscara,", "eliges unas gafas gigantes tipo máscara,"],

    // L67 (65w): "dibujos" -> "estampados" (1w, 1.54%)
    ["camisa de seda con dibujos grandes", "camisa de seda con estampados grandes"],

    // L69 (53w): "tapan" -> "cubren" (1w, 1.89%)
    ["tapan media cara, funcionan", "cubren media cara, funcionan"],

    // L70 (58w): "al" -> "Al" (1w, 1.72%)
    ["parecen escudos. al usar unas Gucci", "parecen escudos. Al usar unas Gucci"]
];

// PASS 2 (Applied on surg_pass_1.html)
const pass2_replacements = [
    // L2 (51w): "traen" -> "evocan" (1w, 1.96%)
    ["traen la moda de los años ochenta,", "evocan la moda de los años ochenta,"],

    // L4 (44w): "ayuda" -> "contribuye" (1w, 2.27%)
    ["eso ayuda a la comodidad,", "eso contribuye a la comodidad,"],

    // L6 (40w): "traen" -> "incorporan" (1w, 2.50%)
    ["traen filtro UV400,", "incorporan filtro UV400,"],

    // L7 (42w): "hace" -> "causa" (1w, 2.38%)
    ["el sudor no hace daño,", "el sudor no causa daño,"],

    // L8 (39w): "pegan" -> "adhieren" (1w, 2.56%)
    ["las huellas no se pegan.", "las huellas no se adhieren."],

    // L10 (35w): "sacará" -> "lanzará" (1w, 2.86%)
    ["la marca sacará colecciones exclusivas", "la marca lanzará colecciones exclusivas"],

    // L48 (72w): "quedan" -> "lucen" (1w, 1.39%)
    ["las fotos quedan bien.", "las fotos lucen bien."],

    // L49 (56w): "muestran" -> "reflejan" (1w, 1.79%)
    ["primavera-verano</a> muestran eso.", "primavera-verano</a> reflejan eso."],

    // L50 (51w): "lado" -> "ocasión" (1w, 1.96%)
    ["estas gafas en cualquier lado.", "estas gafas en cualquier ocasión."],

    // L52 (62w): "tapan" -> "cubren" (1w, 1.61%)
    ["tapan la cara, revitalizan", "cubren la cara, revitalizan"],

    // L53 (56w): "notas" -> "adviertes" (1w, 1.79%)
    ["notas rápido que son", "adviertes rápido que son"],

    // L54 (60w): "raras" -> "singulares" (1w, 1.67%)
    ["Gucci hace piezas raras,", "Gucci hace piezas singulares,"],

    // L56 (45w): "malas" -> "defectuosas" (1w, 2.22%)
    ["ves gafas malas, otras te confunden.", "ves gafas defectuosas, otras te confunden."],

    // L57 (76w): "Tienen" -> "Deben" (1w, 1.32%)
    ["Tienen que estar bien hechas,", "Deben estar bien hechas,"],

    // L58 (46w): "vidrio" -> "cristal" (1w, 2.17%)
    ["los grabados del vidrio,", "los grabados del cristal,"],

    // L59 (45w): "reina" -> "cumbre" (1w, 2.22%)
    ["Gucci es la reina de las", "Gucci es la cumbre de las"],

    // L61 (40w): "fáciles" -> "prácticos" (1w, 2.50%)
    ["tres consejos fáciles, elevan", "tres consejos prácticos, elevan"],

    // L63 (54w): "voltea" -> "observa" (1w, 1.85%)
    ["la gente voltea, proyectando", "la gente observa, proyectando"],

    // L65 (54w): "viejas" -> "clásicas" (1w, 1.85%)
    ["prendas viejas y toques modernos,", "prendas clásicas y toques modernos,"],

    // L67 (65w): "toque" -> "aire" (1w, 1.54%)
    ["da un toque tranquilo,", "da un aire tranquilo,"],

    // L69 (53w): "rara" -> "singular" (1w, 1.89%)
    ["dan una sensación rara,", "dan una sensación singular,"],

    // L70 (58w): "truco" -> "recurso" (1w, 1.72%)
    ["es un buen truco si te aburres.", "es un buen recurso si te aburres."]
];

// PASS 3 (Applied on surg_pass_2.html)
const pass3_replacements = [
    // L2 (51w): "quedan" -> "lucen" (1w, 1.96%)
    ["quedan bien con ropa holgada,", "lucen bien con ropa holgada,"],

    // L4 (44w): "revisar" -> "examinar" (1w, 2.27%)
    ["Vamos a revisar los detalles,", "Vamos a examinar los detalles,"],

    // L6 (40w): "sol" -> "resplandor" (1w, 2.50%)
    ["bloquean el sol, la protección", "bloquean el resplandor, la protección"],

    // L7 (42w): "sigue" -> "permanece" (1w, 2.38%)
    ["la montura sigue igual.", "la montura permanece igual."],

    // L8 (39w): "frenan" -> "mitigan" (1w, 2.56%)
    ["frenan la luz fuerte,", "mitigan la luz fuerte,"],

    // L10 (35w): "mira" -> "observa" (1w, 2.86%)
    ["La gente mira esto últimamente,", "La gente observa esto últimamente,"],

    // L48 (72w): "cosas viejas" -> "fórmulas pasadas" (2w, 2.78%)
    ["no solo copian cosas viejas.", "no solo copian fórmulas pasadas."],

    // L49 (56w): "convencional" -> "tradicional" (1w, 1.79%)
    ["rechaza lo convencional,", "rechaza lo tradicional,"],

    // L50 (51w): "bien" -> "sofisticado" (1w, 1.96%)
    ["te ves muy bien, asistes", "te ves muy sofisticado, asistes"],

    // L52 (62w): "cosas simples y chicas" -> "diseños simples y compactos" (2w, 3.23%)
    ["unas casas venden cosas simples y chicas,", "unas casas venden diseños simples y compactos,"],

    // L53 (56w): "el brillo viejo" -> "el encanto vintage" (2w, 3.57%)
    ["Gucci busca el brillo viejo,", "Gucci busca el encanto vintage,"],

    // L54 (60w): "Parecen estatuas" -> "Evocan esculturas" (2w, 3.33%)
    ["Parecen estatuas en la cara,", "Evocan esculturas en la cara,"],

    // L56 (45w): "problemas" -> "contratiempos" (1w, 2.22%)
    ["evitas problemas.", "evitas contratiempos."],

    // L57 (76w): "hacen ruido" -> "generan ruidos" (2w, 2.63%)
    ["no hacen ruido nunca.", "no generan ruidos nunca."],

    // L58 (46w): "salen" -> "resultan" (1w, 2.17%)
    ["nunca les salen precisos,", "nunca les resultan precisos,"],

    // L59 (45w): "Hacen" -> "Crean" (1w, 2.22%)
    ["Hacen diseños nuevos,", "Crean diseños nuevos,"],

    // L61 (40w): "caminar" -> "pasear" (1w, 2.50%)
    ["sirven para caminar en la calle,", "sirven para pasear en la calle,"],

    // L63 (54w): "siempre" -> "costumbre" (1w, 1.85%)
    ["zapatillas de siempre.", "zapatillas de costumbre."],

    // L65 (54w): "aburrido" -> "monótono" (1w, 1.85%)
    ["ya no se ve aburrido.", "ya no se ve monótono."],

    // L67 (65w): "agarras" -> "eliges" (1w, 1.54%)
    ["agarras unos lentes enormes", "eliges unos lentes enormes"],

    // L69 (53w): "tapan" -> "bloquean" (1w, 1.89%)
    ["no importa si tapan el sol.", "no importa si bloquean el sol."],

    // L70 (58w): "tapan" -> "cubren" (1w, 1.72%)
    ["los famosos se tapan la cara", "los famosos se cubren la cara"]
];

function applyAndVerifyPass(inputContent, replacements, passLabel) {
    let outputContent = inputContent;
    for (const [target, rep] of replacements) {
        if (!outputContent.includes(target)) {
            throw new Error(`[${passLabel}] Target not found: "${target}"`);
        }
        outputContent = outputContent.replace(target, rep);
    }

    const inLines = inputContent.split('\n');
    const outLines = outputContent.split('\n');
    if (inLines.length !== outLines.length) {
        throw new Error(`[${passLabel}] Line count mismatch: ${inLines.length} vs ${outLines.length}`);
    }

    let maxLevRatio = 0;
    let maxLcsRatio = 0;
    let modifiedCount = 0;

    for (let i = 0; i < inLines.length; i++) {
        const inL = inLines[i].trim();
        const outL = outLines[i].trim();
        if (inL === outL) continue;

        const inText = inL.replace(/<[^>]+>/g, '').trim();
        const outText = outL.replace(/<[^>]+>/g, '').trim();
        const inWords = inText.split(/\s+/).filter(Boolean);
        const outWords = outText.split(/\s+/).filter(Boolean);

        const m = inWords.length;
        const lev = wordLevenshtein(inWords, outWords);
        const lcs = wordLCS(inWords, outWords);
        const lcsEdits = m - lcs;

        const levRatio = lev / m;
        const lcsRatio = lcsEdits / m;

        if (levRatio > maxLevRatio) maxLevRatio = levRatio;
        if (lcsRatio > maxLcsRatio) maxLcsRatio = lcsRatio;

        modifiedCount++;

        console.log(`[${passLabel}] Line ${i + 1} (${m} words): Lev=${lev} (${(levRatio * 100).toFixed(2)}%), LCS=${lcsEdits} (${(lcsRatio * 100).toFixed(2)}%)`);

        if (levRatio >= 0.05 || lcsRatio >= 0.05) {
            throw new Error(`[${passLabel}] LIMIT VIOLATION on Line ${i + 1}: Lev=${(levRatio * 100).toFixed(2)}%, LCS=${(lcsRatio * 100).toFixed(2)}% (must be < 5.0%)`);
        }
    }

    // HTML tag preservation check
    const inTags = (inputContent.match(/<[^>]+>/g) || []).join('');
    const outTags = (outputContent.match(/<[^>]+>/g) || []).join('');
    if (inTags !== outTags) {
        throw new Error(`[${passLabel}] HTML tags were altered! Must preserve 100% of HTML tags.`);
    }

    console.log(`>>> ${passLabel} Successful: ${modifiedCount}/22 chunks updated. Max Lev=${(maxLevRatio * 100).toFixed(2)}%, Max LCS=${(maxLcsRatio * 100).toFixed(2)}%. HTML tags identical.\n`);
    return outputContent;
}

console.log('=== STARTING 3 SEQUENTIAL PASSES OF EDICIÓN QUIRÚRGICA ===\n');

// 1. Read latest_base.html, apply Pass 1, save surg_pass_1.html
console.log('--- Step 1: Processing Pass 1 on latest_base.html ---');
const baseHtml = fs.readFileSync(baseFilePath, 'utf8');
const pass1Html = applyAndVerifyPass(baseHtml, pass1_replacements, 'Pass 1');
fs.writeFileSync(pass1FilePath, pass1Html, { encoding: 'utf8' });
console.log(`Saved surg_pass_1.html (${fs.statSync(pass1FilePath).size} bytes)\n`);

// 2. Read surg_pass_1.html, apply Pass 2, save surg_pass_2.html
console.log('--- Step 2: Reading surg_pass_1.html and applying Pass 2 cumulatively ---');
const readPass1Html = fs.readFileSync(pass1FilePath, 'utf8');
const pass2Html = applyAndVerifyPass(readPass1Html, pass2_replacements, 'Pass 2');
fs.writeFileSync(pass2FilePath, pass2Html, { encoding: 'utf8' });
console.log(`Saved surg_pass_2.html (${fs.statSync(pass2FilePath).size} bytes)\n`);

// 3. Read surg_pass_2.html, apply Pass 3, save surg_pass_3.html
console.log('--- Step 3: Reading surg_pass_2.html and applying Pass 3 cumulatively ---');
const readPass2Html = fs.readFileSync(pass2FilePath, 'utf8');
const pass3Html = applyAndVerifyPass(readPass2Html, pass3_replacements, 'Pass 3');
fs.writeFileSync(pass3FilePath, pass3Html, { encoding: 'utf8' });
console.log(`Saved surg_pass_3.html (${fs.statSync(pass3FilePath).size} bytes)\n`);

// 4. File-level & Encoding Verification
console.log('=== POST-GENERATION INTEGRITY & ENCODING VERIFICATION ===');
const baseBuf = fs.readFileSync(baseFilePath);
const baseTags = (baseHtml.match(/<[^>]+>/g) || []).join('');

[
    { name: 'surg_pass_1.html', path: pass1FilePath },
    { name: 'surg_pass_2.html', path: pass2FilePath },
    { name: 'surg_pass_3.html', path: pass3FilePath }
].forEach(({ name, path: p }) => {
    if (!fs.existsSync(p)) {
        throw new Error(`File ${name} does not exist!`);
    }
    const buf = fs.readFileSync(p);
    const content = fs.readFileSync(p, 'utf8');

    // Check BOM
    if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
        throw new Error(`File ${name} contains unexpected BOM!`);
    }

    // Check double UTF-8 encoding or replacement character
    if (/Ã[¡±³º©ª®¯°±²³´µ¶·¸¹º»¼½¾¿]/.test(content)) {
        throw new Error(`File ${name} contains double-encoded UTF-8 artifacts!`);
    }
    if (content.includes('\ufffd')) {
        throw new Error(`File ${name} contains Unicode replacement character (\\ufffd)!`);
    }

    // Check HTML tags match base
    const pTags = (content.match(/<[^>]+>/g) || []).join('');
    if (pTags !== baseTags) {
        throw new Error(`File ${name} HTML tags do not match base HTML tags!`);
    }

    console.log(`File: ${name}`);
    console.log(`  Size: ${buf.length} bytes`);
    console.log(`  Encoding: Clean UTF-8 (no BOM, no double encoding artifacts)`);
    console.log(`  HTML Tag Check: Identical to latest_base.html`);
    console.log(`  Status: VALIDATED OK\n`);
});

console.log('ALL 3 SURGICAL PASSES APPLIED, CUMULATIVELY BUILT, AND SUCCESSFULLY SAVED!');
