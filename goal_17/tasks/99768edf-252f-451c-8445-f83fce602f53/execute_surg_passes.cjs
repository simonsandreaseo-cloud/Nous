const fs = require('fs');
const path = require('path');
const { wordLevenshtein, wordLCS, verifyStrictLimits } = require('./surg_verifier.cjs');

const basePath = path.join(__dirname, 'latest_base.html');
const baseContent = fs.readFileSync(basePath, 'utf8');

const pass1_replacements = [
    // Chunk 1 (Line 2, 50w)
    ['en la calle,', 'en la ciudad,'],
    ['luzcas increíble', 'luzcas espléndida'],

    // Chunk 2 (Line 5, 71w)
    ['opciones brutales', 'opciones selectas'],
    ['te tape bien', 'te cubra bien'],

    // Chunk 3 (Line 8, 123w)
    ['aguanta el trote', 'soporta el ritmo'],
    ['marcas feas', 'marcas molestas'],
    ['súper denso', 'muy denso'],

    // Chunk 4 (Line 12, 106w)
    ['conjunto soso', 'conjunto sobrio'],
    ['pasta gorda', 'pasta gruesa'],
    ['cuadrada pero suavecita', 'cuadrada pero suavizada'],

    // Chunk 5 (Line 16, 132w)
    ['lujo del bueno.', 'lujo de verdad.'],
    ['no paran', 'no descansan'],
    ['estructura finita', 'estructura fina'],
    ['súper trabajados.', 'muy trabajados.'],

    // Chunk 6 (Line 20, 87w)
    ['pasa igualito.', 'ocurre igual.'],

    // Chunk 7 (Line 21, 79w)
    ['se plantan estos', 'se ponen estos'],
    ['ropa normalita', 'ropa sencilla'],

    // Chunk 8 (Line 24, 78w)
    ['más loco.', 'más audaz.'],
    ['mandan los noventa', 'predominan los noventa'],

    // Chunk 9 (Line 28, 96w)
    ['esta movida del', 'esta pauta del'],
    ['está arrasando con', 'está destacando con'],
    ['meter el', 'incluir el'],

    // Chunk 10 (Line 30, 89w)
    ['se ven geniales', 'se ven estupendas'],
    ['de un apuro.', 'de un compromiso.'],
    ['al dedillo,', 'al detalle,'],

    // Chunk 11 (Line 31, 48w)
    ['pilla esos', 'toma esos'],
    ['les mete un', 'les añade un'],

    // Chunk 12 (Line 33, 48w)
    ['es gorda', 'es gruesa'],
    ['son finitas.', 'son finas.'],

    // Chunk 13 (Line 34, 47w)
    ['arman la gafa', 'forman la gafa'],
    ['el hierro de', 'el metal de'],

    // Chunk 14 (Line 35, 38w)
    ['pillan la luz', 'captan la luz'],

    // Chunk 15 (Line 36, 43w)
    ['paran los rayos', 'frenan los rayos'],
    ['en sitios con', 'en espacios con'],

    // Chunk 16 (Line 38, 60w)
    ['trajes de tío', 'trajes de hombre'],
    ['ropa de calle.', 'ropa de diario.'],

    // Chunk 17 (Line 41, 77w)
    ['más pide la gente', 'más demanda la gente'],
    ['ponemos cara a cara', 'situamos cara a cara'],

    // Chunk 18 (Line 42, 46w)
    ['detalles flipantes,', 'detalles singulares,'],
    ['bastante gordas,', 'bastante gruesas,'],

    // Chunk 19 (Line 71, 79w)
    ['dando vueltas.', 'dando opciones.'],
    ['las movidas técnicas', 'las características técnicas'],

    // Chunk 20 (Line 74, 21w)
    ['El acetato ese', 'El acetato selecto'],

    // Chunk 21 (Line 75, 24w)
    ['peso caiga igual', 'peso repose igual'],

    // Chunk 22 (Line 76, 26w)
    ['te tapan muy', 'te cubren muy'],

    // Chunk 23 (Line 77, 30w)
    ['lentes de plástico', 'lentes de policarbonato'],

    // Chunk 24 (Line 81, 68w)
    ['un carajo', 'un ápice'],
    ['sean súper buscadas.', 'sean muy buscadas.'],

    // Chunk 25 (Line 86, 64w)
    ['te queda brutal', 'te queda óptimo'],
    ['te disimula', 'te armoniza'],

    // Chunk 26 (Line 90, 49w)
    ['te puedes pillar', 'te puedes elegir'],
    ['súper sencillo', 'muy sencillo'],

    // Chunk 27 (Line 93, 23w)
    ['Gucci monta su', 'Gucci articula su'],

    // Chunk 28 (Line 95, 32w)
    ['pegan con casi', 'combinan con casi'],

    // Chunk 29 (Line 96, 35w)
    ['de chica retro', 'de dama retro'],

    // Chunk 30 (Line 97, 32w)
    ['gafas gigantes', 'gafas amplias'],

    // Chunk 31 (Line 98, 30w)
    ['pegan súper natural', 'sientan súper natural'],

    // Chunk 32 (Line 99, 29w)
    ['súper marcadas', 'muy marcadas'],

    // Chunk 33 (Line 104, 93w)
    ['se ponía fea.', 'se ponía dura.'],
    ['ha pillado esta', 'ha tomado esta'],
    ['patillas gordas', 'patillas anchas'],

    // Chunk 34 (Line 108, 37w)
    ['peguen con tu', 'armonicen con tu'],

    // Chunk 35 (Line 110, 21w)
    ['marca mete ediciones', 'marca lanza ediciones'],

    // Chunk 36 (Line 114, 52w)
    ['Pillarse gafas', 'Adquirir gafas'],
    ['es súper fácil', 'es muy fácil'],

    // Chunk 37 (Line 118, 70w)
    ['y los enormes,', 'y los oversize,'],
    ['te dicen sus', 'te indican sus'],

    // Chunk 38 (Line 122, 53w)
    ['cristales pegados.', 'cristales engastados.'],
    ['trozos de metal', 'piezas de metal'],

    // Chunk 39 (Line 135, 21w)
    ['acetato top', 'acetato prémium'],

    // Chunk 40 (Line 140, 26w)
    ['de locos.', 'de ensueño.'],

    // Chunk 41 (Line 145, 24w)
    ['cristales metidos,', 'cristales engastados,'],

    // Chunk 42 (Line 149, 23w)
    ['cotillear todos los', 'explorar todos los'],

    // Chunk 43 (Line 152, 60w)
    ['gastas pasta en', 'gastas dinero en'],
    ['paran el sol', 'bloquean el sol'],

    // Chunk 44 (Line 155, 40w)
    ['chequear con cuidado:', 'verificar con cuidado:'],

    // Chunk 45 (Line 157, 78w)
    ['Mírate la patilla', 'Revisa la patilla'],
    ['súper limpio', 'muy limpio'],

    // Chunk 46 (Line 158, 44w)
    ['ni que bailen.', 'ni que oscilen.'],
    ['súper duras', 'muy duras'],

    // Chunk 47 (Line 159, 43w)
    ['trapito color marfil', 'paño color marfil'],
    ['tela que pega,', 'tela que coordina,'],

    // Chunk 48 (Line 160, 50w)
    ['antes de soltar la pasta.', 'antes de soltar la compra.'],
    ['traiga el librito', 'traiga el folleto']
];

const pass2_replacements = [
    // Chunk 1 (Line 2, 50w)
    ['el material es excelente.', 'el material es superior.'],
    ['notas al instante', 'aprecias al instante'],

    // Chunk 2 (Line 5, 71w)
    ['de qué están hechas.', 'de qué están confeccionadas.'],
    ['te vale de guía', 'te sirve de guía'],
    ['santo día.', 'pleno día.'],

    // Chunk 3 (Line 8, 123w)
    ['te tapa los ojos', 'te cubre los ojos'],
    ['marcas molestas', 'marcas incómodas'],
    ['por todos lados', 'por todo flanco'],
    ['brilla que da gusto.', 'luce que da gusto.'],

    // Chunk 4 (Line 12, 106w)
    ['de golpe.', 'al instante.'],
    ['te quita el sol', 'te bloquea el sol'],
    ['súper claro.', 'muy claro.'],
    ['las aguantes puestas', 'las lleves puestas'],

    // Chunk 5 (Line 16, 132w)
    ['súper moderno', 'muy moderno'],
    ['ahí pegadas', 'ahí fijas'],
    ['que ni las notas.', 'que apenas las notas.'],
    ['el uso de cada día', 'el uso de cada jornada'],
    ['por todas partes.', 'por todas direcciones.'],

    // Chunk 6 (Line 20, 87w)
    ['mil opciones', 'múltiples opciones'],
    ['valen para todo.', 'sirven para todo.'],
    ['se montan una', 'se forjan una'],

    // Chunk 7 (Line 21, 79w)
    ['muchísimo en', 'atentamente en'],
    ['marcos enormes', 'marcos amplios'],
    ['que engancha.', 'que cautiva.'],

    // Chunk 8 (Line 24, 78w)
    ['marcas de toda la vida', 'marcas de toda la historia'],
    ['súper actuales.', 'muy actuales.'],
    ['estilo limpio', 'estilo pulcro'],

    // Chunk 9 (Line 28, 96w)
    ['su lujazo italiano', 'su opulencia italiana'],
    ['dice cómo se hace,', 'marca cómo se hace,'],
    ['datos más nuevos', 'datos más recientes'],

    // Chunk 10 (Line 30, 89w)
    ['una barbaridad,', 'con maestría,'],
    ['rapidísimo.', 'eficazmente.'],

    // Chunk 11 (Line 31, 48w)
    ['cosas de diseño', 'rasgos de diseño'],
    ['modelo cualquiera.', 'modelo genérico.'],

    // Chunk 12 (Line 33, 48w)
    ['la parte de alante', 'la parte de frente'],
    ['no te cansan nada', 'no te cansan apenas'],

    // Chunk 13 (Line 34, 47w)
    ['más se buscan', 'más se solicitan'],
    ['esqueleto del lente.', 'cuerpo del lente.'],

    // Chunk 14 (Line 35, 38w)
    ['colores súper fuertes,', 'colores muy fuertes,'],

    // Chunk 15 (Line 36, 43w)
    ['Vuelven al estilo', 'Remiten al estilo'],
    ['luz dentro.', 'luz interior.'],

    // Chunk 16 (Line 38, 60w)
    ['taparte el sol:', 'cubrirte el sol:'],
    ['encima, los artesanos', 'además, los artesanos'],

    // Chunk 17 (Line 41, 77w)
    ['lleva su tiempo.', 'requiere su tiempo.'],
    ['te queda bien a la cara', 'te sienta bien a la cara'],
    ['acertar.', 'triunfar.'],

    // Chunk 18 (Line 42, 46w)
    ['súper diferentes.', 'muy diferentes.'],
    ['más suavecito y fino', 'más grácil y fino'],

    // Chunk 19 (Line 71, 79w)
    ['mandan en la colección', 'lideran en la colección'],
    ['tan duras:', 'tan resistentes:'],
    ['Te soltamos', 'Te presentamos'],

    // Chunk 20 (Line 74, 21w)
    ['aguanta el trote', 'soporta el trote'],

    // Chunk 21 (Line 75, 24w)
    ['resbalar.', 'deslizarse.'],

    // Chunk 22 (Line 76, 26w)
    ['verse gigantes', 'verse excesivas'],

    // Chunk 23 (Line 77, 30w)
    ['súper ligeras', 'muy ligeras'],

    // Chunk 24 (Line 81, 68w)
    ['casi ni mete', 'casi ni incluye'],
    ['juntado con', 'fusionado con'],

    // Chunk 25 (Line 86, 64w)
    ['tamaño gigante', 'tamaño amplio'],
    ['te arregla', 'te equilibra'],
    ['la raya horizontal', 'la línea horizontal'],

    // Chunk 26 (Line 90, 49w)
    ['un montón de colores.', 'un sinfín de colores.'],
    ['diseños gigantes', 'diseños audaces'],

    // Chunk 27 (Line 93, 23w)
    ['familias grandes', 'familias principales'],

    // Chunk 28 (Line 95, 32w)
    ['acetatos buenos', 'acetatos selectos'],

    // Chunk 29 (Line 96, 35w)
    ['estirando la cara', 'estilizando la cara'],

    // Chunk 30 (Line 97, 32w)
    ['te tapa toda', 'te cubre toda'],

    // Chunk 31 (Line 98, 30w)
    ['súper natural', 'muy natural'],

    // Chunk 32 (Line 99, 29w)
    ['más grande que', 'más amplio que'],

    // Chunk 33 (Line 104, 93w)
    ['la ha metido directa', 'la ha llevado directa'],
    ['pisando fuerte con', 'plena fuerza con'],
    ['súper atrevido', 'muy atrevido'],

    // Chunk 34 (Line 108, 37w)
    ['cosas metálicas', 'piezas metálicas'],

    // Chunk 35 (Line 110, 21w)
    ['ediciones raras', 'ediciones singulares'],

    // Chunk 36 (Line 114, 52w)
    ['cómo aprieta la marca.', 'cómo calza la marca.'],
    ['se quede quieta', 'se mantenga quieta'],

    // Chunk 37 (Line 118, 70w)
    ['se hacen con la medida', 'se elaboran con la medida'],
    ['puedas ajustar', 'consigas ajustar'],
    ['Casi todas', 'Prácticamente todas'],

    // Chunk 38 (Line 122, 53w)
    ['toques a mano', 'acabados a mano'],
    ['acetato normal', 'acetato tradicional'],

    // Chunk 39 (Line 135, 21w)
    ['formas normales', 'formas clásicas'],

    // Chunk 40 (Line 140, 26w)
    ['súper grande,', 'muy grande,'],

    // Chunk 41 (Line 145, 24w)
    ['cosas de joyería', 'detalles de joyería'],

    // Chunk 42 (Line 149, 23w)
    ['puedes mirarte el', 'puedes consultar el'],

    // Chunk 43 (Line 152, 60w)
    ['le mete a cada cosa:', 'le aporta a cada cosa:'],
    ['súper claros', 'muy claros'],

    // Chunk 44 (Line 155, 40w)
    ['Italia de verdad.', 'Italia de origen.'],

    // Chunk 45 (Line 157, 78w)
    ['En la otra patilla viene', 'En la otra patilla figura'],
    ['vas a ver el sello', 'vas a hallar el sello'],
    ['patilla derecha', 'varilla derecha'],

    // Chunk 46 (Line 158, 44w)
    ['metidas perfectas', 'insertadas perfectas'],
    ['de verdad llevan', 'de origen llevan'],

    // Chunk 47 (Line 159, 43w)
    ['te las dan en', 'te las entregan en'],
    ['caja dura forrada', 'caja sólida forrada'],

    // Chunk 48 (Line 160, 50w)
    ['el papel de que', 'el documento de que'],
    ['antes de soltar la compra.', 'antes de formalizar la compra.']
];

const pass3_replacements = [
    // Chunk 1 (Line 2, 50w)
    ['impacta fuerte', 'incide fuerte'],
    ['lujo italiano,', 'porte italiano,'],

    // Chunk 2 (Line 5, 71w)
    ['lleva tiempo', 'requiere tiempo'],
    ['más se busca', 'más se demanda'],
    ['cómoda todo el', 'confortable todo el'],

    // Chunk 3 (Line 8, 123w)
    ['da gusto.', 'da encanto.'],
    ['por todo flanco', 'en todo flanco'],
    ['gafas tipo máscara', 'monturas tipo máscara'],
    ['se agarra bien', 'se fija bien'],

    // Chunk 4 (Line 12, 106w)
    ['bisagras duras', 'bisagras firmes'],
    ['a tus cosas.', 'a tu vestuario.'],
    ['Les metieron unas', 'Les añadieron unas'],

    // Chunk 5 (Line 16, 132w)
    ['diseño muy moderno', 'modelo muy moderno'],
    ['que te miren', 'que te admiren'],
    ['se nota al instante', 'se distingue al instante'],
    ['calor y el uso', 'calor y el trato'],

    // Chunk 6 (Line 20, 87w)
    ['en ropa,', 'en moda,'],
    ['sacando colecciones', 'lanzando colecciones'],
    ['destaca donde sea', 'destaca donde vayas'],

    // Chunk 7 (Line 21, 79w)
    ['cualquier cosa.', 'todo criterio.'],
    ['ropa sencilla resalta', 'ropa sencilla destaca'],

    // Chunk 8 (Line 24, 78w)
    ['se gire a mirarlas.', 'se detenga a mirarlas.'],
    ['toque más audaz.', 'matiz más audaz.'],

    // Chunk 9 (Line 28, 96w)
    ['se llevan ahora,', 'se llevan hoy,'],
    ['Gucci no solo sigue', 'Gucci no solo emula'],

    // Chunk 10 (Line 30, 89w)
    ['pegan con tus rasgos', 'armonizan con tus rasgos'],
    ['no te tapan', 'no te cubren'],
    ['facciones más duras,', 'facciones más marcadas,'],

    // Chunk 11 (Line 31, 48w)
    ['saltan a la vista', 'quedan a la vista'],
    ['son la clave:', 'son la pauta:'],

    // Chunk 12 (Line 33, 48w)
    ['juega con el tamaño:', 'experimenta con el tamaño:'],
    ['se reparte mejor', 'se distribuye mejor'],

    // Chunk 13 (Line 34, 47w)
    ['mezclan el metal', 'combinan el metal'],
    ['haciendo que la firma', 'logrando que la firma'],

    // Chunk 14 (Line 35, 38w)
    ['sacaron modelos', 'lanzaron modelos'],

    // Chunk 15 (Line 36, 43w)
    ['puedes lucir tanto', 'puedes llevar tanto'],
    ['más transparentes', 'más traslúcidos'],

    // Chunk 16 (Line 38, 60w)
    ['gente de moda', 'referentes de moda'],
    ['siga brillando', 'siga destacando'],

    // Chunk 17 (Line 41, 77w)
    ['fijarte bien', 'reparar bien'],
    ['Miramos con lupa', 'Examinamos con lupa'],
    ['dos enfoques', 'dos conceptos'],

    // Chunk 18 (Line 42, 46w)
    ['de ahora con', 'de vanguardia con'],
    ['aire retro', 'estilo retro'],

    // Chunk 19 (Line 71, 79w)
    ['modelo serio', 'modelo distinguido'],
    ['te pones estas', 'te colocas estas'],
    ['look hecho en', 'look resuelto en'],

    // Chunk 20 (Line 74, 21w)
    ['sin torcerse.', 'sin deformarse.'],

    // Chunk 21 (Line 75, 24w)
    ['está hecho a', 'está ideado a'],

    // Chunk 22 (Line 76, 26w)
    ['cortando los brillos', 'mitigando los brillos'],

    // Chunk 23 (Line 77, 30w)
    ['paran los rayos', 'frenan los rayos'],

    // Chunk 24 (Line 81, 68w)
    ['cuatro diseños así', 'cuatro opciones así'],
    ['sean muy buscadas.', 'sean muy cotizadas.'],

    // Chunk 25 (Line 86, 64w)
    ['Hablando de imagen', 'Tratándose de imagen'],
    ['abajo del lente', 'baja del lente'],
    ['mucha frente.', 'amplia frente.'],

    // Chunk 26 (Line 90, 49w)
    ['ves que lo ordenan', 'aprecias que lo ordenan'],
    ['llaman la atención siempre.', 'atraen la atención siempre.'],

    // Chunk 27 (Line 93, 23w)
    ['quedar bien', 'armonizar bien'],

    // Chunk 28 (Line 95, 32w)
    ['metales súper brillantes.', 'metales muy brillantes.'],

    // Chunk 29 (Line 96, 35w)
    ['esquinas de fuera,', 'bordes de fuera,'],

    // Chunk 30 (Line 97, 32w)
    ['aire de pasarela.', 'porte de pasarela.'],

    // Chunk 31 (Line 98, 30w)
    ['vuelta los años', 'presente los años'],

    // Chunk 32 (Line 99, 29w)
    ['forma a la cara', 'carácter a la cara'],

    // Chunk 33 (Line 104, 93w)
    ['viene del deporte', 'nace del deporte'],
    ['marca de la casa', 'sello de la firma'],

    // Chunk 34 (Line 108, 37w)
    ['Gucci saca gafas', 'Gucci diseña gafas'],

    // Chunk 35 (Line 110, 21w)
    ['colores súper fuertes', 'colores muy fuertes'],

    // Chunk 36 (Line 114, 52w)
    ['se mantenga quieta', 'se mantenga firme'],
    ['reventarte la cabeza.', 'molestarte la cabeza.'],

    // Chunk 37 (Line 118, 70w)
    ['dentro de la patilla', 'dentro de la varilla'],
    ['ajustar al milímetro.', 'ajustar con precisión.'],

    // Chunk 38 (Line 122, 53w)
    ['lo complicado que sea', 'lo complejo que sea'],
    ['hacer el armazón', 'producir el armazón'],

    // Chunk 39 (Line 135, 21w)
    ['súper discretos', 'muy discretos'],

    // Chunk 40 (Line 140, 26w)
    ['juntan metales', 'combinan metales'],

    // Chunk 41 (Line 145, 24w)
    ['ediciones raras', 'ediciones selectas'],

    // Chunk 42 (Line 149, 23w)
    ['catálogo completo', 'catálogo íntegro'],

    // Chunk 43 (Line 152, 60w)
    ['duran un montón.', 'duran largo tiempo.'],

    // Chunk 44 (Line 155, 40w)
    ['mirar con lupa', 'examinar con lupa'],

    // Chunk 45 (Line 157, 78w)
    ['pasas el dedo.', 'rozas el dedo.'],
    ['otra patilla figura', 'otra varilla figura'],

    // Chunk 46 (Line 158, 44w)
    ['sentir suave, duro', 'sentir suave, firme'],
    ['sin hacer ruido.', 'sin emitir ruido.'],

    // Chunk 47 (Line 159, 43w)
    ['bolsita de tela', 'funda de tela'],
    ['sus papeles oficiales.', 'sus documentos oficiales.'],

    // Chunk 48 (Line 160, 50w)
    ['Chequea siempre', 'Verifica siempre'],
    ['cartón bueno.', 'cartón prémium.']
];

function applyPass(content, replacements, label) {
    let res = content;
    replacements.forEach(([t, r], idx) => {
        if (!res.includes(t)) throw new Error(`[${label}] Target not found at index ${idx}: "${t}"`);
        res = res.replace(t, r);
    });
    return res;
}


const pass1Path = path.join(__dirname, 'surg_pass_1.html');
const pass2Path = path.join(__dirname, 'surg_pass_2.html');
const pass3Path = path.join(__dirname, 'surg_pass_3.html');

console.log('=== STEP 1: APPLYING PASS 1 ===');
const p1 = applyPass(baseContent, pass1_replacements, 'Pass 1');
verifyStrictLimits(baseContent, p1, 'Pass 1 vs Base');
fs.writeFileSync(pass1Path, p1, { encoding: 'utf8' });
console.log('Saved surg_pass_1.html successfully.');

console.log('=== STEP 2: READING surg_pass_1.html & APPLYING PASS 2 ===');
const readP1 = fs.readFileSync(pass1Path, 'utf8');
const p2 = applyPass(readP1, pass2_replacements, 'Pass 2');
verifyStrictLimits(readP1, p2, 'Pass 2 vs Pass 1');
fs.writeFileSync(pass2Path, p2, { encoding: 'utf8' });
console.log('Saved surg_pass_2.html successfully.');

console.log('=== STEP 3: READING surg_pass_2.html & APPLYING PASS 3 ===');
const readP2 = fs.readFileSync(pass2Path, 'utf8');
const p3 = applyPass(readP2, pass3_replacements, 'Pass 3');
verifyStrictLimits(readP2, p3, 'Pass 3 vs Pass 2');
fs.writeFileSync(pass3Path, p3, { encoding: 'utf8' });
console.log('Saved surg_pass_3.html successfully.');

console.log('=== POST-EXECUTION VERIFICATION FROM DISK ===');
[pass1Path, pass2Path, pass3Path].forEach((filePath, idx) => {
    const rawBuf = fs.readFileSync(filePath);
    if (rawBuf[0] === 0xEF && rawBuf[1] === 0xBB && rawBuf[2] === 0xBF) {
        throw new Error(`File ${filePath} contains UTF-8 BOM!`);
    }
    const txt = rawBuf.toString('utf8');
    if (/[ÃÂ]/.test(txt)) {
        throw new Error(`File ${filePath} likely contains double-encoded characters!`);
    }
    console.log(`Pass ${idx + 1} file verified: bytes=${rawBuf.length}, UTF-8 clean, no BOM.`);
});

console.log('ALL 3 SURGICAL PASSES COMPLETED AND VERIFIED PERFECTLY!');
