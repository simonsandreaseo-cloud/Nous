const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MASTER_PATH = path.resolve('banco_ontologico_semantico/banco_maestro_ladrillos_retoricos.json');
const BACKUP_PATH = path.resolve('banco_ontologico_semantico/staging/backup_banco_maestro_pre_v3.json');
const STAGING_V3_PATH = path.resolve('banco_ontologico_semantico/staging/harvested_editorial_gaps_v3.json');
const TAXONOMY_PATH = path.resolve('banco_ontologico_semantico/TAXONOMIA_MARCOS_Y_RANURAS.json');
const MARCOS_DIR = path.resolve('banco_ontologico_semantico/marcos');

const TAXONOMY = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf8'));

function writeJsonAtomic(targetPath, data) {
  const tmpPath = `${targetPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, targetPath);
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/gi, 'Á')
    .replace(/&Eacute;/gi, 'É')
    .replace(/&Iacute;/gi, 'Í')
    .replace(/&Oacute;/gi, 'Ó')
    .replace(/&Uacute;/gi, 'Ú')
    .replace(/&Ntilde;/gi, 'Ñ')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&Uuml;/gi, 'Ü')
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
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/^[\u25b6\u25ba\u2022\u25cf\-\*>\s]+/g, '');
}

function evaluateDomain(sourceDomain) {
  const d = (sourceDomain || '').toLowerCase();

  if (d.includes('wikipedia') || d === 'es') {
    return { tier: 'TIER_4_WIKIPEDIA', voice_category: 'ENCYCLOPEDIC', exclude_from_humanization: true };
  }
  if (d.includes('optimoda')) {
    return { tier: 'TIER_3_CORPORATE_PR', voice_category: 'CORPORATE_B2B', exclude_from_humanization: true };
  }
  if (
    d.includes('barraquer') || d.includes('baviera') || d.includes('clinicabaviera') ||
    d.includes('pico') || d.includes('qvision') || d.includes('oftalvist') ||
    d.includes('visiondirect') || d.includes('fernandez-vega') || d.includes('icrcat')
  ) {
    return { tier: 'TIER_1_WORKSHOP', voice_category: 'WORKSHOP_CLINICAL', exclude_from_humanization: false };
  }
  if (
    d.includes('opticagasset') || d.includes('gasset') ||
    d.includes('opticasflorida') || d.includes('florida') ||
    d.includes('opticauniversitaria') || d.includes('opticafernandezbaca') ||
    d.includes('generaloptica') || d.includes('cottet') ||
    d.includes('afflelou') || d.includes('vipsual') ||
    d.includes('barrea') || d.includes('xn--opticabarrea') ||
    d.includes('costasol') || d.includes('optiveropticos') ||
    d.includes('villalba') || d.includes('frases_raras') ||
    d.includes('multiopticas') || d.includes('federopticos') ||
    d.includes('opticabassol') || d.includes('optica2000') ||
    d.includes('masvision') || d.includes('soloptical') ||
    d.includes('visionlab') || d.includes('opticalia') ||
    d.includes('misterspex') || d.includes('lordwilmore') ||
    d.includes('gafasvintage') || d === 'verified_pre2022_workshop'
  ) {
    return { tier: 'TIER_1_WORKSHOP', voice_category: 'WORKSHOP_CLINICAL', exclude_from_humanization: false };
  }

  return { tier: 'TIER_2_EDITORIAL', voice_category: 'EDITORIAL_LIFESTYLE', exclude_from_humanization: false };
}

const SLOT_PATTERNS = [
  {
    type: 'SLOT_BRAND',
    regex: /\b(persol|prada|ray-ban|rayban|dolce&gabbana|dolce & gabbana|tom ford|carrera|gucci|chloé|alain afflelou|afflelou|oakley|maui jim|barberini|oliver peoples?|serengeti|chanel|dior|polaroid|burberry|celine|moschino|givenchy|marc jacobs|bottega veneta|salvatore ferragamo|berluti|fendi|balenciaga|versace|loewe|saint laurent|armani|cartier|scalpers|forecast|guess|michael kors)\b/gi
  },
  {
    type: 'SLOT_MODEL',
    regex: /\b(po0714sm|po0649|pr d\d{2}[a-z]+|spr\d{2,3}[a-z]*|dq\d{3}[a-z]*|(?:ft|tf|rb|cd|gg|po)\d{4}[a-z]*|714 steve mcqueen|steve mcqueen|meflecto|victor flex|persol protector|lombard|aviator|wayfarer|clubmaster|persol 714|persol 649|emon polarized|enoha polarized|mahea polarized|round metal|new wayfarer|clubround|oliver sun)\b/gi
  },
  {
    type: 'SLOT_MATERIAL',
    regex: /\b(acetato de celulosa|acetato natural|acetato pulido|acetato de pasta|ecoacetato|acetato reciclado|acetato|cristales minerales|cristal mineral|vidrio mineral|vidrio óptico|cristal templado|policarbonato|polímeros orgánicos|polímero orgánico|resina orgánica|cr-39|cr39|trivex|fibra de algodón|flor de algodón|pasta ligera|pasta|metal fino|metálica|metálicas|metálicos|metal|titanio|aluminio|acero inoxidable|acero|madera|bambú)\b|(?<!(?:color|tono|tonos|acabado)\s+)\bbronce\b/gi
  },
  {
    type: 'SLOT_COMPONENT',
    regex: /\b(filtro solar|filtros solares|filtro ultravioleta|filtros ultravioleta|filtro polarizado|filtros polarizados|filtro de luz visible|filtros de luz visible|filtro uv|filtros uv|lámina polarizada|láminas polarizadas|lentes polarizadas|lentes de sol|lentes solares|lentes degradadas|lentes tintadas|lentes oftálmicas|lentes orgánicas|lentes minerales|lentes|lente|cristales minerales|cristal mineral|cristales tintados|cristales degradados|cristales|cristal|montura de sol|monturas de sol|montura de pasta|montura metálica|monturas metálicas|monturas|montura|armazón|armazones|varillas flexibles|varillas|patillas flexibles|patillas|doble puente|puente central|puente nasal|puente en cerradura|puente de cerradura|puente keyhole|puente|almohadillas metálicas|almohadillas|bisagras metálicas|bisagras de precisión|bisagras adicionales|bisagra lateral|bisagras|bisagra)\b/gi
  },
  {
    type: 'SLOT_FACIAL_FEATURE',
    regex: /\b(rostros? cuadrados?|rostros? redondos?|rostros? ovalados?|rostros? alargados?|rostro cuadrado|rostro redondo|rostro ovalado|rostro alargado|rostro triangular|rostro diamante|rostro corazón|caras? redondas?|caras? cuadradas?|caras? ovaladas?|caras? alargadas?|cara redonda|cara cuadrada|cara ovalada|cara alargada|cara triangular|óvalo de la cara|tabique nasal|tabique|puente de la nariz|laterales de la nariz|sienes|facciones|rasgos del rostro|rasgos faciales|mandíbula angulosa|mandíbula estrecha|mandíbula|pómulos anchos|pómulos|frente ancha|frente estrecha|frente amplia|la frente(?!\s+(?:a|al)\b))\b/gi
  },
  {
    type: 'SLOT_MEASURE',
    regex: /\b(uv\s*400|uv400|400\s*a\s*800\s*nanómetros|380\s*a\s*400\s*nanómetros|400\s*nanómetros|380\s*nanómetros|800\s*nanómetros|400\s*nm|380\s*nm|categorías\s*[0-4]\s*al\s*[0-4]|categorías\s*[0-4]\s*a\s*[0-4]|categorías\s*[0-4]\s*o\s*[0-4]|filtro\s*(?:solar\s*)?(?:de\s*)?categoría\s*[0-4]|categoría\s*[0-4]|\d{1,3}\s*%\s*(?:a\s*\d{1,3}\s*%|y\s*(?:un\s*)?\d{1,3}\s*%)?|\d{1,3}\s*%|calibre\s*\d{2}|puente\s*\d{2}|varilla\s*\d{2,3}|\d{2,3}\s*mm|\d{2,3}\s*milímetros)\b/gi
  },
  {
    type: 'SLOT_COLOR',
    regex: /\b(terra di siena|gris pizarra|verde polarizado|verde clásico|verde oliva|verde botella|marrón cálido|dorado envejecido|tonos tierra|color tierra|color arena|tono arena|tonos arena|color miel|tono miel|tonos miel|color bronce|tono bronce|tonos bronce|acabado bronce|havana|habana|carey oscuro|carey|ámbar|ocre|beige|beis|camel|tabaco|castaño|avellana|terracota|negro brillo|negro mate|negro|dorado|plateado|azul clásico|azul|verde|marrón|gris|amarillo|naranja|violeta|rosa)\b/gi
  },
  {
    type: 'SLOT_AESTHETIC_STYLE',
    regex: /\b(minimalis(?:mo|ta)s?|brutalis(?:mo|ta)s?|retro-?futuris(?:mo|ta)s?|cyberpunk|steampunk|retro|vintage|setenter[oa]s?|ochenter[oa]s?|noventer[oa]s?|sesenter[oa]s?|y2k|avant-?garde|vanguardis(?:mo|ta)s?|vanguardia|industrial|maximalis(?:mo|ta)s?|quiet luxury|futuris(?:mo|ta)s?|atemporal(?:es)?|cl[aá]sic[oa]s?|contempor[aá]ne[oa]s?|boho chic|bohemi[oa]s?|boho|hippie|artesanal(?:es)?|rocker|preppy|geek|nerd chic|años (?:50|60|70|80|90)|urbano contempor[aá]neo|elegante|elegantes|sofisticad[oa]s?|chic|audaz|audaces|extravagante|extravagantes|discret[oa]s?|sobri[oa]s?|desenfadad[oa]s?|relajad[oa]s?)\b/gi
  },
  {
    type: 'SLOT_FRAME_SHAPE',
    regex: /\b(cat-?eye|ojos? de gato|aviador|piloto|silueta pantos|pantos|panthos|gafas mariposa|mariposa|gafas redondas|montura redonda|redondas?|redondos?|redondeadas?|gafas ovaladas|montura ovalada|ovaladas?|gafas rectangulares|montura rectangular|rectangulares?|gafas cuadradas|montura cuadrada|cuadradas?|cuadrados?|gafas hexagonales|silueta hexagonal|hexagonales?|octogonales?|montura geom[eé]trica|monturas geom[eé]tricas|geom[eé]tric[oa]s?|al aire(?!\s+libre\b)|rimless|semi al aire|nylor|envolventes?|oversize|maxigafas|maxi gafas|micro-gafas|pantalla completa)\b/gi
  },
  {
    type: 'SLOT_COATING',
    regex: /\b(antirreflejantes?|antirreflejos?|antirreflejo|antirreflejante|tratamiento antirreflejo|capa antirreflejo|fotocrom[aá]tic[oa]s?|transitions|polarizad[oa]s?|polarizaci[oó]n|antirrayas?|anti-rayas?|antirrayado|hidr[oó]fob[oa]s?|ole[oó]fob[oa]s?|multicapa|antivaho|anti-vaho|espejad[oa]s?|espejo|degradad[oa]s?|filtro uv|filtro solar|filtros solares|filtro ultravioleta|l[aá]mina polarizada)\b/gi
  },
  {
    type: 'SLOT_OCCASION_OUTFIT',
    regex: /\b(prendas de lino|lino|algod[oó]n|tejidos naturales|tonos neutros|aire libre|vestidos sueltos|look casual|look informal|conducci[oó]n nocturna|conducci[oó]n|playa|pasarela|eventos formales|paseo|ciudad|uso prolongado|uso diario|d[ií]a a d[ií]a|verano|entretiempo)\b/gi
  },
  {
    type: 'SLOT_TECHNIQUE',
    regex: /\b(tratamiento antirreflejante|tratamientos antirreflejantes|tratamiento antirreflejos|tratamiento antirreflejo|tratamiento multicapa|tratamiento endurecido|tratamiento hidrofóbico|tratamiento hidrófobo|tratamiento espejado|polarización|pulido a mano|pulidas en tambores|pulido|fresado minucioso|fresado|tallado en un solo bloque|tallado|ensamblado artesanal|fabricadas a mano|tintado en masa|inyección en molde|biselado|ranurado|taladrado|soldadura|baño galvánico|montaje de lentes)\b/gi
  },
  {
    type: 'SLOT_PROPERTY',
    regex: /\b(tacto cálido|brillo natural|pureza óptica|pureza cristalina|dureza superficial|resistencia a las rayaduras|resistencia al rayado|resistencia al rallado|resistencia a los impactos|resistencia al impacto|inastillable|irrompible|agudeza visual|nitidez visual|confort visual|comodidad visual|comodidad|confort|deslumbramiento|reflejos molestos|distorsión óptica|aberración cromática|comodidad absoluta|flexibilidad lateral|ajuste anatómico|alta ligereza|ligereza|protección uv|protección ultravioleta|polarizado|polarizada|polarizados|polarizadas|antirreflejante|antirreflejantes|antirreflejo|antirreflejos)\b/gi
  }
];

function detectRhetoricalRelation(text) {
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
  if (/son gafas que son/i.test(text) ||
      /son lentes que son/i.test(text) ||
      /son modelos que son/i.test(text) ||
      /es un cristal que es/i.test(text) ||
      /por ejemplo.*por ejemplo/i.test(text) ||
      /es decir.*es decir/i.test(text)) {
    return 'CAT_02_COPULATIVE_REDUPLICATION';
  }
  if (/\.\s+(?:Y por tanto|Ya que|Sino que|Sino|Con lo que|Con lo cual|Pero también|De ahí que|Por lo que)\b/i.test(text)) {
    return 'CAT_03_ILLICIT_PUNCTUATION_BREAK';
  }
  if (/aunque son indispensables.*es ahora cuando/i.test(text) ||
      /el necesitar.*con elegir/i.test(text) ||
      /también decir que/i.test(text) ||
      /comentar que/i.test(text) ||
      /a la hora de.*es cuando/i.test(text)) {
    return 'CAT_04_ANACOLUTHON_OR_PSEUDO_CLEFT';
  }
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

function hasWholeWord(text, kw) {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-záéíóúüñ0-9])${escaped}(?=$|[^a-záéíóúüñ0-9])`, 'i').test(text);
}

function classifyFrame(text, item) {
  const lower = text.toLowerCase();
  const excludedFrames = new Set(['CLINICAL_OPHTHALMOLOGY', 'CONTACT_LENS_CARE', 'CARE_MAINTENANCE']);

  let bestFrame = 'GENERAL_STYLE';
  let maxScore = 0;

  for (const [frameKey, frameData] of Object.entries(TAXONOMY.frames)) {
    if (excludedFrames.has(frameKey)) continue;
    let score = 0;
    for (const kw of frameData.keywords) {
      if (hasWholeWord(lower, kw)) {
        score += (kw.length >= 8 ? 2 : 1);
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestFrame = frameKey;
    }
  }

  const gap = item && item.gap_category;
  if (gap === 'SHAPES_VISAGISM') {
    if (/\b(visagismo|rostro|cara|facciones|rasgos|pómulos|mandíbula|mentón|frente|estiliza|equilibra|suaviza|armoniza|favorece|proporciones)\b/i.test(lower)) {
      return 'VISAGISM_AESTHETICS';
    }
    return 'GENERAL_STYLE';
  }
  if (gap === 'BOHO_VINTAGE_HERITAGE') {
    if (/\b(boho|bohemi[oa]s?|hippie|setenter[oa]s?|años\s*(?:50|60|70)|setenta|sesenta|vintage|retro|artesanal|legado|herencia|ic[oó]nic[oa]s?|historia)\b/i.test(lower)) {
      return 'HERITAGE_ORIGIN';
    }
    return 'GENERAL_STYLE';
  }
  if (gap === 'COLORIMETRY_EARTH_TONES') {
    if (/\b(piel|cabello|pelo|ojos|rasgos|facciones|subtono|visagismo|rostro)\b/i.test(lower) && /\b(favorece|armoniza|contraste|ilumina)\b/i.test(lower)) {
      return 'VISAGISM_AESTHETICS';
    }
    if (/\b(acetato|pasta|metal|celulosa|acabado|pulido|brillo)\b/i.test(lower) && !/\b(lino|algodón|prendas|vestidos|outfit|estilismo|combinar)\b/i.test(lower)) {
      return 'MATERIAL_COMPOSITION';
    }
    return 'GENERAL_STYLE';
  }
  if (gap === 'MATERIALS_FINISHES') {
    if (/\b(bisagras?|varillas|patillas|articulaci[oó]n|flexibilidad)\b/i.test(lower) && !/\b(filtro|uv|polarizad)\b/i.test(lower)) {
      return 'MECHANICAL_FUNCTION';
    }
    if (/\b(puente\s+nasal|tabique|almohadillas|orejas|comodidad|confort|uso\s+prolongado|se\s+asientan|se\s+ajustan|presi[oó]n)\b/i.test(lower) && !/\b(acetato|bronce|dorado\s+envejecido|metal\s+fino|pasta)\b/i.test(lower)) {
      return 'ANATOMICAL_FIT';
    }
    if (/\b(filtros?\s+solares?|filtro\s+uv|uv\s*400|polarizad[oa]s?|rayos?\s+(?:uv|solares)|radiaci[oó]n|deslumbramiento|reflejos)\b/i.test(lower) && !/\b(acetato|bronce|dorado|bisagras)\b/i.test(lower)) {
      return 'OPTICAL_PROTECTION';
    }
    return 'MATERIAL_COMPOSITION';
  }

  return bestFrame;
}

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

      const collides = assignedRanges.some(r => (start >= r.start && start < r.end) || (end > r.start && end <= r.end));
      if (!collides) {
        assignedRanges.push({ start, end, type: p.type, raw: rawMatch });
      }
    }
  }

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

function analyzeCentering(text) {
  const trimmed = text.trim();
  const proDropRegex = /^(resulta|permiten|permite|cuenta|cuentan|presenta|presentan|ofrece|ofrecen|son|es|tienen|tiene|destaca|destacan|se caracteriza|se caracterizan|aportan|aporta)\b/i;
  const hasProDrop = proDropRegex.test(trimmed);

  return {
    has_pro_drop_subject: hasProDrop,
    promoted_entity_hint: hasProDrop ? 'IMPLICIT_SUBJECT' : 'EXPLICIT_SUBJECT'
  };
}

function splitSentencesSafe(text) {
  const masked = text
    .replace(/\bp\.\s*ej\./gi, 'p_ej_')
    .replace(/\b(etc|ej|aprox|núm|cap|pág|art|fig|ud|uds|ref|sr|sra|dr|dra|mm|cm)\./gi, '$1_DOT_');
  return masked
    .split(/(?<=[.!?])\s+/)
    .map(s => s.replace(/p_ej_/g, 'p. ej.').replace(/_DOT_/g, '.').trim())
    .filter(Boolean);
}

function run() {
  console.log('--- INTEGRACIÓN ADITIVA V3 AL BANCO ONTOLÓGICO SEMÁNTICO ---');

  if (!fs.existsSync(MASTER_PATH)) {
    console.error(`No existe el banco maestro en: ${MASTER_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(STAGING_V3_PATH)) {
    console.error(`No existe el staging V3 en: ${STAGING_V3_PATH}`);
    process.exit(1);
  }

  // 1. Safe backup pre-v3 (preserve existing pre-V3 bank intact)
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(MASTER_PATH, BACKUP_PATH);
    console.log(`Copia de seguridad pre-V3 creada en: ${BACKUP_PATH}`);
  } else {
    console.log(`Copia de seguridad pre-V3 preservada en: ${BACKUP_PATH}`);
  }

  const master = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  const beforeCount = master.length;
  console.log(`Ladrillos base cargados intactos: ${beforeCount} (${master[0]?.brick_id}..${master[master.length - 1]?.brick_id})`);

  // 2. Build strict deduplication sets from existing master bank + golden bricks (WITHOUT modifying existing bricks)
  const seenNormAscii = new Set();
  const seenNormEs = new Set();
  const seenSentNorms = new Set();

  const registerNorm = (txt) => {
    const normAscii = (txt || '').toLowerCase().replace(/[^\w]/g, '');
    if (normAscii) seenNormAscii.add(normAscii);
    const normEs = (txt || '').toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
    if (normEs) seenNormEs.add(normEs);
    for (const s of splitSentencesSafe(txt || '')) {
      const sn = s.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
      if (sn.length >= 26) seenSentNorms.add(sn);
    }
  };

  for (const b of master) {
    registerNorm(b.raw_text);
  }

  if (fs.existsSync(MARCOS_DIR)) {
    for (const f of fs.readdirSync(MARCOS_DIR)) {
      if (f.startsWith('golden_') && f.endsWith('.json')) {
        const gData = JSON.parse(fs.readFileSync(path.join(MARCOS_DIR, f), 'utf8'));
        for (const g of gData) registerNorm(g.raw_text || g.text);
      }
    }
  }

  let maxIdNum = 0;
  for (const b of master) {
    const m = (b.brick_id || '').match(/^brick_(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxIdNum) maxIdNum = n;
    }
  }

  const stagingItems = JSON.parse(fs.readFileSync(STAGING_V3_PATH, 'utf8'));
  console.log(`Candidatos en staging V3: ${stagingItems.length}`);

  const newBricks = [];
  let skippedDupes = 0;
  let skippedDate = 0;
  let skippedBounds = 0;
  let skippedSlotBroken = 0;
  const addedByFrame = {};
  const addedByTheme = {};
  const addedByDomain = {};

  for (const item of stagingItems) {
    if (!item.publish_date || item.publish_date >= '2022-01-01' || item.publish_date < '2004-01-01') {
      skippedDate++;
      continue;
    }

    const clean = decodeHtmlEntities(item.text || '').replace(/\s+/g, ' ').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const sents = splitSentencesSafe(clean);
    if (words.length < 38 || words.length > 115 || sents.length < 2 || sents.length > 4) {
      skippedBounds++;
      continue;
    }

    const normAscii = clean.toLowerCase().replace(/[^\w]/g, '');
    const normEs = clean.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
    if (!normAscii || seenNormAscii.has(normAscii) || !normEs || seenNormEs.has(normEs)) {
      skippedDupes++;
      continue;
    }

    const hasSentOverlap = sents.some(s => {
      const sn = s.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
      return sn.length >= 26 && seenSentNorms.has(sn);
    });
    if (hasSentOverlap) {
      skippedDupes++;
      continue;
    }

    const { skeleton, slots } = abstractSkeleton(clean);
    if (/\[SLOT_[A-Z_]+\][a-záéíóúüñ]|[a-záéíóúüñ]\[SLOT_[A-Z_]+\]/i.test(skeleton)) {
      skippedSlotBroken++;
      continue;
    }

    registerNorm(clean);

    const { tier, voice_category, exclude_from_humanization } = evaluateDomain(item.domain);
    const frame = classifyFrame(clean, item);
    const rhetorical = detectRhetoricalRelation(clean);
    const centering = analyzeCentering(clean);

    const functionalWords = clean.toLowerCase().match(/\b(el|la|los|las|un|una|unos|unas|de|del|en|para|por|con|sin|sobre|que|aunque|pero|y|o|como|si|más|menos|es|son|fue|fueron|ha|han|se)\b/g) || [];
    const functionalRatio = parseFloat((functionalWords.length / words.length).toFixed(3));

    maxIdNum++;
    const newBrick = {
      brick_id: `brick_${String(maxIdNum).padStart(6, '0')}`,
      original_id: item.source_url || null,
      source_domain: item.domain,
      publish_date: item.publish_date,
      tier,
      voice_category,
      exclude_from_humanization,
      vertical: item.vertical || null,
      gap_category: item.gap_category || null,
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
    };

    newBricks.push(newBrick);
    addedByFrame[frame] = (addedByFrame[frame] || 0) + 1;
    const tKey = item.gap_category || frame;
    addedByTheme[tKey] = (addedByTheme[tKey] || 0) + 1;
    addedByDomain[item.domain] = (addedByDomain[item.domain] || 0) + 1;
  }

  // Strictly additive merge: existing bricks at indices 0..beforeCount-1 remain 100% untouched
  const mergedBank = [...master, ...newBricks];
  writeJsonAtomic(MASTER_PATH, mergedBank);

  const firstNewId = newBricks[0]?.brick_id || 'NONE';
  const lastNewId = newBricks[newBricks.length - 1]?.brick_id || 'NONE';

  console.log(`\nBanco maestro actualizado atómicamente: ${beforeCount} -> ${mergedBank.length} (+${newBricks.length} nuevos ladrillos: ${firstNewId}..${lastNewId}).`);
  console.log(`Descartados -> duplicados: ${skippedDupes}, fecha inválida: ${skippedDate}, longitud/oraciones: ${skippedBounds}, slot partido: ${skippedSlotBroken}`);
  console.log('Nuevos ladrillos por marco:', addedByFrame);
  console.log('Nuevos ladrillos por tema V3:', addedByTheme);
  console.log('Nuevos ladrillos por dominio:', addedByDomain);

  // 3. Update marcos/*.json WITHOUT touching golden_*.json
  const framesToUpdate = [...Object.keys(TAXONOMY.frames)];
  if (mergedBank.some(b => b.frame === 'TRANSITION_CURATION')) {
    framesToUpdate.push('TRANSITION_CURATION');
  }
  for (const frameKey of framesToUpdate) {
    const frameBricks = mergedBank.filter(b => b.frame === frameKey && !b.exclude_from_humanization);
    const framePath = path.join(MARCOS_DIR, `${frameKey.toLowerCase()}.json`);
    writeJsonAtomic(framePath, frameBricks);
    console.log(`Actualizado marcos/${frameKey.toLowerCase()}.json: ${frameBricks.length} donantes aprobados.`);
  }

  // Update pure workshop pool & glitches pool atomically
  const workshopPure = mergedBank.filter(b => b.tier === 'TIER_1_WORKSHOP' && !b.exclude_from_humanization);
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/taller_optico_puro.json'), workshopPure);

  const glitchesPool = mergedBank.filter(b => b.metrics?.has_human_glitch && !b.exclude_from_humanization);
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/glitches_humanos_certificados.json'), glitchesPool);

  // 4. Execute verify_and_index_banco.cjs
  console.log('\nEjecutando scripts/verify_and_index_banco.cjs...');
  const verifyOut = execFileSync(process.execPath, [path.resolve('scripts/verify_and_index_banco.cjs')], { encoding: 'utf8' });
  console.log(verifyOut);
}

run();
