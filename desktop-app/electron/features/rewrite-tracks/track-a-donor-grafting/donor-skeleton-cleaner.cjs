'use strict';

const discourseTopology = require('../../text-analysis/discourse-topology-analyzer.cjs');
const { FUNCTIONAL_WORDS_ES, FRAME_SHAPE_ONTOLOGY } = require('../../text-analysis/lexical-constants.cjs');
const { tokenize, isShapeCompatible, cleanScrapingArtifacts } = require('../../text-analysis/draft-preprocessor.cjs');

function adjustAgreement(word, precedingText) {
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

function isCompetingBrand(candidateLower, sourceTextLower, sourceTokens) {
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

function isClinicalOrEncyclopedicDomain(brick, sourceTextLower = '') {
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

function expandSlotsForSemanticEval(text, slots = []) {
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

function computeFunctionalTokenRatio(text) {
  const words = tokenize(text || '');
  if (!words.length) return 0;
  let funcCount = 0;
  for (const w of words) {
    if (FUNCTIONAL_WORDS_ES.has(w)) funcCount++;
  }
  return Number((funcCount / words.length).toFixed(3));
}

function getBrickProfile(brick) {
  if (!brick) {
    return { functionalRatio: 0.35, hasProDrop: false, cfRoles: ['FRAME_ENTITY'], cpRole: 'FRAME_ENTITY' };
  }
  if (brick._profile) return brick._profile;

  const raw = (brick.raw_text || brick.text || '').trim();
  const functionalRatio = brick.metrics?.functional_token_ratio || computeFunctionalTokenRatio(raw);
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

function sanitizeDonorSkeleton(skeleton, rawText = '', contextFrame = 'GENERAL_STYLE', atoms = null, rawPara = '') {
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

function extractCleanDonorWindow(brick, targetWords = 60, contextFrame = 'GENERAL_STYLE', atoms = null, winOptions = {}) {
  if (!brick) return null;
  const paragraphMode = winOptions.paragraphMode !== undefined ? winOptions.paragraphMode : targetWords >= 38;
  const minWords = winOptions.minWords || (paragraphMode ? 18 : 10);
  const maxWords = winOptions.maxWords || (paragraphMode ? 96 : 34);

  const baseText = (brick.slots && brick.slots.length && brick.syntactic_skeleton)
    ? brick.syntactic_skeleton
    : (brick.raw_text || brick.text || '');
  const cleaned = sanitizeDonorSkeleton(
    cleanScrapingArtifacts(baseText),
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
    if (!isShapeCompatible(sent, atoms?.shapes)) continue;
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
    if (isCompetingBrand(noSlots.toLowerCase(), allowedJoined, [...allowedEntityTokens])) continue;
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

function applySpanishSlotAgreement(slotType, value, precedingText, localAtoms = null) {
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
    return adjustAgreement(value, precedingText);
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

module.exports = {
  adjustAgreement,
  isCompetingBrand,
  isClinicalOrEncyclopedicDomain,
  expandSlotsForSemanticEval,
  computeFunctionalTokenRatio,
  getBrickProfile,
  sanitizeDonorSkeleton,
  extractCleanDonorWindow,
  applySpanishSlotAgreement
};
