const fs = require('fs');
const path = require('path');
const { wordLevenshtein, check } = require('./test_helper.cjs');

const dir = __dirname;
const baseFilePath = path.join(dir, 'latest_base.html');
const pass1FilePath = path.join(dir, 'surg_pass_1.html');
const pass2FilePath = path.join(dir, 'surg_pass_2.html');
const pass3FilePath = path.join(dir, 'surg_pass_3.html');

const pass1Replacements = [
    ["Comprar unas gafas ZEGNA", "Adquirir unas gafas ZEGNA"],
    ["nada más mirarlos.", "nada más apreciarlos."],
    ["para armar la lista,", "para elaborar la lista,"],
    ["ideal para empezar,", "ideal para iniciarse,"],
    ["si manejas varias horas,", "si conduces varias horas,"],
    ["metal liviano", "metal ligero"],
    ["El material aguanta el día a día,", "El material resiste el día a día,"],
    ["un diseño bien geométrico", "un diseño marcadamente geométrico"],
    ["te cuidan del sol", "te protegen del sol"],
    ["para taparse del sol,", "para protegerse del sol,"],
    ["así hacen monturas bien livianas", "así elaboran monturas bien livianas"],
    ["levanta cualquier vestimenta", "realza cualquier vestimenta"],
    ["relojes caros", "relojes costosos"],
    ["un adorno cualquiera,", "un adorno convencional,"],
    ["que hizo Ermenegildo Zegna", "que construyó Ermenegildo Zegna"],
    ["no pesen casi nada", "apenas pesen nada"],
    // line 37 untouched
    ["de paso cuida el ambiente.", "de paso protege el ambiente."],
    ["acero común.", "acero convencional."],
    ["Hay armazones que combinan", "Existen armazones que combinan"],
    ["un vidrio mineral fino,", "un vidrio mineral refinado,"],
    ["ambos materiales son buenos,", "ambos materiales son sobresalientes,"],
    ["patillas bien finitas", "patillas sumamente finas"],
    ["se van poniendo feos", "se van poniendo deslucidos"],
    ["el pañito de microfibra", "la gamuza de microfibra"],
    ["para verse bien y tener estilo,", "para lucir bien y tener estilo,"],
    ["o manejar y te ves bien", "o conducir y te ves bien"],
    ["parece una estructura de edificio.", "evoca una estructura de edificio."],
    ["con la parte de arriba plana,", "con la parte superior plana,"],
    ["que cae bien,", "que luce bien,"],
    ["recuerda a modelos antiguos,", "evoca modelos clásicos,"],
    ["para quitar el reflejo molesto del sol.", "para atenuar el reflejo molesto del sol."],
    ["los ojos descansan bien.", "la vista descansa bien."],
    ["armaron una <strong>guía", "elaboraron una <strong>guía"],
    ["hay que mirar tres elementos:", "hay que evaluar tres elementos:"],
    ["combina fácil con lo que te pongas.", "armoniza fácil con lo que te pongas."],
    ["que usa casi todo el mundo,", "que emplea casi todo el mundo,"],
    ["Son lentes bien amplios,", "Son monturas bien amplias,"],
    ["eso siempre suma.", "eso siempre aporta valor."],
    ["hacer accesorios en masa sin chiste,", "crear accesorios en masa sin chiste,"],
    ["juntan tecnología con trabajo a mano,", "combinan tecnología con trabajo a mano,"],
    ["te cambia la pinta enseida porque", "te cambia la imagen enseguida porque"],
    ["firmas de vestimenta de toda la vida,", "firmas de moda de toda la vida,"],
    ["que casi ni se sienten puestos.", "que apenas se perciben puestos."],
    ["piezas excelentes de verdad.", "piezas de genuina excelencia."],
    ["sin romperse fácil.", "sin deteriorarse fácilmente."],
    ["que vayan con tu onda", "que encajen con tu estilo"],
    ["el negro de siempre ya aburre un poco.", "el negro tradicional ya aburre un poco."],
    ["la gente que sabe pide lentes", "la gente conocedora pide lentes"],
    ["ellas mandan la pauta siempre.", "éstas marcan la pauta siempre."],
    ["date una vuelta por las", "conviene revisar las"],
    ["estos artículos cuestan lo suyo,", "estas piezas cuestan lo suyo,"],
    ["Armamos una lista rápida", "Elaboramos una lista rápida"],
    ["sirven para manejar cuando el sol pega fuerte", "sirven para conducir cuando el sol brilla fuerte"]
];

const pass2Replacements = [
    ["te cubren bien los ojos del sol", "te protegen bien los ojos del sol"],
    ["te fijas en los materiales,", "te centras en los materiales,"],
    ["qué tan claros son los cristales,", "qué tan nítidos son los cristales,"],
    ["la nariz ni las nota,", "la nariz apenas las nota,"],
    ["cambia rápido pero estos diseños", "cambia velozmente pero estos diseños"],
    ["detalles simples,", "detalles sobrios,"],
    ["combinan fácil con cualquier vestimenta.", "combinan fácilmente con cualquier vestimenta."],
    ["pesa casi nada porque", "pesa sumamente poco porque"],
    ["para no cansar los ojos", "para no fatigar los ojos"],
    ["cambia la actitud, la gente nota tu estilo.", "cambia la actitud, el entorno nota tu estilo."],
    ["accesorios útiles que además", "accesorios funcionales que además"],
    ["pero lucen genial,", "pero lucen impecables,"],
    ["usan metales firmes", "emplean metales firmes"],
    ["muestra los comienzos del taller", "evoca los comienzos del taller"],
    ["quería ayudar a la gente de la zona,", "quería apoyar a la gente de la zona,"],
    ["piezas suaves para la piel,", "piezas delicadas para la piel,"],
    // line 37 untouched
    ["un brillo que aguanta bien", "un brillo que resiste bien"],
    ["no se oxida nunca", "no se corroe nunca"],
    ["aguantan el sudor diario", "resisten el sudor diario"],
    ["así la vista no se cansa", "así la vista no se fatiga"],
    ["sientes el cambio al instante.", "aprecias el cambio al instante."],
    ["es un material que aguanta de todo,", "es un material que resiste de todo,"],
    ["Uno a veces por apuro usa la camiseta", "A menudo por apuro usa la camiseta"],
    ["olvídate de pasarles papel porque", "evita frotarles papel porque"],
    ["sacó diseños que cambiaron la moda", "presentó diseños que cambiaron la moda"],
    ["el marco no pesa casi nada,", "el marco apenas tiene peso,"],
    ["metieron líneas rectas", "trazaron líneas rectas"],
    ["ya sea de metal o plástico,", "sea de metal o plástico,"],
    ["además hicieron las líneas suaves", "además diseñaron líneas suaves"],
    ["a lo que se usa hoy,", "a lo que se lleva hoy,"],
    ["Te sirve si manejas con la calle mojada,", "Te ayuda si conduces con la calle mojada,"],
    ["Te tapan los rayos UV", "Bloquean los rayos UV"],
    ["y no deben molestar.", "y no deben incomodar."],
    ["en realidad importan,", "en verdad importan,"],
    ["estarse subiendo las gafas a cada rato.", "reajustarse las gafas a cada rato."],
    ["le calza bien a la mayoría", "asienta bien a la mayoría"],
    ["Cubren bien del sol,", "Protegen eficazmente del sol,"],
    ["en marcas caras ayuda,", "en firmas exclusivas ayuda,"],
    ["hablarle directo a gente exigente", "dirigirse directamente a gente exigente"],
    ["ZEGNA lo entendió rápido,", "ZEGNA lo comprendió rápido,"],
    ["no tienen éxito por suerte,", "no tienen éxito por azar,"],
    ["en los artículos caros de ahora,", "en los artículos exclusivos de ahora,"],
    ["Las bisagras se bancan el uso diario,", "Las bisagras soportan con solvencia el uso diario,"],
    ["gastar solo por un marco de oro o con brillos,", "pagar solo por un marco de oro o con brillos,"],
    ["No estás botando la plata en una moda rápida,", "No estás malgastando el dinero en una moda rápida,"],
    ["nadie gasta de más solo por presumir.", "nadie invierte de más solo por presumir."],
    ["se parece al caparazón tortuga,", "se asemeja al caparazón tortuga,"],
    ["un antirreflejo decente,", "un antirreflejo de calidad,"],
    ["La gente anda preguntando", "La gente suele preguntar"],
    ["para que le calcen bien a cualquiera.", "para adaptarse bien a cualquiera."],
    ["así la vista no se te cansa tanto", "así la vista no se fatiga tanto"],
    ["en estas marcas caras,", "en estas marcas exclusivas,"],
    ["frenan ese reflejo molesto que entra por los costados.", "atenúan ese reflejo molesto que entra por los costados."]
];

const pass3Replacements = [
    ["soportan el uso diario", "resisten el uso diario"],
    ["que no te aprieten el rostro.", "que no te opriman el rostro."],
    ["no cansan si los llevas", "no fatigan si los llevas"],
    ["vienen con los bordes algo redondeados", "cuentan con los bordes algo redondeados"],
    ["combinan fácil con cualquier prenda", "combinan fácilmente con cualquier prenda"],
    ["que te duelan las sienes.", "que te incomoden las sienes."],
    ["apariencia seria al instante,", "apariencia sobria al instante,"],
    ["la parte de la nariz calza perfecto", "la parte de la nariz asienta perfecto"],
    ["son resistentes, no pasan de moda", "son duraderas, no pasan de moda"],
    ["el entorno nota tu estilo.", "el entorno aprecia tu estilo."],
    ["ahora mismo.", "en la actualidad."],
    ["vestirse bien es mucho más simple", "vestirse bien resulta mucho más simple"],
    ["te aporta presencia, todos", "te confiere presencia, todos"],
    ["que hicieron en Italia.", "que recorrieron en Italia."],
    ["cuidar los árboles y el bosque.", "preservar los árboles y el bosque."],
    ["no se rompen por usarlas a diario.", "no se deterioran por usarlas a diario."],
    // line 37 untouched
    ["Los tonos se ven más vivos", "Los tonos lucen más vivos"],
    ["marcas rojas tan molestas en la piel.", "marcas visibles tan molestas en la piel."],
    ["sin pelarse rápido.", "sin desgastarse rápido."],
    ["si las usas seguido.", "si las usas constantemente."],
    ["terminan cansando.", "provocan cansancio."],
    ["en realidad no pesan nada,", "en realidad apenas pesan,"],
    ["pierden todo el brillo.", "pierden todo su lustre."],
    ["para que queden como recién salidos de la caja.", "para que luzcan como recién salidos de la caja."],
    ["materiales modernos que duran.", "materiales modernos y duraderos."],
    ["llaman la atención sin ser exagerados", "llaman la atención sin estridencias"],
    ["la gente ya se aburrió de ver", "la gente ya se cansó de ver"],
    ["andar con confianza sin perder", "caminar con confianza sin perder"],
    ["casi cualquier rostro.", "casi cualquier fisonomía."],
    ["sin detalles raros,", "sin adornos raros,"],
    ["la luz te da de frente,", "la luz incide de frente,"],
    ["qué tan oscuro viene el vidrio,", "qué tan oscuro es el vidrio,"],
    ["para solucionar esto,", "para resolver esto,"],
    ["vienen con estos números:", "cuentan con estos números:"],
    ["si tienes el rostro fino,", "si posees el rostro fino,"],
    ["sin que te incomode.", "sin que te moleste."],
    ["porque los hacen bien livianos.", "porque los hacen bien ligeros."],
    ["o te ande bailando en el rostro.", "o te quede bailando en el rostro."],
    ["sin tener que presumir de más.", "sin tener que ostentar de más."],
    ["para salir de viaje a la playa,", "para salir de viaje a la costa,"],
    ["y no para tirarlo al mes siguiente.", "y no para desecharlo al mes siguiente."],
    ["de la nada salen marcas nuevas con formas raras.", "de la nada surgen marcas nuevas con formas raras."],
    ["inventar formas raras que pasan rápido de moda,", "inventar siluetas que pasan rápido de moda,"],
    ["le meten tecnología nueva a los cristales", "incorporan tecnología nueva a los cristales"],
    ["las monturas salen caras pero aguantan los años", "las monturas salen costosas pero aguantan los años"],
    ["y quede bien igual.", "y luzca bien igual."],
    ["te pones cualquier vestimenta y combina al instante.", "te pones cualquier vestimenta y armoniza al instante."],
    ["puedes manejar al mediodía", "puedes conducir al mediodía"],
    ["que es lo que más se está viendo últimamente.", "que es lo que más predomina últimamente."],
    ["la idea es verse seguro y con presencia,", "la idea es lucir seguro y con presencia,"],
    ["así no fallas con el color y compras tranquilo.", "así no fallas con el color y compras seguro."],
    ["a veces uno se marea con tantas opciones,", "a veces uno se marea con múltiples opciones,"],
    ["son re útiles cuando la luz cambia a cada rato", "son muy útiles cuando la luz cambia a cada rato"]
];

function applyPass(inputHtml, replacements, passNumber) {
    console.log(`\n--- Applying Surgical Pass ${passNumber} ---`);
    const inputLines = inputHtml.split('\n');
    let outputLines = [...inputLines];

    replacements.forEach(([target, repl], idx) => {
        let found = false;
        outputLines = outputLines.map(line => {
            if (line.includes(target)) {
                found = true;
                return line.replace(target, repl);
            }
            return line;
        });
        if (!found) {
            throw new Error(`Pass ${passNumber}: target not found [${idx}]: "${target}"`);
        }
    });

    // Verification of chunks
    let maxRatio = 0;
    inputLines.forEach((origLine, i) => {
        const isP = origLine.startsWith('<p>');
        const isLi = origLine.startsWith('  <li>') || origLine.startsWith('<li>');
        if ((isP || isLi) && !origLine.includes('[*')) {
            const newLine = outputLines[i];
            const origClean = origLine.replace(/<[^>]+>/g, '').trim();
            const newClean = newLine.replace(/<[^>]+>/g, '').trim();
            const res = check(origClean, newClean);
            if (res.ratio > maxRatio) maxRatio = res.ratio;
            if (!res.ok) {
                throw new Error(`Pass ${passNumber} line ${i + 1} exceeds 5%: ${res.pct}% (dist ${res.dist}/${res.words})`);
            }
        }
    });

    console.log(`Pass ${passNumber} verified: max chunk edit ratio = ${(maxRatio * 100).toFixed(2)}% (Strictly < 5%)`);

    // Verify HTML tags
    const origTags = (inputHtml.match(/<[^>]+>/g) || []).join('');
    const newHtml = outputLines.join('\n');
    const newTags = (newHtml.match(/<[^>]+>/g) || []).join('');
    if (origTags !== newTags) {
        throw new Error(`Pass ${passNumber}: HTML tag structure altered!`);
    }
    console.log(`Pass ${passNumber} verified: 100% HTML tag preservation.`);

    return newHtml;
}

// 1. Base -> Pass 1
const baseHtml = fs.readFileSync(baseFilePath, 'utf8');
const pass1Html = applyPass(baseHtml, pass1Replacements, 1);
fs.writeFileSync(pass1FilePath, pass1Html, 'utf8');
console.log(`Saved surg_pass_1.html (${pass1Html.length} bytes)`);

// 2. Pass 1 -> Pass 2
const readPass1Html = fs.readFileSync(pass1FilePath, 'utf8');
const pass2Html = applyPass(readPass1Html, pass2Replacements, 2);
fs.writeFileSync(pass2FilePath, pass2Html, 'utf8');
console.log(`Saved surg_pass_2.html (${pass2Html.length} bytes)`);

// 3. Pass 2 -> Pass 3
const readPass2Html = fs.readFileSync(pass2FilePath, 'utf8');
const pass3Html = applyPass(readPass2Html, pass3Replacements, 3);
fs.writeFileSync(pass3FilePath, pass3Html, 'utf8');
console.log(`Saved surg_pass_3.html (${pass3Html.length} bytes)`);

console.log('\n=============================================');
console.log('SUCCESS: All 3 surgical passes generated and verified!');
console.log('=============================================');
