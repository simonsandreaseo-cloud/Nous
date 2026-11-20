'use strict';

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

module.exports = {
  FUNCTIONAL_WORDS_ES,
  DEFAULT_HEDGE_HINGES,
  OPTICAL_CONCEPT_CLUSTERS,
  WORD_TO_CONCEPT_CLUSTER,
  SEMANTIC_STOPWORDS_ES,
  AI_CLICHE_REPLACEMENTS,
  OUTRO_CLICHES,
  CERTIFIED_BIOLOGICAL_GLITCHES,
  FRAME_SHAPE_ONTOLOGY
};
