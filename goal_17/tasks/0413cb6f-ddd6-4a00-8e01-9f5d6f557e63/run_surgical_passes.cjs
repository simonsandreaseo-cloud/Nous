const fs = require('fs');
const path = require('path');

const dir = __dirname;
const baseFile = path.join(dir, 'latest_base.html');
const pass1File = path.join(dir, 'surg_pass_1.html');
const pass2File = path.join(dir, 'surg_pass_2.html');
const pass3File = path.join(dir, 'surg_pass_3.html');

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

function verifyAndReportChunk(name, origLine, newLine) {
    const isP = origLine.startsWith('<p>');
    const isLi = origLine.startsWith('  <li>') || origLine.startsWith('<li>');
    if ((!isP && !isLi) || origLine.includes('[*')) {
        return null;
    }
    const origText = origLine.replace(/<[^>]+>/g, '').trim();
    const newText = newLine.replace(/<[^>]+>/g, '').trim();
    const origWords = origText.split(/\s+/).filter(Boolean);
    const newWords = newText.split(/\s+/).filter(Boolean);

    if (origWords.length === 0) return null;

    const dist = wordLevenshtein(origWords, newWords);
    const ratio = dist / origWords.length;
    const percent = (ratio * 100).toFixed(2);

    if (ratio >= 0.05) {
        throw new Error(`VIOLATION in ${name}: edit ratio ${percent}% exceeds 5% limit! (dist=${dist}, words=${origWords.length})\nOrig: ${origText}\nNew: ${newText}`);
    }
    return { words: origWords.length, dist, percent };
}

// PASS 1 replacements
const pass1Replacements = [
    // Line 2: 36 words, max 1
    ["Comprar unas gafas ZEGNA vale la pena", "Adquirir unas gafas ZEGNA vale la pena"],

    // Line 5: 72 words, max 3
    ["nada más mirarlos.", "a simple vista."],

    // Line 6: 81 words, max 3
    ["para armar la lista,", "para elaborar la lista,"],

    // Line 9: 67 words, max 3
    ["ideal para empezar,", "ideal para iniciarse,"],

    // Line 10: 48 words, max 2
    ["si manejas varias horas,", "si conduces varias horas,"],

    // Line 14: 55 words, max 2
    ["que ni notas puesto.", "que apenas se percibe."],

    // Line 15: 54 words, max 2
    ["El material aguanta el día a día,", "El material resiste el uso diario,"],

    // Line 19: 63 words, max 3
    ["un diseño bien geométrico", "un diseño marcadamente geométrico"],

    // Line 20: 69 words, max 3
    ["sin llamar la atención de más,", "sin estridencias innecesarias,"],

    // Line 24: 56 words, max 2
    ["para taparse del sol,", "para protegerse del sol,"],

    // Line 25: 80 words, max 3
    ["todo se ve limpio.", "con una estética pulcra."],

    // Line 28: 83 words, max 4
    ["le da justo al punto,", "acierta con precisión,"],

    // Line 29: 69 words, max 3
    ["relojes caros", "relojes de alta gama"],

    // Line 32: 48 words, max 2
    ["un adorno cualquiera,", "un detalle meramente ornamental,"],

    // Line 33: 90 words, max 4
    ["que hizo Ermenegildo Zegna", "construida por Ermenegildo Zegna"],

    // Line 36: 80 words, max 3
    ["buscan que no pesen casi nada", "priorizan una ligereza extrema"],

    // Line 39 (li): 63 words, max 3
    ["esto no da alergia y de paso cuida el ambiente.", "es hipoalergénico y respetuoso con el ambiente."],

    // Line 40 (li): 55 words, max 2
    ["pesa casi nada comparado con el acero común.", "es notablemente más ligero que el acero común."],

    // Line 41 (li): 37 words, max 1
    ["donde apoyan las orejas,", "en los terminales,"],

    // Line 42 (li): 44 words, max 2
    ["un vidrio mineral fino,", "vidrio mineral refinado,"],

    // Line 46: 59 words, max 2
    ["ambos materiales son buenos,", "ambos materiales son sobresalientes,"],

    // Line 47: 68 words, max 3
    ["patillas bien finitas", "varillas sumamente esbeltas"],

    // Line 84: 78 words, max 3
    ["y ya se van poniendo feos", "deteriorando su aspecto"],

    // Line 85: 94 words, max 4
    ["Pásales el pañito de microfibra", "Utiliza una gamuza de microfibra"],

    // Line 88: 54 words, max 2
    ["para verse bien y tener estilo,", "para realzar el estilo personal,"],

    // Line 89: 89 words, max 4
    ["o manejar y te ves bien", "o conducir y lucir elegante"],

    // Line 92: 51 words, max 2
    ["parece una estructura de edificio.", "evoca líneas arquitectónicas."],

    // Line 93: 70 words, max 3
    ["con la parte de arriba plana,", "con un puente superior plano,"],

    // Line 96: 43 words, max 2
    ["que cae bien,", "muy equilibrada,"],

    // Line 97: 92 words, max 4
    ["recuerda a modelos antiguos,", "evoca siluetas clásicas,"],

    // Line 100: 70 words, max 3
    ["para quitar el reflejo molesto del sol.", "para neutralizar el reflejo molesto del sol."],

    // Line 101: 69 words, max 3
    ["los ojos descansan bien.", "la mirada permanece relajada."],

    // Line 104: 48 words, max 2
    ["armaron una <strong>guía", "elaboraron una <strong>guía"],

    // Line 105: 46 words, max 2
    ["hay que mirar tres elementos:", "conviene evaluar tres elementos:"],

    // Line 107 (li): 48 words, max 2
    ["combina fácil con lo que te pongas.", "armoniza fácilmente con tu vestimenta."],

    // Line 108 (li): 46 words, max 2
    ["que usa casi todo el mundo,", "de mayor difusión,"],

    // Line 109 (li): 55 words, max 2
    ["Son lentes bien amplios,", "Monturas de proporciones generosas,"],

    // Line 111: 50 words, max 2
    ["eso siempre suma.", "aportando un valor añadido."],

    // Line 114: 76 words, max 3
    ["hacer accesorios en masa sin chiste,", "fabricar piezas genéricas en serie,"],

    // Line 115: 57 words, max 2
    ["juntan tecnología con trabajo a mano,", "conjugan tecnología con maestría artesanal,"],

    // Line 116: 63 words, max 3
    ["te cambia la pinta enseida", "eleva la presencia al instante"],

    // Line 119: 58 words, max 2
    ["firmas de vestimenta de toda la vida,", "firmas de moda tradicionales,"],

    // Line 120: 95 words, max 4
    ["que casi ni se sienten puestos.", "cuya presencia apenas se percibe."],

    // Line 123: 82 words, max 4
    ["piezas excelentes de verdad.", "piezas de genuina excelencia."],

    // Line 124: 91 words, max 4
    ["sin romperse fácil.", "sin deteriorarse fácilmente."],

    // Line 127: 87 words, max 4
    ["que vayan con tu onda", "afines a tu estilo"],

    // Line 128: 59 words, max 2
    ["el negro de siempre ya aburre un poco.", "el negro tradicional cede protagonismo."],

    // Line 129: 61 words, max 2
    ["la gente que sabe pide lentes", "el usuario informado prefiere lentes"],

    // Line 132: 78 words, max 3
    ["ellas mandan la pauta siempre.", "éstas marcan las directrices siempre."],

    // Line 133: 98 words, max 4
    ["date una vuelta por las", "conviene explorar las"],

    // Line 136: 63 words, max 3
    ["Como estos artículos cuestan lo suyo,", "Dada la categoría de estas piezas,"],

    // Line 137: 36 words, max 1
    ["Armamos una lista rápida", "Presentamos una síntesis estructurada"],

    // Line 172: 107 words, max 5
    ["sirven para manejar cuando el sol pega fuerte", "resultan idóneos para conducir bajo radiación intensa"]
];

// PASS 2 replacements (applied on top of pass 1)
const pass2Replacements = [
    // Line 2: 36 words, max 1
    ["te cubren bien los ojos del sol", "te protegen bien los ojos del sol"],

    // Line 5: 72 words, max 3
    ["te fijas en los materiales,", "evalúas los materiales,"],

    // Line 6: 81 words, max 3
    ["qué tan claros son los cristales,", "la nitidez de los cristales,"],

    // Line 9: 67 words, max 3
    ["la nariz ni las nota,", "la nariz apenas las percibe,"],

    // Line 10: 48 words, max 2
    ["además puestas se ven bien.", "además lucen impecables."],

    // Line 14: 55 words, max 2
    ["detalles simples,", "detalles sobrios,"],

    // Line 15: 54 words, max 2
    ["combinan fácil con cualquier vestimenta.", "combinan fácilmente con cualquier vestimenta."],

    // Line 19: 63 words, max 3
    ["no pesa casi nada", "apenas tiene peso"],

    // Line 20: 69 words, max 3
    ["te cuidan del sol", "te protegen del sol"],

    // Line 24: 56 words, max 2
    ["modelos lanzados hace poco.", "modelos de reciente creación."],

    // Line 25: 80 words, max 3
    ["así hacen monturas bien livianas", "logrando monturas muy livianas"],

    // Line 28: 83 words, max 4
    ["levanta cualquier vestimenta", "realza cualquier vestimenta"],

    // Line 29: 69 words, max 3
    ["usan metales firmes", "emplean metales nobles"],

    // Line 32: 48 words, max 2
    ["muestra los comienzos del taller", "evoca los orígenes del taller"],

    // Line 33: 90 words, max 4
    ["ayudar a la gente de la zona,", "apoyar a la comunidad local,"],

    // Line 36: 80 words, max 3
    ["revisan el marco a cada rato", "inspeccionan minuciosamente el marco"],

    // Line 39 (li): 63 words, max 3
    ["un brillo que aguanta bien el uso de todos los días.", "un lustre que resiste bien el uso diario."],

    // Line 40 (li): 55 words, max 2
    ["resiste golpes, no se oxida nunca", "soporta impactos, es inmune a la corrosión"],

    // Line 41 (li): 37 words, max 1
    ["sin pelarse rápido.", "sin descascarillarse."],

    // Line 42 (li): 44 words, max 2
    ["así la vista no se cansa tan rápido", "evitando la fatiga ocular prematura"],

    // Line 46: 59 words, max 2
    ["sientes el cambio al instante.", "aprecias la diferencia de inmediato."],

    // Line 47: 68 words, max 3
    ["es un material que aguanta de todo,", "posee una resistencia formidable,"],

    // Line 84: 78 words, max 3
    ["Uno a veces por apuro usa", "A menudo, por descuido, se usa"],

    // Line 85: 94 words, max 4
    ["olvídate de pasarles papel", "evita por completo el papel"],

    // Line 88: 54 words, max 2
    ["sacó diseños que cambiaron", "presentó propuestas que renovaron"],

    // Line 89: 89 words, max 4
    ["el marco no pesa casi nada,", "la montura es sumamente liviana,"],

    // Line 92: 51 words, max 2
    ["metieron líneas rectas", "trazaron líneas rectas"],

    // Line 93: 70 words, max 3
    ["ya sea de metal o plástico,", "sea en metal o acetato,"],

    // Line 96: 43 words, max 2
    ["hicieron las líneas suaves", "definieron siluetas suaves"],

    // Line 97: 92 words, max 4
    ["a lo que se usa hoy,", "a la estética contemporánea,"],

    // Line 100: 70 words, max 3
    ["Te sirve si manejas con la calle mojada,", "Resulta óptimo si conduces con lluvia,"],

    // Line 101: 69 words, max 3
    ["Te tapan los rayos UV", "Bloquean los rayos UV"],

    // Line 104: 48 words, max 2
    ["y no deben molestar.", "evitando cualquier molestia."],

    // Line 105: 46 words, max 2
    ["Casi nadie se fija en las patillas", "Pocos prestan atención a las varillas"],

    // Line 107 (li): 48 words, max 2
    ["estarse subiendo las gafas a cada rato.", "reajustar la montura continuamente."],

    // Line 108 (li): 46 words, max 2
    ["le calza bien a la mayoría", "se adapta idóneamente a la mayoría"],

    // Line 109 (li): 55 words, max 2
    ["Cubren bien del sol,", "Protegen eficazmente del sol,"],

    // Line 111: 50 words, max 2
    ["en marcas caras ayuda,", "en la alta gama resulta ventajoso,"],

    // Line 114: 76 words, max 3
    ["hablarle directo a gente exigente", "dirigirse a un público riguroso"],

    // Line 115: 57 words, max 2
    ["ZEGNA lo entendió rápido,", "ZEGNA comprendió esta exigencia,"],

    // Line 116: 63 words, max 3
    ["la gente que sabe se da cuenta al instante,", "los conocedores lo perciben de inmediato,"],

    // Line 119: 58 words, max 2
    ["en los artículos caros de ahora,", "en el panorama del lujo contemporáneo,"],

    // Line 120: 95 words, max 4
    ["Las bisagras se bancan el uso diario,", "Las bisagras soportan con solvencia el uso diario,"],

    // Line 123: 82 words, max 4
    ["gastar solo por un marco de oro o con brillos,", "invertir en ostentaciones superficiales,"],

    // Line 124: 91 words, max 4
    ["No estás botando la plata en una moda rápida,", "No se malgasta el capital en modas pasajeras,"],

    // Line 127: 87 words, max 4
    ["nadie gasta de más solo por presumir.", "se prescinde del gasto meramente ostentoso."],

    // Line 128: 59 words, max 2
    ["se parece al caparazón tortuga,", "recuerda al carey clásico,"],

    // Line 129: 61 words, max 2
    ["un antirreflejo decente,", "un tratamiento antirreflejante eficaz,"],

    // Line 132: 78 words, max 3
    ["La gente anda preguntando", "Existe gran interés sobre"],

    // Line 133: 98 words, max 4
    ["para que le calcen bien a cualquiera.", "favoreciendo armónicamente cualquier fisonomía."],

    // Line 136: 63 words, max 3
    ["así la vista no se te cansa tanto", "previniendo la fatiga ocular cotidiana"],

    // Line 137: 36 words, max 1
    ["en estas marcas caras,", "en la alta gama,"],

    // Line 172: 107 words, max 5
    ["frenan ese reflejo molesto que entra por los costados.", "mitigando los reflejos molestos periféricos."]
];

// PASS 3 replacements (applied on top of pass 2)
const pass3Replacements = [
    // Line 2: 36 words, max 1
    ["soportan el uso diario", "resisten el uso diario"],

    // Line 5: 72 words, max 3
    ["que no te aprieten el rostro.", "que no te presionen el rostro."],

    // Line 6: 81 words, max 3
    ["en tiendas caras,", "en boutiques exclusivas,"],

    // Line 9: 67 words, max 3
    ["vienen con los bordes algo redondeados", "cuentan con bordes suavemente redondeados"],

    // Line 10: 48 words, max 2
    ["combinan fácil con cualquier prenda", "combinan fácilmente con cualquier prenda"],

    // Line 14: 55 words, max 2
    ["sin que te duelan las sienes.", "sin causar fatiga en las sienes."],

    // Line 15: 54 words, max 2
    ["se ven modernos sin exagerar,", "lucen modernos sin estridencias,"],

    // Line 19: 63 words, max 3
    ["la parte de la nariz calza perfecto", "la zona nasal asienta con exactitud"],

    // Line 20: 69 words, max 3
    ["para no cansar los ojos al usarlas todo el día.", "evitando fatigar los ojos durante el día."],

    // Line 24: 56 words, max 2
    ["la gente nota tu estilo.", "el entorno aprecia tu estilo."],

    // Line 25: 80 words, max 3
    ["ahora mismo.", "en la actualidad."],

    // Line 28: 83 words, max 4
    ["pero lucen genial,", "pero lucen impecables,"],

    // Line 29: 69 words, max 3
    ["y no tienes que andar presumiendo nada.", "sin necesidad de ostentación alguna."],

    // Line 32: 48 words, max 2
    ["todo el camino que hicieron en Italia.", "toda su trayectoria histórica en Italia."],

    // Line 33: 90 words, max 4
    ["cuidar los árboles y el bosque.", "preservar el entorno natural."],

    // Line 36: 80 words, max 3
    ["no se rompen por usarlas a diario.", "resisten con solvencia el uso diario."],

    // Line 39 (li): 63 words, max 3
    ["Los tonos se ven más vivos", "Los matices lucen más vivos"],

    // Line 40 (li): 55 words, max 2
    ["marcas rojas tan molestas en la piel.", "marcas de presión molestas sobre la piel."],

    // Line 41 (li): 37 words, max 1
    ["brillan bien", "lucen un brillo noble"],

    // Line 42 (li): 44 words, max 2
    ["si las usas seguido.", "durante jornadas prolongadas."],

    // Line 46: 59 words, max 2
    ["terminan cansando.", "provocan fatiga."],

    // Line 47: 68 words, max 3
    ["en realidad no pesan nada,", "su peso es prácticamente imperceptible,"],

    // Line 84: 78 words, max 3
    ["y te quieres morir porque pierden todo el brillo.", "lamentando la pérdida de su brillo."],

    // Line 85: 94 words, max 4
    ["como recién salidos de la caja.", "en óptimo estado original."],

    // Line 88: 54 words, max 2
    ["con materiales modernos que duran.", "con materiales modernos y duraderos."],

    // Line 89: 89 words, max 4
    ["llaman la atención sin ser exagerados", "destacan con una sobriedad refinada"],

    // Line 92: 51 words, max 2
    ["la gente ya se aburrió de ver", "el usuario busca distanciarse de"],

    // Line 93: 70 words, max 3
    ["andar con confianza", "proyectar seguridad"],

    // Line 96: 43 words, max 2
    ["le queda bien a casi cualquier rostro.", "favorece a casi cualquier fisonomía."],

    // Line 97: 92 words, max 4
    ["sin detalles raros,", "sin artificios superfluos,"],

    // Line 100: 70 words, max 3
    ["la luz te da de frente,", "la radiación incide frontalmente,"],

    // Line 101: 69 words, max 3
    ["qué tan oscuro viene el vidrio,", "el grado de opacidad de las lentes,"],

    // Line 104: 48 words, max 2
    ["para solucionar esto,", "con este propósito,"],

    // Line 105: 46 words, max 2
    ["vienen con estos números:", "presentan las siguientes dimensiones:"],

    // Line 107 (li): 48 words, max 2
    ["si tienes el rostro fino,", "si posees un rostro fino,"],

    // Line 108 (li): 46 words, max 2
    ["sin que te incomode.", "sin generar opresión."],

    // Line 109 (li): 55 words, max 2
    ["porque los hacen bien livianos.", "gracias a su cuidada ligereza."],

    // Line 111: 50 words, max 2
    ["o te ande bailando en el rostro.", "o quede desajustado sobre el rostro."],

    // Line 114: 76 words, max 3
    ["sin tener que presumir de más.", "sin caer en ostentaciones vacuas."],

    // Line 115: 57 words, max 2
    ["para salir de viaje a la playa,", "para viajar a destinos costeros,"],

    // Line 116: 63 words, max 3
    ["y no para tirarlo al mes siguiente.", "descartando la obsolescencia programada."],

    // Line 119: 58 words, max 2
    ["de la nada salen marcas nuevas con formas raras.", "emergen firmas alternativas de diseño excéntrico."],

    // Line 120: 95 words, max 4
    ["inventar formas raras que pasan rápido de moda,", "diseñar propuestas efímeras que caducan pronto,"],

    // Line 123: 82 words, max 4
    ["le meten tecnología nueva a los cristales", "incorporan innovaciones ópticas avanzadas"],

    // Line 124: 91 words, max 4
    ["las monturas salen caras pero aguantan los años", "las monturas representan una inversión que perdura"],

    // Line 127: 87 words, max 4
    ["y quede bien igual.", "manteniendo una presencia impecable."],

    // Line 128: 59 words, max 2
    ["te pones cualquier vestimenta y combina al instante.", "armonizando al instante con cualquier atuendo."],

    // Line 129: 61 words, max 2
    ["puedes manejar al mediodía", "puedes conducir al mediodía"],

    // Line 132: 78 words, max 3
    ["que es lo que más se está viendo últimamente.", "tendencia predominante en la actualidad."],

    // Line 133: 98 words, max 4
    ["la idea es verse seguro y con presencia,", "la premisa es proyectar aplomo y distinción,"],

    // Line 136: 63 words, max 3
    ["así no fallas con el color y compras tranquilo.", "asegurando una elección plenamente acertada."],

    // Line 137: 36 words, max 1
    ["a veces uno se marea con tantas opciones,", "facilitando la elección ante múltiples alternativas,"],

    // Line 172: 107 words, max 5
    ["son re útiles cuando la luz cambia a cada rato", "ofrecen gran versatilidad ante variaciones lumínicas frecuentes"]
];

function applyPass(inputContent, replacements, passName) {
    let outputContent = inputContent;
    for (const [target, replacement] of replacements) {
        if (!outputContent.includes(target)) {
            throw new Error(`Target not found in ${passName}: "${target}"`);
        }
        outputContent = outputContent.replace(target, replacement);
    }

    const inLines = inputContent.split('\n');
    const outLines = outputContent.split('\n');

    if (inLines.length !== outLines.length) {
        throw new Error(`Line count mismatch in ${passName}: in=${inLines.length}, out=${outLines.length}`);
    }

    let chunkCount = 0;
    let maxPercent = 0;
    for (let i = 0; i < inLines.length; i++) {
        const res = verifyAndReportChunk(passName, inLines[i], outLines[i]);
        if (res) {
            chunkCount++;
            const pct = parseFloat(res.percent);
            if (pct > maxPercent) {
                maxPercent = pct;
            }
        }
    }
    console.log(`[${passName}] Verified ${chunkCount} chunks. Max edit percentage: ${maxPercent}% (< 5.0% STRICT REQUIREMENT MET)`);
    return outputContent;
}

// 1. Read Base content
const baseContent = fs.readFileSync(baseFile, 'utf8');

// 2. Pass 1
console.log('--- Applying Pass 1 ---');
const pass1Content = applyPass(baseContent, pass1Replacements, 'Pass 1');
fs.writeFileSync(pass1File, pass1Content, 'utf8');
console.log(`Saved ${pass1File}`);

// 3. Pass 2 (Read surg_pass_1.html, apply pass 2 cumulatively)
console.log('--- Reading surg_pass_1.html and applying Pass 2 ---');
const readPass1 = fs.readFileSync(pass1File, 'utf8');
const pass2Content = applyPass(readPass1, pass2Replacements, 'Pass 2');
fs.writeFileSync(pass2File, pass2Content, 'utf8');
console.log(`Saved ${pass2File}`);

// 4. Pass 3 (Read surg_pass_2.html, apply pass 3 cumulatively)
console.log('--- Reading surg_pass_2.html and applying Pass 3 ---');
const readPass2 = fs.readFileSync(pass2File, 'utf8');
const pass3Content = applyPass(readPass2, pass3Replacements, 'Pass 3');
fs.writeFileSync(pass3File, pass3Content, 'utf8');
console.log(`Saved ${pass3File}`);

// Tag integrity check
function extractTags(text) {
    const matches = text.match(/<[^>]+>/g) || [];
    return matches.join('');
}
const baseTags = extractTags(baseContent);
const pass1Tags = extractTags(pass1Content);
const pass2Tags = extractTags(pass2Content);
const pass3Tags = extractTags(pass3Content);

if (baseTags !== pass1Tags) throw new Error('FATAL: HTML tags altered in Pass 1!');
if (baseTags !== pass2Tags) throw new Error('FATAL: HTML tags altered in Pass 2!');
if (baseTags !== pass3Tags) throw new Error('FATAL: HTML tags altered in Pass 3!');

console.log('HTML tag integrity: 100% IDENTICAL across base, pass 1, pass 2, pass 3!');
console.log('All 3 surgical passes completed successfully.');
