const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/221fa0a0-3a5c-493f-bd49-3f29dc8ef721';
const baseFile = path.join(dir, 'latest_base.html');
const pass1File = path.join(dir, 'surg_pass_1.html');
const pass2File = path.join(dir, 'surg_pass_2.html');
const pass3File = path.join(dir, 'surg_pass_3.html');

// Helper for word-level Levenshtein distance
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

function splitIntoChunks(html) {
    const tableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
    const tables = [];
    const blindedHtml = html.replace(tableRegex, (m) => {
        tables.push(m);
        return '[[ATOMIC_BLOCK_' + (tables.length - 1) + ']]';
    });

    const boundaryRegex = /(?=<h[1-6]\b[^>]*>|<p\b[^>]*>|<ul\b[^>]*>|<ol\b[^>]*>|<li\b[^>]*>|<div\b[^>]*>|<table\b[^>]*>|<blockquote\b[^>]*>|\[\[ATOMIC_BLOCK_\d+\]\])/gi;
    const blocks = blindedHtml.split(boundaryRegex).filter(b => b.trim().length > 0);
    return { blocks, tables };
}

function extractTags(text) {
    const matches = text.match(/<[^>]+>/g) || [];
    return matches.join('');
}

// PASS 1 substitutions
const pass1Replacements = [
    // Chunk 2 (45 words): "plástico" -> "material" (1 word, 2.22%)
    ["el plástico se nota resistente.", "el material se nota resistente."],

    // Chunk 4 (47 words): "puro" -> "mero" (1 word, 2.13%)
    ["no es puro marketing,", "no es mero marketing,"],

    // Chunk 6 (62 words): "molesta" -> "incomoda" (1 word, 1.61%)
    ["no te molesta de reojo.", "no te incomoda de reojo."],

    // Chunk 9 (66 words): "arregla" -> "soluciona" (1 word, 1.52%)
    ["arregla eso gracias a", "soluciona eso gracias a"],

    // Chunk 12 (80 words): "liarte" -> "confusiones" (1 word, 1.25%)
    ["sin liarte.", "sin confusiones."],

    // Chunk 14 (70 words): "piso" -> "terreno" (1 word, 1.43%)
    ["si el piso está feo.", "si el terreno está feo."],

    // Chunk 17 (74 words): "aguanta" -> "resiste" (1 word, 1.35%)
    ["El material aguanta los rayones,", "El material resiste los rayones,"],

    // Chunk 18 (38 words): "bici" -> "bicicleta" (1 word, 2.63%)
    ["rápido en la bici,", "rápido en la bicicleta,"],

    // Chunk 19 (40 words): "agarraron" -> "adoptaron" (1 word, 2.50%)
    ["agarraron el acabado negro mate", "adoptaron el acabado negro mate"],

    // Chunk 20 (38 words): "aguanta" -> "resiste" (1 word, 2.63%)
    ["aguanta los rayones típicos", "resiste los rayones típicos"],

    // Chunk 21 (38 words): "típico" -> "habitual" (1 word, 2.63%)
    ["sin el típico barniz brillante,", "sin el habitual barniz brillante,"],

    // Chunk 22 (49 words): "agarra" -> "adhiere" (1 word, 2.04%)
    ["la textura se agarra perfecto a la cara,", "la textura se adhiere perfecto a la cara,"],

    // Chunk 24 (34 words): "aguantan" -> "resisten" (1 word, 2.94%)
    ["estos cristales aguantan los golpes", "estos cristales resisten los golpes"],

    // Chunk 25 (53 words): "brutales" -> "severos" (1 word, 1.89%)
    ["unos golpes brutales,", "unos golpes severos,"],

    // Chunk 26 (49 words): "manejar" -> "conducir" (1 word, 2.04%)
    ["manejar todos los días se hace más fácil", "conducir todos los días se hace más fácil"],

    // Chunk 27 (35 words): "claritos" -> "claros" (1 word, 2.86%)
    ["ves los obstáculos claritos en el camino", "ves los obstáculos claros en el camino"],

    // Chunk 28 (76 words): "frena" -> "mitiga" (1 word, 1.32%)
    ["esa capa espejada frena los reflejos", "esa capa espejada mitiga los reflejos"],

    // Chunk 30 (51 words): "importa bastante" -> "resulta clave" (2 words, 3.92%)
    ["y la inclinación importa bastante,", "y la inclinación resulta clave,"],

    // Chunk 31 (99 words): "baila" -> "oscila" (1 word, 1.01%)
    ["una gafa grande baila al correr", "una gafa grande oscila al correr"],

    // Chunk 33 (171 words): "correr" -> "competir" (1 word, 0.58%)
    ["esquiar o correr en autos,", "esquiar o competir en autos,"],

    // Chunk 36 (93 words): "cuadrito" -> "recuadro" (1 word, 1.08%)
    ["con un cuadrito a veces.", "con un recuadro a veces."],

    // Chunk 38 (100 words): "manejar" -> "conducir" (1 word, 1.00%)
    ["te salva la vida al manejar,", "te salva la vida al conducir,"],

    // Chunk 40 (112 words): "te saca" -> "elimina" (2 words, 1.79%)
    ["te saca esos brillos molestos.", "elimina esos brillos molestos."],

    // Chunk 42 (168 words): "bien" -> "muy" (1 word, 0.60%)
    ["y la barbilla bien fina,", "y la barbilla muy fina,"],

    // Chunk 44 (99 words): "pelotita" -> "bola" (1 word, 1.01%)
    ["ves la pelotita blanca perfecto", "ves la bola blanca perfecto"],

    // Chunk 46 (94 words): "bici" -> "bicicleta" (1 word, 1.06%)
    ["andar en bici porque pasas", "andar en bicicleta porque pasas"]
];

// PASS 2 substitutions (applied on top of pass 1)
const pass2Replacements = [
    // Chunk 2 (45 words): "andas" -> "estás" (1 word, 2.22%)
    ["o andas saltando.", "o estás saltando."],

    // Chunk 4 (47 words): "peguen" -> "acoplen" (1 word, 2.13%)
    ["las gafas se te peguen bien a la cara.", "las gafas se te acoplen bien a la cara."],

    // Chunk 6 (62 words): "corta" -> "desvía" (1 word, 1.61%)
    ["corta el viento frontal", "desvía el viento frontal"],

    // Chunk 9 (66 words): "un montón" -> "intensamente" (2 words changed, 3.03%)
    ["vas sudando un montón en la ruta deportiva.", "vas sudando intensamente en la ruta deportiva."],

    // Chunk 12 (80 words): "blandito" -> "flexible" (1 word, 1.25%)
    ["un material blandito que no resbala", "un material flexible que no resbala"],

    // Chunk 14 (70 words): "Acá pongo" -> "Aquí incluyo" (2 words, 2.86%)
    ["Acá pongo una tabla con los datos", "Aquí incluyo una tabla con los datos"],

    // Chunk 17 (74 words): "queda" -> "luce" (1 word, 1.35%)
    ["la verdad queda muy bien,", "la verdad luce muy bien,"],

    // Chunk 18 (38 words): "notas" -> "aprecias" (1 word, 2.63%)
    ["ahí notas mucho la diferencia.", "ahí aprecias mucho la diferencia."],

    // Chunk 19 (40 words): "siente" -> "percibe" (1 word, 2.50%)
    ["se siente bastante diferente en las manos.", "se percibe bastante diferente en las manos."],

    // Chunk 20 (38 words): "rápido" -> "fácilmente" (1 word, 2.63%)
    ["el sudor no lo daña rápido,", "el sudor no lo daña fácilmente,"],

    // Chunk 21 (38 words): "descansa" -> "reposa" (1 word, 2.63%)
    ["la nariz te descansa más al correr por horas.", "la nariz te reposa más al correr por horas."],

    // Chunk 22 (49 words): "andar acomodando" -> "estar reajustando" (2 words, 4.08%)
    ["de andar acomodando los lentes", "de estar reajustando los lentes"],

    // Chunk 24 (34 words): "duro" -> "resistente" (1 word, 2.94%)
    ["con policarbonato muy duro,", "con policarbonato muy resistente,"],

    // Chunk 25 (53 words): "súper" -> "sumamente" (1 word, 1.89%)
    ["la verdad ves todo súper claro.", "la verdad ves todo sumamente claro."],

    // Chunk 26 (49 words): "ayuda" -> "contribuye" (1 word, 2.04%)
    ["la polarización ayuda bastante si vas", "la polarización contribuye bastante si vas"],

    // Chunk 27 (35 words): "rápido" -> "velozmente" (1 word, 2.86%)
    ["Reaccionas rápido, a veces ganar", "Reaccionas velozmente, a veces ganar"],

    // Chunk 28 (76 words): "sufren" -> "se fatigan" (2 words diff, 2.63%)
    ["los ojos no sufren tanto,", "los ojos no se fatigan tanto,"],

    // Chunk 30 (51 words): "cambia" -> "altera" (1 word, 1.96%)
    ["al final todo eso te cambia la visión", "al final todo eso te altera la visión"],

    // Chunk 31 (99 words): "agarra" -> "fija" (1 word, 1.01%)
    ["se agarra firmemente en tres puntos", "se fija firmemente en tres puntos"],

    // Chunk 33 (171 words): "salir" -> "aparecer" (1 word, 0.58%)
    ["salir en la tele, los músicos", "aparecer en la tele, los músicos"],

    // Chunk 36 (93 words): "grande" -> "amplia" (1 word, 1.08%)
    ["en la parte más grande,", "en la parte más amplia,"],

    // Chunk 38 (100 words): "otra cosa" -> "diferente" (2 words diff, 2.00%)
    ["El triple degradado es otra cosa,", "El triple degradado es diferente,"],

    // Chunk 40 (112 words): "te cansa" -> "fatiga" (2 words diff, 1.79%)
    ["la vista se te cansa rapidísimo,", "la vista se fatiga rapidísimo,"],

    // Chunk 42 (168 words): "quedan" -> "lucen" (1 word, 0.60%)
    ["modelos de máscara de Carrera Sport quedan muy bien.", "modelos de máscara de Carrera Sport lucen muy bien."],

    // Chunk 44 (99 words): "otra historia" -> "distintas" (2 words diff, 2.02%)
    ["Las gafas de alto contraste son otra historia,", "Las gafas de alto contraste son distintas,"],

    // Chunk 46 (94 words): "auto" -> "vehículo" (1 word, 1.06%)
    ["En un auto casi no funcionan,", "En un vehículo casi no funcionan,"]
];

// PASS 3 substitutions (applied on top of pass 2)
const pass3Replacements = [
    // Chunk 2 (45 words): "Van perfecto" -> "Resultan ideales" (2 words, 4.44%)
    ["Van perfecto para entrenar fuerte.", "Resultan ideales para entrenar fuerte."],

    // Chunk 4 (47 words): "en serio" -> "notablemente" (2 words diff, 4.26%)
    ["el diseño cambia en serio y te quedan", "el diseño cambia notablemente y te quedan"],

    // Chunk 6 (62 words): "horrible" -> "molesto" (1 word, 1.61%)
    ["es horrible que se te meta polvo", "es molesto que se te meta polvo"],

    // Chunk 9 (66 words): "bien claro" -> "con nitidez" (2 words, 3.03%)
    ["puedes ver el camino bien claro todo el tiempo,", "puedes ver el camino con nitidez todo el tiempo,"],

    // Chunk 12 (80 words): "le pone a" -> "incorpora en" (2 words, 2.50%)
    ["La marca Carrera le pone a modelos", "La marca Carrera incorpora en modelos"],

    // Chunk 14 (70 words): "tema" -> "contacto" (1 word, 1.43%)
    ["El material destaca con el tema del agua,", "El material destaca con el contacto del agua,"],

    // Chunk 17 (74 words): "romperse" -> "dañarse" (1 word, 1.35%)
    ["sin romperse de la nada.", "sin dañarse de la nada."],

    // Chunk 18 (38 words): "Funciona" -> "Responde" (1 word, 2.63%)
    ["Funciona muy bien si vas rápido", "Responde muy bien si vas rápido"],

    // Chunk 19 (40 words): "pones" -> "detienes" (1 word, 2.50%)
    ["Te pones a mirar las", "Te detienes a mirar las"],

    // Chunk 20 (38 words): "siente" -> "percibe" (1 word, 2.63%)
    ["Ese acabado se siente suave,", "Ese acabado se percibe suave,"],

    // Chunk 21 (38 words): "tocarlas" -> "palparlas" (1 word, 2.63%)
    ["al tocarlas, cada gramo cuenta", "al palparlas, cada gramo cuenta"],

    // Chunk 22 (49 words): "de verdad" -> "ciertamente" (2 words diff, 4.08%)
    ["de verdad te olvidas de estar reajustando", "ciertamente te olvidas de estar reajustando"],

    // Chunk 24 (34 words): "problema" -> "inconvenientes" (1 word, 2.94%)
    ["sin problema.", "sin inconvenientes."],

    // Chunk 25 (53 words): "acá" -> "aquí" (1 word, 1.89%)
    ["pero acá el valor Abbe óptico", "pero aquí el valor Abbe óptico"],

    // Chunk 26 (49 words): "hace" -> "vuelve" (1 word, 2.04%)
    ["se hace más fácil con esto.", "se vuelve más fácil con esto."],

    // Chunk 27 (35 words): "descansan" -> "reposan" (1 word, 2.86%)
    ["Tus ojos descansan más,", "Tus ojos reposan más,"],

    // Chunk 28 (76 words): "nota" -> "aprecia" (1 word, 1.32%)
    ["Uno lo nota fácil cuando revisa", "Uno lo aprecia fácil cuando revisa"],

    // Chunk 30 (51 words): "ver" -> "considerar" (1 word, 1.96%)
    ["también tienes que ver lo curvas que son,", "también tienes que considerar lo curvas que son,"],

    // Chunk 31 (99 words): "acomodas muy fácil" -> "ajustas con facilidad" (3 words, 3.03%)
    ["inserciones flexibles que acomodas muy fácil,", "inserciones flexibles que ajustas con facilidad,"],

    // Chunk 33 (171 words): "vas perfecto" -> "luces impecable" (2 words, 1.17%)
    ["vas a dar una vuelta por el centro de la ciudad y vas perfecto.", "vas a dar una vuelta por el centro de la ciudad y luces impecable."],

    // Chunk 36 (93 words): "doliendo" -> "incomodando" (1 word, 1.08%)
    ["una patilla corta te termina doliendo en la cabeza.", "una patilla corta te termina incomodando en la cabeza."],

    // Chunk 38 (100 words): "da bastante trabajo" -> "exige alta precisión" (3 words, 3.00%)
    ["fabricar eso da bastante trabajo.", "fabricar eso exige alta precisión."],

    // Chunk 40 (112 words): "andas" -> "entrenas" (1 word, 0.89%)
    ["la verdad andas mucho más cómodo", "la verdad entrenas mucho más cómodo"],

    // Chunk 42 (168 words): "un montón" -> "notablemente" (2 words diff, 1.19%)
    ["te ayudan un montón para que no te veas igual.", "te ayudan notablemente para que no te veas igual."],

    // Chunk 44 (99 words): "súper" -> "completamente" (1 word, 1.01%)
    ["con los ojos súper descansados.", "con los ojos completamente descansados."],

    // Chunk 46 (94 words): "Adentro" -> "Dentro" (1 word, 1.06%)
    ["Adentro de la casa son transparentes,", "Dentro de la casa son transparentes,"]
];

function applyAndVerifyPass(inputContent, replacements, passName) {
    let outputContent = inputContent;

    for (const [target, replacement] of replacements) {
        if (!outputContent.includes(target)) {
            throw new Error(`Target not found in ${passName}: "${target}"`);
        }
        outputContent = outputContent.replace(target, replacement);
    }

    const inSplit = splitIntoChunks(inputContent);
    const outSplit = splitIntoChunks(outputContent);

    if (inSplit.blocks.length !== outSplit.blocks.length) {
        throw new Error(`Block count mismatch in ${passName}: in=${inSplit.blocks.length}, out=${outSplit.blocks.length}`);
    }

    let checkedChunks = 0;
    let maxPercent = 0;

    for (let i = 0; i < inSplit.blocks.length; i++) {
        const inBlock = inSplit.blocks[i];
        const outBlock = outSplit.blocks[i];

        const inText = inBlock.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const outText = outBlock.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        const inWords = inText.split(/\s+/).filter(Boolean);
        const outWords = outText.split(/\s+/).filter(Boolean);

        if (inWords.length === 0) continue;

        const dist = wordLevenshtein(inWords, outWords);
        const ratio = dist / inWords.length;
        const percent = ratio * 100;

        if (dist > 0) {
            checkedChunks++;
            if (percent > maxPercent) {
                maxPercent = percent;
            }
            if (ratio >= 0.05) {
                throw new Error(`STRICT LIMIT VIOLATION in ${passName} Block ${i + 1}: ${percent.toFixed(2)}% >= 5.0% (dist=${dist}, words=${inWords.length})\nIN: ${inText}\nOUT: ${outText}`);
            }
            console.log(`  ${passName} Block ${i + 1} edited: dist=${dist}/${inWords.length} (${percent.toFixed(2)}%)`);
        }
    }

    console.log(`[${passName}] Verified ${checkedChunks} modified chunks. Max edit percentage: ${maxPercent.toFixed(2)}% (< 5.0% STRICT REQUIREMENT MET)`);
    return outputContent;
}

// 1. Read base content
console.log('--- Reading latest_base.html ---');
const baseContent = fs.readFileSync(baseFile, 'utf8');

// 2. Pass 1
console.log('\n--- Applying Pass 1 ---');
const pass1Content = applyAndVerifyPass(baseContent, pass1Replacements, 'Pass 1');
fs.writeFileSync(pass1File, pass1Content, 'utf8');
console.log(`Saved: ${pass1File}`);

// 3. Pass 2 (Read surg_pass_1.html, apply cumulatively)
console.log('\n--- Reading surg_pass_1.html and applying Pass 2 ---');
const readPass1 = fs.readFileSync(pass1File, 'utf8');
const pass2Content = applyAndVerifyPass(readPass1, pass2Replacements, 'Pass 2');
fs.writeFileSync(pass2File, pass2Content, 'utf8');
console.log(`Saved: ${pass2File}`);

// 4. Pass 3 (Read surg_pass_2.html, apply cumulatively)
console.log('\n--- Reading surg_pass_2.html and applying Pass 3 ---');
const readPass2 = fs.readFileSync(pass2File, 'utf8');
const pass3Content = applyAndVerifyPass(readPass2, pass3Replacements, 'Pass 3');
fs.writeFileSync(pass3File, pass3Content, 'utf8');
console.log(`Saved: ${pass3File}`);

// 5. Final integrity checks
console.log('\n--- Running Integrity Checks ---');
const baseTags = extractTags(baseContent);
const p1Tags = extractTags(pass1Content);
const p2Tags = extractTags(pass2Content);
const p3Tags = extractTags(pass3Content);

if (baseTags !== p1Tags) throw new Error('FATAL: HTML tags altered in Pass 1!');
if (baseTags !== p2Tags) throw new Error('FATAL: HTML tags altered in Pass 2!');
if (baseTags !== p3Tags) throw new Error('FATAL: HTML tags altered in Pass 3!');
console.log('HTML tag integrity: 100% IDENTICAL across all passes!');

// Check encoding / character sanity
[pass1Content, pass2Content, pass3Content].forEach((c, idx) => {
    if (c.includes('\ufffd') || /Ã[\x80-\xbf]/.test(c)) {
        throw new Error(`FATAL: Encoding artifact detected in Pass ${idx + 1}!`);
    }
});
console.log('Encoding integrity: Valid UTF-8 without double encoding artifacts.');
console.log('\nAll 3 surgical passes completed and validated successfully!');
