const fs = require('fs');
const path = require('path');

// 1. Decode HTML entities into real UTF-8 Spanish characters
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&hellip;/gi, '...')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&#x([0-9a-fA-F]+);/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec))
    .replace(/^[\u25b6\u25ba\u2022\u25cf\-\*>\s]+/g, '');
}

// 2. Strict Domain Evaluation & Exclusion Rules
function evaluateDomain(sourceDomain) {
  const d = (sourceDomain || '').toLowerCase();
  
  // Wikipedia exclusion
  if (d.includes('wikipedia') || d === 'es') {
    return {
      tier: 'TIER_4_WIKIPEDIA',
      voice_category: 'ENCYCLOPEDIC',
      exclude_from_humanization: true
    };
  }

  // Optimoda B2B PR exclusion
  if (d.includes('optimoda')) {
    return {
      tier: 'TIER_3_CORPORATE_PR',
      voice_category: 'CORPORATE_B2B',
      exclude_from_humanization: true
    };
  }

  // Clinical ophthalmology & contactology (Barraquer, Baviera, Oftalvist, VisionDirect, Dr. Picó, QVision, Fernández-Vega, ICR)
  if (d.includes('barraquer') || d.includes('baviera') || d.includes('clinicabaviera') ||
      d.includes('pico') || d.includes('qvision') || d.includes('oftalvist') ||
      d.includes('visiondirect') || d.includes('fernandez-vega') || d.includes('icrcat')) {
    return {
      tier: 'TIER_1_WORKSHOP',
      voice_category: 'WORKSHOP_CLINICAL',
      exclude_from_humanization: false
    };
  }

  // Authentic optical workshop
  if (d.includes('opticagasset') || d.includes('gasset') ||
      d.includes('opticasflorida') || d.includes('florida') ||
      d.includes('opticauniversitaria') || d.includes('opticafernandezbaca') ||
      d.includes('generaloptica') || d.includes('cottet') ||
      d.includes('afflelou') || d.includes('vipsual') ||
      d.includes('barrea') || d.includes('xn--opticabarrea') ||
      d.includes('costasol') || d.includes('optiveropticos') ||
      d.includes('villalba') || d.includes('frases_raras') ||
      d === 'verified_pre2022_workshop') {
    return {
      tier: 'TIER_1_WORKSHOP',
      voice_category: 'WORKSHOP_CLINICAL',
      exclude_from_humanization: false
    };
  }

  // Editorial & lifestyle (Milyunagafas, Hanukeii, Fresh, Trendencias, OkChicas, Medium, GQ)
  return {
    tier: 'TIER_2_EDITORIAL',
    voice_category: 'EDITORIAL_LIFESTYLE',
    exclude_from_humanization: false
  };
}

// 3. Taxonomy configuration
const TAXONOMY_PATH = 'banco_ontologico_semantico/TAXONOMIA_MARCOS_Y_RANURAS.json';
const TAXONOMY = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf8'));

// 4. Regex dictionaries for open nominal slot extraction (ordered by semantic specificity)
const SLOT_PATTERNS = [
  {
    type: 'SLOT_BRAND',
    regex: /\b(persol|prada|ray-ban|rayban|dolce&gabbana|dolce & gabbana|tom ford|carrera|gucci|chloé|alain afflelou|afflelou|oakley|maui jim|barberini|oliver peoples|serengeti|chanel|dior|polaroid)\b/gi
  },
  {
    type: 'SLOT_MODEL',
    regex: /\b(po0714sm|po0649|pr d\d{2}[a-z]+|spr\d{2}|714 steve mcqueen|steve mcqueen|meflecto|victor flex|protector|lombard|aviator|wayfarer|clubmaster|persol 714|persol 649|emon polarized|enoha polarized|mahea polarized)\b/gi
  },
  {
    type: 'SLOT_MATERIAL',
    regex: /\b(acetato de celulosa|acetato natural|acetato de pasta|ecoacetato|acetato reciclado|acetato|cristales minerales|cristal mineral|vidrio mineral|vidrio óptico|cristal templado|policarbonato|polímeros orgánicos|polímero orgánico|resina orgánica|cr-39|cr39|trivex|fibra de algodón|flor de algodón|titanio|pasta|metálica|metálicas|metálicos|metal|aluminio|acero inoxidable)\b/gi
  },
  {
    type: 'SLOT_COMPONENT',
    regex: /\b(filtro solar|filtros solares|filtro ultravioleta|filtros ultravioleta|filtro polarizado|filtros polarizados|filtro de luz visible|filtros de luz visible|filtro uv|filtros uv|lámina polarizada|láminas polarizadas|lentes polarizadas|lentes de sol|lentes solares|lentes oftálmicas|lentes orgánicas|lentes minerales|lentes|lente|cristales minerales|cristal mineral|cristales|cristal|montura de sol|monturas de sol|montura de pasta|montura metálica|monturas|montura|armazón|varillas flexibles|varillas|patillas flexibles|patillas|puente central|puente nasal|puente en cerradura|puente de cerradura|puente keyhole|puente|almohadillas metálicas|almohadillas|bisagras de precisión|bisagras adicionales|bisagra lateral|bisagras|estuche rígido de piel|estuche rígido|estuche original|estuche protector|estuche|funda de microfibra|funda|gamuza de microfibra|gamuza|paño de microfibra|paño|cilindros de nylon y acero|cilindros de nylon|flecha plateada supreme|flecha supreme|flecha lateral)\b/gi
  },
  {
    type: 'SLOT_FACIAL_FEATURE',
    regex: /\b(rostro cuadrado|rostro redondo|rostro ovalado|rostro alargado|cara redonda|cara cuadrada|cara ovalada|óvalo de la cara|tabique nasal|tabique|puente de la nariz|laterales de la nariz|sienes|facciones|rasgos del rostro|rasgos faciales|mandíbula angulosa|mandíbula estrecha|mandíbula|pómulos anchos|pómulos|frente ancha|frente)\b/gi
  },
  {
    type: 'SLOT_MEASURE',
    regex: /\b(uv\s*400|uv400|400\s*a\s*800\s*nanómetros|380\s*a\s*400\s*nanómetros|400\s*nanómetros|380\s*nanómetros|800\s*nanómetros|400\s*nm|380\s*nm|categorías\s*[0-4]\s*al\s*[0-4]|categorías\s*[0-4]\s*a\s*[0-4]|categorías\s*[0-4]\s*o\s*[0-4]|filtro\s*(?:solar\s*)?(?:de\s*)?categoría\s*[0-4]|categoría\s*[0-4]|categorías|\d{1,3}\s*%\s*(?:a\s*\d{1,3}\s*%|y\s*(?:un\s*)?\d{1,3}\s*%)?|\d{1,3}\s*%|calibre\s*\d{2}|puente\s*\d{2}|varilla\s*\d{2,3}|\d{2,3}\s*mm|\d{2,3}\s*milímetros|\d{1,2}(?:,\d+)?\s*dioptrías?)\b/gi
  },
  {
    type: 'SLOT_COLOR',
    regex: /\b(terra di siena|gris pizarra|verde polarizado|verde clásico|marrón cálido|havana|carey oscuro|carey|ámbar|negro brillo|negro mate|negro|dorado|plateado|azul clásico|azul|verde|marrón|gris|amarillo|naranja|violeta|rosa)\b/gi
  },
  {
    type: 'SLOT_AESTHETIC_STYLE',
    regex: /\b(minimalis(?:mo|ta)s?|brutalis(?:mo|ta)s?|retro-?futuris(?:mo|ta)s?|cyberpunk|steampunk|retro|vintage|setenter[oa]s?|ochenter[oa]s?|noventer[oa]s?|sesenter[oa]s?|y2k|avant-?garde|vanguardis(?:mo|ta)s?|vanguardia|industrial|maximalis(?:mo|ta)s?|quiet luxury|futuris(?:mo|ta)s?|atemporal(?:es)?|cl[aá]sic[oa]s?|contempor[aá]ne[oa]s?|bohemio|boho|rocker|preppy|geek|nerd chic|años (?:50|60|70|80|90)|urbano contempor[aá]neo|elegante|elegantes|sofisticad[oa]s?|chic|audaz|audaces|extravagante|extravagantes|discret[oa]s?|sobri[oa]s?)\b/gi
  },
  {
    type: 'SLOT_FRAME_SHAPE',
    regex: /\b(cat-?eye|ojo de gato|ojos de gato|aviador|aviator|silueta pantos|pantos|gafas mariposa|mariposa|gafas redondas|montura redonda|redondas?|gafas ovaladas|montura ovalada|ovaladas?|gafas rectangulares|montura rectangular|rectangulares?|gafas cuadradas|montura cuadrada|cuadradas?|gafas hexagonales|silueta hexagonal|hexagonales?|montura geom[eé]trica|monturas geom[eé]tricas|geom[eé]tricas?|al aire|rimless|semi al aire|nylor|envolventes|envolvente|oversize|micro-gafas|pantalla completa|pantalla)\b/gi
  },
  {
    type: 'SLOT_LENS_GEOMETRY',
    regex: /\b(cristales? progresivos?|gafas? progresivas?|lentes? progresivas?|progresivos?|progresivas?|cristales? monofocales?|gafas? monofocales?|lentes? monofocales?|monofocal(?:es)?|bifocales?|lentes? bifocales?|cristales? bifocales?|lentes? ocupacionales?|cristales? ocupacionales?|lentes? de oficina|diseño asf[eé]rico|lentes? asf[eé]ricas?|cristal asf[eé]rico|asf[eé]ric[oa]s?|tallado digital|tallado free-?form|freeform|base \d{1,2}|curvatura base|curvatura|zona de cerca|visi[oó]n intermedia|visi[oó]n de lejos|pasillo de progresi[oó]n|campo visual lateral|amplitud de campo|campo de visi[oó]n)\b/gi
  },
  {
    type: 'SLOT_COATING',
    regex: /\b(antirreflejantes?|antirreflejos?|antirreflejo|antirreflejante|tratamiento antirreflejo|capa antirreflejo|fotocrom[aá]tic[oa]s?|transitions|polarizad[oa]s?|polarizaci[oó]n|filtro de luz azul|luz azul|blue control|drivesafe|duravision|antirrayas?|anti-rayas?|antirrayado|hidr[oó]fob[oa]s?|ole[oó]fob[oa]s?|multicapa|antivaho|anti-vaho|espejad[oa]s?|espejo|filtro uv|filtro solar|filtro ultravioleta|l[aá]mina polarizada)\b/gi
  },
  {
    type: 'SLOT_SYMPTOM',
    regex: /\b(visión borrosa|visión doble|diplopía|fotofobia|sensibilidad a la luz|halos de luz|halos nocturnos|destellos|deslumbramiento|fatiga visual|cansancio ocular|escozor|picor de ojos|sequedad ocular|ojo seco|sensación de arenilla|lagrimeo constante|ojo rojo|ojos rojos|cefalea ocular|dolor de cabeza)\b/gi
  },
  {
    type: 'SLOT_DIAGNOSTIC_EQUIPMENT',
    regex: /\b(l[aá]mpara de hendidura|ton[oó]metro(?: de aire)?|tonometr[ií]a|presi[oó]n intraocular|pio|topograf[ií]a corneal|top[oó]grafo|oct|tomograf[ií]a de coherencia [oó]ptica|retinograf[ií]a|retin[oó]grafo|autorrefract[oó]metro|optotipo|campimetr[ií]a|campo visual|paquimetr[ií]a|paqu[ií]metro|biometr[ií]a ocular|bi[oó]metro|queratometr[ií]a|querat[oó]metro|fondo de ojo|oftalmoscopio|cicloplej[ií]a|refracci[oó]n bajo cicloplej[ií]a|pupil[oó]metro|for[oó]ptero)\b/gi
  },
  {
    type: 'SLOT_OPHTHALMIC_DRUG',
    regex: /\b(l[aá]grimas artificiales|l[aá]grima artificial|[aá]cido hialur[oó]nico|colirios?|colirio hipotensor|gotas humectantes|gotas lubricantes|antiinflamatorios? oft[aá]lmicos?|antibi[oó]ticos? oft[aá]lmicos?|corticoides? oft[aá]lmicos?|antihistam[ií]nicos? oft[aá]lmicos?|midri[aá]ticos?|pomada oft[aá]lmica|suero aut[oó]logo|f[aá]rmacos? antiglaucoma|gotas para los ojos|lubricante ocular)\b/gi
  },
  {
    type: 'SLOT_OCCASION_OUTFIT',
    regex: /\b(streetwear|alfombra roja|sastrer[ií]a|traje de chaqueta|traje|look casual|look informal|alta monta[nñ]a|conducci[oó]n nocturna|conducci[oó]n|oficina|pantallas de ordenador|pantallas|deportes de agua|playa|pasarela|eventos formales|ciclismo|running|deporte|nieve|esqu[ií])\b/gi
  },
  {
    type: 'SLOT_PATHOLOGY',
    regex: /\b(miopía magna|miopía|hipermetropía|astigmatismo|presbicia|vista cansada|cataratas?|glaucoma|ojo seco|ojo vago|ambliopía|queratocono|degeneración macular|dmae|retinopatía diabética|retinopatía|blefaritis|conjuntivitis|estrabismo|desprendimiento de retina)\b/gi
  },
  {
    type: 'SLOT_ANATOMY_EYE',
    regex: /\b(córnea|cristalino|retina|mácula|fóvea|humor vítreo|humor acuoso|conjuntiva|esclera|esclerótica|iris|pupila|nervio óptico|película lagrimal|glándulas de meibomio|párpados?|epitelio corneal|endotelio corneal)\b/gi
  },
  {
    type: 'SLOT_CONTACT_LENS',
    regex: /\b(lentes de contacto\s*(?:diarias|mensuales|quincenales|blandas|rígidas|tóricas|multifocales|gas permeables|esclerales)?|lentillas\s*(?:diarias|mensuales|quincenales|blandas|rígidas|tóricas|multifocales|de hidrogel)?|hidrogel de silicona|hidrogel convencional|solución única|solución salina|lágrimas artificiales|líquido de lentillas)\b/gi
  },
  {
    type: 'SLOT_TECHNIQUE',
    regex: /\b(tratamiento antirreflejante|tratamientos antirreflejantes|tratamiento antirreflejos|tratamiento antirreflejo|tratamiento multicapa|tratamiento endurecido|tratamiento hidrofóbico|tratamiento hidrófobo|tratamiento espejado|baño de ultrasonidos|limpieza por ultrasonidos|limpieza con ultrasonidos|limpieza con agua tibia y jabón neutro|limpieza con agua y jabón|polarización|pulido a mano|pulidas en tambores|pulido|fresado minucioso|fresado|tallado en un solo bloque|tallado|ensamblado artesanal|fabricadas a mano|tintado en masa|inyección en molde|biselado|ranurado|taladrado|centrado pupilar|graduación|cirugía refractiva|lasik|femtolasik|prk|facoemulsificación|lente intraocular|implante de lente|soldadura|baño galvánico|montaje de lentes)\b/gi
  },
  {
    type: 'SLOT_PROPERTY',
    regex: /\b(tacto cálido|brillo natural|pureza óptica|pureza cristalina|dureza superficial|resistencia a las rayaduras|resistencia al rayado|resistencia al rallado|resistencia a los impactos|resistencia al impacto|inastillable|irrompible|agudeza visual|nitidez visual|confort visual|comodidad visual|fatiga visual|deslumbramiento|reflejos molestos|distorsión óptica|aberración cromática|comodidad absoluta|flexibilidad lateral|ajuste anatómico|alta ligereza|ligereza|protección uv|protección ultravioleta|polarizado|polarizada|polarizados|polarizadas|antirreflejante|antirreflejantes|antirreflejo|antirreflejos|antirrayas|anti-rayas|fotocromático|fotocromática|fotocromáticos|fotocromáticas|hidrófobo|hidrofóbico|oleófobo|oleofóbico)\b/gi
  }
];

// 5. Rhetorical Glitches & RST Relations
function detectRhetoricalRelation(text) {
  const lower = text.toLowerCase();

  // CAT_01: Discordancia ad sensum
  if (/las características principales.*es que son/i.test(text) ||
      /las características.*es que/i.test(text) ||
      /bastantes incómodos/i.test(text) ||
      /muchos más confortable/i.test(text) ||
      /este tipo de filtros son los que/i.test(text) ||
      /es otro estilo.*que rompe/i.test(text) ||
      /un diseño.*u otros/i.test(text) ||
      /una forma.*u otros/i.test(text)) {
    return 'CAT_01_AD_SENSUM';
  }

  // CAT_02: Reduplicación copulativa o tartamudeo
  if (/son gafas que son/i.test(text) ||
      /son lentes que son/i.test(text) ||
      /son modelos que son/i.test(text) ||
      /es un cristal que es/i.test(text) ||
      /por ejemplo.*por ejemplo/i.test(text) ||
      /es decir.*es decir/i.test(text)) {
    return 'CAT_02_COPULATIVE_REDUPLICATION';
  }

  // CAT_03: Fractura ilícita tras punto
  if (/\.\s+(?:Y por tanto|Ya que|Sino que|Sino|Con lo que|Con lo cual|Pero también|De ahí que|Por lo que)\b/i.test(text)) {
    return 'CAT_03_ILLICIT_PUNCTUATION_BREAK';
  }

  // CAT_04: Anacoluto o pseudo-cleft compleja
  if (/aunque son indispensables.*es ahora cuando/i.test(text) ||
      /el necesitar.*con elegir/i.test(text) ||
      /también decir que/i.test(text) ||
      /comentar que/i.test(text) ||
      /a la hora de.*es cuando/i.test(text)) {
    return 'CAT_04_ANACOLUTHON_OR_PSEUDO_CLEFT';
  }

  // CAT_05: Deísmo, rodeo pragmático o pseudo-hendida de gafa/lente
  if (/\b(?:deben? de tener|debe de ser|deben? de contar|ha de ser)\b/i.test(text) ||
      /lo que hace la lente.*es/i.test(text) ||
      /lo que hace el cristal.*es/i.test(text) ||
      /lo que hace la gafa.*es/i.test(text) ||
      /lo que hace el filtro.*es/i.test(text) ||
      /lo que consigue.*es/i.test(text) ||
      /lo que busca.*es/i.test(text) ||
      /lo que evita.*es/i.test(text) ||
      /uno de los principios.*será/i.test(text)) {
    return 'CAT_05_DEISMO_OR_PRAGMATIC_RODEO';
  }

  // CAT_06: Marcadores orales de taller y mostrador
  if (/olvídate de las marcas/i.test(text) ||
      /olvídate de/i.test(text) ||
      /como un guante/i.test(text) ||
      /pruébalas y no te arrepentirás/i.test(text) ||
      /sí que dejan/i.test(text) ||
      /a todo el mundo no le gusta/i.test(text) ||
      /adapta la moda a ti/i.test(text) ||
      /\bojo con\b/i.test(text) ||
      /ni se te ocurra/i.test(text) ||
      /no te la juegues/i.test(text) ||
      /de toda la vida/i.test(text) ||
      /mano de santo/i.test(text) ||
      /la prueba de fuego/i.test(text) ||
      /te durarán toda la vida/i.test(text)) {
    return 'CAT_06_ORAL_WORKSHOP_MARKER';
  }

  // Standard RST relations
  if (/\b(aunque|a pesar de|sin embargo|no obstante|por el contrario|en cambio|pero)\b/i.test(text)) {
    return 'CONCESSION_CONTRAST';
  }
  if (/\b(porque|debido a|por tanto|por consiguiente|por lo que|de ahí que|con lo cual)\b/i.test(text)) {
    return 'CAUSE_EFFECT';
  }
  if (/\b(si tienes|si la cara|si buscas|en caso de)\b/i.test(text)) {
    return 'CONDITION_RESULT';
  }

  return 'DESCRIPTIVE_ELABORATION';
}

// 6. FrameNet classifier based on keyword scoring
function classifyFrame(text) {
  const lower = text.toLowerCase();
  let bestFrame = 'GENERAL_STYLE';
  let maxScore = 0;

  for (const [frameKey, frameData] of Object.entries(TAXONOMY.frames)) {
    let score = 0;
    for (const kw of frameData.keywords) {
      if (lower.includes(kw)) {
        score += (kw.length >= 8 ? 2 : 1);
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestFrame = frameKey;
    }
  }

  return bestFrame;
}

// 7. Extract skeleton and slots
function abstractSkeleton(text) {
  let skeleton = text;
  const foundSlots = [];
  const assignedRanges = [];

  for (const p of SLOT_PATTERNS) {
    p.regex.lastIndex = 0;
    let match;
    while ((match = p.regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const rawMatch = match[0];

      // Check collision with already assigned ranges
      const collides = assignedRanges.some(r => (start >= r.start && start < r.end) || (end > r.start && end <= r.end));
      if (!collides) {
        assignedRanges.push({ start, end, type: p.type, raw: rawMatch });
      }
    }
  }

  // Sort ranges descending by start to replace from end to beginning
  assignedRanges.sort((a, b) => b.start - a.start);

  for (const r of assignedRanges) {
    const slotId = `[${r.type}]`;
    skeleton = skeleton.substring(0, r.start) + slotId + skeleton.substring(r.end);
    foundSlots.push({
      slot_type: r.type,
      raw_value: r.raw,
      offset: r.start
    });
  }

  return { skeleton, slots: foundSlots.reverse() };
}

// 8. Analyze centering signature
function analyzeCentering(text) {
  const trimmed = text.trim();
  const proDropRegex = /^(resulta|permiten|permite|cuenta|cuentan|presenta|presentan|ofrece|ofrecen|son|es|tienen|tiene|destaca|destacan|se caracteriza|se caracterizan|aportan|aporta)\b/i;
  const hasProDrop = proDropRegex.test(trimmed);

  return {
    has_pro_drop_subject: hasProDrop,
    promoted_entity_hint: hasProDrop ? 'IMPLICIT_SUBJECT' : 'EXPLICIT_SUBJECT'
  };
}

console.log('--- STARTING CERTIFIED SEMANTIC DONOR ENGINE COMPILATION ---');

// Ingest raw harvested paragraphs
const rawHarvestedPath = 'banco_ontologico_semantico/staging/raw_harvested_paragraphs.json';
let rawHarvested = [];
if (fs.existsSync(rawHarvestedPath)) {
  rawHarvested = JSON.parse(fs.readFileSync(rawHarvestedPath, 'utf8'));
  console.log(`Loaded ${rawHarvested.length} harvested paragraphs from HTMLs.`);
}

// Ingest newly harvested mass scraping paragraphs
const massivePath = 'banco_ontologico_semantico/staging/massive_pre2022_raw_paragraphs.json';
let massiveHarvested = [];
if (fs.existsSync(massivePath)) {
  massiveHarvested = JSON.parse(fs.readFileSync(massivePath, 'utf8'));
  console.log(`Loaded ${massiveHarvested.length} fresh pre-2022 paragraphs from mass harvest.`);
}

// Ingest master unified bank
const masterBankPath = 'banco_maestro_retorico_unificado.json';
let masterBank = { singles: [], duos: [], triads: [] };
if (fs.existsSync(masterBankPath)) {
  masterBank = JSON.parse(fs.readFileSync(masterBankPath, 'utf8'));
  console.log(`Loaded master bank: ${masterBank.triads.length} triads, ${masterBank.duos.length} duos, ${masterBank.singles.length} singles.`);
}

const allBricks = [];
const seenTexts = new Set();

function processItem(rawText, sourceDomain, originalId) {
  const decoded = decodeHtmlEntities(rawText);
  const clean = decoded.replace(/\s+/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 12 || words.length > 115) return;

  const norm = clean.toLowerCase().replace(/[^\w]/g, '');
  if (seenTexts.has(norm)) return;
  seenTexts.add(norm);

  const { tier, voice_category, exclude_from_humanization } = evaluateDomain(sourceDomain);
  const frame = classifyFrame(clean);
  const rhetorical = detectRhetoricalRelation(clean);
  const { skeleton, slots } = abstractSkeleton(clean);
  const centering = analyzeCentering(clean);

  // Compute functional token ratio
  const functionalWords = clean.toLowerCase().match(/\b(el|la|los|las|un|una|unos|unas|de|del|en|para|por|con|sin|sobre|que|aunque|pero|y|o|como|si|más|menos|es|son|fue|fueron|ha|han|se)\b/g) || [];
  const functionalRatio = parseFloat((functionalWords.length / words.length).toFixed(3));

  allBricks.push({
    brick_id: `brick_${String(allBricks.length + 1).padStart(6, '0')}`,
    original_id: originalId || null,
    source_domain: sourceDomain,
    tier,
    voice_category,
    exclude_from_humanization,
    frame,
    rhetorical_relation: rhetorical,
    raw_text: clean,
    word_count: words.length,
    syntactic_skeleton: skeleton,
    slots_count: slots.length,
    slots,
    centering_signature: centering,
    metrics: {
      functional_token_ratio: functionalRatio,
      has_human_glitch: rhetorical.startsWith('CAT_')
    }
  });
}

// Process harvested paragraphs
for (const item of rawHarvested) {
  processItem(item.text, item.source_domain, item.harvest_id);
}

// Process newly harvested mass scraping paragraphs
for (const item of massiveHarvested) {
  processItem(item.text, item.domain, item.source_url);
}

// Process master pre-2022 unified bank
const combinedMaster = [
  ...(masterBank.triads || []),
  ...(masterBank.duos || []),
  ...(masterBank.singles || [])
];

for (const item of combinedMaster) {
  const text = item.text || item.texto || '';
  if (text) {
    processItem(text, item.source_domain || 'verified_pre2022_workshop', item.id);
  }
}

console.log(`\n======================================================`);
console.log(`TOTAL SEMANTIC BRICKS GENERATED: ${allBricks.length}`);
console.log(`======================================================`);

// Stats
const frameStats = {};
const rhetoricalStats = {};
let workshopCount = 0;
let editorialCount = 0;
let excludedCount = 0;
let glitchCount = 0;

for (const b of allBricks) {
  frameStats[b.frame] = (frameStats[b.frame] || 0) + 1;
  rhetoricalStats[b.rhetorical_relation] = (rhetoricalStats[b.rhetorical_relation] || 0) + 1;
  if (b.exclude_from_humanization) excludedCount++;
  else {
    if (b.tier === 'TIER_1_WORKSHOP') workshopCount++;
    else editorialCount++;
  }
  if (b.metrics.has_human_glitch) glitchCount++;
}

console.log(`Excluded (Wikipedia / Optimoda): ${excludedCount} (${((excludedCount / allBricks.length) * 100).toFixed(1)}%)`);
console.log(`Approved Biological Donors: ${allBricks.length - excludedCount} (${(((allBricks.length - excludedCount) / allBricks.length) * 100).toFixed(1)}%)`);
console.log(`  - Tier 1 Clinical / Workshop Voice: ${workshopCount}`);
console.log(`  - Tier 2 Editorial Lifestyle Voice: ${editorialCount}`);
console.log(`Certified Human Glitches (CAT_01 to CAT_06): ${glitchCount}`);

// Save Consolidated Master Bank
const masterOutputPath = 'banco_ontologico_semantico/banco_maestro_ladrillos_retoricos.json';
fs.writeFileSync(masterOutputPath, JSON.stringify(allBricks, null, 2), 'utf8');
console.log(`\nSaved consolidated master bank to: ${masterOutputPath}`);

// Save by Frame: ONLY APPROVED DONORS (Exclude Wikipedia and Optimoda!)
if (!fs.existsSync('banco_ontologico_semantico/marcos')) {
  fs.mkdirSync('banco_ontologico_semantico/marcos', { recursive: true });
}
for (const frameKey of Object.keys(TAXONOMY.frames)) {
  const frameBricks = allBricks.filter(b => b.frame === frameKey && !b.exclude_from_humanization);
  const framePath = `banco_ontologico_semantico/marcos/${frameKey.toLowerCase()}.json`;
  fs.writeFileSync(framePath, JSON.stringify(frameBricks, null, 2), 'utf8');
  console.log(`Saved ${frameBricks.length} approved donors to marcos/${frameKey.toLowerCase()}.json`);
}

// Save Workshop Pure Pool (Tier 1 Only, No Excluded)
const workshopPure = allBricks.filter(b => b.tier === 'TIER_1_WORKSHOP' && !b.exclude_from_humanization);
fs.writeFileSync('banco_ontologico_semantico/taller_optico_puro.json', JSON.stringify(workshopPure, null, 2), 'utf8');
console.log(`Saved Pure Workshop Pool (${workshopPure.length} bricks) to banco_ontologico_semantico/taller_optico_puro.json`);

// Save Glitches & Rare Constructions Pool (Approved Only)
const glitchesPool = allBricks.filter(b => b.metrics.has_human_glitch && !b.exclude_from_humanization);
fs.writeFileSync('banco_ontologico_semantico/glitches_humanos_certificados.json', JSON.stringify(glitchesPool, null, 2), 'utf8');
console.log(`Saved Glitches Pool (${glitchesPool.length} bricks) to banco_ontologico_semantico/glitches_humanos_certificados.json`);
