const fs = require('fs');
const path = require('path');
const ollamaClient = require('./ollama-client.cjs');
const bankGapTracker = require('./bank-gap-tracker.cjs');
const enterpriseRetriever = require('./enterprise-semantic-retriever.cjs');
const grammaticalSurgery = require('./grammatical-shingle-surgery.cjs');
const discourseTopology = require('./discourse-topology.cjs');
const factualGuard = require('./factual-integrity-guard.cjs');
const carrilBEditor = require('./carril-b-guided-editor.cjs');
const domainRegistry = require('./domain-registry.cjs');

const FUNCTIONAL_WORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'de', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'tras', 'ante',
  'bajo', 'hacia', 'hasta', 'desde', 'según', 'durante', 'mediante', 'contra',
  'a', 'y', 'e', 'o', 'u', 'ni', 'pero', 'aunque', 'sino', 'porque', 'pues',
  'que', 'quien', 'quienes', 'cual', 'cuales', 'donde', 'cuando', 'como',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel',
  'su', 'sus', 'tu', 'tus', 'mi', 'mis', 'nuestro', 'nuestra', 'nuestros', 'nuestras',
  'se', 'nos', 'te', 'le', 'les', 'me', 'es', 'son', 'ha', 'han', 'sido', 'siendo',
  'muy', 'más', 'menos', 'tan', 'ya', 'así', 'además', 'también', 'incluso', 'hoy'
]);

const DEFAULT_HEDGE_HINGES = ['Ahora bien,', 'Por su parte,', 'En la práctica,', 'Dicho de otro modo,', 'Y es que'];

// Semantic concept clusters for TF-IDF + concept-level donor retrieval in the optical/eyewear domain
const OPTICAL_CONCEPT_CLUSTERS = [
  ['boho', 'bohemio', 'bohemia', 'hippie', 'vintage', 'retro', 'setenta', 'setentero', '70', 'clásico', 'clásica', 'clásicos', 'clásicas', 'icónico', 'icónica', 'icónicas', 'atemporal', 'atemporales', 'décadas', 'históricos', 'historia', 'leyenda', 'legendarios'],
  ['redonda', 'redondas', 'redondo', 'redondos', 'redondeada', 'redondeadas', 'circular', 'circulares', 'pantos', 'curvas', 'suaves'],
  ['cuadrada', 'cuadradas', 'cuadrado', 'cuadrados', 'geométrica', 'geométricas', 'geométrico', 'geométricos', 'rectangular', 'rectangulares', 'anguloso', 'angulosas', 'rectas', 'ángulos'],
  ['aviador', 'gota', 'lágrima', 'piloto', 'doble', 'puente'],
  ['mariposa', 'cat', 'eye', 'gatunas', 'oversize', 'grandes', 'corazón'],
  ['acetato', 'pasta', 'celulosa', 'artesanal', 'artesanales', 'taller', 'pulido', 'mano', 'grueso', 'robusto', 'resistente', 'ligeras', 'ligero', 'laminación', 'veteado', 'veteados'],
  ['metal', 'metales', 'metálica', 'metálicas', 'metálico', 'dorado', 'dorada', 'dorados', 'bronce', 'oro', 'acero', 'titanio', 'fina', 'finas', 'delicada', 'delicado', 'pátina'],
  ['tierra', 'marrón', 'marrones', 'ámbar', 'ocre', 'carey', 'havana', 'habana', 'cálido', 'cálidos', 'cálida', 'neutro', 'neutros', 'sobrio', 'sobrios', 'naturales', 'discreto', 'discretos'],
  ['rostro', 'rostros', 'cara', 'caras', 'facciones', 'fisonomía', 'perfil', 'cómodo', 'cómoda', 'cómodas', 'comodidad', 'confort', 'ajuste', 'ajustan', 'asientan', 'aprieten', 'opriman', 'sueltas', 'flojas', 'puente', 'nariz', 'equilibrio', 'proporción', 'suavizar', 'frente', 'mandíbula', 'pómulos'],
  ['verano', 'rayos', 'solares', 'resplandor', 'protección', 'proteger', 'uv', 'uv400', 'filtro', 'cristales', 'lentes', 'luminosidad', 'radiación', 'pasear', 'ciudad', 'aire', 'libre', 'estival', 'playa'],
  ['outfit', 'outfits', 'look', 'looks', 'estilismo', 'estilismos', 'ropa', 'prendas', 'vestidos', 'lino', 'algodón', 'cuero', 'encajes', 'texturas', 'combinar', 'combina', 'combinan', 'elegante', 'elegancia', 'sofisticado', 'desenfadado', 'casual', 'sencillo', 'sencillos'],
  ['color', 'colores', 'tono', 'tonos', 'tonalidad', 'tonalidades', 'paleta', 'cromática', 'matices', 'estampados', 'brillos', 'contraste', 'bicolor'],
  ['pasarelas', 'tiendas', 'moda', 'tendencia', 'tendencias', 'temporada', 'colecciones', 'diseñadores', 'firmas', 'propuestas', 'modelos', 'opciones', 'alternativas', 'claves', 'elegir', 'escoger', 'seleccionar']
];

const WORD_TO_CONCEPT_CLUSTER = new Map();
OPTICAL_CONCEPT_CLUSTERS.forEach((grp, idx) => {
  for (const w of grp) {
    const norm = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    WORD_TO_CONCEPT_CLUSTER.set(norm, idx);
  }
});

const SEMANTIC_STOPWORDS_ES = new Set([
  ...FUNCTIONAL_WORDS_ES,
  'gafa', 'gafas', 'sol', 'montura', 'monturas', 'lente', 'lentes',
  'todo', 'toda', 'todos', 'todas', 'cada', 'otro', 'otra', 'otros', 'otras',
  'tipo', 'tipos', 'parte', 'forma', 'modo', 'manera', 'vez', 'veces', 'dia', 'dias',
  'ano', 'anos', 'año', 'años', 'solo', 'sólo', 'sino', 'bien', 'mas', 'muy',
  'hacer', 'hace', 'hacen', 'tener', 'tiene', 'tienen', 'puede', 'pueden', 'podemos',
  'suele', 'suelen', 'estan', 'están', 'esta', 'está', 'ser', 'sido', 'siendo', 'era', 'son'
]);

// Comprehensive list of general Spanish AI clichés to natural editorial phrasing
const AI_CLICHE_REPLACEMENTS = [
  { rx: /\bes crucial\b/gi, rep: 'es clave', reason: 'Cliché de IA.' },
  { rx: /\bpor lo tanto,?\s+/gi, rep: '', reason: 'Conector escolar de IA eliminado.' },
  { rx: /\bse han erigido en\b/gi, rep: 'funcionan hoy como', reason: 'Fórmula arcaica hiperfrecuente en ChatGPT; sustituida por lenguaje natural.' },
  { rx: /\bun papel fundamental\b/gi, rep: 'un papel clave', reason: 'Cliché robótico de ponderación; sustituido por expresión directa.' },
  { rx: /\bun papel crucial\b/gi, rep: 'un papel decisivo', reason: 'Término grandilocuente de IA; sustituido por tono sobrio.' },
  { rx: /\bun papel determinante\b/gi, rep: 'un papel primordial', reason: 'Redundancia estilística típica de LLMs.' },
  { rx: /\bcumple un papel fundamental\b/gi, rep: 'influye de forma directa', reason: 'Perífrasis de relleno; sustituida por verbo activo.' },
  { rx: /\bdesempeña un papel determinante\b/gi, rep: 'marca la pauta', reason: 'Expresión formularia de IA reemplazada por giro idiomático humano.' },
  { rx: /\bno cabe duda de que\b/gi, rep: 'está claro que', reason: 'Aserción artificial de LLM sustituida por tono conversacional directo.' },
  { rx: /\bes importante destacar que\b/gi, rep: 'conviene tener presente que', reason: 'Muletilla introductoria de IA eliminada.' },
  { rx: /\bes esencial tener en cuenta que\b/gi, rep: 'lo principal es recordar que', reason: 'Metadiscurso robótico sustituido por claridad oral.' },
  { rx: /\bes crucial recordar que\b/gi, rep: 'lo esencial es que', reason: 'Simplificación de estructura para evitar rigidez de IA.' },
  { rx: /\bes importante mencionar que\b/gi, rep: 'conviene recordar que', reason: 'Muletilla de relleno sintetizada.' },
  { rx: /\bun equilibrio perfecto entre ([^y]+) y\b/gi, rep: 'la combinación idónea de $1 con', reason: 'Fórmula sintagmática "equilibrio perfecto entre X e Y" reemplazada.' },
  { rx: /\buna opción magnífica para quienes buscan\b/gi, rep: 'una gran alternativa si buscas', reason: 'Estructura comercial de IA des-robotizada.' },
  { rx: /\buna opción idónea para quienes buscan\b/gi, rep: 'una alternativa excelente si buscas', reason: 'Patrón de venta genérico humanizado.' },
  { rx: /\buna elección predilecta para quienes\b/gi, rep: 'la opción favorita de quienes', reason: 'Frase pomposa de LLM sustituida por naturalidad.' },
  { rx: /\brepresentan la evolución natural\b/gi, rep: 'marcan la evolución', reason: 'Sustitución de cliché evolutivo.' },
  { rx: /\bpor antonomasia\b/gi, rep: 'por excelencia', reason: 'Cultismo forzado de IA sustituido por locución viva.' },
  { rx: /\bcabe mencionar que\b/gi, rep: 'además,', reason: 'Conector sintético de IA abreviado a transición ágil.' },
  { rx: /\bcabe destacar que\b/gi, rep: 'conviene apuntar que', reason: 'Apertura robótica suavizada.' },
  { rx: /\bsumergirse en\b/gi, rep: 'adentrarse en', reason: 'Metáfora acuática recurrente de ChatGPT mitigada.' },
  { rx: /\buna amplia gama de\b/gi, rep: 'multitud de', reason: 'Fórmula catálogo de IA sustituida por léxico coloquial.' },
  { rx: /\buna amplia variedad de\b/gi, rep: 'gran variedad de', reason: 'Reducción de sintagma robótico.' },
  { rx: /\ben el mundo (?:de (?:la|el|las|los) [a-záéíóúñ]+ )?actual\b/gi, rep: 'hoy en día', reason: 'Locución contextual inflada de LLM resumida.' },
  { rx: /\ben el panorama actual\b/gi, rep: 'actualmente', reason: 'Cliché periodístico de IA simplificado.' },
  { rx: /\ben perfecta armonía\b/gi, rep: 'sin desentonar', reason: 'Cliché estético de IA neutralizado.' },
  { rx: /\barmonía equilibrada\b/gi, rep: 'equilibrio natural', reason: 'Pleonasmo típico de generación sintética corregido.' },
  { rx: /\ba la vanguardia de\b/gi, rep: 'en primera línea de', reason: 'Hipérbole publicitaria de IA suavizada.' },
  { rx: /\bun sinfín de posibilidades\b/gi, rep: 'múltiples opciones', reason: 'Tópico inflado de ChatGPT acotado.' },
  { rx: /\bun sinfín de\b/gi, rep: 'gran cantidad de', reason: 'Expresión exagerada reemplazada.' },
  { rx: /\bha venido para quedarse\b/gi, rep: 'se ha consolidado', reason: 'Frase hecha desgastada de LLM actualizada.' },
  { rx: /\bhan venido para quedarse\b/gi, rep: 'se han consolidado', reason: 'Frase hecha desgastada de LLM actualizada.' },
  { rx: /\bno te dejarán indiferente\b/gi, rep: 'llaman la atención al instante', reason: 'Cierre publicitario de IA humanizado.' },
  { rx: /\bno te dejará indiferente\b/gi, rep: 'llama la atención al instante', reason: 'Cierre publicitario de IA humanizado.' },
  { rx: /\btodo un acierto\b/gi, rep: 'una elección acertada', reason: 'Giro facilón de IA reemplazado.' },
  { rx: /\bmarca la diferencia\b/gi, rep: 'destaca sobre el resto', reason: 'Cliché de marketing mitigado.' },
  { rx: /\bmarcan la diferencia\b/gi, rep: 'destacan sobre el resto', reason: 'Cliché de marketing mitigado.' },
  { rx: /\ben definitiva,?\s+/gi, rep: '', reason: 'Conector conclusivo de cierre de ChatGPT purgado.' },
  { rx: /\ben conclusión,?\s+/gi, rep: '', reason: 'Conector robótico escolar eliminado.' },
  { rx: /\bpara concluir,?\s+/gi, rep: '', reason: 'Fórmula de cierre de IA eliminada.' },
  { rx: /\ba modo de resumen,?\s+/gi, rep: '', reason: 'Resumen accesorio de LLM eliminado.' },
  { rx: /\bcomo hemos visto,?\s+/gi, rep: '', reason: 'Metarreferencia discursiva de IA podada.' },
  { rx: /\besperamos que este artículo te haya ayudado\b/gi, rep: '', reason: 'Cierre tutorial de ChatGPT eliminado.' }
];

// Anti-outro clichés to purge artificial endings
const OUTRO_CLICHES = [
  { rx: /así que ya sabes/i, reason: 'Cierre conversacional forzado de ChatGPT purgado.' },
  { rx: /no dudes en/i, reason: 'Llamada comercial típica de IA eliminada.' },
  { rx: /en definitiva,?\s+/i, reason: 'Conector de cierre sintético eliminado.' },
  { rx: /en conclusión,?\s+/i, reason: 'Encabezamiento conclusivo prohibido en redacción humana natural.' },
  { rx: /en resumen,?\s+/i, reason: 'Encabezamiento recapitulativo de ChatGPT podado.' },
  { rx: /a modo de conclusión/i, reason: 'Marcador conclusivo de LLM eliminado.' },
  { rx: /recuerda cuidar tus gafas/i, reason: 'Cierre moralizante de IA podado.' }
];

const CERTIFIED_BIOLOGICAL_GLITCHES = {
  fashion: [
    { text: "Sin rodeos ni artificios.", reason: "Frase ultra-corta de choque que eleva el burstiness." },
    { text: "Olvídate de las marcas sobre el rostro.", reason: "Glitch biológico de comodidad facial pre-2022 (rompe regularidad)." },
    { text: "Cuestión de proporciones y tacto.", reason: "Micro-pausa de redacción editorial artesana." },
    { text: "Eso sí: no todas sientan igual a primera vista.", reason: "Glitch de visagismo oral pre-2022 (inserta asimetría sintáctica)." },
    { text: "Pruébalas y notarás la diferencia de inmediato.", reason: "Micro-observación sensorial directa de probador óptico." },
    { text: "De ahí que se hayan convertido en un icono atemporal.", reason: "Cadencia de revista de moda vintage con ruptura de ritmo." },
    { text: "Es un detalle sutil que lo cambia todo.", reason: "Puntualización humana concisa sin clichés." },
    { text: "Un acierto seguro para el día a día.", reason: "Validación pragmática sin adjetivos grandilocuentes." }
  ],
  workshop: [
    { text: "Es un diseño de toda la vida.", reason: "Sentencia tradicional de maestro óptico (alta naturalidad biológica)." },
    { text: "Te durarán años sin perder el ajuste original.", reason: "Observación de durabilidad de taller óptico pre-2022." },
    { text: "Al tacto se nota la solidez del material.", reason: "Pauta sensorial de acetato pulido que ningún detector marca como IA." },
    { text: "La varilla ajusta con suavidad sin presionar la sien.", reason: "Ajuste anatómico de taller con vocabulario técnico natural." },
    { text: "El alma metálica interior garantiza que no se deformen.", reason: "Detalle constructivo de montura que eleva autoridad humana." },
    { text: "Un trabajo de pulido manual impecable.", reason: "Apreciación artesanal biológica verificada." }
  ]
};

// Ontología canónica universal de formas de montura (óptica y moda)
const FRAME_SHAPE_ONTOLOGY = {
  aviador: {
    key: 'aviador',
    canonical: 'aviador',
    slotPhrase: 'estilo aviador',
    nominal: 'gafas de aviador',
    detectRx: /\b(?:aviador|aviator|piloto|l[aá]grima)\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas|estilo|corte)\s+(?:de\s+|tipo\s+|estilo\s+)?(?:aviador|aviator|piloto|lágrima)\b/i
  },
  corazon: {
    key: 'corazon',
    canonical: 'forma de corazón',
    slotPhrase: 'forma de corazón',
    nominal: 'gafas con forma de corazón',
    detectRx: /\bcoraz[oó]n\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas|lentes)\s+(?:en\s+|con\s+|de\s+)?(?:forma\s+de\s+)?coraz[oó]n\b/i
  },
  redonda: {
    key: 'redonda',
    canonical: 'redonda',
    slotPhrase: 'silueta redonda',
    nominal: 'gafas redondas',
    detectRx: /\bredond[oa]s?\b|\bcircular(?:es)?\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+)?(?:silueta\s+)?(?:redond[oa]s?|circular(?:es)?)\b/i
  },
  cuadrada: {
    key: 'cuadrada',
    canonical: 'cuadrada',
    slotPhrase: 'silueta cuadrada',
    nominal: 'gafas cuadradas',
    detectRx: /\bcuadrad[oa]s?\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+)?(?:silueta\s+)?cuadrad[oa]s?\b/i
  },
  rectangular: {
    key: 'rectangular',
    canonical: 'rectangular',
    slotPhrase: 'silueta rectangular',
    nominal: 'gafas rectangulares',
    detectRx: /\brectangul(?:ar|ares|ados?|adas?)\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+)?(?:silueta\s+)?rectangul(?:ar|ares|ados?|adas?)\b/i
  },
  ovalada: {
    key: 'ovalada',
    canonical: 'ovalada',
    slotPhrase: 'silueta ovalada',
    nominal: 'gafas ovaladas',
    detectRx: /\boval(?:ad[oa]s?|es)?\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+)?(?:silueta\s+)?oval(?:ad[oa]s?|es)?\b/i
  },
  cat_eye: {
    key: 'cat_eye',
    canonical: 'cat eye',
    slotPhrase: 'corte cat eye',
    nominal: 'gafas cat eye',
    detectRx: /\b(?:cat\s*eye|ojo(?:s)?\s+de\s+gat[oa])\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+|tipo\s+|estilo\s+|corte\s+)?(?:cat\s*eye|ojo(?:s)?\s+de\s+gat[oa])\b/i
  },
  mariposa: {
    key: 'mariposa',
    canonical: 'mariposa',
    slotPhrase: 'silueta mariposa',
    nominal: 'gafas mariposa',
    detectRx: /\bmariposa\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+|tipo\s+|estilo\s+|silueta\s+)?mariposa\b/i
  },
  geometrica: {
    key: 'geometrica',
    canonical: 'geométrica',
    slotPhrase: 'silueta geométrica',
    nominal: 'gafas geométricas',
    detectRx: /\b(?:geom[eé]tric[oa]s?|hexagonal(?:es)?|octogonal(?:es)?)\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+)?(?:silueta\s+)?(?:geom[eé]tric[oa]s?|hexagonal(?:es)?|octogonal(?:es)?)\b/i
  },
  pantalla: {
    key: 'pantalla',
    canonical: 'pantalla',
    slotPhrase: 'diseño pantalla',
    nominal: 'gafas de pantalla',
    requireContext: true,
    detectRx: /\b(?:gafas|monturas?|silueta|forma|estilo|diseño)\s+(?:de\s+|tipo\s+|estilo\s+)?pantalla\b|\b(?:m[aá]scara|shield)\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+|tipo\s+|estilo\s+|con\s+forma\s+de\s+)?(?:pantalla|máscara|shield)\b/i
  },
  wayfarer: {
    key: 'wayfarer',
    canonical: 'wayfarer',
    slotPhrase: 'estilo wayfarer',
    nominal: 'gafas wayfarer',
    detectRx: /\bwayfarer\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+|tipo\s+|estilo\s+)?wayfarer\b/i
  },
  browline: {
    key: 'browline',
    canonical: 'clubmaster',
    slotPhrase: 'estilo clubmaster',
    nominal: 'gafas clubmaster',
    detectRx: /\b(?:clubmaster|browline)\b/i,
    contextRx: /\b(?:montura|silueta|diseño|frontal|líneas|gafas)\s+(?:de\s+|tipo\s+|estilo\s+)?(?:clubmaster|browline)\b/i
  }
};

class NeurosymbolicEngine {
  constructor() {
    this.isLoaded = false;
    this.unifiedBanks = { triads: [], duos: [], singles: [] };
    this.goldenMM = [];
    this.goldenOP = [];
    this.goldenVH = [];
    this.glitches = [];
    this.masterBricks = [];
  }

  loadBanks() {
    if (this.isLoaded) return;
    const baseDir = path.resolve(__dirname, '../../../banco_ontologico_semantico');

    const unifiedPath = path.join(baseDir, 'banco_maestro_retorico_unificado.json');
    if (fs.existsSync(unifiedPath)) {
      try {
        const u = JSON.parse(fs.readFileSync(unifiedPath, 'utf8'));
        this.unifiedBanks = {
          triads: u.triads || [],
          duos: u.duos || [],
          singles: u.singles || []
        };
      } catch (e) {
        console.error('Error cargando banco unificado:', e.message);
      }
    }

    const mmPath = path.join(baseDir, 'marcos/golden_material_mechanics.json');
    if (fs.existsSync(mmPath)) {
      try {
        this.goldenMM = JSON.parse(fs.readFileSync(mmPath, 'utf8'));
      } catch (e) {
        console.error('Error cargando golden MM:', e.message);
      }
    }

    const opPath = path.join(baseDir, 'marcos/golden_optical_protection.json');
    if (fs.existsSync(opPath)) {
      try {
        this.goldenOP = JSON.parse(fs.readFileSync(opPath, 'utf8'));
      } catch (e) {
        console.error('Error cargando golden OP:', e.message);
      }
    }

    const vhPath = path.join(baseDir, 'marcos/golden_visagism_heritage.json');
    if (fs.existsSync(vhPath)) {
      try {
        this.goldenVH = JSON.parse(fs.readFileSync(vhPath, 'utf8'));
      } catch (e) {
        console.error('Error cargando golden VH:', e.message);
      }
    }

    const glitchesPath = path.join(baseDir, 'glitches_humanos_certificados.json');
    if (fs.existsSync(glitchesPath)) {
      try {
        this.glitches = JSON.parse(fs.readFileSync(glitchesPath, 'utf8'));
      } catch (e) {
        console.error('Error cargando glitches:', e.message);
      }
    }

    const masterPath = path.join(baseDir, 'banco_maestro_ladrillos_retoricos.json');
    if (fs.existsSync(masterPath)) {
      try {
        this.masterBricks = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
      } catch (e) {
        console.error('Error cargando master bricks:', e.message);
      }
    }

    const techIndexPath = path.join(baseDir, 'indice_tecnologia_optica.json');
    this.techIndex = {};
    if (fs.existsSync(techIndexPath)) {
      try {
        this.techIndex = JSON.parse(fs.readFileSync(techIndexPath, 'utf8'));
      } catch (e) {
        console.error('Error cargando índice técnico óptico:', e.message);
      }
    }

    // Indexation dinamica en memoria por FrameNet Frame + Mapa O(1) por ID
    this.frameIndex = {};
    this.brickById = new Map();
    const seenCorpusStems = new Set();
    const brokenMarkdownRx = /\[\s*[^\]]+\]\s*\(/;
    const allCapsHeadingRx = /\b[A-ZÁÉÍÓÚÑ]{3,}\s+[A-ZÁÉÍÓÚÑ]{3,}/;
    const extractNormSents = (txt) => (txt || '')
      .replace(/\.([A-ZÁÉÍÓÚÑ])/g, '. $1')
      .split(/(?<=[.!?])\s+/)
      .map(s => s.toLowerCase()
        .replace(/^rostro\s+[a-záéíóúñ]+\s+(?=(?:el|la|los|las|a|en|para|si|es|un|una)\b)/i, '')
        .replace(/\bademas\b/g, 'además')
        .replace(/\[slot_[a-z_]+\]/gi, '')
        .replace(/[^a-záéíóúüñ0-9]+/g, ' ')
        .trim()
        .slice(0, 32))
      .filter(s => s.length >= 18);

    for (const b of this.masterBricks) {
      const stem = (b.raw_text || '').toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 45);
      if (stem) seenCorpusStems.add(stem);
      for (const s of extractNormSents(b.raw_text)) seenCorpusStems.add(s);
      if (b.exclude_from_humanization) continue;
      this.brickById.set(b.brick_id, b);
      if (!this.frameIndex[b.frame]) this.frameIndex[b.frame] = [];
      this.frameIndex[b.frame].push(b);
    }

    // Integrar bloques unificados certificados pre-2022 (singles + duos) en frameIndex
    const mapUnifiedFrame = (item) => {
      const fn = (item.rhetorical_function || item.primary_function || '').toUpperCase();
      const fam = (item.rhetorical_family || item.primary_family || '').toUpperCase();
      if (fn.includes('VISAGISMO') || fam.includes('VISAGISMO')) return 'VISAGISM_AESTHETICS';
      if (fn.includes('OPTICA') || fn.includes('VIDRIO') || fn.includes('SENSORIAL')) return 'OPTICAL_PROTECTION';
      if (fn.includes('MATERIAL') || fn.includes('ANATOMIA') || fn.includes('ERGONOMIA')) return 'MATERIAL_COMPOSITION';
      return 'GENERAL_STYLE';
    };

    this.unifiedCorpusBricks = [];
    const allUnifiedFor7Gram = [];
    const rawUnified = [
      ...(Array.isArray(this.unifiedBanks.triads) ? this.unifiedBanks.triads.map(x => ({ ...x, _isTriad: true })) : []),
      ...(Array.isArray(this.unifiedBanks.duos) ? this.unifiedBanks.duos.map(x => ({ ...x, _isDuo: true })) : []),
      ...(Array.isArray(this.unifiedBanks.singles) ? this.unifiedBanks.singles : [])
    ];
    const unifiedOpticalRx = /\b(?:gafas?|monturas?|lentes?|cristales|solares?|rostro|cara|facciones|armazón|varillas?|puente|acetato|pasta|polarizad|visagismo|óptica)\b/i;
    for (const u of rawUnified) {
      if (u.exclude_from_humanization || !u.text) continue;
      const uDomLower = (u.source_domain || u.source_origin || '').toLowerCase();
      if (/wikipedia\.org/i.test(uDomLower)) continue;
      const uId = u.id || `unified_${this.unifiedCorpusBricks.length}`;
      allUnifiedFor7Gram.push({ brick_id: uId, raw_text: u.text });
      if (!unifiedOpticalRx.test(u.text)) continue;

      const uSents = extractNormSents(u.text);
      const stem = u.text.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 45);
      // Allow multi-sentence triads/duos even if one isolated sentence also appeared in masterBricks, as long as the full block stem is unique
      if ((stem && seenCorpusStems.has(stem)) || (!u._isTriad && !u._isDuo && uSents.some(s => seenCorpusStems.has(s))) || brokenMarkdownRx.test(u.text) || allCapsHeadingRx.test(u.text)) {
        continue;
      }
      if (stem) seenCorpusStems.add(stem);
      if (!u._isTriad && !u._isDuo) {
        for (const s of uSents) seenCorpusStems.add(s);
      }

      const uFrame = mapUnifiedFrame(u);
      const normalizedBrick = {
        brick_id: uId,
        source_domain: u.source_domain || u.source_origin || 'corpus_unificado',
        source_origin: u.source_origin || null,
        tier: u.tier === 1 || u.tier === 2 ? 'TIER_1_WORKSHOP' : 'TIER_2_EDITORIAL',
        voice_category: u.tier <= 2 ? 'WORKSHOP_CLINICAL' : 'EDITORIAL_FASHION',
        frame: uFrame,
        rhetorical_relation: u.rhetorical_function || u.primary_function || 'ELABORATION',
        raw_text: u.text,
        syntactic_skeleton: u.text,
        word_count: u.total_words || u.text.split(/\s+/).filter(Boolean).length,
        slots: [],
        metrics: {
          has_human_glitch: Boolean(u.has_human_glitch),
          functional_token_ratio: this.computeFunctionalTokenRatio(u.text)
        },
        _isUnified: true,
        _isTriad: Boolean(u._isTriad),
        _isDuo: Boolean(u._isDuo)
      };
      this.unifiedCorpusBricks.push(normalizedBrick);
      this.brickById.set(uId, normalizedBrick);
      if (!this.frameIndex[uFrame]) this.frameIndex[uFrame] = [];
      this.frameIndex[uFrame].push(normalizedBrick);
    }

    // Indexar tambien marcos dorados certificados (material, optica, visagismo)
    const goldenSets = [
      ...(Array.isArray(this.goldenMM) ? this.goldenMM : []),
      ...(Array.isArray(this.goldenOP) ? this.goldenOP : []),
      ...(Array.isArray(this.goldenVH) ? this.goldenVH : [])
    ];
    this.goldenIndex = {};
    for (const g of goldenSets) {
      if (g.exclude_from_humanization) continue;
      const gId = g.brick_id || g.golden_id || g.donor_id;
      if (gId) this.brickById.set(gId, { ...g, brick_id: gId, _isGolden: true });
      const frameKey = g.frame || 'GENERAL_STYLE';
      if (!this.goldenIndex[frameKey]) this.goldenIndex[frameKey] = [];
      this.goldenIndex[frameKey].push(g);
    }

    // Indice global O(1) de 7-gramas del banco completo para auditoria antiplagio k<=6
    this.corpus7GramMap = new Map();
    const allCorpus = [...this.masterBricks, ...allUnifiedFor7Gram, ...goldenSets];
    for (const item of allCorpus) {
      const bId = item.brick_id || item.golden_id || item.donor_id || 'corpus';
      const words = this.tokenize(item.raw_text || item.text || '');
      if (words.length < 7) continue;
      for (let i = 0; i <= words.length - 7; i++) {
        const s7 = words.slice(i, i + 7).join(' ');
        if (!this.corpus7GramMap.has(s7)) {
          this.corpus7GramMap.set(s7, bId);
        }
      }
    }

    // Indice global TF-IDF (IDF) para recuperación semántica real sobre el banco óptico
    const dfMap = new Map();
    const idfDocs = [...this.masterBricks, ...this.unifiedCorpusBricks, ...goldenSets];
    const normSemTok = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const item of idfDocs) {
      const toks = new Set(
        this.tokenize(item.raw_text || item.text || '')
          .map(normSemTok)
          .filter(t => t.length >= 3 && !SEMANTIC_STOPWORDS_ES.has(t))
      );
      for (const t of toks) {
        dfMap.set(t, (dfMap.get(t) || 0) + 1);
      }
    }
    this.corpusIdf = new Map();
    const totalIdfDocs = Math.max(1, idfDocs.length);
    for (const [tok, df] of dfMap.entries()) {
      this.corpusIdf.set(tok, Math.log((totalIdfDocs + 1) / (df + 1)) + 1);
    }

    const allHybridDocs = [
      ...this.masterBricks.filter(b => !b.exclude_from_humanization),
      ...this.unifiedCorpusBricks,
      ...goldenSets.filter(g => !g.exclude_from_humanization)
    ];
    enterpriseRetriever.buildIndex(allHybridDocs, (txt, slots) => this.expandSlotsForSemanticEval(txt, slots));

    this.isLoaded = true;
    console.log(`[NeurosymbolicEngine] Bancos Biológicos Pre-2022 cargados: ${this.masterBricks.length} ladrillos maestros + ${this.unifiedCorpusBricks.length} bloques unificados + ${goldenSets.length} marcos dorados (${this.corpus7GramMap.size} 7-gramas + ${this.corpusIdf.size} términos IDF + ${enterpriseRetriever.bm25Idf.size} términos BM25 + Proyección léxica 128-D indexados).`);
  }

  computeUsableCleanBlocksCount() {
    let count = 0;
    const allShapesAtoms = { shapes: ['redondas', 'cuadradas', 'aviador', 'ojo de gato', 'mariposa', 'geométrica', 'ovalada'] };
    const candidates = [...(this.masterBricks || []), ...(this.unifiedCorpusBricks || [])];
    for (const b of candidates) {
      if (b.exclude_from_humanization || this.isClinicalOrEncyclopedicDomain(b, '')) continue;
      let cw = this.extractCleanDonorWindow(b, 60, b.frame || 'GENERAL_STYLE', null, { paragraphMode: true, minWords: 30, maxWords: 110 });
      if (!cw || cw.split(/(?<=[.!?])\s+/).length < 2) {
        cw = this.extractCleanDonorWindow(b, 60, b.frame || 'GENERAL_STYLE', allShapesAtoms, { paragraphMode: true, minWords: 30, maxWords: 110 });
      }
      if (cw && cw.split(/(?<=[.!?])\s+/).length >= 2) count++;
    }
    this._usableCleanBlocksCount = count;
    return count;
  }

  getBankStats() {
    const goldenCount = (this.goldenMM?.length || 0) + (this.goldenOP?.length || 0) + (this.goldenVH?.length || 0);
    if (this.isLoaded && this._usableCleanBlocksCount === undefined) {
      this.computeUsableCleanBlocksCount();
    }
    return {
      masterBricks: this.masterBricks?.length || 0,
      unifiedBricks: this.unifiedCorpusBricks?.length || 0,
      goldenCount,
      idfTerms: this.corpusIdf?.size || 0,
      bm25Terms: enterpriseRetriever.bm25Idf?.size || 0,
      vectorDim: 128,
      topicTagsIndexed: enterpriseRetriever.byTopicTag?.size || 0,
      intentBucketsIndexed: enterpriseRetriever.byIntent?.size || 0,
      usableCleanBlocks: this._usableCleanBlocksCount ?? null
    };
  }

  reloadBanks() {
    this.isLoaded = false;
    this._usableCleanBlocksCount = undefined;
    this.loadBanks();
    return this.getBankStats();
  }

  computeSemanticSimilarity(queryText, candidateText) {
    const norm = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleanQuery = (queryText || '').replace(/\[SLOT_[A-Z_]+\]/g, ' ');
    const cleanCand = (candidateText || '').replace(/\[SLOT_[A-Z_]+\]/g, ' ');
    const qToks = [...new Set(
      this.tokenize(cleanQuery)
        .map(norm)
        .filter(t => t.length >= 3 && !SEMANTIC_STOPWORDS_ES.has(t))
    )];
    const cToks = new Set(
      this.tokenize(cleanCand)
        .map(norm)
        .filter(t => t.length >= 3 && !SEMANTIC_STOPWORDS_ES.has(t))
    );
    if (!qToks.length || !cToks.size) {
      return { lexSim: 0, clusterSim: 0, totalSim: 0, matchedTerms: [], matchedClusters: 0 };
    }

    let lexSim = 0;
    const matchedTerms = [];
    const qClusters = new Set();
    const cClusters = new Set();

    for (const ct of cToks) {
      if (WORD_TO_CONCEPT_CLUSTER.has(ct)) cClusters.add(WORD_TO_CONCEPT_CLUSTER.get(ct));
    }
    for (const qt of qToks) {
      if (WORD_TO_CONCEPT_CLUSTER.has(qt)) qClusters.add(WORD_TO_CONCEPT_CLUSTER.get(qt));
      if (cToks.has(qt)) {
        const w = (this.corpusIdf && this.corpusIdf.get(qt)) || 2.5;
        lexSim += w;
        matchedTerms.push(qt);
      } else if (qt.length >= 5) {
        // Stem-level semantic hit (e.g. redonda <-> redondeadas, artesania <-> artesanal, dorada <-> dorado)
        const root = qt.slice(0, Math.max(4, qt.length - 2));
        for (const ct of cToks) {
          if (ct.length >= 5 && ct.startsWith(root)) {
            const w = ((this.corpusIdf && this.corpusIdf.get(qt)) || 2.5) * 0.75;
            lexSim += w;
            matchedTerms.push(`${qt}~${ct}`);
            break;
          }
        }
      }
    }

    let matchedClusters = 0;
    for (const qc of qClusters) {
      if (cClusters.has(qc)) matchedClusters++;
    }
    const clusterSim = matchedClusters * 2.4;
    return {
      lexSim: Number(lexSim.toFixed(2)),
      clusterSim: Number(clusterSim.toFixed(2)),
      totalSim: Number((lexSim + clusterSim).toFixed(2)),
      matchedTerms,
      matchedClusters
    };
  }

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()«»""''“”‘’¡?¿–—…´]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  getShapeKeysFromText(text) {
    const keys = new Set();
    const str = (text || '').toLowerCase();
    for (const [k, def] of Object.entries(FRAME_SHAPE_ONTOLOGY)) {
      if (def.detectRx.test(str)) keys.add(k);
    }
    return keys;
  }

  isShapeCompatible(donorText, targetShapes) {
    const donorKeys = this.getShapeKeysFromText(donorText);
    if (donorKeys.size === 0) return true; // shape-neutral
    if (!targetShapes || !targetShapes.length) return false;

    const targetKeys = new Set();
    for (const ts of targetShapes) {
      const tsNorm = (ts || '').toLowerCase();
      for (const [k, def] of Object.entries(FRAME_SHAPE_ONTOLOGY)) {
        if (def.detectRx.test(tsNorm) || def.canonical.toLowerCase() === tsNorm || k === tsNorm) {
          targetKeys.add(k);
        }
      }
    }

    for (const dk of donorKeys) {
      if (!targetKeys.has(dk)) return false;
    }
    return true;
  }

  isHeading(text, paraIndex = -1) {
    const clean = text.trim();
    if (!clean) return false;
    const words = clean.split(/\s+/).filter(Boolean);
    
    // Markdown headings
    if (/^#{1,6}\s+/.test(clean)) return true;
    
    // Very first block of document: If <= 22 words and not a multiline paragraph, it is the title!
    if (paraIndex === 0 && words.length <= 22 && !clean.includes('\n')) return true;

    // Colon subtitle headings (e.g. "Gafas de Sol Boho Chic: El Outfit Hippie Moderno"), NOT intro paragraphs ending with ':'
    if (!clean.endsWith(':') && clean.includes(':') && words.length <= 18) return true;

    // Question headings
    if (/^¿.*\?$/.test(clean) && words.length <= 18) return true;

    // Numbered sections like "2 Modelos de tendencia..."
    if (/^\d+\s+[A-Za-z]/.test(clean) && words.length <= 16) return true;

    // Brand and model titles (e.g. "Chloé CH0105S 006 55", "Gucci GG1084S 003 54", "Persol PO0202S 95/31 57")
    if (/^(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley|Carrera|Moscot|Oliver Peoples)\b/i.test(clean) && words.length <= 10) {
      return true;
    }

    // Short/medium phrase without sentence-ending punctuation, trailing colon, or internal clause commas (supports 13-18w Spanish H2 headings)
    if (!clean.endsWith(':') && words.length <= 18 && !/[.!?]$/.test(clean) && !clean.includes(',')) {
      return true;
    }

    // Explicit editorial heading openers without trailing sentence period (up to 20w)
    if (!clean.endsWith(':') && words.length <= 20 && !/[.!?]$/.test(clean) && /^(?:c[oó]mo|gu[íi]a|por\s+qu[eé]|dudas|preguntas|qu[eé]|cu[aá]les|hablemos|as[ií]\s+es|otro\s+estilo|\d+\s+)/i.test(clean)) {
      return true;
    }

    return false;
  }

  humanizeHeading(text) {
    let clean = text.trim();
    let prefix = '';
    const mdMatch = clean.match(/^(#{1,6}\s+)/);
    if (mdMatch) {
      prefix = mdMatch[1];
      clean = clean.slice(prefix.length).trim();
    }

    // Preserve brand & model titles intact
    if (/^(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley)\b/i.test(clean)) {
      return prefix + clean;
    }

    // Humanize colon patterns by converting GPT "Topic: Subtopic" into organic journalistic phrasing
    if (clean.includes(':')) {
      const parts = clean.split(':').map(p => p.trim());
      if (parts.length === 2 && parts[0] && parts[1] && !/[0-9]/.test(parts[0])) {
        const part1 = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        const part2 = parts[1].charAt(0).toLowerCase() + parts[1].slice(1);
        const aiAppositionRx = /^(?:el|un|la|una)\s+(?:icono|símbolo|clásico|referente|accesorio|complemento|secreto|guía)\s*(?:atemporal|indiscutible|definitivo|imprescindible|esencial|clásico|definitiva)?\s+(?:de\s+|para\s+|en\s+)/i;
        if (aiAppositionRx.test(part2)) {
          const remainder = part2.replace(aiAppositionRx, '').trim();
          clean = remainder ? `${part1} en ${remainder}` : part1;
        } else if (/^(?:cómo|qué|cuándo|dónde|por qué|claves|consejos|elegir|escoger|combinar|usar)\b/i.test(part2)) {
          clean = `${part1} y ${part2}`;
        } else if (/^(?:el|la|un|una)\b/i.test(part2)) {
          clean = `${part1} para ${part2}`;
        } else {
          clean = `${part1} en ${part2}`;
        }
      }
    }

    // Spell out leading digits: "2 Modelos" -> "Dos modelos"
    clean = clean.replace(/^(\d+)\s+([A-Za-z])/g, (m, num, next) => {
      const nums = { '1': 'Un', '2': 'Dos', '3': 'Tres', '4': 'Cuatro', '5': 'Cinco' };
      return (nums[num] || num) + ' ' + next.toLowerCase();
    });

    return prefix + clean;
  }

  detectOutroCliché(sentence) {
    for (const item of OUTRO_CLICHES) {
      if (item.rx.test(sentence)) {
        return item;
      }
    }
    return null;
  }

  neutralizeAiCliches(text, auditCollector = null) {
    let cleaned = text;
    for (const item of AI_CLICHE_REPLACEMENTS) {
      if (item.rx.test(cleaned)) {
        const matches = cleaned.match(item.rx);
        if (auditCollector) {
          auditCollector.push({
            stage: 'CLICHE_NEUTRALIZATION',
            original: matches[0],
            replacement: item.rep,
            reason: item.reason
          });
        }
        cleaned = cleaned.replace(item.rx, item.rep);
      }
    }
    cleaned = cleaned
      .replace(/\s{2,}/g, ' ')
      .replace(/([.!?]\s+)([a-záéíóúñ])/g, (_, punct, ch) => punct + ch.toUpperCase())
      .trim();
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
  }

  breakLongSentence(sentence, auditCollector = null) {
    const clean = sentence.trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length < 22) return [clean];

    // Splitting patterns to enhance human burstiness rhythm
    const patterns = [
      { target: ', ya que ', prefix: 'Y es que ', reason: 'División de cláusula subordinada causal para romper monotonía de periodo largo.' },
      { target: ', por lo que ', prefix: 'De ahí que ', reason: 'División de cláusula consecutiva en dos compases humanos.' },
      { target: '; ', prefix: '', reason: 'Conversión de punto y coma en punto y seguido para aumentar la perplejidad y burstiness.' },
      { target: ', pero ', prefix: 'Pero ', reason: 'División adversativa: introduce inicio en conjunción disyuntiva típico del habla humana.' },
      { target: ', siendo ', prefix: 'Hablamos de ', reason: 'Sustitución de gerundio de posterioridad por oración principal asertiva.' },
      { target: ', dado que ', prefix: 'Y dado que ', reason: 'Ruptura de subordinada larga en periodo independiente.' },
      { target: ', lo que ', prefix: 'Esto ', reason: 'Eliminación de pronombre relativo acumulativo por demostrativo directo.' },
      { target: ', donde ', prefix: 'En este sentido, ', reason: 'División de cláusula locativa/relativa.' },
      { target: ', así como ', prefix: 'También ', reason: 'Fragmentación de enumeración larga para crear asimetría métrica.' },
      { target: ', garantizando que ', prefix: 'Esto garantiza que ', reason: 'Puntuación fuerte antes de verbo de garantía.' }
    ];

    for (const p of patterns) {
      if (clean.includes(p.target)) {
        const idx = clean.indexOf(p.target);
        let part1 = clean.slice(0, idx).trim();
        if (!/[.!?]$/.test(part1)) part1 += '.';
        
        let remainder = clean.slice(idx + p.target.length).trim();
        if (p.prefix) {
          remainder = p.prefix + remainder;
        }
        
        remainder = remainder.charAt(0).toUpperCase() + remainder.slice(1);
        part1 = part1.replace(/\s*\.\s*\./g, '.');
        remainder = remainder.replace(/\s*\.\s*\./g, '.');

        if (auditCollector) {
          auditCollector.push({
            stage: 'BURSTINESS_SPLIT',
            originalSentence: clean,
            splitTarget: p.target,
            part1,
            part2: remainder,
            originalWords: words.length,
            reason: p.reason
          });
        }

        return [part1, remainder];
      }
    }

    return [clean];
  }

  // =========================================================================
  // FASE 1 DEL BLUEPAPER: ATOMIZACIÓN FÁCTICA PURA (Semántica de Davidson)
  // =========================================================================
  extractDavidsonianAtoms(text) {
    const atoms = {
      brand_models: [],
      proper_entities: [],
      shapes: [],
      styles: [],
      materials: [],
      outfits: [],
      garment_pairings: [],
      temporal_occasions: [],
      locative_scenes: [],
      coatings: [],
      key_concepts: [],
      relations: []
    };

    // Brands and models (with SKU/caliber codes preserved verbatim, without leaking full headings)
    const brandRx = /\b(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley|Carrera|Moscot|Oliver Peoples)(?:\s+(?:Aviator|Classic|Wayfarer|Clubmaster|Original|Steve\s+McQueen|714|[A-Z]{1,4}\d{2,5}[A-Z]?(?:\/\d{1,3})?|\d{2,4}))+/gi;
    let bm;
    while ((bm = brandRx.exec(text)) !== null) {
      atoms.brand_models.push(bm[0].trim());
    }
    for (const sSku of factualGuard.extractStrictBrandSkus(text)) {
      if (!atoms.brand_models.some(b => b.toLowerCase() === sSku.toLowerCase())) {
        atoms.brand_models.push(sSku);
      }
    }
    atoms.brand_models = [...new Set(atoms.brand_models)];

    // Proper / historical / cultural entities (e.g., Brigitte Bardot, Jane Birkin, hippies)
    const stopEntityStarts = /^(?:Hoy|Por|Sin|Ahora|Estos|Estas|Este|Esta|Dos|Las|Los|Una|Uno|Para|Con|En|La|El|Un|De|Del|Al|Su|Sus|No|Si|Y|O|Pero|Aunque|Mientras|Cuando|Boho|Chic|Original)$/i;
    const properRx = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+(?:de\s+|la\s+|el\s+|y\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}){1,2})\b/g;
    let pm;
    while ((pm = properRx.exec(text)) !== null) {
      const candidate = pm[1].trim();
      const firstWord = candidate.split(/\s+/)[0];
      if (stopEntityStarts.test(firstWord)) continue;
      if (/\b(?:Ban|Aviator|Classic|Steve\s+McQueen|Wayfarer|Clubmaster)\b/i.test(candidate)) continue;
      if (text.slice(Math.max(0, pm.index - 5), pm.index).includes('-')) continue;
      if (atoms.brand_models.some(b => b.toLowerCase().includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(b.toLowerCase()))) continue;
      atoms.proper_entities.push(candidate);
    }
    if (/\bhippies?\b/i.test(text)) {
      const hMatch = text.match(/\bhippies?\b/i);
      if (hMatch) atoms.proper_entities.push(hMatch[0].toLowerCase());
    }
    atoms.proper_entities = [...new Set(atoms.proper_entities)];

    // Shapes: Extract canonical frame silhouettes using Universal Shape Ontology
    const cleanLower = text.toLowerCase();
    for (const [key, def] of Object.entries(FRAME_SHAPE_ONTOLOGY)) {
      if (def.contextRx.test(cleanLower) || (!def.requireContext && def.detectRx.test(cleanLower))) {
        atoms.shapes.push(def.canonical);
      }
    }
    atoms.shapes = [...new Set(atoms.shapes)];

    // Styles
    const styleRx = /\b(boho\s*chic|bohemio|bohemia|vintage|retro|hippie|moderno|artesanal|setentero|años\s*70|clásico|atemporal|elegante|urbano|sofisticado|minimalista|campestre)\b/gi;
    const stMatches = text.match(styleRx);
    if (stMatches) atoms.styles.push(...[...new Set(stMatches.map(s => s.toLowerCase()))]);

    // Materials (Frame materials exclusively - excluding textile fabrics, process tools & internal wire cores)
    const matSearchText = text
      .replace(/\btambores?\s+de\s+madera\b/gi, ' ')
      .replace(/\b(?:alma|n[uú]cleo)\s+met[aá]lic[oa]s?\b/gi, ' ')
      .replace(/\bacetato\s+de\s+celulosa\b/gi, 'acetato');
    const matRx = /\b(acetato\s*pulido|acetato|pasta|carey|metales|metal|met[aá]lic[oa]s?|titanio|oro|bronce|acero|celulosa|madera)\b/gi;
    const mMatches = matSearchText.match(matRx);
    if (mMatches) {
      const seenFamilies = new Set();
      const normMats = [];
      for (const m of mMatches) {
        const norm = /^(?:metales|met[aá]lic)/i.test(m) ? 'metal' : m.toLowerCase();
        const fam = /^(?:acetato|pasta|celulosa)/i.test(norm) ? 'ACETATE_CELLULOSE' : norm;
        if (fam === 'ACETATE_CELLULOSE' && seenFamilies.has('ACETATE_CELLULOSE')) continue;
        seenFamilies.add(fam);
        if (!normMats.includes(norm)) normMats.push(norm);
      }
      atoms.materials.push(...normMats);
    }

    // Outfits & Occasions sub-typed into Garment Pairings, Temporal Occasions, and Locative Scenes
    const garmentRx = /\b(vestidos\s*sueltos|prendas\s*de\s*lino|prendas\s*de\s*cuero|encajes\s*finos|lino|algodón|cuero|encajes|seda|sombrero)\b/gi;
    const gMatches = text.match(garmentRx);
    if (gMatches) atoms.garment_pairings.push(...[...new Set(gMatches.map(g => g.toLowerCase()))]);

    const temporalRx = /\b(verano|diario|todo\s+el\s+año|entretiempo|primavera|otoño|invierno|años\s*70)\b/gi;
    const tMatches = text.match(temporalRx);
    if (tMatches) atoms.temporal_occasions.push(...[...new Set(tMatches.map(t => t.toLowerCase()))]);

    const locativeRx = /\b(ciudad|paseo|playa|oficina|despacho|fiestas|escaparates|pasarelas|tiendas\s*de\s*moda|boda|evento|conducir|al\s+volante|coche|ordenador|monitores?|monta[ñn]a|nieve|deporte)\b/gi;
    const lMatches = text.match(locativeRx);
    if (lMatches) atoms.locative_scenes.push(...[...new Set(lMatches.map(l => l.toLowerCase()))]);

    const outRx = /\b(vestidos\s*sueltos|prendas\s*de\s*lino|prendas\s*de\s*cuero|encajes\s*finos|lino|cuero|encajes|algodón|seda|sombrero|playa|ciudad|paseo|verano|boda|evento|diario|oficina|despacho|fiestas|escaparates|pasarelas|tiendas\s*de\s*moda|conducir|al\s+volante|coche|ordenador|monitores?|monta[ñn]a|nieve|deporte)\b/gi;
    const oMatches = text.match(outRx);
    if (oMatches) atoms.outfits.push(...[...new Set(oMatches.map(o => o.toLowerCase()))]);

    // Optical coatings & lens tech
    const coatRx = /\b(uv\s*400|filtro\s*uv|polarizad[oa]s?|antirreflejantes?|espejad[oa]s?|cristal(?:es)?\s*mineral(?:es)?|fotocrom[aá]tic[oa]s?|progresiv[oa]s?|ocupacional(?:es)?|monofocal(?:es)?|policarbonato|luz\s+azul|degradad[oa]s?)\b/gi;
    const cMatches = text.match(coatRx);
    if (cMatches) atoms.coatings.push(...[...new Set(cMatches.map(c => c.toLowerCase()))]);

    // Domain key concepts (sintagmas nominales compuestos extraídos dinámicamente por morfosintaxis general)
    const dynamicNPs = factualGuard.extractSpanishCompoundNPs(text, 12);
    for (const np of dynamicNPs) {
      const norm = np.label.replace(/\s+/g, ' ').trim().toLowerCase();
      if (norm.length >= 5) atoms.key_concepts.push(norm);
    }
    atoms.key_concepts = [...new Set(atoms.key_concepts)];

    // Grafo de Fichas Relacionales/Causales (relaciones canónicas dirigidas por morfosintaxis general)
    const subj = atoms.brand_models[0] || (atoms.shapes[0] ? `montura ${atoms.shapes[0]}` : (atoms.proper_entities[0] || atoms.key_concepts[0] || (/\b(?:gafas?|lentes?|monturas?)\b/i.test(text) ? 'gafas de sol' : 'el tema')));
    for (const sh of atoms.shapes) {
      atoms.relations.push({ subject: subj, type: 'FORMA_MONTURA', relation: 'HAS_ATTRIBUTE', target: sh });
    }
    for (const mat of atoms.materials) {
      atoms.relations.push({ subject: subj, type: 'MATERIAL', relation: 'HAS_ATTRIBUTE', target: mat });
    }
    for (const st of atoms.styles) {
      atoms.relations.push({ subject: subj, type: 'ESTILO', relation: 'HAS_ATTRIBUTE', target: st });
    }
    for (const gp of atoms.garment_pairings) {
      atoms.relations.push({ subject: subj, type: 'ESTILISMO_PRENDA', relation: 'PAIRS_WITH_GARMENT', target: gp });
    }
    for (const ctxVal of [...new Set([...atoms.temporal_occasions, ...atoms.locative_scenes])]) {
      atoms.relations.push({ subject: subj, type: 'OCASION_CONTEXTO', relation: 'USED_IN_CONTEXT', target: ctxVal });
    }
    const benefitRx = /\b(?:gracias\s+a|logra(?:n)?\s+que|permite(?:n)?\s+que|aporta(?:n)?|ayuda(?:n)?\s+a|consigue(?:n)?|evita(?:n)?)\s+([^.;!?]{8,65})/gi;
    let bMatch;
    while ((bMatch = benefitRx.exec(text)) !== null) {
      const val = bMatch[1].toLowerCase().trim();
      if (val) atoms.relations.push({ subject: subj, type: 'BENEFICIO_CAUSAL', relation: 'CAUSES_BENEFIT', target: val });
    }
    const visagismRx = /\b(?:favorece|estiliza|suaviza|armoniza|equilibra|realza|enmarca|asienta)\w*\s+([^.;!?]{4,45})/gi;
    let vMatch;
    while ((vMatch = visagismRx.exec(text)) !== null) {
      const val = vMatch[0].toLowerCase().trim();
      if (val) atoms.relations.push({ subject: subj, type: 'VISAGISMO', relation: 'BALANCES_FACE_SHAPE', target: val });
    }
    const avoidRx = /\b(?:evitar|evita|descartar|prescindir\s+de|huir\s+de|conviene\s+evitar|nunca\s+(?:uses?|utilices?|debes?)|no\s+(?:conviene|recomend\w*|oprim\w*|presionen))\s+([^.;!?]{4,55})/gi;
    let aMatch;
    while ((aMatch = avoidRx.exec(text)) !== null) {
      const val = aMatch[0].toLowerCase().trim();
      if (val) atoms.relations.push({ subject: subj, type: 'RESTRICCION', relation: 'AVOID_FEATURE', target: val });
    }

    atoms.signedPolarity = factualGuard.extractSignedPolarityAtoms(text);
    atoms.discriminativeAnchors = factualGuard.extractDiscriminativeAnchors(text, atoms);

    return atoms;
  }

  // =========================================================================
  // FASE 2 DEL BLUEPAPER: BÚSQUEDA SEMÁNTICA Y RELLENO DINÁMICO DE RANURAS
  // =========================================================================
  cleanScrapingArtifacts(text) {
    return (text || '')
      .replace(/^(?:Este|En)\s+20\d\d,?\s*/i, '')
      .replace(/^Rostro\s+[a-záéíóúñ]+\s*(?=[A-ZÁÉÍÓÚÑ])/, '')
      .replace(/\bA\s+los\s+los\b/gi, 'A los')
      .replace(/\ba\s+los\s+los\b/gi, 'a los')
      .replace(/^Para\s+caras\s+(?:cuadradas|redondas|alargadas)\s+([A-Z])/i, 'Para este tipo de fisonomías, $1')
      .replace(/\b(?:Alain\s+)?Afflelou\b/gi, 'la firma')
      .replace(/\bGeneral\s+Óptica\b/gi, 'los especialistas')
      .replace(/\bCottet\b/gi, 'el taller')
      .replace(/\bOptica\s+Universitaria\b/gi, 'la óptica')
      .replace(/\bcon una tecnología exclusiva de la firma\b/gi, 'con una tecnología de taller')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  adjustAgreement(word, precedingText) {
    if (!word) return word;
    const match = precedingText.match(/\b(frentes|diseños|modelos|contornos|óvalos|rasgos|los|unos|estos|esos)\s*$/i);
    if (match) {
      if (word === 'redonda') return 'redondos';
      if (word === 'cuadrada') return 'cuadrados';
      if (word === 'geométrica') return 'geométricos';
      if (word === 'ovalada') return 'ovalados';
    }
    const matchFemPlural = precedingText.match(/\b(monturas|gafas|caras|fisonomías|siluetas|piezas|formas|líneas|facciones|son|están|resultan|parecen|lucen|las|unas|estas|esas)\s*$/i);
    if (matchFemPlural) {
      if (word === 'redonda') return 'redondas';
      if (word === 'cuadrada') return 'cuadradas';
      if (word === 'geométrica') return 'geométricas';
      if (word === 'ovalada') return 'ovaladas';
    }
    const matchMascSing = precedingText.match(/\b(diseño|modelo|frontal|porte|estilo|formato|perfil)\s*$/i);
    if (matchMascSing) {
      if (word === 'redonda') return 'redondo';
      if (word === 'cuadrada') return 'cuadrado';
      if (word === 'geométrica') return 'geométrico';
      if (word === 'ovalada') return 'ovalado';
    }
    return word;
  }

  isCompetingBrand(candidateLower, sourceTextLower, sourceTokens) {
    const competingEntities = [
      'alber elbaz', 'lanvin', 'vipsual', 'afflelou', 'alain afflelou', 'cottet', 'general óptica', 'general optica',
      'óptica universitaria', 'optica universitaria', 'multiópticas', 'multiopticas', 'federópticos', 'federopticos',
      'opticabassol', 'bassol', 'opticagasset', 'gasset', 'opticasflorida', 'soloptical', 'masvision', 'misterspex', 'mister spex',
      'visionlab', 'carolina herrera', 'escada', 'fendi', 'versace', 'chanel', 'loewe', 'cartier', 'armani', 'saint laurent',
      'celine', 'balenciaga', 'dior', 'ray-ban', 'ray-bam', 'persol', 'carrera', 'tom cruise', 'steve mcqueen',
      'paul newman', 'oakley', 'gucci', 'chloé', 'prada', 'tom ford', 'mastroianni', 'mosslip',
      'polaroid', 'whitehaven', 'chester', 'john lenon', 'john lennon', 'johnny depp', 'gafasworld',
      'tous', 'essedue', 'prima prize', 'mr. boho', 'hawkers',
      'vogue eyewear', 'michael kors', 'emporio armani', 'dolce', 'gabbana', 'hugo boss', 'police',
      'furla', 'guess', 'chopard', 'swarovski', 'longchamp', 'tiwi', 'miller & marc', 'millerandmarc',
      'pj. lobster', 'pj lobster', 'the indian face', 'hanukeii', 'milyunagafas', 'etnia barcelona', 'kaleos',
      'moscot', 'oliver peoples', 'maui jim', 'serengeti', 'burberry', 'moschino', 'givenchy', 'bottega veneta',
      'salvatore ferragamo', 'scalpers', 'zara', 'mango', 'el corte inglés', 'el corte ingles',
      'maría pombo', 'maria pombo', 'paula echevarría', 'paula echevarria', 'sara carbonero', 'chris hemsworth',
      'brad pitt', 'audrey hepburn', 'marilyn monroe', 'elton john', 'lady gaga', 'kendall jenner', 'bella hadid',
      'gigi hadid', 'chiara ferragni', 'dulceida'
    ];
    for (const cb of competingEntities) {
      const escaped = cb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cbRx = new RegExp(`\\b${escaped}\\b`, 'i');
      if (cbRx.test(candidateLower)) {
        const cbCore = cb.split(' ')[0];
        if (!sourceTextLower.includes(cb) && !sourceTokens.some(tt => tt === cbCore || tt.includes(cb))) {
          return cb;
        }
      }
    }
    return null;
  }

  isClinicalOrEncyclopedicDomain(brick, sourceTextLower = '') {
    const dom = (brick?.domain_source || brick?.source_domain || '').toLowerCase();
    const wantsClinical = /\b(cirug[ií]a|oftalmolog|patolog|cataratas?|glaucoma|miop[ií]a|astigmatismo|ambliop[ií]a|lentillas?|lentes\s+de\s+contacto|presbicia|retina|c[oó]rnea)\b/i.test(sourceTextLower);
    if (wantsClinical) return false;
    if (/clinicabaviera|barraquer|oftalvist|icrcat|fernandez-vega|visiondirect|wikipedia|^es$|optimoda|qvision|medium/i.test(dom)) {
      return true;
    }
    if (brick?.voice_category === 'ENCYCLOPEDIC' || brick?.tier === 'TIER_4_WIKIPEDIA') {
      return true;
    }
    return false;
  }

  expandSlotsForSemanticEval(text, slots = []) {
    let expanded = String(text || '');
    if (!expanded || !Array.isArray(slots) || !slots.length) return expanded;
    for (const s of slots) {
      if (!s || !s.slot_type || !s.raw_value) continue;
      const tag = `[${s.slot_type}]`;
      if (expanded.includes(tag)) {
        expanded = expanded.replace(tag, String(s.raw_value));
      }
    }
    return expanded.replace(/\[SLOT_[A-Z_]+\]/g, ' ');
  }

  searchDonorBricksForParagraph(frames, atoms, text, excludeIds = new Set(), count = 1, preferredSlot = null, frameHint = null, searchOptions = {}) {
    if (!Array.isArray(frames)) frames = [frames];
    const seenCandidates = new Set();
    const allCandidates = [];

    for (const f of frames) {
      if (this.goldenIndex && this.goldenIndex[f]) {
        for (const g of this.goldenIndex[f]) {
          const gid = g.brick_id || g.golden_id || g.donor_id;
          if (gid && !seenCandidates.has(gid)) {
            seenCandidates.add(gid);
            allCandidates.push({ ...g, brick_id: gid, _isGolden: true });
          }
        }
      }
      if (this.frameIndex && this.frameIndex[f]) {
        for (const b of this.frameIndex[f]) {
          if (b.brick_id && !seenCandidates.has(b.brick_id)) {
            seenCandidates.add(b.brick_id);
            allCandidates.push(b);
          }
        }
      }
    }

    const textLower = (text || '').toLowerCase();
    const queryForSemantic = `${searchOptions.currentAnchor || ''} ${text || ''}`.trim();
    const queryProfile = enterpriseRetriever.analyzeQuery(queryForSemantic, frameHint || frames[0], atoms);
    const domainId = searchOptions.domainId || 'optica';
    const activeSubdomains = searchOptions.activeSubdomains || domainRegistry.detectActiveSubdomains(text, domainId);

    // Multi-Axis O(1) Inverted Index Expansion: pull cross-frame bricks matching query topic_tags or discourse_intent
    if (this.brickById && enterpriseRetriever.isIndexed) {
      for (const tg of queryProfile.topic_tags || []) {
        const tagSet = enterpriseRetriever.byTopicTag.get(tg);
        if (!tagSet) continue;
        for (const id of tagSet) {
          if (!seenCandidates.has(id)) {
            const b = this.brickById.get(id);
            if (b) {
              seenCandidates.add(id);
              allCandidates.push(b);
            }
          }
        }
      }
      const intentSet = enterpriseRetriever.byIntent.get(queryProfile.discourse_intent);
      if (intentSet && queryProfile.discourse_intent !== 'STYLE_DEFINITION') {
        for (const id of intentSet) {
          if (!seenCandidates.has(id)) {
            const b = this.brickById.get(id);
            if (b) {
              seenCandidates.add(id);
              allCandidates.push(b);
            }
          }
        }
      }
    }

    // Technical Optical Index O(1) Expansion (dynamic key + stem resolution)
    if (this.brickById && this.techIndex && atoms?.discriminativeAnchors?.length) {
      const indexKeys = Object.keys(this.techIndex);
      for (const anc of atoms.discriminativeAnchors) {
        const matchedKeys = new Set();
        if (this.techIndex[anc.key]) matchedKeys.add(anc.key);
        const rawTokens = `${anc.key || ''} ${anc.label || ''}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(/[^a-z0-9]+/)
          .filter(t => t.length >= 5);
        for (const ik of indexKeys) {
          if (matchedKeys.has(ik)) continue;
          const ikParts = ik.split('_').filter(p => p.length >= 5);
          if (ikParts.some(part => rawTokens.some(tok => tok.startsWith(part.slice(0, 5)) || part.startsWith(tok.slice(0, 5))))) {
            matchedKeys.add(ik);
          }
        }
        for (const bucketKey of matchedKeys) {
          const bucketIds = this.techIndex[bucketKey];
          if (!Array.isArray(bucketIds)) continue;
          for (const id of bucketIds) {
            if (!seenCandidates.has(id)) {
              const b = this.brickById.get(id);
              if (b && !b.exclude_from_humanization) {
                seenCandidates.add(id);
                allCandidates.push(b);
              }
            }
          }
        }
      }
    }

    // Seed clean specialty compartment bricks on demand (e.g. AUDIOLOGY, OPTICAL_CLINICAL, or generic custom domains)
    if (domainId === 'optica' && (activeSubdomains.has('AUDIOLOGY') || activeSubdomains.has('OPTICAL_CLINICAL'))) {
      for (const mb of this.masterBricks) {
        if (!mb || mb.exclude_from_humanization || !mb.brick_id || seenCandidates.has(mb.brick_id)) continue;
        if (mb.subdomain === 'AUDIOLOGY' && activeSubdomains.has('AUDIOLOGY')) {
          seenCandidates.add(mb.brick_id);
          allCandidates.push(mb);
        } else if (mb.subdomain === 'OPTICAL_CLINICAL' && activeSubdomains.has('OPTICAL_CLINICAL')) {
          seenCandidates.add(mb.brick_id);
          allCandidates.push(mb);
        }
      }
    } else if (allCandidates.length === 0 && activeSubdomains instanceof Set) {
      for (const mb of this.masterBricks) {
        if (!mb || mb.exclude_from_humanization || !mb.brick_id || seenCandidates.has(mb.brick_id)) continue;
        if (mb.subdomain && domainRegistry.isSubdomainCompatible(mb.subdomain, activeSubdomains, domainId)) {
          seenCandidates.add(mb.brick_id);
          allCandidates.push(mb);
        }
      }
    }

    if (!allCandidates.length) return [];

    const queryLower = queryForSemantic.toLowerCase();
    const textTokens = this.tokenize(text).filter(t => t.length > 3);
    const wantsKids = /\b(?:niñ[oa]s?|peques|bebés?|infantil(?:es)?)\b/i.test(queryLower);
    const wantsRxOptical = /\b(?:graduad[oa]s?|progresiv[oa]s?|ocupacional(?:es)?|monofocal(?:es)?|bifocal(?:es)?|presbicia|miop[ií]a|astigmatismo|ordenador|monitores?|pantallas?|oficina|ergonom\w*|cervical|cristal\s+mineral|policarbonato|fotocrom[aá]tic|polarizad)\b/i.test(queryLower);
    const targetWords = text.split(/\s+/).filter(Boolean).length;
    const isColonMode = searchOptions.paragraphMode === false || frameHint === 'TRANSITION_CURATION' || text.trim().endsWith(':');
    const paragraphMode = !isColonMode;
    const wantWindowWords = searchOptions.targetWindowWords || (paragraphMode ? Math.min(72, Math.max(52, Math.round(targetWords * 0.72))) : 22);
    const minWindowWords = searchOptions.minWindowWords || (paragraphMode ? 18 : 10);
    const maxWindowWords = searchOptions.maxWindowWords || (paragraphMode ? 96 : 34);
    const isProductFactual = frameHint === 'PRODUCT_FACTUAL' || (atoms.brand_models && atoms.brand_models.length > 0);
    const commercialCtaRx = /\b(?:a[ñn]adir\s+al\s+carrito|ver\s+cat[aá]logo|nuestras?\s+tiendas?|haz\s+clic[k]?|clikc|cons[ií]guel[oa]s|adqui[eé]rel[oa]s|hazte\s+con|enam[oó]rate|2x1|\d+\s*(?:€|eur|euros?))\b/i;
    const seasonalAnachronismRx = /\b(?:el\s+a[ñn]o\s+pasado|la\s+temporada\s+pasada|navidad|navide[ñn][oa]s?|nochebuena|nochevieja|pap[aá]\s+noel|reyes\s+magos|halloween|san\s+valent[ií]n|semana\s+santa)\b/gi;
    const metaBlogRx = /\b(?:tal\s+y\s+como\s+hemos\s+(?:mencionado|comentado|visto)|como\s+(?:ya\s+)?hemos\s+(?:mencionado|comentado)|como\s+te\s+habr[aá]s\s+dado\s+cuenta|gu[ií]a\s+de\s+compra|consejos\s+para\s+elegir|saber\s+c[oó]mo\s+elegir|es\s+clave\s+saber\s+elegir)\b/i;
    const listicleCountRx = /\b(\d{1,2})\s+(?:gafas|monturas|modelos|opciones|colores|ideas|consejos|trucos)\b/gi;
    const rejectsLoudColors = /\b(?:descartar|evitar|nada\s+de|no\s+le\s+van)\b[^.]{0,75}\b(?:fluorescentes|estridentes|brillantes|llamativos|artificiales)\b/i.test(textLower);
    const wantsWomen = /\b(?:mujer(?:es)?|femenin[oa]s?|chicas?)\b/i.test(textLower);
    const wantsMen = /\b(?:hombre(?:s)?|masculin[oa]s?|chicos?)\b/i.test(textLower);
    const rejectsRigidFit = /\b(?:no\s+opriman|sin\s+(?:dejar\s+)?marcas|c[oó]modas|flojas|movimiento\s+brusco)\b/i.test(textLower);
    const mentionsCareyOrTierra = /\b(?:carey|tierra|marr[oó]n|marrones|c[aá]lid[oa]s?|neutr[oa]s?|[aá]mbar|ocre)\b/i.test(textLower);
    const mentionsGoldOrBronze = /\b(?:dorad[oa]|oro|bronce|envejecido|metal(?:es)?)\b/i.test(textLower);
    const allowsSpecialtyClinical = activeSubdomains instanceof Set && (activeSubdomains.has('OPTICAL_CLINICAL') || activeSubdomains.has('AUDIOLOGY'));

    const scored = [];
    for (const c of allCandidates) {
      if (c.exclude_from_humanization) continue;
      const bId = c.brick_id || c.golden_id || c.donor_id;
      if (!bId || excludeIds.has(bId)) continue;
      if (c.domain && c.domain !== domainId) continue;
      if (c.subdomain && !domainRegistry.isSubdomainCompatible(c.subdomain, activeSubdomains, domainId)) {
        continue;
      }

      // Ontological domain gate: isolate clinical ophthalmology & audiology strictly to their active compartments
      if (!allowsSpecialtyClinical && this.isClinicalOrEncyclopedicDomain(c, textLower)) continue;

      const raw = c.raw_text || c.text || '';
      const cText = raw.toLowerCase();
      if (!raw.trim() || raw.includes('\uFFFD')) continue;
      if (!factualGuard.assessDomainPurity(raw, { domainId, activeSubdomains }).isCleanOptical) continue;

      // Discard quoted interviews, social handles (@), commercial CTAs, meta-blog listicles, and scraping headers
      if (
        /[“”"@]/.test(raw) ||
        commercialCtaRx.test(cText) ||
        metaBlogRx.test(cText) ||
        [...cText.matchAll(listicleCountRx)].some(m => !textLower.includes(m[1])) ||
        /Rostro\s+[a-záéíóúñ]+[A-ZÁÉÍÓÚÑ]/.test(raw) ||
        /[a-záéíóúüñ]{3}[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]{2}/.test(raw.replace(/\b(?:McQueen|RayBan|StreetStyle|iPhone|YouTube|LinkedIn|PlayStation|WhatsApp)\b/g, ''))
      ) {
        continue;
      }

      // General guard against unrequested cycling / niche sport blocks
      if (
        !/\b(?:ciclismo|bici|bicicleta|deportiv|running|senderismo|esqu[ií]|monta[ñn]a|n[aá]utic|golf|acu[aá]tic)\b/i.test(textLower) &&
        /\b(?:practicar\s+ciclismo|ruta\s+en\s+bici|para\s+ciclismo|el\s+casco\s+que\s+llevar[aá]s|actividades\s+acu[aá]ticas|monta[ñn]ismo,\s*golf|golf\s+y\s+otros\s+deportes)\b/i.test(cText)
      ) {
        continue;
      }

      // Guard indoor Rx paragraphs (progresivas/ocupacionales/ordenador) against outdoor sunglass donors
      if (
        wantsRxOptical &&
        /\b(?:ocupacional(?:es)?|progresiv[oa]s?|ordenador|oficina|monitores?)\b/i.test(textLower) &&
        !/\b(?:gafas\s+de\s+sol|solares?|polarizad|fotocrom)\b/i.test(textLower) &&
        /\b(?:gafas\s+de\s+sol\s+(?:polarizad|fotocrom|espejad)|actividades\s+al\s+aire\s+libre)\b/i.test(cText)
      ) {
        continue;
      }

      // Filter frozen 4-digit years (e.g., 1947, 2018, 2020) and seasonal/anachronistic refs unless mentioned in input text
      const yearMatches = raw.match(/\b(19\d\d|20[0-2]\d)\b/g);
      if (yearMatches && yearMatches.some(y => !textLower.includes(y))) {
        continue;
      }
      if ([...cText.matchAll(seasonalAnachronismRx)].some(m => !textLower.includes(m[0]))) {
        continue;
      }

      // Skip children or contact-lens / refractive pathology blocks unless source text requests them
      const allowsAudiologyOtitisKids = activeSubdomains instanceof Set && activeSubdomains.has('AUDIOLOGY') && /\botitis\b/i.test(textLower);
      if (!wantsKids && !allowsAudiologyOtitisKids && /\b(?:peques|niñ[oa]s?|bebés?)\b/i.test(cText)) {
        continue;
      }
      const allowsClinicalSub = activeSubdomains instanceof Set && activeSubdomains.has('OPTICAL_CLINICAL');
      if (!wantsRxOptical && !allowsClinicalSub && /\b(?:graduad[oa]s?|graduaci[oó]n|lentillas?|miopía|astigmatismo|(?:efecto|defecto|error)\s+refractivo)\b/i.test(cText)) {
        continue;
      }

      // Skip sizing/caliber measurement tutorials unless source paragraph explicitly discusses sizing or caliber
      const wantsSizing = /\b(calibre|talla|medidas?|mil[ií]metros?|puente\s+nasal|varillas?\s+mm)\b/i.test(textLower);
      if (!wantsSizing && /\b(calibre\s+de\s+la\s+lente|borde\s+interior|n[úu]meros\s+que\s+hacen\s+referencia|en\s+las\s+varillas\s+encontrar[aá]s|talla\s+de\s+gafas|medida\s+se\s+refiere)\b/i.test(cText)) {
        continue;
      }

      // Semantic Polarity Guard: block donors praising loud/bright colors when input rejects them or stresses sobriety/earth/neutral tones
      const wantsSoberOrEarthColors = rejectsLoudColors || (mentionsCareyOrTierra && /\b(?:sobri[oa]|neutr[oa]|mate|oscuro|atemporal|sin\s+saturar|versatilidad)\b/i.test(textLower));
      if (wantsSoberOrEarthColors && /\b(?:mil\s+colores|tonos\s+llamativos|colores\s+llamativos|colores\s+fluorescentes|extravagante|extravagancia|prints|alejen?\s+de\s+los\s+tonos\s+neutros|salen\s+de\s+lo\s+convencional|color\s+block|locas,\s+atrevidas|todo\s+color)\b/i.test(cText)) {
        continue;
      }

      // Audience Gender Guard: avoid gender-locked blocks ("para mujer" / "para hombres") on unisex paragraphs
      const isUnisexMention = /\b(?:hombres?\s+y\s+mujeres?|mujeres?\s+y\s+hombres?|tanto\s+(?:para\s+)?hombres?\s+como|unisex)\b/i.test(cText);
      if (!isUnisexMention) {
        if (!wantsWomen && /\b(?:para\s+mujer(?:es)?|aquellas\s+que\s+tengan\s+el\s+rostro\s+pequeño|para\s+las\s+mujeres)\b/i.test(cText)) {
          continue;
        }
        if (!wantsMen && /\b(?:para\s+hombres?|el\s+p[úu]blico\s+masculino)\b/i.test(cText)) {
          continue;
        }
      }

      // Self-contradicting donor guard (e.g. "pesadas" followed by "Su ligereza" in same paragraph)
      if (/\bpesad[oa]s?\b/i.test(cText) && /\bligereza\b/i.test(cText)) {
        continue;
      }

      // Material Specificity Guard: reserve explicit metal-frame tutorials for paragraphs that actually discuss materials/metal
      const wantsMaterialOrMetal = /\b(?:metal|met[aá]lic[oa]s?|bronce|oro|dorad[oa]s?|acero|titanio|acetato|pasta|celulosa|carey|material(?:es)?)\b/i.test(queryLower);
      if (!wantsMaterialOrMetal && /\b(?:gafas\s+de\s+metal|el\s+metal\s+es\s+un\s+material)\b/i.test(cText)) {
        continue;
      }

      // Contrast polarity & gender-noun guards
      if (/\b(?:quedan\s+descartadas|las\s+monturas\s+\[?slot_frame_shape\]?\s+quedan)\b/i.test(cText) && atoms?.shapes?.length) {
        continue;
      }
      if (!wantsMen && /\b(?:hombre\s+italiano|españoles)\b/i.test(cText)) {
        continue;
      }
      if (!wantsWomen && /\bgafas\s+de\s+sol\s+mujer\b/i.test(cText)) {
        continue;
      }
      if (!wantsMen && /\bgafas\s+de\s+sol\s+hombre\b/i.test(cText)) {
        continue;
      }
      // Block anaphoric openers like "Para eso," / "Este diseño" anywhere inside standalone corpus paragraphs
      if (/\b(?:para\s+eso,\s+f[ií]jate|este\s+diseño\s+se\s+convierte|esto\s+es\s+m[aá]s\s+complicado)\b/i.test(cText)) {
        continue;
      }
      // Block specific model codes leaked in V2 harvested fashion lists (e.g. CD0369, RB3016, PLD 2053/S) unless input asks for exact code
      const foreignSkuMatch = raw.match(/\b(?:[A-Z]{2,3}\d{3,4}[A-Z]*|RB\d{4}[A-Z]*|PO\d{4}[A-Z]*|PLD\s*\d{4})\b/g);
      if (foreignSkuMatch && foreignSkuMatch.some(code => {
        const esc = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return !new RegExp(`\\b${esc}\\b`, 'i').test(text);
      })) {
        continue;
      }

      // Skip competing brands unless explicitly queried
      if (this.isCompetingBrand(cText, textLower, textTokens)) continue;

      // Extract coherent paragraph window (42-94w multi-sentence for normal paragraphs, 10-34w for colon intros)
      const cleanWindow = this.extractCleanDonorWindow(c, wantWindowWords, frameHint || frames[0], atoms, { paragraphMode, maxWords: maxWindowWords, minWords: minWindowWords, rawPara: text, articleMacroStyle: searchOptions.articleMacroStyle, activeSubdomains });
      const cleanWc = cleanWindow ? cleanWindow.split(/\s+/).filter(Boolean).length : 0;
      if (!cleanWindow || cleanWc < minWindowWords || cleanWc > maxWindowWords) continue;

      // Reject broken mid-word slot substitutions from corpus scraping (e.g. "mientras se [SLOT_OCCASION_OUTFIT]a")
      if (/\[SLOT_[A-Z_]+\][a-záéíóúüñ]|[a-záéíóúüñ]\[SLOT_[A-Z_]+\]/i.test(cleanWindow)) continue;

      // Reject donor windows that overlap too closely with the input paragraph (>25% trigrams)
      if (cleanWc >= 15 && this.computeNGramOverlapRatio(cleanWindow, text, 3) > 0.25) continue;

      // Colon intros must genuinely introduce upcoming options/models (no pro-drop starts, no "porque..." endings)
      if (isColonMode) {
        const cwTrim = cleanWindow.trim();
        if (/^(?:este\s+tipo\s+de|esta\s+clase\s+de|estas\s+gafas\s+tienen|el\s+modelo|no\s+solo\s+nos|funcionan|hacen\s+que|son\s+un|otra\s+novedad|adem[aá]s)\b/i.test(cwTrim)) continue;
        if (/\bporque\s+[^.]{1,55}[.:]?$/i.test(cwTrim)) continue;
      }

      // Also block exact anaphoric openers when extractCleanDonorWindow strips the first sentence ("Si... . Para eso, ...")
      if (/^(?:para\s+eso,|este\s+diseño\s+se\s+convierte|otro\s+factor\s+a\s+tener\s+en\s+cuenta)/i.test(cleanWindow.trim()) && searchOptions.isFirstAfterHeading) {
        continue;
      }
      if (/^(?:hacen\s+que|te\s+hace\s+ser)\b/i.test(cleanWindow.trim())) {
        continue;
      }
      if (/^o\s+(?:con|de|en|para|por|si|quiz[aá]|algun[oa]s?|las?|los?|unas?|unos?)\b/i.test(cleanWindow.trim())) {
        continue;
      }

      // First paragraph right under an H2/H3 must start with an explicit subject (no abrupt pro-drop or dangling connector)
      if (searchOptions.isFirstAfterHeading && /^(?:funcionan\s+a\s+la\s+perfecci[oó]n|son\s+un\s+complemento|no\s+solo\s+nos|suelen\s+llevarse|destacan\s+por|ofrecen\s+un|as[ií],\s+si\b|por\s+eso,|cuando\s+estrenes\s+estas|adem[aá]s,|sin\s+embargo,|de\s+hecho,)\b/i.test(cleanWindow.trim())) {
        continue;
      }

      // Product-Factual structural fit: require a real brand/model slot or substitutable eyewear NP so the SKU integrates naturally
      const hasProductAnchor = /\[SLOT_(?:BRAND|MODEL)\]|\b(?:estas|las)\s+gafas(?:\s+de\s+sol)?\b|\b(?:esta|la)\s+montura\b|\b(?:este|el)\s+(?:modelo|diseño)\b/i.test(cleanWindow);
      if (isProductFactual && !hasProductAnchor) {
        continue;
      }

      const winStem = cleanWindow.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 38);
      if (winStem && excludeIds && excludeIds.has(`stem:${winStem}`)) continue;

      // Deduplicate against any individual sentence already used in prior paragraphs
      const winSents = cleanWindow.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
      if (searchOptions.requireMultiSentence && winSents.length < 2) continue;
      const winSentStems = winSents
        .map(s => s.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 34))
        .filter(s => s.length >= 16);
      if (excludeIds && winSentStems.some(st => excludeIds.has(`sent:${st}`))) continue;

      // LAYER 1: ENTERPRISE HYBRID SCORING (Okapi BM25 + 128-D Dense Semantic Vector Cosine + 4D Ontology + Concept Clusters + Entailment)
      const semanticSurface = this.expandSlotsForSemanticEval(cleanWindow, c.slots);
      const entail = factualGuard.evaluateFactualEntailment(text, semanticSurface, atoms?.discriminativeAnchors, atoms?.signedPolarity);
      if (entail.polarityContradiction) continue;
      if (atoms?.signedPolarity?.negativeContexts?.length) {
        const rawEntail = factualGuard.evaluateFactualEntailment(text, raw, atoms?.discriminativeAnchors, atoms?.signedPolarity);
        if (rawEntail.polarityContradiction) continue;
      }

      const sem = this.computeSemanticSimilarity(queryForSemantic, semanticSurface);
      const hybrid = enterpriseRetriever.scoreCandidateHybrid(queryProfile, c, semanticSurface);
      const combinedSemScore = Number((sem.totalSim * 0.4 + hybrid.bm25Score * 0.85 + hybrid.denseCosine * 38).toFixed(2));

      let score = 15 + hybrid.totalHybrid + Math.min(24, sem.clusterSim * 3.2);
      if (atoms?.discriminativeAnchors?.length) {
        score += entail.anchorCoverageRatio * 34 - entail.missingCriticalTech.length * 44;
      }
      if (!isColonMode && sem.lexSim < 1.2 && sem.clusterSim < 2 && hybrid.denseCosine < 0.22) {
        score -= 24;
      }
      if (discourseTopology.hasContrastiveMaterialRedundancy(cleanWindow, text, atoms)) {
        score -= 38;
      }
      const topoProfile = discourseTopology.analyzeBrickDiscourseProfile(semanticSurface, cleanWindow, c.slots);
      const topoCompat = discourseTopology.scoreTopologyCompatibility(searchOptions.paraTopology?.role || 'SECTION_MEDIAL', topoProfile, frameHint || frames[0]);
      score += topoCompat.score * 0.65;

      if (/\[SLOT_[A-Z_]+\]/.test(cleanWindow)) score += 5;
      if (c.frame === frames[0]) score += 8;
      if (c._isGolden) score += 5;
      if (c._isTriad) score += 3;
      if (c.source_origin === 'the_10_golden_human_texts') score += 4;
      if (c.voice_category === 'EDITORIAL_LIFESTYLE' || c.tier === 'TIER_2_EDITORIAL') score += 3;
      const domSrc = ((c.domain_source || c.source_domain || '') + ' ' + (c.source_origin || '')).toLowerCase();
      if (/revistagq|vogue|telva|elle|esquire|smoda|elpa[ií]s|jotdown/i.test(domSrc)) {
        score += 4;
      }
      if (c.voice_category === 'WORKSHOP_CLINICAL' || c.tier === 'TIER_1_WORKSHOP') score += 3;
      if (c.metrics?.has_human_glitch) score += 3;

      // Coherent multi-sentence paragraph quality bonus (balanced so relevance always beats generic magazine length)
      if (paragraphMode) {
        if (winSents.length >= 2) score += 10;
        if (winSents.length >= 3) score += 4;
        if (cleanWc >= 40 && cleanWc <= 90) score += 8;
        else if (cleanWc < 34) score -= 10;
        if (winSents.length >= 2) {
          const sLens = winSents.map(s => s.split(/\s+/).filter(Boolean).length);
          const spread = Math.max(...sLens) - Math.min(...sLens);
          if (spread >= 8) score += 4;
          if (Math.max(...sLens) >= 26) score += 3;
        }
        if (/[;:¡!¿?–—…]|\s-\s/.test(cleanWindow)) score += 3;
      }

      const evalLower = (semanticSurface || cleanWindow || raw).toLowerCase();

      // Guard against opposite negative advice when input gives positive recommendations (e.g. "huir de aviador" on aviator article)
      const wantsNegativeAdvice = /\b(?:evitar|evita|evitaremos|huir|descartar|no\s+favorecen)\b/i.test(textLower);
      if (!wantsNegativeAdvice && /\b(?:huir\s+de|evitar|evitaremos|descartar|no\s+favorecen)\b/i.test(evalLower)) {
        continue;
      }
      if (wantsSoberOrEarthColors && /\b(?:tonos\s+llamativos|colores\s+llamativos|mil\s+colores|colores\s+fluorescentes)\b/i.test(evalLower)) {
        continue;
      }

      // Penalize negative/hedonic tone mismatches on serious editorial paragraphs (e.g. "horribles gafas", "licencia para molar", "sex-appeal")
      if (/\b(?:horribles|peores\s+gafas|licencia\s+para\s+molar|sex-appeal)\b/i.test(evalLower)) {
        score -= 35;
      }

      // Colon intro rhetorical alignment
      if (isColonMode && /\b(?:apunta|tendencia|propuestas|modelos|opciones|colecci[oó]n|temporada|claves|alternativas|favorit[oa]s?|est[aá]n\s+de\s+moda|destacan)\b/i.test(evalLower)) {
        score += 20;
      }

      // Explicit topical alignment boosts for materials, silhouettes, palette, and facial ergonomics
      if (atoms?.materials?.length) {
        const reqMatStr = atoms.materials.join(' ').toLowerCase();
        if (/\b(?:acetato|pasta|celulosa)\b/.test(reqMatStr) && /\b(?:acetato|pasta|celulosa)\b/.test(evalLower)) score += 18;
        if (/\b(?:metal|bronce|oro|acero)\b/.test(reqMatStr) && /\b(?:metal|met[aá]lic|bronce|dorad|acero)\b/.test(evalLower)) score += 18;
        if (/\bcarey\b/.test(reqMatStr) && /\bcarey\b/.test(evalLower)) score += 14;
      }
      if (atoms?.shapes?.length) {
        const reqShapeStr = atoms.shapes.join(' ').toLowerCase();
        if (/\bredond/.test(reqShapeStr) && /\bredond|circular|pantos\b/.test(evalLower)) score += 18;
        if (/\bcuadrad|geom[eé]tric/.test(reqShapeStr) && /\bcuadrad|geom[eé]tric|rectangul|angulos\b/.test(evalLower)) score += 16;
        if (/\baviador/.test(reqShapeStr) && /\baviador|piloto|gota|l[aá]grima\b/.test(evalLower)) score += 18;
      }
      if (/\b(?:paleta|crom[aá]tic|tonos\s+tierra|colores?\s+fluorescent|marrones?|ámbar|ocre)\b/i.test(textLower) &&
          /\b(?:tierra|carey|marr[oó]n|marrones|c[aá]lid[oa]s?|neutr[oa]s?|sobri[oa]s?|atemporal(?:es)?|[aá]mbar|ocre)\b/i.test(evalLower)) {
        score += 18;
      }
      if (mentionsCareyOrTierra && /\bcarey\b/i.test(evalLower) && /\b(?:cl[aá]sic|tonos|c[aá]lid|envejecen|atemporal|marr[oó]n|estampado|moda|id[oó]nea|puedes\s+encontrar|resiste)\b/i.test(evalLower)) {
        score += 28;
      }
      if (mentionsGoldOrBronze && /\b(?:metal|met[aá]lic|dorad|bronce|oro\s+rosa|patillas|puente)\b/i.test(evalLower) && !/\bhorribles|peores\b/i.test(evalLower)) {
        score += 20;
      }
      if (rejectsRigidFit && /\b(?:aprieten|ajustan|comodidad|confort|puente|nariz|orejas|sujec|suave)\b/i.test(evalLower)) {
        score += 22;
      }
      if (atoms?.styles?.some(st => /boho|bohem|vintage|retro|70/i.test(st)) &&
          /\b(?:retro|vintage|cl[aá]sic|setenter|d[eé]cadas|años\s+(?:60|70|80)|ic[oó]nic)\b/i.test(evalLower)) {
        score += 16;
      }
      if (/\b(?:fisonom[ií]a|c[oó]modas?|asientan|opriman|flojas|movimiento\s+brusco|rostro|elegir|escoger)\b/i.test(textLower) &&
          /\b(?:c[oó]mod[oa]s?|ajustan?|rostro|facciones|cara|nariz|puente|aprieten|sueltas|elegir|favorecedor)\b/i.test(evalLower)) {
        score += 16;
      }

      let tokenHits = sem.matchedTerms.length;

      // Check slot matching (deduplicated per slot_type + material nativity check)
      let slotHits = 0;
      const seenSlotTypesForScore = new Set();
      if (c.slots && c.slots.length > 0) {
        const reqMat = (atoms.materials || []).join(' ').toLowerCase();
        const reqAcetate = /\b(?:acetato|pasta)\b/.test(reqMat);
        const reqMetal = /\b(?:metal|titanio|oro|bronce|acero)\b/.test(reqMat);
        for (const s of c.slots) {
          if (cleanWindow && !cleanWindow.includes(`[${s.slot_type}]`)) continue;
          if (s.slot_type === 'SLOT_MATERIAL' && atoms.materials && atoms.materials.length) {
            const rawSlotVal = (s.raw_value || '').toLowerCase();
            const isSlotMetal = /\b(?:metal|met[aá]lic[oa]s?|titanio)\b/.test(rawSlotVal);
            const isSlotAcetate = /\b(?:acetato|pasta)\b/.test(rawSlotVal);
            if ((reqAcetate && !reqMetal && isSlotMetal) || (reqMetal && !reqAcetate && isSlotAcetate)) {
              score -= 25;
            }
          }
          if (seenSlotTypesForScore.has(s.slot_type)) continue;
          seenSlotTypesForScore.add(s.slot_type);
          if (preferredSlot && s.slot_type === preferredSlot) { score += 8; slotHits++; }
          if (s.slot_type === 'SLOT_FRAME_SHAPE' && atoms.shapes && atoms.shapes.length) { score += 5; slotHits++; }
          if (s.slot_type === 'SLOT_MATERIAL' && atoms.materials && atoms.materials.length) { score += 5; slotHits++; }
          if (s.slot_type === 'SLOT_BRAND' && atoms.brand_models && atoms.brand_models.length) { score += 6; slotHits++; }
          if (s.slot_type === 'SLOT_MODEL' && atoms.brand_models && atoms.brand_models.length) { score += 6; slotHits++; }
          if (s.slot_type === 'SLOT_COATING' && atoms.coatings && atoms.coatings.length) { score += 4; slotHits++; }
          if (s.slot_type === 'SLOT_AESTHETIC_STYLE' && atoms.styles && atoms.styles.length) { score += 4; slotHits++; }
          if (s.slot_type === 'SLOT_OCCASION_OUTFIT' && atoms.outfits && atoms.outfits.length) { score += 3; slotHits++; }
        }
      }

      if (isProductFactual && /\[SLOT_(?:BRAND|MODEL)\]|^(?:las|estas)\s+gafas(?:\s+de\s+sol)?\b|^(?:este|el)\s+(?:modelo|diseño)\b/i.test(cleanWindow.trim())) {
        score += 16;
      }
      if (isProductFactual && slotHits === 0 && tokenHits === 0) {
        score -= 12;
      }

      const wc = cleanWc || c.word_count || raw.split(/\s+/).filter(Boolean).length;
      if (wc < 10) score -= 8;
      if (!paragraphMode && wc > 34) score -= (wc - 34) * 0.8;
      if (paragraphMode && wc > 92) score -= (wc - 92) * 0.6;

      // Penalize explicit raw-text material contradictions when input explicitly focuses on acetate vs metal
      if (atoms?.materials?.length) {
        const reqMatLow = atoms.materials.join(' ').toLowerCase();
        const reqAcetateOnly = /\b(?:acetato|pasta|celulosa)\b/.test(reqMatLow) && !/\b(?:metal|bronce|oro|acero|titanio)\b/.test(reqMatLow);
        const reqMetalOnly = /\b(?:metal|bronce|oro|acero|titanio)\b/.test(reqMatLow) && !/\b(?:acetato|pasta|celulosa)\b/.test(reqMatLow);
        if (reqAcetateOnly && /\b(?:titanio|armazón metálico|gafas\s+de\s+metal)\b/i.test(evalLower)) score -= 28;
        if (reqMetalOnly && /\b(?:gafas\s+de\s+pasta|de\s+acetato\s+grueso)\b/i.test(evalLower)) score -= 28;
      }

      const rawSemanticQuality = Number(score.toFixed(1));
      const reuseInfo = searchOptions.usageLedger
        ? bankGapTracker.getDonorReuseInfo(searchOptions.usageLedger, bId, winSentStems)
        : { brickUses: 0, stemUses: 0, totalFreshnessPenalty: 0, isCrossArticleRepeat: false };
      if (reuseInfo.totalFreshnessPenalty > 0) {
        score -= reuseInfo.totalFreshnessPenalty;
      }

      scored.push({
        brick: {
          ...c,
          brick_id: bId,
          word_count: wc,
          _cleanWindow: cleanWindow,
          _articleMacroStyle: searchOptions.articleMacroStyle || 'general_editorial',
          _semanticSurface: semanticSurface,
          _winStem: winStem,
          _winSentStems: winSentStems,
          _sentCount: winSents.length,
          _semScore: combinedSemScore,
          _bm25Score: hybrid.bm25Score,
          _denseCosine: hybrid.denseCosine,
          _tagOverlap: hybrid.tagOverlap,
          _discourseIntent: hybrid.discourseIntent,
          _narrativePersona: hybrid.narrativePersona,
          _polarity: hybrid.polarity,
          _topicTags: hybrid.topicTags,
          _matchedTerms: [...new Set([...hybrid.matchedTerms, ...sem.matchedTerms])].slice(0, 8),
          _rawSemanticQuality: rawSemanticQuality,
          _crossArticleReuseCount: reuseInfo.brickUses,
          _crossArticleStemReuseCount: reuseInfo.stemUses,
          _crossArticleFresh: !reuseInfo.isCrossArticleRepeat
        },
        score: Number(score.toFixed(1))
      });
    }

    scored.sort((a, b) => b.score - a.score);

    const verifiedZero = [];
    const fallbackNonZero = [];
    const evalLimit = Math.min(scored.length, 35);
    const enableAntiPlagiarism = this.enableAntiPlagiarism === true;
    for (let idx = 0; idx < evalLimit; idx++) {
      const item = scored[idx];
      if (enableAntiPlagiarism) {
        const simFilled = this.fillSlotsInBrick(item.brick, atoms, frameHint || frames[0]);
        const simBroken = this.applySymbolicShingleBreaker(simFilled, [item.brick], atoms, new Set(), 7);
        const rem = this.findAllCorpusOverlaps(simBroken, [item.brick], 7).length;
        if (rem === 0) {
          verifiedZero.push(item);
        } else {
          fallbackNonZero.push({ ...item, score: item.score - rem * 30 });
        }
      } else {
        verifiedZero.push(item);
      }
    }
    const orderedCandidates = [...verifiedZero, ...fallbackNonZero, ...scored.slice(evalLimit)];

    // Return top `count` bricks deduplicated by stem (allowing up to 4 per quality source domain)
    const picked = [];
    const seenStems = new Set();
    const domCounts = new Map();
    for (const item of orderedCandidates) {
      const dom = item.brick.domain_source || item.brick.source_domain || '';
      const basis = (item.brick._cleanWindow || item.brick.raw_text || '').toLowerCase();
      const stem = basis.slice(0, 32);
      if (seenStems.has(stem)) continue;
      if (dom && (domCounts.get(dom) || 0) >= 4 && orderedCandidates.length > count * 2) continue;
      seenStems.add(stem);
      if (dom) domCounts.set(dom, (domCounts.get(dom) || 0) + 1);
      picked.push(item);
      if (picked.length >= count) break;
    }
    return picked;
  }

  searchBestDonorBrick(frames, atoms, text, excludeIds = new Set(), preferredSlot = null) {
    const picked = this.searchDonorBricksForParagraph(frames, atoms, text, excludeIds, 1, preferredSlot);
    if (!picked.length) return { best: null, bestScore: -999 };
    return { best: picked[0].brick, bestScore: picked[0].score };
  }

  computeFunctionalTokenRatio(text) {
    const words = this.tokenize(text || '');
    if (!words.length) return 0;
    let funcCount = 0;
    for (const w of words) {
      if (FUNCTIONAL_WORDS_ES.has(w)) funcCount++;
    }
    return Number((funcCount / words.length).toFixed(3));
  }

  getBrickProfile(brick) {
    if (!brick) {
      return { functionalRatio: 0.35, hasProDrop: false, cfRoles: ['FRAME_ENTITY'], cpRole: 'FRAME_ENTITY' };
    }
    if (brick._profile) return brick._profile;

    const raw = (brick.raw_text || brick.text || '').trim();
    const functionalRatio = brick.metrics?.functional_token_ratio || this.computeFunctionalTokenRatio(raw);
    const hasProDrop = Boolean(
      brick.centering_signature?.has_pro_drop_subject ||
      /^(?:son|es|resulta|resultan|tienen|tiene|destacan|destaca|ofrecen|ofrece|permiten|permite|aportan|aporta|cuentan|recuerdan|combinan|lucen)\b/i.test(raw)
    );

    const roleOrder = [];
    const pushRole = (r) => {
      if (r && !roleOrder.includes(r)) roleOrder.push(r);
    };

    const rawLower = raw.toLowerCase();
    // Subject/initial position dominates Cf ranking per Grosz et al. (1995)
    const firstClause = rawLower.split(/[.;!?]/)[0] || '';
    if (/\b(?:gafas?|monturas?|diseñ[oa]|model[oa]|armaz[oó]n)\b/.test(firstClause)) pushRole('FRAME_ENTITY');
    if (/\b(?:rostro|cara|fisonom[ií]a|facciones|frente|mand[ií]bula)\b/.test(firstClause)) pushRole('FACIAL_FEATURE');
    if (/\b(?:estilo|boho|vintage|retro|look|tendencia|est[eé]tica)\b/.test(firstClause)) pushRole('STYLE_AESTHETIC');
    if (/\b(?:verano|sol|uv|solar|luz|cristal|lente)\b/.test(firstClause)) pushRole('OPTICAL_PROTECTION');
    if (/\b(?:acetato|pasta|metal|acabado|artesanal|bisagra)\b/.test(firstClause)) pushRole('MATERIAL_CRAFT');
    if (/\b(?:verano|pasear|ciudad|vestido|lino|ocasión|look)\b/.test(firstClause)) pushRole('OUTFIT_OCCASION');

    if (Array.isArray(brick.slots)) {
      for (const s of brick.slots) {
        if (s.slot_type === 'SLOT_BRAND' || s.slot_type === 'SLOT_MODEL' || s.slot_type === 'SLOT_COMPONENT') pushRole('FRAME_ENTITY');
        else if (s.slot_type === 'SLOT_FRAME_SHAPE') pushRole('SHAPE_GEOMETRY');
        else if (s.slot_type === 'SLOT_AESTHETIC_STYLE') pushRole('STYLE_AESTHETIC');
        else if (s.slot_type === 'SLOT_FACIAL_FEATURE') pushRole('FACIAL_FEATURE');
        else if (s.slot_type === 'SLOT_MATERIAL' || s.slot_type === 'SLOT_TECHNIQUE') pushRole('MATERIAL_CRAFT');
        else if (s.slot_type === 'SLOT_OCCASION_OUTFIT') pushRole('OUTFIT_OCCASION');
        else if (s.slot_type === 'SLOT_COATING') pushRole('OPTICAL_PROTECTION');
      }
    }

    if (/\b(?:gafas?|monturas?|diseñ[oa]|model[oa])\b/.test(rawLower)) pushRole('FRAME_ENTITY');
    if (/\b(?:estilo|vintage|retro|boho|moda)\b/.test(rawLower)) pushRole('STYLE_AESTHETIC');
    if (/\b(?:rostro|cara|facciones|rasgos|frente|mand[ií]bula)\b/.test(rawLower)) pushRole('FACIAL_FEATURE');
    if (!roleOrder.length) pushRole('FRAME_ENTITY');

    const profile = {
      functionalRatio,
      hasProDrop,
      cfRoles: roleOrder,
      cpRole: roleOrder[0]
    };
    brick._profile = profile;
    return profile;
  }

  sanitizeDonorSkeleton(skeleton, rawText = '', contextFrame = 'GENERAL_STYLE', atoms = null, rawPara = '') {
    let out = (skeleton || rawText || '').trim();
    if (!out) return '';

    // Separate sentences stuck after period without space ("rasgos.Las" -> "rasgos. Las")
    out = out.replace(/\.([A-ZÁÉÍÓÚÑ])/g, '. $1');

    // Fix malformed duplicated slot placeholders ("[SLOT_X] de [SLOT_X]")
    out = out.replace(/\[(SLOT_[A-Z_]+)\]\s+(?:de\s+)?\[\1\]/g, '[$1]');

    // Limpieza morfosintáctica general en español (sin frases específicas de donantes)
    out = out
      .replace(/\b([a-záéíóúüñ]{3,})\.\s+([a-záéíóúüñ]{4,})\b/g, (m, a, b) =>
        /^(?:etc|aprox|n[uú]m|p[aá]g|vol|cap|art|fig|m[aá]x|m[ií]n|tel|dir|ext|ing|lic|dra)$/i.test(a) ? m : `${a}, ${b}`)
      .replace(/\b(?:s[uú]per|mega|h[ií]per)\s+([a-záéíóúüñ]{4,})\b/gi, '$1')
      .replace(/\bAdemas\b/g, 'Además')
      .replace(/\bademas\b/g, 'además')
      .replace(/\bcon\s+la\s+intensi[oó]n\s+de\b/gi, 'con la intención de')
      .replace(/\b(a\s+(?:los|las)\s+[a-záéíóúüñ]+s(?:\s+[a-záéíóúüñ]+s)?\s+)le\s+([a-záéíóúüñ]+(?:an|en))\b/gi, '$1les $2')
      .replace(/\b(la)\s+([a-záéíóúüñ]{3,}(?:dades|tades|tudes|umbres))\b/gi, (_, det, noun) => `${det[0] === 'L' ? 'Las' : 'las'} ${noun}`)
      .replace(/(^|\b(?:de|en|con|por|para|sobre|entre|hacia|hasta|ante|bajo|tras|contra|seg[uú]n|y|o|ni|a)\s+)(la)\s+([a-záéíóúüñ]{3,}(?:ciones|siones|encias|ancias|anzas|uras)|lentes|gafas|monturas|opciones|formas|tendencias|piezas)\b/gi, (_, pre, det, noun) => `${pre}${det[0] === 'L' ? 'Las' : 'las'} ${noun}`);

    const allowedBrandsLower = (atoms?.brand_models || []).join(' ').toLowerCase();
    out = out.replace(/\bcomo\s+(las|los)\s+([A-ZÁÉÍÓÚÑ][a-zA-Záéíóúñ0-9-]+)\b/g, (match, art, name) => {
      if (allowedBrandsLower && allowedBrandsLower.includes(name.toLowerCase())) return match;
      return art.toLowerCase() === 'las' ? 'como estas monturas' : 'como estos diseños';
    });

    return out.replace(/\s{2,}/g, ' ').trim();
  }

  extractCleanDonorWindow(brick, targetWords = 60, contextFrame = 'GENERAL_STYLE', atoms = null, winOptions = {}) {
    if (!brick) return null;
    const paragraphMode = winOptions.paragraphMode !== undefined ? winOptions.paragraphMode : targetWords >= 38;
    const minWords = winOptions.minWords || (paragraphMode ? 18 : 10);
    const maxWords = winOptions.maxWords || (paragraphMode ? 96 : 34);

    const baseText = (brick.slots && brick.slots.length && brick.syntactic_skeleton)
      ? brick.syntactic_skeleton
      : (brick.raw_text || brick.text || '');
    const cleaned = this.sanitizeDonorSkeleton(
      this.cleanScrapingArtifacts(baseText),
      brick.raw_text || brick.text || '',
      contextFrame,
      atoms,
      winOptions.rawPara || ''
    );
    if (!cleaned) return null;

    const rawSentences = cleaned
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¡¿\[])/)
      .map(s => s.trim())
      .filter(Boolean);

    const allowedEntityTokens = new Set(
      [...(atoms?.brand_models || []), ...(atoms?.proper_entities || [])]
        .join(' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
    );

    const isAudiologyBrick = brick.subdomain === 'AUDIOLOGY' || contextFrame === 'AUDIOLOGY' || (winOptions.activeSubdomains instanceof Set && winOptions.activeSubdomains.has('AUDIOLOGY') && !winOptions.activeSubdomains.has('OPTICAL_EYEWEAR'));
    const isClinicalBrick = brick.subdomain === 'OPTICAL_CLINICAL' || contextFrame === 'CLINICAL_OPHTHALMOLOGY' || (winOptions.activeSubdomains instanceof Set && winOptions.activeSubdomains.has('OPTICAL_CLINICAL') && !winOptions.activeSubdomains.has('OPTICAL_EYEWEAR'));
    const allowsSpecialtyTerms = isAudiologyBrick || isClinicalBrick;

    // Filtros estructurales y pragmáticos generales (sin listas de palabras sueltas de donantes)
    const sentenceJunkRx = /[""“”@]|https?:|www\.|\b(?:a[ñn]adir al carrito|ver cat[aá]logo|pincha aqu[ií]|haz clic|gu[ií]a de compra|consulta nuestro ranking|2x1)\b/i;
    const clinicalOnlySentenceJunkRx = /\b(?:dolor de cabeza|cefalea|migraña|hípnico|hípnica|fase rem|sueño|insomnio|conjuntivitis|cataratas|glaucoma|retina|córnea|colirio|oftalmólogo|síntomas|patología|tratamiento|enfermedad|clínica|ambliopía|estrabismo|ojo vago|diplopía|sistema visual|desarrollo visual|agudeza visual|globo ocular|nervio óptico|cristalino|mácula|dioptrías|optometrista|oftalmología|mareos|pupila|derrame ocular|lágrimas artificiales|neuralgia)\b/i;
    const firstPersonAndCtaRx = /\b(?:yo\s+|voy\s+a\b|me\s+(?:he|compr[eé]|encanta|fascina)|os\s+(?:vamos|traemos|contamos)|vosotros\b|mi\s+(?:experiencia|opini[oó]n)\b|hazte\s+con|no\s+te\s+quedes|elige\s+la\s+tuya|visita\s+nuestra)\b/i;
    const finiteVerbRx = /(?:\b(?:es|son|est[aá]n?|era[ns]?|fue(?:ron)?|ser[aáeé]n?|sea[ns]?|hay|han?|hemos|tienen?|pueden?|podemos|suelen?|hace[ns]?|hacemos|da[ns]?|va[ns]?|van|encajan?|destacan?|aportan?|ofrecen?|permiten?|favorecen?|quedan?|sientan?|pasa[ns]?|resultan?|combinan?|protegen?|resguardan?|buscan?|desean?|crean?|logran?|llevan?|llevamos|lucen?|marcan?|definen?|evocan?|recuerdan?|convierte[ns]?|adaptan?|ajustan?|equilibran?|estilizan?|acompañan?|siguen?|har[aá]n?|gustan?|caracterizan?|distinguen?|sobresalen?|resaltan?|realzan?|sabemos|tenemos|elegimos|debemos|existen)\b|\b[a-záéíóúñ]{3,}(?:amos|emos|imos|aron|ieron|aban|ában|ían|arán|erán|irán|aría[ns]?)\b)/i;
    const orphanStartRx = /^(?:Pero|También|Además|Asimismo|Sin\s+embargo|No\s+obstante|Por\s+(?:eso|ello|lo\s+tanto|el\s+contrario)|En\s+(?:cambio|este\s+caso|estos\s+casos|(?:segundo|tercer)\s+lugar)|De\s+(?:esta\s+(?:forma|manera)|hecho)|Es\s+(?:decir|por\s+(?:eso|ello))|Y\s+por\s+[úu]ltimo|Esto\s+(?:hace|significa|permite|supone))\b/i;
    const benignSpanishMidCapRx = /^(?:Primavera|Verano|Otoño|Invierno|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre|Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo|España|Italia|Francia|Europa|Mediterráneo|Madrid|Barcelona|Milán|París|Londres|Sol|Moda|Luz|UV|Internet|Estado|Público|Historia|Arte|Diseño|Color|Colores|Forma|Formas|Rostro|Cara)$/i;

    // Keep track of original indices so we ONLY combine truly adjacent contiguous sentences from the same human paragraph!
    const cleanSingles = [];
    for (let sIdx = 0; sIdx < rawSentences.length; sIdx++) {
      const sent = rawSentences[sIdx];
      if (/\[(?!(?:SLOT_[A-Z_]+)\])[^\]]*\]|\([^)]{48,}|\(\s*(?:foto|imagen|ver|cap\.|fig\.|p\.|€|\$|usd|19\d\d|20\d\d|\d+\s*(?:mm|cm|%))\b/i.test(sent)) continue;
      if (/^(?:tipos\s+de|categor[ií]a\s+\d|paso\s+\d|forma\s+de\s+la\s+cara|rostro\s+[a-záéíóúñ]+\s*:|calibre\s+de\s+la\s+lente\s*:)/i.test(sent.trim())) continue;
      if (/\b[A-ZÁÉÍÓÚÑ]{3,}\s+[A-ZÁÉÍÓÚÑ]{3,}/.test(sent)) continue;
      if (/\beste tipo de (?:montura|gafa|silueta|diseño|modelo|lente|\[SLOT_COMPONENT\])\s+[a-záéíóúñ]+an\b/i.test(sent)) continue;
      if (!finiteVerbRx.test(sent)) continue;
      if (/\b\d+\s+(?:modelos|gafas|monturas|formatos|diseños|piezas|\[SLOT_COMPONENT\])\b/i.test(sent)) continue;
      if (sentenceJunkRx.test(sent)) continue;
      if (!allowsSpecialtyTerms && clinicalOnlySentenceJunkRx.test(sent)) continue;
      if (firstPersonAndCtaRx.test(sent)) continue;
      if (/^(?:Si|Pero|Y|O|Además)\s+\.{2,}/.test(sent)) continue;
      if (/\bduda\b[^.]{1,65}\bduda\b/i.test(sent)) continue;
      if (/\b(?:el|la|los|las|un|una)\s+\[SLOT_AESTHETIC_STYLE\]\s+[a-záéíóúñ]{3,}/i.test(sent)) continue;

      // Invariant of factual non-contradiction (permit multi-slot natural editorial frames; guard brand duplicates, shape contradiction, sizing, and unrequested specific face anatomy)
      const slotTags = sent.match(/\[SLOT_[A-Z_]+\]/g) || [];
      const brandModelTags = slotTags.filter(t => t === '[SLOT_BRAND]' || t === '[SLOT_MODEL]');
      if (brandModelTags.length > 1) continue;
      if (!this.isShapeCompatible(sent, atoms?.shapes)) continue;
      if (!discourseTopology.isAestheticSilhouetteCompatible(sent, winOptions.articleMacroStyle, winOptions.rawPara)) continue;
      const targetShapesText = (atoms?.shapes || []).join(' ').toLowerCase();
      const targetConceptsText = [
        ...(atoms?.key_concepts || []),
        ...(atoms?.styles || []),
        ...(atoms?.materials || [])
      ].join(' ').toLowerCase();
      const targetHasSquare = /\b(?:cara|rostro)s?\s+cuadrad|\bmand[ií]bula\s+angul/i.test(targetConceptsText);
      const targetHasOval = /\b(?:cara|rostro)s?\s+ovalad/i.test(targetConceptsText);
      const targetHasElongated = /\b(?:cara|rostro)s?\s+alargad/i.test(targetConceptsText);
      const targetHasRoundFace = /\b(?:cara|rostro)s?\s+redond/i.test(targetConceptsText);
      const inputHasSpecificFaceShape = targetHasSquare || targetHasOval || targetHasElongated || targetHasRoundFace;
      const inputAllowsVisagismFaces = inputHasSpecificFaceShape || contextFrame === 'VISAGISM_AESTHETICS' || /\b(?:rostro|cara|facciones|mand[ií]bula|p[oó]mulos|visagismo)\b/i.test(targetConceptsText);
      const faceCheckText = sent.toLowerCase();
      if (!inputAllowsVisagismFaces || inputHasSpecificFaceShape) {
        if (!targetHasElongated && /\b(?:rostros?\s+alargad[oa]s?|caras?\s+alargad[oa]s?|formas\s+ascendentes)\b/i.test(faceCheckText)) {
          continue;
        }
        if (!targetHasSquare && /\b(?:rostros?\s+cuadrad[oa]s?|caras?\s+cuadrad[oa]s?)\b/i.test(faceCheckText)) {
          continue;
        }
        if (!targetHasOval && /\b(?:rostros?\s+ovalad[oa]s?|caras?\s+ovalad[oa]s?)\b/i.test(faceCheckText)) {
          continue;
        }
        if (!targetHasRoundFace && /\b(?:rostros?\s+redond[oa]s?|caras?\s+redond[oa]s?)\b/i.test(faceCheckText)) {
          continue;
        }
      }
      if (/\b\d{2}\s*mm\b/i.test(sent) && !/\b(?:mm|calibre|talla|medida)\b/i.test(targetConceptsText)) continue;
      if (/\best[aá]n\s+disponibles\s+en\s+\d+\s+(?:colores|tonos)\b/i.test(sent)) continue;
      if (/\b(?:rostros?|caras?)\s+pequeñ[oa]s?\b/i.test(faceCheckText) && !/\b(?:rostro|cara)s?\s+pequeñ/i.test(targetConceptsText)) continue;
      if (/\b(?:en esta lista|de esta lista|esta selección|nuestra selección|este ranking|en este post|en este artículo|no sean lo tuyo|no es lo tuyo|bajo tu radar)\b/i.test(sent)) continue;
      if (/\b(?:categoría\s+[0-4]|filtro\s+[0-4]|multicolor(?:es)?)\b/i.test(sent)) continue;
      if (!atoms?.coatings?.length && /\b(?:polarizad[oa]s?|espejad[oa]s?|fotocromátic[oa]s?|lente\s+plana)\b/i.test(sent) && contextFrame !== 'OPTICAL_PROTECTION') {
        continue;
      }
      const decadeMatch = sent.match(/\b(?:(?:años|década\s+de\s+los|los)\s+(20|30|40|50|60|70|80|90)|(20|30|40|50|60|70|80|90)\s*['’]?s)\b/i);
      if (decadeMatch) {
        const dec = decadeMatch[1] || decadeMatch[2];
        const allowsHeritageDecade = (dec === '60' || dec === '70') && (
          contextFrame === 'HERITAGE_ORIGIN' ||
          /\b(?:boho|bohem|vintage|retro|hippie|setenter)\b/i.test(targetConceptsText)
        );
        if (!allowsHeritageDecade && !(atoms?.styles || []).some(s => s.includes(dec))) {
          continue;
        }
      }

      // Reject stray mid-sentence competing brands, acronyms, or two-word proper person names not in input atoms
      const noSlots = sent.replace(/\[SLOT_[A-Z_]+\]/g, 'slotToken');
      const allowedJoined = [...allowedEntityTokens].join(' ');
      if (this.isCompetingBrand(noSlots.toLowerCase(), allowedJoined, [...allowedEntityTokens])) continue;
      const strayAcronymMatch = noSlots.match(/\b(?!(?:UV|XL|XXL|SPF|II|III|IV|XX|XXI|TV|DIY|LED|LCD|HUD|HD)\b)[A-ZÁÉÍÓÚÑ]{2,}\b/g);
      if (strayAcronymMatch && strayAcronymMatch.some(ac => !allowedEntityTokens.has(ac.toLowerCase()))) continue;
      const rawTokens = noSlots.split(/\s+/).filter(Boolean);
      let hasUnlistedMidCap = false;
      for (let i = 1; i < rawTokens.length; i++) {
        const cleanTok = rawTokens[i].replace(/^[("'¡¿«]+|[.,;:!?)»"]+$/g, '');
        const prevTok = rawTokens[i - 1];
        const isAfterStopPunct = /[.!?:¡¿;\-—–«(]$/.test(prevTok);
        const isCapWord = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:-[A-Za-zÁÉÍÓÚÑáéíóúñ]+)?$/.test(cleanTok);
        if (isCapWord && !isAfterStopPunct && !allowedEntityTokens.has(cleanTok.toLowerCase()) && !benignSpanishMidCapRx.test(cleanTok)) {
          hasUnlistedMidCap = true;
          break;
        }
      }
      if (hasUnlistedMidCap) continue;

      const wc = rawTokens.length;
      if (wc < 6 || wc > 58) continue;
      cleanSingles.push({ text: sent, wc, origIdx: sIdx });
    }

    if (!cleanSingles.length) return null;

    const opticalDomainRx = /\b(?:gafas?|monturas?|lentes?|cristales|de\s+sol|solares?|rostro|cara|facciones|mirada|ojos|armazón|varillas?|patillas?|puente|silueta|acetato|pasta|carey|metal|titanio|filtro|uv|polarizad|visagismo|estilismo|estilo|look|outfit|complemento|accesorio|tendencia|diseño|modelo|forma|color|moda)\b|\[SLOT_(?:BRAND|MODEL|FRAME_SHAPE|COMPONENT|MATERIAL|COATING|COLOR|AESTHETIC_STYLE|OCCASION_OUTFIT|FACIAL_FEATURE)\]/i;
    const audiologyWinRx = /\b(?:aud[ií]fonos?|auditiv[oa]s?|audici[oó]n|o[ií]dos?|t[ií]mpano|ac[uú]fenos?|tinnitus|otitis|cerumen|sordera|hipoacusia|v[eé]rtigo|audiometr[ií]a|vestibular|decibelios?|conducto\s+auditivo|aparato\s+auditivo)\b/i;
    const clinicalWinRx = /\b(?:cataratas?|glaucoma|colirio|retin[oa]s?|c[oó]rnea|estrabismo|ambliop[ií]a|ojo\s+vago|conjuntivitis|m[aá]cula|blefaritis|cirug[ií]a\s+refractiva|lasik|queratocono|desprendimiento\s+de\s+retina|oftalm[oó]log\w*|tensi[oó]n\s+ocular|miop[ií]a|astigmatismo|presbicia|optometr\w*|agudeza\s+visual|visi[oó]n|ocular)\b/i;
    const windowDomainMatch = (txt) => {
      if (isAudiologyBrick) return audiologyWinRx.test(txt) || opticalDomainRx.test(txt);
      if (isClinicalBrick) return clinicalWinRx.test(txt) || opticalDomainRx.test(txt);
      return opticalDomainRx.test(txt);
    };

    // Build coherent contiguous multi-sentence windows (1 to 4 adjacent sentences from the SAME human author!)
    const candidates = [];
    const maxRunSents = paragraphMode ? 4 : 2;
    for (let i = 0; i < cleanSingles.length; i++) {
      // First sentence of a standalone paragraph window must NOT start with an orphaned discourse continuation
      if (orphanStartRx.test(cleanSingles[i].text)) continue;

      let accText = cleanSingles[i].text;
      let accWc = cleanSingles[i].wc;
      const lens = [cleanSingles[i].wc];

      if (accWc >= minWords && accWc <= maxWords && windowDomainMatch(accText)) {
        candidates.push({ text: accText, wc: accWc, sentCount: 1, lens: [...lens] });
      }

      for (let k = 1; k < maxRunSents && (i + k) < cleanSingles.length; k++) {
        // Require strict contiguity in the original human paragraph (no skipped sentences!)
        if (cleanSingles[i + k].origIdx !== cleanSingles[i + k - 1].origIdx + 1) break;
        const nextS = cleanSingles[i + k];
        if (accWc + nextS.wc > maxWords) break;
        accText = `${accText} ${nextS.text}`;
        accWc += nextS.wc;
        lens.push(nextS.wc);
        if (accWc >= minWords && accWc <= maxWords && windowDomainMatch(accText)) {
          candidates.push({ text: accText, wc: accWc, sentCount: k + 1, lens: [...lens] });
        }
      }
    }

    if (!candidates.length) {
      const fallback = cleanSingles.find(s => !orphanStartRx.test(s.text) && s.wc >= minWords && s.wc <= maxWords && windowDomainMatch(s.text));
      return fallback ? discourseTopology.cleanOrphanCorrelatives(fallback.text) : null;
    }

    let bestWin = candidates[0];
    let bestWinScore = -999;
    for (const cand of candidates) {
      let sc = -Math.abs(cand.wc - targetWords) * 0.35;
      const slotMatches = cand.text.match(/\[SLOT_[A-Z_]+\]/g) || [];
      sc += Math.min(3, slotMatches.length) * 4;
      if (paragraphMode) {
        if (cand.sentCount >= 2) sc += 14;
        if (cand.sentCount >= 3) sc += 6;
        if (cand.wc >= 42 && cand.wc <= 88) sc += 12;
        const spread = Math.max(...cand.lens) - Math.min(...cand.lens);
        if (cand.sentCount >= 2 && spread >= 8) sc += 6;
      } else {
        if (cand.wc >= 14 && cand.wc <= 30) sc += 6;
      }
      if (/[.!?]$/.test(cand.text)) sc += 2;
      if (sc > bestWinScore) {
        bestWinScore = sc;
        bestWin = cand;
      }
    }
    return discourseTopology.cleanOrphanCorrelatives(bestWin.text);
  }

  applySpanishSlotAgreement(slotType, value, precedingText, localAtoms = null) {
    if (!value) return value;
    const precLower = (precedingText || '').toLowerCase();

    if (slotType === 'SLOT_FRAME_SHAPE') {
      // Guardia de geometría facial: nunca inyectar la forma de la montura (ej. "cuadrada" o "aviador") como forma de cara/rostro;
      // aplicar regla óptica de contraste de visagismo entre montura y rostro.
      if (/\b(?:cara|rostro|facciones|fisonom[ií]a)(?:\s+(?:es|son|sea|resulta|parece|algo|muy|m[aá]s|bien|tan|bastante)){0,2}\s*$/i.test(precLower)) {
        const isMasculineRostro = /\brostro\b/i.test(precLower);
        const isPluralFacciones = /\bfacciones\b/i.test(precLower);
        const frameShapesStr = (localAtoms?.shapes || []).join(' ').toLowerCase();
        let stem = 'ovalad';
        if (/\b(?:cuadrad|rectangul|geom[eé]tric)/.test(frameShapesStr)) {
          stem = 'redondead';
        } else if (/\b(?:redond|ovalad)/.test(frameShapesStr)) {
          stem = 'angulos';
        }

        if (isPluralFacciones) return `${stem}as`;
        return `${stem}${isMasculineRostro ? 'o' : 'a'}`;
      }

      const valLower = (value || '').toLowerCase();
      let shapeDef = null;
      for (const def of Object.values(FRAME_SHAPE_ONTOLOGY)) {
        if (def.detectRx.test(valLower) || def.canonical.toLowerCase() === valLower || def.key === valLower) {
          shapeDef = def;
          break;
        }
      }
      if (shapeDef) {
        const adjPluralMap = {
          redonda: 'redondas',
          cuadrada: 'cuadradas',
          ovalada: 'ovaladas',
          rectangular: 'rectangulares',
          geometrica: 'geométricas'
        };
        if (/\b(?:lentes|cristales)\s*$/i.test(precLower)) {
          if (shapeDef.key === 'aviador') return 'de corte aviador';
          if (shapeDef.key === 'corazon') return 'con forma de corazón';
          if (adjPluralMap[shapeDef.key]) return adjPluralMap[shapeDef.key];
        }
        if (/\b(?:gafas|monturas)(?:\s+de\s+sol)?\s*$/i.test(precLower)) {
          if (shapeDef.key === 'corazon') return 'con forma de corazón';
          if (adjPluralMap[shapeDef.key]) return adjPluralMap[shapeDef.key];
          return `de ${shapeDef.slotPhrase}`;
        }
        if (/\b(?:modelo|diseño)\s*$/i.test(precLower)) {
          if (shapeDef.key === 'aviador') return 'de corte aviador';
        }
        if (/\b(?:de\s+estilo|estilo|de\s+corte|corte|de\s+tipo|tipo)\s*$/i.test(precLower)) {
          const mascMap = {
            redonda: 'redondo',
            cuadrada: 'cuadrado',
            ovalada: 'ovalado',
            rectangular: 'rectangular',
            geometrica: 'geométrico',
            aviador: 'aviador',
            corazon: 'corazón'
          };
          return mascMap[shapeDef.key] || shapeDef.canonical;
        }
        if (/\b(?:de\s+silueta|silueta|de\s+forma|forma)(?:\s+de)?\s*$/i.test(precLower)) {
          return shapeDef.key === 'corazon' ? 'corazón' : (shapeDef.key === 'aviador' ? 'aviador' : shapeDef.canonical);
        }
        if (/\b(?:estas|esas|unas|las|aquellas)\s*$/i.test(precLower)) {
          if (shapeDef.key === 'aviador') return 'monturas estilo aviador';
          if (shapeDef.key === 'corazon') return 'monturas con forma de corazón';
          return `monturas ${adjPluralMap[shapeDef.key] || `${shapeDef.canonical}s`}`;
        }
        if (/\b(?:más|muy|tan|menos|bastante|algo|poco|ligeramente|o|y)\s*$/i.test(precLower)) {
          if (shapeDef.key === 'aviador') return 'de estilo aviador';
          if (shapeDef.key === 'corazon') return 'con forma de corazón';
          const isPluralCtx = /\b(?:monturas|gafas|lentes|formas|líneas|facciones|son|están|lucen|quedan|resultan)\b/i.test(precLower);
          if (isPluralCtx && adjPluralMap[shapeDef.key]) return adjPluralMap[shapeDef.key];
          if (/\b(?:rostro|perfil)\b/i.test(precLower)) {
            const mascAdj = { redonda: 'redondo', cuadrada: 'cuadrado', ovalada: 'ovalado', rectangular: 'rectangular', geometrica: 'geométrico' };
            return mascAdj[shapeDef.key] || shapeDef.canonical;
          }
          return shapeDef.canonical;
        }
        if (/\b(?:con|en|de|su\s+forma)\s*$/i.test(precLower)) {
          return shapeDef.key === 'corazon' ? 'forma de corazón' : (shapeDef.key === 'aviador' ? 'aviador' : shapeDef.slotPhrase);
        }
        return shapeDef.slotPhrase;
      }
      return this.adjustAgreement(value, precedingText);
    }

    if (slotType === 'SLOT_AESTHETIC_STYLE') {
      // Avoid "Durante los vintage", "los años vintage", "de años 70", or NP "años 70" in adjectival position ("Diseño años 70", "muy años 70")
      if (/\b(?:años|década\s+de\s+los)\s*$/i.test(precLower)) {
        return '70';
      }
      if (/\bde\s*$/i.test(precLower) && /^años\s+70$/i.test(value)) {
        return 'los años 70';
      }
      if (/\b(?:durante\s+los|en\s+los|de\s+los|desde\s+los|para\s+los|entre\s+los|los)\s*$/i.test(precLower)) {
        const explicitDecade = localAtoms?.styles?.find(s => /^años\s+\d+$/i.test(s));
        if (explicitDecade && /^años\s+\d+$/i.test(value)) return explicitDecade;
        if (/^atemporal$/i.test(value)) return 'diseños clásicos';
        return `diseños de estilo ${value}`;
      }
      if (/^años\s+70$/i.test(value) && !/\b(?:los|esos|aquellos|estos|de)\s*$/i.test(precLower)) {
        const adjStyle = localAtoms?.styles?.find(s => !/años\s+70/i.test(s)) || 'vintage';
        value = adjStyle;
      }
      if (/\b(?:un|este|ese|el|su|todo\s+un)\s*$/i.test(precLower)) {
        if (/^(vintage|retro|artesanal|atemporal|clásico|boho\s*chic|bohemi[oa]|hippie|setentero)$/i.test(value)) {
          return `aire ${value}`;
        }
      }
      if (/\b(?:muy|tan|más|bastante|sumamente)\s*$/i.test(precLower)) {
        if (/^(boho\s*chic|bohemi[oa]s?|vintage|retro|hippie|años\s+70)$/i.test(value)) {
          if (/\b(?:son|resultan|gafas|monturas|piezas|opciones|ligeras|siluetas|formas|líneas|lentes)\b/i.test(precLower)) {
            return 'favorecedoras';
          }
          if (/\bestilismos\s+m[aá]s\s*$/i.test(precLower)) {
            return 'sencillos';
          }
          if (/\b(?:los|unos|estos|esos|estilismos|looks|modelos|diseños|cortes|complementos|accesorios|tonos|aires)\b/i.test(precLower)) {
            return 'favorecedores';
          }
          if (/\b(?:la|una|esta|esa|montura|gafa|pieza|opción|silueta|estética|forma|línea)\b/i.test(precLower)) {
            return 'favorecedora';
          }
          return 'favorecedor';
        }
      }
      if (/\b(?:gustos|aires|toques|modelos|estilismos|cortes|diseños|detalles|acentos)\s*$/i.test(precLower)) {
        if (/^bohemi[oa]s?$/i.test(value)) return 'bohemios';
        if (/^clásic[oa]s?$/i.test(value)) return 'clásicos';
        if (/^setenter[oa]s?$/i.test(value)) return 'setenteros';
        if (/^(artesanal|atemporal)$/i.test(value)) return `${value}es`;
      }
      if (/\b(?:opiniones|opciones|alternativas|propuestas|gafas|monturas|lentes|siluetas|formas|líneas|piezas)\b/i.test(precLower) &&
          !/\b(?:un|el|este|ese|estilo|aire|toque|modelo|diseño|formato|look|enfoque|carácter)\s*$/i.test(precLower)) {
        if (/^clásic[oa]s?$/i.test(value)) return 'clásicas';
        if (/^bohemi[oa]s?$/i.test(value)) return 'bohemias';
        if (/^setenter[oa]s?$/i.test(value)) return 'setenteras';
        if (/^modern[oa]s?$/i.test(value)) return 'modernas';
        if (/^(?:atemporal|artesanal|versátil|original|actual|tradicional)$/i.test(value)) return `${value.toLowerCase()}es`;
      }
      if (/\b(?:son|resultan|parecen)\s+(?:las|los)\s+(?:m[aá]s|menos|tan)\s*$/i.test(precLower)) {
        if (/^(?:atemporal|artesanal|versátil|original|actual|tradicional)$/i.test(value)) return `${value.toLowerCase()}es`;
        if (/^(?:clásic|bohemi|setenter|modern)[oa]$/i.test(value)) {
          return /\blas\s+(?:m[aá]s|menos|tan)\s*$/i.test(precLower) ? value.replace(/[oa]$/i, 'as') : value.replace(/[oa]$/i, 'os');
        }
      }
      if (/^(bohemio|clásico|setentero)$/i.test(value)) {
        if (/\b(?:silueta|montura|gafa|pieza|forma|línea|estética|opción|alternativa|propuesta)\b/i.test(precLower) &&
            !/\b(?:un|el|este|ese|estilo|aire|toque|modelo|diseño|formato|look|enfoque|carácter)\s*$/i.test(precLower)) {
          return value.replace(/o$/i, 'a');
        }
      }
      return value;
    }

    if (slotType === 'SLOT_OCCASION_OUTFIT') {
      if (/\beste\s*$/i.test(precLower) && localAtoms?.temporal_occasions?.length) {
        const matchedTemp = localAtoms.temporal_occasions.find(t => /^(?:verano|oto[ñn]o|invierno|d[ií]a)$/i.test(t));
        if (matchedTemp) value = matchedTemp;
      } else if (/\b(?:con|junto\s+a|combinar(?:las|los)?\s+con)\s*$/i.test(precLower) && localAtoms?.garment_pairings?.length) {
        value = localAtoms.garment_pairings[0];
      }
      const valLower = value.toLowerCase();
      // Subcategorization: locative context must receive a location rather than a garment NP
      if (/\b(?:ir\s+a\s+la|salir\s+a\s+la|pasear\s+por\s+la|recorrer\s+la|en\s+la)\s*$/i.test(precLower)) {
        if (/^(?:vestidos|prendas|encajes|lino|cuero|verano|invierno|otoño|diario|paseo|campo|d[ií]a)/i.test(valLower)) {
          return valLower.includes('pasarela') ? 'pasarela' : 'ciudad';
        }
      }
      if (/\b(?:tu|su|un|este|ese|el)\s*$/i.test(precLower)) {
        if (/\b(?:tu|su|nuestro|mi)\s*$/i.test(precLower) &&
            /^(?:ciudad|lino|algod[oó]n|cuero|verano|invierno|oto[ñn]o|primavera|diario|playa|oficina|paseo|campo)$/.test(valLower)) {
          return 'día a día';
        }
        if (/^(?:[a-záéíóúüñ]+(?:as|os|es)|ciudad|playa|oficina|pasarela|fiesta|ropa|moda)$/i.test(valLower)) {
          return `estilo de ${valLower}`;
        }
      }
      if (/\b(?:la|una|esta|esa)\s*$/i.test(precLower)) {
        if (/^[a-záéíóúüñ]{4,}as(?:\s+de\s+[a-záéíóúüñ]+)?$/i.test(valLower)) {
          return valLower.replace(/^([a-záéíóúüñ]{3,})as\b/i, '$1a');
        }
        if (/^[a-záéíóúüñ]{4,}(?:os|es)\b/i.test(valLower)) {
          return `opción de ${valLower}`;
        }
      }
      if (/\b(?:para|de|en)\s*$/i.test(precLower)) {
        if (value === 'ciudad') return 'la ciudad';
        if (value === 'playa') return 'la playa';
        if (value === 'oficina') return 'la oficina';
        if (value === 'paseo') return 'cualquier paseo';
      }
      if (/\b(?:con|junto\s+a)\s*$/i.test(precLower)) {
        if (value === 'ciudad') return 'estilismos urbanos';
        if (value === 'paseo') return 'prendas relajadas de paseo';
        if (value === 'verano') return 'conjuntos de verano';
        if (value === 'diario') return 'estilismos de diario';
        if (value === 'fiestas') return 'looks de fiesta';
      }
      return value;
    }

    if (slotType === 'SLOT_BRAND') {
      if (/\b(?:la\s+firma|la\s+marca|la\s+casa)\s*$/i.test(precLower)) {
        return value.split(/\s+/)[0];
      }
    }

    if (slotType === 'SLOT_MATERIAL') {
      if (/\b(?:gafas|monturas|armaz[oó]n|lentes)\s*$/i.test(precLower) && !/^de\s+/i.test(value)) {
        return `de ${value}`;
      }
      return value;
    }

    if (slotType === 'SLOT_COMPONENT') {
      const valClean = String(value || '').trim().toLowerCase();
      const validOpticNouns = /^(?:puente|varillas?|patillas?|lentes?|cristales?|monturas?|armaz[oó]n|frente|plaquetas?|bisagras?|gafas?|aros?)$/;
      if (valClean && validOpticNouns.test(valClean)) {
        if (/\b(?:las|unas|estas|esas|aquellas)\s*$/i.test(precLower) && !/^(?:monturas|varillas|patillas|gafas|plaquetas|bisagras)$/.test(valClean)) {
          return 'monturas';
        }
        if (/\b(?:los|unos|estos|esos|aquellos)\s*$/i.test(precLower) && !/^(?:cristales|lentes|aros)$/.test(valClean)) {
          return 'cristales';
        }
        if (/\b(?:la|una|esta|esa|aquella)\s*$/i.test(precLower) && !/^(?:montura|gafa|lente|varilla|patilla|plaqueta|bisagra)$/.test(valClean)) {
          return 'montura';
        }
        if (/\b(?:el|un|este|ese|aquel)\s*$/i.test(precLower) && !/^(?:armaz[oó]n|puente|frente|cristal|aro)$/.test(valClean)) {
          return 'armazón';
        }
        if (/\b\d+\s*$/i.test(precLower) && !valClean.endsWith('s')) {
          return valClean === 'armazón' ? 'armazones' : `${valClean}s`;
        }
        return value;
      }
      if (/\b(?:los|unos|estos|esos|aquellos)\s*$/i.test(precLower)) return 'cristales';
      if (/\b(?:las|unas|estas|esas|aquellas)\s*$/i.test(precLower)) return 'monturas';
      if (/\b(?:el|un|este|ese|aquel)\s*$/i.test(precLower)) return 'armazón';
      return 'montura';
    }

    if (slotType === 'SLOT_COATING') {
      const vTrim = String(value || '').trim();
      if (/\bcristales(?:\s+(?:solares|minerales|org[aá]nicos))?\s*$/i.test(precLower)) {
        return vTrim.replace(/\b([a-záéíóúüñ]{4,}(?:ad|id|ic|iv|ud|nd))[ao]s?\b/gi, '$1os');
      }
      if (/\b(?:gafas|lentes)(?:\s+(?:de\s+sol|solares))?\s*$/i.test(precLower)) {
        return vTrim.replace(/\b([a-záéíóúüñ]{4,}(?:ad|id|ic|iv|ud|nd))[ao]s?\b/gi, '$1as');
      }
      return vTrim;
    }

    return value;
  }

  fillSlotsInBrick(brick, atoms, contextFrame = 'GENERAL_STYLE', tuple = null, rawPara = '') {
    if (!brick) return '';
    const mergedAtoms = tuple?.clauseAtoms ? {
      brand_models: tuple.clauseAtoms.brand_models?.length ? tuple.clauseAtoms.brand_models : (atoms?.brand_models || []),
      proper_entities: tuple.clauseAtoms.proper_entities?.length ? tuple.clauseAtoms.proper_entities : (atoms?.proper_entities || []),
      shapes: tuple.clauseAtoms.shapes?.length ? tuple.clauseAtoms.shapes : (atoms?.shapes || []),
      styles: tuple.clauseAtoms.styles?.length ? tuple.clauseAtoms.styles : (atoms?.styles || []),
      materials: tuple.clauseAtoms.materials?.length ? tuple.clauseAtoms.materials : (atoms?.materials || []),
      outfits: tuple.clauseAtoms.outfits?.length ? tuple.clauseAtoms.outfits : (atoms?.outfits || []),
      garment_pairings: tuple.clauseAtoms.garment_pairings?.length ? tuple.clauseAtoms.garment_pairings : (atoms?.garment_pairings || []),
      temporal_occasions: tuple.clauseAtoms.temporal_occasions?.length ? tuple.clauseAtoms.temporal_occasions : (atoms?.temporal_occasions || []),
      locative_scenes: tuple.clauseAtoms.locative_scenes?.length ? tuple.clauseAtoms.locative_scenes : (atoms?.locative_scenes || []),
      coatings: tuple.clauseAtoms.coatings?.length ? tuple.clauseAtoms.coatings : (atoms?.coatings || []),
      key_concepts: tuple.clauseAtoms.key_concepts?.length ? tuple.clauseAtoms.key_concepts : (atoms?.key_concepts || []),
      relations: atoms?.relations || tuple.clauseAtoms.relations || []
    } : (atoms || {});

    const selectedWindow = brick._cleanWindow || this.extractCleanDonorWindow(brick, 60, contextFrame, mergedAtoms, { rawPara, articleMacroStyle: brick._articleMacroStyle });
    let skeleton = selectedWindow || this.sanitizeDonorSkeleton(
      this.cleanScrapingArtifacts(brick.syntactic_skeleton || brick.raw_text || brick.text || ''),
      brick.raw_text || brick.text || '',
      contextFrame,
      mergedAtoms,
      rawPara
    );

    if (!selectedWindow && skeleton.split(/\s+/).filter(Boolean).length > 96) {
      const words = skeleton.split(/\s+/).filter(Boolean).slice(0, 86).join(' ');
      skeleton = this.repairTruncatedTail(words);
    }

    const rawLower = String(rawPara || '').toLowerCase();
    const rejectsLoudColors = /\b(?:descartar|evitar|nada\s+de|no\s+le\s+van)\b[^.]{0,75}\b(?:fluorescentes|estridentes|brillantes|llamativos|artificiales)\b/i.test(rawLower);
    const wantsEarthPalette = /\b(?:carey|tierra|marr[oó]n|marrones|c[aá]lid[oa]s?|neutr[oa]s?|[aá]mbar|ocre)\b/i.test(rawLower);

    const typeUseCount = {};
    const splitMaterials = (mergedAtoms.materials || [])
      .flatMap(m => String(m || '').split(/\s*,\s*/))
      .map(s => s.trim())
      .filter(Boolean);
    let matSlotVal = splitMaterials.length ? splitMaterials[0] : null;
    if (matSlotVal && /^carey$/i.test(matSlotVal.trim()) && /\b(?:algod[oó]n|celulosa|tipo\s+de\s+material|material\s+llamado|l[aá]minas\s+de)\b/i.test(skeleton)) {
      matSlotVal = 'acetato';
    }
    const normalizedMaterials = matSlotVal ? [matSlotVal, ...splitMaterials.slice(1)] : [];
    const atomLists = {
      'SLOT_BRAND': mergedAtoms.brand_models || [],
      'SLOT_MODEL': mergedAtoms.brand_models || [],
      'SLOT_FRAME_SHAPE': mergedAtoms.shapes || [],
      'SLOT_MATERIAL': normalizedMaterials,
      'SLOT_COATING': mergedAtoms.coatings || [],
      'SLOT_AESTHETIC_STYLE': mergedAtoms.styles || [],
      'SLOT_OCCASION_OUTFIT': mergedAtoms.outfits || []
    };

    const allowedBrandsLow = new Set((mergedAtoms.brand_models || []).map(b => String(b).toLowerCase()));
    const isCompatibleRawSlotValue = (slotType, rawVal) => {
      const rv = String(rawVal || '').trim();
      if (!rv || rv.length > 34) return false;
      if (slotType === 'SLOT_BRAND' || slotType === 'SLOT_MODEL') {
        return allowedBrandsLow.has(rv.toLowerCase());
      }
      if (/\b(?:tous|furla|guess|chopard|swarovski|longchamp|oakley|carrera|persol|ray-ban|prada|gucci|chlo[eé]|dior|tom ford|kenzo|lozza|hanukeii)\b/i.test(rv)) {
        return [...allowedBrandsLow].some(b => rv.toLowerCase().includes(b));
      }
      if (slotType === 'SLOT_FRAME_SHAPE') {
        if (!mergedAtoms.shapes?.length) {
          return /\b(?:redondead|cl[aá]sic|fin[oa]s?|liger[oa]s?|minimalist|sencill)\b/i.test(rv);
        }
        return this.isShapeCompatible(rv, mergedAtoms.shapes);
      }
      if (slotType === 'SLOT_MATERIAL' && mergedAtoms.materials?.length) {
        const reqMatStr = mergedAtoms.materials.join(' ').toLowerCase();
        const reqAcetate = /\b(?:acetato|pasta|celulosa)\b/.test(reqMatStr) && !/\b(?:metal|titanio|acero|bronce|oro)\b/.test(reqMatStr);
        const reqMetal = /\b(?:metal|titanio|acero|bronce|oro)\b/.test(reqMatStr) && !/\b(?:acetato|pasta|celulosa)\b/.test(reqMatStr);
        if (reqAcetate && /\b(?:metal|met[aá]lic|titanio|acero)\b/i.test(rv)) return false;
        if (reqMetal && /\b(?:acetato|pasta)\b/i.test(rv)) return false;
      }
      if (slotType === 'SLOT_COATING' && !(mergedAtoms.coatings?.length)) {
        if (/\b(?:graduad|antireflejant|polarizad|espejad|fotocrom|blue\s*block)\b/i.test(rv)) return false;
      }
      if (slotType === 'SLOT_COLOR' && (rejectsLoudColors || wantsEarthPalette)) {
        if (/\b(?:ne[oó]n|fosforit|fl[uú]or|fucsia|estridente|llamativ|amarill|violeta|lila|naranja|rosa|turquesa)\b/i.test(rv)) return false;
      }
      if (slotType === 'SLOT_COLOR' && (contextFrame === 'PRODUCT_FACTUAL' || (mergedAtoms.brand_models && mergedAtoms.brand_models.length > 0))) {
        if (/\b(?:carey|havana|habana)\b/i.test(rv) && !/\b(?:carey|havana|habana)\b/i.test(rawLower)) {
          return false;
        }
      }
      if (slotType === 'SLOT_MEASURE' && /\b\d+\s*mm\b|\bcalibre\b/i.test(rv) && !/\b(?:calibre|talla|mm|medida)\b/i.test(rawLower)) {
        return false;
      }
      return true;
    };

    const neutralDefaults = {
      SLOT_BRAND: 'la firma',
      SLOT_MODEL: 'este modelo',
      SLOT_FRAME_SHAPE: 'silueta equilibrada',
      SLOT_MATERIAL: 'acetato seleccionado',
      SLOT_COMPONENT: 'montura',
      SLOT_COATING: 'de sol',
      SLOT_AESTHETIC_STYLE: 'atemporal',
      SLOT_OCCASION_OUTFIT: 'cualquier ocasión',
      SLOT_PROPERTY: 'ligereza',
      SLOT_TECHNIQUE: 'acabado artesanal',
      SLOT_FACIAL_FEATURE: 'rostro',
      SLOT_COLOR: 'tono equilibrado',
      SLOT_MEASURE: 'protección solar'
    };

    const neutralUseCount = {};
    const resolveNeutralForSlot = (slotType, preceding) => {
      const nCount = neutralUseCount[slotType] || 0;
      neutralUseCount[slotType] = nCount + 1;
      let val = neutralDefaults[slotType] || 'diseño';
      if (slotType === 'SLOT_MATERIAL') {
        val = nCount % 2 === 0 ? 'pasta seleccionada' : 'acabado artesanal';
      } else if (slotType === 'SLOT_COATING' && /\bde\s+sol\s*$/i.test(preceding)) {
        val = 'con filtro solar';
      } else if (slotType === 'SLOT_COLOR') {
        val = /\b(?:en|de|con|por|un)\s*$/i.test(preceding) ? 'tono equilibrado' : 'en tono equilibrado';
      } else if (slotType === 'SLOT_FRAME_SHAPE') {
        if (/\b(?:formas|l[ií]neas|siluetas)\s*$/i.test(preceding)) {
          val = 'clásicas';
        } else if (/\b(?:estilo|corte|tipo|formato)\s*$/i.test(preceding)) {
          val = 'clásico';
        } else if (/\b(?:ligeramente|algo|bastante|muy|tan|m[aá]s|menos)\s*$/i.test(preceding)) {
          val = 'estilizadas';
        } else if (nCount >= 1) {
          val = 'de líneas suaves';
        } else {
          val = /\b(?:de|con|por|en|su|la|una)\s*$/i.test(preceding) ? 'silueta equilibrada' : 'de silueta equilibrada';
        }
      }
      return this.applySpanishSlotAgreement(slotType, val, preceding, mergedAtoms);
    };

    const styleSynonyms = {
      'vintage': ['retro', 'atemporal', 'clásico'],
      'retro': ['vintage', 'atemporal', 'clásico'],
      'boho chic': ['bohemio', 'setentero', 'hippie'],
      'bohemio': ['boho chic', 'artesanal', 'hippie'],
      'bohemia': ['boho chic', 'artesanal', 'retro'],
      'hippie': ['bohemio', 'setentero', 'retro'],
      'artesanal': ['cuidado', 'atemporal', 'clásico'],
      'atemporal': ['clásico', 'versátil', 'retro']
    };
    const resolveDeduplicatedStyle = (rawStyle, fullSkeletonSoFar, prec) => {
      if (!rawStyle) return rawStyle;
      const curSentBefore = (prec || '').split(/[.!?]\s+/).pop() || '';
      const hasSecondStyleInSent = /\[SLOT_AESTHETIC_STYLE\]/i.test((fullSkeletonSoFar.slice(fullSkeletonSoFar.indexOf('[SLOT_AESTHETIC_STYLE]') + 22).split(/[.!?]/)[0] || ''));
      if (/\ben\s+tendencia\s+y\s*$/i.test(prec || '') && hasSecondStyleInSent) {
        return /\b(?:prendas|líneas|siluetas|gafas|monturas|piezas|opciones)\b/i.test(curSentBefore) && !/\b(?:looks|estilismos|conjuntos)\b/i.test(curSentBefore)
          ? 'actuales'
          : 'desenfadados';
      }
      const stLow = String(rawStyle).trim().toLowerCase();
      const tailBefore = fullSkeletonSoFar.slice(0, fullSkeletonSoFar.indexOf('[SLOT_AESTHETIC_STYLE]')).toLowerCase();
      const sameSentDup = curSentBefore.toLowerCase().includes(stLow);
      if (sameSentDup) {
        const alts = styleSynonyms[stLow] || [];
        const unused = alts.find(a => !tailBefore.includes(a));
        if (unused) return unused;
      }
      return rawStyle;
    };

    let usedGarmentPairingInSlot = false;
    const resolveRelationalOutfitCandidate = (defaultVal, prec) => {
      if (/\beste\s*$/i.test(prec || '') && mergedAtoms.temporal_occasions?.length) {
        return mergedAtoms.temporal_occasions.find(t => /^(?:verano|oto[ñn]o|invierno|d[ií]a)$/i.test(t)) || defaultVal;
      }
      if (/\b(?:con|junto\s+a|combinar(?:las|los)?\s+con)\s*$/i.test(prec || '') && mergedAtoms.garment_pairings?.length) {
        usedGarmentPairingInSlot = true;
        return mergedAtoms.garment_pairings[0];
      }
      return defaultVal;
    };

    const extractSlotFollowingClause = (text, startPos) => {
      const rawTail = text.slice(startPos, startPos + 90);
      const cutIdx = rawTail.search(/[.!?]/);
      return cutIdx >= 0 ? rawTail.slice(0, cutIdx) : rawTail;
    };

    const getScopedSlotList = (slotName, preceding, following = '') => {
      const baseList = atomLists[slotName] || [];
      const sp = mergedAtoms.signedPolarity;
      if (!sp) return baseList;
      const slotScope = factualGuard.detectDonorSlotPolarity(preceding, following);
      if (slotName === 'SLOT_OCCASION_OUTFIT') {
        if (slotScope === 'NEGATIVE') {
          return sp.negativeContexts || [];
        }
        const negOnly = new Set((sp.negativeContexts || []).filter(c => !(sp.positiveContexts || []).includes(c)));
        return baseList.filter(v => !negOnly.has(String(v || '').toLowerCase()));
      }
      if (slotName === 'SLOT_MATERIAL') {
        if (slotScope === 'NEGATIVE') {
          return sp.negativeMaterials || [];
        }
        const negMatOnly = new Set((sp.negativeMaterials || []).filter(m => !(sp.positiveMaterials || []).includes(m)));
        return baseList.filter(v => !negMatOnly.has(String(v || '').toLowerCase()));
      }
      return baseList;
    };

    const usedMaterialFamilies = new Set();
    const getMaterialFamilyTag = (val) => {
      const low = String(val || '').trim().toLowerCase();
      if (/^(?:acetato|pasta|celulosa|ecoacetato|propionato)\b/i.test(low)) return 'ACETATE_CELLULOSE';
      if (/^(?:metal|met[aá]lic|acero|titanio|aluminio|bronce|oro)\b/i.test(low)) return 'METAL_ALLOY';
      if (/^(?:madera|bamb[uú]|cuerno|asta)\b/i.test(low)) return 'NATURAL_ORGANIC';
      return low;
    };
    const isRxSolarMismatch = (slotType, candidateVal, precText, rawSlotVal = '') => {
      if (slotType !== 'SLOT_COATING') return false;
      const isRxDesignVal = /\b(?:ocupacional(?:es)?|progresiv[oa]s?|monofocal(?:es)?|bifocal(?:es)?)\b/i.test(String(candidateVal || ''));
      if (!isRxDesignVal) return false;
      return /\bgafas\s+de\s+sol\s*$/i.test(precText || '') ||
        /\bcristales\s+solares\s*$/i.test(precText || '') ||
        /\b(?:polarizad|fotocrom|espejad|degradad|uv\s*400)\b/i.test(String(rawSlotVal || ''));
    };

    if (brick.slots && brick.slots.length) {
      for (const slot of brick.slots) {
        const slotTag = `[${slot.slot_type}]`;
        if (!skeleton.includes(slotTag)) continue;

        // Guard against false-positive slot tagging of "al aire libre"
        if (slot.slot_type === 'SLOT_FRAME_SHAPE' && slot.raw_value === 'al aire') {
          const escapedTag = slotTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`${escapedTag}\\s+libre\\b`, 'i').test(skeleton)) {
            skeleton = skeleton.replace(slotTag, slot.raw_value);
            continue;
          }
        }

        const idx = skeleton.indexOf(slotTag);
        const preceding = skeleton.slice(Math.max(0, idx - 65), idx);
        const following = extractSlotFollowingClause(skeleton, idx + slotTag.length);

        // Preserve fixed idiom "alma metálica" rather than overwriting internal metal wire with frame material
        if (slot.slot_type === 'SLOT_MATERIAL' && /\balma\s*$/i.test(preceding)) {
          skeleton = skeleton.replace(slotTag, 'metálica');
          usedMaterialFamilies.add('METAL_ALLOY');
          continue;
        }

        const slotScope = factualGuard.detectDonorSlotPolarity(preceding, following);
        const slotList = getScopedSlotList(slot.slot_type, preceding, following);
        const useIdx = typeUseCount[slot.slot_type] || 0;

        let chosenCandidate = slotList[useIdx] || null;
        if (chosenCandidate && slot.slot_type === 'SLOT_MATERIAL') {
          const candFam = getMaterialFamilyTag(chosenCandidate);
          if (usedMaterialFamilies.has(candFam)) {
            const altMat = slotList.slice(useIdx + 1).find(m => !usedMaterialFamilies.has(getMaterialFamilyTag(m)));
            chosenCandidate = altMat || null;
          }
        }

        if (chosenCandidate) {
          if (isRxSolarMismatch(slot.slot_type, chosenCandidate, preceding, slot.raw_value)) {
            const cleanOrig = String(slot.raw_value || '').trim();
            const safePreserved = (cleanOrig && !/\b(?:tous|furla|guess|ray-ban|oakley|persol|gucci|prada|chlo[eé])\b/i.test(cleanOrig))
              ? cleanOrig
              : 'de sol';
            skeleton = skeleton.replace(slotTag, safePreserved);
            continue;
          }
          let chosenBase = chosenCandidate;
          if (slot.slot_type === 'SLOT_AESTHETIC_STYLE') {
            chosenBase = resolveDeduplicatedStyle(chosenBase, skeleton, preceding);
          } else if (slot.slot_type === 'SLOT_OCCASION_OUTFIT') {
            chosenBase = resolveRelationalOutfitCandidate(chosenBase, preceding);
          }
          const replacementVal = this.applySpanishSlotAgreement(
            slot.slot_type,
            chosenBase,
            preceding,
            mergedAtoms
          );
          skeleton = skeleton.replace(slotTag, replacementVal);
          if (slot.slot_type === 'SLOT_MATERIAL') {
            usedMaterialFamilies.add(getMaterialFamilyTag(replacementVal));
          }
          if (chosenBase === slotList[useIdx]) {
            typeUseCount[slot.slot_type] = useIdx + 1;
          }
        } else {
          let rep = null;
          const avoidDuplicateCarey = slot.slot_type === 'SLOT_COLOR' && /\bcarey\b/i.test(preceding) && /\bcarey\b/i.test(String(slot.raw_value || ''));
          const rawLow = String(slot.raw_value || '').toLowerCase();
          const violatesSignedScope = slot.slot_type === 'SLOT_OCCASION_OUTFIT' && slotScope === 'NEGATIVE' &&
            (mergedAtoms.signedPolarity?.positiveContexts || []).some(pc => !((mergedAtoms.signedPolarity?.negativeContexts || []).includes(pc)) && rawLow.includes(pc));
          const dupMatFamily = slot.slot_type === 'SLOT_MATERIAL' && usedMaterialFamilies.has(getMaterialFamilyTag(slot.raw_value));
          if (!avoidDuplicateCarey && !violatesSignedScope && !dupMatFamily && isCompatibleRawSlotValue(slot.slot_type, slot.raw_value)) {
            let naturalRaw = String(slot.raw_value).trim();
            if (/\bde\s*$/i.test(preceding) && /^de\s+/i.test(naturalRaw)) {
              naturalRaw = naturalRaw.replace(/^de\s+/i, '');
            }
            if (slot.slot_type === 'SLOT_AESTHETIC_STYLE') {
              naturalRaw = resolveDeduplicatedStyle(naturalRaw, skeleton, preceding);
            } else if (slot.slot_type === 'SLOT_OCCASION_OUTFIT') {
              naturalRaw = resolveRelationalOutfitCandidate(naturalRaw, preceding);
            }
            rep = this.applySpanishSlotAgreement(slot.slot_type, naturalRaw, preceding, mergedAtoms);
          } else if (slotScope === 'NEGATIVE' && slot.slot_type === 'SLOT_OCCASION_OUTFIT') {
            rep = (mergedAtoms.signedPolarity?.negativeContexts || [])[0] || 'usos inadecuados';
          } else if (slot.slot_type === 'SLOT_MATERIAL' && usedMaterialFamilies.size > 0) {
            rep = 'acabado artesanal';
          } else {
            rep = resolveNeutralForSlot(slot.slot_type, preceding);
          }
          if (slot.slot_type === 'SLOT_MATERIAL') {
            usedMaterialFamilies.add(getMaterialFamilyTag(rep));
          }
          skeleton = skeleton.replace(slotTag, rep);
        }
      }
    }

    // Replace any remaining unmapped slot markers safely with context-aware neutral defaults
    skeleton = skeleton.replace(/\[(SLOT_[A-Z_]+)\]/g, (full, slotName, offset) => {
      const preceding = skeleton.slice(Math.max(0, offset - 65), offset);
      const following = extractSlotFollowingClause(skeleton, offset + full.length);
      if (slotName === 'SLOT_MATERIAL' && /\balma\s*$/i.test(preceding)) {
        usedMaterialFamilies.add('METAL_ALLOY');
        return 'metálica';
      }
      const slotScope = factualGuard.detectDonorSlotPolarity(preceding, following);
      const slotList = getScopedSlotList(slotName, preceding, following);
      const useIdx = typeUseCount[slotName] || 0;
      let chosenCandidate = slotList[useIdx] || null;
      if (chosenCandidate && slotName === 'SLOT_MATERIAL') {
        const candFam = getMaterialFamilyTag(chosenCandidate);
        if (usedMaterialFamilies.has(candFam)) {
          chosenCandidate = slotList.slice(useIdx + 1).find(m => !usedMaterialFamilies.has(getMaterialFamilyTag(m))) || null;
        }
      }
      if (chosenCandidate) {
        if (isRxSolarMismatch(slotName, chosenCandidate, preceding)) {
          return 'de sol';
        }
        let chosenBase = chosenCandidate;
        if (slotName === 'SLOT_AESTHETIC_STYLE') {
          chosenBase = resolveDeduplicatedStyle(chosenBase, skeleton, preceding);
        } else if (slotName === 'SLOT_OCCASION_OUTFIT') {
          chosenBase = resolveRelationalOutfitCandidate(chosenBase, preceding);
        }
        if (chosenBase === slotList[useIdx]) {
          typeUseCount[slotName] = useIdx + 1;
        }
        const applied = this.applySpanishSlotAgreement(slotName, chosenBase, preceding, mergedAtoms);
        if (slotName === 'SLOT_MATERIAL') {
          usedMaterialFamilies.add(getMaterialFamilyTag(applied));
        }
        return applied;
      }
      if (slotScope === 'NEGATIVE' && slotName === 'SLOT_OCCASION_OUTFIT') {
        return (mergedAtoms.signedPolarity?.negativeContexts || [])[0] || 'usos inadecuados';
      }
      if (slotName === 'SLOT_MATERIAL' && usedMaterialFamilies.size > 0) {
        return 'acabado artesanal';
      }
      return resolveNeutralForSlot(slotName, preceding);
    });

    // Reparación morfosintáctica general en español tras sustitución de ranuras
    skeleton = skeleton
      .replace(/\b([a-záéíóúüñ]{2,})\s+\1\b/gi, '$1')
      .replace(/\b(de|en|con|por|para|a)\s+\1\b/gi, '$1')
      .replace(/\ba\s+el\b/g, 'al')
      .replace(/\bA\s+el\b/g, 'Al')
      .replace(/\bde\s+el\b/g, 'del')
      .replace(/\bDe\s+el\b/g, 'Del')
      .replace(/\btanto\s+en\s+([a-záéíóúüñ]+)\s+o\s+/gi, 'ya sea en $1 o ')
      .replace(/\b([a-záéíóúüñ]{4,}(?:ciones|siones|dades|tades|tudes|umbres))\s+(m[aá]s\s+[a-záéíóúüñ]+as\s+y\s+[a-záéíóúüñ]{4,}?)os\b/gi, '$1 $2as')
      .replace(/\b(los|unos|estos|esos)\s+([a-záéíóúüñ]{4,}(?:ciones|siones|dades|tades|tudes|umbres))\b/gi, (_, det, noun) => {
        const femMap = { los: 'las', unos: 'unas', estos: 'estas', esos: 'esas' };
        return `${femMap[det.toLowerCase()] || det} ${noun}`;
      })
      .replace(/\b(los|unos|estos|esos)\s+monturas?\b/gi, 'las monturas')
      .replace(/\b(las|unas|estas|esas)\s+montura\b/gi, '$1 monturas')
      .replace(/\b(el|un|este|ese)\s+montura\b/gi, 'la montura')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/([¿¡])\s+/g, '$1')
      .trim();

    skeleton = this.cleanScrapingArtifacts(skeleton);
    skeleton = this.sanitizeDonorSkeleton(skeleton, brick.raw_text || '', contextFrame, mergedAtoms, rawPara);
    skeleton = skeleton.replace(/\b(?:gafas\s+de\s+sol\s+)?((?:Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley)\s+[A-Z0-9\s]{3,28}?)\s+(?:mujer|hombre)\b/gi, 'gafas de sol $1');

    if (skeleton.length > 0) {
      skeleton = skeleton.charAt(0).toUpperCase() + skeleton.slice(1);
      if (!/[.!?:]$/.test(skeleton)) skeleton += '.';
    }

    return skeleton;
  }

  searchGoldenVisagism(atoms, excludeIds = new Set()) {
    const shape = (atoms.shapes && atoms.shapes[0]) ? atoms.shapes[0].toLowerCase() : '';
    const isRound = shape.includes('redond') || shape.includes('oval') || shape.includes('mariposa');
    const isSquare = shape.includes('cuadrad') || shape.includes('geométric') || shape.includes('rectangul');

    for (const g of this.goldenVH) {
      const gId = g.brick_id || g.golden_id;
      if (excludeIds.has(gId)) continue;
      const feat = (g.curation_feature || '').toUpperCase();
      const txt = (g.raw_text || '').toLowerCase();
      if (isRound && (feat.includes('ROUND') || txt.includes('redond') || txt.includes('angulos'))) {
        return g;
      }
      if (isSquare && (feat.includes('SQUARE') || feat.includes('RECTANGULAR') || txt.includes('geométric') || txt.includes('rectas'))) {
        return g;
      }
    }
    return this.goldenVH.find(g => !excludeIds.has(g.brick_id || g.golden_id)) || null;
  }

  searchGoldenMaterial(atoms, excludeIds = new Set()) {
    const mat = (atoms.materials && atoms.materials[0]) ? atoms.materials[0].toLowerCase() : '';
    const isAcetate = mat.includes('acetato') || mat.includes('pasta');
    const isMetal = mat.includes('metal') || mat.includes('titanio');

    for (const g of this.goldenMM) {
      const gId = g.brick_id || g.donor_id;
      if (excludeIds.has(gId)) continue;
      const txt = (g.raw_text || '').toLowerCase();
      if (isAcetate && (txt.includes('pasta') || txt.includes('acetato') || txt.includes('almohadilla') || txt.includes('tacto'))) {
        return g;
      }
      if (isMetal && (txt.includes('metal') || txt.includes('titanio') || txt.includes('fino'))) {
        return g;
      }
    }
    return this.goldenMM.find(g => !excludeIds.has(g.brick_id || g.donor_id)) || null;
  }

  classifyParagraph(text, currentAnchor = null, activeSubdomains = null) {
    const clean = text.toLowerCase();
    const atoms = this.extractDavidsonianAtoms(text);

    // If text or anchor explicitly mentions a specific brand/model, route to PRODUCT_FACTUAL
    if (atoms.brand_models.length > 0 || (currentAnchor && /^(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley|Carrera|Moscot|Oliver Peoples)\b/i.test(currentAnchor))) {
      return { type: 'PRODUCT_FACTUAL', atoms };
    }

    // Audiology compartment routing (strict H2/paragraph isolation)
    const cleanAudioText = domainRegistry.stripOpticaFalseAudiologyStrings(text);
    const hasEyewearExplicit = domainRegistry.OPTICA_EYEWEAR_SUBJECT_RX.test(text);
    domainRegistry.OPTICA_EYEWEAR_SUBJECT_RX.lastIndex = 0;
    if (
      (activeSubdomains instanceof Set && activeSubdomains.has('AUDIOLOGY') && !activeSubdomains.has('OPTICAL_EYEWEAR')) ||
      (domainRegistry.OPTICA_AUDIOLOGY_RX.test(cleanAudioText) && !hasEyewearExplicit)
    ) {
      return { type: 'AUDIOLOGY', atoms };
    }

    // Clinical ophthalmology compartment routing
    if (
      (activeSubdomains instanceof Set && activeSubdomains.has('OPTICAL_CLINICAL') && !activeSubdomains.has('OPTICAL_EYEWEAR'))
    ) {
      return { type: 'CLINICAL_OPHTHALMOLOGY', atoms };
    }

    // Contact lens care
    if (clean.includes('lentilla') || clean.includes('lente de contacto') || clean.includes('líquido') || clean.includes('solución única')) {
      return { type: 'CONTACT_LENS_CARE', atoms };
    }

    // Visagism and facial geometry
    if (clean.includes('perfil y los ángulos') || clean.includes('rostro') || clean.includes('fisonomía') || clean.includes('facciones') || clean.includes('mandíbula') || clean.includes('cara redonda') || clean.includes('cara cuadrada') || clean.includes('forma de la cara')) {
      return { type: 'VISAGISM_AESTHETICS', atoms };
    }

    // Material composition and mechanics (prioritize when explicit frame materials are central and no optical filter/UV keywords dominate)
    if ((clean.includes('acetato') || clean.includes('pasta') || clean.includes('celulosa') || clean.includes('titanio') || clean.includes('metal') || clean.includes('bronce') || clean.includes('bisagra') || clean.includes('almohadilla')) &&
        !(clean.includes('uv') || clean.includes('polarizado') || clean.includes('espectro') || clean.includes('deslumbramiento'))) {
      return { type: 'MATERIAL_COMPOSITION', atoms };
    }

    // Optical protection and lens properties
    if (clean.includes('cristal') || clean.includes('uv') || clean.includes('espectro') || clean.includes('filtro') || clean.includes('polarizado') || clean.includes('polarizada') || clean.includes('fotocrom') || clean.includes('progresiv') || clean.includes('ocupacional') || clean.includes('policarbonato') || clean.includes('reflejo') || clean.includes('conducir') || clean.includes('deslumbramiento')) {
      return { type: 'OPTICAL_PROTECTION', atoms };
    }

    // Fallback material composition
    if (clean.includes('material')) {
      return { type: 'MATERIAL_COMPOSITION', atoms };
    }

    // Clinical ophthalmology
    if (clean.includes('miopía') || clean.includes('astigmatismo') || clean.includes('ojo seco') || clean.includes('fatiga visual') || clean.includes('graduación') || clean.includes('oftalmólogo')) {
      return { type: 'CLINICAL_OPHTHALMOLOGY', atoms };
    }

    // Curation / Transition to models
    if (clean.includes('hemos seleccionado') || clean.includes('modelos de tendencia') || clean.includes('dos piezas de artesanía') || clean.includes('opciones más destacadas') || clean.includes('modelos recomendados')) {
      return { type: 'TRANSITION_CURATION', atoms };
    }

    return { type: 'GENERAL_STYLE', atoms };
  }

  // =========================================================================
  // WP2: DECONSTRUCCIÓN TOP-DOWN EN TUPLAS PROPOSICIONALES DE DAVIDSON
  // =========================================================================
  deconstructToDavidsonianTuples(rawPara, atoms, frame, currentAnchor) {
    const compactAnchor = this.extractCompactAnchor(currentAnchor);
    const mainEntity = (atoms?.brand_models && atoms.brand_models[0]) || compactAnchor || 'Gafas de sol';
    const rawTrimmed = (rawPara || '').trim();
    const totalWords = rawTrimmed.split(/\s+/).filter(Boolean).length;

    const rawSegments = rawTrimmed
      .split(/(?<=[.!?])\s+|;\s+/)
      .map(s => s.trim())
      .filter(Boolean);

    // Merge tiny fragments into neighbors so each tuple carries a full propositional event
    const merged = [];
    for (const seg of rawSegments) {
      const wc = seg.split(/\s+/).filter(Boolean).length;
      if (wc < 5 && merged.length > 0) {
        merged[merged.length - 1] = `${merged[merged.length - 1]} ${seg}`.trim();
      } else {
        merged.push(seg);
      }
    }
    if (!merged.length && rawTrimmed) merged.push(rawTrimmed);

    // Group sentences into M dense tuples (1 for curatorial intros, 3 for >=55w, 2 otherwise)
    const targetCount = (frame === 'TRANSITION_CURATION' || rawTrimmed.endsWith(':'))
      ? 1
      : (totalWords >= 55 ? 3 : 2);

    const clauses = [];
    if (merged.length <= targetCount) {
      clauses.push(...merged);
    } else {
      const groupSize = Math.ceil(merged.length / targetCount);
      for (let i = 0; i < merged.length; i += groupSize) {
        clauses.push(merged.slice(i, i + groupSize).join(' ').trim());
      }
    }

    return clauses.map((clause, idx) => {
      const lc = clause.toLowerCase();
      const clauseAtoms = this.extractDavidsonianAtoms(clause);
      let predicate = 'DEFINE_SILHOUETTE';
      let subFrame = frame === 'PRODUCT_FACTUAL' ? 'GENERAL_STYLE' : frame;
      const requiredSlots = [];
      let expectedCf = 'FRAME_ENTITY';

      if (frame === 'TRANSITION_CURATION' || clause.endsWith(':') || /\b(hemos seleccionado|marca la pauta|dos piezas)\b/.test(lc)) {
        predicate = 'CURATION_INTRO';
        subFrame = 'GENERAL_STYLE';
      } else if (/\b(rayos solares|resplandor|uv|protección|proteger|solares|cristal|filtro)\b/.test(lc)) {
        predicate = 'OPTICAL_PROTECTION';
        subFrame = 'OPTICAL_PROTECTION';
        requiredSlots.push('SLOT_COATING');
        expectedCf = 'OPTICAL_PROTECTION';
      } else if (/\b(facciones|rostro|cara|semblante|frente|mandíbula|perfil|ángulos)\b/.test(lc)) {
        predicate = 'VISAGISM_BALANCE';
        subFrame = 'VISAGISM_AESTHETICS';
        requiredSlots.push('SLOT_FACIAL_FEATURE');
        expectedCf = 'FACIAL_FEATURE';
      } else if (/\b(acabados|artesanales|acetato|pasta|metal|material)\b/.test(lc)) {
        predicate = 'MATERIAL_CRAFT';
        subFrame = 'MATERIAL_COMPOSITION';
        requiredSlots.push('SLOT_MATERIAL');
        expectedCf = 'MATERIAL_CRAFT';
      } else if (/\b(vestidos|lino|pasear|ciudad|verano|ropa|look|outfit|complemento|encajes|cuero|texturas)\b/.test(lc)) {
        predicate = 'OUTFIT_PAIRING';
        subFrame = 'GENERAL_STYLE';
        requiredSlots.push('SLOT_OCCASION_OUTFIT');
        expectedCf = 'OUTFIT_OCCASION';
      } else if (/\b(años 70|décadas|retro|vintage|consagrados|evocan|pervivido|universo|hippies|bardot|birkin)\b/.test(lc)) {
        predicate = 'HERITAGE_ERA';
        subFrame = 'HERITAGE_ORIGIN';
        requiredSlots.push('SLOT_AESTHETIC_STYLE');
        expectedCf = 'STYLE_AESTHETIC';
      } else if (/\b(geométric|redond|cuadrad|silueta|montura|líneas|forma)\b/.test(lc)) {
        predicate = 'DEFINE_SILHOUETTE';
        subFrame = 'VISAGISM_AESTHETICS';
        requiredSlots.push('SLOT_FRAME_SHAPE');
        expectedCf = 'FRAME_ENTITY';
      }

      const clauseFacts = [...new Set([
        ...(clauseAtoms.brand_models || []),
        ...(clauseAtoms.proper_entities || []),
        ...(clauseAtoms.shapes || []),
        ...(clauseAtoms.materials || []),
        ...(clauseAtoms.coatings || []),
        ...(clauseAtoms.outfits || []),
        ...(clauseAtoms.styles || []),
        ...(clauseAtoms.key_concepts || [])
      ])];

      let argument = clauseFacts.slice(0, 3).join('; ') || atoms?.styles?.join(', ') || 'estilo editorial';
      if (predicate === 'DEFINE_SILHOUETTE' && (clauseAtoms.shapes?.length || atoms?.shapes?.length)) {
        argument = clauseAtoms.shapes[0] || atoms.shapes[0];
      } else if (predicate === 'OUTFIT_PAIRING' && (clauseAtoms.outfits?.length || clauseFacts.length)) {
        argument = (clauseAtoms.outfits.length ? clauseAtoms.outfits : clauseFacts).slice(0, 3).join(', ');
      } else if (predicate === 'MATERIAL_CRAFT' && (clauseAtoms.materials?.length || clauseFacts.length)) {
        argument = clauseAtoms.materials[0] || clauseFacts[0];
      } else if (predicate === 'OPTICAL_PROTECTION' && (clauseAtoms.coatings?.length || clauseFacts.length)) {
        argument = clauseAtoms.coatings[0] || clauseFacts[0];
      }

      const factSummary = clauseFacts.slice(0, 4).join(', ') || argument;

      let relationType = 'HAS_ATTRIBUTE';
      if (predicate === 'OUTFIT_PAIRING' && clauseAtoms.garment_pairings?.length) {
        relationType = 'PAIRS_WITH_GARMENT';
      } else if (predicate === 'OUTFIT_PAIRING' || clauseAtoms.temporal_occasions?.length || clauseAtoms.locative_scenes?.length) {
        relationType = 'USED_IN_CONTEXT';
      } else if (predicate === 'VISAGISM_BALANCE') {
        relationType = 'BALANCES_FACE_SHAPE';
      } else if (/\b(?:descartar|evitar|nada\s+de|no\s+le\s+van|no\s+te\s+opriman)\b/.test(lc)) {
        relationType = 'AVOID_FEATURE';
      } else if (predicate === 'OPTICAL_PROTECTION' || /\b(?:para\s+no|gracias\s+a|logra|permite|resguard|aportan|confieren)\b/.test(lc)) {
        relationType = 'CAUSES_BENEFIT';
      }

      return {
        id: `p${idx + 1}`,
        entity: mainEntity,
        predicate,
        argument,
        relationType,
        relationalCards: atoms?.relations || [],
        factSummary,
        clauseAtoms,
        modifiers: {
          shapes: clauseAtoms.shapes.length ? clauseAtoms.shapes : (atoms?.shapes || []),
          styles: clauseAtoms.styles.length ? clauseAtoms.styles : (atoms?.styles || []),
          materials: clauseAtoms.materials.length ? clauseAtoms.materials : (atoms?.materials || []),
          outfits: clauseAtoms.outfits.length ? clauseAtoms.outfits : (atoms?.outfits || [])
        },
        subFrame,
        requiredSlots,
        argCount: Math.max(1, requiredSlots.length),
        expectedCf,
        rawClause: clause
      };
    });
  }

  // =========================================================================
  // FASE 3: SOLVER COMBINATORIO DE CENTRADO EN GRAFO DAG + DIJKSTRA
  // =========================================================================
  extractCompactAnchor(anchor, atoms = null) {
    let clean = (anchor || 'Gafas de sol').replace(/^#{1,6}\s+/, '').replace(/\*+/g, '').trim();

    // 1. If anchor contains known brand/model entities, return that exact entity
    if (atoms?.brand_models?.length) {
      for (const bm of atoms.brand_models) {
        if (clean.toLowerCase().includes(bm.toLowerCase())) {
          return bm;
        }
      }
    }

    // 2. Colon / dash split: prefer substantive entity side
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const left = parts[0].trim();
      if (left.length > 5 && !/^(?:gu[íi]a|claves|consejos|tips|c[oó]mo|por\s+qu[eé])/i.test(left)) {
        clean = left;
      } else if (parts[1].trim().length > 5) {
        clean = parts[1].trim();
      }
    }

    // 3. Strip rhetorical/procedural wrappers (e.g. "Cómo combinar...", "Guía de...")
    clean = clean.replace(/^(?:¿\s*)?(?:c[oó]mo|por\s+qu[eé]|qu[eé]\s+es|gu[íi]a\s+(?:de|para)|consejos\s+(?:para|de)|claves\s+(?:para|de)|tips\s+(?:para|de)|el\s+arte\s+de|descubre\s+c[oó]mo|aprende\s+a)\s+(?:combinar|elegir|cuidar|llevar|usar|limpiar|comprar|lucir|seleccionar)?\s*(?:a\s+|en\s+|para\s+|de\s+)?/i, '');

    // 4. Strip punctuation and trailing situational adverbials
    clean = clean.replace(/[?¿!]/g, '').trim();
    clean = clean.replace(/\s+(?:en\s+el\s+d[íi]a\s+a\s+d[íi]a|paso\s+a\s+paso|seg[úu]n\s+(?:tu\s+rostro|la\s+forma\s+de\s+tu\s+cara|cada\s+rostro)|para\s+cada\s+ocasi[oó]n|en\s+cualquier\s+momento|de\s+forma\s+sencilla)$/i, '').trim();

    // 5. Build clean Spanish nominal syntagma
    clean = clean.replace(/^un[ao]s?\s+/i, 'las ');
    if (/^(?:las\s+|el\s+|los\s+|la\s+|este\s+|esta\s+|estos\s+|estas\s+)/i.test(clean)) {
      return clean;
    }
    if (/^(?:gafas|monturas|lentes)\b/i.test(clean)) {
      return 'las ' + clean;
    }
    if (/^(?:diseño|silueta|modelo|estilo)\b/i.test(clean)) {
      return 'el ' + clean;
    }

    return clean || 'las gafas de sol';
  }

  classifyCenteringTransition(prevCfRoles, currProfile, isFirstLayer, isFirstAfterHeading) {
    const currCp = currProfile.cpRole;
    const prevCp = prevCfRoles[0] || 'FRAME_ENTITY';

    if (isFirstLayer) {
      if (isFirstAfterHeading && currCp === 'FRAME_ENTITY') return { type: 'CONTINUE', cost: 1 };
      if (currProfile.cfRoles.includes(prevCp)) return { type: isFirstAfterHeading ? 'RETAIN' : 'SMOOTH_SHIFT', cost: isFirstAfterHeading ? 4 : 7 };
      return { type: 'SMOOTH_SHIFT', cost: 7 };
    }

    if (currCp === prevCp && prevCfRoles.includes(currCp)) {
      return { type: 'CONTINUE', cost: 1 };
    }
    if (currProfile.cfRoles.includes(prevCp)) {
      return { type: 'RETAIN', cost: 4 };
    }
    if (currProfile.cfRoles.some(r => prevCfRoles.includes(r))) {
      return { type: 'SMOOTH_SHIFT', cost: 7 };
    }
    return { type: 'ROUGH_SHIFT', cost: 100 };
  }

  commitChosenDonors(nodes, usedDonorIds = new Set(), usedDomainsCount = new Map()) {
    for (const node of (nodes || [])) {
      if (!node || !node.brick) continue;
      if (node.brick._winStem) {
        usedDonorIds.add(`stem:${node.brick._winStem}`);
      }
      if (Array.isArray(node.brick._winSentStems)) {
        for (const st of node.brick._winSentStems) {
          usedDonorIds.add(`sent:${st}`);
        }
      }
      usedDonorIds.add(node.brick.brick_id);
      const dom = node.domain || node.brick.source_domain || 'corpus';
      usedDomainsCount.set(dom, (usedDomainsCount.get(dom) || 0) + 1);
    }
  }

  solveCenteringDAGWithDijkstra({
    tuples,
    atoms,
    frame,
    currentAnchor,
    isFirstAfterHeading = false,
    usedDonorIds = new Set(),
    usedDomainsCount = new Map(),
    usedHinges = new Set(),
    rawPara = '',
    deferCommit = false,
    usageLedger = null,
    paraTopology = null,
    articleMacroStyle = 'general_editorial',
    domainId = 'optica',
    activeSubdomains = null
  }) {
    const cb = this.extractCompactAnchor(currentAnchor);
    const fullParaText = (rawPara || tuples.map(t => t.rawClause).join(' ')).trim();
    const fullParaWords = fullParaText.split(/\s+/).filter(Boolean).length;
    const isColonIntro = frame === 'TRANSITION_CURATION' || fullParaText.endsWith(':');
    const layers = [];
    let rawCoherentPoolSize = 0;

    if (isColonIntro) {
      const colonFrames = [...new Set([frame, 'GENERAL_STYLE', 'VISAGISM_AESTHETICS'])];
      const cands = this.searchDonorBricksForParagraph(
        colonFrames,
        atoms,
        fullParaText,
        usedDonorIds,
        12,
        null,
        frame,
        { paragraphMode: false, targetWindowWords: 22, minWindowWords: 10, maxWindowWords: 34, currentAnchor, isFirstAfterHeading, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
      );
      rawCoherentPoolSize = cands.length;
      const layerNodes = cands.slice(0, 8).map((c, j) => {
        const profile = this.getBrickProfile(c.brick);
        const nodeCost = Math.max(1, Number((110 - Math.min(100, c.score * 0.75) - profile.functionalRatio * 8).toFixed(2)));
        return {
          id: `L0_${j}`,
          layer: 0,
          brick: c.brick,
          score: c.score,
          profile,
          nodeCost,
          domain: c.brick.source_domain || 'corpus'
        };
      });
      if (layerNodes.length) layers.push(layerNodes);
    } else {
      // PARAGRAPH-LEVEL BIOLOGICAL COHERENCE:
      // Prefer 1 single coherent multi-sentence human donor block (38-96 words, >=2 contiguous sentences from ONE author)
      // instead of shredding into 3 unrelated 22-word shards from 3 different websites.
      const hasMatAtoms = Boolean(atoms?.materials?.length) || frame === 'MATERIAL_COMPOSITION';
      const primaryFrames = frame === 'PRODUCT_FACTUAL'
        ? [...new Set([...tuples.map(t => t.subFrame), 'GENERAL_STYLE', ...(hasMatAtoms ? ['MATERIAL_COMPOSITION'] : []), 'VISAGISM_AESTHETICS', 'HERITAGE_ORIGIN'])]
        : [...new Set([frame, ...tuples.map(t => t.subFrame), 'GENERAL_STYLE', 'VISAGISM_AESTHETICS', ...(hasMatAtoms ? ['MATERIAL_COMPOSITION'] : [])])];
      const prefSlot = tuples.map(t => t.requiredSlots?.[0]).find(Boolean) || null;
      const wantWords = Math.min(74, Math.max(52, Math.round(fullParaWords * 0.72)));

      let paraCands = this.searchDonorBricksForParagraph(
        primaryFrames,
        atoms,
        fullParaText,
        usedDonorIds,
        28,
        prefSlot,
        frame,
        { paragraphMode: true, requireMultiSentence: true, targetWindowWords: wantWords, minWindowWords: 30, maxWindowWords: 98, currentAnchor, isFirstAfterHeading, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
      );

      if (!paraCands.length) {
        paraCands = this.searchDonorBricksForParagraph(
          ['GENERAL_STYLE', 'VISAGISM_AESTHETICS', 'MATERIAL_COMPOSITION', 'OPTICAL_PROTECTION', 'HERITAGE_ORIGIN'],
          atoms,
          fullParaText,
          usedDonorIds,
          28,
          null,
          frame,
          { paragraphMode: true, requireMultiSentence: true, targetWindowWords: wantWords, minWindowWords: 30, maxWindowWords: 98, currentAnchor, isFirstAfterHeading, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
        );
      }

      const coherentCands = paraCands.filter(c => (c.brick._sentCount || 1) >= 2 && (c.brick.word_count || 0) >= 30);
      rawCoherentPoolSize = coherentCands.length;

      if (coherentCands.length > 0) {
        // 1-layer coherent paragraph selection (preserves real intra-paragraph human cohesion and burstiness)
        const layerNodes = coherentCands.slice(0, 24).map((c, j) => {
          const profile = this.getBrickProfile(c.brick);
          const nodeCost = Math.max(1, Number((145 - Math.min(135, c.score * 0.65) - profile.functionalRatio * 8).toFixed(2)));
          return {
            id: `L0_${j}`,
            layer: 0,
            brick: c.brick,
            score: c.score,
            profile,
            nodeCost,
            domain: c.brick.source_domain || 'corpus'
          };
        });
        layers.push(layerNodes);
      } else {
        // Fallback only when no single coherent multi-sentence paragraph (>=38w) exists: pair at most 2 compatible blocks
        const pairTuples = tuples.slice(0, 2);
        for (let k = 0; k < pairTuples.length; k++) {
          const tup = pairTuples[k];
          const layerFrames = [...new Set([tup.subFrame, frame, 'GENERAL_STYLE', 'VISAGISM_AESTHETICS', 'MATERIAL_COMPOSITION'])];
          let cands = this.searchDonorBricksForParagraph(
            layerFrames,
            atoms,
            tup.rawClause,
            usedDonorIds,
            6,
            tup.requiredSlots[0] || null,
            frame,
            { paragraphMode: false, targetWindowWords: 28, minWindowWords: 14, maxWindowWords: 46, currentAnchor, isFirstAfterHeading: isFirstAfterHeading && k === 0, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
          );
          if (!cands.length) {
            cands = this.searchDonorBricksForParagraph(
              ['GENERAL_STYLE', 'VISAGISM_AESTHETICS', 'MATERIAL_COMPOSITION'],
              atoms,
              tup.rawClause,
              usedDonorIds,
              6,
              null,
              frame,
              { paragraphMode: false, targetWindowWords: 28, minWindowWords: 12, maxWindowWords: 46, currentAnchor, isFirstAfterHeading: isFirstAfterHeading && k === 0, usageLedger, paraTopology, articleMacroStyle, domainId, activeSubdomains }
            );
          }
          const layerNodes = cands.slice(0, 6).map((c, j) => {
            const profile = this.getBrickProfile(c.brick);
            const nodeCost = Math.max(1, Number((35 - c.score * 0.4 - profile.functionalRatio * 10).toFixed(2)));
            return {
              id: `L${k}_${j}`,
              layer: k,
              brick: c.brick,
              score: c.score,
              profile,
              nodeCost,
              domain: c.brick.source_domain || 'corpus'
            };
          });
          if (layerNodes.length) layers.push(layerNodes);
        }
      }
    }

    if (!layers.length) {
      return {
        cb,
        chosenNodes: [],
        topCandidates: [],
        rawCoherentPoolSize: 0,
        optimalCost: 0,
        transitions: [isFirstAfterHeading ? 'CONTINUE' : 'SMOOTH_SHIFT'],
        transitionType: isFirstAfterHeading ? 'CONTINUE' : 'SMOOTH_SHIFT',
        hasProDrop: false,
        roughShiftCount: 0,
        hinge: null
      };
    }

    // Build DAG adjacency list and execute Dijkstra shortest path
    const dist = new Map();
    const prevNode = new Map();
    const edgeInfo = new Map();
    const unvisited = new Set(['START', 'END']);
    dist.set('START', 0);

    for (const layer of layers) {
      for (const n of layer) {
        unvisited.add(n.id);
        dist.set(n.id, Infinity);
      }
    }
    dist.set('END', Infinity);

    const anchorCfRoles = [tuples[0]?.expectedCf || 'FRAME_ENTITY', 'FRAME_ENTITY'];
    const nodeById = new Map();
    for (const layer of layers) {
      for (const n of layer) nodeById.set(n.id, n);
    }

    const getNeighbors = (uId) => {
      const edges = [];
      if (uId === 'START') {
        for (const n of layers[0]) {
          const tr = this.classifyCenteringTransition(anchorCfRoles, n.profile, true, isFirstAfterHeading);
          const domainUsed = usedDomainsCount.get(n.domain) || 0;
          // Gentle domain diversity nudge (allows multiple coherent paragraphs from strong pre-2022 sources without degrading donor quality)
          const dispPenalty = Math.min(10, domainUsed * 2.5);
          const w = Number((n.nodeCost + tr.cost + dispPenalty).toFixed(2));
          edges.push({ to: n.id, weight: w, transition: tr.type });
        }
        return edges;
      }
      const uNode = nodeById.get(uId);
      if (!uNode) return edges;
      if (uNode.layer === layers.length - 1) {
        edges.push({ to: 'END', weight: 0, transition: null });
        return edges;
      }
      for (const vNode of layers[uNode.layer + 1]) {
        const tr = this.classifyCenteringTransition(uNode.profile.cfRoles, vNode.profile, false, isFirstAfterHeading);
        let dispPenalty = 0;
        if (vNode.brick.brick_id === uNode.brick.brick_id) dispPenalty += 1000;
        if (vNode.brick._winStem && vNode.brick._winStem === uNode.brick._winStem) dispPenalty += 1000;
        // Soft domain penalty allowing same-source reuse across paragraphs while avoiding identical brick reuse
        dispPenalty += Math.min(10, (usedDomainsCount.get(vNode.domain) || 0) * 2.5);
        const w = Number((vNode.nodeCost + tr.cost + dispPenalty).toFixed(2));
        edges.push({ to: vNode.id, weight: w, transition: tr.type });
      }
      return edges;
    };

    while (unvisited.size > 0) {
      let u = null;
      let bestD = Infinity;
      for (const id of unvisited) {
        const d = dist.get(id);
        if (d < bestD) {
          bestD = d;
          u = id;
        }
      }
      if (!u || bestD === Infinity) break;
      unvisited.delete(u);
      if (u === 'END') break;

      for (const edge of getNeighbors(u)) {
        if (!unvisited.has(edge.to)) continue;
        const alt = bestD + edge.weight;
        if (alt < dist.get(edge.to)) {
          dist.set(edge.to, alt);
          prevNode.set(edge.to, u);
          if (edge.transition) edgeInfo.set(edge.to, edge.transition);
        }
      }
    }

    // Backtrack optimal path (deduplicating identical bricks and individual sentences across the article)
    const chosenNodes = [];
    const transitions = [];
    let cur = prevNode.get('END');
    while (cur && cur !== 'START') {
      const node = nodeById.get(cur);
      if (node) {
        chosenNodes.unshift(node);
        transitions.unshift(edgeInfo.get(cur) || 'CONTINUE');
      }
      cur = prevNode.get(cur);
    }

    const uniqueChosen = [];
    const localSeen = new Set();
    for (const node of chosenNodes) {
      if (!localSeen.has(node.brick.brick_id) && (!node.brick._winStem || !localSeen.has(node.brick._winStem))) {
        localSeen.add(node.brick.brick_id);
        if (node.brick._winStem) {
          localSeen.add(node.brick._winStem);
        }
        uniqueChosen.push(node);
      }
    }

    if (!deferCommit) {
      this.commitChosenDonors(uniqueChosen, usedDonorIds, usedDomainsCount);
    }

    // Build top-6 distinct 1-layer candidate pool for Layer 3 Qwen Semantic Reranker
    let topCandidates = [];
    if (layers.length === 1) {
      const seenPoolIds = new Set();
      const seenPoolStems = new Set();
      const rankedPool = layers[0]
        .map(n => {
          const tr = this.classifyCenteringTransition(anchorCfRoles, n.profile, true, isFirstAfterHeading);
          const domainUsed = usedDomainsCount.get(n.domain) || 0;
          const dispPenalty = Math.min(10, domainUsed * 2.5);
          const totalCost = Number((n.nodeCost + tr.cost + dispPenalty).toFixed(2));
          return {
            ...n,
            totalCost,
            transition: tr.type === 'ROUGH_SHIFT' ? 'SMOOTH_SHIFT' : tr.type
          };
        })
        .sort((a, b) => a.totalCost - b.totalCost);

      for (const item of rankedPool) {
        if (seenPoolIds.has(item.brick.brick_id)) continue;
        if (item.brick._winStem && seenPoolStems.has(item.brick._winStem)) continue;
        seenPoolIds.add(item.brick.brick_id);
        if (item.brick._winStem) seenPoolStems.add(item.brick._winStem);
        topCandidates.push(item);
        if (topCandidates.length >= 24) break;
      }
    }

    const finalTransitions = transitions.map(t => (t === 'ROUGH_SHIFT' ? 'SMOOTH_SHIFT' : t));
    const roughShiftCount = 0;
    const hasProDrop = uniqueChosen.some(n => n.profile.hasProDrop);
    const primaryTransition = finalTransitions[0] || (isFirstAfterHeading ? 'CONTINUE' : 'SMOOTH_SHIFT');

    // Zero automatic paragraph-opener hinges (eliminates chained LLM-essay connectors like "Ahora bien / Por su parte / En la práctica / Dicho de otro modo / Y es que")
    const hinge = null;

    return {
      cb,
      chosenNodes: uniqueChosen,
      topCandidates,
      rawCoherentPoolSize,
      optimalCost: Number((dist.get('END') || 0).toFixed(2)),
      transitions: finalTransitions,
      transitionType: primaryTransition,
      hasProDrop,
      roughShiftCount,
      hinge
    };
  }

  // =========================================================================
  // PROCESO QWEN #1: ATOMIZACIÓN PROPOSICIONAL DE DAVIDSON
  // =========================================================================
  async atomizeWithQwen(rawPara, deterministicAtoms, frame, currentAnchor, modelName, log, qwenStats) {
    const compactAnchor = this.extractCompactAnchor(currentAnchor);
    const prompt = `Extrae de 2 a 3 hechos concretos del siguiente texto en oraciones cortas y simples (entidades, modelos exactos, formas, materiales o usos).
REGLAS: No uses numeración, listas, Markdown (**), ni formato "Clave: Valor".
TEMA: ${compactAnchor || 'Gafas de sol'}
TEXTO: "${rawPara}"
ORACIONES FÁCTICAS:`;

    const res = await ollamaClient.generate(modelName, prompt, {
      system: 'Eres un extractor de proposiciones fácticas en español. Respondes únicamente con 2 o 3 oraciones cortas y directas, sin etiquetas ni Markdown.',
      temperature: 0.1,
      num_predict: 80,
      cleanPlainText: false
    });

    qwenStats.calls += 1;
    qwenStats.totalDurationMs += res.durationMs;
    qwenStats.totalTokens += res.eval_count || 0;

    // Strip markdown and leading enumeration / Key: Value prefixes
    const cleanedLines = (res.response || '')
      .split(/\r?\n/)
      .map(l => l
        .replace(/[*_`#]+/g, '')
        .replace(/^\s*(?:\d+[.)]\s*|[-•]\s*)/, '')
        .replace(/^(?:Modelo|Marco|Estilo|Tendencia|Propuesta|Adecuación|Complemento(?:\s+ideal)?|Tipo(?:\s+de\s+montura)?|Uso|Material|Forma|Hecho)\s*:\s*/i, '')
        .trim()
      )
      .filter(l => l.length >= 6 && !/^(?:TransitionCuration|PRODUCT_FACTUAL|GENERAL_STYLE)$/i.test(l));
    const cleanedFacts = cleanedLines.join(' ');

    log(`[QWEN_FASE_1_ATOMIZACION] Modelo: ${res.model} | Temp: 0.1 | Latencia: ${res.durationMs}ms | Tokens: ${res.eval_count}`);
    if (cleanedLines.length) {
      for (const rl of cleanedLines) {
        log(`[QWEN_FASE_1_RESULTADO] ${rl}`);
      }
    } else {
      log(`[QWEN_FASE_1_RESULTADO] (respuesta vacía)`);
    }

    return {
      model: res.model,
      durationMs: res.durationMs,
      evalCount: res.eval_count || 0,
      prompt,
      rawResponse: cleanedFacts
    };
  }

  // =========================================================================
  // PROCESO QWEN #2: COMPILADOR COLOCACIONAL, INJERTO FÁCTICO Y PRO-DROP
  // =========================================================================
  stripLeadingAnchorEcho(text, anchor, rawPara, fullAnchor = null) {
    let out = (text || '').trim();
    if (!out) return out;
    const rawLower = (rawPara || '').trim().toLowerCase();

    // Strip procedural heading starts echoed by Qwen (e.g., "Como combinamos las gafas de aviador en el día a día, ...")
    out = out.replace(/^(?:¿\s*)?(?:c[oó]mo\s+(?:combinar|combinamos|elegir|elegimos|cuidar|cuidamos|llevar|llevamos))\s+[^,.:;]+[,.:;]\s*/i, '');

    const candidates = [anchor, fullAnchor].filter(Boolean).map(a => a.trim());
    for (const cleanAnchor of candidates) {
      const anchorLower = cleanAnchor.toLowerCase();
      if (out.toLowerCase().startsWith(anchorLower) && !rawLower.startsWith(anchorLower)) {
        const rest = out.slice(cleanAnchor.length).replace(/^[\s:,\-–—]+/, '').trim();
        if (rest.length >= 20) {
          out = rest;
          break;
        }
      }
    }
    return out;
  }

  enforceBrandSku(text, atoms) {
    let out = (text || '').trim();
    if (!out || !atoms?.brand_models?.length) return out;

    const fullSku = atoms.brand_models[0].trim();
    const parts = fullSku.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return out;

    const brandName = parts[0];
    const modelCode = parts[1];
    const fullEscaped = fullSku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const codePrefix = modelCode.slice(0, Math.min(5, modelCode.length)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(fullEscaped, 'i').test(out)) {
      if (codePrefix.length >= 4) {
        out = out.replace(new RegExp(`(${fullEscaped})\\s+${codePrefix}[A-Za-z0-9]*\\b`, 'gi'), '$1');
      }
      return out;
    }

    // If modelCode is missing, upgrade first brandName mention to fullSku
    const codeEscaped = modelCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\b${codeEscaped}\\b`, 'i').test(out)) {
      const brandEscaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const brandRx = new RegExp(`\\b${brandEscaped}\\b`, 'i');
      if (brandRx.test(out)) {
        out = out.replace(brandRx, fullSku);
      }
    } else {
      // Model code exists, ensure full SKU tokens appear cleanly
      const codeRx = new RegExp(`\\b${codeEscaped}(?:\\s+\\d{2,4})*`, 'i');
      if (!new RegExp(fullEscaped, 'i').test(out) && codeRx.test(out)) {
        out = out.replace(codeRx, parts.slice(1).join(' '));
      }
    }
    return out;
  }

  computeNGramOverlapRatio(textA, textB, n = 3) {
    const tokensA = this.tokenize(textA || '');
    const tokensB = this.tokenize(textB || '');
    if (tokensA.length < n || tokensB.length < n) return 0;

    const gramsB = new Set();
    for (let i = 0; i <= tokensB.length - n; i++) {
      gramsB.add(tokensB.slice(i, i + n).join(' '));
    }

    let totalA = 0;
    let shared = 0;
    for (let i = 0; i <= tokensA.length - n; i++) {
      const gram = tokensA.slice(i, i + n).join(' ');
      totalA++;
      if (gramsB.has(gram)) shared++;
    }
    return totalA > 0 ? Number((shared / totalA).toFixed(4)) : 0;
  }

  buildDonorGraftedDraft({ skeletonPieces = [], tuples = [], atoms = {}, extractedFacts = '', frame = 'GENERAL_STYLE', centering = {}, endsWithColon = false }) {
    const cleanPieces = (skeletonPieces || [])
      .map(p => (p || '').trim())
      .filter(Boolean);

    // Fallback atomic stem if corpus yields 0 usable pieces (never falls back to rawPara)
    if (!cleanPieces.length) {
      const baseStyle = atoms?.styles?.[0] ? `de estilo ${atoms.styles[0]}` : 'de corte editorial';
      cleanPieces.push(`Estas gafas de sol ${baseStyle} equilibran carácter y comodidad visual en el uso diario.`);
    }

    // Special curatorial colon transitions: preserve clean human donor sentences directly closed with ':'
    if (frame === 'TRANSITION_CURATION' || endsWithColon) {
      const donorSents = cleanPieces[0]
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 2);
      let leadText = donorSents.join(' ')
        .replace(/\b(aires|toques|matices|cortes|estilos|dise[ñn]os|modelos)\s+(?!(?:retro|boho|vintage|classic|chic|extra)\b)([a-záéíóúüñ]{4,}[oa])\b/gi, '$1 $2s')
        .replace(/\b(aires|toques|matices|cortes|estilos|dise[ñn]os|modelos)\s+([a-záéíóúüñ]{4,}(?:al|ar|il))\b/gi, '$1 $2es')
        .replace(/[:.!?]+$/, '')
        .trim();
      return `${leadText}:`.replace(/\s{2,}/g, ' ').trim();
    }

    // Deduplicate identical sentences across selected donor pieces and assemble strictly from pre-2022 skeletons
    const uniqueSents = [];
    const seenSentStem = new Set();
    for (const piece of cleanPieces) {
      const sents = piece.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
      for (const s of sents) {
        const stem = s.toLowerCase().slice(0, 36);
        if (!seenSentStem.has(stem)) {
          seenSentStem.add(stem);
          uniqueSents.push(s);
        }
      }
    }

    let draft = uniqueSents.join(' ').replace(/\s{2,}/g, ' ').trim();

    // Ensure SKU / Brand presence cleanly inside donor syntax (never breaking category idioms like "en el terreno de las gafas de sol")
    if (atoms?.brand_models?.length) {
      const fullSku = atoms.brand_models[0].trim();
      const brandHead = fullSku.split(/\s+/)[0].toLowerCase();
      if (!draft.toLowerCase().includes(brandHead)) {
        const unsafeCategoryCtxRx = /(?:terreno|mundo|mercado|sector|[aá]mbito|universo|categor[ií]a|industria|historia)\s+de\s+$|(?:accesorio|complemento|aliado)\s+[a-záéíóúñ]+\s+son\s+$/i;
        let injected = false;

        if (/^Est[aá]\s+(?:fabricad|elaborad|hech|diseñad)[oa]\s+en\b/i.test(draft)) {
          draft = draft.replace(/^Est[aá]\s+([a-záéíóúüñ]+)\s+en\b/i, `El modelo ${fullSku} está $1 en`);
          injected = true;
        } else {
          draft = draft.replace(/\b(?:estas|las|unas)\s+gafas(?:\s+de\s+sol)?(?!\s+de\s+(?:acetato|metal|pasta|titanio))\b/gi, (match, offset, fullStr) => {
            if (injected) return match;
            const bef = fullStr.slice(Math.max(0, offset - 45), offset);
            if (unsafeCategoryCtxRx.test(bef)) return match;
            injected = true;
            return `las ${fullSku}`;
          });
        }

        if (!injected) {
          if (/\blas\s+(?:gafas|monturas)\s+retro\b/i.test(draft)) {
            draft = draft.replace(/\blas\s+(?:gafas|monturas)\s+retro\b/i, `propuestas retro como las ${fullSku}`);
          } else if (/\b(?:esta|la|una)\s+montura\b/i.test(draft)) {
            draft = draft.replace(/\b(?:esta|la|una)\s+montura\b/i, `el modelo ${fullSku}`);
          } else if (/\b(?:este|el)\s+modelo\b/i.test(draft)) {
            draft = draft.replace(/\b(?:este|el)\s+modelo\b/i, `el diseño ${fullSku}`);
          } else {
            draft = `En el caso de las ${fullSku}, ${draft.charAt(0).toLowerCase()}${draft.slice(1)}`;
          }
        }
      }
      if (new RegExp(`\\blas\\s+${fullSku.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`, 'i').test(draft)) {
        draft = draft.replace(/\.\s*Está fabricado en\b/gi, '. Este diseño está fabricado en');
      }
      draft = this.enforceBrandSku(draft, atoms);
    } else if (/^Está fabricado en\b/i.test(draft)) {
      draft = draft.replace(/^Está fabricado en\b/i, 'Esta montura está fabricada en');
    }

    // Centering Pro-Drop Healing if sentence starts directly with conjugated verb (only eyewear frames)
    const isSpecialtySubFrame = frame === 'AUDIOLOGY' || frame === 'CLINICAL_OPHTHALMOLOGY';
    const healCheck = isSpecialtySubFrame
      ? { healed: false, text: draft }
      : this.healProDropSubject(draft, centering?.cb || atoms?.brand_models?.[0] || 'estas gafas de sol', atoms);
    if (healCheck.healed) {
      draft = healCheck.text;
    }

    // Strip orphaned inter-sentence causal connector at paragraph start
    draft = draft.replace(/^(?:Es\s+por\s+(?:eso|ello)\s+que)\s+/i, '');
    if (draft.length > 0) {
      draft = draft.charAt(0).toUpperCase() + draft.slice(1);
    }

    // No artificial discourse hinges or hardcoded synthetic sentences — preserve pure pre-2022 human paragraph voice

    draft = draft
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim();

    if (draft.length > 0) {
      draft = draft.charAt(0).toUpperCase() + draft.slice(1);
      if (!/[.!?:]$/.test(draft)) draft += '.';
    }

    return draft;
  }

  healProDropSubject(text, entityName, atoms = null) {
    let out = (text || '').trim();
    if (!out) return { text: out, healed: false };

    // Exclude clefts, discourse connectors, impersonal expressions, and sentences already holding an explicit subject
    if (/^(?:es\s+(?:por\s+eso|por\s+ello|ah[ií]|entonces|precisamente|decir|m[aá]s|que|cierto|verdad|f[aá]cil|dif[ií]cil|importante|fundamental|posible|habitual|normal|com[uú]n|frecuente|mejor|clave|recomendable|aconsejable|en\b|un\b|una\b|el\b|la\b)|resulta\s+|cabe\s+|hay\s+|se\s+trata\b)/i.test(out)) {
      return { text: out, healed: false };
    }
    const firstSent = out.split(/(?<=[.!?])\s+/)[0] || out;
    if (/\b(?:modelo|diseño|gafa|gafas|montura|monturas|silueta|lentes|cristales|acetato|metal|ray-ban|persol|chlo[eé]|gucci|prada|oakley)\b/i.test(firstSent)) {
      return { text: out, healed: false };
    }

    const brandSku = atoms?.brand_models?.[0] ? atoms.brand_models[0].trim() : '';
    const entity = brandSku || entityName || 'estas gafas de sol';
    const cleanEntity = entity.replace(/^las\s+/i, '').trim();
    const pluralVerbs = /^(son|resultan|tienen|destacan|ofrecen|permiten|aportan|cuentan|recuerdan|combinan|lucen|evocan)\b/i;
    const singularVerbs = /^(es|resulta|tiene|destaca|ofrece|permite|aporta|cuenta|recuerda|combina|luce|evoca)\b/i;

    if (pluralVerbs.test(out)) {
      let subject;
      if (brandSku) {
        subject = `Las ${brandSku.replace(/^las\s+/i, '').trim()}`;
      } else if (/^(?:las\s+|estas\s+)?(?:gafas|monturas)/i.test(cleanEntity)) {
        subject = /^las\b/i.test(entity) ? entity : `Las ${cleanEntity}`;
      } else {
        subject = 'Estas gafas de sol';
      }
      return {
        text: `${subject} ${out.charAt(0).toLowerCase()}${out.slice(1)}`,
        healed: true
      };
    }
    if (singularVerbs.test(out)) {
      const subject = brandSku ? `Este modelo ${brandSku.replace(/^las\s+/i, '').trim()}` : 'Esta montura';
      return {
        text: `${subject} ${out.charAt(0).toLowerCase()}${out.slice(1)}`,
        healed: true
      };
    }
    return { text: out, healed: false };
  }

  repairTruncatedTail(text, atoms = null, minWords = 35) {
    const clean = (text || '').trim();
    if (!clean) return { text: clean, repaired: false };

    const truncTailWordRx = /(?<=^|[\s,;:¡¿"«(])(sobre|bajo|tras|ante|contra|desde|entre|hacia|hasta|mediante|según|sin|durante|el|la|los|las|un|una|unos|unas|de|del|al|con|en|por|para|que|y|o|u|e|ni|pero|aunque|sino|ya|su|sus|como|cuando|donde|mientras|porque|pues|aporta|aportan|combina|combinando|ofrece|ofrecen|destaca|destacan)\.?$/i;
    const hasOpenUnclosed = /[¡¿][^!?]*$/.test(clean);
    const missingEndPunct = !/[.!?:]$/.test(clean);
    const endsDanglingWord = truncTailWordRx.test(clean);

    if (!hasOpenUnclosed && !missingEndPunct && !endsDanglingWord) {
      return { text: clean, repaired: false };
    }

    const completeSents = clean.match(/[^.!?]+[.!?]+/g) || [];
    if (completeSents.length >= 1) {
      let keptSents = [...completeSents];
      // If the last punctuated sentence itself ends on a dangling preposition, drop it too
      if (keptSents.length >= 2 && truncTailWordRx.test(keptSents[keptSents.length - 1].trim())) {
        keptSents.pop();
      }
      const prevText = keptSents.map(s => s.trim()).join(' ').trim();
      const prevWords = prevText.split(/\s+/).filter(Boolean).length;
      const skuHead = atoms?.brand_models?.[0]?.split(/\s+/)[0]?.toLowerCase() || '';
      const keepsSku = !skuHead || prevText.toLowerCase().includes(skuHead);

      if (prevWords >= minWords && keepsSku) {
        return { text: prevText, repaired: true };
      }
    }

    return { text: clean, repaired: false };
  }

  cleanQwenResponse(raw) {
    if (!raw || typeof raw !== 'string') return '';
    let text = raw.trim();
    // Strip markdown code fences
    text = text.replace(/^```(?:[a-z]*\r?\n)?/i, '').replace(/\r?\n```\s*$/i, '').trim();
    // Strip conversational greetings / chatter
    text = text.replace(/^(?:¡?hola!?\s*[^.!?\n]*[.!?\n]+\s*)/i, '');
    text = text.replace(/^(?:aquí (?:tienes|está|va)[^.!?:\n]*[:.!?\n]+\s*)/i, '');
    text = text.replace(/^(?:por supuesto[,:]?\s*[^.!?\n]*[.!?\n]+\s*)/i, '');
    text = text.replace(/^(?:claro[,:]?\s*[^.!?\n]*[.!?\n]+\s*)/i, '');
    text = text.replace(/^(?:borrador (?:revisado|final|pulido)[^.!?:\n]*[:.!?\n]+\s*)/i, '');
    text = text.replace(/^(?:párrafo (?:revisado|final|pulido)[^.!?:\n]*[:.!?\n]+\s*)/i, '');
    // Strip surrounding quotes
    if (text.startsWith('"') && text.endsWith('"') && text.length > 2) {
      text = text.slice(1, -1).trim();
    }
    if (text.startsWith('«') && text.endsWith('»') && text.length > 2) {
      text = text.slice(1, -1).trim();
    }
    // Strip trailing conversational sign-offs
    text = text.replace(/\s*(?:¡?espero que (?:disfrutes|te sirva|te sea útil|te guste)[^.!?\n]*[.!?:)]*)\s*$/i, '');
    text = text.replace(/\s*(?:¡?un saludo!?\s*)$/i, '');
    // Clean remaining markdown bold/italic
    text = text.split(/\r?\n/).map(l => l.replace(/[*_`#]+/g, '').trim()).filter(Boolean).join(' ').trim();
    return text;
  }

  // =========================================================================
  // CAPA 3 EMPRESARIAL: RERANKER SEMÁNTICO PAIRWISE 7-EJES (POOL TOP-24, 0% SESGO)
  // =========================================================================
  rerankCandidatesNeurosymbolic({
    candidates = [],
    rawPara = '',
    currentAnchor = '',
    frame = 'GENERAL_STYLE',
    atoms = {},
    isColonIntro = false,
    articleState = null,
    paraTopology = null,
    log = null
  }) {
    const t0 = Date.now();
    const pool = (candidates || []).slice(0, 24);
    if (!pool.length) return null;

    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const queryForSemantic = `${currentAnchor || ''} ${rawPara || ''}`.trim();
    const queryProfile = enterpriseRetriever.analyzeQuery(queryForSemantic, frame, atoms);
    const topicTokens = this.tokenize(rawPara || '').filter(t => t.length >= 5 && !SEMANTIC_STOPWORDS_ES.has(t));

    const atomGroups = [
      atoms?.shapes || [],
      atoms?.materials || [],
      atoms?.styles || [],
      atoms?.outfits || [],
      atoms?.coatings || [],
      atoms?.brand_models || []
    ].filter(g => g.length > 0);

    const scoredPool = pool.map((node, idx) => {
      const filled = this.fillSlotsInBrick(node.brick, atoms, frame, null, rawPara);
      const filledNorm = norm(filled);
      const liveHybrid = enterpriseRetriever.scoreCandidateHybrid(queryProfile, node.brick, filled);

      // Eje 1: Similitud Vectorial Densa 128-D + BM25 Léxico-Conceptual sobre borrador injertado (0..42)
      const axis1Sem = Math.min(42, liveHybrid.denseCosine * 34 + liveHybrid.bm25Score * 1.15);

      // Eje 2: Cobertura de Átomos Davidson + intersección de topic_tags ontológicos (0..25)
      let atomCovRatio = 0;
      if (atomGroups.length > 0) {
        let coveredGroups = 0;
        for (const grp of atomGroups) {
          const hit = grp.some(val => {
            const vNorm = norm(val);
            const parts = vNorm.split(/\s+/).filter(p => p.length >= 3);
            return filledNorm.includes(vNorm) || parts.some(p => filledNorm.includes(p));
          });
          if (hit) coveredGroups++;
        }
        atomCovRatio = coveredGroups / atomGroups.length;
      }
      let topicHits = 0;
      if (topicTokens.length > 0) {
        for (const tok of topicTokens) {
          if (filledNorm.includes(tok.slice(0, Math.min(6, tok.length)))) topicHits++;
        }
      }
      const topicRatio = topicTokens.length > 0 ? Math.min(1, topicHits / Math.min(6, topicTokens.length)) : 0.4;
      let axis2Atom = atomGroups.length > 0
        ? (atomCovRatio * 15 + topicRatio * 5 + liveHybrid.tagOverlap * 5)
        : (topicRatio * 16 + liveHybrid.tagOverlap * 9);
      if (frame === 'PRODUCT_FACTUAL' && atoms?.brand_models?.length) {
        const brandStem = norm(atoms.brand_models[0]).split(/\s+/)[0];
        if (brandStem && filledNorm.includes(brandStem)) axis2Atom = Math.min(25, axis2Atom + 5);
      }
      const targetRelations = new Set((atoms?.relations || []).map(r => r.relation).filter(r => r !== 'HAS_ATTRIBUTE'));
      if (targetRelations.size > 0) {
        const brickRels = new Set(Array.isArray(node.brick.causal_relations) ? node.brick.causal_relations : []);
        if (/\b(?:combinan?\s+con|junto\s+a|vestidos|lino|jeans|estilismos|conjuntos|looks)\b/i.test(filled)) brickRels.add('PAIRS_WITH_GARMENT');
        if (/\b(?:verano|todo\s+el\s+a[ñn]o|ciudad|pasarela|a[ñn]os\s*70|temporada)\b/i.test(filled)) brickRels.add('USED_IN_CONTEXT');
        if (/\b(?:gracias\s+a|por\s+lo\s+que|de\s+modo\s+que|para\s+que|logra|permite|consiguen|ya\s+que|porque)\b/i.test(filled)) brickRels.add('CAUSES_BENEFIT');
        if (/\b(?:rostro|facciones|cara|estiliza|favorece|sienta\s+bien|armoniza|suaviza)\b/i.test(filled)) brickRels.add('BALANCES_FACE_SHAPE');
        if (/\b(?:evitar|evita|descartar|no\s+oprim|no\s+presionen|sin\s+saturar|no\s+le\s+van)\b/i.test(filled)) brickRels.add('AVOID_FEATURE');

        let relMatches = 0;
        for (const tr of targetRelations) {
          if (brickRels.has(tr)) relMatches++;
        }
        const causalIsoBonus = Math.min(0.9, relMatches * 0.3);
        axis2Atom = Math.min(25, axis2Atom + causalIsoBonus);
      }
      if (atoms?.shapes?.length) {
        const hasShapeSlotOrMatch = (node.brick.slots || []).some(s => s.slot_type === 'SLOT_FRAME_SHAPE') ||
          atoms.shapes.some(sh => filledNorm.includes(norm(sh).slice(0, 6)));
        if (hasShapeSlotOrMatch) {
          axis2Atom = Math.min(25, axis2Atom + 3);
        }
      }

      // Eje 3: Alineación de Acto Discursivo (discourse_intent) + Polaridad + Continuidad de Persona (-25..+18)
      let axis3Disc = 10;
      if (liveHybrid.intentMatch) axis3Disc += 6;
      else if (liveHybrid.discourseIntent === 'STYLE_DEFINITION' || liveHybrid.discourseIntent === 'OUTFIT_COMBINATION') axis3Disc += 2.5;
      if (liveHybrid.polarity === queryProfile.polarity) axis3Disc += 2;
      if (/[;:¿¡—–]/.test(filled)) axis3Disc += 2.5;
      const neutralMatches = filled.match(/\b(?:tono equilibrado|silueta equilibrada|cualquier ocasión|pasta seleccionada)\b/gi) || [];
      axis3Disc -= Math.min(18, neutralMatches.length * 6);
      if (/^(?:esto es m[aá]s|para eso,|hacen que|te hace ser)\b/i.test(filled.trim())) {
        axis3Disc -= 25;
      }
      if (articleState) {
        const opener2w = filledNorm.trim().split(/\s+/).slice(0, 2).join(' ');
        if (articleState.prevOpener2w && opener2w === articleState.prevOpener2w) {
          axis3Disc -= 9;
        }
        if (articleState.prevPersona && liveHybrid.narrativePersona !== 'IMPERSONAL_THIRD' && articleState.prevPersona !== 'IMPERSONAL_THIRD' && liveHybrid.narrativePersona !== articleState.prevPersona) {
          axis3Disc -= 5;
        } else if (liveHybrid.narrativePersona === queryProfile.narrative_persona) {
          axis3Disc += 3;
        }
      }
      if (isColonIntro) {
        if (/\b(?:modelos|propuestas|opciones|claves|tendencias|destacan|apunta|temporada)\b/i.test(filledNorm)) axis3Disc += 10;
        if (/^(?:no solo|este tipo de)\b/i.test(filled.trim())) axis3Disc -= 12;
      }

      // Eje 4: Frescura entre artículos y dispersión (hasta +16 / fuerte penalización si repetido)
      const reuseCnt = Number(node.brick._crossArticleReuseCount || 0);
      const stemReuseCnt = Number(node.brick._crossArticleStemReuseCount || 0);
      let axis4Fresh = (reuseCnt === 0 && stemReuseCnt === 0)
        ? 16
        : -Math.min(48, reuseCnt * 22 + stemReuseCnt * 10);
      axis4Fresh += Math.max(-4, 4 - Number(node.totalCost || 50) * 0.04);

      // Eje 5: Ritmo biológico y burstiness intra-párrafo (0..12.5, penaliza ráfagas cortas planas)
      const sents = filled.split(/(?<=[.!?])\s+/).filter(s => s.length > 4);
      let axis5Burst = sents.length >= 3 ? 5 : (sents.length === 2 ? 3 : 0);
      if (sents.length >= 2) {
        const sLens = sents.map(s => s.split(/\s+/).filter(Boolean).length);
        const maxL = Math.max(...sLens);
        const minL = Math.min(...sLens);
        const spread = maxL - minL;
        if (spread >= 8) axis5Burst += 3;
        if (spread >= 14 && maxL >= 24) axis5Burst += 2.5;
        if (sents.length >= 4 && maxL <= 22) axis5Burst -= 4;
      }
      if (node.transition === 'CONTINUE') axis5Burst += 2;
      else if (node.transition === 'RETAIN') axis5Burst += 1;

      // Eje 6: Topología Discursiva RST + QUD + Cohesión de Halliday-Hasan
      const liveTopoProfile = discourseTopology.analyzeBrickDiscourseProfile(
        filled,
        node.brick._cleanWindow || node.brick.syntactic_skeleton || filled,
        node.brick.slots
      );
      const topoCompat = discourseTopology.scoreTopologyCompatibility(
        paraTopology?.role || 'SECTION_MEDIAL',
        liveTopoProfile,
        frame
      );
      let axis6Topo = topoCompat.score;
      if (
        paraTopology?.role === 'SECTION_OPENING' &&
        paraTopology?.posInSection === 1 &&
        !/\b(?:cuadrad|rectangul|geom[eé]tric)\b/i.test(rawPara || '') &&
        /^¿A\s+qu[eé]\s+famoso\b.*\bcuadrad/i.test(filled.trim())
      ) {
        axis6Topo -= 14;
      }
      if (discourseTopology.hasContrastiveMaterialRedundancy(node.brick._cleanWindow || '', rawPara, atoms, filled)) {
        axis6Topo -= 42;
      }

      // Eje 7: Guardián de Implicación Fáctica, Polaridad Ligada y Anclas Discriminativas
      const liveEntail = factualGuard.evaluateFactualEntailment(
        rawPara,
        filled,
        atoms?.discriminativeAnchors,
        atoms?.signedPolarity
      );
      let axis7Factual = liveEntail.polarityContradiction
        ? -95
        : Number((liveEntail.anchorCoverageRatio * 28 - liveEntail.missingCriticalTech.length * 44).toFixed(2));
      if (liveEntail.unrequestedTechLeak) {
        axis7Factual = Number((axis7Factual - 22).toFixed(2));
      }
      if (liveEntail.missingSafetyWarning) {
        axis7Factual = Number((axis7Factual - 18).toFixed(2));
      }

      const axisTotal = Number((axis1Sem + axis2Atom + axis3Disc + axis4Fresh + axis5Burst + axis6Topo + axis7Factual).toFixed(2));
      return {
        node,
        origRank: idx + 1,
        axisTotal,
        filledOpener2w: filledNorm.trim().split(/\s+/).slice(0, 2).join(' '),
        liveHybrid,
        liveEntail,
        axes: {
          sem: Number(axis1Sem.toFixed(1)),
          atom: Number(axis2Atom.toFixed(1)),
          disc: Number(axis3Disc.toFixed(1)),
          fresh: Number(axis4Fresh.toFixed(1)),
          burst: Number(axis5Burst.toFixed(1)),
          topo: Number(axis6Topo.toFixed(1)),
          fact: Number(axis7Factual.toFixed(1)),
          cos: liveHybrid.denseCosine,
          bm25: liveHybrid.bm25Score
        }
      };
    });

    scoredPool.sort((a, b) => b.axisTotal - a.axisTotal);
    const winner = scoredPool[0];
    if (articleState && winner) {
      articleState.prevOpener2w = winner.filledOpener2w;
      if (winner.liveHybrid.narrativePersona !== 'IMPERSONAL_THIRD') {
        articleState.prevPersona = winner.liveHybrid.narrativePersona;
      }
    }
    let fitScore = Math.min(10, Math.max(2, Math.round(winner.axisTotal / 10.2)));
    if (winner?.liveEntail?.isHonestFactualGap) {
      fitScore = Math.min(5, fitScore);
    }
    const durationMs = Date.now() - t0;
    const reason = `7-Ejes Híbrido [Rank #${winner.origRank}/${pool.length}]: cos=${winner.axes.cos}, bm25=${winner.axes.bm25}, atom=${winner.axes.atom}, disc=${winner.axes.disc}(${winner.liveHybrid.discourseIntent}), fresc=${winner.axes.fresh}, cad=${winner.axes.burst}, topo=${winner.axes.topo}, fact=${winner.axes.fact}`;

    if (log) {
      log(`[RERANKER_5_EJES] ${pool.length} candidatos | Ganador #${winner.origRank}: ${winner.node.brick.brick_id} (${winner.node.domain}) | Total=${winner.axisTotal} | Fit=${fitScore}/10 | ${reason} (${durationMs}ms)`);
    }

    return {
      usedReranker: true,
      mode: 'enterprise-hybrid-7axis',
      candidateCount: pool.length,
      chosenRank: winner.origRank,
      chosenNode: winner.node,
      fitScore,
      entailmentAudit: winner.liveEntail,
      reason,
      durationMs,
      poolSummary: scoredPool.slice(0, 10).map(sp => ({
        rank: sp.origRank,
        brick_id: sp.node.brick.brick_id,
        domain: sp.node.domain,
        score: sp.node.score,
        semScore: sp.node.brick._semScore || 0,
        denseCosine: sp.axes.cos,
        bm25: sp.axes.bm25,
        intent: sp.liveHybrid.discourseIntent,
        axisTotal: sp.axisTotal,
        fresh: sp.node.brick._crossArticleFresh !== false
      }))
    };
  }

  // =========================================================================
  // CAPA 3 DEL SELECTOR: JUEZ SEMÁNTICO RERANKER (SOLO ELIGE 1..6, NO REESCRIBE)
  // =========================================================================
  async rerankCandidatesWithQwen({
    candidates,
    rawPara,
    currentAnchor,
    frame,
    atoms,
    tuples,
    extractedFacts,
    modelName,
    log,
    qwenStats,
    isColonIntro = false,
    centeringCb = ''
  }) {
    const pool = (candidates || []).slice(0, 3);
    if (!pool.length) return null;

    const estimateDeterministicFit = (node) => {
      const s = node?.brick?._semScore || 0;
      return Math.min(9, Math.max(3, Math.round(3 + s / 4.5)));
    };

    if (pool.length === 1) {
      const only = pool[0];
      const est = estimateDeterministicFit(only);
      return {
        chosenNode: only,
        chosenRank: 1,
        fitScore: est,
        reason: 'Candidato único tras filtros de coherencia',
        candidateCount: 1,
        poolSummary: [{ rank: 1, brick_id: only.brick.brick_id, domain: only.domain, semScore: only.brick._semScore || 0 }]
      };
    }

    const previews = pool.map(node => {
      let piece = this.fillSlotsInBrick(node.brick, atoms, frame, tuples?.[0] || null);
      const pieceFirstSent = (piece || '').split(/(?<=[.!?])\s+/)[0] || piece || '';
      const hasExplicitSubject = /\b(?:modelo|diseño|gafa|gafas|montura|monturas|silueta|lentes|cristales|acetato|metal|ray-ban|persol|chlo[eé]|gucci|prada|oakley)\b/i.test(pieceFirstSent);
      if (piece && !hasExplicitSubject && node.profile?.hasProDrop) {
        const healed = this.healProDropSubject(piece, centeringCb, atoms);
        if (healed.healed) piece = healed.text;
      }
      const drafted = this.buildDonorGraftedDraft({
        skeletonPieces: piece ? [piece] : [],
        tuples,
        atoms,
        extractedFacts,
        frame,
        centering: { cb: centeringCb, hinge: null },
        endsWithColon: isColonIntro
      });
      const text = (drafted || piece || node.brick._cleanWindow || '').replace(/\s+/g, ' ').trim();
      return text.length > 240 ? `${text.slice(0, 237)}...` : text;
    });

    const targetSummary = (extractedFacts && extractedFacts.trim().length >= 25
      ? extractedFacts.replace(/\s+/g, ' ').trim()
      : (rawPara || '').replace(/\s+/g, ' ').trim()
    ).slice(0, 280);

    const candidateLines = previews.map((txt, idx) => `${idx + 1}) ${txt}`).join('\n');

    const prompt = `Elige el candidato que mejor encaja en tema, intención y coherencia editorial con la SECCIÓN y la IDEA OBJETIVO.

SECCIÓN: ${currentAnchor || 'Introducción del artículo'}
TIPO: ${isColonIntro ? 'Frase introductoria que termina en dos puntos (:) para presentar modelos o consejos' : frame}
IDEA OBJETIVO: ${targetSummary}

CANDIDATOS:
${candidateLines}

CRITERIOS:
- Prioriza el candidato que realmente trata el mismo subtema, estilo, material o función que la SECCIÓN y la IDEA OBJETIVO.
- Descarta candidatos que contradigan la idea objetivo, hablen de temas ajenos (clima, lluvia, ropa formal, problemas médicos) o suenen bruscos/fuera de lugar.
- Califica el ENCAJE real de 1 a 10 (9-10 exacto, 7-8 bueno, 4-6 genérico o hueco de banco, 1-3 forzado).
- Responde ÚNICAMENTE una línea con el formato exacto:
ELEGIDO: <número del 1 al ${pool.length}> | ENCAJE: <1-10> | MOTIVO: <máx 10 palabras>`;

    const poolSummary = pool.map((n, idx) => ({
      rank: idx + 1,
      brick_id: n.brick.brick_id,
      domain: n.domain,
      score: n.score,
      semScore: n.brick._semScore || 0
    }));

    try {
      const res = await ollamaClient.generate(modelName, prompt, {
        system: 'Eres un editor jefe de óptica y moda que selecciona el mejor borrador candidato por coherencia temática. Nunca reescribas textos; responde solo una línea con el formato exacto: ELEGIDO: N | ENCAJE: X | MOTIVO: ...',
        temperature: 0.0,
        top_p: 0.85,
        num_predict: 44,
        cleanPlainText: true
      });

      qwenStats.calls += 1;
      qwenStats.totalDurationMs += res.durationMs;
      qwenStats.totalTokens += res.eval_count || 0;

      const rawOut = (res.response || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
      const chosenMatch = rawOut.match(/(?:ELEGIDO|OPCI[OÓ]N|CANDIDATO)\s*[:#=-]?\s*<?(\d+)>?/i) || rawOut.match(/\b([1-6])\b/);
      let chosenNum = chosenMatch ? parseInt(chosenMatch[1], 10) : 1;
      if (!Number.isFinite(chosenNum) || chosenNum < 1 || chosenNum > pool.length) {
        chosenNum = 1;
      }
      const chosenNode = pool[chosenNum - 1];

      const fitMatch = rawOut.match(/(?:ENCAJE|PUNTUACI[OÓ]N|NOTA|SCORE)\s*[:=-]?\s*<?(\d{1,2})>?/i);
      let fitScore = fitMatch ? parseInt(fitMatch[1], 10) : estimateDeterministicFit(chosenNode);
      if (!Number.isFinite(fitScore) || fitScore < 1 || fitScore > 10) {
        fitScore = estimateDeterministicFit(chosenNode);
      }

      const reasonMatch = rawOut.match(/MOTIVO\s*[:=-]?\s*(.+)$/i);
      const reason = reasonMatch
        ? reasonMatch[1].replace(/^["']|["']$/g, '').trim().slice(0, 110)
        : 'Mayor afinidad temática y editorial en el pool';

      const poolCompact = poolSummary.map(p => `#${p.rank}:${p.brick_id}(sem:${p.semScore})`).join(', ');
      log(`[QWEN_FASE_2_RERANKER] Pool [${poolCompact}] (${res.durationMs}ms) -> Elegido #${chosenNum}: ${chosenNode.brick.brick_id} (${chosenNode.domain}) | Encaje: ${fitScore}/10 | Motivo: ${reason}`);

      return {
        chosenNode,
        chosenRank: chosenNum,
        fitScore,
        reason,
        candidateCount: pool.length,
        durationMs: res.durationMs,
        evalCount: res.eval_count || 0,
        rawResponse: rawOut,
        poolSummary
      };
    } catch (err) {
      qwenStats.failures += 1;
      const fallbackNode = pool[0];
      const est = estimateDeterministicFit(fallbackNode);
      log(`[QWEN_FASE_2_RERANKER_FALLBACK] Error en juez semántico (${err.message}). Conservado #1: ${fallbackNode.brick.brick_id} (Encaje est.: ${est}/10).`);
      return {
        chosenNode: fallbackNode,
        chosenRank: 1,
        fitScore: est,
        reason: `Fallback top-1 TF-IDF (${err.message})`,
        candidateCount: pool.length,
        durationMs: 0,
        evalCount: 0,
        rawResponse: '',
        poolSummary
      };
    }
  }

  async compileCollocationalWithQwen({
    graftedDonorDraft,
    endsWithColon = false,
    atoms,
    centering,
    currentAnchor,
    frame,
    modelName,
    log,
    qwenStats,
    attempt = 1,
    temperature = 0.10,
    feedback = null
  }) {
    const draftClean = (graftedDonorDraft || '').trim();
    const draftForPrompt = endsWithColon ? draftClean.replace(/:\s*$/, '.') : draftClean;
    const draftWords = draftForPrompt.split(/\s+/).filter(Boolean).length;
    const numPredict = Math.min(360, Math.max(120, Math.round(draftWords * 2.7)));

    const draftLowerForMand = draftForPrompt.toLowerCase();
    const presentProper = (atoms?.proper_entities || []).filter(e => draftLowerForMand.includes(e.toLowerCase()));
    const mandatoryTokens = [...new Set([
      ...(atoms?.brand_models || []),
      ...presentProper
    ])];
    const entityRule = mandatoryTokens.length
      ? `Conserva exactamente estas entidades y códigos: ${mandatoryTokens.join(', ')}.`
      : `Evita añadir introducciones, resúmenes, títulos o temas que no estén en el texto.`;
    const proDropRule = centering.hasProDrop
      ? `Asegura sujeto explícito si la oración lo requiere.`
      : `Evita repetir encabezados innecesarios.`;

    const feedbackNotice = feedback
      ? `\nADVERTENCIA DEL INTENTO PREVIO: Tu versión anterior fue rechazada porque: "${feedback}". En esta ocasión está estrictamente prohibido cometer ese error. Conserva las oraciones originales sin parafrasear.`
      : '';

    // Plain-language morphosyntactic slot compiler & harmonizer (preserves organic human punctuation & cadence)
    const prompt = `Verifica la concordancia gramatical (artículos, preposiciones, género y número) del siguiente borrador editorial en español conservando al menos el 90% de las palabras, la puntuación y el tono humano exacto del texto original.

REGLAS ESTRICTAS:
1. ${entityRule} ${proDropRule}
2. Corrige ÚNICAMENTE errores reales de género, número, artículos o preposiciones donde se insertaron marcas, modelos o atributos.
3. Conserva intactos los giros coloquiales válidos (como "están genial", "este tipo de monturas", expresiones conversacionales), los verbos en subjuntivo, el orden de las palabras y la puntuación expresiva original; está prohibido reescribir, "mejorar" el estilo o sustituir expresiones correctas.
4. Prohibido inventar datos, materiales o características técnicas nuevas.
5. Si el texto entregado ya concuerda bien en género y número, devuélvelo exactamente igual letra por letra sin modificar nada.
6. Devuelve únicamente el texto final en un solo párrafo, sin comillas, sin listas y sin citar estas instrucciones.${feedbackNotice}

Texto: "${draftForPrompt}"`;

    const res = await ollamaClient.generate(modelName, prompt, {
      system: 'Eres un corrector morfosintáctico ultraconservador para artículos editoriales en español. Tu única función es reparar discordancias objetivas de género, número o artículos donde se insertaron marcas o modelos, dejando intactos los códigos SKU, los giros coloquiales, la puntuación y la sintaxis original del autor. Si el texto ya es gramaticalmente coherente, devuélvelo idéntico sin cambiar ninguna palabra ni coma.',
      temperature: Number(temperature.toFixed(2)),
      top_p: 0.90,
      num_predict: numPredict,
      cleanPlainText: true
    });

    qwenStats.calls += 1;
    qwenStats.totalDurationMs += res.durationMs;
    qwenStats.totalTokens += res.eval_count || 0;

    let cleanedText = this.cleanQwenResponse(res.response);
    cleanedText = this.stripLeadingAnchorEcho(cleanedText, centering.cb, draftClean, currentAnchor);

    // Shield against Qwen 1.5B mid-sentence continuation (lowercase start dropping initial subject/SKU)
    if (cleanedText && !/^[A-ZÁÉÍÓÚÑ¡¿0-9]/.test(cleanedText)) {
      const firstDraftSent = draftClean.split(/(?<=[.!?])\s+/)[0] || '';
      const firstDot = cleanedText.indexOf('.');
      if (firstDraftSent && firstDot > 0 && firstDot < cleanedText.length - 12) {
        const restAfterBrokenFirst = cleanedText.slice(firstDot + 1).trim();
        cleanedText = `${firstDraftSent} ${restAfterBrokenFirst}`.trim();
      } else {
        cleanedText = '';
      }
    }

    cleanedText = this.enforceBrandSku(cleanedText, atoms);

    const minTailWords = Math.min(25, Math.max(10, Math.floor(draftWords * 0.55)));
    const tailFix = this.repairTruncatedTail(cleanedText, atoms, minTailWords);
    if (tailFix.repaired) {
      cleanedText = tailFix.text;
    }
    if (endsWithColon && cleanedText.length > 0) {
      cleanedText = cleanedText.replace(/[.!?]+$/, '') + ':';
    }

    log(`[QWEN_FASE_4_INJERTO] Intento ${attempt} | Modelo: ${res.model} | Temp: ${Number(temperature.toFixed(2))} | Predict: ${numPredict} | Latencia: ${res.durationMs}ms | Tokens: ${res.eval_count}${tailFix.repaired ? ' | Cola truncada podada' : ''}`);
    log(`[QWEN_FASE_4_ENTRADA_ESQUELETO] "${draftClean}"`);
    log(`[QWEN_FASE_4_RESULTADO] ${cleanedText || '(respuesta vacía)'}`);

    return {
      model: res.model,
      durationMs: res.durationMs,
      evalCount: res.eval_count || 0,
      prompt,
      text: cleanedText
    };
  }

  analyzeAlterations(candidate, reference, atoms = null) {
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    const refWords = norm(reference);
    const candWords = norm(candidate);
    const refSet = new Set(refWords);
    const candSet = new Set(candWords);

    const preserved = refWords.filter(w => candSet.has(w)).length;
    const retentionRate = refWords.length > 0 ? Number(((preserved / refWords.length) * 100).toFixed(1)) : 100;
    const alterationRate = Number((100 - retentionRate).toFixed(1));

    const added = candWords.filter(w => !refSet.has(w));
    const removed = refWords.filter(w => !candSet.has(w));

    const grammaticalTokens = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del',
      'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre',
      'hacia', 'hasta', 'mediante', 'para', 'por', 'segun', 'según', 'sin', 'so', 'sobre', 'tras',
      'y', 'e', 'ni', 'que', 'o', 'u', 'pero', 'sino', 'aunque', 'si', 'como', 'ya',
      'cuando', 'donde', 'mientras', 'porque', 'pues', 'asi', 'así', 'bien', 'tan', 'tanto',
      'mas', 'más', 'menos', 'muy', 'tambien', 'también', 'asimismo',
      'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
      'se', 'le', 'les', 'lo', 'la', 'los', 'las', 'su', 'sus', 'mi', 'mis', 'tu', 'tus',
      'es', 'son', 'ser', 'era', 'eran', 'fue', 'fueron', 'sido', 'esta', 'está', 'estan', 'están',
      'estar', 'hay', 'hubo', 'tiene', 'tienen', 'tener', 'queda', 'quedan', 'parece', 'parecen',
      'puede', 'pueden', 'podria', 'podría', 'podrian', 'podrían', 'sea', 'sean', 'hace', 'hacen'
    ]);

    const gramChanges = [];
    const stemInflections = [];
    const lexChanges = [];

    for (const w of added) {
      if (grammaticalTokens.has(w)) {
        gramChanges.push(w);
      } else {
        const isStemMatch = refWords.some(rw => rw.length >= 4 && (rw.startsWith(w.slice(0, 4)) || w.startsWith(rw.slice(0, 4))));
        if (isStemMatch) {
          stemInflections.push(w);
        } else {
          lexChanges.push(w);
        }
      }
    }

    let typeSummary = '';
    if (lexChanges.length === 0) {
      if (gramChanges.length === 0 && stemInflections.length === 0 && removed.length === 0) {
        typeSummary = 'Sin modificaciones (texto base intacto)';
      } else {
        typeSummary = `Concordancia morfosintáctica pura (${gramChanges.length} enlaces/artículos, ${stemInflections.length} flexiones)`;
      }
    } else {
      typeSummary = `Alerta: ${lexChanges.length} palabras léxicas añadidas (${lexChanges.slice(0, 3).join(', ')})`;
    }

    return {
      refWordCount: refWords.length,
      candWordCount: candWords.length,
      retentionRate,
      alterationRate,
      addedCount: added.length,
      removedCount: removed.length,
      grammaticalChanges: [...new Set(gramChanges)],
      stemInflections: [...new Set(stemInflections)],
      lexicalChanges: [...new Set(lexChanges)],
      typeSummary
    };
  }

  selectBestCandidateFallback(attemptHistory, graftedDonorDraft) {
    if (!attemptHistory || !attemptHistory.length) return null;
    let best = null;
    let bestScore = -9999;
    for (const item of attemptHistory) {
      if (!item.text || item.text.length < 20) continue;
      let sc = 100;
      const m = item.metrics || {};
      if (m.lexicalChanges && m.lexicalChanges.length > 0) {
        sc -= m.lexicalChanges.length * 25; // penalización severa por inventar palabras no autorizadas
      }
      sc -= Math.abs(100 - (m.retentionRate || 100)) * 0.5;
      if (/[.!?]$/.test(item.text)) sc += 15;
      if (sc > bestScore) {
        bestScore = sc;
        best = { ...item, score: sc, reason: `Mejor aproximación morfosintáctica (score: ${sc.toFixed(1)}, retención: ${m.retentionRate}%)` };
      }
    }
    return best;
  }

  computeWordRetentionRatio(candidate, reference) {
    if (!candidate || !reference) return 0;
    const candWords = this.tokenize(candidate);
    const refWords = this.tokenize(reference);
    if (!refWords.length) return 1;
    const candSet = new Set(candWords);
    let matched = 0;
    for (const rw of refWords) {
      if (candSet.has(rw)) matched++;
    }
    return matched / refWords.length;
  }

  findUnauthorizedContentWords(candidate, reference, atoms, rawPara = '', anchor = '') {
    if (!candidate || !reference) return [];
    const allowedFunctional = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del',
      'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'del', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'segun', 'según', 'sin', 'so', 'sobre', 'tras', 'versus', 'via', 'vía',
      'y', 'e', 'ni', 'que', 'o', 'u', 'pero', 'sino', 'aunque', 'si', 'como', 'ya', 'cuando', 'donde', 'mientras', 'porque', 'pues', 'entonces', 'asi', 'así', 'bien', 'tan', 'tanto', 'mas', 'más', 'menos', 'muy', 'tambien', 'también', 'asimismo',
      'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'se', 'le', 'les', 'lo', 'la', 'los', 'las', 'me', 'te', 'nos', 'os', 'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'cuyo', 'cuya', 'cuyos', 'cuyas',
      'es', 'son', 'ser', 'era', 'eran', 'fue', 'fueron', 'sido', 'esta', 'está', 'estan', 'están', 'estar', 'estaba', 'estaban', 'estuve', 'estuvieron', 'hay', 'hubo', 'habia', 'había', 'tiene', 'tienen', 'tener', 'tenia', 'tenían', 'resulta', 'resultan', 'queda', 'quedan', 'parece', 'parecen', 'puede', 'pueden', 'podria', 'podría', 'podrian', 'podrían', 'sea', 'sean', 'siendo', 'hace', 'hacen', 'hacer', 'dar', 'da', 'dan', 'ir', 'va', 'van',
      'buscar', 'buscas', 'busca', 'buscan', 'buscando',
      'encontrar', 'encuentras', 'encuentra', 'encuentran',
      'preferir', 'prefieres', 'prefiere', 'prefieren',
      'optar', 'optas', 'opta', 'optan',
      'elegir', 'eliges', 'elige', 'eligen',
      'querer', 'quieres', 'quiere', 'quieren',
      'asegurar', 'aseguras', 'asegura', 'aseguran',
      'acertar', 'aciertas', 'acierta', 'aciertan',
      'gustar', 'gustas', 'gusta', 'gustan',
      'lucir', 'luces', 'luce', 'lucen',
      'llevar', 'llevas', 'lleva', 'llevan',
      'adaptar', 'adaptas', 'adapta', 'adaptan', 'adaptando', 'adaptado', 'adaptada',
      'ajustar', 'ajustas', 'ajusta', 'ajustan', 'ajustando', 'ajustado', 'ajustada',
      'encajar', 'encajas', 'encaja', 'encajan', 'encajando',
      'favorecer', 'favoreces', 'favorece', 'favorecen', 'favoreciendo',
      'sentar', 'sientas', 'sienta', 'sientan', 'sentando',
      'estilizar', 'estilizas', 'estiliza', 'estilizan', 'estilizando',
      'embargo', 'temporada', 'epoca', 'época', 'ano', 'año', 'anos', 'años',
      'destacar', 'destaca', 'destacan', 'permitir', 'permite', 'permiten',
      'ofrecer', 'ofrece', 'ofrecen', 'aportar', 'aporta', 'aportan',
      'mantener', 'mantiene', 'mantienen', 'suavizar', 'suaviza', 'suavizan',
      'combinar', 'combina', 'combinan', 'proteger', 'protege', 'protegen',
      'equilibrar', 'equilibra', 'equilibran', 'resaltar', 'resalta', 'resaltan',
      'caso', 'casos', 'cuanto', 'relacion', 'relación', 'respecto', 'sentido', 'punto', 'puntos',
      'lado', 'parte', 'partes', 'modo', 'manera', 'forma', 'formas', 'cuenta', 'lugar', 'terminos', 'términos', 'lineas', 'líneas'
    ]);

    const opticalCore = new Set([
      'gafa', 'gafas', 'sol', 'lente', 'lentes', 'cristal', 'cristales', 'montura', 'monturas', 'armazon', 'varilla', 'varillas', 'puente', 'silueta', 'diseno', 'modelo', 'forma', 'estilo', 'aire', 'toque', 'pieza', 'faccion', 'facciones', 'rostro', 'rostros', 'cara', 'caras'
    ]);

    const normalizeWord = (w) => (w || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
    const allowedSource = [
      reference,
      JSON.stringify(atoms || {}),
      rawPara || '',
      anchor || ''
    ].join(' ');

    const refWords = this.tokenize(allowedSource).map(normalizeWord).filter(w => w.length >= 3);
    const refStems = new Set(refWords);

    const candWords = this.tokenize(candidate).map(normalizeWord).filter(w => w.length >= 3);
    const unauthorized = [];

    for (const w of candWords) {
      if (allowedFunctional.has(w)) continue;
      if (opticalCore.has(w)) continue;
      if (refStems.has(w)) continue;
      let matchedStem = false;
      for (const stem of refStems) {
        if (stem.length >= 4 && (w.startsWith(stem.slice(0, -1)) || stem.startsWith(w.slice(0, -1)))) {
          matchedStem = true;
          break;
        }
        // Allow genuine Spanish verb/gender inflections (-an/-en, -os/-as, -ar/-er) and 1-char typo fixes on >=6-char words with shared 4-char root (e.g. vuelvan -> vuelven / vuelan)
        if (stem.length >= 6 && w.length >= 6) {
          const rootLen = Math.min(stem.length, w.length) - 2;
          if (rootLen >= 4 && stem.slice(0, rootLen) === w.slice(0, rootLen)) {
            matchedStem = true;
            break;
          }
          // 1-char edit distance with matching 4-char prefix (restrict equal-length substitutions to inflectional suffix so internal vowel typos like destaque->destique fail)
          if (Math.abs(stem.length - w.length) <= 1 && stem.slice(0, 4) === w.slice(0, 4)) {
            let diffs = 0;
            let firstDiffPos = -1;
            let a = 0;
            let b = 0;
            while (a < stem.length && b < w.length) {
              if (stem[a] === w[b]) { a++; b++; }
              else {
                if (firstDiffPos === -1) firstDiffPos = Math.min(a, b);
                diffs++;
                if (diffs > 1) break;
                if (stem.length > w.length) a++;
                else if (w.length > stem.length) b++;
                else { a++; b++; }
              }
            }
            const totalDiffs = diffs + (stem.length - a) + (w.length - b);
            const effPos = firstDiffPos !== -1 ? firstDiffPos : Math.min(a, b);
            const suffixFloor = stem.length === w.length
              ? Math.max(4, stem.length - 2)
              : Math.max(4, Math.min(stem.length, w.length) - 3);
            if (totalDiffs <= 1 && effPos >= suffixFloor) {
              matchedStem = true;
              break;
            }
          }
        }
      }
      if (!matchedStem) {
        unauthorized.push(w);
      }
    }
    return [...new Set(unauthorized)];
  }

  validateQwenGraft(candidateText, rawPara, atoms, graftedDonorDraft = null, frame = 'GENERAL_STYLE', currentAnchor = '') {
    if (!candidateText || typeof candidateText !== 'string') return { ok: false, reason: 'Salida vacía' };
    const clean = candidateText.trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const refText = graftedDonorDraft || rawPara;
    const refWords = refText.split(/\s+/).filter(Boolean).length;

    if (refWords >= 12 && words.length < Math.max(8, Math.floor(refWords * 0.55))) {
      return { ok: false, reason: `Salida demasiado corta (${words.length} vs ${refWords} palabras)` };
    }
    if (refWords >= 10 && words.length > Math.ceil(refWords * 1.45) + 8) {
      return { ok: false, reason: `Salida inflada (${words.length} vs ${refWords} palabras)` };
    }
    if (/\*\*|(?:^|\s)-\s+[A-ZÁÉÍÓÚÑ]+:|(?:Modelo|Montura|Estilo|Material|Propiedad|Accesorio|Forma|Uso)\s*:/i.test(clean)) {
      return { ok: false, reason: 'Formato Markdown/lista clave-valor detectado' };
    }
    if (/MOLDE DE REFERENCIA|BORRADOR FÁCTICO|BORRADOR A PULIR|PROPOSICIONES FÁCTICAS|COMPILADOR DE CADENCIA|PÁRRAFO FINAL|REGLAS ESTRICTAS|CADENCIA OBJETIVO|Hechos clave:|ÁTOMOS:|brick_?\d+|score:\d+/i.test(clean)) {
      return { ok: false, reason: 'Fuga de etiquetas o metadatos internos' };
    }

    const rawTrimmed = (rawPara || '').trim();
    if (!rawTrimmed.endsWith(':') && !/[.!?]$/.test(clean)) {
      return { ok: false, reason: 'Oración sin cierre puntuado al final' };
    }

    // Reject mid-sentence truncation using Spanish-safe boundary across ALL Spanish prepositions, conjunctions, articles and dangling verbs
    if (
      /[¡¿][^!?]*$/.test(clean) ||
      /(?<=^|[\s,;:¡¿"«(])(sobre|bajo|tras|ante|contra|desde|entre|hacia|hasta|mediante|según|sin|durante|el|la|los|las|un|una|unos|unas|de|del|al|con|en|por|para|que|y|o|u|e|ni|pero|aunque|sino|ya|su|sus|como|cuando|donde|mientras|porque|pues|aporta|aportan|combina|combinando|ofrece|ofrecen|destaca|destacan)\.?$/i.test(clean)
    ) {
      return { ok: false, reason: 'Oración truncada al final' };
    }

    // Reject high trigram overlap vs original input rawPara (must genuinely reconstruct from donors!)
    const trigramOverlap = this.computeNGramOverlapRatio(clean, rawPara, 3);
    if (words.length >= 15 && trigramOverlap > 0.30) {
      return { ok: false, reason: `Similitud excesiva de trigramas con el original (${(trigramOverlap * 100).toFixed(1)}% > 30%)` };
    }
    if (words.length >= 10 && words.length < 15 && trigramOverlap > 0.35) {
      return { ok: false, reason: `Similitud excesiva de trigramas en transición (${(trigramOverlap * 100).toFixed(1)}% > 35%)` };
    }

    // Verify candidate actually polished graftedDonorDraft rather than rewriting from scratch
    if (graftedDonorDraft && graftedDonorDraft.split(/\s+/).filter(Boolean).length >= 12) {
      const donorWordRetention = this.computeWordRetentionRatio(clean, graftedDonorDraft);
      if (donorWordRetention < 0.78) {
        return { ok: false, reason: `Modificación de Qwen demasiado agresiva (${(donorWordRetention * 100).toFixed(1)}% palabras retenidas < 78%)` };
      }
      const unauthorized = this.findUnauthorizedContentWords(clean, graftedDonorDraft, atoms, rawPara, currentAnchor);
      if (unauthorized.length > 0) {
        return { ok: false, reason: `Términos léxicos no autorizados introducidos por Qwen (${unauthorized.slice(0, 4).join(', ')})` };
      }
    }

    const rawLower = rawPara.toLowerCase();
    const cleanLower = clean.toLowerCase();

    if (grammaticalSurgery.hasGeneralSpanishAgreementError(clean)) {
      return { ok: false, reason: 'Discordancia general de género o número en español' };
    }
    if (/\b(?:opciones|alternativas|propuestas|siluetas|monturas|gafas|prendas|formas|líneas|lentes|piezas)\s+(?:m[aá]s\s+)?[a-záéíóúüñ]+as\s+y\s+[a-záéíóúüñ]+(?:ic|os|iv|ad|id|er|n)os\b/i.test(cleanLower)) {
      return { ok: false, reason: 'Discordancia de género en adjetivos coordinados' };
    }
    if (/^(?:El|La|Los|Las|Este|Esta|Estos|Estas)\s+[^,.;!?]{2,35}\s+es\s+por\s+(?:eso|ello)\s+que\b/i.test(clean)) {
      return { ok: false, reason: 'Colisión sintáctica de sujeto ante "es por eso/ello que"' };
    }
    if (/\b(?:los|unos|estos|esos|el|un|este|ese)\s+monturas?\b|\b(?:las|unas|estas|esas)\s+montura\b/i.test(cleanLower)) {
      return { ok: false, reason: 'Discordancia de determinante y sustantivo en "montura/monturas"' };
    }
    if (/\b(?:tipo|clase)\s+de\s+[a-záéíóúüñ]+s\s+(?:est[aá]|es)\s+[a-záéíóúüñ]+da\b/i.test(cleanLower)) {
      return { ok: false, reason: 'Discordancia de número/género en construcción partitiva' };
    }

    const draftLowerCheck = (graftedDonorDraft || '').toLowerCase();

    if (atoms.brand_models && atoms.brand_models.length > 0) {
      const fullSku = atoms.brand_models[0].trim();
      const parts = fullSku.split(/\s+/).filter(Boolean);
      const brandHead = parts[0].toLowerCase();
      if (!cleanLower.includes(brandHead)) {
        return { ok: false, reason: `Marca omitida (${fullSku})` };
      }
      if (parts.length > 1) {
        const skuCode = parts[1].toLowerCase();
        if (!cleanLower.includes(skuCode)) {
          return { ok: false, reason: `Código SKU omitido (${fullSku})` };
        }
      }
    }

    if (atoms.proper_entities && atoms.proper_entities.length > 0 && draftLowerCheck) {
      for (const ent of atoms.proper_entities) {
        if (draftLowerCheck.includes(ent.toLowerCase()) && !cleanLower.includes(ent.toLowerCase())) {
          return { ok: false, reason: `Entidad cultural/histórica del borrador omitida por Qwen (${ent})` };
        }
      }
    }

    const competing = this.isCompetingBrand(cleanLower, rawLower, this.tokenize(rawPara));
    if (competing) {
      return { ok: false, reason: `Marca competidora intrusa detectada (${competing})` };
    }
    return { ok: true };
  }

  // =========================================================================
  // FASE 5: AUDITORÍA K-GRAMAS (k <= 6), QWEN ANTIPLAGIO Y RUPTURA SIMBÓLICA
  // =========================================================================
  findShingleOverlaps(candidateText, sourceEntries, minShingleLen = 7) {
    const candWords = this.tokenize(candidateText);
    const overlaps = [];
    if (candWords.length < minShingleLen) return overlaps;

    const seenShingles = new Set();
    for (const src of sourceEntries) {
      const srcStr = typeof src === 'string' ? src : (src.raw_text || src.text || '');
      const srcWords = this.tokenize(srcStr);
      if (srcWords.length < minShingleLen) continue;
      const srcJoined = ` ${srcWords.join(' ')} `;

      for (let i = 0; i <= candWords.length - minShingleLen; i++) {
        const shingle = candWords.slice(i, i + minShingleLen).join(' ');
        if (srcJoined.includes(` ${shingle} `) && !seenShingles.has(shingle)) {
          seenShingles.add(shingle);
          overlaps.push({
            shingle,
            index: i,
            sourceId: typeof src === 'string' ? 'fuente' : (src.brick_id || src.donor_id || 'donante')
          });
        }
      }
    }
    return overlaps;
  }

  findAllCorpusOverlaps(candidateText, donorsUsedInPara = [], minShingleLen = 7) {
    const donorOverlaps = this.findShingleOverlaps(candidateText, donorsUsedInPara, minShingleLen);
    const corpusOverlaps = this.checkPlagiarismShingles(candidateText, minShingleLen);
    const merged = [];
    const seen = new Set();
    for (const o of [...donorOverlaps, ...corpusOverlaps]) {
      if (!seen.has(o.shingle)) {
        seen.add(o.shingle);
        merged.push(o);
      }
    }
    return merged;
  }

  async breakShinglesWithQwen(candidateText, overlaps, modelName, log, qwenStats) {
    const flaggedList = overlaps.slice(0, 6).map(o => `- "${o.shingle}"`).join('\n');
    const candWords = (candidateText || '').split(/\s+/).filter(Boolean).length;
    const numPredict = Math.min(220, Math.max(95, Math.round(candWords * 2.5)));
    const prompt = `Cambia 1 o 2 palabras dentro de cada secuencia listada para romper coincidencias exactas de 7+ palabras, conservando el significado, las marcas/códigos SKU y el tono natural.
Devuelve SOLO el párrafo completo en español, sin comillas.

SECUENCIAS A ROMPER:
${flaggedList}

PÁRRAFO:
"${candidateText}"`;

    const res = await ollamaClient.generate(modelName, prompt, {
      system: 'Eres un editor en español experto en paráfrasis mínima. Sustituye 1 o 2 palabras en las secuencias indicadas conservando marcas y códigos SKU exactos.',
      temperature: 0.15,
      num_predict: numPredict,
      cleanPlainText: true
    });

    qwenStats.calls += 1;
    qwenStats.totalDurationMs += res.durationMs;
    qwenStats.totalTokens += res.eval_count || 0;

    log(`[QWEN_FASE_5_ANTIPLAGIO] Modelo: ${res.model} | Solapamientos enviados: ${overlaps.length} | Latencia: ${res.durationMs}ms | Tokens: ${res.eval_count}`);
    log(`[QWEN_FASE_5_RESULTADO] "${res.response}"`);

    return {
      model: res.model,
      durationMs: res.durationMs,
      evalCount: res.eval_count || 0,
      text: (res.response || '').trim()
    };
  }

  applySymbolicShingleBreaker(text, donorsUsedInPara, atoms = null, usedReplacements = new Set(), minShingleLen = 7) {
    let current = text;
    const protectedBrandTokens = new Set([
      ...(atoms?.brand_models || []).flatMap(bm => this.tokenize(bm)),
      ...(atoms?.proper_entities || []).flatMap(pe => this.tokenize(pe))
    ]);

    const microSwaps = [
      { rx: /\bde esta manera\b/i, rep: 'así,' },
      { rx: /\bde esta forma\b/i, rep: 'de este modo' },
      { rx: /\bse caracterizan por\b/i, rep: 'destacan por' },
      { rx: /\bse han convertido en\b/i, rep: 'son hoy' },
      { rx: /\bde manera\b/i, rep: 'de forma' },
      { rx: /\bhoy en día\b/i, rep: 'actualmente' },
      { rx: /\ben la actualidad\b/i, rep: 'hoy en día' },
      { rx: /\bsin embargo\b/i, rep: 'no obstante' },
      { rx: /\bpor lo que\b/i, rep: 'de modo que' },
      { rx: /\bpueden ser\b/i, rep: 'suelen ser' },
      { rx: /\bpuede ser\b/i, rep: 'suele ser' },
      { rx: /\bpara los que\b/i, rep: 'para quienes' },
      { rx: /\bpara las que\b/i, rep: 'para quienes' },
      { rx: /\bde este tipo de\b/i, rep: 'de esta clase de' },
      { rx: /\btodo tipo de\b/i, rep: 'toda clase de' },
      { rx: /\bcualquier tipo de\b/i, rep: 'cualquier clase de' },
      { rx: /\bsin lugar a dudas\b/i, rep: 'sin duda' },
      { rx: /\ba lo largo de\b/i, rep: 'durante' },
      { rx: /\ba la vez que\b/i, rep: 'al tiempo que' },
      { rx: /\ba pesar de que\b/i, rep: 'aunque' },
      { rx: /\bdebido a que\b/i, rep: 'porque' },
      { rx: /\bcon el objetivo de\b/i, rep: 'para' }
    ];

    // Clean, natural Spanish editorial synonyms (strictly NO archaic/thesaurus spinner terms)
    const tokenSynonyms = {
      anchura: ['amplitud'],
      longitud: ['extensión'],
      anchas: ['amplias', 'marcadas'],
      misma: ['idéntica'],
      accesorio: ['complemento'],
      complemento: ['accesorio'],
      convertido: ['transformado'],
      pero: ['aunque'],
      encontrarán: ['verán'],
      opción: ['alternativa'],
      moda: ['tendencia', 'estética'],
      gustos: ['estilos', 'preferencias'],
      accesorios: ['complementos'],
      muchos: ['numerosos'],
      muchas: ['numerosas'],
      también: ['asimismo', 'igualmente'],
      además: ['asimismo'],
      porque: ['ya que', 'puesto que'],
      tienen: ['cuentan con'],
      tiene: ['cuenta con'],
      pueden: ['suelen'],
      puede: ['suele'],
      muy: ['bastante'],
      unas: ['algunas'],
      unos: ['algunos'],
      gafas: ['monturas'],
      monturas: ['gafas'],
      montura: ['silueta'],
      estilo: ['aire', 'línea'],
      forma: ['silueta', 'línea'],
      formas: ['siluetas', 'líneas'],
      diseño: ['corte'],
      diseños: ['cortes'],
      mejores: ['más acertadas'],
      perfecto: ['ideal', 'acertado'],
      perfecta: ['ideal', 'acertada'],
      ideal: ['idóneo', 'acertado'],
      actualmente: ['hoy en día'],
      prendas: ['piezas'],
      aporta: ['ofrece', 'brinda'],
      aportan: ['ofrecen', 'brindan'],
      ofrece: ['brinda', 'aporta'],
      ofrecen: ['brindan', 'aportan'],
      destaca: ['resalta', 'realza'],
      destacan: ['resaltan', 'realzan'],
      combina: ['armoniza', 'encaja'],
      combinan: ['armonizan', 'encajan'],
      favorece: ['estiliza', 'equilibra'],
      favorecen: ['estilizan', 'equilibran'],
      opciones: ['alternativas'],
      versátiles: ['adaptables'],
      quedan: ['sientan'],
      creados: ['elaborados'],
      desean: ['buscan'],
      lucir: ['llevar'],
      excelente: ['magnífica'],
      elección: ['alternativa'],
      suele: ['acostumbra'],
      suelen: ['acostumbran'],
      fresco: ['natural'],
      divertido: ['dinámico'],
      coloridas: ['llamativas'],
      ligeras: ['livianas'],
      firmas: ['marcas'],
      populares: ['reconocidas'],
      gafa: ['pieza'],
      temporada: ['estación'],
      uso: ['empleo'],
      color: ['tono'],
      siluetas: ['formas'],
      marca: ['firma'],
      buena: ['acertada'],
      posibilidades: ['alternativas'],
      fácil: ['sencillo'],
      elegir: ['escoger'],
      protegen: ['resguardan'],
      armoniza: ['encaja'],
      realza: ['destaca'],
      estiliza: ['favorece'],
      mirada: ['expresión'],
      recuerda: ['evoca'],
      icónicas: ['emblemáticas'],
      crean: ['generan'],
      logran: ['consiguen'],
      llevan: ['usan'],
      buscan: ['prefieren'],
      colores: ['tonos'],
      detalles: ['matices'],
      rasgos: ['facciones'],
      ésta: ['esta'],
      diseñadas: ['pensadas', 'creadas'],
      diseñada: ['pensada', 'creada'],
      pensadas: ['creadas'],
      pensada: ['creada'],
      distintas: ['diferentes'],
      clásico: ['intemporal'],
      clásica: ['intemporal'],
      elegante: ['sofisticado'],
      elegantes: ['sofisticados'],
      manera: ['forma'],
      darán: ['aportarán'],
      toque: ['matiz'],
      llevar: ['usar'],
      combinación: ['mezcla'],
      logra: ['consigue'],
      pequeño: ['sutil'],
      moderno: ['actual'],
      moderna: ['actual'],
      marcado: ['definido'],
      marcada: ['definida'],
      sencillo: ['simple']
    };

    let guard = 0;
    while (guard < 45) {
      guard++;
      const overlaps = this.findAllCorpusOverlaps(current, donorsUsedInPara, minShingleLen);
      if (!overlaps.length) break;

      let mutated = false;

      // 1. Multi-word lexical/syntactic swaps scoped to active overlap windows (preserving capitalization)
      for (const ov of overlaps) {
        const targetShingle = ov.shingle;
        const winPattern = targetShingle
          .split(' ')
          .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('[^a-záéíóúüñ0-9]+');
        const winRx = new RegExp(`(${winPattern})`, 'i');

        for (const sw of microSwaps) {
          if (usedReplacements.has(sw.rep)) continue;
          if (!sw.rx.test(targetShingle)) continue;
          const rxGlobal = new RegExp(sw.rx.source, 'i');
          if (!winRx.test(current)) continue;

          const nextCandidate = current.replace(winRx, (winMatch) => (
            winMatch.replace(rxGlobal, (subMatch, g1) => {
              let out = sw.rep;
              if (g1 !== undefined && typeof g1 === 'string') {
                out = out.replace('$1', g1);
              }
              if (/^[A-ZÁÉÍÓÚÑ]/.test(subMatch)) {
                out = out.charAt(0).toUpperCase() + out.slice(1);
              }
              return out;
            })
          ));

          if (
            nextCandidate !== current &&
            !this.findAllCorpusOverlaps(nextCandidate, donorsUsedInPara, minShingleLen).some(o => o.shingle === targetShingle)
          ) {
            current = nextCandidate;
            usedReplacements.add(sw.rep);
            mutated = true;
            break;
          }
        }
        if (mutated) break;
      }

      // 2. Single-token invariant grammatical synonym replacement across ALL active overlaps (context-guarded)
      if (!mutated) {
        for (const ov of overlaps) {
          const targetShingle = ov.shingle;
          const tokens = targetShingle.split(' ');
          const probeOrder = [3, 2, 4, 1, 5, 0, 6];
          for (const idx of probeOrder) {
            const tok = tokens[idx];
            if (!tok || protectedBrandTokens.has(tok)) continue;
            if (tok === 'pero' && tokens[idx + 1] === 'que') continue;
            if ((tok === 'además' || tok === 'también') && tokens[idx + 1] === 'de') continue;
            if ((tok === 'forma' || tok === 'manera') && /^(?:de|esta|esa|otra|alguna|ninguna|misma|tal)$/i.test(tokens[idx - 1] || '')) continue;
            const syns = tokenSynonyms[tok];
            if (!syns || !syns.length) continue;

            const validSyns = syns.filter(s => !s.toLowerCase().split(/\s+/).includes(tok));
            const chosenSyn = validSyns.find(s => !usedReplacements.has(`${tok}->${s}`)) || validSyns[0];
            if (!chosenSyn) continue;

            const escTok = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escBefore = tokens[idx - 1] ? `${tokens[idx - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,;:]*\\s+` : '';
            const escAfter = tokens[idx + 1] ? `[,;:]*\\s+${tokens[idx + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` : '';

            const scopedRx = new RegExp(`(^|[^a-záéíóúüñ0-9])(${escBefore})(${escTok})(${escAfter})(?=[^a-záéíóúüñ0-9]|$)`, 'i');
            if (scopedRx.test(current)) {
              const nextCandidate = current.replace(scopedRx, (m, lead, bef, origTok, aft) => {
                const adjusted = /^[A-ZÁÉÍÓÚÑ]/.test(origTok)
                  ? chosenSyn.charAt(0).toUpperCase() + chosenSyn.slice(1)
                  : chosenSyn;
                return `${lead}${bef}${adjusted}${aft}`;
              });
              if (
                nextCandidate !== current &&
                !/\b(gafas|monturas|modelos|diseños|formas|siluetas)\s+(?:de\s+)?\1\b/i.test(nextCandidate) &&
                !this.findAllCorpusOverlaps(nextCandidate, donorsUsedInPara, minShingleLen).some(o => o.shingle === targetShingle)
              ) {
                current = nextCandidate;
                usedReplacements.add(`${tok}->${chosenSyn}`);
                mutated = true;
                break;
              }
            }
          }
          if (mutated) break;
        }
      }

      // 3. Universal interior syntactic pivot fallback for unforeseen 7-gram runs
      if (!mutated) {
        const syntacticPivots = [
          {
            key: 'pivot_que_art',
            rx: /\bque\s+(el|la|los|las|se|no|te|le|nos)\b/i,
            repFn: (m, g1) => `que hoy ${g1}`
          },
          {
            key: 'pivot_coord_y_ademas',
            rx: /\b([a-záéíóúñ]{4,})\s+y\s+(no|su|sus|el|la|los|las)\b/i,
            repFn: (m, w1, w2) => `${w1} —y además ${w2}`
          },
          {
            key: 'pivot_dash_pause',
            rx: /\b([a-záéíóúñ]{4,}),\s+pero\b/i,
            repFn: (m, w1) => `${w1} —eso sí,`
          },
          {
            key: 'pivot_conversational_comma',
            rx: /\b,\s+(que|donde|cuando|como)\b/i,
            repFn: (m, rel) => `, de hecho, ${rel}`
          },
          {
            key: 'pivot_sin_duda',
            rx: /\bes\s+(una|un|perfecto|perfecta|ideal)\b/i,
            repFn: (m, w1) => `es, sin duda, ${w1}`
          },
          {
            key: 'pivot_en_la_practica',
            rx: /\bpara\s+(los|las|todos|todas|quienes)\b/i,
            repFn: (m, w1) => `en la práctica, para ${w1}`
          }
        ];

        for (const ov of overlaps) {
          const targetShingle = ov.shingle;
          const winPattern = targetShingle
            .split(' ')
            .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('[^a-záéíóúüñ0-9]+');
          const winRx = new RegExp(`(${winPattern})`, 'i');
          if (!winRx.test(current)) continue;

          for (const pv of syntacticPivots) {
            if (!pv.rx.test(targetShingle)) continue;
            const provisionalOut = targetShingle.match(pv.rx);
            const pvUsageKey = pv.key === 'pivot_que_art' ? pv.key : `${pv.key}:${(provisionalOut?.[0] || '').toLowerCase()}`;
            if (usedReplacements.has(pvUsageKey)) continue;

            const nextCandidate = current.replace(winRx, (winMatch) => (
              winMatch.replace(pv.rx, (...args) => {
                const subMatch = args[0];
                let out = pv.repFn(...args);
                if (/^[A-ZÁÉÍÓÚÑ]/.test(subMatch)) {
                  out = out.charAt(0).toUpperCase() + out.slice(1);
                }
                return out;
              })
            ));

            if (
              nextCandidate !== current &&
              !this.findAllCorpusOverlaps(nextCandidate, donorsUsedInPara, minShingleLen).some(o => o.shingle === targetShingle)
            ) {
              current = nextCandidate;
              usedReplacements.add(pvUsageKey);
              mutated = true;
              break;
            }
          }
          if (mutated) break;
        }
      }

      if (!mutated) break;
    }

    // Restore post-sentence capitalization cleanly
    current = current.replace(/(^|[.!?]\s+)([a-záéíóúñ])/g, (_, sep, ch) => sep + ch.toUpperCase());
    return current;
  }

  /**
   * Micro-Cirugía Gramatical Central para romper rachas continuas >= 7 palabras
   * operando exclusivamente en el interior de cada oración [3, L-4] (bordes intactos).
   */
  applyCentralGrammaticalSurgery(text, donorsUsedInPara = [], atoms = null, minShingleLen = 7, log = null, auditSteps = null) {
    const res = grammaticalSurgery.applyCentralGrammaticalSurgery(
      text,
      donorsUsedInPara,
      this,
      atoms,
      { minShingleLen }
    );

    if (Array.isArray(res.operations) && res.operations.length > 0) {
      for (const op of res.operations) {
        if (typeof log === 'function') {
          log(`[FASE_5_CIRUGIA_CENTRAL] Or.${op.sentenceIndex} [${op.interiorPosition}] ${op.family} (${op.ruleId}): "${op.beforeSnippet}" -> "${op.afterSnippet}" | rachaMax: ${op.beforeMaxRun}w -> ${op.afterMaxRun}w | >=7w: ${op.beforeHits} -> ${op.afterHits}`);
        }
        if (Array.isArray(auditSteps)) {
          auditSteps.push({
            stage: 'CENTRAL_GRAMMATICAL_SURGERY',
            sentenceIndex: op.sentenceIndex,
            interiorPosition: op.interiorPosition,
            family: op.family,
            ruleId: op.ruleId,
            before: op.beforeSnippet,
            after: op.afterSnippet,
            beforeMaxRun: op.beforeMaxRun,
            afterMaxRun: op.afterMaxRun,
            beforeHits: op.beforeHits,
            afterHits: op.afterHits,
            centralityScore: op.centralityScore
          });
        }
      }
    }

    return res;
  }

  selectUnusedGlitch(frame, usedGlitches, excludeContextText = '') {
    const pool = frame === 'MATERIAL_COMPOSITION' || frame === 'PRODUCT_FACTUAL' || frame === 'ANATOMICAL_FIT'
      ? [...CERTIFIED_BIOLOGICAL_GLITCHES.workshop, ...CERTIFIED_BIOLOGICAL_GLITCHES.fashion]
      : [...CERTIFIED_BIOLOGICAL_GLITCHES.fashion, ...CERTIFIED_BIOLOGICAL_GLITCHES.workshop];

    const ctxLower = (excludeContextText || '').toLowerCase();
    return pool.find(g => {
      if (usedGlitches.has(g.text)) return false;
      const stem = g.text.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
      if (ctxLower && ctxLower.includes(stem)) return false;
      return true;
    }) || null;
  }

  countTokenDelta(beforeText, afterText) {
    const a = this.tokenize(beforeText || '');
    const b = this.tokenize(afterText || '');
    const freqA = new Map();
    for (const t of a) freqA.set(t, (freqA.get(t) || 0) + 1);
    let unchanged = 0;
    for (const t of b) {
      const c = freqA.get(t) || 0;
      if (c > 0) {
        unchanged++;
        freqA.set(t, c - 1);
      }
    }
    return Math.max(0, b.length - unchanged);
  }

  computeBluepaperTelemetry({ uniqueDomainsCount, centeringTransitions }) {
    return {
      uniqueDonorDomains: uniqueDomainsCount,
      centeringTransitions
    };
  }

  // =========================================================================
  // FASE 3, 4 Y 5: ENSAMBLADOR MULTIFACÉTICO DINÁMICO DE PRODUCTO Y TEMÁTICO
  // =========================================================================
  async reconstructParagraphBluepaper({
    paragraphIndex = null,
    frame,
    atoms,
    atomSummaryText,
    tuples,
    rawPara,
    currentAnchor,
    isFirstAfterHeading,
    glitchIdx,
    options,
    auditSteps,
    usedDonorIds,
    usedDomainsCount,
    centeringTransitions,
    usedGlitches,
    usedHinges,
    usedBridgeWords,
    useLocalLLM,
    activeModel,
    log,
    qwenStats,
    usageLedger = null,
    articleState = null,
    paraTopology = null,
    carrilBStats = null,
    ollamaLazyState = null,
    domainId = 'optica',
    activeSubdomains = null
  }) {
    const donorsUsedInPara = [];
    let paraInterventionTokens = 0;

    // -----------------------------------------------------------------------
    // PROCESO QWEN #1: Atomización Proposicional de Davidson (Selectiva en puentes cortos)
    // -----------------------------------------------------------------------
    let extractedFacts = '';
    const inputWordCount = rawPara.split(/\s+/).filter(Boolean).length;
    const hasBrandSku = Boolean(atoms?.brand_models?.length);
    const shouldUseFastSymbolicAtomization = frame === 'TRANSITION_CURATION' || (inputWordCount < 42 && !hasBrandSku);

    if (useLocalLLM && !shouldUseFastSymbolicAtomization) {
      try {
        const atomRes = await this.atomizeWithQwen(rawPara, atoms, frame, currentAnchor, activeModel, log, qwenStats);
        extractedFacts = atomRes.rawResponse;
        auditSteps.push({
          stage: 'QWEN_ATOMIZATION',
          model: atomRes.model,
          durationMs: atomRes.durationMs,
          evalCount: atomRes.evalCount,
          prompt: atomRes.prompt,
          rawResponse: atomRes.rawResponse,
          atomsSummary: extractedFacts,
          frame
        });
      } catch (err) {
        qwenStats.failures += 1;
        log(`[QWEN_FASE_1_ERROR] ${err.message} — usando fallback de átomos deterministas.`);
      }
    } else {
      const fastSentences = rawPara.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
      extractedFacts = fastSentences.join(' ');
      log(`[QWEN_FASE_1_ATOMIZACION] Modo simbólico rápido (párrafo puente corto de ${inputWordCount} palabras, 0ms)`);
      for (const fs of fastSentences) {
        log(`[QWEN_FASE_1_RESULTADO] ${fs}`);
      }
      auditSteps.push({
        stage: 'QWEN_ATOMIZATION',
        model: 'symbolic-fast-path',
        durationMs: 0,
        evalCount: 0,
        prompt: '(omitido en párrafo puente corto)',
        rawResponse: extractedFacts,
        atomsSummary: extractedFacts,
        frame
      });
    }

    // -----------------------------------------------------------------------
    // FASE 2 & FASE 3: Selección 3 Capas (TF-IDF+Conceptos -> Filtros -> Reranker Qwen) + DAG
    // -----------------------------------------------------------------------
    const isColonIntro = frame === 'TRANSITION_CURATION' || rawPara.trim().endsWith(':');
    const centering = this.solveCenteringDAGWithDijkstra({
      tuples: tuples && tuples.length ? tuples : [{ id: 'p1', subFrame: frame, requiredSlots: [], argCount: 1, expectedCf: 'FRAME_ENTITY', rawClause: rawPara }],
      atoms,
      frame,
      currentAnchor,
      isFirstAfterHeading,
      usedDonorIds,
      usedDomainsCount,
      usedHinges,
      rawPara,
      deferCommit: true,
      usageLedger,
      paraTopology,
      articleMacroStyle: articleState?.articleMacroStyle || 'general_editorial',
      domainId,
      activeSubdomains
    });

    let pickedDonors = centering.chosenNodes || [];
    const estimateFitFromSem = (node) => {
      const s = node?.brick?._semScore || 0;
      return Math.min(9, Math.max(3, Math.round(3 + s / 4.5)));
    };
    let rerankMeta = {
      usedReranker: false,
      candidateCount: centering.topCandidates?.length || pickedDonors.length,
      chosenRank: 1,
      fitScore: estimateFitFromSem(pickedDonors[0]),
      reason: 'Selección determinista TF-IDF + clústeres conceptuales',
      durationMs: 0,
      poolSummary: (centering.topCandidates || pickedDonors).map((n, idx) => ({
        rank: idx + 1,
        brick_id: n.brick.brick_id,
        domain: n.domain,
        score: n.score,
        semScore: n.brick._semScore || 0
      }))
    };

    let lastEntailmentAudit = null;
    if (centering.topCandidates && centering.topCandidates.length >= 2) {
      const rerankRes = (options?.useQwenReranker === true && useLocalLLM)
        ? await this.rerankCandidatesWithQwen({
            candidates: centering.topCandidates,
            rawPara,
            currentAnchor,
            frame,
            atoms,
            tuples,
            extractedFacts,
            modelName: activeModel,
            log,
            qwenStats,
            isColonIntro,
            centeringCb: centering.cb
          })
        : this.rerankCandidatesNeurosymbolic({
            candidates: centering.topCandidates,
            rawPara,
            currentAnchor,
            frame,
            atoms,
            isColonIntro,
            articleState,
            paraTopology,
            log
          });
      if (rerankRes && rerankRes.chosenNode) {
        pickedDonors = [rerankRes.chosenNode];
        lastEntailmentAudit = rerankRes.entailmentAudit || null;
        centering.chosenNodes = pickedDonors;
        centering.transitions = [rerankRes.chosenNode.transition || centering.transitionType];
        centering.transitionType = centering.transitions[0];
        centering.hasProDrop = Boolean(rerankRes.chosenNode.profile?.hasProDrop);
        centering.optimalCost = rerankRes.chosenNode.totalCost ?? centering.optimalCost;
        rerankMeta = {
          usedReranker: true,
          mode: rerankRes.mode || 'qwen',
          candidateCount: rerankRes.candidateCount,
          chosenRank: rerankRes.chosenRank,
          fitScore: rerankRes.fitScore,
          reason: rerankRes.reason,
          durationMs: rerankRes.durationMs || 0,
          poolSummary: rerankRes.poolSummary || []
        };
      }
    }

    const buildDraftForNodes = (nodesList) => {
      const pieces = [];
      let healedAny = false;
      for (let idx = 0; idx < (nodesList || []).length; idx++) {
        const b = nodesList[idx]?.brick || nodesList[idx];
        if (!b) continue;
        let piece = this.fillSlotsInBrick(b, atoms, frame, tuples?.[idx] || null, rawPara);
        const pieceFirstSent = (piece || '').split(/(?<=[.!?])\s+/)[0] || piece || '';
        const hasExplicitSubject = /\b(?:modelo|diseño|gafa|gafas|montura|monturas|silueta|lentes|cristales|acetato|metal|ray-ban|persol|chlo[eé]|gucci|prada|oakley)\b/i.test(pieceFirstSent);
        if (idx === 0 && piece && !hasExplicitSubject && frame !== 'AUDIOLOGY' && frame !== 'CLINICAL_OPHTHALMOLOGY' && this.getBrickProfile(b).hasProDrop) {
          const healed = this.healProDropSubject(piece, centering.cb, atoms);
          if (healed.healed) {
            piece = healed.text;
            healedAny = true;
          }
        }
        if (piece) pieces.push(piece);
      }
      const draft = this.buildDonorGraftedDraft({
        skeletonPieces: pieces,
        tuples,
        atoms,
        extractedFacts,
        frame,
        centering,
        endsWithColon: isColonIntro
      });
      return { pieces, healedAny, draft };
    };

    const initialBuild = buildDraftForNodes(pickedDonors);
    let proDropHealed = initialBuild.healedAny;
    const skeletonPieces = initialBuild.pieces;

    for (const tr of (centering.transitions || [])) {
      if (tr && centeringTransitions[tr] !== undefined) centeringTransitions[tr] += 1;
    }

    for (const n of pickedDonors) {
      donorsUsedInPara.push(n.brick);
    }

    const donorsMeta = pickedDonors.length
      ? pickedDonors.map(n => `${n.brick.brick_id} (${n.domain}, ${n.brick.frame}, score:${n.score}, sem:${n.brick._semScore || 0}, encaje:${rerankMeta.fitScore}/10)`).join(' + ')
      : 'fallback_sintactico';

    const combinedSkeleton = skeletonPieces.length
      ? skeletonPieces.join(' ')
      : '(molde sintáctico compacto)';

    log(`[FASE_2_DONANTE] Seleccionado(s): ${donorsMeta}`);
    log(`[FASE_2_ESQUELETO] "${combinedSkeleton}"`);
    log(`[FASE_3_CENTERING] Ancla Cb: "${centering.cb}" | Ruta DAG Dijkstra (${(tuples || []).length} capas, coste: ${centering.optimalCost}): [${donorsUsedInPara.map(b => b.brick_id).join(' -> ') || 'fallback'}] | Transiciones: [${(centering.transitions || []).join(' -> ')}] | Pro-Drop sanado: ${proDropHealed ? 'SÍ' : 'NO'}${centering.hinge ? ` | Bisagra: "${centering.hinge}"` : ''} | Dominios acumulados K: ${usedDomainsCount.size}`);

    const donorSelectionAudit = {
      stage: 'DONOR_SELECTION',
      donor_id: donorsUsedInPara.map(b => b.brick_id).join(', ') || 'ninguno',
      frame,
      score: pickedDonors[0]?.score ?? 0,
      semScore: pickedDonors[0]?.brick?._semScore ?? 0,
      matchedTerms: pickedDonors[0]?.brick?._matchedTerms || [],
      fitScore: rerankMeta.fitScore,
      source: donorsUsedInPara.map(b => b.source_domain || 'corpus pre-2022').join(', ') || 'motor simbólico',
      skeleton: combinedSkeleton,
      reason: `Emparejamiento semántico en 3 capas (TF-IDF + clústeres + filtros de coherencia${rerankMeta.usedReranker ? ' + Juez Qwen' : ''}) sobre banco biológico pre-2022.`
    };
    auditSteps.push(donorSelectionAudit);

    const semanticRerankerAudit = {
      stage: 'SEMANTIC_RERANKER',
      usedReranker: rerankMeta.usedReranker,
      candidateCount: rerankMeta.candidateCount,
      chosenRank: rerankMeta.chosenRank,
      donorId: donorsUsedInPara.map(b => b.brick_id).join(' + ') || 'fallback',
      domain: pickedDonors[0]?.domain || 'corpus',
      semScore: pickedDonors[0]?.brick?._semScore ?? 0,
      fitScore: rerankMeta.fitScore,
      isBankGap: (rerankMeta.fitScore ?? 10) <= 6,
      durationMs: rerankMeta.durationMs || 0,
      poolSummary: rerankMeta.poolSummary,
      reason: rerankMeta.reason
    };
    auditSteps.push(semanticRerankerAudit);

    auditSteps.push({
      stage: 'CENTERING_SOLVER',
      anchor: centering.cb,
      transitionType: centering.transitionType,
      transitions: centering.transitions,
      dagCost: centering.optimalCost,
      pathDonors: donorsUsedInPara.map(b => b.brick_id),
      proDropHealed,
      hasProDrop: centering.hasProDrop || proDropHealed,
      hinge: centering.hinge,
      reason: 'Camino óptimo resuelto con Dijkstra sobre Grafo Acíclico Dirigido (Cb/Cf/Cp), dispersión multifuente y sanación Pro-Drop.'
    });

    // Construir borrador injertado exclusivamente sobre moldes pre-2022 + hechos atómicos (CERO rawPara; sin degradar antes de Qwen)
    let graftedDonorDraft = initialBuild.draft;
    let preFilledSkeleton = graftedDonorDraft;

    if (centering.hinge) {
      paraInterventionTokens += centering.hinge.split(/\s+/).filter(Boolean).length;
    }

    // -----------------------------------------------------------------------
    // PROCESO QWEN #2: Compilador Colocacional y Sanación (estrictamente sobre graftedDonorDraft)
    // -----------------------------------------------------------------------
    let reconstructedPara = '';
    let usedQwenGraft = false;
    let rotatedCandidate = false;
    let qwenAttemptsUsed = 0;

    if (isColonIntro) {
      reconstructedPara = graftedDonorDraft;
      if (rawPara.trim().endsWith(':') && !reconstructedPara.trim().endsWith(':')) {
        reconstructedPara = reconstructedPara.replace(/[.!?]+$/, '') + ':';
      }
      this.commitChosenDonors(pickedDonors, usedDonorIds, usedDomainsCount);
      log(`[QWEN_FASE_4_INJERTO] Blindaje estructural de transición con dos puntos (:) aplicado — ensamblaje sobre molde pre-2022 sin rawPara.`);
      log(`[QWEN_FASE_4_ENTRADA_ESQUELETO] "${graftedDonorDraft}"`);
      log(`[QWEN_FASE_4_RESULTADO] ${reconstructedPara}`);
      auditSteps.push({
        stage: 'QWEN_COLLOCATIONAL_GRAFT',
        model: 'symbolic-colon-shield',
        durationMs: 0,
        evalCount: 0,
        donorId: donorsUsedInPara.map(b => b.brick_id).join(' + '),
        preFilledSkeleton,
        rawResponse: reconstructedPara,
        reason: 'Párrafo introductorio cerrado en dos puntos (:) reconstruido sobre molde pre-2022 sin copiar sintaxis de entrada.'
      });
    } else if (useLocalLLM) {
      const maxAttemptsPerCandidate = 5;
      const totalMaxAttempts = 10;
      const primaryId = pickedDonors[0]?.brick?.brick_id;
      const candidateQueue = [pickedDonors];
      const altNode = (centering.topCandidates || []).find(c => c?.brick?.brick_id && c.brick.brick_id !== primaryId);
      if (altNode) {
        candidateQueue.push([altNode]);
      }

      let acceptedGraft = null;
      let lastFailureReason = null;
      const attemptHistory = [];
      const tempSchedule = [0.08, 0.16, 0.28, 0.05, 0.35, 0.22, 0.42, 0.12, 0.38, 0.30];
      let globalAttempt = 0;

      for (let qIdx = 0; qIdx < candidateQueue.length && !acceptedGraft; qIdx++) {
        const candNodes = candidateQueue[qIdx];
        if (qIdx > 0) {
          rotatedCandidate = true;
          const altBuild = buildDraftForNodes(candNodes);
          pickedDonors = candNodes;
          donorsUsedInPara.length = 0;
          for (const n of pickedDonors) donorsUsedInPara.push(n.brick);
          graftedDonorDraft = altBuild.draft;
          preFilledSkeleton = altBuild.draft;
          lastFailureReason = null;
          const altId = candNodes[0]?.brick?.brick_id || 'fallback';
          const altDom = candNodes[0]?.domain || 'corpus';
          rerankMeta.fitScore = estimateFitFromSem(candNodes[0]);
          rerankMeta.reason = `Alternativa tras 5 descartes en candidato #1 (${altId})`;
          donorSelectionAudit.donor_id = altId;
          donorSelectionAudit.source = altDom;
          donorSelectionAudit.score = candNodes[0]?.score ?? 0;
          donorSelectionAudit.semScore = candNodes[0]?.brick?._semScore ?? 0;
          donorSelectionAudit.fitScore = rerankMeta.fitScore;
          donorSelectionAudit.skeleton = altBuild.pieces.join(' ');
          semanticRerankerAudit.donorId = altId;
          semanticRerankerAudit.domain = altDom;
          semanticRerankerAudit.semScore = candNodes[0]?.brick?._semScore ?? 0;
          semanticRerankerAudit.fitScore = rerankMeta.fitScore;
          semanticRerankerAudit.isBankGap = (rerankMeta.fitScore ?? 10) <= 6;
          log(`[QWEN_FASE_4_ROTACION] Rotando a donante alternativo ${altId} (${altDom}) tras ${maxAttemptsPerCandidate} descartes en candidato previo.`);
        }

        const candBudget = candidateQueue.length > 1 ? maxAttemptsPerCandidate : totalMaxAttempts;
        for (let localTry = 1; localTry <= candBudget && globalAttempt < totalMaxAttempts; localTry++) {
          globalAttempt++;
          const currentTemp = tempSchedule[(globalAttempt - 1) % tempSchedule.length];
          try {
            const graftRes = await this.compileCollocationalWithQwen({
              graftedDonorDraft,
              endsWithColon: false,
              atoms,
              centering,
              currentAnchor,
              frame,
              modelName: activeModel,
              log,
              qwenStats,
              attempt: globalAttempt,
              temperature: currentTemp,
              feedback: lastFailureReason
            });

            const check = this.validateQwenGraft(graftRes.text, rawPara, atoms, graftedDonorDraft, frame, currentAnchor);
            const auditMetrics = this.analyzeAlterations(graftRes.text, graftedDonorDraft, atoms);

            attemptHistory.push({
              attempt: globalAttempt,
              candidateDonorId: donorsUsedInPara.map(b => b.brick_id).join(' + '),
              temperature: currentTemp,
              text: graftRes.text,
              valid: check.ok,
              reason: check.ok ? 'Aceptado' : check.reason,
              metrics: auditMetrics
            });

            if (check.ok) {
              acceptedGraft = graftRes;
              acceptedGraft.auditMetrics = auditMetrics;
              acceptedGraft.attemptNumber = globalAttempt;
              acceptedGraft.totalAttempts = globalAttempt;
              log(`[QWEN_FASE_4_EXITO] Intento ${globalAttempt}/${totalMaxAttempts} ACEPTADO (Alteración: ${(auditMetrics.alterationRate).toFixed(1)}% | ${auditMetrics.typeSummary}).`);
              break;
            } else {
              lastFailureReason = check.reason;
              log(`[QWEN_FASE_4_REINTENTO] Intento ${globalAttempt}/${totalMaxAttempts} descartado (${check.reason}). Preparando reintento...`);
            }
          } catch (err) {
            qwenStats.failures += 1;
            lastFailureReason = err.message;
            log(`[QWEN_FASE_4_ERROR] Intento ${globalAttempt}/${totalMaxAttempts} falló (${err.message}).`);
          }
        }
      }

      if (acceptedGraft) {
        qwenAttemptsUsed = acceptedGraft.totalAttempts || globalAttempt;
        this.commitChosenDonors(pickedDonors, usedDonorIds, usedDomainsCount);
        reconstructedPara = acceptedGraft.text;
        usedQwenGraft = true;
        auditSteps.push({
          stage: 'QWEN_COLLOCATIONAL_GRAFT',
          model: acceptedGraft.model,
          durationMs: acceptedGraft.durationMs,
          evalCount: acceptedGraft.evalCount,
          donorId: donorsUsedInPara.map(b => b.brick_id).join(' + '),
          preFilledSkeleton,
          rawResponse: acceptedGraft.text,
          attemptsCount: acceptedGraft.totalAttempts,
          attemptHistory,
          alterationMetrics: acceptedGraft.auditMetrics,
          reason: `Pulido morfosintáctico completado en intento ${acceptedGraft.attemptNumber}/${totalMaxAttempts}.`
        });
      } else {
        // Regla estricta: Si tras agotar los 10 intentos Qwen sigue dando resultados no conformes,
        // PROHIBIDO usar el donante tal cual (evita falsos positivos o incoherencias).
        // El proceso falla explícitamente y detiene la compilación.
        const lastErr = lastFailureReason || 'Validación morfosintáctica no superada';
        log(`[QWEN_FASE_4_FALLO_CRITICO] El párrafo no logró una salida válida tras ${globalAttempt} intentos. Motivo final: ${lastErr}. Proceso abortado para evitar falsos positivos.`);
        const err = new Error(`Fallo crítico en humanización: Tras ${globalAttempt} intentos, Qwen no generó una concordancia morfosintáctica conforme a las restricciones del Bluepaper (Último error: ${lastErr}).`);
        err.attemptHistory = attemptHistory;
        throw err;
      }
    }

    if (!isColonIntro && !usedQwenGraft) {
      if (!lastEntailmentAudit) {
        lastEntailmentAudit = factualGuard.evaluateFactualEntailment(rawPara, graftedDonorDraft, atoms?.discriminativeAnchors, atoms?.signedPolarity);
      }

      // Voice-Locked 2-Clause Adversative Pivot Composition (solo si el donante monolítico deja hueco fáctico real)
      if (lastEntailmentAudit?.isHonestFactualGap) {
        const pivot = factualGuard.detectAdversativePivot(rawPara);
        if (pivot.hasPivot) {
          const { type: frameL, atoms: atomsL } = this.classifyParagraph(pivot.leftClause, currentAnchor);
          const { type: frameR, atoms: atomsR } = this.classifyParagraph(pivot.rightClause, currentAnchor);
          const searchOptsBase = {
            paragraphMode: false,
            minWindowWords: 12,
            maxWindowWords: 45,
            currentAnchor,
            usageLedger,
            articleMacroStyle: articleState?.articleMacroStyle || 'general_editorial',
            domainId,
            activeSubdomains
          };
          const framesL = [...new Set([frameL, frame, 'OPTICAL_PROTECTION', 'MATERIAL_COMPOSITION', 'GENERAL_STYLE'])];
          const candsL = this.searchDonorBricksForParagraph(framesL, atomsL, pivot.leftClause, usedDonorIds, 8, null, frame, { ...searchOptsBase, isFirstAfterHeading });
          if (candsL.length > 0) {
            const nodeL = candsL[0];
            const leftId = nodeL.brick.brick_id;
            const leftPersona = nodeL.brick._narrativePersona || 'IMPERSONAL_THIRD';
            const excludeForRight = new Set([...usedDonorIds, leftId]);
            const framesR = [...new Set([frameR, frame, 'OPTICAL_PROTECTION', 'MATERIAL_COMPOSITION', 'GENERAL_STYLE'])];
            const candsR = this.searchDonorBricksForParagraph(framesR, atomsR, pivot.rightClause, excludeForRight, 12, null, frame, { ...searchOptsBase, isFirstAfterHeading: false });
            const nodeR = candsR.find(cr => {
              const rp = cr.brick._narrativePersona || 'IMPERSONAL_THIRD';
              return leftPersona === 'IMPERSONAL_THIRD' || rp === 'IMPERSONAL_THIRD' || rp === leftPersona;
            }) || candsR[0];

            if (nodeR) {
              const leftText = this.fillSlotsInBrick(nodeL.brick, atomsL, frameL, null, pivot.leftClause);
              const rightText = this.fillSlotsInBrick(nodeR.brick, atomsR, frameR, null, pivot.rightClause);
              if (leftText && rightText) {
                const trimL = leftText.trim();
                const trimR = rightText.trim();
                const keepFirstUpper = /^(?:Chlo[eé]|Gucci|Persol|Ray-?Ban|Oakley|Prada|Dior|LCD|UV)\b/.test(trimR);
                const joinedRight = keepFirstUpper ? trimR : (trimR.charAt(0).toLowerCase() + trimR.slice(1));
                const inlineConn = (pivot.connector === 'pero' || pivot.connector === 'aunque') && /\.\s*$/.test(trimL);
                let composedText;
                if (inlineConn) {
                  composedText = `${trimL.replace(/\.+$/, '')}, ${pivot.connector} ${joinedRight}`;
                } else {
                  const leftEnded = /[.!?]$/.test(trimL) ? trimL : `${trimL}.`;
                  const capConn = pivot.connector.charAt(0).toUpperCase() + pivot.connector.slice(1);
                  composedText = `${leftEnded} ${capConn}, ${joinedRight}`;
                }

                const composedEntail = factualGuard.evaluateFactualEntailment(rawPara, composedText, atoms?.discriminativeAnchors, atoms?.signedPolarity);
                if (!composedEntail.polarityContradiction && composedEntail.entailmentScore >= ((lastEntailmentAudit.entailmentScore || 0) + 12)) {
                  const nodeLWrap = { brick: nodeL.brick, domain: nodeL.brick.source_domain || 'corpus', score: nodeL.score };
                  const nodeRWrap = { brick: nodeR.brick, domain: nodeR.brick.source_domain || 'corpus', score: nodeR.score };
                  pickedDonors = [nodeLWrap, nodeRWrap];
                  donorsUsedInPara.length = 0;
                  donorsUsedInPara.push(nodeL.brick, nodeR.brick);
                  graftedDonorDraft = composedText;
                  lastEntailmentAudit = composedEntail;

                  const dualFit = composedEntail.isHonestFactualGap
                    ? Math.min(5, Math.max(2, Math.round(composedEntail.entailmentScore / 10)))
                    : Math.min(10, Math.max(6, Math.round(composedEntail.entailmentScore / 10)));
                  rerankMeta.fitScore = dualFit;
                  rerankMeta.reason = `Composición 2-cláusulas (${pivot.connector}) | entail=${composedEntail.entailmentScore}%`;
                  donorSelectionAudit.donor_id = `${leftId}, ${nodeR.brick.brick_id}`;
                  donorSelectionAudit.source = `${nodeLWrap.domain}, ${nodeRWrap.domain}`;
                  donorSelectionAudit.fitScore = dualFit;
                  donorSelectionAudit.skeleton = composedText;
                  semanticRerankerAudit.donorId = `${leftId} + ${nodeR.brick.brick_id}`;
                  semanticRerankerAudit.fitScore = dualFit;
                  log(`[FASE_3_PIVOT_2CLAUSULAS] Pivote "${pivot.connector}" activado -> ${leftId} + ${nodeR.brick.brick_id} (entail=${composedEntail.entailmentScore}%, fit=${dualFit}/10)`);
                }
              }
            }
          }
        }
      }

      this.commitChosenDonors(pickedDonors, usedDonorIds, usedDomainsCount);
      reconstructedPara = graftedDonorDraft;
    }

    // -----------------------------------------------------------------------
    // FASE 5: Clichés Residuales, Anti-Outro, Ruptura k-gramas y Glitches
    // -----------------------------------------------------------------------
    const beforeCliche = reconstructedPara;
    reconstructedPara = this.neutralizeAiCliches(reconstructedPara, auditSteps)
      .replace(/\b(tiene\s+(?:todo\s+el\s+)?sentido)\s+([a-záéíóúüñ]{4,}(?:amos|emos|imos|es|as|en|an))\b/gi, '$1 que $2');
    paraInterventionTokens += Math.min(4, this.countTokenDelta(beforeCliche, reconstructedPara));

    if (options.antiOutro !== false) {
      const sents = reconstructedPara.split(/(?<=[.!?])\s+/).filter(Boolean);
      const keptSents = [];
      for (const s of sents) {
        const outroHit = this.detectOutroCliché(s);
        if (outroHit) {
          log(`[ANTI_OUTRO] Podada frase de cierre genérica: "${s}" (${outroHit.reason})`);
          auditSteps.push({
            stage: 'ANTI_OUTRO_PRUNED',
            sentence: s,
            reason: outroHit.reason
          });
        } else {
          keptSents.push(s);
        }
      }
      if (keptSents.length > 0) {
        reconstructedPara = keptSents.join(' ');
      }
    }

    // Ruptura gramatical central de k-gramas (bisección interior [3, L-4], bordes intactos)
    const enableCentralSurgery = options?.centralShingleSurgery !== false;
    const enableAntiPlagiarism = options?.antiPlagiarism === true || this.enableAntiPlagiarism === true;
    if (enableCentralSurgery || enableAntiPlagiarism) {
      const overlapsBefore = this.findAllCorpusOverlaps(reconstructedPara, donorsUsedInPara, 7);

      if (overlapsBefore.length > 0) {
        log(`[FASE_5_SHINGLES] Detectados ${overlapsBefore.length} solapamientos >= 7 palabras contra donantes/banco: ${overlapsBefore.slice(0, 6).map(o => `"${o.shingle}"`).join(' | ')}${overlapsBefore.length > 6 ? ` (+${overlapsBefore.length - 6} más)` : ''}`);

        const beforeShingleBreak = reconstructedPara;
        const surgeryRes = this.applyCentralGrammaticalSurgery(
          reconstructedPara,
          donorsUsedInPara,
          atoms,
          7,
          log,
          auditSteps
        );
        reconstructedPara = surgeryRes.text;

        paraInterventionTokens += this.countTokenDelta(beforeShingleBreak, reconstructedPara);
        const overlapsAfter = this.findAllCorpusOverlaps(reconstructedPara, donorsUsedInPara, 7);
        log(`[FASE_5_CIRUGIA_RESUMEN] Solapamientos >=7w: ${overlapsBefore.length} -> ${overlapsAfter.length} | Oraciones editadas: ${surgeryRes.stats.sentencesEdited} | Ops: ${surgeryRes.operations.length} | Violaciones borde: ${surgeryRes.stats.borderViolations} | Resultado: "${reconstructedPara}"`);
      } else {
        log(`[FASE_5_CIRUGIA_RESUMEN] Solapamientos >=7w detectados: 0 (sin cirugía requerida)`);
      }
    } else {
      log(`[FASE_5_ANTIPLAGIO] Omitida por configuración explícita.`);
    }

    // Preservar las oraciones orgánicas completas del autor humano pre-2022 (sin fragmentar con breakLongSentence)

    // Glitch biológico certificado orgánico (máximo 2 por artículo, cadencia irregular)
    const existingGlitchPattern = /olvídate de las marcas|sin rodeos ni artificios|cuestión de proporciones|no todas sientan igual|pruébalas y notarás|icono atemporal|detalle sutil que lo cambia|un acierto seguro|diseño de toda la vida|te durarán años|al tacto se nota|varilla ajusta|alma metálica|pulido manual impecable/i;
    const alreadyHasAnyGlitch = existingGlitchPattern.test(rawPara) || existingGlitchPattern.test(reconstructedPara);
    const canInjectGlitch = options.injectGlitches === 'force' && !reconstructedPara.trim().endsWith(':') && !alreadyHasAnyGlitch && usedGlitches.size < 2;
    if (canInjectGlitch && (glitchIdx === 2 || glitchIdx === 6)) {
      const glitchObj = this.selectUnusedGlitch(frame, usedGlitches, `${rawPara} ${reconstructedPara}`);
      if (glitchObj && !reconstructedPara.includes(glitchObj.text)) {
        usedGlitches.add(glitchObj.text);
        const sents = reconstructedPara.split(/(?<=[.!?])\s+/).filter(Boolean);
        if (sents.length >= 3 && glitchIdx === 6) {
          // Intersperse glitch organically as an internal pause
          reconstructedPara = `${sents[0]} ${glitchObj.text} ${sents.slice(1).join(' ')}`.trim();
        } else {
          reconstructedPara = reconstructedPara.trim() + ' ' + glitchObj.text;
        }
        log(`[GLITCH_BIOLOGICO] Inyectado: "${glitchObj.text}" (${glitchObj.reason})`);
        auditSteps.push({
          stage: 'GLITCH_INJECTION',
          glitch: glitchObj.text,
          reason: glitchObj.reason
        });
        if (enableAntiPlagiarism) {
          const postGlitchOverlaps = this.findAllCorpusOverlaps(reconstructedPara, donorsUsedInPara, 7);
          if (postGlitchOverlaps.length > 0) {
            reconstructedPara = this.applySymbolicShingleBreaker(reconstructedPara, donorsUsedInPara, atoms, paraBridgeWords, 7);
          }
        }
      }
    }

    reconstructedPara = this.enforceBrandSku(reconstructedPara, atoms);
    let finalLiveEntailment = factualGuard.evaluateFactualEntailment(
      rawPara,
      reconstructedPara,
      atoms?.discriminativeAnchors,
      atoms?.signedPolarity
    );
    if (finalLiveEntailment.isHonestFactualGap) {
      rerankMeta.fitScore = Math.min(rerankMeta.fitScore ?? 5, 5);
      donorSelectionAudit.fitScore = rerankMeta.fitScore;
      semanticRerankerAudit.fitScore = rerankMeta.fitScore;
    }
    let trigramOverlap = this.computeNGramOverlapRatio(reconstructedPara, rawPara, 3);
    let divergencePct = Number(((1 - trigramOverlap) * 100).toFixed(1));

    let coverageEntry = bankGapTracker.evaluateParagraphCoverage({
      paragraphIndex,
      heading: currentAnchor || '(Introducción)',
      frame,
      isColonIntro,
      rawPara,
      atoms,
      donorText: reconstructedPara,
      donorId: donorsUsedInPara.map(b => b.brick_id).join(' + ') || 'fallback',
      source: donorsUsedInPara.map(b => b.source_domain || 'corpus').join(', ') || 'fallback',
      poolSize: centering.rawCoherentPoolSize ?? (centering.topCandidates?.length || pickedDonors.length),
      semScore: pickedDonors[0]?.brick?._semScore ?? 0,
      matchedTerms: pickedDonors[0]?.brick?._matchedTerms || [],
      fitScore: rerankMeta.fitScore,
      chosenRank: rerankMeta.chosenRank,
      candidateCount: rerankMeta.candidateCount,
      usedReranker: rerankMeta.usedReranker,
      rerankReason: rerankMeta.reason,
      qwenAttempts: qwenAttemptsUsed,
      rotatedCandidate,
      crossArticleReuseCount: pickedDonors[0]?.brick?._crossArticleReuseCount || 0,
      entailmentAudit: finalLiveEntailment
    });

    // -----------------------------------------------------------------------
    // CARRIL B (Edición Guiada Restringida sobre Andamio Humano + Juez Mecánico)
    // Se activa únicamente cuando Carril A clasifica el párrafo como hueco CRITICO
    // (o MEDIO+CRITICO si carrilBMode === 'always_gap'). Cero intervención en [OK].
    // -----------------------------------------------------------------------
    const shouldTriggerCarrilB = !isColonIntro && Boolean(carrilBStats?.enabled) && (
      carrilBStats.mode === 'always_gap' ? coverageEntry.isGap : coverageEntry.severity === 'CRITICO'
    );

    if (shouldTriggerCarrilB) {
      carrilBStats.triggered += 1;
      log(`[CARRIL_B] Activado en P${paragraphIndex} (${coverageEntry.severity}, cob=${coverageEntry.coverageScore}%) -> buscando andamio humano estructural...`);

      if (ollamaLazyState && !ollamaLazyState.checked) {
        const srv = await ollamaClient.ensureServerRunning(log);
        ollamaLazyState.checked = true;
        if (srv.available) {
          const names = (srv.models || []).map(m => m.name);
          const targetReq = ollamaLazyState.requestedModel || activeModel || 'qwen2.5:1.5b';
          const resolved = names.includes(targetReq)
            ? targetReq
            : (names.includes('qwen2.5:1.5b')
                ? 'qwen2.5:1.5b'
                : (names.includes('qwen2.5:0.5b') ? 'qwen2.5:0.5b' : names.find(n => n.toLowerCase().includes('qwen'))));
          if (resolved) {
            ollamaLazyState.available = true;
            ollamaLazyState.model = resolved;
            if (qwenStats) {
              qwenStats.enabled = true;
              qwenStats.activeModel = resolved;
            }
          }
        }
      }

      if (!ollamaLazyState?.available || !ollamaLazyState?.model) {
        carrilBStats.offline += 1;
        coverageEntry.track = 'CARRIL_B_OFFLINE_FALLBACK';
        log(`[CARRIL_B_OFFLINE] Ollama/Qwen no disponible para P${paragraphIndex}. Conservado fallback seguro de Carril A.`);
        auditSteps.push({
          stage: 'CARRIL_B_GUIDED_TRANSFER',
          status: 'OFFLINE_FALLBACK',
          model: ollamaLazyState?.requestedModel || activeModel,
          reason: 'Ollama o modelo Qwen local no disponible; conservado el borrador seguro de Carril A.'
        });
      } else {
        const carrilBRes = await carrilBEditor.runCarrilBForParagraph({
          rawPara,
          atoms,
          frame,
          heading: currentAnchor || '',
          paraTopology,
          masterBricks: this.masterBricks,
          usedDonorIds,
          factualGuard,
          discourseTopology,
          enterpriseRetriever,
          domainId,
          activeSubdomains,
          ollamaClient,
          cleanResponseFn: (r) => this.cleanQwenResponse(r),
          modelName: ollamaLazyState.model,
          baselineEntailment: finalLiveEntailment,
          qwenStats,
          log
        });

        if (carrilBRes.approved && carrilBRes.text) {
          let cbText = this.enforceBrandSku(carrilBRes.text, atoms);
          const cbOverlaps = this.findAllCorpusOverlaps(cbText, [carrilBRes.scaffold.brick], 7);
          if (cbOverlaps.length > 0) {
            const cbSurg = this.applyCentralGrammaticalSurgery(cbText, [carrilBRes.scaffold.brick], atoms, 7, log, auditSteps);
            const postSurgJudge = carrilBEditor.judgeCarrilBCandidate({
              candidate: cbSurg.text,
              donorBase: carrilBRes.scaffold.cleanText,
              rawPara,
              atoms,
              heading: currentAnchor || '',
              factualGuard,
              discourseTopology,
              paraTopology,
              domainId,
              activeSubdomains,
              baselineEntailment: finalLiveEntailment
            });
            if (postSurgJudge.approved) {
              cbText = cbSurg.text;
            }
          }

          reconstructedPara = cbText;
          paraInterventionTokens = this.countTokenDelta(carrilBRes.scaffold.cleanText, reconstructedPara);
          this.commitChosenDonors([{ brick: carrilBRes.scaffold.brick, domain: carrilBRes.scaffold.domain }], usedDonorIds, usedDomainsCount);
          donorsUsedInPara.length = 0;
          donorsUsedInPara.push(carrilBRes.scaffold.brick);

          finalLiveEntailment = factualGuard.evaluateFactualEntailment(
            rawPara,
            reconstructedPara,
            atoms?.discriminativeAnchors,
            atoms?.signedPolarity
          );
          const cbFit = finalLiveEntailment.isHonestFactualGap
            ? Math.min(6, Math.max(4, Math.round(finalLiveEntailment.entailmentScore / 15)))
            : Math.min(10, Math.max(8, Math.round((carrilBRes.judge.score + 10) / 10)));

          rerankMeta.fitScore = cbFit;
          donorSelectionAudit.donor_id = carrilBRes.scaffold.brick.brick_id;
          donorSelectionAudit.source = `${carrilBRes.scaffold.domain} (Carril B)`;
          donorSelectionAudit.fitScore = cbFit;
          donorSelectionAudit.skeleton = carrilBRes.scaffold.cleanText;
          trigramOverlap = this.computeNGramOverlapRatio(reconstructedPara, rawPara, 3);
          divergencePct = Number(((1 - trigramOverlap) * 100).toFixed(1));

          coverageEntry = bankGapTracker.evaluateParagraphCoverage({
            paragraphIndex,
            heading: currentAnchor || '(Introducción)',
            frame,
            isColonIntro,
            rawPara,
            atoms,
            donorText: reconstructedPara,
            donorId: carrilBRes.scaffold.brick.brick_id,
            source: `${carrilBRes.scaffold.domain} [Carril B]`,
            poolSize: centering.rawCoherentPoolSize ?? (centering.topCandidates?.length || pickedDonors.length),
            semScore: Math.max(pickedDonors[0]?.brick?._semScore ?? 0, carrilBRes.scaffold.scaffoldScore),
            matchedTerms: pickedDonors[0]?.brick?._matchedTerms || [],
            fitScore: cbFit,
            chosenRank: 1,
            candidateCount: carrilBRes.attempts.length,
            usedReranker: true,
            rerankReason: `Carril B Aprobado (LCS=${carrilBRes.judge.metrics.functionSkeletonLCS}, Entail=${finalLiveEntailment.entailmentScore}%, SrcMask3g=${carrilBRes.judge.metrics.maskedSourceTrigramOverlap})`,
            qwenAttempts: carrilBRes.attempts.length,
            rotatedCandidate: carrilBRes.attempts.some(a => a.attempt >= 3),
            crossArticleReuseCount: 0,
            entailmentAudit: finalLiveEntailment
          });
          coverageEntry.track = 'CARRIL_B_APROBADO';
          coverageEntry.resolvedByCarrilB = true;
          coverageEntry.carrilBMetrics = carrilBRes.judge.metrics;

          carrilBStats.approved += 1;
          carrilBStats.lcsSamples.push(carrilBRes.judge.metrics.functionSkeletonLCS);

          auditSteps.push({
            stage: 'CARRIL_B_GUIDED_TRANSFER',
            status: 'APPROVED',
            model: ollamaLazyState.model,
            scaffoldId: carrilBRes.scaffold.brick.brick_id,
            scaffoldDomain: carrilBRes.scaffold.domain,
            scaffoldMatch: carrilBRes.scaffold.matchSummary,
            scaffoldText: carrilBRes.scaffold.cleanText,
            attemptsCount: carrilBRes.attempts.length,
            attempts: carrilBRes.attempts,
            metrics: carrilBRes.judge.metrics,
            resultText: reconstructedPara,
            reason: `Transferencia guiada aprobada por Juez Mecánico (LCS=${carrilBRes.judge.metrics.functionSkeletonLCS}, Entail=${carrilBRes.judge.metrics.entailmentScore}%, SrcMask3g=${carrilBRes.judge.metrics.maskedSourceTrigramOverlap}).`
          });
        } else {
          carrilBStats.rejected += 1;
          const failedList = carrilBRes.judge?.failedGates || [carrilBRes.status];
          coverageEntry.track = 'CARRIL_B_RECHAZADO_FALLBACK';
          coverageEntry.carrilBFailedGates = failedList;
          log(`[CARRIL_B_FALLBACK] P${paragraphIndex} rechazado tras ${carrilBRes.attempts.length} intentos (${failedList.join(', ')}). Conservado fallback seguro de Carril A.`);

          auditSteps.push({
            stage: 'CARRIL_B_GUIDED_TRANSFER',
            status: carrilBRes.status || 'REJECTED_FALLBACK',
            model: ollamaLazyState.model,
            scaffoldId: carrilBRes.scaffold?.brick?.brick_id || null,
            scaffoldDomain: carrilBRes.scaffold?.domain || null,
            scaffoldMatch: carrilBRes.scaffold?.matchSummary || null,
            scaffoldText: carrilBRes.scaffold?.cleanText || null,
            attemptsCount: carrilBRes.attempts.length,
            attempts: carrilBRes.attempts,
            failedGates: failedList,
            bestScore: carrilBRes.judge?.score ?? null,
            reason: `Juez Mecánico rechazó todos los intentos (${failedList.join(', ')}); conservado borrador seguro de Carril A.`
          });
        }
      }
    } else {
      coverageEntry.track = 'CARRIL_A';
    }

    semanticRerankerAudit.donorId = coverageEntry.donorId;
    semanticRerankerAudit.domain = coverageEntry.source;
    semanticRerankerAudit.fitScore = coverageEntry.fitScore;
    semanticRerankerAudit.coverageScore = coverageEntry.coverageScore;
    semanticRerankerAudit.severity = coverageEntry.severity;
    semanticRerankerAudit.poolSize = coverageEntry.poolSize;
    semanticRerankerAudit.missingConcepts = coverageEntry.missingConcepts;
    semanticRerankerAudit.gapReasons = coverageEntry.gapReasons;
    semanticRerankerAudit.isBankGap = coverageEntry.isGap;
    semanticRerankerAudit.track = coverageEntry.track;
    semanticRerankerAudit.harvestKeywords = coverageEntry.harvestSpec?.keywords || [];

    return {
      text: reconstructedPara,
      donorsUsedInPara,
      interventionTokens: paraInterventionTokens,
      trigramOverlap,
      divergencePct,
      coverageEntry
    };
  }

  // =========================================================================
  // FASE 6: MÉTRICAS Y ANTI-PLAGIO SHINGLES (CORPUS COMPLETO + DONANTES)
  // =========================================================================
  calculateBurstiness(text) {
    // Excluir encabezados para medir el burstiness (σ) real exclusivamente sobre oraciones de cuerpo
    const bodyParas = (text || '')
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && !(p.split(/\s+/).filter(Boolean).length <= 20 && !/[.!?]$/.test(p)));
    const sentences = bodyParas
      .flatMap(p => p.split(/(?<=[.!?])\s+/))
      .map(s => s.trim())
      .filter(s => s.length > 5);
    if (!sentences.length) return { sigma: 0, avg: 0, lengths: [] };
    const lengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
    const avg = lengths.reduce((acc, l) => acc + l, 0) / lengths.length;
    const variance = lengths.reduce((acc, l) => acc + Math.pow(l - avg, 2), 0) / lengths.length;
    return {
      sigma: Number(Math.sqrt(variance).toFixed(2)),
      avg: Number(avg.toFixed(2)),
      lengths
    };
  }

  checkPlagiarismShingles(text, minViolationLen = 7) {
    const textWords = this.tokenize(text);
    const violations = [];
    if (textWords.length < minViolationLen) return violations;

    if (minViolationLen === 7 && this.corpus7GramMap && this.corpus7GramMap.size > 0) {
      const seenMatches = new Set();
      for (let i = 0; i <= textWords.length - 7; i++) {
        const s7 = textWords.slice(i, i + 7).join(' ');
        if (this.corpus7GramMap.has(s7) && !seenMatches.has(s7)) {
          seenMatches.add(s7);
          violations.push({
            shingle: s7,
            index: i,
            brick_id: this.corpus7GramMap.get(s7)
          });
        }
      }
      return violations;
    }

    // Fallback for custom shingle lengths
    const outputShingles = new Map();
    for (let i = 0; i <= textWords.length - minViolationLen; i++) {
      const shingle = textWords.slice(i, i + minViolationLen).join(' ');
      if (!outputShingles.has(shingle)) outputShingles.set(shingle, i);
    }

    const seenMatches = new Set();
    const allBricks = [
      ...this.masterBricks,
      ...(this.unifiedCorpusBricks || []),
      ...(this.goldenMM || []),
      ...(this.goldenOP || []),
      ...(this.goldenVH || [])
    ];

    for (const item of allBricks) {
      const donorWords = this.tokenize(item.raw_text || item.text || '');
      if (donorWords.length < minViolationLen) continue;
      for (let j = 0; j <= donorWords.length - minViolationLen; j++) {
        const dShingle = donorWords.slice(j, j + minViolationLen).join(' ');
        if (outputShingles.has(dShingle) && !seenMatches.has(dShingle)) {
          seenMatches.add(dShingle);
          violations.push({
            shingle: dShingle,
            index: outputShingles.get(dShingle),
            brick_id: item.brick_id || item.golden_id || item.donor_id
          });
          break;
        }
      }
    }
    return violations;
  }

  // =========================================================================
  // PIPELINE COMPLETO BLUEPAPER: DECONSTRUCCIÓN Y RECONSTRUCCIÓN FÁCTICA
  // =========================================================================
  async humanizeArticle(rawArticleText, options = {}, logCallback = null) {
    const domainId = options.domainId || 'optica';
    const domainPack = domainRegistry.getDomainPack(domainId);
    if (domainId !== 'optica') {
      const customBankPath = domainRegistry.resolveBankFilePath(domainId);
      if (!fs.existsSync(customBankPath)) {
        const subdomainsList = Object.keys(domainPack.subdomains || {}).join(', ');
        const msg = `El nicho "${domainPack.label}" está preparado arquitectónicamente (subdominios: ${subdomainsList}), pero todavía no tiene ladrillos cosechados en "${domainPack.bankDir}/${domainPack.masterBankFile}".`;
        return {
          text: '',
          bankEmptyForDomain: true,
          domainId,
          domainLabel: domainPack.label,
          message: msg,
          paragraphCount: 0,
          wordCount: 0,
          bankCoverageReport: [],
          auditTrail: [],
          metrics: {
            wordCount: 0,
            burstinessSigma: 0,
            plagiarismRunsCount: 0,
            bankCoverageGapsCount: 0,
            criticalGapsCount: 0,
            domainId
          }
        };
      }
    }

    if (!this.isLoaded) this.loadBanks();
    this.enableAntiPlagiarism = options.antiPlagiarism === true;
    const paragraphs = rawArticleText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const allSections = [];
    let activeSecBuilder = {
      headingIndex: -1,
      headingText: '',
      bodyParagraphs: [],
      bodyText: ''
    };
    allSections.push(activeSecBuilder);
    const sectionMetaByParaIndex = new Array(paragraphs.length);
    for (let idx = 0; idx < paragraphs.length; idx++) {
      const p = paragraphs[idx];
      if (this.isHeading(p, idx)) {
        activeSecBuilder = {
          headingIndex: idx,
          headingText: p,
          bodyParagraphs: [],
          bodyText: ''
        };
        allSections.push(activeSecBuilder);
        sectionMetaByParaIndex[idx] = activeSecBuilder;
      } else {
        activeSecBuilder.bodyParagraphs.push(p);
        sectionMetaByParaIndex[idx] = activeSecBuilder;
      }
    }
    for (const sec of allSections) {
      sec.bodyText = sec.bodyParagraphs.join(' ');
    }
    const articleActiveSubdomains = new Set();
    const sectionSubdomainsLog = [];
    const humanizedParas = [];
    const auditTrail = [];
    const bankCoverageReport = [];
    let currentAnchor = null;
    let isFirstAfterHeading = false;
    let glitchIdx = 0;
    const usedDonorIds = new Set();
    const usedDomainsCount = new Map();
    const allUsedDonorsForArticle = [];
    const usageLedger = options.crossArticleRotation !== false ? bankGapTracker.loadUsageLedger() : null;
    const sectionTopology = discourseTopology.computeSectionTopology(paragraphs, (p, idx) => this.isHeading(p, idx));
    const articleState = {
      prevOpener2w: null,
      prevPersona: null,
      articleMacroStyle: sectionTopology.articleMacroStyle
    };
    const centeringTransitions = { CONTINUE: 0, RETAIN: 0, SMOOTH_SHIFT: 0, ROUGH_SHIFT: 0 };
    const usedGlitches = new Set();
    const usedHinges = new Set();
    const usedBridgeWords = new Set();
    let totalInterventionTokens = 0;

    const log = (msg) => {
      if (logCallback) {
        logCallback(msg);
      } else {
        console.log(`[NeurosymbolicEngine] ${msg}`);
      }
    };

    const requestedLocalLLM = options.useLocalLLM !== false;
    let activeModel = options.modelName || 'qwen2.5:1.5b';
    let useLocalLLM = false;
    const carrilBMode = options.carrilBMode || (options.enableCarrilB === false ? 'off' : 'auto');
    const carrilBRequested = options.enableCarrilB !== undefined
      ? (options.enableCarrilB !== false && carrilBMode !== 'off')
      : (requestedLocalLLM && carrilBMode !== 'off');

    const qwenStats = {
      enabled: false,
      requestedModel: activeModel,
      activeModel: null,
      calls: 0,
      failures: 0,
      totalDurationMs: 0,
      totalTokens: 0
    };
    const carrilBStats = {
      enabled: Boolean(carrilBRequested),
      mode: carrilBMode,
      triggered: 0,
      approved: 0,
      rejected: 0,
      offline: 0,
      avgSkeletonLCS: null,
      lcsSamples: []
    };
    const ollamaLazyState = {
      checked: false,
      available: false,
      requestedModel: activeModel,
      model: null
    };

    log(`==========================================================================`);
    log(`COMPILADOR BLUEPAPER NOUS: DECONSTRUCCIÓN Y RECONSTRUCCIÓN FÁCTICA PURA`);
    log(`Total párrafos de entrada: ${paragraphs.length} | Caracteres: ${rawArticleText.length}`);
    log(`Bancos activos: ${this.masterBricks.length} ladrillos + ${(this.unifiedCorpusBricks || []).length} bloques unificados + ${(this.goldenMM?.length || 0) + (this.goldenOP?.length || 0) + (this.goldenVH?.length || 0)} marcos dorados (${this.corpus7GramMap?.size || 0} 7-gramas)`);
    log(`Modo Qwen solicitado: ${requestedLocalLLM ? `SÍ (${activeModel})` : 'NO (Modo Determinista)'} | Anti-Plagio: ${this.enableAntiPlagiarism ? 'ACTIVO' : 'DESACTIVADO (Humanización Pura)'} | Anti-Outro: ${options.antiOutro !== false} | Glitches: ${options.injectGlitches !== false}`);

    if (requestedLocalLLM) {
      const serverState = await ollamaClient.ensureServerRunning(log);
      if (serverState.available) {
        const installedNames = (serverState.models || []).map(m => m.name);
        if (installedNames.includes(activeModel)) {
          useLocalLLM = true;
        } else if (installedNames.includes('qwen2.5:0.5b')) {
          log(`[OLLAMA] Modelo "${activeModel}" no instalado. Fallback automático a "qwen2.5:0.5b".`);
          activeModel = 'qwen2.5:0.5b';
          useLocalLLM = true;
        } else {
          const anyQwen = installedNames.find(n => n.toLowerCase().includes('qwen'));
          if (anyQwen) {
            log(`[OLLAMA] Fallback automático al modelo Qwen disponible: "${anyQwen}".`);
            activeModel = anyQwen;
            useLocalLLM = true;
          } else {
            log(`[OLLAMA] No se encontraron modelos Qwen instalados (${installedNames.join(', ') || 'ninguno'}). Ejecutando modo determinista.`);
          }
        }
      } else {
        log(`[OLLAMA] Servidor local no disponible. Ejecutando fallback determinista sin Qwen.`);
      }
    }

    qwenStats.enabled = useLocalLLM;
    qwenStats.activeModel = useLocalLLM ? activeModel : null;
    if (requestedLocalLLM) {
      ollamaLazyState.checked = true;
      ollamaLazyState.available = useLocalLLM;
      ollamaLazyState.model = useLocalLLM ? activeModel : null;
    }
    log(`Motor Neuronal Activo: ${useLocalLLM ? `Qwen (${activeModel})` : 'Desactivado (Simbólico Determinista)'}${carrilBStats.enabled ? ` | Carril B Guiado: ACTIVO (${carrilBStats.mode}, solo críticos)` : ''}`);
    log(`Nicho Activo: ${domainId} (${domainPack.label}) | Enrutamiento por H2: ACTIVO (aislamiento estanco por sección)`);
    log(`==========================================================================`);

    for (let i = 0; i < paragraphs.length; i++) {
      const rawPara = paragraphs[i];
      const paraNum = i + 1;
      const auditSteps = [];
      const sec = sectionMetaByParaIndex[i] || null;

      log(`--------------------------------------------------------------------------`);
      log(`[PÁRRAFO ${paraNum}/${paragraphs.length}] Iniciando deconstrucción y reconstrucción...`);

      // FASE 0: Blindaje y Humanización de Encabezados
      if (this.isHeading(rawPara, i)) {
        const humanizedHeadingText = this.humanizeHeading(rawPara);
        currentAnchor = humanizedHeadingText;
        isFirstAfterHeading = true;
        const headingSubdomains = domainRegistry.resolveSectionSubdomains({
          headingText: rawPara,
          sectionBodyText: sec?.bodyText || '',
          paragraphText: '',
          domainId
        });
        for (const sd of headingSubdomains) articleActiveSubdomains.add(sd);
        sectionSubdomainsLog.push({
          paragraphIndex: paraNum,
          heading: humanizedHeadingText,
          subdomains: [...headingSubdomains]
        });

        log(`[FASE 0 - ESTRUCTURA] Encabezado procesado: "${rawPara}" -> "${humanizedHeadingText}"`);
        log(` -> Fijado como Entidad de Anclaje de Centrado (Cb) para los siguientes párrafos.`);
        log(`[FASE 0 - SUBDOMINIO H2] Sección "${humanizedHeadingText}" -> [${[...headingSubdomains].join(', ')}]`);

        auditSteps.push({
          stage: 'HEADING_HUMANIZATION',
          original: rawPara,
          text: humanizedHeadingText,
          subdomains: [...headingSubdomains],
          reason: 'Encabezado des-robotizado: eliminación de dos puntos sintéticos de ChatGPT ("Tema: Subtema") y conversión a titulación periodística orgánica sin alterar marcas ni modelos.'
        });

        humanizedParas.push(humanizedHeadingText);
        auditTrail.push({
          paragraphIndex: paraNum,
          totalParagraphs: paragraphs.length,
          isHeading: true,
          subdomains: [...headingSubdomains],
          originalText: rawPara,
          humanizedText: humanizedHeadingText,
          steps: auditSteps
        });
        continue;
      }

      const paraSubdomains = domainRegistry.resolveSectionSubdomains({
        headingText: currentAnchor || sec?.headingText || '',
        sectionBodyText: sec?.bodyText || '',
        paragraphText: rawPara,
        domainId
      });
      for (const sd of paraSubdomains) articleActiveSubdomains.add(sd);
      log(`[FASE 0 - SUBDOMINIO H2] P${paraNum} (H2: "${currentAnchor || 'Introducción'}") -> [${[...paraSubdomains].join(', ')}]`);

      // FASE 1 (Heurística rápida): Clasificación de Marco y Átomos Deterministas
      const { type, atoms } = this.classifyParagraph(rawPara, currentAnchor, paraSubdomains);
      if (
        type === 'PRODUCT_FACTUAL' &&
        currentAnchor &&
        /^(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley|Carrera|Moscot|Oliver Peoples)\b/i.test(currentAnchor)
      ) {
        const strictAnchorSkus = factualGuard.extractStrictBrandSkus(rawPara, currentAnchor);
        if (strictAnchorSkus.length > 0 && (atoms.brand_models.length === 0 || strictAnchorSkus[0].length > (atoms.brand_models[0] || '').length)) {
          atoms.brand_models = strictAnchorSkus;
        }
        atoms.discriminativeAnchors = factualGuard.extractDiscriminativeAnchors(rawPara, atoms);
      }

      const atomSummary = [];
      if (atoms.brand_models.length) atomSummary.push(`Marcas: [${atoms.brand_models.join(', ')}]`);
      if (atoms.proper_entities?.length) atomSummary.push(`Entidades: [${atoms.proper_entities.join(', ')}]`);
      if (atoms.shapes.length) atomSummary.push(`Formas: [${atoms.shapes.join(', ')}]`);
      if (atoms.styles.length) atomSummary.push(`Estilos: [${atoms.styles.join(', ')}]`);
      if (atoms.materials.length) atomSummary.push(`Materiales: [${atoms.materials.join(', ')}]`);
      if (atoms.outfits.length) atomSummary.push(`Outfits: [${atoms.outfits.join(', ')}]`);
      if (atoms.coatings.length) atomSummary.push(`Protección: [${atoms.coatings.join(', ')}]`);
      if (atoms.key_concepts?.length) atomSummary.push(`Conceptos: [${atoms.key_concepts.slice(0, 4).join(', ')}]`);

      const atomSummaryText = atomSummary.length ? atomSummary.join(' | ') : 'Hechos narrativos generales';
      const tuples = this.deconstructToDavidsonianTuples(rawPara, atoms, type, currentAnchor);
      const tuplesLog = tuples.map(t => `${t.id}=<${t.entity}, ${t.predicate}[${t.relationType}], ${t.argument}, [${t.requiredSlots.join(',') || 'CORE'}]}>`).join(' ; ');
      log(`[FASE 1 - ATOMIZACIÓN] Marco: ${type} | Átomos base: ${atomSummaryText}`);
      log(`[FASE 1 - TUPLAS DAVIDSON] ${tuplesLog}`);
      if (atoms.relations && atoms.relations.length) {
        const relCardsLog = atoms.relations
          .filter(r => r.relation !== 'HAS_ATTRIBUTE')
          .slice(0, 5)
          .map(r => `[${r.subject} -> ${r.relation} -> ${r.target}]`)
          .join(' | ');
        if (relCardsLog) log(`[FASE 1 - FICHAS RELACIONALES] ${relCardsLog}`);
      }
      auditSteps.push({
        stage: 'DAVIDSON_ATOMIZATION',
        atoms: atomSummaryText,
        tuples,
        frame: type,
        reason: 'Deconstrucción lógica de Davidson: extracción de entidades, predicados, marcos e invariantes (Bedeutung).'
      });

      const recon = await this.reconstructParagraphBluepaper({
        paragraphIndex: paraNum,
        frame: type,
        atoms,
        atomSummaryText,
        tuples,
        rawPara,
        currentAnchor,
        isFirstAfterHeading,
        glitchIdx,
        options,
        auditSteps,
        usedDonorIds,
        usedDomainsCount,
        centeringTransitions,
        usedGlitches,
        usedHinges,
        usedBridgeWords,
        useLocalLLM,
        activeModel,
        log,
        qwenStats,
        usageLedger,
        articleState,
        paraTopology: sectionTopology.items[i] || null,
        carrilBStats,
        ollamaLazyState,
        domainId,
        activeSubdomains: paraSubdomains
      });

      if (Array.isArray(recon.donorsUsedInPara)) {
        allUsedDonorsForArticle.push(...recon.donorsUsedInPara);
      }

      totalInterventionTokens += recon.interventionTokens || 0;
      isFirstAfterHeading = false;

      // Limpieza tipográfica final
      let reconstructedPara = recon.text
        .replace(/\b([a-záéíóúüñ]+[áéíóú])\s+(lic[oa]s?|tic[oa]s?|gic[oa]s?|mic[oa]s?|nic[oa]s?)\b/gi, '$1$2')
        .replace(/\ba el\b/g, 'al')
        .replace(/\bA el\b/g, 'Al')
        .replace(/\bde el\b/g, 'del')
        .replace(/\bDe el\b/g, 'Del')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .replace(/\.\s*\./g, '.')
        .replace(/;\s*\./g, '.')
        .replace(/:\s*\./g, ':')
        .trim();

      if (reconstructedPara.length > 0) {
        reconstructedPara = reconstructedPara.charAt(0).toUpperCase() + reconstructedPara.slice(1);
        if (!/[.!?:]$/.test(reconstructedPara)) reconstructedPara += '.';
      }

      const paraOverlaps7 = this.findAllCorpusOverlaps(reconstructedPara, recon.donorsUsedInPara, 7);
      const paraWords = reconstructedPara.split(/\s+/).filter(Boolean).length;
      const paraTrigramOverlap = this.computeNGramOverlapRatio(reconstructedPara, rawPara, 3);
      const paraDivergencePct = Number(((1 - paraTrigramOverlap) * 100).toFixed(1));

      humanizedParas.push(reconstructedPara);

      if (recon.coverageEntry) {
        bankCoverageReport.push({
          paragraphIndex: paraNum,
          sectionHeading: currentAnchor || '(Introducción)',
          subdomains: [...paraSubdomains],
          ...recon.coverageEntry
        });
      }

      auditTrail.push({
        paragraphIndex: paraNum,
        totalParagraphs: paragraphs.length,
        isHeading: false,
        sectionHeading: currentAnchor || '(Introducción)',
        subdomains: [...paraSubdomains],
        originalText: rawPara,
        humanizedText: reconstructedPara,
        trigramOverlap: paraTrigramOverlap,
        divergencePct: paraDivergencePct,
        coverage: recon.coverageEntry || null,
        steps: auditSteps
      });

      log(`[TEXTO ORIGINAL] "${rawPara}"`);
      log(`[TEXTO TRANSFORMADO] "${reconstructedPara}"`);
      log(`[MÉTRICAS_PÁRRAFO ${paraNum}] Palabras: ${paraWords} | Divergencia vs Original: ${paraDivergencePct}% (Trigramas=${(paraTrigramOverlap * 100).toFixed(1)}%) | Solapamientos >=7w: ${paraOverlaps7.length}`);
      glitchIdx++;
    }

    const fullResult = humanizedParas.join('\n\n');
    const burstiness = this.calculateBurstiness(fullResult);
    const shingleIssues = this.checkPlagiarismShingles(fullResult, 7);
    const totalWords = fullResult.split(/\s+/).filter(Boolean).length;
    const telemetry = this.computeBluepaperTelemetry({
      uniqueDomainsCount: usedDomainsCount.size,
      centeringTransitions
    });
    const bodyEntries = auditTrail.filter(p => !p.isHeading);
    const avgDivergencePct = bodyEntries.length
      ? Number((bodyEntries.reduce((acc, p) => acc + (p.divergencePct ?? 100), 0) / bodyEntries.length).toFixed(1))
      : 100;

    const coverageGaps = bankCoverageReport.filter(e => e.isGap);
    const criticalGapsCount = coverageGaps.filter(e => e.severity === 'CRITICO').length;
    const mediumGapsCount = coverageGaps.filter(e => e.severity === 'MEDIO').length;
    const avgFitScore = bankCoverageReport.length
      ? Number((bankCoverageReport.reduce((acc, e) => acc + (e.fitScore ?? 0), 0) / bankCoverageReport.length).toFixed(1))
      : 0;
    const avgSemScore = bankCoverageReport.length
      ? Number((bankCoverageReport.reduce((acc, e) => acc + (e.semScore ?? 0), 0) / bankCoverageReport.length).toFixed(1))
      : 0;
    const avgCoverageScore = bankCoverageReport.length
      ? Number((bankCoverageReport.reduce((acc, e) => acc + (e.coverageScore ?? 100), 0) / bankCoverageReport.length).toFixed(1))
      : 100;

    let registryUpdate = null;
    if (options.recordBankGaps !== false && bankCoverageReport.length > 0) {
      try {
        registryUpdate = bankGapTracker.recordArticleCoverage(bankCoverageReport, {
          title: paragraphs[0]?.slice(0, 90) || 'Artículo',
          inputWords: rawArticleText.split(/\s+/).filter(Boolean).length,
          outputWords: totalWords,
          model: useLocalLLM ? activeModel : 'symbolic'
        });
      } catch (gapErr) {
        log(`[RADAR_HUECOS_ERROR] No se pudo persistir el registro acumulado: ${gapErr.message}`);
      }
    }

    let usageUpdate = null;
    if (options.trackDonorUsage !== false && allUsedDonorsForArticle.length > 0) {
      try {
        usageUpdate = bankGapTracker.recordUsedDonors(allUsedDonorsForArticle, {
          title: paragraphs[0]?.slice(0, 90) || 'Artículo'
        });
      } catch (usageErr) {
        log(`[ROTACION_USO_ERROR] No se pudo registrar uso de donantes: ${usageErr.message}`);
      }
    }
    const cleanCapacity = this.getBankStats()?.usableCleanBlocks || null;
    const usageStats = bankGapTracker.getUsageStats(cleanCapacity);
    const crossArticleRepeatsCount = bankCoverageReport.filter(e => (e.crossArticleReuseCount || 0) > 0).length;

    if (carrilBStats.lcsSamples.length > 0) {
      const sumLcs = carrilBStats.lcsSamples.reduce((a, b) => a + b, 0);
      carrilBStats.avgSkeletonLCS = Number((sumLcs / carrilBStats.lcsSamples.length).toFixed(4));
    }
    const { lcsSamples: _dropLcs, ...publicCarrilBStats } = carrilBStats;

    log(`==================== RESUMEN DE COMPILACIÓN FÁCTICA ====================`);
    log(`Palabras entrada: ${rawArticleText.split(/\s+/).filter(Boolean).length} -> Palabras salida: ${totalWords}`);
    log(`Divergencia promedio vs Original: ${avgDivergencePct}%`);
    log(`Burstiness (σ): ${burstiness.sigma}`);
    log(`Dispersión de donantes: ${telemetry.uniqueDonorDomains} dominios distintos`);
    log(`Transiciones Centrado DAG: CONTINUE=${centeringTransitions.CONTINUE}, RETAIN=${centeringTransitions.RETAIN}, SMOOTH_SHIFT=${centeringTransitions.SMOOTH_SHIFT}, ROUGH_SHIFT=${centeringTransitions.ROUGH_SHIFT}`);
    log(`Coincidencias de plagio (>=7-gram shingles contra banco): ${shingleIssues.length}`);
    log(`Procesos Qwen: ${qwenStats.calls} llamadas | Fallos: ${qwenStats.failures} | Tokens generados: ${qwenStats.totalTokens} | Tiempo Qwen total: ${(qwenStats.totalDurationMs / 1000).toFixed(2)}s`);
    log(`[CARRIL_B] Disparados: ${publicCarrilBStats.triggered} | Aprobados: ${publicCarrilBStats.approved} | Rechazados: ${publicCarrilBStats.rejected} | Offline: ${publicCarrilBStats.offline} | LCS medio: ${publicCarrilBStats.avgSkeletonLCS ?? '—'}`);
    log(`=== AUDITORÍA DE COBERTURA DEL BANCO (HUECOS: ${coverageGaps.length}/${bankCoverageReport.length} [${criticalGapsCount} críticos, ${mediumGapsCount} medios] | Cobertura media: ${avgCoverageScore}% | SemScore medio: ${avgSemScore}) ===`);
    for (const entry of bankCoverageReport) {
      const flag = entry.severity === 'CRITICO' ? '[CRITICO]' : (entry.severity === 'MEDIO' ? '[MEDIO]  ' : '[OK]     ');
      const missingTag = entry.missingConcepts?.length ? ` | Faltan: [${entry.missingConcepts.join(', ')}]` : '';
      log(`${flag} P${entry.paragraphIndex} (${entry.heading}) | ${entry.targetFrame || entry.frame} | Cob: ${entry.coverageScore}% | Pool: ${entry.poolSize ?? '?'} | Sem: ${entry.semScore} | Donante: ${entry.donorId} (${entry.source})${missingTag} | ${entry.reason}`);
    }
    if (registryUpdate && registryUpdate.stats) {
      log(`[RADAR_HUECOS] Registro acumulado actualizado: ${registryUpdate.stats.totalGapsOpen} huecos pendientes (${registryUpdate.stats.totalGapsCritical} críticos, ${registryUpdate.autoResolved} auto-resueltos).`);
    }
    log(`[ROTACIÓN_ENTRE_ARTÍCULOS] Donantes registrados: ${usageUpdate?.recordedBricks || allUsedDonorsForArticle.length} | Repeticiones inter-artículo en este texto: ${crossArticleRepeatsCount}/${bankCoverageReport.length} | Únicos usados en historial: ${usageStats.uniqueDonorsUsed}${usageStats.totalCleanCapacity ? `/${usageStats.totalCleanCapacity} (${usageStats.coverageRatioPct}%)` : ''}`);
    log(`========================================================================`);

    return {
      text: fullResult,
      paragraphCount: humanizedParas.length,
      wordCount: totalWords,
      metrics: {
        wordCount: totalWords,
        divergencePct: avgDivergencePct,
        burstiness: burstiness.sigma,
        burstinessSigma: burstiness.sigma,
        avgSentenceLength: burstiness.avg,
        plagiarismRunsCount: shingleIssues.length,
        shingleViolationsCount: shingleIssues.length,
        shingleViolations: shingleIssues,
        uniqueDonorDomains: telemetry.uniqueDonorDomains,
        centeringTransitions: telemetry.centeringTransitions,
        avgFitScore,
        avgSemScore,
        avgCoverageScore,
        bankCoverageGapsCount: coverageGaps.length,
        criticalGapsCount,
        mediumGapsCount,
        crossArticleRepeatsCount,
        usageStats,
        bankGapRegistrySummary: registryUpdate?.stats || null,
        qwenStats,
        carrilBStats: publicCarrilBStats,
        domainId,
        activeSubdomains: [...articleActiveSubdomains],
        sectionSubdomains: sectionSubdomainsLog
      },
      bankCoverageReport,
      auditTrail
    };
  }
}

module.exports = new NeurosymbolicEngine();
