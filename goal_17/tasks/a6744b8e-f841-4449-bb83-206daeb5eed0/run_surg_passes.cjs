const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname);
const baseFile = path.join(dir, 'latest_base.html');
const pass1File = path.join(dir, 'surg_pass_1.html');
const pass2File = path.join(dir, 'surg_pass_2.html');
const pass3File = path.join(dir, 'surg_pass_3.html');

// Helper to compute word-level Levenshtein distance
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

function verifyChunk(passName, origLine, newLine, lineNumber) {
    if (!origLine.startsWith('<p>') || origLine.includes('[*')) {
        return null;
    }
    const origText = origLine.replace(/<[^>]+>/g, '').trim();
    const newText = newLine.replace(/<[^>]+>/g, '').trim();
    const origWords = origText.split(/\s+/).filter(Boolean);
    const newWords = newText.split(/\s+/).filter(Boolean);

    const dist = wordLevenshtein(origWords, newWords);
    const ratio = dist / origWords.length;
    const percent = (ratio * 100).toFixed(2);

    if (ratio >= 0.05) {
        throw new Error(`VIOLATION in ${passName} on line ${lineNumber}: edit ratio ${percent}% exceeds 5% limit! (dist=${dist}, words=${origWords.length})\nOrig: ${origText}\nNew: ${newText}`);
    }
    return { words: origWords.length, dist, percent };
}

function extractTags(text) {
    return (text.match(/<[^>]+>/g) || []).join('');
}

// PASS 1 replacements (targeted vocabulary upgrades, strictly < 5% edits per chunk)
const pass1Replacements = [
    // Line 2 (46 words): 'resumen,' -> 'definitiva,' (dist=1, 2.17%)
    ["En resumen,", "En definitiva,"],
    // Line 5 (41 words): 'abajo,' -> 'inferior,' (dist=1, 2.44%)
    ["sin marco abajo,", "sin marco inferior,"],
    // Line 8 (62 words): 'gomitas' -> 'almohadillas' (dist=1, 1.61%)
    ["las gomitas Megol", "las almohadillas Megol"],
    // Line 12 (55 words): 'estorbos,' -> 'obstáculos,' (dist=1, 1.82%)
    ["sin estorbos,", "sin obstáculos,"],
    // Line 16 (42 words): 'agarran' -> 'fijan' (dist=1, 2.38%)
    ["que se agarran bien", "que se fijan bien"],
    // Line 20 (65 words): 'aguanten golpes' -> 'resistan impactos' (dist=2, 3.08%)
    ["que aguanten golpes", "que resistan impactos"],
    // Line 21 (58 words): 'polímeros que inyectan.' -> 'polímeros inyectados.' (dist=2, 3.45%)
    ["polímeros que inyectan.", "polímeros inyectados."],
    // Line 22 (62 words): 'cara perfecto.' -> 'rostro perfectamente.' (dist=2, 3.23%)
    ["a tu cara perfecto.", "a tu rostro perfectamente."],
    // Line 23 (51 words): 'pegue' -> 'circule' (dist=1, 1.96%)
    ["el aire pegue en", "el aire circule en"],
    // Line 26 (73 words): 'trotar' -> 'correr' (dist=1, 1.37%)
    ["salir a trotar", "salir a correr"],
    // Line 27 (71 words): 'tipo' -> 'como' (dist=1, 1.41%)
    ["tipo la Carrera C SPORT 01/S,", "como la Carrera C SPORT 01/S,"],
    // Line 28 (51 words): 'manejar' -> 'conducir' (dist=1, 1.96%)
    ["útil para manejar", "útil para conducir"],
    // Line 29 (61 words): 'súper' -> 'muy' (dist=1, 1.64%)
    ["súper firmes.", "muy firmes."],
    // Line 30 (49 words): 'agarran' -> 'sujetan' (dist=1, 2.04%)
    ["solo agarran el cristal", "solo sujetan el cristal"],
    // Line 33 (58 words): 'brillo' -> 'reflejo' (dist=1, 1.72%)
    ["contra ese brillo molesto,", "contra ese reflejo molesto,"],
    // Line 34 (59 words): 'manejando' -> 'conduciendo' (dist=1, 1.69%)
    ["si vas manejando", "si vas conduciendo"],
    // Line 35 (39 words): 'fuerte' -> 'intensa' (dist=1, 2.56%)
    ["la luz fuerte", "la luz intensa"],
    // Line 36 (37 words): 'bici' -> 'bicicleta' (dist=1, 2.70%)
    ["vas en bici", "vas en bicicleta"],
    // Line 37 (54 words): 'quita' -> 'elimina' (dist=1, 1.85%)
    ["que quita los reflejos", "que elimina los reflejos"],
    // Line 38 (26 words): 'cansarte' -> 'fatigarte' (dist=1, 3.85%)
    ["para no cansarte", "para no fatigarte"],
    // Line 41 (60 words): 'cuiden' -> 'protejan' (dist=1, 1.67%)
    ["y te cuiden bien.", "y te protejan bien."],
    // Line 42 (36 words): 'corrida),' -> 'continua),' (dist=1, 2.78%)
    ["máscara corrida),", "máscara continua),"],
    // Line 43 (40 words): 'caen' -> 'deslizan' (dist=1, 2.50%)
    ["no se te caen con el sudor", "no se te deslizan con el sudor"],
    // Line 44 (41 words): 'atrás' -> 'detrás' (dist=1, 2.44%)
    ["hasta atrás de la oreja.", "hasta detrás de la oreja."],
    // Line 83 (68 words): 'normal' -> 'casual' (dist=1, 1.47%)
    ["ropa normal tipo", "ropa casual tipo"],
    // Line 84 (39 words): 'manejando' -> 'conduciendo' (dist=1, 2.56%)
    ["o manejando protegido.", "o conduciendo protegido."]
];

// PASS 2 replacements (applied on top of surg_pass_1.html)
const pass2Replacements = [
    // Line 2 (46 words): 'amalgaman' -> 'conjugan' (dist=1, 2.17%)
    ["amalgaman la estética", "conjugan la estética"],
    // Line 5 (41 words): 'enteras' -> 'completas' (dist=1, 2.44%)
    ["pantallas grandes enteras", "pantallas grandes completas"],
    // Line 8 (62 words): 'bici.' -> 'bicicleta.' (dist=1, 1.61%)
    ["ir en bici.", "ir en bicicleta."],
    // Line 12 (55 words): 'enorme' -> 'panorámica' (dist=1, 1.82%)
    ["pantalla enorme de", "pantalla panorámica de"],
    // Line 16 (42 words): 'muy' -> 'sumamente' (dist=1, 2.38%)
    ["muy atractivo con", "sumamente atractivo con"],
    // Line 20 (65 words): 'mal clima' -> 'clima adverso' (dist=2, 3.08%)
    ["el mal clima", "el clima adverso"],
    // Line 21 (57 words): 'como' -> 'un' (dist=1, 1.75%)
    ["Son como 20%", "Son un 20%"],
    // Line 22 (62 words): 'patillas:' -> 'varillas:' (dist=1, 1.61%)
    ["nariz y patillas:", "nariz y varillas:"],
    // Line 23 (51 words): 'ranuritas' -> 'ranuras' (dist=1, 1.96%)
    ["unas ranuritas arriba", "unas ranuras arriba"],
    // Line 26 (73 words): 'bici' -> 'bicicleta' (dist=1, 1.37%)
    ["en la bici", "en la bicicleta"],
    // Line 27 (71 words): 'bici' -> 'bicicleta' (dist=1, 1.41%)
    ["andar en bici", "andar en bicicleta"],
    // Line 28 (51 words): 'fácil.' -> 'fácilmente.' (dist=1, 1.96%)
    ["no se rompan fácil.", "no se rompan fácilmente."],
    // Line 29 (61 words): 'marcan' -> 'estilizan' (dist=1, 1.64%)
    ["porque marcan la cara,", "porque estilizan la cara,"],
    // Line 30 (49 words): 'sientes.' -> 'percibes.' (dist=1, 2.04%)
    ["casi ni las sientes.", "casi ni las percibes."],
    // Line 33 (58 words): 'pura' -> 'simple' (dist=1, 1.72%)
    ["no es pura estética:", "no es simple estética:"],
    // Line 34 (59 words): 'apaga' -> 'mitiga' (dist=1, 1.69%)
    ["apaga el brillo", "mitiga el brillo"],
    // Line 35 (39 words): 'baja' -> 'reduce' (dist=1, 2.56%)
    ["baja el brillo", "reduce el brillo"],
    // Line 36 (37 words): 'metes' -> 'adentras' (dist=1, 2.70%)
    ["te metes a un bosque,", "te adentras a un bosque,"],
    // Line 37 (54 words): 'dedos' -> 'huellas' (dist=1, 1.85%)
    ["y dedos resbalen", "y huellas resbalen"],
    // Line 38 (26 words): 'bloquean' -> 'filtran' (dist=1, 3.85%)
    ["bloquean el 100%", "filtran el 100%"],
    // Line 41 (60 words): 'entiendes' -> 'comprendes' (dist=1, 1.67%)
    ["y si los entiendes ya sabes", "y si los comprendes ya sabes"],
    // Line 42 (36 words): 'cristal.' -> 'lente.' (dist=1, 2.78%)
    ["ancho del cristal.", "ancho del lente."],
    // Line 43 (40 words): 'oprimen' -> 'presionan' (dist=1, 2.50%)
    ["ni te oprimen la nariz", "ni te presionan la nariz"],
    // Line 44 (41 words): 'costados' -> 'laterales' (dist=1, 2.44%)
    ["a los costados pero", "a los laterales pero"],
    // Line 83 (68 words): 'anda' -> 'figura' (dist=1, 1.47%)
    ["Carrera siempre anda entre los", "Carrera siempre figura entre los"],
    // Line 84 (39 words): 'excelente' -> 'impecable' (dist=1, 2.56%)
    ["te ves excelente", "te ves impecable"]
];

// PASS 3 replacements (applied on top of surg_pass_2.html)
const pass3Replacements = [
    // Line 2 (46 words): 'descanso.' -> 'ocio.' (dist=1, 2.17%)
    ["de descanso.", "de ocio."],
    // Line 5 (41 words): 'sobresalientes.' -> 'destacadas.' (dist=1, 2.44%)
    ["siluetas sobresalientes.", "siluetas destacadas."],
    // Line 8 (62 words): 'Traen' -> 'Incorporan' (dist=1, 1.61%)
    ["Traen sus perforaciones", "Incorporan sus perforaciones"],
    // Line 12 (55 words): 'plástico' -> 'polímero' (dist=1, 1.82%)
    ["Ese plástico inyectado", "Ese polímero inyectado"],
    // Line 16 (42 words): 'patillas' -> 'varillas' (dist=1, 2.38%)
    ["con patillas de goma", "con varillas de goma"],
    // Line 20 (65 words): 'hacer gafas buenas' -> 'crear gafas excelentes' (dist=2, 3.08%)
    ["hacer gafas buenas", "crear gafas excelentes"],
    // Line 21 (57 words): 'a los lados' -> 'en los laterales' (dist=2, 3.51%)
    ["a los lados de la cabeza", "en los laterales de la cabeza"],
    // Line 22 (62 words): 'ni se enteran.' -> 'no se mueven.' (dist=2, 3.23%)
    ["las gafas ni se enteran.", "las gafas no se mueven."],
    // Line 23 (51 words): 'lados' -> 'laterales' (dist=1, 1.96%)
    ["y a los lados para", "y a los laterales para"],
    // Line 26 (73 words): 'cara' -> 'fisonomía' (dist=1, 1.37%)
    ["tiene su cara y", "tiene su fisonomía y"],
    // Line 27 (71 words): 'es súper peligroso.' -> 'resulta muy peligroso.' (dist=2, 2.82%)
    ["es súper peligroso.", "resulta muy peligroso."],
    // Line 28 (51 words): 'para' -> 'hacia' (dist=1, 1.96%)
    ["mirar para abajo", "mirar hacia abajo"],
    // Line 29 (61 words): 'andas' -> 'estás' (dist=1, 1.64%)
    ["o andas en el agua", "o estás en el agua"],
    // Line 30 (49 words): 'tropezarte' -> 'tropezar' (dist=1, 2.04%)
    ["para no tropezarte con", "para no tropezar con"],
    // Line 33 (58 words): 'y traen' -> 'e integran' (dist=2, 3.45%)
    ["y traen capas", "e integran capas"],
    // Line 34 (59 words): 'ni' -> 'no' (dist=1, 1.69%)
    ["los ojos ni se cansan", "los ojos no se cansan"],
    // Line 35 (39 words): 'trae' -> 'incorpora' (dist=1, 2.56%)
    ["trae como unas capas", "incorpora como unas capas"],
    // Line 36 (37 words): 'con' -> 'según' (dist=1, 2.70%)
    ["con la luz y", "según la luz y"],
    // Line 37 (54 words): 'atrás,' -> 'detrás,' (dist=1, 1.85%)
    ["inciden por atrás,", "inciden por detrás,"],
    // Line 38 (26 words): 'sanos' -> 'protegidos' (dist=1, 3.85%)
    ["estén sanos siempre.", "estén protegidos siempre."],
    // Line 41 (60 words): 'Comprarte' -> 'Adquirir' (dist=1, 1.67%)
    ["Comprarte las gafas", "Adquirir las gafas"],
    // Line 42 (36 words): 'taparte' -> 'cubrirte' (dist=1, 2.78%)
    ["para taparte bien los ojos.", "para cubrirte bien los ojos."],
    // Line 43 (40 words): 'está' -> 'figura' (dist=1, 2.50%)
    ["un guion está el otro,", "un guion figura el otro,"],
    // Line 44 (41 words): 'Eso' -> 'Esto' (dist=1, 2.44%)
    ["Eso hace que se afiancen", "Esto hace que se afiancen"],
    // Line 83 (68 words): 'salir' -> 'urbana' (dist=1, 1.47%)
    ["ropa de salir y", "ropa urbana y"],
    // Line 84 (39 words): 'así' -> 'muy' (dist=1, 2.56%)
    ["diseño así aerodinámico,", "diseño muy aerodinámico,"]
];

function applyPass(inputContent, replacements, passName, outputFile, baseTags) {
    console.log(`\n================================`);
    console.log(`PROCESSING ${passName}`);
    console.log(`================================`);
    let outputContent = inputContent;

    for (const [target, replacement] of replacements) {
        if (!outputContent.includes(target)) {
            throw new Error(`Target not found in ${passName}: "${target}"`);
        }
        outputContent = outputContent.replace(target, replacement);
    }

    const inLines = inputContent.split('\n');
    const outLines = outputContent.split('\n');

    let totalChunks = 0;
    let maxRatio = 0;
    for (let i = 0; i < inLines.length; i++) {
        const origLine = inLines[i];
        const newLine = outLines[i];
        const res = verifyChunk(passName, origLine, newLine, i + 1);
        if (res) {
            totalChunks++;
            const ratio = res.dist / res.words;
            if (ratio > maxRatio) maxRatio = ratio;
            console.log(`Line ${(i + 1).toString().padStart(2, ' ')}: words=${res.words.toString().padStart(2, ' ')}, edits=${res.dist}, editRatio=${res.percent.padStart(5, ' ')}% < 5.0% OK`);
        }
    }

    // Verify tag integrity
    const currentTags = extractTags(outputContent);
    if (currentTags !== baseTags) {
        throw new Error(`CRITICAL: HTML tags altered in ${passName}!`);
    }

    // Write file in UTF-8
    fs.writeFileSync(outputFile, outputContent, 'utf8');
    console.log(`-> Saved ${outputFile} successfully.`);
    console.log(`-> ${passName} VERIFIED: ${totalChunks} chunks processed. Max edit ratio: ${(maxRatio * 100).toFixed(2)}% (< 5.0%). Tags: 100% match.`);

    return outputContent;
}

// EXECUTION
const baseContent = fs.readFileSync(baseFile, 'utf8');
const baseTags = extractTags(baseContent);

// 1. Pass 1 on top of latest_base.html -> surg_pass_1.html
const p1Content = applyPass(baseContent, pass1Replacements, 'Pass 1', pass1File, baseTags);

// 2. Read surg_pass_1.html, apply Pass 2 cumulatively -> surg_pass_2.html
const p1Read = fs.readFileSync(pass1File, 'utf8');
const p2Content = applyPass(p1Read, pass2Replacements, 'Pass 2', pass2File, baseTags);

// 3. Read surg_pass_2.html, apply Pass 3 cumulatively -> surg_pass_3.html
const p2Read = fs.readFileSync(pass2File, 'utf8');
const p3Content = applyPass(p2Read, pass3Replacements, 'Pass 3', pass3File, baseTags);

console.log('\n================================');
console.log('ALL 3 SURGICAL PASSES COMPLETE!');
console.log('================================');
