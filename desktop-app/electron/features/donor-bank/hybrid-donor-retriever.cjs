const fs = require('fs');
const path = require('path');

const { BANK_DIR } = require('../../shared/app-paths.cjs');
const VECTOR_BIN_PATH = path.join(BANK_DIR, 'indice_vectores_semanticos.bin');
const VECTOR_META_PATH = path.join(BANK_DIR, 'indice_vectores_semanticos.meta.json');

const VECTOR_DIM = 128;

const BROAD_MACRO_TOPIC_TAGS = new Set([
  'monturas_sol_general',
  'estilismo_armario',
  'ergonomia_facial',
  'diseno_autor_firma',
  'geometria_silueta',
  'colorimetria_lentes',
  'optica_editorial'
]);

const STOPWORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre',
  'hacia', 'hasta', 'mediante', 'para', 'por', 'segun', 'sin', 'sobre', 'tras',
  'y', 'e', 'ni', 'o', 'u', 'pero', 'mas', 'sino', 'aunque', 'como', 'cuando',
  'donde', 'mientras', 'porque', 'pues', 'que', 'si', 'ya', 'este', 'esta',
  'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos',
  'aquellas', 'esto', 'eso', 'aquello', 'mi', 'mis', 'tu', 'tus', 'su', 'sus',
  'nuestro', 'nuestra', 'nuestros', 'nuestras', 'me', 'te', 'se', 'nos', 'os',
  'le', 'les', 'muy', 'mas', 'menos', 'tan', 'tanto', 'tanta', 'tantos', 'tantas',
  'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras', 'mismo',
  'misma', 'mismos', 'mismas', 'cada', 'cualquier', 'algun', 'alguna', 'algunos',
  'algunas', 'ningun', 'ninguna', 'poco', 'poca', 'pocos', 'pocas', 'mucho',
  'mucha', 'muchos', 'muchas', 'ser', 'es', 'son', 'era', 'eran', 'fue', 'fueron',
  'sea', 'sean', 'estar', 'esta', 'estan', 'haber', 'hay', 'ha', 'han', 'tener',
  'tiene', 'tienen', 'hacer', 'hace', 'hacen', 'poder', 'puede', 'pueden', 'ir'
]);

// 36 Dense Concept Axes (dims 0..35) with rich semantic synonyms & co-occurrence patterns
const LATENT_CONCEPT_AXES = [
  { id: 'warm_earth_carey', weight: 1.35, rx: /\b(?:carey|havana|habana|tierra|marr[oó]n(?:es)?|[aá]mbar|ocre|miel|terracota|beige|beis|camel|tabaco|casta[nñ]o|avellana|c[aá]lid[oa]s?)\b/g },
  { id: 'sober_dark_neutral', weight: 1.25, rx: /\b(?:negro|negras|oscuro|oscuras|gris|pizarra|mate|sobri[oa]s?|neutr[oa]s?|discret[oa]s?|atemporal(?:es)?|sin\s+saturar)\b/g },
  { id: 'vivid_color_tint', weight: 1.15, rx: /\b(?:colorid[oa]s?|llamativ[oa]s?|azul(?:es)?|verde(?:s)?|rojo|rosa|amarill[oa]|naranja|violeta|tintad[oa]s?|degradad[oa]s?)\b/g },
  { id: 'acetate_cellulose_pasta', weight: 1.35, rx: /\b(?:acetato|celulosa|pasta|ecoacetato|algod[oó]n|l[aá]minas|pulid[oa]|tacto\s+c[aá]lido|grosor)\b/g },
  { id: 'metal_gold_bronze_titanium', weight: 1.35, rx: /\b(?:metal|met[aá]lic[oa]s?|titanio|acero|bronce|dorad[oa]s?|oro|platead[oa]s?|aluminio|filigrana|aro\s+fino)\b/g },
  { id: 'round_pantos_circular', weight: 1.4, rx: /\b(?:redond[oa]s?|redondead[oa]s?|circular(?:es)?|pantos|panthos|curv[oa]s?|suaves)\b/g },
  { id: 'square_rectangular_geometric', weight: 1.4, rx: /\b(?:cuadrad[oa]s?|rectangul(?:ar|ares)|geom[eé]tric[oa]s?|hexagonal(?:es)?|octogonal(?:es)?|angul(?:os|ar|ares|osas?)|l[ií]neas\s+rectas)\b/g },
  { id: 'aviator_pilot_teardrop', weight: 1.4, rx: /\b(?:aviador|piloto|l[aá]grima|gota|doble\s+puente)\b/g },
  { id: 'cateye_butterfly_feminine', weight: 1.4, rx: /\b(?:cat\s*eye|ojos?\s+de\s+gato|gatun[oa]s?|mariposa|ascendente|femenin[oa]s?)\b/g },
  { id: 'oversize_shield_wrap', weight: 1.25, rx: /\b(?:oversize|maxi\s*gafas|maxigafas|grandes|envolventes?|pantalla)\b/g },
  { id: 'boho_hippie_free', weight: 1.4, rx: /\b(?:boho|bohemi[oa]s?|hippie|esp[ií]ritu\s+libre|festival|artesanal(?:es)?|relajad[oa]s?|desenfadad[oa]s?|natural(?:es)?)\b/g },
  { id: 'vintage_retro_70s_heritage', weight: 1.35, rx: /\b(?:vintage|retro|setenter[oa]s?|a[nñ]os\s*(?:50|60|70|80)|d[eé]cadas?|historia|legado|origen|cl[aá]sic[oa]s?|ic[oó]nic[oa]s?|nostalgia)\b/g },
  { id: 'minimalist_urban_contemporary', weight: 1.25, rx: /\b(?:minimalis(?:mo|ta)s?|urbano|ciudad|contempor[aá]ne[oa]s?|modern[oa]s?| vanguardia|arquitect[oó]nic[oa]|sencill[oa]s?|limpi[oa]s?)\b/g },
  { id: 'luxury_runway_elegance', weight: 1.2, rx: /\b(?:elegancia|elegantes?|sofisticad[oa]s?|pasarela|firma|alta\s+costura|lujo|exclusiv[oa]s?|glamour|distinci[oó]n)\b/g },
  { id: 'visagism_face_harmony', weight: 1.4, rx: /\b(?:visagismo|rostro|cara|facciones|fisonom[ií]a|rasgos|proporci[oó]n|equilibra|suaviza|armoniza|favorece|estiliza|sienta\s+bien)\b/g },
  { id: 'face_round_oval', weight: 1.3, rx: /\b(?:rostros?\s+(?:redond[oa]s?|ovalad[oa]s?)|caras?\s+(?:redond[oa]s?|ovalad[oa]s?)|mejillas|alargar\s+visualmente)\b/g },
  { id: 'face_square_angular_long', weight: 1.3, rx: /\b(?:rostros?\s+(?:cuadrad[oa]s?|alargad[oa]s?|angulos[oa]s?|triangulares?)|caras?\s+(?:cuadrad[oa]s?|alargad[oa]s?)|mand[ií]bula|p[oó]mulos|frente\s+ancha|ment[oó]n)\b/g },
  { id: 'skin_hair_colorimetry', weight: 1.25, rx: /\b(?:piel(?:es)?|tez|cabello|pelo|rubi[oa]s?|moren[oa]s?|casta[nñ][oa]s?|ojos|ilumina|contraste\s+crom[aá]tico|tono\s+de\s+piel)\b/g },
  { id: 'anatomical_fit_comfort', weight: 1.35, rx: /\b(?:comodidad|c[oó]mod[oa]s?|confort|ligereza|liger[oa]s?|ergonom[ií]a|ajust[ae]n?|asientan|opriman|presi[oó]n|marcas|peso|uso\s+prolongado)\b/g },
  { id: 'bridge_pads_temples', weight: 1.3, rx: /\b(?:puente\s+nasal|tabique|nariz|almohadillas|plaquetas|varillas|patillas|sienes|orejas|sujeci[oó]n|cerradura|keyhole)\b/g },
  { id: 'mechanical_hinges_craft', weight: 1.3, rx: /\b(?:bisagras?|articulaci[oó]n|flexibilidad|flexible|plegable|meflecto|tornillos?|ensamblado|fresado|tallado|hech[oa]s?\s+a\s+mano|resistencia|durabilidad)\b/g },
  { id: 'uv_solar_protection', weight: 1.35, rx: /\b(?:protecci[oó]n|uv\s*400|uv|ultravioleta|radiaci[oó]n|rayos?\s+solares|filtro\s+solar|salud\s+ocular|categor[ií]a\s*[0-4]|sol)\b/g },
  { id: 'polarized_glare_optics', weight: 1.35, rx: /\b(?:polarizad[oa]s?|antirreflejant\w*|fotocrom[aá]tic[oa]s?|reflejos|deslumbramiento|nitidez|contraste|visi[oó]n|cristal\s+mineral|policarbonato)\b/g },
  { id: 'linen_cotton_natural_fabrics', weight: 1.35, rx: /\b(?:lino|algod[oó]n|tejidos?\s+naturales|encaje|cuero|denim|vaqueros|punto|fibras)\b/g },
  { id: 'outfit_wardrobe_matching', weight: 1.3, rx: /\b(?:combina[ns]?|combinar|look|outfit|estilismo|armario|prendas?|vestidos?|camisa|traje|conjunto|accesorio|complemento|ropa)\b/g },
  { id: 'summer_beach_outdoor', weight: 1.2, rx: /\b(?:verano|estival|playa|mar|terraza|vacaciones|d[ií]as?\s+soleados?|aire\s+libre|paseo|pasear|primavera)\b/g },
  { id: 'autumn_winter_midseason', weight: 1.15, rx: /\b(?:oto[nñ]o|invierno|entretiempo|todo\s+el\s+a[nñ]o|cualquier\s+[eé]poca|temporada)\b/g },
  { id: 'driving_sport_active', weight: 1.2, rx: /\b(?:conducir|conducci[oó]n|volante|carretera|asfalto|deportiv[oa]s?|ciclismo|running|monta[nñ]a|esqu[ií])\b/g },
  { id: 'care_cleaning_case', weight: 1.25, rx: /\b(?:limpi[ae]r|limpieza|estuche|funda|microfibra|gamuza|agua\s+y\s+jab[oó]n|rayaduras?|mantenimiento|guardar)\b/g },
  { id: 'prescription_optical_graduated', weight: 1.2, rx: /\b(?:graduad[oa]s?|progresiv[oa]s?|monofocal|luz\s+azul|optometrista|[oó]ptica)\b/g },
  { id: 'bold_statement_personality', weight: 1.2, rx: /\b(?:personalidad|car[aá]cter|atrevid[oa]s?|audaz|original(?:es)?|protagonismo|diferenciador|rompedor|fuerza)\b/g },
  { id: 'subtle_harmony_balance', weight: 1.25, rx: /\b(?:sutil(?:es)?|delicad[oa]s?|armon[ií]a|arm[oó]nic[oa]|equilibrio|equilibrad[oa]|suave|naturalidad|discreci[oó]n)\b/g },
  { id: 'product_model_showcase', weight: 1.3, rx: /\b(?:modelo|dise[nñ]o|colecci[oó]n|pieza|propuesta|apuesta|firma|presenta)\b|\[SLOT_(?:BRAND|MODEL)\]/gi },
  { id: 'curation_selection_intro', weight: 1.25, rx: /\b(?:opciones|alternativas|claves|seleccion|favorit[oa]s?|destacan|apunta|normas\s+b[aá]sicas)\b/g },
  { id: 'daily_versatility_utility', weight: 1.2, rx: /\b(?:vers[aá]til(?:es)?|versatilidad|diario|d[ií]a\s+a\s+d[ií]a|funcional(?:es)?|pr[aá]ctic[oa]s?|cualquier\s+ocasi[oó]n|imprescindible)\b/g },
  { id: 'trend_fashion_evolution', weight: 1.2, rx: /\b(?:tendencia|tendencias|moda|resurgen|reinventa|evoluci[oó]n|triunfa[ns]?|boga|actualidad)\b/g }
];

const COMPOUND_BIGRAM_RULES = [
  { token: 'bi_tonos_tierra', rx: /\btonos?\s+tierra\b/i },
  { token: 'bi_doble_puente', rx: /\bdoble\s+puente\b/i },
  { token: 'bi_rostro_redondo', rx: /\b(?:rostro|cara)s?\s+redond[oa]s?\b/i },
  { token: 'bi_rostro_cuadrado', rx: /\b(?:rostro|cara)s?\s+cuadrad[oa]s?\b/i },
  { token: 'bi_rostro_ovalado', rx: /\b(?:rostro|cara)s?\s+ovalad[oa]s?\b/i },
  { token: 'bi_rostro_alargado', rx: /\b(?:rostro|cara)s?\s+alargad[oa]s?\b/i },
  { token: 'bi_ojo_gato', rx: /\b(?:ojos?\s+de\s+gato|cat\s*eye)\b/i },
  { token: 'bi_acetato_celulosa', rx: /\bacetato\s+de\s+celulosa\b/i },
  { token: 'bi_aire_libre', rx: /\baire\s+libre\b/i },
  { token: 'bi_boho_chic', rx: /\b(?:boho\s*chic|estilo\s+bohemio|hippie\s+moderno)\b/i },
  { token: 'bi_anos_70', rx: /\b(?:a[nñ]os\s+70|d[eé]cada\s+de\s+los\s+70|inspiraci[oó]n\s+setentera)\b/i },
  { token: 'bi_filtro_uv', rx: /\b(?:filtro\s+(?:solar|uv)|uv\s*400|rayos\s+ultravioleta)\b/i },
  { token: 'bi_lentes_polarizadas', rx: /\b(?:lentes|cristales)\s+polarizad[oa]s?\b/i },
  { token: 'bi_montura_metal', rx: /\b(?:monturas?|gafas)\s+(?:de\s+metal|met[aá]licas?)\b/i },
  { token: 'bi_montura_acetato', rx: /\b(?:monturas?|gafas)\s+de\s+(?:acetato|pasta)\b/i },
  { token: 'bi_puente_nasal', rx: /\b(?:puente\s+nasal|tabique\s+nasal|plaquetas\s+nasales)\b/i }
];

const INTENT_LIST = [
  'STYLE_DEFINITION',
  'OPTICAL_TECHNICAL',
  'MATERIAL_CRAFT',
  'HERITAGE_STORY',
  'OUTFIT_COMBINATION',
  'CURATION_TRANSITION',
  'CARE_GUIDE',
  'VISAGISM_ADVICE',
  'PRODUCT_PRESENTATION'
];

function stripAccents(str) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function stemSpanishToken(tok) {
  let s = tok;
  if (s.length >= 7) {
    s = s.replace(/(?:aciones|amiento|imiento|adoras?|edores?|mente|idades?|ismos?|istas?)$/, '');
  }
  if (s.length >= 5) {
    s = s.replace(/(?:adas?|ados?|idas?|idos?|ales?|ares?|eras?|eros?|osas?|osos?|icas?|icos?|as|os|es|ar|er|ir|an|en)$/, '');
  }
  return s.slice(0, 7);
}

// Fast deterministic FNV-1a 32-bit hash for signed random projection into dims 64..127
function fnv1aHash(str, seed = 2166136261) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function extractBM25Features(text) {
  const clean = stripAccents(String(text || '').toLowerCase().replace(/\[slot_[a-z_]+\]/gi, ' '));
  const rawTokens = clean.split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !STOPWORDS_ES.has(t));
  const tfMap = new Map();
  let docLen = 0;

  for (const tok of rawTokens) {
    docLen++;
    tfMap.set(tok, (tfMap.get(tok) || 0) + 1);
    if (tok.length >= 5) {
      const stem = `st_${stemSpanishToken(tok)}`;
      tfMap.set(stem, (tfMap.get(stem) || 0) + 0.65);
    }
  }

  for (const bg of COMPOUND_BIGRAM_RULES) {
    if (bg.rx.test(text)) {
      tfMap.set(bg.token, (tfMap.get(bg.token) || 0) + 2.2);
      docLen += 2;
    }
  }

  return { tfMap, docLen: Math.max(1, docLen) };
}

function dot128(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

class EnterpriseSemanticRetriever {
  constructor() {
    this.isIndexed = false;
    this.docCount = 0;
    this.avgDocLen = 45;
    this.bm25Idf = new Map();
    this.docFeatures = new Map();
    this.vectorMatrix = null;
    this.brickIdToVecIdx = new Map();
    this.byTopicTag = new Map();
    this.byIntent = new Map();
    this.byPersona = new Map();
    this.byPolarity = new Map();
    this._sentVecCache = new Map();
  }

  inferTopicTags(text) {
    const tags = [];
    const lower = String(text || '').toLowerCase();
    if (/\b(?:carey|havana|habana|tierra|marr[oó]n|[aá]mbar|ocre|miel|terracota|beige|camel)\b/.test(lower)) tags.push('carey_tierra');
    if (/\b(?:boho|bohemi[oa]s?|hippie|setenter[oa]s?|vintage|retro|a[nñ]os\s*(?:60|70))\b/.test(lower)) tags.push('boho_vintage_70s');
    if (/\b(?:redond[oa]s?|redondead[oa]s?|circular(?:es)?|pantos)\b/.test(lower)) tags.push('redondas');
    if (/\b(?:cuadrad[oa]s?|rectangul(?:ar|ares)|geom[eé]tric[oa]s?|hexagonal|angul)\b/.test(lower)) tags.push('cuadradas_geom');
    if (/\b(?:aviador|piloto|l[aá]grima|doble\s+puente)\b/.test(lower)) tags.push('aviador');
    if (/\b(?:cat-?eye|ojos?\s+de\s+gato|gatun[oa]s?|mariposa)\b/.test(lower)) tags.push('cat_eye_mariposa');
    if (/\b(?:oversize|maxi\s*gafas|maxigafas|envolventes?)\b/.test(lower)) tags.push('oversize');
    if (/\b(?:acetato|pasta|celulosa|ecoacetato)\b/.test(lower)) tags.push('acetato_pasta');
    if (/\b(?:metal|met[aá]lic[oa]s?|titanio|acero|bronce|dorad[oa]|oro)\b/.test(lower)) tags.push('metal_titanio');
    if (/\b(?:visagismo|rostro|cara|facciones|rasgos|p[oó]mulos|mand[ií]bula|frente|ovalad)\b/.test(lower)) tags.push('visagismo_rostro');
    if (/\b(?:protecci[oó]n\s*(?:uv|solar)|uv\s*400|rayos?\s*(?:uv|solares)|radiaci[oó]n)\b/.test(lower)) tags.push('proteccion_uv');
    if (/\b(?:polarizad[oa]s?|fotocrom[aá]tic[oa]s?|antirreflejant\w*|degradad[oa]s?|espejad[oa]s?|cristal\s+mineral)\b/.test(lower)) tags.push('lentes_cristales');
    if (/\b(?:artesanal(?:es)?|pulid[oa]|fresad[oa]|bisagras?|hech[oa]s?\s+a\s+mano|taller)\b/.test(lower)) tags.push('artesania_taller');
    if (/\b(?:limpi[ae]r|limpieza|estuche|funda|microfibra|gamuza|jab[oó]n)\b/.test(lower)) tags.push('cuidado_mantenimiento');
    if (/\b(?:deportiv[oa]s?|ciclismo|running|senderismo|esqu[ií]|conducci[oó]n|conducir|aire\s+libre)\b/.test(lower)) tags.push('deporte_exterior');
    if (/\b(?:tendencia|moda|estilo|look|outfit|pasarela|vers[aá]til|atemporal|elegancia)\b/.test(lower)) tags.push('tendencias_moda');
    if (/\b(?:comodidad|confort|ligereza|liger[oa]s?|ergonom[ií]a|ajuste|puente\s+nasal|almohadillas|plaquetas)\b/.test(lower)) tags.push('confort_ajuste');
    if (/\b(?:graduad[oa]s?|progresiv[oa]s?|monofocal|luz\s+azul|miop[ií]a|astigmatismo|presbicia)\b/.test(lower)) tags.push('graduadas_optica');
    if (/\bfotocrom[aá]tic/i.test(lower)) tags.push('fotocromaticas');
    if (/\b(?:polarizad|deslumbramiento|reflejos?\s+horizontales|parabrisas)\b/i.test(lower)) tags.push('polarizadas_conduccion');
    if (/\b(?:progresiv|ocupacional|corredor\s+intermedio|distancia\s+intermedia|presbicia|dos\s+monitores)\b/i.test(lower)) tags.push('progresivas_ocupacionales');
    if (/\b(?:cristal(?:es)?\s+mineral|policarbonato|meflecto|plegable)\b/i.test(lower)) tags.push('cristal_mineral_meflecto');
    if (/\b(?:fresad|inyectad|alma\s+met[aá]lica|planchas?\s+de\s+acetato|tambores?\s+de\s+madera)\b/i.test(lower)) tags.push('acetato_fresado_taller');
    return [...new Set(tags)];
  }

  inferDiscourseIntent(text, frame = 'GENERAL_STYLE') {
    const clean = String(text || '').trim();
    const lower = clean.toLowerCase();
    if ((clean.length <= 240 && /:\s*$/.test(clean)) || frame === 'TRANSITION_CURATION') return 'CURATION_TRANSITION';
    if (frame === 'CARE_MAINTENANCE' || /\b(?:limpi[ae]r|limpieza|estuche|funda|microfibra|jab[oó]n\s+neutro)\b/i.test(lower)) return 'CARE_GUIDE';
    if (frame === 'OPTICAL_PROTECTION' || frame === 'LENS_PROPERTIES' || /\b(?:uv\s*400|rayos?\s+uv|radiaci[oó]n\s+solar|polarizad[oa]s?|fotocrom[aá]tic[oa]s?|antirreflejant\w*|deslumbramiento)\b/i.test(lower)) return 'OPTICAL_TECHNICAL';
    if (frame === 'VISAGISM_AESTHETICS' || (/\b(?:rostro|cara|facciones|mand[ií]bula|p[oó]mulos|frente|ment[oó]n|visagismo)\b/i.test(lower) && /\b(?:favorece|equilibra|suaviza|alarga|estiliza|sienta|armoniza|proporci[oó]n)\b/i.test(lower))) return 'VISAGISM_ADVICE';
    if (frame === 'HERITAGE_ORIGIN' || /\b(?:historia|d[eé]cadas?|a[nñ]os\s+(?:50|60|70|80|90)|origen|nacieron|cl[aá]sico\s+atemporal|ic[oó]nic[oa]s?|legado|retro|vintage)\b/i.test(lower)) return 'HERITAGE_STORY';
    if (frame === 'MATERIAL_COMPOSITION' || frame === 'MECHANICAL_FUNCTION' || frame === 'ANATOMICAL_FIT' || /\b(?:acetato\s+de\s+celulosa|titanio|acero\s+inoxidable|bisagras?|pulido\s+a\s+mano|almohadillas|puente\s+nasal|ergonom[ií]a|ligereza)\b/i.test(lower)) return 'MATERIAL_CRAFT';
    if (/\b(?:combina[ns]?|combinar|look|outfit|estilismo|prendas?|lino|algod[oó]n|vaqueros|vestidos?|traje|camisa|ciudad|playa)\b/i.test(lower)) return 'OUTFIT_COMBINATION';
    if (/\b(?:este\s+modelo|esta\s+montura|el\s+modelo|la\s+firma|colecci[oó]n|[A-Z]{2,3}\d{3,4})\b/.test(clean)) return 'PRODUCT_PRESENTATION';
    return 'STYLE_DEFINITION';
  }

  inferNarrativePersona(text) {
    const lower = String(text || '').toLowerCase();
    const tuMatches = (lower.match(/\b(?:tu|tus|te|ti|tienes|buscas|prefieres|eliges|puedes|llevas|luces|quieres|necesitas|apuestas|dec[aá]ntate|elige|f[ií]jate|olv[ií]date)\b/g) || []).length;
    const nosMatches = (lower.match(/\b(?:nos|nuestro|nuestra|nuestros|nuestras|podemos|sabemos|tenemos|elegimos|llevamos|buscamos|queremos|solemos|vemos)\b/g) || []).length;
    if (tuMatches > nosMatches && tuMatches >= 1) return 'SECOND_PERSON_TU';
    if (nosMatches > tuMatches && nosMatches >= 1) return 'FIRST_PLURAL_NOSOTROS';
    return 'IMPERSONAL_THIRD';
  }

  inferPolarity(text) {
    const lower = String(text || '').toLowerCase();
    if (/\b(?:evitar|evita|evitaremos|huir\s+de|descartar|no\s+favorecen|no\s+conviene|no\s+son\s+recomendables|error\s+com[uú]n)\b/i.test(lower)) return 'NEGATIVE_WARNING';
    if (/\b(?:mientras\s+que|en\s+cambio|por\s+el\s+contrario|a\s+diferencia\s+de|frente\s+a|sin\s+embargo|aunque)\b/i.test(lower)) return 'CONTRAST_COMPARISON';
    if (/\b(?:ideal(?:es)?|perfect[oa]s?|favorece[ns]?|excelente|imprescindible|acierto|mejor\s+opci[oó]n|recomendable|destaca[ns]?|triunfa[ns]?)\b/i.test(lower)) return 'POSITIVE_RECOMMENDATION';
    return 'NEUTRAL_INFORMATIVE';
  }

  computeDenseVector(surfaceText, meta = {}, tfMap = null) {
    const vec = new Float32Array(VECTOR_DIM);
    const lower = String(surfaceText || '').toLowerCase();

    // Dims 0..35: 36 Latent Concept Axes
    for (let i = 0; i < LATENT_CONCEPT_AXES.length && i < 36; i++) {
      const axis = LATENT_CONCEPT_AXES[i];
      axis.rx.lastIndex = 0;
      const matches = lower.match(axis.rx);
      if (matches && matches.length > 0) {
        vec[i] = Math.min(3.2, (1 + Math.log(1 + matches.length)) * axis.weight);
      }
    }

    // Dims 36..44: 9 Discourse Intent axes (with soft neighborhood coupling)
    const intent = meta.discourse_intent || this.inferDiscourseIntent(surfaceText, meta.frame);
    const intentIdx = INTENT_LIST.indexOf(intent);
    if (intentIdx !== -1) {
      vec[36 + intentIdx] = 1.6;
    }

    // Dims 45..47: Narrative Persona
    const persona = meta.narrative_persona || this.inferNarrativePersona(surfaceText);
    if (persona === 'IMPERSONAL_THIRD') vec[45] = 0.9;
    else if (persona === 'SECOND_PERSON_TU') vec[46] = 0.9;
    else if (persona === 'FIRST_PLURAL_NOSOTROS') vec[47] = 0.9;

    // Dims 48..51: Argumentative Polarity
    const polarity = meta.polarity || this.inferPolarity(surfaceText);
    if (polarity === 'POSITIVE_RECOMMENDATION') vec[48] = 0.85;
    else if (polarity === 'NEUTRAL_INFORMATIVE') vec[49] = 0.85;
    else if (polarity === 'CONTRAST_COMPARISON') vec[50] = 0.85;
    else if (polarity === 'NEGATIVE_WARNING') vec[51] = 1.1;

    // Dims 52..63: Topic tag activations (12 composite buckets — solo tags de dominio específicos)
    const rawTags = Array.isArray(meta.topic_tags) ? meta.topic_tags : this.inferTopicTags(surfaceText);
    const tags = rawTags.filter(tg => !BROAD_MACRO_TOPIC_TAGS.has(tg));
    for (const tg of tags) {
      const bucket = 52 + (fnv1aHash(tg, 1337) % 12);
      vec[bucket] += 0.95;
    }

    // Dims 64..127: 64-D Signed Distributional Random Projection over IDF-weighted stems & bigrams
    const features = tfMap || extractBM25Features(surfaceText).tfMap;
    for (const [term, tf] of features.entries()) {
      const idf = this.bm25Idf.get(term) || 1.8;
      const w = Math.min(4.5, (1 + Math.log(1 + tf)) * idf * 0.45);
      const h1 = fnv1aHash(term, 2166136261);
      const h2 = fnv1aHash(term, 1469598103);
      const d1 = 64 + (h1 % 64);
      const d2 = 64 + ((h2 >>> 6) % 64);
      const sign1 = (h1 & 64) ? 1 : -1;
      const sign2 = (h2 & 128) ? 1 : -1;
      vec[d1] += sign1 * w;
      vec[d2] += sign2 * w * 0.7;
    }

    // L2 Normalization for exact cosine similarity via dot product
    let normSq = 0;
    for (let i = 0; i < VECTOR_DIM; i++) normSq += vec[i] * vec[i];
    const norm = Math.sqrt(normSq) || 1;
    for (let i = 0; i < VECTOR_DIM; i++) vec[i] /= norm;

    return vec;
  }

  buildIndex(allBricks, expandSlotsFn) {
    const t0 = Date.now();
    this.docCount = allBricks.length;
    this.bm25Idf.clear();
    this.docFeatures.clear();
    this.brickIdToVecIdx.clear();
    this.byTopicTag.clear();
    this.byIntent.clear();
    this.byPersona.clear();
    this.byPolarity.clear();
    this._sentVecCache.clear();

    const dfMap = new Map();
    let totalLen = 0;
    const surfaces = new Array(allBricks.length);

    for (let idx = 0; idx < allBricks.length; idx++) {
      const b = allBricks[idx];
      const bId = b.brick_id || b.golden_id || b.donor_id || `doc_${idx}`;
      const surface = expandSlotsFn
        ? expandSlotsFn(b.raw_text || b.text || '', b.slots)
        : (b.raw_text || b.text || '');
      surfaces[idx] = { b, bId, surface };

      const inferredTags = this.inferTopicTags(surface);
      const specificTags = [...new Set([
        ...(Array.isArray(b.topic_tags) ? b.topic_tags : []),
        ...inferredTags
      ])].filter(tg => !BROAD_MACRO_TOPIC_TAGS.has(tg));
      if (!Array.isArray(b.topic_tags) || !b.topic_tags.length) b.topic_tags = specificTags;
      if (!b.discourse_intent) b.discourse_intent = this.inferDiscourseIntent(surface, b.frame);
      if (!b.narrative_persona) b.narrative_persona = this.inferNarrativePersona(surface);
      if (!b.polarity) b.polarity = this.inferPolarity(surface);

      for (const tg of specificTags) {
        if (!this.byTopicTag.has(tg)) this.byTopicTag.set(tg, new Set());
        this.byTopicTag.get(tg).add(bId);
      }
      if (!this.byIntent.has(b.discourse_intent)) this.byIntent.set(b.discourse_intent, new Set());
      this.byIntent.get(b.discourse_intent).add(bId);

      if (!this.byPersona.has(b.narrative_persona)) this.byPersona.set(b.narrative_persona, new Set());
      this.byPersona.get(b.narrative_persona).add(bId);

      if (!this.byPolarity.has(b.polarity)) this.byPolarity.set(b.polarity, new Set());
      this.byPolarity.get(b.polarity).add(bId);

      const { tfMap, docLen } = extractBM25Features(surface);
      totalLen += docLen;
      this.docFeatures.set(bId, { tfMap, docLen });

      for (const term of tfMap.keys()) {
        dfMap.set(term, (dfMap.get(term) || 0) + 1);
      }
    }

    this.avgDocLen = Math.max(15, totalLen / Math.max(1, allBricks.length));
    const N = Math.max(1, allBricks.length);
    for (const [term, df] of dfMap.entries()) {
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      this.bm25Idf.set(term, idf);
    }

    // Build or load packed Float32Array dense semantic vector matrix
    this.vectorMatrix = new Float32Array(allBricks.length * VECTOR_DIM);
    for (let idx = 0; idx < surfaces.length; idx++) {
      const { b, bId, surface } = surfaces[idx];
      const feat = this.docFeatures.get(bId);
      const vec = this.computeDenseVector(surface, b, feat?.tfMap);
      this.vectorMatrix.set(vec, idx * VECTOR_DIM);
      this.brickIdToVecIdx.set(bId, idx);
    }

    // Persist binary vector cache atomically for external tools & diagnostics
    try {
      const tmpBin = `${VECTOR_BIN_PATH}.${process.pid}.tmp`;
      fs.writeFileSync(tmpBin, Buffer.from(this.vectorMatrix.buffer));
      fs.renameSync(tmpBin, VECTOR_BIN_PATH);
      const tmpMeta = `${VECTOR_META_PATH}.${process.pid}.tmp`;
      fs.writeFileSync(tmpMeta, JSON.stringify({
        version: '2.0-enterprise-hybrid',
        updatedAt: new Date().toISOString(),
        docCount: this.docCount,
        vectorDim: VECTOR_DIM,
        avgDocLen: Number(this.avgDocLen.toFixed(2)),
        vocabSize: this.bm25Idf.size,
        topicTagBuckets: Object.fromEntries([...this.byTopicTag.entries()].map(([k, v]) => [k, v.size])),
        intentBuckets: Object.fromEntries([...this.byIntent.entries()].map(([k, v]) => [k, v.size]))
      }, null, 2), 'utf8');
      fs.renameSync(tmpMeta, VECTOR_META_PATH);
    } catch {}

    this.isIndexed = true;
    const elapsed = Date.now() - t0;
    console.log(`[EnterpriseSemanticRetriever] Índice Híbrido BM25 + Proyección Léxica (${this.docCount}x${VECTOR_DIM} Float32, ${(this.vectorMatrix.byteLength / 1024 / 1024).toFixed(2)} MB) construido en ${elapsed}ms.`);
  }

  _computeSentenceVectors(text, frame = 'GENERAL_STYLE', narrative_persona = null, polarity = null, useCache = false) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return [];
    const cacheKey = useCache && cleanText.length <= 900 ? `${frame}|${cleanText}` : null;
    if (cacheKey && this._sentVecCache.has(cacheKey)) {
      return this._sentVecCache.get(cacheKey);
    }

    const sents = cleanText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.split(/\s+/).filter(Boolean).length >= 4);

    const vecs = sents.map(s => {
      const sf = extractBM25Features(s);
      return this.computeDenseVector(s, {
        frame,
        topic_tags: this.inferTopicTags(s),
        discourse_intent: this.inferDiscourseIntent(s, frame),
        narrative_persona,
        polarity
      }, sf.tfMap);
    });

    if (cacheKey) {
      if (this._sentVecCache.size >= 12000) this._sentVecCache.clear();
      this._sentVecCache.set(cacheKey, vecs);
    }
    return vecs;
  }

  analyzeQuery(queryText, frame = 'GENERAL_STYLE', atoms = {}) {
    const rawText = String(queryText || '').trim();
    const rawFeat = extractBM25Features(rawText);
    const rawTopicTags = this.inferTopicTags(rawText);
    const discourse_intent = this.inferDiscourseIntent(rawText, frame);
    const narrative_persona = this.inferNarrativePersona(rawText);
    const polarity = this.inferPolarity(rawText);

    // Pre-decomposition dual embeddings: whole raw paragraph + individual raw sentences
    const rawParaVec = this.computeDenseVector(rawText, {
      frame,
      topic_tags: rawTopicTags,
      discourse_intent,
      narrative_persona,
      polarity
    }, rawFeat.tfMap);
    const rawSentenceVecs = this._computeSentenceVectors(rawText, frame, narrative_persona, polarity, false);

    // Post-decomposition enriched query vector (raw text + Davidsonian extracted atoms)
    const augmented = [
      rawText,
      ...(atoms?.shapes || []),
      ...(atoms?.materials || []),
      ...(atoms?.styles || []),
      ...(atoms?.outfits || []),
      ...(atoms?.coatings || []),
      ...(atoms?.key_concepts || [])
    ].join(' ');
    const { tfMap, docLen } = extractBM25Features(augmented);
    const topic_tags = this.inferTopicTags(augmented);
    const queryVec = this.computeDenseVector(augmented, {
      frame,
      topic_tags,
      discourse_intent,
      narrative_persona,
      polarity
    }, tfMap);

    return {
      tfMap,
      docLen,
      topic_tags,
      discourse_intent,
      narrative_persona,
      polarity,
      queryVec,
      rawParaVec,
      rawSentenceVecs
    };
  }

  scoreCandidateHybrid(queryProfile, brick, windowSurfaceText = null) {
    const bId = brick.brick_id || brick.golden_id || brick.donor_id;
    const k1 = 1.5;
    const bParam = 0.72;
    const surfaceText = windowSurfaceText || brick.raw_text || '';

    // 1. Okapi BM25 over unmasked window surface (or pre-indexed brick features)
    const docFeat = windowSurfaceText
      ? extractBM25Features(windowSurfaceText)
      : (this.docFeatures.get(bId) || extractBM25Features(brick.raw_text || ''));

    let bm25Raw = 0;
    const matchedTerms = [];
    const normFactor = k1 * (1 - bParam + bParam * (docFeat.docLen / Math.max(15, this.avgDocLen)));

    for (const [qTerm, qWeight] of queryProfile.tfMap.entries()) {
      const f = docFeat.tfMap.get(qTerm) || 0;
      if (f <= 0) continue;
      const idf = this.bm25Idf.get(qTerm) || 2.0;
      const termScore = idf * ((f * (k1 + 1)) / (f + normFactor)) * Math.min(1.8, 0.7 + qWeight * 0.3);
      bm25Raw += termScore;
      if (!qTerm.startsWith('st_')) {
        matchedTerms.push(qTerm.replace(/^bi_/, ''));
      }
    }

    // 2. Dual Pre-Decomposition + Post-Decomposition 128-D Vector Cosine Similarity
    const rawBTags = Array.isArray(brick.topic_tags) ? brick.topic_tags : this.inferTopicTags(surfaceText);
    const bTags = rawBTags.filter(tg => !BROAD_MACRO_TOPIC_TAGS.has(tg));
    const bIntent = brick.discourse_intent || this.inferDiscourseIntent(surfaceText, brick.frame);
    const bPersona = brick.narrative_persona || this.inferNarrativePersona(surfaceText);
    const bPolarity = brick.polarity || this.inferPolarity(surfaceText);

    const vecIdx = this.brickIdToVecIdx.get(bId);
    const candVec = (vecIdx !== undefined && this.vectorMatrix && !windowSurfaceText)
      ? this.vectorMatrix.subarray(vecIdx * VECTOR_DIM, (vecIdx + 1) * VECTOR_DIM)
      : this.computeDenseVector(surfaceText, { ...brick, topic_tags: bTags, discourse_intent: bIntent, narrative_persona: bPersona, polarity: bPolarity }, docFeat.tfMap);

    const denseCosine = Math.max(0, dot128(queryProfile.queryVec, candVec));
    const rawParaCosine = queryProfile.rawParaVec
      ? Math.max(0, dot128(queryProfile.rawParaVec, candVec))
      : denseCosine;

    let sentenceAlignmentCosine = rawParaCosine;
    const qSentVecs = queryProfile.rawSentenceVecs;
    if (Array.isArray(qSentVecs) && qSentVecs.length > 0) {
      const candSentVecs = this._computeSentenceVectors(surfaceText, brick.frame || 'GENERAL_STYLE', bPersona, bPolarity, true);
      const targetSentVecs = candSentVecs.length >= 2 ? candSentVecs : [candVec];
      let alignSum = 0;
      for (const qsv of qSentVecs) {
        let bestSim = 0;
        for (const csv of targetSentVecs) {
          const sim = dot128(qsv, csv);
          if (sim > bestSim) bestSim = sim;
        }
        alignSum += bestSim;
      }
      sentenceAlignmentCosine = alignSum / qSentVecs.length;
    }

    const blendedCosine = denseCosine * 0.45 + rawParaCosine * 0.30 + sentenceAlignmentCosine * 0.25;

    // 3. Ontological 4D Alignment (topic_tags + discourse_intent + narrative_persona + polarity)
    let tagOverlap = 0;
    if (queryProfile.topic_tags.length > 0 && bTags.length > 0) {
      const bTagSet = new Set(bTags);
      let hits = 0;
      for (const qt of queryProfile.topic_tags) {
        if (bTagSet.has(qt)) hits++;
      }
      tagOverlap = hits / Math.max(1, Math.min(4, queryProfile.topic_tags.length));
    }

    let intentBonus = 0;
    if (bIntent === queryProfile.discourse_intent) {
      intentBonus = 14;
    } else if (
      (queryProfile.discourse_intent === 'OUTFIT_COMBINATION' && bIntent === 'STYLE_DEFINITION') ||
      (queryProfile.discourse_intent === 'STYLE_DEFINITION' && bIntent === 'OUTFIT_COMBINATION') ||
      (queryProfile.discourse_intent === 'VISAGISM_ADVICE' && bIntent === 'STYLE_DEFINITION') ||
      (queryProfile.discourse_intent === 'MATERIAL_CRAFT' && bIntent === 'OPTICAL_TECHNICAL')
    ) {
      intentBonus = 6;
    }

    const personaBonus = bPersona === queryProfile.narrative_persona ? 5 : (bPersona === 'IMPERSONAL_THIRD' ? 2.5 : 0);
    const polarityBonus = bPolarity === queryProfile.polarity ? 4 : (bPolarity === 'NEGATIVE_WARNING' && queryProfile.polarity !== 'NEGATIVE_WARNING' ? -25 : 0);

    const bm25Scaled = Math.min(58, bm25Raw * 1.65);
    const vectorScaled = Math.min(50, blendedCosine * 56);
    const ontologyScaled = Math.min(22, tagOverlap * 18) + intentBonus + personaBonus + polarityBonus;

    const totalHybrid = Number((bm25Scaled + vectorScaled + ontologyScaled).toFixed(2));
    return {
      bm25Score: Number(bm25Raw.toFixed(2)),
      denseCosine: Number(blendedCosine.toFixed(4)),
      rawParaCosine: Number(rawParaCosine.toFixed(4)),
      sentenceAlignmentCosine: Number(sentenceAlignmentCosine.toFixed(4)),
      tagOverlap: Number(tagOverlap.toFixed(2)),
      intentMatch: bIntent === queryProfile.discourse_intent,
      discourseIntent: bIntent,
      narrativePersona: bPersona,
      polarity: bPolarity,
      topicTags: bTags,
      totalHybrid,
      matchedTerms: [...new Set(matchedTerms)].slice(0, 8)
    };
  }
}

module.exports = new EnterpriseSemanticRetriever();
