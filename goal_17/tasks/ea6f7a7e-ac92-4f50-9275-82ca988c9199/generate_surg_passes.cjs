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

// PASS 1 REPLACEMENTS (applied on latest_base.html)
const pass1_replacements = [
    // L2 (37 words)
    ["Son comodísimas,", "Son confortables,"],

    // L4 (76 words)
    ["Te enseñamos los tres", "Te presentamos los tres"],
    ["boom! Da el sol", "¡impacto! Da el sol"],

    // L5 (27 words)
    ["Comodísimas para todo", "Confortables para todo"],

    // L7 (44 words)
    ["Arrancamos fuerte,", "Iniciamos fuerte,"],
    ["talante <em>cat-eye</em>.", "estilo <em>cat-eye</em>."],

    // L8 (52 words)
    ["súper flexibles,", "muy flexibles,"],
    ["apoyan magistralmente", "asientan magistralmente"],

    // L11 (53 words)
    ["dar luz a tu", "aportar luz a tu"],
    ["Queda clarísimo por", "Queda evidente por"],

    // L13 (23 words)
    ["eso te borra las", "eso te difumina las"],

    // L20 (45 words)
    ["mucha graduación.", "alta graduación."],
    ["bordes súper bien para", "bordes muy bien para"],

    // L21 (64 words)
    ["le esculpió un", "le esculpieron un"],
    ["súper diferente.", "muy diferente."],
    ["durísimas, no se", "robustísimas, no se"],

    // L24 (40 words)
    ["Hay mil gafas", "Hay numerosas gafas"],

    // L25 (29 words)
    ["lo notas rápido,", "lo notas enseguida,"],

    // L26 (38 words)
    ["súper cómodas.", "muy cómodas."],

    // L28 (40 words)
    ["aguanten todo.", "resistan todo."],

    // L31 (24 words)
    ["súper resistente.", "muy resistente."],

    // L33 (32 words)
    ["Pegan colores con", "Unen colores con"],

    // L35 (32 words)
    ["filtran brillos, ves", "filtran reflejos, ves"],

    // L38 (38 words)
    ["Aquí destaca el", "Aquí sobresale el"],

    // L39 (36 words)
    ["pum, salen", "súbitamente, salen"],

    // L41 (45 words)
    ["Empiezan con un", "Comienzan con un"],
    ["cortan lo justo.", "cortan lo preciso."],

    // L42 (30 words)
    ["emerge la capa", "aflora la capa"],

    // L45 (29 words)
    ["se estudian las caras.", "se analizan las caras."],

    // L48 (24 words)
    ["Queda mejor y", "Luce mejor y"],

    // L49 (24 words)
    ["parecen dos gafas", "asemejan dos gafas"],

    // L51 (35 words)
    ["Ahí notas <strong>", "Ahí aprecias <strong>"],

    // L85 (34 words)
    ["Tienen mil opciones,", "Ofrecen mil opciones,"],

    // L87 (43 words)
    ["te mola la", "te atrae la"],
    ["Comodísimas sin perder", "Confortabilísimas sin perder"],

    // L88 (26 words)
    ["reparten el peso.", "distribuyen el peso."],

    // L90 (34 words)
    ["destacan los cristales", "sobresalen los cristales"],

    // L91 (41 words)
    ["talante del Mediterráneo", "espíritu del Mediterráneo"],
    ["no te rebote al", "no te deslumbre al"]
];

// PASS 2 REPLACEMENTS (applied on surg_pass_1.html)
const pass2_replacements = [
    // L2 (37 words)
    ["un talante muy diferente", "un estilo muy diferente"],

    // L4 (76 words)
    ["sacan unas formas", "logran unas formas"],
    ["nada de un accesorio", "lejos de un accesorio"],

    // L5 (27 words)
    ["lo pensamos por la", "lo seleccionamos por la"],

    // L7 (44 words)
    ["Cero aburridas, eh,", "Nada aburridas, eh,"],

    // L8 (52 words)
    ["dan un contraste", "ofrecen un contraste"],
    ["reparten la presión,", "distribuyen la presión,"],

    // L11 (53 words)
    ["te va a deslumbrar.", "te va a cautivar."],
    ["dejan ver el beige", "permiten ver el beige"],

    // L13 (23 words)
    ["la cara se ve menos", "la cara se nota menos"],

    // L20 (45 words)
    ["mucha miopía.", "alta miopía."],

    // L21 (64 words)
    ["es redondito,", "es redondeado,"],
    ["bajo el sol a tope.", "bajo el sol plenamente."],

    // L24 (40 words)
    ["no copian a", "no imitan a"],

    // L25 (29 words)
    ["Lo ves en las", "Lo aprecias en las"],

    // L26 (38 words)
    ["Hacen piezas estéticas,", "Crean piezas estéticas,"],

    // L28 (40 words)
    ["talante muy urbano", "estilo muy urbano"],

    // L31 (24 words)
    ["Hacen gafas voluminosas,", "Crean gafas voluminosas,"],

    // L33 (32 words)
    ["Genial si quieres", "Ideal si quieres"],

    // L35 (32 words)
    ["Ojo al elegir", "Atención al elegir"],

    // L38 (38 words)
    ["hacen rebajes,", "trazan rebajes,"],

    // L39 (36 words)
    ["la más sosa,", "la más neutra,"],

    // L41 (45 words)
    ["es maravillarse con", "es fascinarse con"],

    // L42 (30 words)
    ["para lograr un", "para conseguir un"],

    // L45 (29 words)
    ["analizan las caras.", "analizan las fisonomías."],

    // L48 (24 words)
    ["se ve lo de dentro,", "se aprecia lo de dentro,"],

    // L49 (24 words)
    ["da luz a", "brinda luz a"],

    // L51 (35 words)
    ["lo cortado brilla.", "lo cortado resplandece."],

    // L85 (34 words)
    ["Ofrecen mil opciones,", "Ofrecen múltiples opciones,"],

    // L87 (43 words)
    ["sin perder talante.", "sin perder estilo."],
    ["No resbalan nada.", "No resbalan jamás."],

    // L88 (26 words)
    ["fresado ayuda a", "fresado contribuye a"],

    // L90 (34 words)
    ["te protegen y", "te resguardan y"],

    // L91 (41 words)
    ["muestra todo tal", "presenta todo tal"],
    ["Tienen capa por", "Incorporan capa por"]
];

// PASS 3 REPLACEMENTS (applied on surg_pass_2.html)
const pass3_replacements = [
    // L2 (37 words)
    ["Etnia Barcelona devela", "Etnia Barcelona presenta"],

    // L4 (76 words)
    ["tienes que escoger bien.", "tienes que elegir bien."],
    ["Parecen vivas,", "Lucen vivas,"],

    // L5 (27 words)
    ["estilo de pasarela total.", "estilo de pasarela absoluto."],

    // L7 (44 words)
    ["le integran cortes", "le incorporan cortes"],

    // L8 (52 words)
    ["no te fatigas", "no te cansas"],

    // L11 (53 words)
    ["Recortan el frente,", "Rebajan el frente,"],

    // L13 (23 words)
    ["El oscuro pasa", "El oscuro transita"],

    // L20 (45 words)
    ["disimular el grosor", "ocultar el grosor"],

    // L21 (64 words)
    ["no se escurren.", "no se deslizan."],
    ["ve a <a", "acude a <a"],

    // L24 (40 words)
    ["color es vital.", "color es primordial."],

    // L25 (29 words)
    ["pura energía de", "auténtica energía de"],

    // L26 (38 words)
    ["que no aburren.", "que no cansan."],

    // L28 (40 words)
    ["Materiales top para", "Materiales selectos para"],

    // L31 (24 words)
    ["ejercen presión nasal.", "generan presión nasal."],

    // L33 (32 words)
    ["parecen 3D con", "lucen 3D con"],

    // L35 (32 words)
    ["reflejos, ves nítido.", "reflejos, aprecias nítido."],

    // L38 (38 words)
    ["auténtica arquitectura pura.", "verdadera arquitectura pura."],

    // L39 (36 words)
    ["se luzca.", "se destaque."],

    // L41 (45 words)
    ["rosas en su interior.", "rosas en el interior."],

    // L42 (30 words)
    ["Luego pulen a", "Después pulen a"],

    // L45 (29 words)
    ["Pues donde más", "Justo donde más"],

    // L48 (24 words)
    ["en tu cara.</li>", "en tu rostro.</li>"],

    // L49 (24 words)
    ["Abajo es suave", "Inferiormente es suave"],

    // L51 (35 words)
    ["Cambian según de", "Varían según de"],

    // L85 (34 words)
    ["garantizando que perduren", "asegurando que perduren"],

    // L87 (43 words)
    ["ve a <a", "acude a <a"],

    // L88 (26 words)
    ["no se note", "no se perciba"],

    // L90 (34 words)
    ["Al ver las", "Al apreciar las"],

    // L91 (41 words)
    ["ciudad de alta luminosidad.", "ciudad de gran luminosidad."]
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
    const prevLines = prevContent.split('\n');
    const newLines = newContent.split('\n');

    if (prevLines.length !== newLines.length) {
        throw new Error(`[${passLabel}] Line count mismatch: ${prevLines.length} vs ${newLines.length}`);
    }

    let maxLevRatio = 0;
    let maxLcsRatio = 0;

    for (let i = 0; i < prevLines.length; i++) {
        const pLine = prevLines[i].trim();
        const nLine = newLines[i].trim();
        if (!pLine || /^<\/?(table|thead|tbody|tr|ul)>$/i.test(pLine)) continue;

        const pText = pLine.replace(/<[^>]+>/g, '').trim();
        const nText = nLine.replace(/<[^>]+>/g, '').trim();

        const pWords = pText.split(/\s+/).filter(Boolean);
        const nWords = nText.split(/\s+/).filter(Boolean);

        const m = pWords.length;
        if (m === 0) continue;

        const levDist = wordLevenshtein(pWords, nWords);
        const lcs = wordLCS(pWords, nWords);
        const lcsEdits = m - lcs;

        const levRatio = (levDist / m);
        const lcsRatio = (lcsEdits / m);

        if (levRatio > maxLevRatio) maxLevRatio = levRatio;
        if (lcsRatio > maxLcsRatio) maxLcsRatio = lcsRatio;

        if (levRatio >= 0.05 || lcsRatio >= 0.05) {
            throw new Error(`[${passLabel}] LIMIT VIOLATION on Line ${i+1}: Lev=${(levRatio * 100).toFixed(2)}%, LCS=${(lcsRatio * 100).toFixed(2)}% (Max permitted < 5.00%). Prev: "${pText}" | Next: "${nText}"`);
        }
    }

    // Verify HTML tags
    const getTags = str => (str.match(/<[^>]+>/g) || []).map(t => t.toLowerCase());
    const prevTags = getTags(prevContent);
    const newTags = getTags(newContent);

    if (prevTags.length !== newTags.length) {
        throw new Error(`[${passLabel}] HTML tag count mismatch: ${prevTags.length} vs ${newTags.length}`);
    }
    for (let t = 0; t < prevTags.length; t++) {
        if (prevTags[t] !== newTags[t]) {
            throw new Error(`[${passLabel}] Tag mismatch at index ${t}: "${prevTags[t]}" vs "${newTags[t]}"`);
        }
    }

    console.log(`[${passLabel}] Verified: max Lev=${(maxLevRatio * 100).toFixed(2)}%, max LCS=${(maxLcsRatio * 100).toFixed(2)}%. All ${prevTags.length} HTML tags identical.`);
}

console.log('--- EXECUTING SEQUENTIAL PASSES OF EDICIÓN QUIRÚRGICA ---');

// STEP 1: Read latest_base.html, apply Pass 1, save to surg_pass_1.html
console.log('\n1. Reading latest_base.html and executing Pass 1...');
const baseHtml = fs.readFileSync(baseFilePath, 'utf8');
const pass1Html = applyReplacements(baseHtml, pass1_replacements, 'Pass 1');
verifyStrictLimits(baseHtml, pass1Html, 'Pass 1');
fs.writeFileSync(pass1FilePath, pass1Html, 'utf8');
console.log(`   Saved: ${pass1FilePath} (${fs.statSync(pass1FilePath).size} bytes)`);

// STEP 2: Read surg_pass_1.html, apply Pass 2, save to surg_pass_2.html
console.log('\n2. Reading surg_pass_1.html and executing Pass 2...');
const readPass1Html = fs.readFileSync(pass1FilePath, 'utf8');
const pass2Html = applyReplacements(readPass1Html, pass2_replacements, 'Pass 2');
verifyStrictLimits(readPass1Html, pass2Html, 'Pass 2');
fs.writeFileSync(pass2FilePath, pass2Html, 'utf8');
console.log(`   Saved: ${pass2FilePath} (${fs.statSync(pass2FilePath).size} bytes)`);

// STEP 3: Read surg_pass_2.html, apply Pass 3, save to surg_pass_3.html
console.log('\n3. Reading surg_pass_2.html and executing Pass 3...');
const readPass2Html = fs.readFileSync(pass2FilePath, 'utf8');
const pass3Html = applyReplacements(readPass2Html, pass3_replacements, 'Pass 3');
verifyStrictLimits(readPass2Html, pass3Html, 'Pass 3');
fs.writeFileSync(pass3FilePath, pass3Html, 'utf8');
console.log(`   Saved: ${pass3FilePath} (${fs.statSync(pass3FilePath).size} bytes)`);

console.log('\n--- VERIFYING SAVED FILES ON DISK ---');
[pass1FilePath, pass2FilePath, pass3FilePath].forEach((f, idx) => {
    const content = fs.readFileSync(f, 'utf8');
    const bytes = fs.readFileSync(f);
    // Check BOM: UTF-8 BOM is EF BB BF
    const hasBOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    // Check double encoded characters like Ã¡, Ã©, etc.
    const doubleEncoded = /Ã[¡±³º©ª®¯°±²³´µ¶·¸¹º»¼½¾¿]/.test(content);
    console.log(`Pass ${idx+1} (${path.basename(f)}):`);
    console.log(`  Size: ${bytes.length} bytes`);
    console.log(`  Has BOM: ${hasBOM ? 'YES (Error)' : 'NO (Proper UTF-8)'}`);
    console.log(`  Double Encoded Artifacts: ${doubleEncoded ? 'YES (Error)' : 'NONE (Clean)'}`);
    if (hasBOM || doubleEncoded) {
        throw new Error(`Encoding issue detected in ${f}`);
    }
});

console.log('\nALL 3 FILES GENERATED AND VERIFIED SUCCESSFULLY IN UTF-8!');
