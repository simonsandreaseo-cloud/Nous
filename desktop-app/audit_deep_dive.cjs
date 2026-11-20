const fs = require('fs');
const path = require('path');

const originalDraft = fs.readFileSync(path.join(__dirname, 'original_target_draft.html'), 'utf8');
const humanizedText = fs.readFileSync(path.join(__dirname, 'converted_plain_text.txt'), 'utf8');
const masterBank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'banco_maestro_retorico_unificado.json'), 'utf8'));

// Build donor bank
const donors = [];
for (const k of ['triads', 'duos', 'singles']) {
  if (masterBank[k]) {
    for (const item of masterBank[k]) {
      if (item.text) donors.push(item);
    }
  }
}

// Key cases from the user screenshots to audit
const auditCases = [
  {
    name: "Caso 1 (ROJO) - Metal Dorado y Pasta",
    humanizedSentence: "Si hablamos de las ventajas de las gafas de metal dorado, no podemos olvidar que estas gafas cuentan con un marco grueso que recubre y protege los cristales, algo muy útil si te preocupa que tus gafas puedan sufrir daños o rayadas.",
    contiguousBefore: "• Calibre: La lente mide 58 mm, tiene forma de lágrima y cubre los laterales para evitar deslumbramientos. El tamaño es perfecto si tienes la cara ancha, pero no queda mal en rostros delgados.",
    contiguousAfter: "Si algo bueno tienen las gafas de metal es que están hechas de un material que aporta frescura al rostro gracias a su fina montura.",
    color: "ROJO (Likely AI)"
  },
  {
    name: "Caso 2 (NARANJA/ROJO) - Disminuir Porcentaje Luz",
    humanizedSentence: "Lo que hace la gafa oscura es disminuir el porcentaje de luz visible que llega a nuestros ojos, por lo que resulta conveniente para realizar una determinada actividad dependiendo de las condiciones ambientales en las que nos encontremos.",
    contiguousBefore: "• El filtro no depende del color del cristal. De hecho, un cristal transparente puede tener filtro UV400 que nos proteja perfectamente de los efectos nocivos del sol.",
    contiguousAfter: "• Otro principio básico será la proporción y el equilibrio, en cuanto al tamaño se refiere.",
    color: "NARANJA/ROJO"
  },
  {
    name: "Caso 3 (NARANJA/ROJO) - Refuerzo Metálico",
    humanizedSentence: "Actualmente las patillas llevan un refuerzo metálico interno que les permite ajustar, tanto su longitud como su curvatura, adaptándose así perfectamente, como un guante, a todas las caras.",
    contiguousBefore: "Así, lo primero que debes tener en cuenta cuando te pruebes unas Ray-Ban es si te resultan cómodas y se ajustan bien a tu rostro.",
    contiguousAfter: "Pruébalas y no te arrepentirás, es más ¡No podrás dejar de usarlas!",
    color: "NARANJA/ROJO"
  },
  {
    name: "Caso 4 (ROJO) - No dejarse llevar por la moda",
    humanizedSentence: "Por ello, es importante que entiendas que no es necesario dejarse llevar por la moda. Lo importante es que cada uno esté a gusto con sus gafas con cristal espejado azul que refleja el sol directo. Al fin y al cabo, nos van a acompañar durante todo el día.",
    contiguousBefore: "Como todos los aspectos relacionados con la moda, a todo el mundo no le gusta lo que se lleva en este momento. En ocasiones, puede resultar demasiado llamativo para nuestra personalidad.",
    contiguousAfter: "Como consejo te diremos que no te adaptes a la moda, adapta la moda a ti.",
    color: "ROJO"
  },
  {
    name: "Caso 5 (ROJO - TÍTULOS / HEADINGS)",
    humanizedSentence: "Celebración e Historia: ¿Qué aniversario de Ray-Ban coincide con el lanzamiento de esta colección?",
    contiguousBefore: "Para un rostro alargado donde las proporciones son muy lineales, las formas ascendentes compensan esta igualdad en las líneas del rostro.",
    contiguousAfter: "A los rostros ovalados también les sientan bien, aunque mejor con bordes redondeados que angulosos. Las gafas Aviator, con monturas muy finas, es otro estilo que lleva décadas entre nosotros, pero que últimamente se han puesto más de moda.",
    color: "ROJO"
  },
  {
    name: "Caso 6 (ROJO - SINTÉTICO PURO NOUS)",
    humanizedSentence: "Barra ciliar (Sweat bar) de nácar auténtico: Una pieza de nácar color marfil se apoya contra la frente y retiene las gotas de sudor.",
    contiguousBefore: "Análisis del Modelo Shooter: ¿Qué características de diseño vintage incluye?",
    contiguousAfter: "• ¡No te quedes sin las tuyas! El modelo Vipsual Pinheads también combina la lente plana con el doble puente de titanio y acero.",
    color: "ROJO"
  },
  {
    name: "Caso 7 (ROJO - SINTÉTICO PURO NOUS)",
    humanizedSentence: "Corte exacto en el vidrio: Una máquina talla un canal a los costados del cristal; esa ranura esconde el filamento plástico.",
    contiguousBefore: "Innovación de la estructura: ¿Cómo logran el efecto sin marco en el metal de las nuevas Aviator?",
    contiguousAfter: "• Las características principales de este tipo de Hilo invisible de alta resistencia: es que son sencillas, limpias, de colores simples, de montura fina de metal y con la lente en forma de lágrima.",
    color: "ROJO"
  },
  {
    name: "Caso 8 (ROJO - CONSECUENCIA DE CABELLO)",
    humanizedSentence: "Si tu pelo es marrón oscuro o marrón claro, te sentarán perfectamente los colores cálidos, como los rojos, amarillos o marrones, y también los tonos ocres.",
    contiguousBefore: "Su inconfundible tono Marrón Habana se mezcla con unas vetas que proporcionan una estética suave y atractiva, para nada tosca.",
    contiguousAfter: "Para cabellos de color rubio o castaño claro , los colores verdes, azules, plateados incluso el negro, dependiendo del tipo de montura, te pueden ir muy bien.",
    color: "ROJO"
  }
];

function findInText(snippet, text) {
  const cleanSnippet = snippet.toLowerCase().replace(/[^\wáéíóúüñ\s]/g, ' ').trim();
  const words = cleanSnippet.split(/\s+/).filter(w => w.length > 4);
  let maxMatch = 0;
  let bestMatch = '';
  
  // search by paragraphs
  const paras = text.split(/\n\s*\n|<p>|<\/p>/);
  for (const p of paras) {
    const pClean = p.toLowerCase().replace(/[^\wáéíóúüñ\s]/g, ' ');
    let count = 0;
    for (const w of words) {
      if (pClean.includes(w)) count++;
    }
    if (count > maxMatch) {
      maxMatch = count;
      bestMatch = p.trim();
    }
  }
  return { overlap: maxMatch, total: words.length, match: bestMatch };
}

function findBestBankDonor(snippet) {
  const cleanSnippet = snippet.toLowerCase().replace(/[^\wáéíóúüñ\s]/g, ' ').trim();
  const words = cleanSnippet.split(/\s+/).filter(w => w.length > 4);
  let maxMatch = 0;
  let best = null;
  for (const d of donors) {
    const dClean = d.text.toLowerCase().replace(/[^\wáéíóúüñ\s]/g, ' ');
    let count = 0;
    for (const w of words) {
      if (dClean.includes(w)) count++;
    }
    if (count > maxMatch) {
      maxMatch = count;
      best = d;
    }
  }
  return { donor: best, overlap: maxMatch, total: words.length };
}

console.log('AUDITORIA MULTIFACTORIAL PROFUNDA DE CASOS:\n');

auditCases.forEach((c, idx) => {
  console.log(`\n======================================================`);
  console.log(`${c.name} [${c.color}]`);
  console.log(`FRASE DETECTADA:\n"${c.humanizedSentence}"\n`);

  // 1. Check in original Nous draft
  const inOriginal = findInText(c.humanizedSentence, originalDraft);
  console.log(`1. EN BORRADOR ORIGINAL DE NOUS:`);
  if (inOriginal.overlap >= Math.min(3, inOriginal.total)) {
    console.log(`   [COINCIDENCIA EN NOUS] (${inOriginal.overlap}/${inOriginal.total} palabras clave):`);
    console.log(`   "${inOriginal.match.slice(0, 250)}..."`);
  } else {
    console.log(`   [NO PRESENTE EN BORRADOR ORIGINAL NOUS] - Proviene de donante externo`);
  }

  // 2. Check in Donor Bank
  const inDonor = findBestBankDonor(c.humanizedSentence);
  console.log(`\n2. EN BANCO MAESTRO DE DONANTES:`);
  if (inDonor.donor && inDonor.overlap >= Math.min(3, inDonor.total)) {
    console.log(`   [DONANTE ENCONTRADO] ID: ${inDonor.donor.id}, Dominio: ${inDonor.donor.source_domain}, Tier: ${inDonor.donor.tier}`);
    console.log(`   "${inDonor.donor.text.slice(0, 250)}..."`);
  } else {
    console.log(`   [SIN DONANTE EN BANCO] - Es texto inyectado sintéticamente por Gemma o conservado de Nous!`);
  }
});
