const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  decodeHtmlEntities,
  detectPublishDate,
  STAGING_DIR
} = require('./harvest_core.cjs');

const EVIDENCE_DIR = path.resolve('raw_web_evidence');
const MASTER_PATH = path.resolve('banco_ontologico_semantico/banco_maestro_ladrillos_retoricos.json');
const MARCOS_DIR = path.resolve('banco_ontologico_semantico/marcos');
const TAXONOMY_PATH = path.resolve('banco_ontologico_semantico/TAXONOMIA_MARCOS_Y_RANURAS.json');

if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });

const TAXONOMY = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf8'));

const CLINICAL_SURGERY_DOMAINS = new Set([
  'barraquer.com',
  'clinicabaviera.com',
  'clinica-baviera.com',
  'fernandez-vega.com',
  'icrcat.com',
  'oftalvist.es',
  'qvision.es',
  'imo.es',
  'es.wikipedia.org',
  'wikipedia.org'
]);

const EYEWEAR_ANCHOR_RX = /\b(?:gafas?(?:\s+de\s+sol)?|monturas?|lentes?(?:\s+de\s+sol|\s+solares|\s+progresiv[oa]s|\s+polarizad[oa]s|\s+graduad[oa]s)?|cristales(?:\s+solares|\s+minerales|\s+polarizados)?|armaz[oó]n(?:es)?|varillas?|patillas?|puente\s+nasal|visagismo|[oó]ptica(?:s)?|solares?|carey|acetato|aviador|cat-?eye|ojo\s+de\s+gato|wayfarer|clubmaster|pantos|uv\s*400|polarizad[oa]s?|fotocrom[aá]tic[oa]s?|antirreflejant\w*)\b/i;

const CLINICAL_HEAVY_RX = /\b(?:cirug[ií]a\s+refractiva|lasik|prk|lente\s+intraocular|cataratas?|glaucoma|desprendimiento\s+de\s+retina|degeneraci[oó]n\s+macular|trasplante\s+de\s+c[oó]rnea|quir[oó]fano|postoperatorio|anestesia\s+t[oó]pica|colirio\s+antib[ií][oó]tico|blefaroplastia|estrabismo\s+infantil|ambliop[ií]a|tumor\s+ocular|queratocono|uve[ií]tis|retinopat[ií]a\s+diab[eé]tica|pedir\s+cita\s+m[eé]dica|pide\s+tu\s+cita\s+en\s+cl[ií]nica)\b/i;

const BOILERPLATE_NOISE_RX = /(?:cookies|pol[ií]tica\s+de\s+privacidad|aviso\s+legal|t[eé]rminos\s+y\s+condiciones|protecci[oó]n\s+de\s+datos|todos\s+los\s+derechos\s+reservados|suscr[ií]bete\s+a\s+nuestra\s+newsletter|bolet[ií]n\s+informativo|a[nñ]adir\s+al\s+carrito|ver\s+cesta|finalizar\s+compra|gastos\s+de\s+env[ií]o|env[ií]o\s+gratuito\s+a\s+partir|c[oó]digo\s+promocional|cup[oó]n\s+descuento|tarifa\s+plana|devoluciones?\s+gratuitas?|atenci[oó]n\s+al\s+cliente|tel[eé]fono\s+de\s+contacto|horario\s+de\s+apertura|lunes\s+a\s+viernes|s[aá]bados?\s+de\s+\d|c\.?\s*p\.?\s*\d{5}|comparte\s+este\s+art[ií]culo|compartir\s+en\s+facebook|s[ií]guenos\s+en\s+(?:instagram|facebook|twitter)|quiz[aá]s?\s+tambi[eé]n\s+te\s+interese|art[ií]culos\s+relacionados|d[eé]janos\s+tu\s+comentario|los\s+campos\s+obligatorios\s+est[aá]n\s+marcados|internet\s+archive|wayback\s+machine|getty\s+images|cord[oó]n\s+press|imaxtree)/i;

const COMMERCE_JUNK_RX = /[€$£]|(?:\b(?:p\.?v\.?p\.?|iva\s+incluido|desde\s+\d+\s*(?:euros?|€)|solo\s+por\s+\d+|compra\s+online\s+ahora|haz\s+cli[ck]+|pincha\s+aqu[ií]|ver\s+cat[aá]logo\s+completo|en\s+nuestra\s+tienda\s+online)\b)/i;

const FINITE_VERB_RX = /(?:\b(?:es|son|est[aá]n?|era[ns]?|fue(?:ron)?|ser[aáeé]n?|sea[ns]?|hay|han?|hemos|tienen?|pueden?|podemos|suelen?|hace[ns]?|hacemos|da[ns]?|va[ns]?|van|encajan?|destacan?|aportan?|ofrecen?|permiten?|favorecen?|quedan?|sientan?|resultan?|combinan?|protegen?|resguardan?|buscan?|desean?|crean?|logran?|llevan?|llevamos|lucen?|marcan?|definen?|evocan?|recuerdan?|convierte[ns]?|adaptan?|ajustan?|equilibran?|estilizan?|acompañan?|irrumpi[oó]|irrumpieron|dieron|siguen?|har[aá]n?|gustan?|caracterizan?|distinguen?|sobresalen?|resaltan?|realzan?|sabemos|tenemos|elegimos|debemos|conseguimos|queremos|ayudan?|evitan?|reducen?|mejoran?|garantizan?|resisten?|permanecen?|proponen?|presentan?|inspiran?|reflejan?|otorgan?|elevan?|visten?|mantienen?|cambian?|evolucionan?|aportamos|encontramos|existen|funciona[ns]?|requiere[ns]?|recomienda[ns]?|necesita[ns]?|consiste[ns]?|permite|brinda[ns]?|absorbe[ns]?|filtra[ns]?|bloquea[ns]?)\b|\b[a-záéíóúñ]{3,}(?:amos|emos|imos|aron|ieron|aban|ában|ían|arán|erán|irán|aría[ns]?)\b)/i;

const SLOT_PATTERNS = [
  {
    type: 'SLOT_BRAND',
    regex: /\b(persol|prada|ray-ban|rayban|dolce&gabbana|dolce & gabbana|tom ford|carrera|gucci|chloé|alain afflelou|afflelou|oakley|maui jim|barberini|oliver peoples?|serengeti|chanel|dior|polaroid|burberry|celine|moschino|givenchy|marc jacobs|bottega veneta|salvatore ferragamo|berluti|fendi|balenciaga|versace|loewe|saint laurent|armani|cartier|scalpers|forecast|guess|michael kors|hawkers|etnia barcelona|moscot|garrett leight|kaleos|tiwi|miller\s*&\s*marc|pj\.?\s*lobster)\b/gi
  },
  {
    type: 'SLOT_MODEL',
    regex: /\b(po0714sm|po0649|pr d\d{2}[a-z]+|spr\d{2,3}[a-z]*|dq\d{3}[a-z]*|(?:ft|tf|rb|cd|gg|po)\d{4}[a-z]*|714 steve mcqueen|steve mcqueen|meflecto|victor flex|persol protector|lombard|aviator|wayfarer|clubmaster|persol 714|persol 649|round metal|new wayfarer|clubround|erika|justin)\b/gi
  },
  {
    type: 'SLOT_MATERIAL',
    regex: /\b(acetato de celulosa|acetato natural|acetato pulido|acetato de pasta|ecoacetato|acetato reciclado|acetato|cristales minerales|cristal mineral|vidrio mineral|vidrio óptico|cristal templado|policarbonato|polímeros orgánicos|polímero orgánico|resina orgánica|cr-39|cr39|trivex|fibra de algodón|flor de algodón|pasta ligera|pasta|metal fino|metálica|metálicas|metálicos|metal|titanio|aluminio|acero inoxidable|acero|madera|bambú|tr90|grilamid)\b|(?<!(?:color|tono|tonos|acabado|medalla)\s+)\bbronce\b/gi
  },
  {
    type: 'SLOT_COMPONENT',
    regex: /\b(filtro solar|filtros solares|filtro ultravioleta|filtros ultravioleta|filtro polarizado|filtros polarizados|filtro de luz visible|filtros de luz visible|filtro uv|filtros uv|lámina polarizada|láminas polarizadas|lentes polarizadas|lentes de sol|lentes solares|lentes degradadas|lentes tintadas|lentes oftálmicas|lentes orgánicas|lentes minerales|lentes progresivas|lentes|lente|cristales minerales|cristal mineral|cristales tintados|cristales degradados|cristales|cristal|montura de sol|monturas de sol|montura de pasta|montura metálica|monturas metálicas|monturas|montura|armazón|armazones|varillas flexibles|varillas|patillas flexibles|patillas|doble puente|puente central|puente nasal|puente en cerradura|puente de cerradura|puente keyhole|puente|almohadillas metálicas|almohadillas|plaquetas|bisagras metálicas|bisagras de precisión|bisagras adicionales|bisagra lateral|bisagras|bisagra)\b/gi
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
    regex: /\b(antirreflejantes?|antirreflejos?|antirreflejo|tratamiento antirreflejo|capa antirreflejo|fotocrom[aá]tic[oa]s?|transitions|polarizad[oa]s?|polarizaci[oó]n|antirrayas?|anti-rayas?|antirrayado|hidr[oó]fob[oa]s?|ole[oó]fob[oa]s?|multicapa|antivaho|anti-vaho|espejad[oa]s?|espejo|degradad[oa]s?|filtro uv|filtro solar|filtros solares|filtro ultravioleta|l[aá]mina polarizada|filtro de luz azul)\b/gi
  },
  {
    type: 'SLOT_OCCASION_OUTFIT',
    regex: /\b(prendas de lino|lino|algod[oó]n|tejidos naturales|tonos neutros|aire libre|vestidos sueltos|look casual|look informal|conducci[oó]n nocturna|conducci[oó]n|playa|pasarela|eventos formales|paseo|ciudad|uso prolongado|uso diario|d[ií]a a d[ií]a|verano|entretiempo|ciclismo|running|deportes?\s+acu[aá]ticos?|alta\s+monta[nñ]a|nieve|conducir)\b/gi
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function writeJsonAtomic(targetPath, data) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, targetPath);
}

function writeTextAtomic(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, targetPath);
}

function decodeAllEntities(str) {
  if (!str) return '';
  let out = decodeHtmlEntities(str)
    .replace(/&euro;/gi, '€')
    .replace(/&pound;/gi, '£')
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : '';
    });
  return out
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrlKey(rawUrl) {
  return (rawUrl || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/:80\//, '/')
    .split('#')[0]
    .split('?')[0]
    .replace(/\/+$/, '');
}

function normalizeAsciiKey(str) {
  return String(str || '').toLowerCase().replace(/[^\w]/g, '');
}

function normalizeEsKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
}

function isBadBlogUrl(url, mode = 'optical_blog') {
  if (!url) return true;
  const u = url.toLowerCase();
  if (/^https?:\/\/[^/]+\/?(\?.*)?$/.test(u)) return true;
  if (/\/(feed|rss|tag|tags|author|autor|wp-json|wp-content|wp-admin|carrito|cart|checkout|login|account|mi-cuenta|aviso-legal|politica-de-privacidad|politica-de-cookies)\b/i.test(u)) return true;
  if (/\/(producto|product|productos|products|tienda|shop)\//i.test(u) && !/\/blogs?\//i.test(u)) return true;
  if (/\/(ca|en|de|fr|it|pt|ru|nl|pl)\//i.test(u)) return true;
  if (/(202[2-9]|20[3-9]\d)/i.test(u)) return true;
  if (/\?(replytocom|share|amp|utm_|lang|s=|p=|sort|filter)=/i.test(u) || /[?&]amp\b|\/amp\/?$/i.test(u)) return true;
  if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|css|js|xml|ico|woff2?|mp4|mp3)(\?.*)?$/i.test(u)) return true;
  if (mode === 'fashion_magazine') {
    return !/(gafas|monturas?|lentes|sol|visagismo|optica|carey|acetato|aviador|cat-?eye|wayfarer|accesorios|complementos)/i.test(u);
  }
  return false;
}

function saveEvidenceSafe(domain, sourceUrl, publishDate, dateMethod, rawHtml, metaExtra = {}) {
  const cleanDomain = String(domain || 'unknown').toLowerCase().replace(/^www\./, '');
  const sha = crypto.createHash('sha256').update(rawHtml, 'utf8').digest('hex');
  const shortSha = sha.slice(0, 16);
  const baseName = `${cleanDomain.replace(/[^a-z0-9]/gi, '_')}_${shortSha}`;
  const htmlPath = path.join(EVIDENCE_DIR, `${baseName}.html`);
  const metaPath = path.join(EVIDENCE_DIR, `${baseName}.meta.json`);

  if (!fs.existsSync(htmlPath)) {
    writeTextAtomic(htmlPath, rawHtml);
  }
  if (!fs.existsSync(metaPath)) {
    const payload = {
      source_url: sourceUrl,
      source_domain: cleanDomain,
      publish_date: publishDate,
      date_verification_method: dateMethod,
      sha256_html: sha,
      scraped_at: new Date().toISOString(),
      ...metaExtra
    };
    writeJsonAtomic(metaPath, payload);
  }
  return { baseName, htmlPath, metaPath, sha256: sha };
}

function verifyStrictPre2022Date(html, sourceUrl, fallbackTs = null) {
  const explicitPostChecks = [
    /property=["']article:published_time["'][^>]*content=["'](\d{4}-\d{2}-\d{2})/i,
    /content=["'](\d{4}-\d{2}-\d{2})[^"']*["'][^>]*property=["']article:published_time["']/i,
    /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i,
    /"dateCreated"\s*:\s*"(\d{4}-\d{2}-\d{2})/i,
    /name=["']pubdate["'][^>]*content=["'](\d{4}-\d{2}-\d{2})/i
  ];
  for (const rx of explicitPostChecks) {
    const m = (html || '').match(rx);
    if (m && m[1]) {
      if (m[1] >= '2022-01-01') return null;
      if (m[1] >= '2004-01-01') return { date: m[1], method: 'meta_tag' };
    }
  }

  const detected = detectPublishDate(html || '', sourceUrl || '');
  if (detected && detected.date) {
    if (detected.date >= '2022-01-01' || detected.date < '2004-01-01') return null;
    return { date: detected.date, method: detected.method };
  }

  const timeTag = (html || '').match(/<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2})/i);
  if (timeTag && timeTag[1]) {
    if (timeTag[1] >= '2022-01-01' || timeTag[1] < '2004-01-01') return null;
    return { date: timeTag[1], method: 'html_time_tag' };
  }

  if (fallbackTs && /^\d{8}/.test(fallbackTs) && fallbackTs <= '20211231235959') {
    const wbDate = `${fallbackTs.slice(0, 4)}-${fallbackTs.slice(4, 6)}-${fallbackTs.slice(6, 8)}`;
    if (wbDate >= '2004-01-01' && wbDate < '2022-01-01') {
      return { date: wbDate, method: 'wayback_machine_timestamp' };
    }
  }
  return null;
}

function stripTagsFast(html, tags) {
  let current = html;
  for (const tag of tags) {
    const chunks = [];
    let pos = 0;
    const low = current.toLowerCase();
    const open = '<' + tag;
    const close = '</' + tag;
    while (pos < current.length) {
      const i = low.indexOf(open, pos);
      if (i === -1) {
        chunks.push(current.slice(pos));
        break;
      }
      const nc = low[i + open.length];
      if (nc && nc !== '>' && nc !== ' ' && nc !== '\n' && nc !== '\r' && nc !== '\t') {
        chunks.push(current.slice(pos, i + open.length));
        pos = i + open.length;
        continue;
      }
      chunks.push(current.slice(pos, i), ' ');
      const j = low.indexOf(close, i + open.length);
      if (j === -1) break;
      const gt = low.indexOf('>', j + close.length);
      pos = gt === -1 ? j + close.length : gt + 1;
    }
    current = chunks.join('');
  }
  return current;
}

function stripHtmlCommentsFast(html) {
  const chunks = [];
  let pos = 0;
  while (pos < html.length) {
    const i = html.indexOf('<!--', pos);
    if (i === -1) {
      chunks.push(html.slice(pos));
      break;
    }
    chunks.push(html.slice(pos, i), ' ');
    const j = html.indexOf('-->', i + 4);
    if (j === -1) break;
    pos = j + 3;
  }
  return chunks.join('');
}

function extractPBlocksFast(html) {
  const out = [];
  const low = html.toLowerCase();
  let pos = 0;
  while (pos < html.length) {
    const start = low.indexOf('<p', pos);
    if (start === -1) break;
    const nc = low[start + 2];
    if (nc && nc !== '>' && nc !== ' ' && nc !== '\n' && nc !== '\r' && nc !== '\t') {
      pos = start + 2;
      continue;
    }
    const openEnd = html.indexOf('>', start + 2);
    if (openEnd === -1) break;
    const closeStart = low.indexOf('</p>', openEnd + 1);
    if (closeStart === -1) break;
    if (closeStart - openEnd < 16000) {
      out.push(html.slice(openEnd + 1, closeStart));
    }
    pos = closeStart + 4;
  }
  return out;
}

function splitSentencesSafe(text) {
  const masked = String(text || '')
    .replace(/\bp\.\s*ej\./gi, 'p_ej_')
    .replace(/\bc\.\s*p\.\s*v\./gi, 'cpv_DOT_')
    .replace(/\bp\.\s*v\.\s*p\./gi, 'pvp_DOT_')
    .replace(/\b(etc|ej|aprox|núm|cap|pág|art|fig|ud|uds|ref|sr|sra|mr|mrs|ms|dr|dra|st|mm|cm)\./gi, '$1_DOT_');
  return masked
    .split(/(?<=[.!?])\s+/)
    .map(s => s
      .replace(/p_ej_/g, 'p. ej.')
      .replace(/cpv_DOT_/g, 'c.p.v.')
      .replace(/pvp_DOT_/g, 'p.v.p.')
      .replace(/_DOT_/g, '.')
      .trim()
    )
    .filter(Boolean);
}

function isSpanishProse(text) {
  if (/\b(?:the|and|with|your|this|that|are|from|which|sunglasses|eyewear|features|shipping|available|Read\s+more)\b/i.test(text)) return false;
  if (/\b(?:amb|aquest|aquesta|aquests|aquestes|dels|ulleres|perqu[eè]|tamb[eé]|mateix|dones)\b/i.test(text)) return false;
  if (/\b(?:avec|pour|dans|sont|cette|ces|lunettes|soleil|visage|vous|nous)\b/i.test(text)) return false;
  if (/\b(?:und|mit|f[uü]r|sonnenbrille|brillen)\b/i.test(text)) return false;
  if (/\b(?:n[aã]o|s[aã]o|tamb[eé]m|voc[eê]|[oó]culos)\b/i.test(text)) return false;
  if (/\b(?:degli|questo|questa|occhiali|perch[eé])\b/i.test(text)) return false;

  const tokens = text.toLowerCase().match(/[a-záéíóúüñ]+/g) || [];
  if (tokens.length < 16) return false;
  const esStop = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
    'en', 'con', 'por', 'para', 'sin', 'sobre', 'que', 'y', 'o', 'es', 'son',
    'se', 'su', 'sus', 'al', 'como', 'pero', 'más', 'si', 'muy', 'este',
    'esta', 'estas', 'estos', 'entre', 'desde', 'hacia', 'también', 'nos', 'tu'
  ]);
  let stopCount = 0;
  for (const t of tokens) {
    if (esStop.has(t)) stopCount++;
  }
  return stopCount / tokens.length >= 0.17 && stopCount >= 4;
}

function hasBalancedPunctuation(text) {
  if (/[\[\]{}|©®™<>]|\uFFFD/.test(text)) return false;
  let depth = 0;
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function passesGeneralGrinderHygiene(text, { mode = 'optical_blog', excludeClinical = true } = {}) {
  if (!text || text.length < 110 || text.length > 980) return false;
  if (/[“”"«»]/.test(text)) return false;
  if (/https?:\/\/|www\.|@[a-z0-9_]+/i.test(text)) return false;
  if (/^[—\-–•*▶►\d]+[.)]/.test(text) || /^P:\s|^R:\s|^Pregunta:/i.test(text)) return false;
  if (/^(?:Por\s+Redacci[oó]n|Publicado|Actualizado|Foto:|Fuente:|V[ií]a:)/i.test(text)) return false;
  if (BOILERPLATE_NOISE_RX.test(text)) return false;
  if (COMMERCE_JUNK_RX.test(text)) return false;
  if (excludeClinical && CLINICAL_HEAVY_RX.test(text)) return false;
  if (!hasBalancedPunctuation(text)) return false;
  if (!FINITE_VERB_RX.test(text)) return false;
  if (!isSpanishProse(text)) return false;
  if (mode === 'fashion_magazine' && !EYEWEAR_ANCHOR_RX.test(text)) return false;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 22 || words.length > 125) return false;
  if (!/[.!?]$/.test(text.trim())) return false;
  if (/^[a-záéíóúüñ]/.test(text.trim())) return false;

  const sents = splitSentencesSafe(text);
  if (!sents.length || sents.length > 5) return false;
  if (sents.every(s => s.split(/\s+/).length < 6)) return false;

  return true;
}

function extractRawParagraphsFromHtml(html) {
  let cleaned = stripHtmlCommentsFast(html || '');
  cleaned = stripTagsFast(cleaned, [
    'script', 'style', 'noscript', 'svg',
    'header', 'footer', 'nav', 'aside', 'form', 'figcaption'
  ]);

  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch && (articleMatch[1].match(/<p\b/gi) || []).length >= 2) {
    cleaned = articleMatch[1];
  } else {
    const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch && (mainMatch[1].match(/<p\b/gi) || []).length >= 2) {
      cleaned = mainMatch[1];
    }
  }

  const rawPs = extractPBlocksFast(cleaned);
  const paragraphs = [];
  for (const rawP of rawPs) {
    const noInline = rawP
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/?(?:strong|b|em|i|a|span|u|abbr|cite|small|mark|sub|sup)\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' ');
    const text = decodeAllEntities(noInline);
    if (!text) continue;
    const wc = text.split(/\s+/).filter(Boolean).length;
    if (wc < 10 || wc > 240) continue;
    if (BOILERPLATE_NOISE_RX.test(text) || COMMERCE_JUNK_RX.test(text)) continue;
    paragraphs.push({ text, wc });
  }
  return paragraphs;
}

function extractGrindedBlocksFromHtml(html, meta = {}) {
  const mode = meta.mode || 'optical_blog';
  const excludeClinical = meta.excludeClinical !== false;
  const domain = String(meta.domain || 'unknown').toLowerCase().replace(/^www\./, '');

  if (mode === 'fashion_magazine') {
    const titleMatch = (html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const titleText = decodeAllEntities((titleMatch && titleMatch[1]) || '');
    const eyewearCount = ((html || '').match(new RegExp(EYEWEAR_ANCHOR_RX.source, 'gi')) || []).length;
    if (!EYEWEAR_ANCHOR_RX.test(titleText) && eyewearCount < 3) {
      return [];
    }
  }

  const rawParagraphs = extractRawParagraphsFromHtml(html);
  if (!rawParagraphs.length) return [];

  const blocks = [];
  const localSeen = new Set();

  const tryPush = (candidateText, blockType) => {
    const clean = decodeAllEntities(candidateText);
    if (!passesGeneralGrinderHygiene(clean, { mode, excludeClinical })) return false;
    const key = normalizeEsKey(clean);
    if (!key || localSeen.has(key)) return false;
    localSeen.add(key);
    const sents = splitSentencesSafe(clean);
    const wc = clean.split(/\s+/).filter(Boolean).length;
    blocks.push({
      domain,
      source_url: meta.source_url || null,
      publish_date: meta.publish_date,
      date_verification_method: meta.date_verification_method || 'verified_pre2022',
      vertical: meta.vertical || (mode === 'fashion_magazine' ? 'editorial_lifestyle' : 'optical_blog'),
      block_type: blockType,
      text: clean,
      word_count: wc,
      sentence_count: sents.length
    });
    return true;
  };

  // Pass 1: Standalone clean <p> blocks (22..125 words) — split oversized <p> (126..240w) into 2-3 sentence windows
  for (const p of rawParagraphs) {
    if (p.wc >= 22 && p.wc <= 125) {
      tryPush(p.text, 'paragraph');
    } else if (p.wc > 125) {
      const sents = splitSentencesSafe(p.text);
      for (let i = 0; i < sents.length; i += 2) {
        let win = sents[i];
        let wc = win.split(/\s+/).filter(Boolean).length;
        for (let k = 1; k < 4 && (i + k) < sents.length; k++) {
          const nw = sents[i + k].split(/\s+/).filter(Boolean).length;
          if (wc + nw > 115) break;
          win = `${win} ${sents[i + k]}`;
          wc += nw;
        }
        if (wc >= 36 && wc <= 120) {
          tryPush(win, 'split_window');
        }
      }
    }
  }

  // Pass 2: Assemble contiguous short <p> siblings (10..42w each) into multi-sentence editorial blocks (36..115w)
  for (let i = 0; i < rawParagraphs.length; i++) {
    const p1 = rawParagraphs[i];
    if (p1.wc < 10 || p1.wc > 48 || !/[.!?]$/.test(p1.text.trim())) continue;
    let combined = p1.text;
    let totalWc = p1.wc;
    for (let j = i + 1; j < rawParagraphs.length && j <= i + 3; j++) {
      const pj = rawParagraphs[j];
      if (pj.wc < 10 || pj.wc > 60 || !/[.!?]$/.test(pj.text.trim())) break;
      if (totalWc + pj.wc > 115) break;
      combined = `${combined} ${pj.text}`;
      totalWc += pj.wc;
      if (totalWc >= 36 && totalWc <= 115) {
        const sents = splitSentencesSafe(combined);
        if (sents.length >= 2 && sents.length <= 4) {
          tryPush(combined, 'merged_short_paragraphs');
        }
      }
    }
  }

  return blocks;
}

function evaluateDomain(sourceDomain) {
  const d = (sourceDomain || '').toLowerCase().replace(/^www\./, '');
  if (d.includes('wikipedia') || d === 'es') {
    return { tier: 'TIER_4_WIKIPEDIA', voice_category: 'ENCYCLOPEDIC', exclude_from_humanization: true };
  }
  if (d.includes('optimoda')) {
    return { tier: 'TIER_3_CORPORATE_PR', voice_category: 'CORPORATE_B2B', exclude_from_humanization: true };
  }
  if (
    d.includes('barraquer') || d.includes('baviera') || d.includes('clinicabaviera') ||
    d.includes('pico') || d.includes('qvision') || d.includes('oftalvist') ||
    d.includes('visiondirect') || d.includes('fernandez-vega') || d.includes('icrcat') || d.includes('imo.es')
  ) {
    return { tier: 'TIER_1_WORKSHOP', voice_category: 'WORKSHOP_CLINICAL', exclude_from_humanization: false };
  }
  if (
    d.includes('opticagasset') || d.includes('opticasflorida') ||
    d.includes('opticauniversitaria') || d.includes('opticafernandezbaca') ||
    d.includes('generaloptica') || d.includes('cottet') ||
    d.includes('afflelou') || d.includes('vipsual') ||
    d.includes('barrea') || d.includes('costasol') ||
    d.includes('optiveropticos') || d.includes('villalba') ||
    d.includes('multiopticas') || d.includes('federopticos') ||
    d.includes('opticabassol') || d.includes('optica2000') ||
    d.includes('masvision') || d.includes('soloptical') ||
    d.includes('visionlab') || d.includes('opticalia') ||
    d.includes('misterspex') || d.includes('gafasvintage') ||
    d.includes('gafasworld') || d.includes('visual-click') ||
    d.includes('cuidatuvista') || d.includes('opticaalpedrete') ||
    d.includes('millerandmarc') || d.includes('etniabarcelona') ||
    d.includes('tiwi') || d.includes('pjlobster') ||
    d.includes('theindianface') || d.includes('hanukeii') ||
    d.includes('milyunagafas') || d.includes('zeiss')
  ) {
    return { tier: 'TIER_1_WORKSHOP', voice_category: 'WORKSHOP_CLINICAL', exclude_from_humanization: false };
  }
  return { tier: 'TIER_2_EDITORIAL', voice_category: 'EDITORIAL_LIFESTYLE', exclude_from_humanization: false };
}

function detectRhetoricalRelation(text) {
  if (/las características principales.*es que son/i.test(text) ||
      /las características.*es que/i.test(text) ||
      /bastantes incómodos/i.test(text) ||
      /muchos más confortable/i.test(text) ||
      /este tipo de filtros son los que/i.test(text) ||
      /es otro estilo.*que rompe/i.test(text)) {
    return 'CAT_01_AD_SENSUM';
  }
  if (/son gafas que son/i.test(text) || /son lentes que son/i.test(text) ||
      /por ejemplo.*por ejemplo/i.test(text) || /es decir.*es decir/i.test(text)) {
    return 'CAT_02_COPULATIVE_REDUPLICATION';
  }
  if (/\.\s+(?:Y por tanto|Ya que|Sino que|Sino|Con lo que|Con lo cual|Pero también|De ahí que|Por lo que)\b/i.test(text)) {
    return 'CAT_03_ILLICIT_PUNCTUATION_BREAK';
  }
  if (/aunque son indispensables.*es ahora cuando/i.test(text) ||
      /también decir que/i.test(text) || /a la hora de.*es cuando/i.test(text)) {
    return 'CAT_04_ANACOLUTHON_OR_PSEUDO_CLEFT';
  }
  if (/\b(?:deben? de tener|debe de ser|deben? de contar|ha de ser)\b/i.test(text) ||
      /lo que (?:hace|consigue|busca|evita)\s+(?:la gafa|el cristal|la lente|el filtro).*es/i.test(text)) {
    return 'CAT_05_DEISMO_OR_PRAGMATIC_RODEO';
  }
  if (/olvídate de las marcas|como un guante|pruébalas y no te arrepentirás|de toda la vida|mano de santo|la prueba de fuego/i.test(text)) {
    return 'CAT_06_ORAL_WORKSHOP_MARKER';
  }
  if (/\b(aunque|a pesar de|sin embargo|no obstante|por el contrario|en cambio|pero)\b/i.test(text)) {
    return 'CONCESSION_CONTRAST';
  }
  if (/\b(porque|debido a|por tanto|por consiguiente|por lo que|de ahí que|con lo cual)\b/i.test(text)) {
    return 'CAUSE_EFFECT';
  }
  if (/\b(si tienes|si la cara|si tu rostro|si buscas|en caso de)\b/i.test(text)) {
    return 'CONDITION_RESULT';
  }
  return 'DESCRIPTIVE_ELABORATION';
}

function hasWholeWord(text, kw) {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-záéíóúüñ0-9])${escaped}(?=$|[^a-záéíóúüñ0-9])`, 'i').test(text);
}

function classifyFrame(text) {
  const lower = text.toLowerCase();
  if (text.length <= 220 && /:\s*$/.test(text.trim())) {
    return 'TRANSITION_CURATION';
  }
  let bestFrame = 'GENERAL_STYLE';
  let maxScore = 0;

  for (const [frameKey, frameData] of Object.entries(TAXONOMY.frames)) {
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
  if (maxScore === 0) {
    if (/\b(?:carey|havana|acetato|metal|bronce|dorado|pasta|titanio)\b/i.test(lower)) return 'MATERIAL_COMPOSITION';
    if (/\b(?:rostro|cara|facciones|p[oó]mulos|mand[ií]bula|favorece|armoniza)\b/i.test(lower)) return 'VISAGISM_AESTHETICS';
    if (/\b(?:uv|solar|solares|polarizad|deslumbramiento|radiaci[oó]n)\b/i.test(lower)) return 'OPTICAL_PROTECTION';
    if (/\b(?:años\s*(?:50|60|70|80)|retro|vintage|boho|historia|cl[aá]sic|ic[oó]nic)\b/i.test(lower)) return 'HERITAGE_ORIGIN';
  }
  return bestFrame;
}

const TOPIC_TAG_RULES = [
  { tag: 'carey_tierra', rx: /\b(?:carey|havana|habana|tierra|marr[oó]n|[aá]mbar|ocre|miel|terracota|beige|camel|casta[nñ]o)\b/i },
  { tag: 'boho_vintage_70s', rx: /\b(?:boho|bohemi[oa]s?|hippie|setenter[oa]s?|vintage|retro|años\s*(?:60|70)|setenta|sesenta)\b/i },
  { tag: 'redondas', rx: /\b(?:redond[oa]s?|redondead[oa]s?|circular(?:es)?|pantos|panthos)\b/i },
  { tag: 'cuadradas_geom', rx: /\b(?:cuadrad[oa]s?|rectangul(?:ar|ares)|geom[eé]tric[oa]s?|hexagonal(?:es)?|octogonal(?:es)?|angul(?:os|ar|ares))\b/i },
  { tag: 'aviador', rx: /\b(?:aviador|piloto|l[aá]grima|doble\s+puente)\b/i },
  { tag: 'cat_eye_mariposa', rx: /\b(?:cat-?eye|ojos?\s+de\s+gato|gatun[oa]s?|mariposa)\b/i },
  { tag: 'oversize', rx: /\b(?:oversize|maxi\s*gafas|maxigafas|pantalla\s+completa|envolventes?)\b/i },
  { tag: 'acetato_pasta', rx: /\b(?:acetato|pasta|celulosa|ecoacetato|flor\s+de\s+algod[oó]n)\b/i },
  { tag: 'metal_titanio', rx: /\b(?:metal|met[aá]lic[oa]s?|titanio|acero|bronce|dorad[oa]|oro|platead[oa]|aluminio)\b/i },
  { tag: 'visagismo_rostro', rx: /\b(?:visagismo|rostro|cara|facciones|rasgos|p[oó]mulos|mand[ií]bula|frente|ment[oó]n|ovalad[oa]s?)\b/i },
  { tag: 'proteccion_uv', rx: /\b(?:protecci[oó]n\s*(?:uv|solar|ocular)|uv\s*400|rayos?\s*(?:uv|solares|ultravioleta)|radiaci[oó]n|categor[ií]a\s*[0-4])\b/i },
  { tag: 'lentes_cristales', rx: /\b(?:polarizad[oa]s?|fotocrom[aá]tic[oa]s?|antirreflejant\w*|degradad[oa]s?|espejad[oa]s?|cristal\s+mineral|policarbonato)\b/i },
  { tag: 'artesania_taller', rx: /\b(?:artesanal(?:es)?|pulid[oa]|fresad[oa]|bisagras?|hech[oa]s?\s+a\s+mano|taller|acabado)\b/i },
  { tag: 'cuidado_mantenimiento', rx: /\b(?:limpi[ae]r|limpieza|estuche|funda|microfibra|gamuza|jab[oó]n\s+neutro|rayaduras?|rayones?)\b/i },
  { tag: 'deporte_exterior', rx: /\b(?:deportiv[oa]s?|ciclismo|running|senderismo|esqu[ií]|pesca|golf|conducci[oó]n|conducir|aire\s+libre)\b/i },
  { tag: 'tendencias_moda', rx: /\b(?:tendencia|moda|estilo|look|outfit|pasarela|vers[aá]til|atemporal|elegancia)\b/i },
  { tag: 'confort_ajuste', rx: /\b(?:comodidad|confort|ligereza|liger[oa]s?|ergonom[ií]a|ajuste|puente\s+nasal|almohadillas|plaquetas|tabique)\b/i },
  { tag: 'graduadas_optica', rx: /\b(?:graduad[oa]s?|progresiv[oa]s?|monofocal|ocupacional|luz\s+azul|miop[ií]a|astigmatismo|presbicia|optometrista)\b/i }
];

function extractTopicTags(text) {
  const tags = [];
  for (const r of TOPIC_TAG_RULES) {
    if (r.rx.test(text)) tags.push(r.tag);
  }
  return tags;
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

      // Boundary safety: avoid mid-word matches
      const prevCh = start > 0 ? text[start - 1] : ' ';
      const nextCh = end < text.length ? text[end] : ' ';
      if (/[a-záéíóúüñ0-9]/i.test(prevCh) || /[a-záéíóúüñ0-9]/i.test(nextCh)) continue;

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
    foundSlots.push({ slot_type: r.type, raw_value: r.raw, offset: r.start });
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

function classifyDiscourseIntent(text, frame = 'GENERAL_STYLE') {
  const clean = String(text || '').trim();
  const lower = clean.toLowerCase();
  if ((clean.length <= 240 && /:\s*$/.test(clean)) || frame === 'TRANSITION_CURATION') {
    return 'CURATION_TRANSITION';
  }
  if (frame === 'CARE_MAINTENANCE' || /\b(?:limpi[ae]r|limpieza|estuche|funda|microfibra|jab[oó]n\s+neutro|guardar\s+las\s+gafas)\b/i.test(lower)) {
    return 'CARE_GUIDE';
  }
  if (frame === 'OPTICAL_PROTECTION' || frame === 'LENS_PROPERTIES' || /\b(?:uv\s*400|rayos?\s+uv|radiaci[oó]n\s+solar|polarizad[oa]s?|fotocrom[aá]tic[oa]s?|antirreflejant\w*|deslumbramiento|filtro\s+solar)\b/i.test(lower)) {
    return 'OPTICAL_TECHNICAL';
  }
  if (frame === 'VISAGISM_AESTHETICS' || (/\b(?:rostro|cara|facciones|mand[ií]bula|p[oó]mulos|frente|ment[oó]n|visagismo)\b/i.test(lower) && /\b(?:favorece|equilibra|suaviza|alarga|estiliza|sienta|armoniza|proporci[oó]n|forma)\b/i.test(lower))) {
    return 'VISAGISM_ADVICE';
  }
  if (frame === 'HERITAGE_ORIGIN' || /\b(?:historia|d[eé]cadas?|a[nñ]os\s+(?:50|60|70|80|90)|origen|nacieron|cl[aá]sico\s+atemporal|ic[oó]nic[oa]s?|legado|retro|vintage)\b/i.test(lower)) {
    return 'HERITAGE_STORY';
  }
  if (frame === 'MATERIAL_COMPOSITION' || frame === 'MECHANICAL_FUNCTION' || frame === 'ANATOMICAL_FIT' || /\b(?:acetato\s+de\s+celulosa|titanio|acero\s+inoxidable|bisagras?|pulido\s+a\s+mano|almohadillas|puente\s+nasal|ergonom[ií]a|ligereza|fabricad[oa]s?\s+en)\b/i.test(lower)) {
    return 'MATERIAL_CRAFT';
  }
  if (/\b(?:combina[ns]?|combinar|look|outfit|estilismo|prendas?|lino|algod[oó]n|vaqueros|vestidos?|traje|camisa|ciudad|playa|oficina|aire\s+libre)\b/i.test(lower)) {
    return 'OUTFIT_COMBINATION';
  }
  if (/\b(?:este\s+modelo|esta\s+montura|el\s+modelo|la\s+firma|colecci[oó]n|dise[nñ]o\s+presenta|se\s+presenta\s+en)\b/i.test(lower)) {
    return 'PRODUCT_PRESENTATION';
  }
  return 'STYLE_DEFINITION';
}

function detectNarrativePersona(text) {
  const lower = String(text || '').toLowerCase();
  const tuMatches = (lower.match(/\b(?:tu|tus|te|ti|tienes|buscas|prefieres|eliges|puedes|llevas|luces|quieres|necesitas|apuestas|dec[aá]ntate|elige|f[ií]jate|olv[ií]date|pru[eé]balas)\b/g) || []).length;
  const nosMatches = (lower.match(/\b(?:nos|nuestro|nuestra|nuestros|nuestras|podemos|sabemos|tenemos|elegimos|llevamos|buscamos|queremos|solemos|vemos|olvidamos|recomendamos)\b/g) || []).length;
  if (tuMatches > nosMatches && tuMatches >= 1) return 'SECOND_PERSON_TU';
  if (nosMatches > tuMatches && nosMatches >= 1) return 'FIRST_PLURAL_NOSOTROS';
  return 'IMPERSONAL_THIRD';
}

function detectPolarity(text) {
  const lower = String(text || '').toLowerCase();
  if (/\b(?:evitar|evita|evitaremos|huir\s+de|descartar|no\s+favorecen|no\s+conviene|no\s+son\s+recomendables|error\s+com[uú]n|jam[aá]s\s+debes|peor\s+opci[oó]n)\b/i.test(lower)) {
    return 'NEGATIVE_WARNING';
  }
  if (/\b(?:mientras\s+que|en\s+cambio|por\s+el\s+contrario|a\s+diferencia\s+de|frente\s+a|sin\s+embargo|aunque|pero\s+si)\b/i.test(lower)) {
    return 'CONTRAST_COMPARISON';
  }
  if (/\b(?:ideal(?:es)?|perfect[oa]s?|favorece[ns]?|excelente|imprescindible|acierto|mejor\s+opci[oó]n|recomendable|destaca[ns]?|triunfa[ns]?)\b/i.test(lower)) {
    return 'POSITIVE_RECOMMENDATION';
  }
  return 'NEUTRAL_INFORMATIVE';
}

function tagBrickFromRaw(item, brickId = null) {
  const clean = decodeAllEntities(item.text || item.raw_text || '');
  const words = clean.split(/\s+/).filter(Boolean);
  const { skeleton, slots } = abstractSkeleton(clean);
  if (/\[SLOT_[A-Z_]+\][a-záéíóúüñ]|[a-záéíóúüñ]\[SLOT_[A-Z_]+\]/i.test(skeleton)) {
    return null;
  }
  const { tier, voice_category, exclude_from_humanization } = evaluateDomain(item.domain || item.source_domain);
  const frame = classifyFrame(clean);
  const rhetorical = detectRhetoricalRelation(clean);
  const centering = analyzeCentering(clean);
  const topic_tags = extractTopicTags(clean);
  const discourse_intent = classifyDiscourseIntent(clean, frame);
  const narrative_persona = detectNarrativePersona(clean);
  const polarity = detectPolarity(clean);

  const functionalWords = clean.toLowerCase().match(/\b(el|la|los|las|un|una|unos|unas|de|del|en|para|por|con|sin|sobre|que|aunque|pero|y|o|como|si|más|menos|es|son|fue|fueron|ha|han|se)\b/g) || [];
  const functionalRatio = parseFloat((functionalWords.length / Math.max(1, words.length)).toFixed(3));

  const tagged = {
    original_id: item.source_url || item.original_id || null,
    source_domain: String(item.domain || item.source_domain || 'unknown').toLowerCase().replace(/^www\./, ''),
    publish_date: item.publish_date,
    date_verification_method: item.date_verification_method || 'verified_pre2022',
    tier,
    voice_category,
    exclude_from_humanization,
    vertical: item.vertical || null,
    block_type: item.block_type || 'paragraph',
    frame,
    discourse_intent,
    narrative_persona,
    polarity,
    topic_tags,
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
  if (brickId) tagged.brick_id = brickId;
  return tagged;
}

function loadGlobalDedupeState() {
  const seenAscii = new Set();
  const seenEs = new Set();
  const seenUrls = new Set();
  const seenSents = new Set();

  if (fs.existsSync(MASTER_PATH)) {
    const bank = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
    for (const b of bank) {
      const a = normalizeAsciiKey(b.raw_text);
      const e = normalizeEsKey(b.raw_text);
      if (a) seenAscii.add(a);
      if (e) seenEs.add(e);
      if (b.original_id) seenUrls.add(normalizeUrlKey(b.original_id));
      for (const s of splitSentencesSafe(b.raw_text || '')) {
        const sn = normalizeEsKey(s);
        if (sn.length >= 26) seenSents.add(sn);
      }
    }
  }

  const evidenceMetas = [];
  if (fs.existsSync(EVIDENCE_DIR)) {
    for (const f of fs.readdirSync(EVIDENCE_DIR)) {
      if (!f.endsWith('.meta.json')) continue;
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, f), 'utf8'));
        if (meta.source_url) seenUrls.add(normalizeUrlKey(meta.source_url));
        const htmlPath = path.join(EVIDENCE_DIR, f.replace(/\.meta\.json$/, '.html'));
        if (fs.existsSync(htmlPath)) {
          evidenceMetas.push({ meta, htmlPath });
        }
      } catch {}
    }
  }

  return { seenAscii, seenEs, seenUrls, seenSents, evidenceMetas };
}

function registerIfUnique(block, dedupe) {
  const normA = normalizeAsciiKey(block.text || block.raw_text);
  const normE = normalizeEsKey(block.text || block.raw_text);
  if (!normA || !normE || dedupe.seenAscii.has(normA) || dedupe.seenEs.has(normE)) {
    return false;
  }
  const sents = splitSentencesSafe(block.text || block.raw_text || '');
  if (sents.length > 0) {
    let seenCount = 0;
    for (const s of sents) {
      const sn = normalizeEsKey(s);
      if (sn.length >= 26 && dedupe.seenSents.has(sn)) seenCount++;
    }
    if (seenCount >= sents.length || (sents.length >= 2 && seenCount / sents.length > 0.6)) {
      return false;
    }
  }
  dedupe.seenAscii.add(normA);
  dedupe.seenEs.add(normE);
  for (const s of sents) {
    const sn = normalizeEsKey(s);
    if (sn.length >= 26) dedupe.seenSents.add(sn);
  }
  return true;
}

async function fetchWithHeaders(url, timeoutMs = 12000, accept = 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.7',
        'Accept': accept
      },
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, status: res.status, text: '', headers: res.headers, url: res.url || url };
    const text = await res.text();
    return { ok: true, status: res.status, text, headers: res.headers, url: res.url || url };
  } catch {
    clearTimeout(timer);
    return { ok: false, status: 0, text: '', headers: null, url };
  }
}

async function harvestWordPressApi(domainCfg, dedupe, opts = {}) {
  const domain = domainCfg.domain;
  const maxPages = opts.maxWpPages || 8;
  const bases = domainCfg.wpBases || [
    `https://${domain}/blog`,
    `https://www.${domain}/blog`,
    `https://${domain}`,
    `https://www.${domain}`,
    `https://${domain}/es/blog`,
    `https://www.${domain}/es`
  ];

  const blocks = [];
  let pagesSaved = 0;

  for (const base of bases) {
    const testUrl = `${base.replace(/\/+$/, '')}/wp-json/wp/v2/posts?before=2022-01-01T00:00:00&per_page=100&page=1&_fields=link,date,date_gmt,title,content`;
    const firstRes = await fetchWithHeaders(testUrl, 12000, 'application/json');
    if (!firstRes.ok || !firstRes.text || !firstRes.text.trim().startsWith('[')) continue;

    let firstPosts;
    try { firstPosts = JSON.parse(firstRes.text); } catch { continue; }
    if (!Array.isArray(firstPosts) || !firstPosts.length) continue;

    const totalPagesHeader = parseInt(firstRes.headers?.get?.('x-wp-totalpages') || '1', 10) || 1;
    const pagesToFetch = Math.min(maxPages, totalPagesHeader);

    const processPosts = (posts) => {
      for (const p of posts) {
        if (!p || !p.content?.rendered || !p.link) continue;
        const rawDate = String(p.date_gmt || p.date || '').slice(0, 10);
        if (!rawDate || rawDate >= '2022-01-01' || rawDate < '2004-01-01') continue;
        const normUrl = normalizeUrlKey(p.link);
        if (!normUrl || dedupe.seenUrls.has(normUrl)) continue;
        if (isBadBlogUrl(p.link, domainCfg.mode)) continue;

        const syntheticHtml = `<!doctype html><html><head><meta property="article:published_time" content="${rawDate}T12:00:00Z"><title>${p.title?.rendered || ''}</title></head><body><article><h1>${p.title?.rendered || ''}</h1>${p.content.rendered}</article></body></html>`;
        const extracted = extractGrindedBlocksFromHtml(syntheticHtml, {
          domain,
          source_url: p.link,
          publish_date: rawDate,
          date_verification_method: 'wordpress_rest_api_date_gmt',
          mode: domainCfg.mode,
          excludeClinical: domainCfg.excludeClinical !== false
        });

        let acceptedHere = 0;
        for (const blk of extracted) {
          if (registerIfUnique(blk, dedupe)) {
            const tagged = tagBrickFromRaw(blk);
            if (tagged) {
              blocks.push(tagged);
              acceptedHere++;
            }
          }
        }
        if (acceptedHere > 0) {
          dedupe.seenUrls.add(normUrl);
          saveEvidenceSafe(domain, p.link, rawDate, 'wordpress_rest_api_date_gmt', syntheticHtml, { blocks_extracted: acceptedHere });
          pagesSaved++;
        }
      }
    };

    processPosts(firstPosts);
    for (let pg = 2; pg <= pagesToFetch; pg++) {
      if (opts.deadlineMs && Date.now() > opts.deadlineMs) break;
      await sleep(250);
      const pgUrl = `${base.replace(/\/+$/, '')}/wp-json/wp/v2/posts?before=2022-01-01T00:00:00&per_page=100&page=${pg}&_fields=link,date,date_gmt,title,content`;
      const r = await fetchWithHeaders(pgUrl, 12000, 'application/json');
      if (!r.ok || !r.text) break;
      try {
        const arr = JSON.parse(r.text);
        if (!Array.isArray(arr) || !arr.length) break;
        processPosts(arr);
      } catch {
        break;
      }
    }
    break;
  }

  return { blocks, pagesSaved, channel: 'wp_api' };
}

async function harvestShopifyBlog(domainCfg, dedupe, opts = {}) {
  const domain = domainCfg.domain;
  const handles = domainCfg.shopifyHandles || ['news', 'blog', 'tendencias', 'journal'];
  const bases = [`https://${domain}`, `https://www.${domain}`];
  const blocks = [];
  let pagesSaved = 0;

  for (const base of bases) {
    for (const handle of handles) {
      if (opts.deadlineMs && Date.now() > opts.deadlineMs) break;
      const jsonUrl = `${base}/blogs/${handle}/articles.json?limit=250`;
      const r = await fetchWithHeaders(jsonUrl, 10000, 'application/json');
      if (r.ok && r.text && r.text.includes('"articles"')) {
        try {
          const parsed = JSON.parse(r.text);
          const arts = parsed.articles || [];
          for (const a of arts) {
            const rawDate = String(a.published_at || a.created_at || '').slice(0, 10);
            if (!rawDate || rawDate >= '2022-01-01' || rawDate < '2004-01-01') continue;
            const url = `${base}/blogs/${handle}/${a.handle || a.id}`;
            const normUrl = normalizeUrlKey(url);
            if (dedupe.seenUrls.has(normUrl)) continue;
            const syntheticHtml = `<!doctype html><html><head><meta property="article:published_time" content="${rawDate}T12:00:00Z"><title>${a.title || ''}</title></head><body><article><h1>${a.title || ''}</h1>${a.body_html || ''}</article></body></html>`;
            const extracted = extractGrindedBlocksFromHtml(syntheticHtml, {
              domain,
              source_url: url,
              publish_date: rawDate,
              date_verification_method: 'shopify_articles_json',
              mode: domainCfg.mode,
              excludeClinical: domainCfg.excludeClinical !== false
            });
            let accepted = 0;
            for (const blk of extracted) {
              if (registerIfUnique(blk, dedupe)) {
                const tagged = tagBrickFromRaw(blk);
                if (tagged) { blocks.push(tagged); accepted++; }
              }
            }
            if (accepted > 0) {
              dedupe.seenUrls.add(normUrl);
              saveEvidenceSafe(domain, url, rawDate, 'shopify_articles_json', syntheticHtml, { blocks_extracted: accepted });
              pagesSaved++;
            }
          }
          if (arts.length) return { blocks, pagesSaved, channel: 'shopify' };
        } catch {}
      }
    }
  }
  return { blocks, pagesSaved, channel: 'shopify' };
}

async function harvestLiveSitemaps(domainCfg, dedupe, opts = {}) {
  const domain = domainCfg.domain;
  const sitemapCandidates = domainCfg.sitemaps || [
    `https://${domain}/post-sitemap.xml`,
    `https://www.${domain}/post-sitemap.xml`,
    `https://${domain}/blog/post-sitemap.xml`,
    `https://www.${domain}/blog/post-sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://www.${domain}/sitemap_index.xml`
  ];
  const maxLiveUrls = opts.maxSitemapUrls || 120;
  const blocks = [];
  let pagesSaved = 0;

  let collectedUrls = [];
  for (const smUrl of sitemapCandidates) {
    if (opts.deadlineMs && Date.now() > opts.deadlineMs) break;
    const res = await fetchWithHeaders(smUrl, 10000, 'application/xml,text/xml,*/*');
    if (!res.ok || !res.text || !res.text.includes('<loc>')) continue;

    if (res.text.includes('<sitemapindex')) {
      const subLocs = (res.text.match(/<loc>(.*?)<\/loc>/g) || [])
        .map(m => m.replace(/<\/?loc>/g, '').trim())
        .filter(u => /post|blog|article|news|tendencia|nota/i.test(u))
        .slice(0, 6);
      for (const subUrl of subLocs) {
        const subRes = await fetchWithHeaders(subUrl, 10000, 'application/xml,text/xml,*/*');
        if (!subRes.ok || !subRes.text) continue;
        const locs = (subRes.text.match(/<loc>(.*?)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim());
        collectedUrls.push(...locs);
      }
    } else {
      const locs = (res.text.match(/<loc>(.*?)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim());
      collectedUrls.push(...locs);
    }
    if (collectedUrls.length > 0) break;
  }

  const candidateUrls = collectedUrls
    .filter(u => !isBadBlogUrl(u, domainCfg.mode))
    .filter(u => {
      const n = normalizeUrlKey(u);
      return n && !dedupe.seenUrls.has(n);
    })
    .slice(0, maxLiveUrls);

  for (const pageUrl of candidateUrls) {
    if (opts.deadlineMs && Date.now() > opts.deadlineMs) break;
    const res = await fetchWithHeaders(pageUrl, 9000);
    if (!res.ok || !res.text) continue;
    const dateInfo = verifyStrictPre2022Date(res.text, pageUrl, null);
    if (!dateInfo) continue;

    const extracted = extractGrindedBlocksFromHtml(res.text, {
      domain,
      source_url: pageUrl,
      publish_date: dateInfo.date,
      date_verification_method: dateInfo.method,
      mode: domainCfg.mode,
      excludeClinical: domainCfg.excludeClinical !== false
    });
    let accepted = 0;
    for (const blk of extracted) {
      if (registerIfUnique(blk, dedupe)) {
        const tagged = tagBrickFromRaw(blk);
        if (tagged) { blocks.push(tagged); accepted++; }
      }
    }
    if (accepted > 0) {
      dedupe.seenUrls.add(normalizeUrlKey(pageUrl));
      saveEvidenceSafe(domain, pageUrl, dateInfo.date, dateInfo.method, res.text, { blocks_extracted: accepted });
      pagesSaved++;
    }
    await sleep(140);
  }

  return { blocks, pagesSaved, channel: 'sitemap' };
}

async function queryWaybackCDXPolite(pattern, limit = 250, filterRegex = null) {
  let cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(pattern)}&output=json&fl=timestamp,original&filter=statuscode:200&filter=mimetype:text/html&to=20211231235959&limit=${limit}&collapse=urlkey`;
  if (filterRegex) {
    cdxUrl += `&filter=${encodeURIComponent('original:' + filterRegex)}`;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1800 * attempt);
    const res = await fetchWithHeaders(cdxUrl, 28000, 'application/json');
    if (res.status === 429 || res.status === 503) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!res.ok || !res.text || res.text.trim().startsWith('<')) continue;
    try {
      const arr = JSON.parse(res.text);
      if (!Array.isArray(arr) || arr.length < 2) return [];
      const snaps = [];
      for (let i = 1; i < arr.length; i++) {
        const [timestamp, originalUrl] = arr[i];
        if (!timestamp || !originalUrl || timestamp > '20211231235959') continue;
        snaps.push({
          timestamp,
          originalUrl,
          waybackUrl: `https://web.archive.org/web/${timestamp}id_/${originalUrl}`
        });
      }
      return snaps;
    } catch {
      return [];
    }
  }
  return [];
}

async function harvestWaybackCDX(domainCfg, dedupe, opts = {}) {
  const domain = domainCfg.domain;
  const patterns = domainCfg.cdxPatterns || [`${domain}/blog/*`, `${domain}/*`];
  const filterRegex = domainCfg.mode === 'fashion_magazine' ? '.*(gafas|montura|lentes|optica|sol|visagismo|accesorios).*' : null;
  const maxSnaps = opts.maxWaybackSnaps || 45;
  const blocks = [];
  let pagesSaved = 0;

  const snapQueue = [];
  const seenKeys = new Set();

  for (const pat of patterns) {
    if (opts.deadlineMs && Date.now() > opts.deadlineMs) break;
    const snaps = await queryWaybackCDXPolite(pat, 220, filterRegex);
    for (const s of snaps) {
      if (isBadBlogUrl(s.originalUrl, domainCfg.mode)) continue;
      const n = normalizeUrlKey(s.originalUrl);
      if (!n || dedupe.seenUrls.has(n) || seenKeys.has(n)) continue;
      seenKeys.add(n);
      snapQueue.push(s);
    }
    await sleep(600);
    if (snapQueue.length >= maxSnaps) break;
  }

  for (const snap of snapQueue.slice(0, maxSnaps)) {
    if (opts.deadlineMs && Date.now() > opts.deadlineMs) break;
    let res = await fetchWithHeaders(snap.waybackUrl, 13000);
    if (res.status === 429 || res.status === 503) {
      await sleep(3000);
      res = await fetchWithHeaders(snap.waybackUrl, 13000);
    }
    if (!res.ok || !res.text || /Internet Archive:\s*Temporarily Offline/i.test(res.text)) {
      await sleep(750);
      continue;
    }
    const dateInfo = verifyStrictPre2022Date(res.text, snap.originalUrl, snap.timestamp);
    if (!dateInfo) {
      await sleep(500);
      continue;
    }

    const extracted = extractGrindedBlocksFromHtml(res.text, {
      domain,
      source_url: snap.originalUrl,
      publish_date: dateInfo.date,
      date_verification_method: dateInfo.method,
      mode: domainCfg.mode,
      excludeClinical: domainCfg.excludeClinical !== false
    });
    let accepted = 0;
    for (const blk of extracted) {
      if (registerIfUnique(blk, dedupe)) {
        const tagged = tagBrickFromRaw(blk);
        if (tagged) { blocks.push(tagged); accepted++; }
      }
    }
    if (accepted > 0) {
      dedupe.seenUrls.add(normalizeUrlKey(snap.originalUrl));
      saveEvidenceSafe(domain, snap.originalUrl, dateInfo.date, dateInfo.method, res.text, {
        wayback_url: snap.waybackUrl,
        blocks_extracted: accepted
      });
      pagesSaved++;
    }
    await sleep(650);
  }

  return { blocks, pagesSaved, channel: 'wayback_cdx' };
}

async function runDomainGrinderShard({
  shardName,
  shardPath,
  reportPath,
  domains,
  timeBudgetMs = 6.5 * 60 * 1000,
  perDomainBudgetMs = 0,
  maxBlocksPerDomain = 350,
  maxTotalBlocks = 2500,
  maxWpPages = 7,
  maxSitemapUrls = 90,
  maxWaybackSnaps = 45
}) {
  const tStart = Date.now();
  const deadlineMs = tStart + timeBudgetMs;
  const dedupe = loadGlobalDedupeState();
  const allBlocks = [];
  const summaryRows = [];

  console.log(`=== [${shardName}] INICIANDO PICADORA MASIVA (${domains.length} dominios) | Base existente: ${dedupe.seenEs.size} bloques, ${dedupe.seenUrls.size} URLs ===`);

  for (const cfg of domains) {
    if (Date.now() > deadlineMs || allBlocks.length >= maxTotalBlocks) break;
    const dStart = Date.now();
    const domDeadline = perDomainBudgetMs > 0 ? Math.min(deadlineMs, dStart + perDomainBudgetMs) : deadlineMs;
    const domBlocks = [];
    const domStats = { domain: cfg.domain, wp: 0, shopify: 0, sitemap: 0, wayback: 0, total: 0, pagesSaved: 0 };

    const addFromResult = (res, key) => {
      for (const b of res.blocks) {
        if (domBlocks.length >= maxBlocksPerDomain || allBlocks.length + domBlocks.length >= maxTotalBlocks) break;
        domBlocks.push(b);
      }
      domStats[key] = res.blocks.length;
      domStats.pagesSaved += res.pagesSaved;
    };

    try {
      const wpRes = await harvestWordPressApi(cfg, dedupe, { deadlineMs: domDeadline, maxWpPages });
      addFromResult(wpRes, 'wp');
    } catch {}

    if (domBlocks.length < maxBlocksPerDomain && cfg.shopifyHandles && Date.now() < domDeadline) {
      try {
        const shRes = await harvestShopifyBlog(cfg, dedupe, { deadlineMs: domDeadline });
        addFromResult(shRes, 'shopify');
      } catch {}
    }

    if (domBlocks.length < 40 && Date.now() < domDeadline) {
      try {
        const smRes = await harvestLiveSitemaps(cfg, dedupe, { deadlineMs: domDeadline, maxSitemapUrls });
        addFromResult(smRes, 'sitemap');
      } catch {}
    }

    if (maxWaybackSnaps > 0 && domBlocks.length < maxBlocksPerDomain && Date.now() < domDeadline) {
      try {
        const wbRes = await harvestWaybackCDX(cfg, dedupe, { deadlineMs: domDeadline, maxWaybackSnaps });
        addFromResult(wbRes, 'wayback');
      } catch {}
    }

    allBlocks.push(...domBlocks);
    domStats.total = domBlocks.length;
    domStats.elapsedSec = ((Date.now() - dStart) / 1000).toFixed(1);
    summaryRows.push(domStats);

    writeJsonAtomic(shardPath, allBlocks);
    console.log(`[${shardName}] ${cfg.domain}: +${domStats.total} bloques (${domStats.pagesSaved} págs) [WP=${domStats.wp}, SH=${domStats.shopify}, SM=${domStats.sitemap}, WB=${domStats.wayback}] | Total shard=${allBlocks.length} (${domStats.elapsedSec}s)`);
  }

  writeJsonAtomic(shardPath, allBlocks);

  const byFrame = {};
  const byTag = {};
  for (const b of allBlocks) {
    byFrame[b.frame] = (byFrame[b.frame] || 0) + 1;
    for (const tg of b.topic_tags || []) byTag[tg] = (byTag[tg] || 0) + 1;
  }

  const md = [
    `# Reporte ${shardName}`,
    `**Fecha:** ${new Date().toISOString()} | **Duración:** ${((Date.now() - tStart) / 1000).toFixed(1)}s`,
    `**Total bloques extraídos y etiquetados:** ${allBlocks.length}`,
    '',
    '## Desglose por Dominio',
    '| Dominio | Total Bloques | Págs Evidencia | WP API | Shopify | Sitemaps | Wayback | Tiempo |',
    '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |',
    ...summaryRows.map(r => `| ${r.domain} | ${r.total} | ${r.pagesSaved} | ${r.wp} | ${r.shopify} | ${r.sitemap} | ${r.wayback} | ${r.elapsedSec}s |`),
    '',
    '## Distribución por Marco FrameNet',
    ...Object.entries(byFrame).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- **${k}:** ${v}`),
    '',
    '## Top Etiquetas Temáticas (`topic_tags`)',
    ...Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `- \`${k}\`: ${v}`)
  ].join('\n');

  writeTextAtomic(reportPath, md);
  console.log(`=== [${shardName}] FINALIZADO: ${allBlocks.length} bloques guardados en ${shardPath} ===`);
  return { total: allBlocks.length, summaryRows, byFrame, byTag };
}

module.exports = {
  EVIDENCE_DIR,
  STAGING_DIR,
  MASTER_PATH,
  MARCOS_DIR,
  TAXONOMY,
  CLINICAL_SURGERY_DOMAINS,
  writeJsonAtomic,
  writeTextAtomic,
  decodeAllEntities,
  normalizeUrlKey,
  normalizeAsciiKey,
  normalizeEsKey,
  saveEvidenceSafe,
  verifyStrictPre2022Date,
  extractRawParagraphsFromHtml,
  extractGrindedBlocksFromHtml,
  evaluateDomain,
  classifyFrame,
  classifyDiscourseIntent,
  detectNarrativePersona,
  detectPolarity,
  extractTopicTags,
  detectRhetoricalRelation,
  abstractSkeleton,
  analyzeCentering,
  tagBrickFromRaw,
  loadGlobalDedupeState,
  registerIfUnique,
  splitSentencesSafe,
  runDomainGrinderShard
};
