const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/b2fb5d8e-b7e3-4925-b4ea-8bdc27840886';
const baseFile = path.join(targetDir, 'latest_base.html');
const pass1File = path.join(targetDir, 'surg_pass_1.html');
const pass2File = path.join(targetDir, 'surg_pass_2.html');
const pass3File = path.join(targetDir, 'surg_pass_3.html');

const initialContent = fs.readFileSync(baseFile, 'utf8');

// Function to chunk identical to Nous sizeAwareChunkHtml
function sizeAwareChunkHtml(html, maxSize) {
  const boundaryRegex = /(?=<h[1-6]\b[^>]*>|<p\b[^>]*>|<ul\b[^>]*>|<ol\b[^>]*>|<li\b[^>]*>|<div\b[^>]*>|<table\b[^>]*>|<blockquote\b[^>]*>|\[\[ATOMIC_BLOCK_\d+\]\])/gi;
  const blocks = html.split(boundaryRegex).filter(block => block.trim().length > 0);
  const chunks = [];
  let currentChunkBlocks = [];
  for (const block of blocks) {
    currentChunkBlocks.push(block);
    if (currentChunkBlocks.length >= maxSize) {
      chunks.push(currentChunkBlocks.join('\n'));
      currentChunkBlocks = [];
    }
  }
  if (currentChunkBlocks.length > 0) chunks.push(currentChunkBlocks.join('\n'));
  return chunks;
}

// Helper to count words excluding HTML tags
function countWords(str) {
  return str.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
}

// Pass 1 replacements per chunk
const pass1Replacements = [
  // Chunk 1
  [
    { from: 'Tenés que mirar', to: 'Conviene apreciar' },
    { from: 'el diseño se ve actual', to: 'su diseño luce contemporáneo' }
  ],
  // Chunk 2
  [
    { from: 'buscás otra proporción del mismo estilo: mirá', to: 'buscas una variante del mismo estilo: contempla' },
    { from: 'buscá todas las alternativas', to: 'descubre todas las alternativas' }
  ],
  // Chunk 3
  [
    { from: 'igual priorizá sobre todo tu rostro:', to: 'conviene priorizar la propia fisonomía:' },
    { from: 'Consultá la', to: 'Consulta la' },
    { from: 'comprobá el peso,', to: 'comprueba el peso,' },
    { from: 'las podés llevar a la playa', to: 'puedes utilizarlas en la playa' }
  ],
  // Chunk 4
  [
    { from: 'lavá tus lentes con cuidado.', to: 'limpia tus gafas con esmero.' },
    { from: 'hacé lo siguiente:', to: 'sigue estas recomendaciones:' },
    { from: 'Utilizá agua tibia,', to: 'Utiliza agua tibia,' },
    { from: 'Empleá un paño', to: 'Emplea un paño' },
    { from: 'Evitá servilletas', to: 'Evita servilletas' }
  ],
  // Chunk 5
  [
    { from: 'Jamás dejes los lentes', to: 'Evita dejar las gafas' },
    { from: 'El empaque incluye', to: 'El conjunto incluye' }
  ]
];

// Pass 2 replacements per chunk (applied cumulatively on top of Pass 1)
const pass2Replacements = [
  // Chunk 1
  [
    { from: 'resisten todo el día.', to: 'garantizan máxima durabilidad.' },
    { from: 'opciones llamativas', to: 'propuestas atractivas' }
  ],
  // Chunk 2
  [
    { from: 'resaltás en la calle.', to: 'destacando en cualquier entorno.' },
    { from: 'te va a encantar.', to: 'garantiza una presencia impecable.' }
  ],
  // Chunk 3
  [
    { from: 'Mejor consultá las', to: 'Te recomendamos consultar las' },
    { from: 'aguantan la transpiración no se oxidan y soportan todo.', to: 'toleran la transpiración, previenen la oxidación y resisten el uso intensivo.' }
  ],
  // Chunk 4
  [
    { from: 'frotá con suavidad usando los dedos.', to: 'frota delicadamente con las yemas de los dedos.' },
    { from: 'Cubre muy bien el campo visual te protege de la luz lateral.', to: 'Abarca con amplitud el campo visual y protege ante la radiación lateral.' }
  ],
  // Chunk 5
  [
    { from: 'un estuche distinguido', to: 'un estuche exclusivo' },
    { from: 'ensamblando y puliendo a mano', to: 'mediante ensamblaje y pulido artesanal' }
  ]
];

// Pass 3 replacements per chunk (applied cumulatively on top of Pass 2)
const pass3Replacements = [
  // Chunk 1
  [
    { from: 'de siempre.', to: 'emblemático.' },
    { from: 'como escultura', to: 'de porte escultórico' }
  ],
  // Chunk 2
  [
    { from: 'te cambian la expresión,', to: 'transforman la expresión,' },
    { from: 'no incomoda soporta el uso cotidiano.', to: 'resulta confortable y resiste el uso cotidiano.' }
  ],
  // Chunk 3
  [
    { from: 'ahí compartimos trucos útiles para que calcen perfecto y no se deslicen.', to: 'donde detallamos pautas esenciales para lograr un calce exacto sin deslizamientos.' }
  ],
  // Chunk 4
  [
    { from: 'No te comprime las sienes y se articula con fluidez.', to: 'Evita la opresión en las sienes garantizando un movimiento fluido.' },
    { from: 'la montura se opaca en pocos meses.', to: 'la montura pierde su brillo característico con rapidez.' }
  ],
  // Chunk 5
  [
    { from: 'las altas temperaturas ablandan el acetato', to: 'el calor extremo reblandece el acetato' },
    { from: 'un proceso artesanal que abarca más de 30 pasos', to: 'una labor minuciosa que comprende más de 30 pasos' }
  ]
];

function applyPass(inputHtml, passRules, passNumber) {
  console.log(`\n=================== APPLYING PASS ${passNumber} ===================`);
  const chunks = sizeAwareChunkHtml(inputHtml, 8);
  const modifiedChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const rules = passRules[i] || [];
    const totalWords = countWords(chunk);
    let editedChunk = chunk;
    let wordsChanged = 0;

    for (const rule of rules) {
      if (!editedChunk.includes(rule.from)) {
        throw new Error(`Pass ${passNumber}, Chunk ${i + 1}: Could not find "${rule.from}"`);
      }
      const fromWordCount = rule.from.split(/\s+/).length;
      wordsChanged += fromWordCount;
      editedChunk = editedChunk.replace(rule.from, rule.to);
    }

    const editPercent = (wordsChanged / totalWords) * 100;
    console.log(`Chunk ${i + 1}: ${totalWords} words, ${wordsChanged} words edited -> ${editPercent.toFixed(2)}% (Limit < 5%: ${editPercent < 5 ? 'PASSED' : 'FAILED'})`);
    if (editPercent >= 5) {
      throw new Error(`Pass ${passNumber}, Chunk ${i + 1}: Edit percentage ${editPercent.toFixed(2)}% exceeds 5%!`);
    }
    modifiedChunks.push(editedChunk);
  }

  return modifiedChunks.join('\n');
}

// Execution
console.log('Validating and running 3 passes...');
const pass1Output = applyPass(initialContent, pass1Replacements, 1);
fs.writeFileSync(pass1File, pass1Output, 'utf8');
console.log(`Saved ${pass1File}`);

const readPass1 = fs.readFileSync(pass1File, 'utf8');
const pass2Output = applyPass(readPass1, pass2Replacements, 2);
fs.writeFileSync(pass2File, pass2Output, 'utf8');
console.log(`Saved ${pass2File}`);

const readPass2 = fs.readFileSync(pass2File, 'utf8');
const pass3Output = applyPass(readPass2, pass3Replacements, 3);
fs.writeFileSync(pass3File, pass3Output, 'utf8');
console.log(`Saved ${pass3File}`);

console.log('\nAll 3 passes completed and verified!');
