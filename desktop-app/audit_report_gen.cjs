const fs = require('fs');
const path = require('path');

const run = JSON.parse(fs.readFileSync(path.join(__dirname, 'electron', 'logs', 'runs', 'run_1794071717271.json'), 'utf8'));
const masterBank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'banco_maestro_retorico_unificado.json'), 'utf8'));
const originalDraft = fs.readFileSync(path.join(__dirname, 'original_target_draft.html'), 'utf8');

// Build donor lookup
const donors = [];
for (const k of ['triads', 'duos', 'singles']) {
  if (masterBank[k]) {
    for (const item of masterBank[k]) {
      if (item.text) donors.push(item);
    }
  }
}

function findBestDonor(text) {
  const words = text.toLowerCase().replace(/[^\wáéíóúüñ\s]/g, ' ').split(/\s+/).filter(w => w.length > 4);
  let maxMatch = 0;
  let best = null;
  for (const d of donors) {
    const dLower = d.text.toLowerCase();
    let matches = 0;
    for (const w of words) {
      if (dLower.includes(w)) matches++;
    }
    if (matches > maxMatch) {
      maxMatch = matches;
      best = d;
    }
  }
  return { donor: best, matches: maxMatch, total: words.length };
}

const detailedCases = [
  {
    id: "R1",
    type: "ROJO",
    category: "Frase en cuerpo (mutación asimétrica)",
    text: "Si hablamos de las ventajas de las gafas de metal dorado, no podemos olvidar que estas gafas cuentan con un marco grueso que recubre y protege los cristales, algo muy útil si te preocupa que tus gafas puedan sufrir daños o rayadas.",
    contextBefore: "• Calibre: La lente mide 58 mm, tiene forma de lágrima y cubre los laterales para evitar deslumbramientos. El tamaño es perfecto si tienes la cara ancha, pero no queda mal en rostros delgados.",
    contextAfter: "Si algo bueno tienen las gafas de metal es que están hechas de un material que aporta frescura al rostro gracias a su fina montura."
  },
  {
    id: "Y1",
    type: "AMARILLO/NARANJA",
    category: "Frase en cuerpo (baja perplejidad / fórmula explicativa)",
    text: "Lo que hace la gafa oscura es disminuir el porcentaje de luz visible que llega a nuestros ojos, por lo que resulta conveniente para realizar una determinada actividad dependiendo de las condiciones ambientales en las que nos encontremos.",
    contextBefore: "• El filtro no depende del color del cristal. De hecho, un cristal transparente puede tener filtro UV400 que nos proteja perfectamente de los efectos nocivos del sol.",
    contextAfter: "• Otro principio básico será la proporción y el equilibrio, en cuanto al tamaño se refiere. Éste debe ser adecuado al tamaño de la cara, para sacar el máximo partido a tu forma y rasgos."
  },
  {
    id: "Y2",
    type: "AMARILLO/NARANJA",
    category: "Frase en cuerpo (fórmula mecánica de ajuste)",
    text: "Actualmente las patillas llevan un refuerzo metálico interno que les permite ajustar, tanto su longitud como su curvatura, adaptándose así perfectamente, como un guante, a todas las caras.",
    contextBefore: "Así, lo primero que debes tener en cuenta cuando te pruebes unas Ray-Ban es si te resultan cómodas y se ajustan bien a tu rostro.",
    contextAfter: "Pruébalas y no te arrepentirás, es más ¡No podrás dejar de usarlas!"
  },
  {
    id: "R2",
    type: "ROJO",
    category: "Frase en cuerpo (fórmula didáctica de revista)",
    text: "Por ello, es importante que entiendas que no es necesario dejarse llevar por la moda. Lo importante es que cada uno esté a gusto con sus gafas con cristal espejado azul que refleja el sol directo. Al fin y al cabo, nos van a acompañar durante todo el día.",
    contextBefore: "Como todos los aspectos relacionados con la moda, a todo el mundo no le gusta lo que se lleva en este momento. En ocasiones, puede resultar demasiado llamativo para nuestra personalidad. En otras, simplemente, te apetece seguir con la misma línea que tenían tus Lentes Azul Espejado, aunque no estén a la última.",
    contextAfter: "Como consejo te diremos que no te adaptes a la moda, adapta la moda a ti."
  },
  {
    id: "R3",
    type: "ROJO",
    category: "Encabezado / Heading (Saltado por el orquestador)",
    text: "Celebración e Historia: ¿Qué aniversario de Ray-Ban coincide con el lanzamiento de esta colección?",
    contextBefore: "Para un rostro alargado donde las proporciones son muy lineales, las formas ascendentes compensan esta igualdad en las líneas del rostro.",
    contextAfter: "A los rostros ovalados también les sientan bien, aunque mejor con bordes redondeados que angulosos. Las gafas Aviator, con monturas muy finas, es otro estilo que lleva décadas entre nosotros, pero que últimamente se han puesto más de moda."
  },
  {
    id: "R4",
    type: "ROJO",
    category: "Elemento de Lista Sintético (Saltado por tag <ul>/<li>)",
    text: "• Barra ciliar (Sweat bar) de nácar auténtico: Una pieza de nácar color marfil se apoya contra la frente y retiene las gotas de sudor.",
    contextBefore: "Análisis del Modelo Shooter: ¿Qué características de diseño vintage incluye?",
    contextAfter: "• ¡No te quedes sin las tuyas! El modelo Vipsual Pinheads también combina la lente plana con el doble puente de titanio y acero."
  },
  {
    id: "R5",
    type: "ROJO",
    category: "Elemento de Lista Sintético (Saltado por tag <ul>/<li>)",
    text: "• Corte exacto en el vidrio: Una máquina talla un canal a los costados del cristal; esa ranura esconde el filamento plástico.",
    contextBefore: "Innovación de la estructura: ¿Cómo logran el efecto sin marco en el metal de las nuevas Aviator?",
    contextAfter: "• Las características principales de este tipo de Hilo invisible de alta resistencia: es que son sencillas, limpias, de colores simples, de montura fina de metal y con la lente en forma de lágrima."
  },
  {
    id: "R6",
    type: "ROJO",
    category: "Frase en cuerpo (fórmula médica / comercial de óptica)",
    text: "Por ello, es importante conocer también qué tipo de gafas nos podemos hallar cuando acudamos a la óptica, y sobre todo en estos tiempos en los que no conviene probarse todas las gafas de la tienda.",
    contextBefore: "Lentes tipo lágrima: ¿Qué colores y acabados tienen para elegir?",
    contextAfter: "Fueron popularizadas por los pilotos y, sobre todo, por Tom Cruise en su famosa película Top Gun . Las características principales de este tipo de gafas es que son sencillas, limpias, de colores simples, de montura fina de metal y con la lente en forma de lágrima."
  },
  {
    id: "R7",
    type: "ROJO",
    category: "Frase de recomendación capilar (Tier 4 genérico)",
    text: "Si tu pelo es marrón oscuro o marrón claro, te sentarán perfectamente los colores cálidos, como los rojos, amarillos o marrones, y también los tonos ocres.",
    contextBefore: "Su inconfundible tono Marrón Habana se mezcla con unas vetas que proporcionan una estética suave y atractiva, para nada tosca.",
    contextAfter: "Para cabellos de color rubio o castaño claro , los colores verdes, azules, plateados incluso el negro, dependiendo del tipo de montura, te pueden ir muy bien."
  }
];

detailedCases.forEach(c => {
  console.log(`\n======================================================`);
  console.log(`ID: ${c.id} | ${c.type} | ${c.category}`);
  console.log(`TEXTO:\n"${c.text}"`);
  
  const donorRes = findBestDonor(c.text);
  if (donorRes.donor && donorRes.matches >= 3) {
    console.log(`DONANTE ASIGNADO: ${donorRes.donor.id} (${donorRes.donor.source_domain}, Tier: ${donorRes.donor.tier})`);
    console.log(`DONANTE ORIGINAL:\n"${donorRes.donor.text}"`);
    
    // Compute differences
    const donorWords = donorRes.donor.text.split(/\s+/);
    const textWords = c.text.split(/\s+/);
    console.log(`Longitud Donante: ${donorWords.length} palabras | Longitud Generado: ${textWords.length} palabras`);
  } else {
    console.log(`DONANTE ASIGNADO: NINGUNO (Texto 100% original de Nous no procesado)`);
  }
});
