const fs = require('fs');
const path = require('path');
const { wordLevenshtein, check } = require('./test_helper.cjs');

const baseContent = fs.readFileSync(path.join(__dirname, 'latest_base.html'), 'utf8');

// Let's create an interactive pass builder
function testPass(name, inputLines, replacements) {
    console.log(`\n=== Testing ${name} ===`);
    let modifiedLines = [...inputLines];
    let errors = [];

    replacements.forEach(([target, replacement], idx) => {
        let found = false;
        modifiedLines = modifiedLines.map(line => {
            if (line.includes(target)) {
                found = true;
                return line.replace(target, replacement);
            }
            return line;
        });
        if (!found) {
            errors.push(`Target not found [idx ${idx}]: "${target}"`);
        }
    });

    if (errors.length > 0) {
        console.error('Errors finding targets:', errors);
        return { ok: false, outputLines: modifiedLines };
    }

    let maxRatio = 0;
    let worst = null;

    inputLines.forEach((origLine, i) => {
        const isP = origLine.startsWith('<p>');
        const isLi = origLine.startsWith('  <li>') || origLine.startsWith('<li>');
        if ((isP || isLi) && !origLine.includes('[*')) {
            const newLine = modifiedLines[i];
            const origText = origLine.replace(/<[^>]+>/g, '').trim();
            const newText = newLine.replace(/<[^>]+>/g, '').trim();
            const res = check(origText, newText);
            if (res.ratio > maxRatio) {
                maxRatio = res.ratio;
                worst = { line: i + 1, origText, newText, res };
            }
            if (!res.ok) {
                errors.push(`Line ${i + 1} EXCEEDS 5%: words=${res.words}, dist=${res.dist}, pct=${res.pct}%\nOrig: ${origText}\nNew: ${newText}`);
            }
        }
    });

    console.log(`Max edit ratio in ${name}: ${(maxRatio * 100).toFixed(2)}% at line ${worst ? worst.line : 'none'}`);
    if (worst && worst.res.dist > 0) {
        console.log(`Worst case details: dist=${worst.res.dist}/${worst.res.words} words (${worst.res.pct}%)`);
    }

    if (errors.length > 0) {
        console.error('Violations:', errors);
        return { ok: false, outputLines: modifiedLines };
    }

    return { ok: true, outputLines: modifiedLines };
}

// PASS 1 replacements - strictly 1-2 words changed to keep <= 3.5%
const pass1 = [
    // Line 2: 36 words, max allowed 1
    ["Comprar unas gafas ZEGNA vale la pena", "Adquirir unas gafas ZEGNA vale la pena"], // 1 word

    // Line 5: 72 words, max allowed 3
    ["nada más mirarlos.", "a simple vista."], // 2 words

    // Line 6: 81 words, max allowed 3
    ["para armar la lista,", "para elaborar la lista,"], // 1 word

    // Line 9: 67 words, max allowed 3
    ["ideal para empezar,", "ideal para iniciarse,"], // 1 word

    // Line 10: 48 words, max allowed 2
    ["si manejas varias horas,", "si conduces varias horas,"], // 1 word

    // Line 14: 55 words, max allowed 2
    ["metal liviano", "metal ligero"], // 1 word

    // Line 15: 54 words, max allowed 2
    ["El material aguanta el día a día,", "El material resiste el día a día,"], // 1 word

    // Line 19: 63 words, max allowed 3
    ["un diseño bien geométrico", "un diseño marcadamente geométrico"], // 1 word

    // Line 20: 69 words, max allowed 3
    ["sin llamar la atención de más,", "sin estridencias innecesarias,"], // 2 words

    // Line 24: 56 words, max allowed 2
    ["para taparse del sol,", "para protegerse del sol,"], // 1 word

    // Line 25: 80 words, max allowed 3
    ["todo se ve limpio.", "con una estética pulcra."], // 2 words

    // Line 28: 83 words, max allowed 4
    ["le da justo al punto,", "acierta con precisión,"], // 2 words

    // Line 29: 69 words, max allowed 3
    ["relojes caros", "relojes de alta gama"], // 2 words

    // Line 32: 48 words, max allowed 2
    ["un adorno cualquiera,", "un adorno meramente decorativo,"], // 2 words

    // Line 33: 90 words, max allowed 4
    ["que hizo Ermenegildo Zegna", "construida por Ermenegildo Zegna"], // 2 words

    // Line 36: 80 words, max allowed 3
    ["buscan que no pesen casi nada", "priorizan una ligereza extrema"], // 2 words

    // Line 39 (li): 63 words, max allowed 3
    ["esto no da alergia", "esto es hipoalergénico"], // 2 words

    // Line 40 (li): 55 words, max allowed 2
    ["no se oxida nunca", "es inmune a la corrosión"], // 2 words

    // Line 41 (li): 37 words, max allowed 1
    ["donde apoyan las orejas,", "en los terminales,"], // 1 word

    // Line 42 (li): 44 words, max allowed 2
    ["un vidrio mineral fino,", "vidrio mineral refinado,"], // 1 word

    // Line 46: 59 words, max allowed 2
    ["ambos materiales son buenos,", "ambos materiales son sobresalientes,"], // 1 word

    // Line 47: 68 words, max allowed 3
    ["patillas bien finitas", "varillas sumamente esbeltas"], // 2 words

    // Line 84: 78 words, max allowed 3
    ["y ya se van poniendo feos", "deteriorando su aspecto"], // 2 words

    // Line 85: 94 words, max allowed 4
    ["Pásales el pañito de microfibra", "Utiliza una gamuza de microfibra"], // 2 words

    // Line 88: 54 words, max allowed 2
    ["para verse bien y tener estilo,", "para realzar el estilo personal,"], // 2 words

    // Line 89: 89 words, max allowed 4
    ["o manejar y te ves bien", "o conducir y lucir elegante"], // 2 words

    // Line 92: 51 words, max allowed 2
    ["parece una estructura de edificio.", "evoca líneas arquitectónicas."], // 2 words

    // Line 93: 70 words, max allowed 3
    ["con la parte de arriba plana,", "con un puente superior plano,"], // 2 words

    // Line 96: 43 words, max allowed 2
    ["que cae bien,", "muy equilibrada,"], // 1 word

    // Line 97: 92 words, max allowed 4
    ["recuerda a modelos antiguos,", "evoca siluetas clásicas,"], // 2 words

    // Line 100: 70 words, max allowed 3
    ["para quitar el reflejo molesto del sol.", "para neutralizar el reflejo del sol."], // 2 words

    // Line 101: 69 words, max allowed 3
    ["los ojos descansan bien.", "la mirada permanece relajada."], // 2 words

    // Line 104: 48 words, max allowed 2
    ["armaron una <strong>guía", "elaboraron una <strong>guía"], // 1 word

    // Line 105: 46 words, max allowed 2
    ["hay que mirar tres elementos:", "conviene evaluar tres elementos:"], // 1 word

    // Line 107 (li): 48 words, max allowed 2
    ["combina fácil con lo que te pongas.", "armoniza con tu vestimenta."], // 2 words

    // Line 108 (li): 46 words, max allowed 2
    ["que usa casi todo el mundo,", "de mayor difusión,"], // 2 words

    // Line 109 (li): 55 words, max allowed 2
    ["Son lentes bien amplios,", "Monturas de proporciones generosas,"], // 2 words

    // Line 111: 50 words, max allowed 2
    ["eso siempre suma.", "aportando valor añadido."], // 2 words

    // Line 114: 76 words, max allowed 3
    ["hacer accesorios en masa sin chiste,", "fabricar piezas genéricas en serie,"], // 3 words

    // Line 115: 57 words, max allowed 2
    ["juntan tecnología con trabajo a mano,", "conjugan tecnología con maestría artesanal,"], // 2 words

    // Line 116: 63 words, max allowed 3
    ["te cambia la pinta enseida", "eleva la presencia al instante"], // 3 words

    // Line 119: 58 words, max allowed 2
    ["firmas de vestimenta de toda la vida,", "firmas de moda tradicionales,"], // 2 words

    // Line 120: 95 words, max allowed 4
    ["que casi ni se sienten puestos.", "cuya presencia apenas se percibe."], // 2 words

    // Line 123: 82 words, max allowed 4
    ["piezas excelentes de verdad.", "piezas de genuina excelencia."], // 2 words

    // Line 124: 91 words, max allowed 4
    ["sin romperse fácil.", "sin deteriorarse fácilmente."], // 2 words

    // Line 127: 87 words, max allowed 4
    ["que vayan con tu onda", "afines a tu estilo"], // 2 words

    // Line 128: 59 words, max allowed 2
    ["el negro de siempre ya aburre un poco.", "el negro tradicional cede protagonismo."], // 2 words

    // Line 129: 61 words, max allowed 2
    ["la gente que sabe pide lentes", "el usuario informado prefiere lentes"], // 2 words

    // Line 132: 78 words, max allowed 3
    ["ellas mandan la pauta siempre.", "éstas marcan las directrices siempre."], // 2 words

    // Line 133: 98 words, max allowed 4
    ["date una vuelta por las", "conviene explorar las"], // 2 words

    // Line 136: 63 words, max allowed 3
    ["Como estos artículos cuestan lo suyo,", "Dada la categoría de estas piezas,"], // 2 words

    // Line 137: 36 words, max allowed 1
    ["Armamos una lista rápida", "Presentamos una síntesis estructurada"], // 1 word

    // Line 172: 107 words, max allowed 5
    ["sirven para manejar cuando el sol pega fuerte", "resultan idóneos para conducir bajo radiación intensa"] // 3 words
];

// PASS 2 replacements
const pass2 = [
    // Line 2: 36 words, max allowed 1
    ["te cubren bien los ojos del sol", "te protegen bien los ojos del sol"], // 1 word

    // Line 5: 72 words, max allowed 3
    ["te fijas en los materiales,", "evalúas los materiales,"], // 1 word

    // Line 6: 81 words, max allowed 3
    ["qué tan claros son los cristales,", "la nitidez de los cristales,"], // 2 words

    // Line 9: 67 words, max allowed 3
    ["la nariz ni las nota,", "la nariz apenas las percibe,"], // 2 words

    // Line 10: 48 words, max allowed 2
    ["además puestas se ven bien.", "además lucen impecables."], // 2 words

    // Line 14: 55 words, max allowed 2
    ["detalles simples,", "detalles sobrios,"], // 1 word

    // Line 15: 54 words, max allowed 2
    ["combinan fácil con cualquier vestimenta.", "combinan fácilmente con cualquier vestimenta."], // 1 word

    // Line 19: 63 words, max allowed 3
    ["no pesa casi nada", "apenas tiene peso"], // 2 words

    // Line 20: 69 words, max allowed 3
    ["te cuidan del sol", "te protegen del sol"], // 1 word

    // Line 24: 56 words, max allowed 2
    ["modelos lanzados hace poco.", "modelos de reciente creación."], // 2 words

    // Line 25: 80 words, max allowed 3
    ["así hacen monturas bien livianas", "logrando monturas muy livianas"], // 2 words

    // Line 28: 83 words, max allowed 4
    ["levanta cualquier vestimenta", "realza cualquier vestimenta"], // 1 word

    // Line 29: 69 words, max allowed 3
    ["usan metales firmes", "emplean metales nobles"], // 2 words

    // Line 32: 48 words, max allowed 2
    ["muestra los comienzos del taller", "evoca los orígenes del taller"], // 2 words

    // Line 33: 90 words, max allowed 4
    ["ayudar a la gente de la zona,", "apoyar a la comunidad local,"], // 2 words

    // Line 36: 80 words, max allowed 3
    ["revisan el marco a cada rato", "inspeccionan minuciosamente el marco"], // 2 words

    // Line 39 (li): 63 words, max allowed 3
    ["un brillo que aguanta bien el uso de todos los días.", "un lustre que resiste bien el uso diario."], // 2 words

    // Line 40 (li): 55 words, max allowed 2
    ["pesa casi nada comparado", "es notablemente más ligero"], // 2 words

    // Line 41 (li): 37 words, max allowed 1
    ["sin pelarse rápido.", "sin descascarillarse."], // 1 word

    // Line 42 (li): 44 words, max allowed 2
    ["así la vista no se cansa tan rápido", "evitando la fatiga ocular prematura"], // 2 words

    // Line 46: 59 words, max allowed 2
    ["sientes el cambio al instante.", "aprecias la diferencia de inmediato."], // 2 words

    // Line 47: 68 words, max allowed 3
    ["es un material que aguanta de todo,", "posee una resistencia formidable,"], // 2 words

    // Line 84: 78 words, max allowed 3
    ["Uno a veces por apuro usa", "A menudo, por descuido, se usa"], // 2 words

    // Line 85: 94 words, max allowed 4
    ["olvídate de pasarles papel", "evita por completo el papel"], // 2 words

    // Line 88: 54 words, max allowed 2
    ["sacó diseños que cambiaron", "presentó propuestas que renovaron"], // 2 words

    // Line 89: 89 words, max allowed 4
    ["el marco no pesa casi nada,", "la montura es sumamente liviana,"], // 2 words

    // Line 92: 51 words, max allowed 2
    ["metieron líneas rectas", "trazaron líneas rectas"], // 1 word

    // Line 93: 70 words, max allowed 3
    ["ya sea de metal o plástico,", "sea en metal o acetato,"], // 2 words

    // Line 96: 43 words, max allowed 2
    ["hicieron las líneas suaves", "definieron siluetas suaves"], // 1 word

    // Line 97: 92 words, max allowed 4
    ["a lo que se usa hoy,", "a la estética contemporánea,"], // 2 words

    // Line 100: 70 words, max allowed 3
    ["Te sirve si manejas con la calle mojada,", "Resulta óptimo si conduces con lluvia,"], // 2 words

    // Line 101: 69 words, max allowed 3
    ["Te tapan los rayos UV", "Bloquean los rayos UV"], // 1 word

    // Line 104: 48 words, max allowed 2
    ["y no deben molestar.", "evitando cualquier molestia."], // 2 words

    // Line 105: 46 words, max allowed 2
    ["Casi nadie se fija en las patillas", "Pocos prestan atención a las varillas"], // 2 words

    // Line 107 (li): 48 words, max allowed 2
    ["estarse subiendo las gafas a cada rato.", "reajustar la montura continuamente."], // 2 words

    // Line 108 (li): 46 words, max allowed 2
    ["le calza bien a la mayoría", "se adapta idóneamente a la mayoría"], // 2 words

    // Line 109 (li): 55 words, max allowed 2
    ["Cubren bien del sol,", "Protegen eficazmente del sol,"], // 2 words

    // Line 111: 50 words, max allowed 2
    ["en marcas caras ayuda,", "en la alta gama resulta ventajoso,"], // 2 words

    // Line 114: 76 words, max allowed 3
    ["hablarle directo a gente exigente", "dirigirse a un público riguroso"], // 3 words

    // Line 115: 57 words, max allowed 2
    ["ZEGNA lo entendió rápido,", "ZEGNA comprendió esta exigencia,"], // 2 words

    // Line 116: 63 words, max allowed 3
    ["la gente que sabe se da cuenta al instante,", "los conocedores lo perciben de inmediato,"], // 3 words

    // Line 119: 58 words, max allowed 2
    ["en los artículos caros de ahora,", "en el panorama del lujo contemporáneo,"], // 2 words

    // Line 120: 95 words, max allowed 4
    ["Las bisagras se bancan el uso diario,", "Las bisagras soportan con solvencia el uso diario,"], // 2 words

    // Line 123: 82 words, max allowed 4
    ["gastar solo por un marco de oro o con brillos,", "invertir en ostentaciones superficiales,"], // 3 words

    // Line 124: 91 words, max allowed 4
    ["No estás botando la plata en una moda rápida,", "No se malgasta el capital en modas pasajeras,"], // 3 words

    // Line 127: 87 words, max allowed 4
    ["nadie gasta de más solo por presumir.", "se prescinde del gasto meramente ostentoso."], // 2 words

    // Line 128: 59 words, max allowed 2
    ["se parece al caparazón tortuga,", "recuerda al carey clásico,"], // 2 words

    // Line 129: 61 words, max allowed 2
    ["un antirreflejo decente,", "un tratamiento antirreflejante eficaz,"], // 2 words

    // Line 132: 78 words, max allowed 3
    ["La gente anda preguntando", "Existe gran interés sobre"], // 2 words

    // Line 133: 98 words, max allowed 4
    ["para que le calcen bien a cualquiera.", "favoreciendo armónicamente cualquier fisonomía."], // 2 words

    // Line 136: 63 words, max allowed 3
    ["así la vista no se te cansa tanto", "previniendo la fatiga ocular cotidiana"], // 2 words

    // Line 137: 36 words, max allowed 1
    ["en estas marcas caras,", "en la alta gama,"], // 1 word

    // Line 172: 107 words, max allowed 5
    ["frenan ese reflejo molesto que entra por los costados.", "mitigando los reflejos molestos periféricos."] // 2 words
];

// PASS 3 replacements
const pass3 = [
    // Line 2: 36 words, max allowed 1
    ["soportan el uso diario", "resisten el uso diario"], // 1 word

    // Line 5: 72 words, max allowed 3
    ["que no te aprieten el rostro.", "que no te presionen el rostro."], // 1 word

    // Line 6: 81 words, max allowed 3
    ["en tiendas caras,", "en boutiques exclusivas,"], // 2 words

    // Line 9: 67 words, max allowed 3
    ["vienen con los bordes algo redondeados", "cuentan con bordes suavemente redondeados"], // 2 words

    // Line 10: 48 words, max allowed 2
    ["combinan fácil con cualquier prenda", "combinan fácilmente con cualquier prenda"], // 1 word

    // Line 14: 55 words, max allowed 2
    ["sin que te duelan las sienes.", "sin causar fatiga en las sienes."], // 2 words

    // Line 15: 54 words, max allowed 2
    ["se ven modernos sin exagerar,", "lucen modernos sin estridencias,"], // 2 words

    // Line 19: 63 words, max allowed 3
    ["la parte de la nariz calza perfecto", "la zona nasal asienta con exactitud"], // 3 words

    // Line 20: 69 words, max allowed 3
    ["para no cansar los ojos al usarlas todo el día.", "evitando fatigar los ojos durante el día."], // 2 words

    // Line 24: 56 words, max allowed 2
    ["la gente nota tu estilo.", "el entorno aprecia tu estilo."], // 2 words

    // Line 25: 80 words, max allowed 3
    ["ahora mismo.", "en la actualidad."], // 1 word

    // Line 28: 83 words, max allowed 4
    ["pero lucen genial,", "pero lucen impecables,"], // 1 word

    // Line 29: 69 words, max allowed 3
    ["y no tienes que andar presumiendo nada.", "sin necesidad de ostentación alguna."], // 3 words

    // Line 32: 48 words, max allowed 2
    ["todo el camino que hicieron en Italia.", "toda su trayectoria histórica en Italia."], // 2 words

    // Line 33: 90 words, max allowed 4
    ["cuidar los árboles y el bosque.", "preservar el entorno natural."], // 2 words

    // Line 36: 80 words, max allowed 3
    ["no se rompen por usarlas a diario.", "resisten con solvencia el uso diario."], // 2 words

    // Line 39 (li): 63 words, max allowed 3
    ["Los tonos se ven más vivos", "Los matices lucen más vivos"], // 2 words

    // Line 40 (li): 55 words, max allowed 2
    ["marcas rojas tan molestas en la piel.", "marcas de presión molestas sobre la piel."], // 2 words

    // Line 41 (li): 37 words, max allowed 1
    ["brillan bien", "lucen un brillo noble"], // 1 word

    // Line 42 (li): 44 words, max allowed 2
    ["si las usas seguido.", "durante jornadas prolongadas."], // 2 words

    // Line 46: 59 words, max allowed 2
    ["terminan cansando.", "provocan fatiga."], // 1 word

    // Line 47: 68 words, max allowed 3
    ["en realidad no pesan nada,", "su peso es prácticamente imperceptible,"], // 2 words

    // Line 84: 78 words, max allowed 3
    ["y te quieres morir porque pierden todo el brillo.", "lamentando la pérdida de su brillo."], // 3 words

    // Line 85: 94 words, max allowed 4
    ["como recién salidos de la caja.", "en óptimo estado original."], // 2 words

    // Line 88: 54 words, max allowed 2
    ["con materiales modernos que duran.", "con materiales modernos y duraderos."], // 2 words

    // Line 89: 89 words, max allowed 4
    ["llaman la atención sin ser exagerados", "destacan con una sobriedad refinada"], // 2 words

    // Line 92: 51 words, max allowed 2
    ["la gente ya se aburrió de ver", "el usuario busca distanciarse de"], // 2 words

    // Line 93: 70 words, max allowed 3
    ["andar con confianza", "proyectar seguridad"], // 2 words

    // Line 96: 43 words, max allowed 2
    ["le queda bien a casi cualquier rostro.", "favorece a casi cualquier fisonomía."], // 2 words

    // Line 97: 92 words, max allowed 4
    ["sin detalles raros,", "sin artificios superfluos,"], // 2 words

    // Line 100: 70 words, max allowed 3
    ["la luz te da de frente,", "la radiación incide frontalmente,"], // 2 words

    // Line 101: 69 words, max allowed 3
    ["qué tan oscuro viene el vidrio,", "el grado de opacidad de las lentes,"], // 2 words

    // Line 104: 48 words, max allowed 2
    ["para solucionar esto,", "con este propósito,"], // 2 words

    // Line 105: 46 words, max allowed 2
    ["vienen con estos números:", "presentan las siguientes dimensiones:"], // 2 words

    // Line 107 (li): 48 words, max allowed 2
    ["si tienes el rostro fino,", "si posees un rostro fino,"], // 2 words

    // Line 108 (li): 46 words, max allowed 2
    ["sin que te incomode.", "sin generar opresión."], // 2 words

    // Line 109 (li): 55 words, max allowed 2
    ["porque los hacen bien livianos.", "gracias a su cuidada ligereza."], // 2 words

    // Line 111: 50 words, max allowed 2
    ["o te ande bailando en el rostro.", "o quede desajustado sobre el rostro."], // 2 words

    // Line 114: 76 words, max allowed 3
    ["sin tener que presumir de más.", "sin caer en ostentaciones vacuas."], // 3 words

    // Line 115: 57 words, max allowed 2
    ["para salir de viaje a la playa,", "para viajar a destinos costeros,"], // 2 words

    // Line 116: 63 words, max allowed 3
    ["y no para tirarlo al mes siguiente.", "descartando la obsolescencia programada."], // 3 words

    // Line 119: 58 words, max allowed 2
    ["de la nada salen marcas nuevas con formas raras.", "emergen firmas alternativas de diseño excéntrico."], // 2 words

    // Line 120: 95 words, max allowed 4
    ["inventar formas raras que pasan rápido de moda,", "diseñar propuestas efímeras que caducan pronto,"], // 3 words

    // Line 123: 82 words, max allowed 4
    ["le meten tecnología nueva a los cristales", "incorporan innovaciones ópticas avanzadas"], // 3 words

    // Line 124: 91 words, max allowed 4
    ["las monturas salen caras pero aguantan los años", "las monturas representan una inversión que perdura"], // 3 words

    // Line 127: 87 words, max allowed 4
    ["y quede bien igual.", "manteniendo una presencia impecable."], // 3 words

    // Line 128: 59 words, max allowed 2
    ["te pones cualquier vestimenta y combina al instante.", "armonizando al instante con cualquier atuendo."], // 2 words

    // Line 129: 61 words, max allowed 2
    ["puedes manejar al mediodía", "puedes conducir al mediodía"], // 1 word

    // Line 132: 78 words, max allowed 3
    ["que es lo que más se está viendo últimamente.", "tendencia predominante en la actualidad."], // 3 words

    // Line 133: 98 words, max allowed 4
    ["la idea es verse seguro y con presencia,", "la premisa es proyectar aplomo y distinción,"], // 3 words

    // Line 136: 63 words, max allowed 3
    ["así no fallas con el color y compras tranquilo.", "asegurando una elección plenamente acertada."], // 2 words

    // Line 137: 36 words, max allowed 1
    ["a veces uno se marea con tantas opciones,", "facilitando la elección ante múltiples alternativas,"], // 1 word

    // Line 172: 107 words, max allowed 5
    ["son re útiles cuando la luz cambia a cada rato", "ofrecen gran versatilidad ante variaciones lumínicas frecuentes"] // 3 words
];

const baseLines = baseContent.split('\n');

const res1 = testPass('Pass 1', baseLines, pass1);
if (!res1.ok) process.exit(1);

const res2 = testPass('Pass 2', res1.outputLines, pass2);
if (!res2.ok) process.exit(1);

const res3 = testPass('Pass 3', res2.outputLines, pass3);
if (!res3.ok) process.exit(1);

console.log('\nALL 3 PASSES VALIDATED WITH 100% SUCCESS! Zero violations.');
