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
const CHUNK_REGEX = /(<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>|<p\b[^>]*>[\s\S]*?<\/p>|<li\b[^>]*>[\s\S]*?<\/li>|<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<th\b[^>]*>[\s\S]*?<\/th>|<td\b[^>]*>[\s\S]*?<\/td>)/gi;

function extractChunks(html) {
    const chunks = [];
    let m;
    const re = new RegExp(CHUNK_REGEX);
    while ((m = re.exec(html)) !== null) {
        chunks.push(m[0]);
    }
    return chunks;
}

function getWords(text) {
    const clean = text.replace(/<[^>]+>/g, ' ').replace(/[^\wáéíóúÁÉÍÓÚñÑüÜ]/g, ' ').trim();
    return clean ? clean.split(/\s+/).filter(Boolean) : [];
}

/**
 * PASS 1 REPLACEMENTS: Applied to latest_base.html
 * 1 targeted single-word vocabulary upgrade per eligible chunk (47 chunks)
 */
const PASS1_REPLACEMENTS = [
    // Chunk 1 (73w): onda -> estética (1.37%)
    ['la onda italiana', 'la estética italiana'],
    // Chunk 3 (62w): zampas -> pones (1.61%)
    ['te las zampas con unos jeans,', 'te las pones con unos jeans,'],
    // Chunk 6 (31w): esconden -> cubren (3.23%)
    ['te esconden la cara,', 'te cubren la cara,'],
    // Chunk 7 (29w): agarra -> acumula (3.45%)
    ['no agarra sarro,', 'no acumula sarro,'],
    // Chunk 8 (28w): macizo -> sólido (3.57%)
    ['está macizo,', 'está sólido,'],
    // Chunk 9 (34w): resbala -> desliza (2.94%)
    ['el agua se resbala,', 'el agua se desliza,'],
    // Chunk 10 (41w): jala -> funciona (2.44%)
    ['cara grandota jala también,', 'cara grandota funciona también,'],
    // Chunk 14 (24w): pegan -> combinan (4.17%)
    ['pegan con tu mezclilla,', 'combinan con tu mezclilla,'],
    // Chunk 25 (25w): Mira -> Descubre (4.00%)
    ['Mira estas gafas, entra al link', 'Descubre estas gafas, entra al link'],
    // Chunk 29 (21w): despinta -> desvanece (4.76%)
    ['el color no despinta,', 'el color no desvanece,'],
    // Chunk 30 (36w): cae -> asienta (2.78%)
    ['cae suave en la narizona,', 'asienta suave en la narizona,'],
    // Chunk 31 (33w): jala -> armoniza (3.03%)
    ['cristal azul jala con lo que', 'cristal azul armoniza con lo que'],
    // Chunk 32 (37w): fuertes -> resistentes (2.70%)
    ['cristales de gota son fuertes,', 'cristales de gota son resistentes,'],
    // Chunk 36 (38w): empresas -> firmas (2.63%)
    ['Las dos empresas colaboraron,', 'Las dos firmas colaboraron,'],
    // Chunk 37 (24w): destrozar -> deconstruir (4.17%)
    ['es destrozar el diseño', 'es deconstruir el diseño'],
    // Chunk 38 (57w): difícil -> complejo (1.75%)
    ['del aviador es difícil,', 'del aviador es complejo,'],
    // Chunk 40 (47w): fábricas -> firmas (2.13%)
    ['Estas fábricas se juntaron,', 'Estas firmas se juntaron,'],
    // Chunk 41 (49w): diseñaron -> concibieron (2.04%)
    ['aviones diseñaron esto,', 'aviones concibieron esto,'],
    // Chunk 42 (42w): decentes -> selectas (2.38%)
    ['buscaban telas decentes,', 'buscaban telas selectas,'],
    // Chunk 43 (41w): chistoso -> singular (2.44%)
    ['Viene algo chistoso,', 'Viene algo singular,'],
    // Chunk 45 (50w): juntan -> alían (2.00%)
    ['marcas finas se juntan,', 'marcas finas se alían,'],
    // Chunk 47 (56w): sacan -> lanzan (1.79%)
    ['sacan poquitas piezas,', 'lanzan poquitas piezas,'],
    // Chunk 49 (39w): Querían -> Buscaban (2.56%)
    ['Querían innovar, leyeron', 'Buscaban innovar, leyeron'],
    // Chunk 50 (38w): usaban -> empleaban (2.63%)
    ['volaban usaban estos lentes,', 'volaban empleaban estos lentes,'],
    // Chunk 51 (39w): agarras -> eliges (2.56%)
    ['Los agarras para el diario,', 'Los eliges para el diario,'],
    // Chunk 53 (50w): checa -> examina (2.00%)
    ['checa la soldadura del', 'examina la soldadura del'],
    // Chunk 55 (25w): clavaron -> fijaron (4.00%)
    ['clavaron el puente doble,', 'fijaron el puente doble,'],
    // Chunk 57 (49w): metieron -> emplearon (2.04%)
    ['metieron nácar del bueno,', 'emplearon nácar del bueno,'],
    // Chunk 58 (45w): Revolvieron -> Combinaron (2.22%)
    ['Revolvieron metales livianos,', 'Combinaron metales livianos,'],
    // Chunk 59 (51w): Agarraron -> Tomaron (1.96%)
    ['Agarraron un molde viejo,', 'Tomaron un molde viejo,'],
    // Chunk 61 (50w): metías -> encajabas (2.00%)
    ['le metías el vidrio con fuerza,', 'le encajabas el vidrio con fuerza,'],
    // Chunk 62 (44w): resistente -> duradero (2.27%)
    ['es material resistente, los doctores', 'es material duradero, los doctores'],
    // Chunk 63 (45w): amarra -> asegura (2.22%)
    ['un hilito amarra lo de abajo,', 'un hilito asegura lo de abajo,'],
    // Chunk 64 (49w): armazón -> montura (2.04%)
    ['el armazón se afloja de repente,', 'la montura se afloja de repente,'],
    // Chunk 66 (82w): Agarra -> Toma (1.22%)
    ['Agarra los lentes por el puente,', 'Toma los lentes por el puente,'],
    // Chunk 83 (21w): feo -> fuerte (4.76%)
    ['el sol pega feo, nadie', 'el sol pega fuerte, nadie'],
    // Chunk 91 (21w): caras -> costosas (4.76%)
    ['te metes a fiestas caras,', 'te metes a fiestas costosas,'],
    // Chunk 93 (62w): gente -> público (1.61%)
    ['la gente busca gafas finas,', 'el público busca gafas finas,'],
    // Chunk 95 (45w): Armaron -> Fabricaron (2.22%)
    ['Armaron poquitas gafas <em>Exclusive', 'Fabricaron poquitas gafas <em>Exclusive'],
    // Chunk 97 (48w): Clavan -> Graban (2.08%)
    ['Clavan el logo con láser,', 'Graban el logo con láser,'],
    // Chunk 98 (47w): agarras -> tomas (2.13%)
    ['agarras el teléfono, checas rápido.', 'tomas el teléfono, checas rápido.'],
    // Chunk 99 (38w): Tocas -> Palpas (2.63%)
    ['Tocas el fierro dorado,', 'Palpas el fierro dorado,'],
    // Chunk 101 (51w): sacan -> lanzan (1.96%)
    ['marcas sacan rarezas ahorita,', 'marcas lanzan rarezas ahorita,'],
    // Chunk 102 (43w): Hacen -> Crean (2.33%)
    ['Hacen gafas de papel casi,', 'Crean gafas de papel casi,'],
    // Chunk 103 (47w): metes -> pasas (2.13%)
    ['te metes a la sala,', 'te pasas a la sala,'],
    // Chunk 104 (41w): Agarran -> Toman (2.44%)
    ['Agarran acero del hospital', 'Toman acero del hospital'],
    // Chunk 106 (89w): fierro -> metal (1.12%)
    ['el fierro manda en la comodidad.', 'el metal manda en la comodidad.']
];

/**
 * PASS 2 REPLACEMENTS: Applied to surg_pass_1.html
 * 1 targeted single-word vocabulary upgrade per eligible chunk (47 chunks)
 */
const PASS2_REPLACEMENTS = [
    // Chunk 1 (73w): Agarraron -> Tomaron (1.37%)
    ['Agarraron el Shooter', 'Tomaron el Shooter'],
    // Chunk 3 (62w): raza -> gente (1.61%)
    ['la raza se te queda viendo,', 'la gente se te queda viendo,'],
    // Chunk 6 (31w): checas -> aprecias (3.23%)
    ['checas las cosas bien,', 'aprecias las cosas bien,'],
    // Chunk 7 (29w): jala -> funciona (3.45%)
    ['jala diario, el acabado', 'funciona diario, el acabado'],
    // Chunk 8 (28w): cosa -> recelo (3.57%)
    ['te da cosa jalarlo,', 'te da recelo jalarlo,'],
    // Chunk 9 (34w): tallando -> limpiando (2.94%)
    ['no andas tallando cada cinco', 'no andas limpiando cada cinco'],
    // Chunk 10 (41w): viejita -> clásica (2.44%)
    ['Es forma viejita, sirve', 'Es forma clásica, sirve'],
    // Chunk 14 (24w): apuros -> urgencias (4.17%)
    ['te sacan de apuros,', 'te sacan de urgencias,'],
    // Chunk 25 (25w): entra -> accede (4.00%)
    ['entra al link y llévate', 'accede al link y llévate'],
    // Chunk 29 (21w): avientas -> sumas (4.76%)
    ['te avientas años, el billete', 'te sumas años, el billete'],
    // Chunk 30 (36w): parejito -> equilibrado (2.78%)
    ['se reparte parejito, te echas', 'se reparte equilibrado, te echas'],
    // Chunk 31 (33w): luce -> resalta (3.03%)
    ['tono espejado luce impecable', 'tono espejado resalta impecable'],
    // Chunk 32 (37w): bajan -> reducen (2.70%)
    ['le bajan al resplandor', 'le reducen al resplandor'],
    // Chunk 36 (38w): armaron -> organizaron (2.63%)
    ['armaron desfiles de primavera,', 'organizaron desfiles de primavera,'],
    // Chunk 37 (24w): armar -> forjar (4.17%)
    ['para armar alta costura,', 'para forjar alta costura,'],
    // Chunk 38 (57w): sacaron -> lanzaron (1.75%)
    ['sacaron un modelo más finito.', 'lanzaron un modelo más finito.'],
    // Chunk 40 (47w): cotiza -> valora (2.13%)
    ['lo viejo se cotiza alto.', 'lo viejo se valora alto.'],
    // Chunk 41 (49w): Armaron -> Elaboraron (2.04%)
    ['Armaron los lentes como gotas,', 'Elaboraron los lentes como gotas,'],
    // Chunk 42 (42w): subió -> creció (2.38%)
    ['La tienda subió rápido,', 'La tienda creció rápido,'],
    // Chunk 43 (41w): lanzaron -> presentaron (2.44%)
    ['lanzaron moda exclusiva de pronto,', 'presentaron moda exclusiva de pronto,'],
    // Chunk 45 (50w): cosas -> propuestas (2.00%)
    ['sacan cosas locas.', 'sacan propuestas locas.'],
    // Chunk 47 (56w): revendedores -> distribuidores (1.79%)
    ['los revendedores acapararon,', 'los distribuidores acapararon,'],
    // Chunk 49 (39w): leyeron -> revisaron (2.56%)
    ['leyeron libros viejos,', 'revisaron libros viejos,'],
    // Chunk 50 (38w): Sacaron -> Diseñaron (2.63%)
    ['Sacaron uno que brilla,', 'Diseñaron uno que brilla,'],
    // Chunk 51 (39w): tieso -> rígido (2.56%)
    ['se siente tieso.', 'se siente rígido.'],
    // Chunk 53 (50w): traen -> incorporan (2.00%)
    ['a de veras traen metal', 'a de veras incorporan metal'],
    // Chunk 55 (25w): metieron -> añadieron (4.00%)
    ['metieron un círculo raro,', 'añadieron un círculo raro,'],
    // Chunk 57 (49w): Lijan -> Pulen (2.04%)
    ['Lijan las barras a mano,', 'Pulen las barras a mano,'],
    // Chunk 58 (45w): livianos -> ligeros (2.22%)
    ['metales livianos, las gafas', 'metales ligeros, las gafas'],
    // Chunk 59 (51w): ven -> aprecian (1.96%)
    ['se ven bien, el de', 'se aprecian bien, el de'],
    // Chunk 61 (50w): Metes -> Colocas (2.00%)
    ['Metes el vidrio a la', 'Colocas el vidrio a la'],
    // Chunk 62 (44w): jalón -> tirón (2.27%)
    ['Das un jalón fuerte,', 'Das un tirón fuerte,'],
    // Chunk 63 (45w): volteas -> miras (2.22%)
    ['volteas a los lados,', 'miras a los lados,'],
    // Chunk 64 (49w): clavaron -> fijaron (2.04%)
    ['Les clavaron unas topesitas', 'Les fijaron unas topesitas'],
    // Chunk 66 (82w): jales -> tires (1.22%)
    ['no le jales la pata,', 'no le tires la pata,'],
    // Chunk 83 (21w): ve -> nota (4.76%)
    ['nadie te ve los ojos,', 'nadie te nota los ojos,'],
    // Chunk 91 (21w): tapas -> cubres (4.76%)
    ['tapas tus ojos, traes oro', 'cubres tus ojos, traes oro'],
    // Chunk 93 (62w): agarra -> elige (1.61%)
    ['nadie agarra plástico corriente,', 'nadie elige plástico corriente,'],
    // Chunk 95 (45w): chafas -> dudosas (2.22%)
    ['las páginas chafas meten copias,', 'las páginas dudosas meten copias,'],
    // Chunk 97 (48w): raspa -> roza (2.08%)
    ['apenas raspa. Las máquinas', 'apenas roza. Las máquinas'],
    // Chunk 98 (47w): checas -> verificas (2.13%)
    ['tomas el teléfono, checas rápido.', 'tomas el teléfono, verificas rápido.'],
    // Chunk 99 (38w): abres -> despliegas (2.63%)
    ['abres la pata, da un clic', 'despliegas la pata, da un clic'],
    // Chunk 101 (51w): pegan -> triunfan (1.96%)
    ['a ver si pegan, se copiaban', 'a ver si triunfan, se copiaban'],
    // Chunk 102 (43w): acomodas -> ajustas (2.33%)
    ['te las acomodas, ni pesan,', 'te las ajustas, ni pesan,'],
    // Chunk 103 (47w): pegan -> combinan (2.13%)
    ['pegan con tu camisa.', 'combinan con tu camisa.'],
    // Chunk 104 (41w): relumbra -> brilla (2.44%)
    ['relumbra como joya cara,', 'brilla como joya cara,'],
    // Chunk 106 (89w): aguantan -> soportan (1.12%)
    ['aguantan la carrilla, le ganan', 'soportan la carrilla, le ganan']
];

/**
 * PASS 3 REPLACEMENTS: Applied to surg_pass_2.html
 * 1 targeted single-word vocabulary upgrade per eligible chunk (47 chunks)
 */
const PASS3_REPLACEMENTS = [
    // Chunk 1 (73w): saben -> conocen (1.37%)
    ['forma de gota que todos saben.', 'forma de gota que todos conocen.'],
    // Chunk 3 (62w): flojera -> desgana (1.61%)
    ['ando con flojera de pensar', 'ando con desgana de pensar'],
    // Chunk 6 (31w): cuidan -> protegen (3.23%)
    ['te cuidan del sol intenso,', 'te protegen del sol intenso,'],
    // Chunk 7 (29w): perdura -> permanece (3.45%)
    ['el acabado perdura, son de', 'el acabado permanece, son de'],
    // Chunk 8 (28w): cuadran -> arman (3.57%)
    ['cuadran con cualquier carota,', 'arman con cualquier carota,'],
    // Chunk 9 (34w): cala -> molesta (2.94%)
    ['el sol cala, te deja', 'el sol molesta, te deja'],
    // Chunk 10 (41w): voltea -> mira (2.44%)
    ['la gente voltea. Es forma', 'la gente mira. Es forma'],
    // Chunk 14 (24w): hace -> genera (4.17%)
    ['apurarse hace daño:', 'apurarse genera daño:'],
    // Chunk 25 (25w): pensarlo -> dudarlo (4.00%)
    ['para qué pensarlo tanto</a>', 'para qué dudarlo tanto</a>'],
    // Chunk 29 (21w): billete -> dinero (4.76%)
    ['el billete rinde chido.', 'el dinero rinde chido.'],
    // Chunk 30 (36w): echas -> pasas (2.78%)
    ['te echas horas bajo el', 'te pasas horas bajo el'],
    // Chunk 31 (33w): dice -> objeta (3.03%)
    ['nadie te dice nada.', 'nadie te objeta nada.'],
    // Chunk 32 (37w): bravo -> intenso (2.70%)
    ['del sol bravo en la calle.', 'del sol intenso en la calle.'],
    // Chunk 36 (38w): vueltas -> giros (2.63%)
    ['la moda da vueltas rápido.', 'la moda da giros rápido.'],
    // Chunk 37 (24w): volver -> transformar (4.17%)
    ['logrando volver un </em>', 'logrando transformar un </em>'],
    // Chunk 38 (57w): Metieron -> Emplearon (1.75%)
    ['Metieron un buen metal,', 'Emplearon un buen metal,'],
    // Chunk 40 (47w): raza -> público (2.13%)
    ['la raza busca cosas clásicas,', 'el público busca cosas clásicas,'],
    // Chunk 41 (49w): bárbaro -> intenso (2.04%)
    ['un frío bárbaro arriba,', 'un frío intenso arriba,'],
    // Chunk 42 (42w): sacaron -> confeccionaron (2.38%)
    ['sacaron muchos abrigos,', 'confeccionaron muchos abrigos,'],
    // Chunk 43 (41w): olía -> imaginaba (2.44%)
    ['nadie se la olía.', 'nadie se la imaginaba.'],
    // Chunk 45 (50w): plata -> ganancias (2.00%)
    ['deja plata, el puro', 'deja ganancias, el puro'],
    // Chunk 47 (56w): sacan -> cobran (1.79%)
    ['te sacan los billetes.', 'te cobran los billetes.'],
    // Chunk 49 (39w): metieron -> incorporaron (2.56%)
    ['metieron el <strong>Shooter</strong>', 'incorporaron el <strong>Shooter</strong>'],
    // Chunk 50 (38w): ve -> aprecia (2.63%)
    ['no se ve mal, te los', 'no se aprecia mal, te los'],
    // Chunk 51 (39w): resisten -> soportan (2.56%)
    ['resisten impactos, les das', 'soportan impactos, les das'],
    // Chunk 53 (50w): aguanta -> resiste (2.00%)
    ['la pintura aguanta, las copias', 'la pintura resiste, las copias'],
    // Chunk 55 (25w): sumaron -> integraron (4.00%)
    ['le sumaron un gancho pal', 'le integraron un gancho pal'],
    // Chunk 57 (49w): atajan -> frenan (2.04%)
    ['atajan el sudor, no te', 'frenan el sudor, no te'],
    // Chunk 58 (45w): nota -> percibe (2.22%)
    ['apenas se nota, ocupas un', 'apenas se percibe, ocupas un'],
    // Chunk 59 (51w): resiste -> perdura (1.96%)
    ['Ese material resiste, te las', 'Ese material perdura, te las'],
    // Chunk 61 (50w): traban -> fijan (2.00%)
    ['lo traban rapidito, evitan', 'lo fijan rapidito, evitan'],
    // Chunk 62 (44w): encajas -> colocas (2.27%)
    ['te los encajas, se te', 'te los colocas, se te'],
    // Chunk 63 (45w): filos -> bordes (2.22%)
    ['los filos no estorban, ves', 'los bordes no estorban, ves'],
    // Chunk 64 (49w): tiesos -> firmes (2.04%)
    ['se quedan tiesos, les das', 'se quedan firmes, les das'],
    // Chunk 66 (82w): despinta -> decolora (1.22%)
    ['despinta el fierro, las echas', 'decolora el fierro, las echas'],
    // Chunk 83 (21w): andas -> caminas (4.76%)
    ['andas a escondidas.</td>', 'caminas a escondidas.</td>'],
    // Chunk 91 (21w): traes -> luces (4.76%)
    ['cubres tus ojos, traes oro', 'cubres tus ojos, luces oro'],
    // Chunk 93 (62w): raza -> usuario (1.61%)
    ['la raza paga por lo bueno,', 'el usuario paga por lo bueno,'],
    // Chunk 95 (45w): guardas -> proteges (2.22%)
    ['guardas tus pesitos, pisas', 'proteges tus pesitos, pisas'],
    // Chunk 97 (48w): Arrimas -> Acercas (2.08%)
    ['Arrimas el vidrio al foco,', 'Acercas el vidrio al foco,'],
    // Chunk 98 (47w): plata -> dinero (2.13%)
    ['Nadie regala la plata,', 'Nadie regala el dinero,'],
    // Chunk 99 (38w): usan -> emplean (2.63%)
    ['falsificaciones usan plástico,', 'falsificaciones emplean plástico,'],
    // Chunk 101 (51w): topar -> encontrar (1.96%)
    ['te las vas a topar diario,', 'te las vas a encontrar diario,'],
    // Chunk 102 (43w): Aguantan -> Soportan (2.33%)
    ['Aguantan los golpes, te distraes', 'Soportan los golpes, te distraes'],
    // Chunk 103 (47w): cuidan -> protegen (2.13%)
    ['te cuidan el ojo, sigues', 'te protegen el ojo, sigues'],
    // Chunk 104 (41w): aguantan -> resisten (2.44%)
    ['aguantan el ajetreo diario,', 'resisten el ajetreo diario,'],
    // Chunk 106 (89w): ganan -> superan (1.12%)
    ['le ganan al plástico gacho,', 'le superan al plástico gacho,']
];

function applyReplacements(content, replacements, passName) {
    let result = content;
    let matchCount = 0;
    for (const [target, replacement] of replacements) {
        if (!result.includes(target)) {
            throw new Error(`[${passName}] Target string NOT found in content: "${target}"`);
        }
        // Ensure unique match
        const parts = result.split(target);
        if (parts.length > 2) {
            throw new Error(`[${passName}] Target string matched multiple times (${parts.length - 1}): "${target}"`);
        }
        result = parts.join(replacement);
        matchCount++;
    }
    console.log(`[${passName}] Applied ${matchCount} replacements successfully.`);
    return result;
}

function validatePass(prevHtml, newHtml, passName) {
    console.log(`\n--- Validating ${passName} ---`);
    
    // 1. Tag parity check
    const tagsPrev = extractTags(prevHtml);
    const tagsNew = extractTags(newHtml);
    if (tagsPrev.length !== tagsNew.length) {
        throw new Error(`[${passName}] Tag count mismatch: previous had ${tagsPrev.length}, new has ${tagsNew.length}`);
    }
    for (let i = 0; i < tagsPrev.length; i++) {
        if (tagsPrev[i] !== tagsNew[i]) {
            throw new Error(`[${passName}] Tag mismatch at index ${i}: prev="${tagsPrev[i]}", new="${tagsNew[i]}"`);
        }
    }
    console.log(`[${passName}] HTML Tag parity: 100% PASS (${tagsNew.length} tags perfectly preserved).`);

    // 2. Chunk-by-chunk mathematical limits check
    const chunksPrev = extractChunks(prevHtml);
    const chunksNew = extractChunks(newHtml);
    if (chunksPrev.length !== chunksNew.length) {
        throw new Error(`[${passName}] Chunk count mismatch: prev=${chunksPrev.length}, new=${chunksNew.length}`);
    }

    let maxLevRatio = 0;
    let maxLcsRatio = 0;
    let editedCount = 0;

    for (let i = 0; i < chunksPrev.length; i++) {
        const wPrev = getWords(chunksPrev[i]);
        const wNew = getWords(chunksNew[i]);
        
        const lev = wordLevenshtein(wPrev, wNew);
        const lcs = wordLCS(wPrev, wNew);
        const maxWords = Math.max(wPrev.length, wNew.length);

        if (maxWords === 0) continue;

        const levRatio = (lev / maxWords) * 100;
        const lcsDiffRatio = ((maxWords - lcs) / maxWords) * 100;

        if (lev > 0) {
            editedCount++;
            if (levRatio > maxLevRatio) maxLevRatio = levRatio;
            if (lcsDiffRatio > maxLcsRatio) maxLcsRatio = lcsDiffRatio;

            // Strict mathematical limit: MUST be < 5.0%
            if (levRatio >= 5.0) {
                throw new Error(`[${passName}] Chunk ${i} EXCEEDED 5% limit! Lev distance = ${lev}/${maxWords} (${levRatio.toFixed(2)}%)`);
            }
            if (lcsDiffRatio >= 5.0) {
                throw new Error(`[${passName}] Chunk ${i} EXCEEDED 5% LCS diff! LCS diff = ${maxWords - lcs}/${maxWords} (${lcsDiffRatio.toFixed(2)}%)`);
            }
        }
    }

    console.log(`[${passName}] Chunks analyzed: ${chunksPrev.length}. Chunks edited: ${editedCount}.`);
    console.log(`[${passName}] Max Levenshtein edit ratio: ${maxLevRatio.toFixed(2)}% (< 5.00% STRICT PASS).`);
    console.log(`[${passName}] Max LCS diff ratio: ${maxLcsRatio.toFixed(2)}% (< 5.00% STRICT PASS).`);
}

function checkUtf8Encoding(filePath) {
    const buf = fs.readFileSync(filePath);
    // Check BOM
    if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
        throw new Error(`File ${filePath} contains UTF-8 BOM!`);
    }
    const str = buf.toString('utf8');
    // Check common mojibake characters
    const mojibakePatterns = [/Ã[¡±©®]/, /â[€™]/, /Â/, /ï¿½/];
    for (const pat of mojibakePatterns) {
        if (pat.test(str)) {
            throw new Error(`File ${filePath} contains suspected mojibake pattern: ${pat}`);
        }
    }
    console.log(`[UTF-8 Audit] File ${path.basename(filePath)} is clean valid UTF-8 without BOM or mojibake.`);
}

function main() {
    console.log('Starting 3-pass Surgical Pipeline for Task ed810b7f-5e21-44b3-bad3-c88020526a0f...');
    
    // Read Base
    const baseContent = fs.readFileSync(BASE_FILE, 'utf8');
    console.log(`Base file loaded: ${baseContent.length} chars.`);

    // Pass 1
    const pass1Content = applyReplacements(baseContent, PASS1_REPLACEMENTS, 'Pass 1');
    validatePass(baseContent, pass1Content, 'Pass 1');
    fs.writeFileSync(PASS1_FILE, pass1Content, 'utf8');
    checkUtf8Encoding(PASS1_FILE);

    // Pass 2
    const pass2Content = applyReplacements(pass1Content, PASS2_REPLACEMENTS, 'Pass 2');
    validatePass(pass1Content, pass2Content, 'Pass 2');
    fs.writeFileSync(PASS2_FILE, pass2Content, 'utf8');
    checkUtf8Encoding(PASS2_FILE);

    // Pass 3
    const pass3Content = applyReplacements(pass2Content, PASS3_REPLACEMENTS, 'Pass 3');
    validatePass(pass2Content, pass3Content, 'Pass 3');
    fs.writeFileSync(PASS3_FILE, pass3Content, 'utf8');
    checkUtf8Encoding(PASS3_FILE);

    console.log('\n========================================');
    console.log('ALL 3 PASSES COMPLETED AND AUDITED 100%!');
    console.log('========================================');
}

main();
