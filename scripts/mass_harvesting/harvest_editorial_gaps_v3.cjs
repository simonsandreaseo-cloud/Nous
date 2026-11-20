const fs = require('fs');
const path = require('path');
const {
  decodeHtmlEntities,
  detectPublishDate,
  fetchUrl,
  saveScrapedPage,
  runConcurrent,
  EVIDENCE_DIR,
  STAGING_DIR
} = require('./harvest_core.cjs');

const MASTER_BANK_PATH = path.resolve('banco_ontologico_semantico/banco_maestro_ladrillos_retoricos.json');
const MARCOS_DIR = path.resolve('banco_ontologico_semantico/marcos');
const OUT_STAGING_JSON = path.join(STAGING_DIR, 'harvested_editorial_gaps_v3.json');
const OUT_REPORT_MD = path.join(STAGING_DIR, 'REPORTE_COSECHA_V3.md');

const CDX_FILTER_COMPACT = '.*gafas.*';
const CDX_FILTER_STYLE = '.*(gafas|boho|carey|tierra|visagismo).*';

// Ordered PROVEN FASTEST & HIGHEST-YIELD sources first; CDX -> immediate Wayback fetch per target
const TARGETS = [
  // Proven fast & rich Spanish optical / eyewear design domains
  { pattern: 'vipsual.com/*', domain: 'vipsual.com', filter: CDX_FILTER_COMPACT, limit: 220, from: '20150101000000' },
  { pattern: 'millerandmarc.com/*', domain: 'millerandmarc.com', filter: null, limit: 200, from: '20160101000000' },
  { pattern: 'opticauniversitaria.es/comunicacion/blog/*', domain: 'opticauniversitaria.es', filter: null, limit: 200, from: '20160101000000' },
  { pattern: 'afflelou.es/blog/gafas/*', domain: 'afflelou.es', filter: null, limit: 200, from: '20150101000000' },
  { pattern: 'glamour.es/moda/tendencias/*', domain: 'glamour.es', filter: CDX_FILTER_COMPACT, limit: 200, from: '20160101000000' },
  { pattern: 'opticabassol.com/blog/es/*', domain: 'opticabassol.com', filter: null, limit: 200, from: '20150101000000' },
  { pattern: 'cottet.com/es/blog/*', domain: 'cottet.com', filter: null, limit: 200, from: '20150101000000' },
  { pattern: 'optica2000.com/blog/*', domain: 'optica2000.com', filter: null, limit: 200, from: '20160101000000' },
  { pattern: 'masvision.es/blog/*', domain: 'masvision.es', filter: null, limit: 250, from: '20160101000000' },
  { pattern: 'soloptical.net/blog/*', domain: 'soloptical.net', filter: null, limit: 250, from: '20160101000000' },
  { pattern: 'etniabarcelona.com/es/*', domain: 'etniabarcelona.com', filter: CDX_FILTER_COMPACT, limit: 180, from: '20160101000000' },
  { pattern: 'lookiero.es/blog/*', domain: 'lookiero.es', filter: CDX_FILTER_STYLE, limit: 150, from: '20170101000000' },
  { pattern: 'trendencias.com/propuestas-y-consejos/*', domain: 'trendencias.com', filter: CDX_FILTER_COMPACT, limit: 200, from: '20170101000000' },
  { pattern: 'elle.com/es/moda/tendencias/*', domain: 'elle.com', filter: CDX_FILTER_COMPACT, limit: 180, from: '20170101000000' },
  { pattern: 'elle.com/es/moda/noticias/*', domain: 'elle.com', filter: CDX_FILTER_COMPACT, limit: 180, from: '20170101000000' },

  // Additional Spanish optical & editorial fashion domains (2017-2021 for fast CDX response)
  { pattern: 'generaloptica.es/blog/*', domain: 'generaloptica.es', filter: null, limit: 220, from: '20170101000000' },
  { pattern: 'federopticos.com/tendencias/*', domain: 'federopticos.com', filter: null, limit: 200, from: '20160101000000' },
  { pattern: 'federopticos.com/blog/*', domain: 'federopticos.com', filter: null, limit: 200, from: '20170101000000' },
  { pattern: 'alainafflelou.es/blog/moda-a-la-vista/*', domain: 'alainafflelou.es', filter: null, limit: 180, from: '20160101000000' },
  { pattern: 'alainafflelou.es/blog/tu-ojo-experto/*', domain: 'alainafflelou.es', filter: null, limit: 180, from: '20160101000000' },
  { pattern: 'afflelou.es/blog/tendencias/*', domain: 'afflelou.es', filter: null, limit: 180, from: '20160101000000' },
  { pattern: 'multiopticas.com/blog/*', domain: 'multiopticas.com', filter: null, limit: 200, from: '20170101000000' },
  { pattern: 'opticasflorida.com/blog/*', domain: 'opticasflorida.com', filter: null, limit: 220, from: '20160101000000' },
  { pattern: 'opticagasset.com/gafas/*', domain: 'opticagasset.com', filter: null, limit: 200, from: '20160101000000' },
  { pattern: 'opticafernandezbaca.com/blogs/news/*', domain: 'opticafernandezbaca.com', filter: null, limit: 200, from: '20160101000000' },
  { pattern: 'gafasworld.es/blog/*', domain: 'gafasworld.es', filter: null, limit: 180, from: '20170101000000' },
  { pattern: 'misterspex.es/blog/*', domain: 'misterspex.es', filter: null, limit: 180, from: '20170101000000' },
  { pattern: 'tiwi.es/*', domain: 'tiwi.es', filter: null, limit: 160, from: '20170101000000' },
  { pattern: 'pjlobster.com/blogs/*', domain: 'pjlobster.com', filter: null, limit: 160, from: '20180101000000' },
  { pattern: 'gafasvintage.com/*', domain: 'gafasvintage.com', filter: null, limit: 160, from: '20150101000000' },
  { pattern: 'milyunagafas.com/*', domain: 'milyunagafas.com', filter: null, limit: 160, from: '20150101000000' },
  { pattern: 'costasoloptica.com/blog/*', domain: 'costasoloptica.com', filter: null, limit: 160, from: '20160101000000' },
  { pattern: 'ricardovillalba.es/blog/*', domain: 'ricardovillalba.es', filter: null, limit: 160, from: '20160101000000' },
  { pattern: 'theindianface.com/blogs/*', domain: 'theindianface.com', filter: CDX_FILTER_COMPACT, limit: 180, from: '20180101000000' },

  // Magazines (narrow 2018-2021 + single-word filter)
  { pattern: 'vogue.es/moda/tendencias/*', domain: 'vogue.es', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'vogue.es/moda/articulos/*', domain: 'vogue.es', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'telva.com/moda/accesorios/*', domain: 'telva.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'telva.com/moda/tendencias/*', domain: 'telva.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'harpersbazaar.com/es/moda/*', domain: 'harpersbazaar.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'smoda.elpais.com/moda/*', domain: 'smoda.elpais.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'mujerhoy.com/moda/*', domain: 'mujerhoy.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'cosmopolitan.com/es/moda/*', domain: 'cosmopolitan.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'trendencias.com/complementos-ellas/*', domain: 'trendencias.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'trendencias.com/tendencias/*', domain: 'trendencias.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'trendenciashombre.com/complementos/*', domain: 'trendenciashombre.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20170101000000' },
  { pattern: 'revistagq.com/moda/relojes-y-accesorios/*', domain: 'revistagq.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20170101000000' },
  { pattern: 'esquire.com/es/moda-hombre/*', domain: 'esquire.com', filter: CDX_FILTER_COMPACT, limit: 160, from: '20180101000000' },
  { pattern: 'clara.es/moda/*', domain: 'clara.es', filter: CDX_FILTER_COMPACT, limit: 150, from: '20180101000000' },
  { pattern: 'instyle.es/moda/*', domain: 'instyle.es', filter: CDX_FILTER_COMPACT, limit: 150, from: '20180101000000' },
  { pattern: 'diariofemenino.com/moda/*', domain: 'diariofemenino.com', filter: CDX_FILTER_COMPACT, limit: 150, from: '20170101000000' },
  { pattern: 'okchicas.com/moda/*', domain: 'okchicas.com', filter: CDX_FILTER_COMPACT, limit: 150, from: '20170101000000' }
];

const CLINICAL_EXCLUDED_DOMAINS = new Set([
  'barraquer.com',
  'clinicabaviera.com',
  'fernandez-vega.com',
  'icrcat.com',
  'oftalvist.es',
  'qvision.es',
  'visiondirect.es',
  'es.wikipedia.org',
  'optimoda.es'
]);

const MAX_TOTAL_HARVEST = 520;
const MAX_PER_DOMAIN = 75;
const MAX_PER_THEME = 165;
const MAX_POLARIZED_DRIVING = 25;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  return out.replace(/\u00a0/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/\s+/g, ' ').trim();
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

function isJunkUrl(url) {
  if (!url) return true;
  const u = url.toLowerCase();
  if (/web\.archive\.org/.test(u)) return true;
  if (/^https?:\/\/[^/]+\/?(\?.*)?$/.test(u)) return true;
  if (/\/page\/\d+|\/record\/\d+/i.test(u)) return true;
  if (/(202[2-9]|20[3-9]\d)/i.test(u)) return true;
  if (/\?(replytocom|share|amp|utm_|lang|s=|p=|sort|filter|page)=/i.test(u)) return true;
  if (/[?&]amp\b|\/amp\/?$/i.test(u)) return true;
  if (/\/(feed|rss|tag|tags|category|categoria|author|autor|wp-json|wp-content|carrito|cart|checkout|login|account|mi-cuenta)\b/i.test(u)) return true;
  if (/\/(producto|product|productos|products|collections|tienda|shop)\//i.test(u) && !/\/blogs?\//i.test(u)) return true;
  if (/\/(ca|en|de|fr|it|pt|ru|nl|pl)\//i.test(u)) return true;
  if (/\/a\/lang\//i.test(u)) return true;
  if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|css|js|xml|ico|woff2?)(\?.*)?$/i.test(u)) return true;
  if (/(miopia|cataratas|glaucoma|astigmatismo|presbicia|lentillas|lentes-de-contacto|ojo-seco|cirugia|oftalmolog|ninos|infantil|bebe|limpiar|covid|mascarilla|black-friday|rebajas|promocion|descuento|sorteo|regalar|regalo|navidad|dia-de-la-madre|ciclismo|running|deport|ski|snowboard|moto|maquillaje|pestanas|beckham|kendall|bella-hadid|men-in-black|matrix|snapchat)/i.test(u)) return true;
  return false;
}

function isEyewearRelevantUrl(url, hasCdxFilter) {
  if (hasCdxFilter) return true;
  const u = url.toLowerCase();
  return /(gafas|montura|lentes|sol|visagismo|rostro|cara|acetato|carey|boho|bohemio|vintage|retro|estilo|tendencia|moda|color|forma|redonda|cuadrada|aviador|cat-eye|material|titanio|pasta|polarizad|uv|elegir|escoger|combinar|primavera|verano|otono)/i.test(u);
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
    if (closeStart - openEnd < 12000) {
      out.push(html.slice(openEnd + 1, closeStart));
    }
    pos = closeStart + 4;
  }
  return out;
}

function verifyPre2022Date(html, snap, finalUrl) {
  if (!snap || !snap.timestamp || snap.timestamp > '20211231235959') return null;

  const finalWbMatch = (finalUrl || '').match(/web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})/);
  const wbDate = finalWbMatch
    ? `${finalWbMatch[1]}-${finalWbMatch[2]}-${finalWbMatch[3]}`
    : `${snap.timestamp.slice(0, 4)}-${snap.timestamp.slice(4, 6)}-${snap.timestamp.slice(6, 8)}`;

  if (wbDate >= '2022-01-01' || wbDate < '2004-01-01') return null;

  const explicitPubChecks = [
    /property=["']article:published_time["'][^>]*content=["'](\d{4}-\d{2}-\d{2})/i,
    /content=["'](\d{4}-\d{2}-\d{2})[^"']*["'][^>]*property=["']article:published_time["']/i,
    /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i,
    /name=["']pubdate["'][^>]*content=["'](\d{4}-\d{2}-\d{2})/i
  ];
  for (const rx of explicitPubChecks) {
    const m = html.match(rx);
    if (m && m[1] >= '2022-01-01') return null;
  }

  const detected = detectPublishDate(html, snap.originalUrl);
  if (detected && detected.date) {
    if (detected.date >= '2022-01-01' || detected.date < '2004-01-01') return null;
    return { date: detected.date, method: detected.method };
  }

  return { date: wbDate, method: 'wayback_machine_timestamp' };
}

function extractArticleParagraphs(rawHtml) {
  let cleaned = stripHtmlCommentsFast(rawHtml);
  cleaned = stripTagsFast(cleaned, [
    'script', 'style', 'noscript', 'svg',
    'header', 'footer', 'nav', 'aside', 'form', 'figcaption', 'blockquote'
  ]);

  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch && (articleMatch[1].match(/<p\b/gi) || []).length >= 3) {
    cleaned = articleMatch[1];
  } else {
    const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch && (mainMatch[1].match(/<p\b/gi) || []).length >= 3) {
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
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 14 || words.length > 360) continue;

    if (/(?:cookies|política de privacidad|aviso legal|todos los derechos reservados|newsletter|suscríbete|comparte este|compartir en|síguenos en|lee también|te puede interesar|contenido patrocinado|enlaces de afiliado|getty images|cordón press|imaxtree|gtres|crédito:|foto:|imagen:|publicado el|actualizado el|redacción|archivo de internet|wayback machine|internet archive)/i.test(text)) {
      continue;
    }
    if (/^[—\-–•*▶►]/.test(text) || /^P:\s|^R:\s|^Pregunta:/i.test(text)) continue;
    if (/https?:\/\/|www\.|@[a-z0-9_]+/i.test(text)) continue;

    paragraphs.push({ text, word_count: words.length });
  }

  return paragraphs;
}

const CORE_EYEWEAR_RX = /\b(gafas?(?:\s+de\s+sol)?|monturas?|lentes?(?:\s+de\s+sol|\s+solares)?|armaz[oó]n(?:es)?|varillas?|patillas?|visagismo)\b/i;

const ORPHAN_OPENER_RX = /^(?:esto|eso|aquello|ello|este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella|aquellos|aquellas|pero|sin\s+embargo|no\s+obstante|adem[aá]s|tambi[eé]n|asimismo|igualmente|por\s+eso|por\s+tanto|por\s+lo\s+tanto|por\s+consiguiente|de\s+hecho|en\s+cambio|por\s+el\s+contrario|por\s+otro\s+lado|por\s+otra\s+parte|en\s+consecuencia|en\s+este\s+sentido|de\s+este\s+modo|de\s+esta\s+forma|de\s+esta\s+manera|as[ií]\s+que|as[ií]\s+pues|y\s+es\s+que|pues|ya\s+que|mientras\s+tanto|aun\s+as[ií]|con\s+todo|en\s+definitiva|en\s+resumen|en\s+conclusi[oó]n|finalmente|para\s+terminar|por\s+[uú]ltimo|dicho\s+esto|a\s+continuaci[oó]n|como\s+hemos\s+visto|como\s+ya\s+(?:sabemos|vimos|dijimos)|en\s+primer\s+lugar|en\s+segundo\s+lugar|en\s+tercer\s+lugar|otra\s+(?:opci[oó]n|alternativa|propuesta|clave|posibilidad|ventaja|caracter[ií]stica|novedad)|otro\s+(?:modelo|dise[nñ]o|punto|aspecto|detalle|factor|ejemplo)|otras?\s+(?:gafas|monturas|opciones|lentes)|las?\s+(?:primeras?|segundas?|terceras?|anteriores|siguientes)|los?\s+(?:primeros?|segundos?|terceros?|anteriores|siguientes)|unos?\s+de\s+ellos|unas?\s+de\s+ellas|algunos?\s+de\s+ellos|algunas?\s+de\s+ellas|su\s+(?:dise[nñ]o|montura|estructura|est[eé]tica|forma|color|estilo|acabado|puente|peso)|sus\s+(?:lentes|cristales|varillas|patillas|monturas|colores|formas|detalles|l[ií]neas)|toda\s+su|todo\s+su|para\s+lo\s+que|por\s+si\s+eso|el\s+(?:segundo|tercero|siguiente|mismo|otro)\b|la\s+(?:segunda|tercera|siguiente|misma|otra)\b|lo\s+(?:cierto|mejor|peor|mismo|primero|segundo)\s+es\s+que|y\s+|o\s+|ni\s+|aqu[ií]\s+te\b|sum[ae]\s+y\s+sigue|por\s+su\s+parte|todo\s+ello)\b/i;

const ANTI_NOISE_PATTERNS = [
  // Clinical ophthalmology, medical terms & prescription catalog jargon
  /\b(cataratas?|glaucoma|miopia|hipermetropia|astigmatismo|presbicia|vista\s+cansada|lentillas?|lentes?\s+de\s+contacto|cirugia|laser|lasik|colirio|lagrimas?\s+artificiales|dioptrias?|graduacion(?:es)?|graduad[oa]s?|graduarse|pregraduad[oa]s?|gafas?\s+de\s+vista|gafas?\s+de\s+ver|gafa\s+normal|pupilas?|conjuntivitis|retina|cornea|macula|cristalino|oftalmolog[oa]s?|oftalmologia|optometrista|ambliopia|estrabismo|ojo\s+vago|ojo\s+seco|sequedad\s+ocular|tonometro|lampara\s+de\s+hendidura|patologia|sintomas|cefalea|migrana|fatiga\s+visual|luz\s+azul|blue\s*block|hidrogel|silicona|tumores?|parpados?|salud\s+visual|revision\s+visual|examen\s+visual|agudeza\s+visual|clinica|medico|medica|pacientes?|postoperatorio|quirurgic[oa]s?|fotofobia|diplopia|blefaritis|queratitis|progresiv[oa]s?|monofocal(?:es)?|bifocal(?:es)?|ocupacional(?:es)?|asferic[oa]s?|refractiva|optica\s+oftalmica|hormona|melatonina|melotonina|impulso\s+sexual|arrugas?)\b/i,
  // Kids, cleaning, COVID
  /\b(nin[oa]s?|bebes?|peques|infantil(?:es)?|pediatric[oa]s?|junior)\b/i,
  /\b(limpiar|limpieza|agua\s+y\s+jabon|jabon\s+neutro|rayones?|rayaduras?|rallad[oa]|rayad[oa]s?|rayen|pano\s+de\s+microfibra|gamuza|toallita|ultrasonidos?)\b/i,
  /\b(mascarillas?|vuelta\s+al\s+cole|pandemia|covid|coronavirus|confinamiento|cuarentena|desescalada|teletrabajo|nueva\s+normalidad)\b/i,
  // Commercial CTAs, prices, promos, e-commerce, shipping, non-frame accessories, tech gadgets
  /\b(anadir\s+al\s+carrito|carrito|cesta|envio\s+gratis|envios|gastos\s+de\s+envio|descuento|codigo\s+promocional|cupon|comprar|compra\s+ahora|hazte\s+con|consiguelas|adquierelas|encuentralas|disponibles?\s+en\s+(?:nuestras?|tiendas?|web|stock|online|exclusiva)|disponibles?\s+por|puedes\s+ver|ver\s+aqui|2x1|black\s+friday|rebajas|ofertas?|chollos?|catalogo|haz\s+cli[ck]+|hacer\s+clic|nuestras?\s+tiendas?|tienda\s+online|centros?\s+(?:de\s+salud\s+visual|opticos)|p\.?v\.?p\.?|c\.?p\.?v\.?|ref\.|euros?|libras?|dolares?|precio|precios|barat[oa]s?|economic[oa]s?|en\s+exclusiva|exclusivas?\s+gafas|te\s+traemos|a\s+continuacion|dia\s+de\s+la\s+madre|navidad(?:es)?|nochebuena|papa\s+noel|reyes\s+magos|amigo\s+invisible|regales|regala|regalar|en\s+la\s+fotografia|en\s+las\s+imagenes|en\s+la\s+galeria|en\s+esta\s+foto|en\s+la\s+imagen|esta\s+noticia|distribuidor\s+oficial|100%\s+originales?|newsletter|suscribete|sorteo|cadenas?\s+para\s+(?:las\s+)?gafas|cordones?|por\s+solo|para\s+quedar\s+como|para\s+ser\s+fashion|siguiente\s+link|link|enlace|snapchat|spectacles|google\s+glass|pantallas?\s+(?:de\s+luz\s+)?led|cristal\s+liquido|fashion|polarized|runner|app|mashable)\b|[€$£&]/i,
  // SKU codes & model catalog codes (allowing optical terms UV400, UV380, TR90, CR39, EN1836, ISO...)
  /\b(?:rb|po|pr|tf|ft|gg|dg|ch|oo|ox|vo|mk|be|ea|ve|sl|cl|or|ar|pld|sf|vs|ck|mj|bv)[-\s]?\d{3,5}[a-z0-9]*\b/i,
  /(?!\b(?:uv\d{3}|tr90|cr39|en\d{4}|iso\d+)\b)\b[a-z]{1,3}[-]?\d{3,5}[a-z0-9]{0,3}\b/i,
  // Concrete eyewear brands, luxury houses, and retail optical chains (keeps donor pool brand-independent)
  /\b(optica\s+bassol|bassol|general\s+optica|optica\s+universitaria|alain\s+afflelou|afflelou|multiopticas|federopticos|gafasworld|visual-?click|the\s+indian\s+face|hanukeii|vipsual|cottet|milyunagafas|opticalia|hawkers|mr\.?\s*boho|etnia\s+barcelona|optica\s*2000|masvision|soloptical|visionlab|mister\s*spex|lord\s+wilmore|p\.?j\.?\s*lobster|miller\s*&?\s*marc|millerandmarc|tiwi|woodys|persol|prada|ray[-\s]*ban|gucci|chloe|tom\s+ford|oliver\s+peoples|carrera|polaroid|burberry|celine|moschino|oakley|maui\s+jim|chanel|dior|versace|fendi|saint\s+laurent|givenchy|bottega\s+veneta|dolce\s*&?\s*gabbana|armani|balenciaga|loewe|bvlgari|cartier|miu\s*miu|valentino|jacquemus|off-?white|isabel\s+marant|ralph\s+lauren|michael\s+kors|guess|carolina\s+herrera|tous|scalpers|lozza|dsquared2|converse|kenzo|kaleos|laveta|palens|smith|chopard|police|adidas|nike|puma|reebok|radar|asos|urban\s+outfitters|zara|mango|hm|bershka|stradivarius|pull\s*&\s*bear|el\s+corte\s+ingles|amazon|bimba\s+y\s+lola|parfois|clubmaster|wayfarer|memorias\s+de\s+africa|kris\s+van\s+assche)\b/i,
  // Hip-hop, sports, royalty, off-topic garments/products/makeup
  /\b(hip-?hop|rap|raper[oa]s?|trap|reggaeton|streetwear|sneakers|zapatillas|sudaderas|chandal|joggers|gorras|deporte|deportes|deportiv[oa]s?|deportistas?|ciclismo|ciclistas?|bici|bicicleta|pesca|trekking|senderismo|running|atleta|atletismo|futbol|futbolista|exfutbolista|tenis|tenista|padel|baloncesto|golf|esqui|ski|snowboard|surf|nieve|moto|alta\s+montana|montanismo|alpinismo|natacion|triatlon|formula\s*1|olimpic[oa]s?|wimbledon|gimnasio|fitness|realeza|monarquia|familia\s+real|princesa|principe|reina|rey|duque|duquesa|infanta|casa\s+real|coronacion|boda\s+real|chaqueta\s+de\s+aviador|cazadora\s+de\s+aviador|cazadora\s+de\s+piel|el\s+aviador|camara\s+fotografica|teleobjetivo|parabrisas|maquillaje|eyeliner|rimel|pintalabios|colorete|manicura|mascara\s+de\s+pestanas|pestanas|zapatos|tacones|sandalias|botas|botines)\b/i,
  // Concrete celebrities, social media, gossip, movies
  /\b(celebrity|celebrities|celeb|famos[oa]s?|actriz|actor|cantante|supermodelo|top\s+model|las\s+modelos|la\s+modelo|del\s+ingles|estrella\s+de\s+hollywood|hollywood|alfombra\s+roja|oscars?|cannes|goya|met\s+gala|grammy|emmy|influencer|influencers?|instagram|instagrammers?|tik\s*tok|youtube|youtuber|blogger|it-?girl|socialite|aristocrata|paparazzi|telecinco|gran\s+hermano|mad\s+men|marvel|netflix|matrix|men\s+in\s+black|generacion\s+z|beyonce|beckham|chalamet|dicaprio|kardashian|hadid|jenner|kendall|bella|bieber|rihanna|madonna|katy\s+perry|taylor\s+swift|lady\s+gaga|audrey\s+hepburn|hepburn|marilyn\s+monroe|grace\s+kelly|jackie\s+kennedy|onassis|brigitte\s+bardot|sophia\s+loren|elton\s+john|john\s+lennon|lennon|kurt\s+cobain|james\s+dean|steve\s+mcqueen|tom\s+cruise|brad\s+pitt|johnny\s+depp|robert\s+redford|cary\s+grant|ozzy\s+osbourne|le\s+corbusier|le\s+corbursier|sara\s+carbonero|paula\s+echevarria|dulceida|chiara\s+ferragni|alexa\s+chung|kate\s+moss|sienna\s+miller|olivia\s+palermo|nicole\s+richie|olsen|twiggy|karl\s+lagerfeld|anna\s+wintour|iris\s+apfel|letizia|meghan\s+markle|kate\s+middleton|lady\s+di|diana\s+de\s+gales|bad\s+bunny|rosalia|tangana|kanye|jay-?z|pharrell|eminem|drake|maluma)\b/i,
  // Typos, dangling demonstratives & frozen 4-digit years / ephemeral markers
  /\b(en\s+cuento\s+a|a\s+penas|con\s+est[ea]\s+(?:corte|forma|tipo)|donde\s+la\s+mayoria|metalicos|elijes|esta\s+hechas)\b/i,
  /\b(19\d\d|20[0-2]\d)\b/,
  /\b(este\s+ano|el\s+ano\s+pasado|este\s+invierno|este\s+verano|este\s+otono|esta\s+primavera|esta\s+temporada|temporada\s+pasada|la\s+pasada\s+temporada|proxima\s+temporada|hace\s+(?:unos|varios|cuatro)\s+anos|hace\s+unas\s+semanas|en\s+julio|en\s+agosto|en\s+enero|hoy\s+en\s+dia|ultimamente|actualmente|esta\s+semana)\b/i
];

function isSpanishText(text) {
  if (/\b(the|and|with|your|this|that|are|from|which|sunglasses|eyewear|features|shipping|available)\b/i.test(text)) return false;
  if (/\b(amb|aquest|aquesta|aquests|aquestes|dels|ulleres|perqu[eè]|tamb[eé]|mateix|dones)\b/i.test(text)) return false;
  if (/\b(avec|pour|dans|sont|cette|ces|lunettes|soleil|visage|vous|nous)\b/i.test(text)) return false;
  if (/\b(und|mit|f[uü]r|sonnenbrille|brillen)\b/i.test(text)) return false;
  if (/\b(n[aã]o|s[aã]o|tamb[eé]m|voc[eê]|[oó]culos)\b/i.test(text)) return false;
  if (/\b(degli|questo|questa|occhiali|perch[eé])\b/i.test(text)) return false;

  const tokens = text.toLowerCase().match(/[a-záéíóúüñ]+/g) || [];
  if (tokens.length < 18) return false;
  const esStop = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
    'en', 'con', 'por', 'para', 'sin', 'sobre', 'que', 'y', 'o', 'es', 'son',
    'se', 'su', 'sus', 'al', 'como', 'pero', 'más', 'si', 'muy', 'este',
    'esta', 'estas', 'estos', 'entre', 'desde', 'hacia', 'también'
  ]);
  let stopCount = 0;
  for (const t of tokens) {
    if (esStop.has(t)) stopCount++;
  }
  return stopCount / tokens.length >= 0.18 && stopCount >= 4;
}

function splitSentencesSafe(text) {
  const masked = text
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

function hasCleanParens(text) {
  let depth = 0;
  let count = 0;
  let inParen = '';
  for (const ch of text) {
    if (ch === '(') {
      if (depth > 0) return false;
      depth = 1;
      count++;
      inParen = '';
    } else if (ch === ')') {
      if (depth === 0) return false;
      depth = 0;
      const inner = inParen.trim();
      if (inner.length < 2 || inner.length > 55) return false;
      if (/\d/.test(inner) && !/^uv\s*400$/i.test(inner)) return false;
    } else if (depth === 1) {
      inParen += ch;
    }
  }
  return depth === 0 && count <= 2;
}

function passesV3Hygiene(text) {
  if (!text || text.length < 150) return false;
  if (/[“”"«»'’‘\[\]{}|©®™#?!]/.test(text)) return false;
  if (!hasCleanParens(text)) return false;
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFFFD]/u.test(text)) return false;
  if (/Ã¡|Ã©|Ã­|Ã³|Ãº|Ã±|â€/.test(text)) return false;
  if (/\.\./.test(text) || /…/.test(text) || /,\s*\./.test(text) || /,[a-záéíóúüñ]/i.test(text)) return false;
  if (/\b([a-záéíóúüñ]{2,})\s+\1\b/i.test(text)) return false;
  if (/[a-záéíóúüñ]{3}[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]{2}/.test(text)) return false;
  if (/\.[A-ZÁÉÍÓÚÑ]/.test(text)) return false;
  if (/\b[A-ZÁÉÍÓÚÑ]{4,}\b/.test(text.replace(/\b(?:UV|UV400)\b/g, ''))) return false;
  if (/[a-záéíóúüñ,]\s+[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]{2,}\s+[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]{2,}/.test(text)) return false;
  if (!/^[A-ZÁÉÍÓÚÑ]/.test(text) || !/\.$/.test(text)) return false;
  if (ORPHAN_OPENER_RX.test(text)) return false;
  if (!CORE_EYEWEAR_RX.test(text)) return false;

  const sents = splitSentencesSafe(text);
  if (sents.length < 2 || sents.length > 4) return false;
  if (sents[0].split(/\s+/).filter(Boolean).length < 6) return false;
  if (/^(?:lentes|gafas|monturas|cristales)\s+con\s+/i.test(sents[0]) && !/\b(?:son|están|tienen|cuentan|ofrecen|aportan|resultan|protegen|suavizan|equilibran|combinan|permiten|ayudan|destacan|favorecen|poseen|incluyen|llevan|brindan|garantizan|evitan|reducen)\b/i.test(sents[0])) {
    return false;
  }
  const eyeHits = (text.match(/\b(gafas?|monturas?|lentes?|cristales?|armaz[oó]n(?:es)?|varillas?|patillas?|puente|bisagras?|visagismo|rostro|facciones)\b/gi) || []).length;
  const s1Eyewear = CORE_EYEWEAR_RX.test(sents[0]) && /\b(rostro|cara|facciones|montura|lentes|cristales|acetato|carey|havana|ámbar|ocre|miel|tierra|pasta|metal|varillas|patillas|puente|bisagras|uv|polarizad|estiliza|equilibra|favorece|protegen|boho|bohemi|vintage|retro|setenter|redond|cuadrad|aviador|cat-?eye|geom[eé]tric|liger|comodidad|confort)\b/i.test(text);
  if (eyeHits < 2 && !s1Eyewear) return false;

  const folded = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const rx of ANTI_NOISE_PATTERNS) {
    if (rx.test(folded)) return false;
  }
  if (/\bpesad[oa]s?\b/i.test(text) && /\bligereza\b/i.test(text)) return false;
  if (!isSpanishText(text)) return false;
  return true;
}

function classifyV3Theme(text) {
  const s = {
    COLORIMETRY_EARTH_TONES: 0,
    BOHO_VINTAGE_HERITAGE: 0,
    SHAPES_VISAGISM: 0,
    MATERIALS_FINISHES: 0
  };

  if (/\b(carey|havana|habana|[aá]mbar|ocre|miel|marr[oó]n(?:\s+c[aá]lido)?|tonos?\s+tierra|tonalidades?\s+tierra|colores?\s+tierra|verde\s+oliva|verde\s+botella|beige|beis|camel|arena|tabaco|casta[nñ]o|avellana|terracota|lino|algod[oó]n|tonos?\s+neutros?|paleta\s+(?:neutra|crom[aá]tica|c[aá]lida)|colorimetr[ií]a|colores?\s+c[aá]lidos?|tonos?\s+c[aá]lidos?|tejidos?\s+naturales?|subtono|color\s+de\s+(?:piel|pelo|cabello|ojos)|piel(?:es)?\s+(?:claras?|oscuras?|morenas?|c[aá]lidas?)|cabello\s+(?:rubio|moreno|casta[nñ]o|pelirrojo|oscuro|claro))\b/i.test(text)) {
    s.COLORIMETRY_EARTH_TONES += 5;
    if (/\b(carey|havana|habana|[aá]mbar|ocre|miel|verde\s+oliva|verde\s+botella|lino|algod[oó]n|tonos?\s+tierra)\b/i.test(text)) {
      s.COLORIMETRY_EARTH_TONES += 2;
    }
  }

  if (/\b(boho(?:\s+chic)?|bohemi[oa]s?|hippie|setenter[oa]s?|a[nñ]os\s*(?:50|60|70)|setenta|sesenta|vintage|retro|esp[ií]ritu\s+artesanal|aire\s+libre|maxi\s*gafas?|maxigafas)\b/i.test(text)) {
    s.BOHO_VINTAGE_HERITAGE += 4;
    if (/\b(boho|bohemi|hippie|setenter|70|vintage|retro)\b/i.test(text)) {
      s.BOHO_VINTAGE_HERITAGE += 2;
    }
  }

  const hasCleanShape = /\b(redond[oa]s?|redondead[oa]s?|cuadrad[oa]s?|rectangulares?|ovalad[oa]s?|geom[eé]tric[oa]s?|hexagonales?|octogonales?|aviador|piloto|ojos?\s+de\s+gato|cat-?eye|mariposa|pantos|panthos)\b/i.test(text);
  const hasVisagism = /\b(visagismo|rostro|rostros|cara|caras|facciones|rasgos|fisonom[ií]a|p[oó]mulos?|mand[ií]bula|ment[oó]n|frente\s+(?:ancha|estrecha|amplia)|sienes|estilizar|estiliza|estilizan|equilibrar|equilibra|equilibran|suavizar|suaviza|suavizan|armonizar|armoniza|armonizan|dulcificar|dulcifica|dulcifican|afinar|afina|afinan|alargar|alarga|alargan|enmarcar|enmarca|enmarcan|resaltar|resalta|resaltan|armon[ií]a\s+facial|proporciones|[oó]valo|angulosidad|l[ií]neas\s+(?:suaves|rectas|curvas))\b/i.test(text);
  if (hasCleanShape && hasVisagism) {
    s.SHAPES_VISAGISM += 6;
  } else if (/\b(visagismo|rostro\s+(?:redondo|cuadrado|ovalado|alargado|triangular|coraz[oó]n|diamante)|cara\s+(?:redonda|cuadrada|ovalada|alargada|triangular)|estilizar\s+el\s+rostro|equilibrar\s+(?:los\s+rasgos|las\s+facciones)|suavizar\s+las\s+l[ií]neas)\b/i.test(text)) {
    s.SHAPES_VISAGISM += 5;
  }

  if (/\b(acetato(?:\s+pulido|\s+de\s+celulosa|\s+natural|\s+artesanal)?|pasta\s+ligera|monturas?\s+de\s+pasta|metal\s+fino|monturas?\s+met[aá]licas?|dorado\s+envejecido|bronce|titanio|acero\s+inoxidable|bisagras?|varillas|patillas|puente\s+nasal|almohadillas|comodidad|confort|uso\s+prolongado|ligereza|liger[oa]s?|filtros?\s+solares?|filtro\s+uv|uv\s*400|polarizad[oa]s?|cristal\s+mineral|lentes?\s+degradad[oa]s?)\b/i.test(text)) {
    s.MATERIALS_FINISHES += 4;
    if (/\b(acetato|dorado\s+envejecido|bronce|bisagras?|pasta\s+ligera|metal\s+fino|uso\s+prolongado|filtros?\s+solares?)\b/i.test(text)) {
      s.MATERIALS_FINISHES += 2;
    }
  }

  let best = null;
  let bestVal = 0;
  for (const [k, v] of Object.entries(s)) {
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return bestVal >= 4 ? best : null;
}

function getVerticalForTheme(theme) {
  if (theme === 'COLORIMETRY_EARTH_TONES') return 'colorimetry_earth_tones';
  if (theme === 'BOHO_VINTAGE_HERITAGE') return 'boho_vintage_heritage';
  if (theme === 'SHAPES_VISAGISM') return 'shapes_visagism';
  return 'materials_finishes';
}

function buildCandidatesFromParagraphs(paragraphs) {
  const blocks = [];
  const consumedIndices = new Set();

  for (let i = 0; i < paragraphs.length; i++) {
    if (consumedIndices.has(i)) continue;
    const p = paragraphs[i];
    const sents = splitSentencesSafe(p.text);

    if (p.word_count >= 38 && p.word_count <= 115 && sents.length >= 2 && sents.length <= 4) {
      if (passesV3Hygiene(p.text)) {
        blocks.push({ text: p.text, word_count: p.word_count, sent_count: sents.length, merged: false });
        consumedIndices.add(i);
        continue;
      }
    }

    // Sub-window extraction for ANY paragraph with >= 3 sentences (rescues blocks where only 1 sentence had a brand/question/CTA)
    if (sents.length >= 3) {
      for (let start = 0; start <= sents.length - 2; start++) {
        const acc = [];
        let wc = 0;
        for (let end = start; end < Math.min(sents.length, start + 4); end++) {
          acc.push(sents[end]);
          wc += sents[end].split(/\s+/).filter(Boolean).length;
          if (acc.length >= 2 && wc >= 38 && wc <= 115) {
            const candidate = acc.join(' ');
            if (passesV3Hygiene(candidate) && classifyV3Theme(candidate)) {
              blocks.push({ text: candidate, word_count: wc, sent_count: acc.length, merged: false });
              consumedIndices.add(i);
              start = sents.length;
              break;
            }
          }
          if (wc > 115) break;
        }
      }
      if (consumedIndices.has(i)) continue;
    }

    if (i + 1 < paragraphs.length && !consumedIndices.has(i + 1)) {
      const pNext = paragraphs[i + 1];
      if (
        p.word_count >= 14 && p.word_count <= 55 &&
        pNext.word_count >= 14 && pNext.word_count <= 55 &&
        /\.$/.test(p.text) && /\.$/.test(pNext.text)
      ) {
        const combined = `${p.text} ${pNext.text}`;
        const combinedSents = splitSentencesSafe(combined);
        const combinedWc = combined.split(/\s+/).filter(Boolean).length;
        if (combinedWc >= 38 && combinedWc <= 115 && combinedSents.length >= 2 && combinedSents.length <= 4) {
          if (passesV3Hygiene(combined)) {
            blocks.push({ text: combined, word_count: combinedWc, sent_count: combinedSents.length, merged: true });
            consumedIndices.add(i);
            consumedIndices.add(i + 1);
            continue;
          }
        }
      }
    }
  }

  return blocks;
}

function loadExistingDedupeState() {
  const seenNormAscii = new Set();
  const seenNormEs = new Set();
  const seenBlockStems = new Set();
  const seenSentNorms = new Set();
  const seenUrls = new Set();
  const localEvidenceFiles = [];

  const addText = (txt) => {
    if (!txt) return;
    const normAscii = txt.toLowerCase().replace(/[^\w]/g, '');
    if (normAscii) seenNormAscii.add(normAscii);
    const normEs = txt.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
    if (normEs) seenNormEs.add(normEs);
    const blockStem = txt.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 55);
    if (blockStem.length >= 24) seenBlockStems.add(blockStem);
    for (const s of splitSentencesSafe(txt)) {
      const sn = s.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
      if (sn.length >= 26) seenSentNorms.add(sn);
    }
  };

  if (fs.existsSync(MASTER_BANK_PATH)) {
    const master = JSON.parse(fs.readFileSync(MASTER_BANK_PATH, 'utf8'));
    for (const b of master) {
      addText(b.raw_text);
      if (b.original_id && /^https?:\/\//i.test(b.original_id)) {
        seenUrls.add(normalizeUrlKey(b.original_id));
      }
    }
  }

  if (fs.existsSync(MARCOS_DIR)) {
    for (const f of fs.readdirSync(MARCOS_DIR)) {
      if (f.startsWith('golden_') && f.endsWith('.json')) {
        const gData = JSON.parse(fs.readFileSync(path.join(MARCOS_DIR, f), 'utf8'));
        for (const g of gData) addText(g.raw_text || g.text);
      }
    }
  }

  if (fs.existsSync(EVIDENCE_DIR)) {
    for (const f of fs.readdirSync(EVIDENCE_DIR)) {
      if (!f.endsWith('.meta.json')) continue;
      try {
        const metaPath = path.join(EVIDENCE_DIR, f);
        const m = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (m.source_url) seenUrls.add(normalizeUrlKey(m.source_url));
        if (
          m.publish_date &&
          m.publish_date < '2022-01-01' &&
          m.publish_date >= '2004-01-01' &&
          m.source_domain &&
          !CLINICAL_EXCLUDED_DOMAINS.has(m.source_domain)
        ) {
          const htmlPath = metaPath.replace(/\.meta\.json$/, '.html');
          if (fs.existsSync(htmlPath)) {
            localEvidenceFiles.push({ meta: m, htmlPath });
          }
        }
      } catch (_) {}
    }
  }

  return { seenNormAscii, seenNormEs, seenBlockStems, seenSentNorms, seenUrls, localEvidenceFiles, addText };
}

function isDuplicateAndRegister(text, dedupe) {
  const normAscii = text.toLowerCase().replace(/[^\w]/g, '');
  if (!normAscii || dedupe.seenNormAscii.has(normAscii)) return true;

  const normEs = text.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
  if (!normEs || dedupe.seenNormEs.has(normEs)) return true;

  const blockStem = text.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 55);
  if (blockStem.length >= 24 && dedupe.seenBlockStems.has(blockStem)) return true;

  const sents = splitSentencesSafe(text);
  for (const s of sents) {
    const sn = s.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
    if (sn.length >= 26 && dedupe.seenSentNorms.has(sn)) return true;
  }

  dedupe.addText(text);
  return false;
}

function extractAcceptedFromHtml(html, domain, sourceUrl, waybackUrl, pubDate, dateMethod, dedupe, stats) {
  const rawParagraphs = extractArticleParagraphs(html);
  if (rawParagraphs.length < 2) return [];

  const blocks = buildCandidatesFromParagraphs(rawParagraphs);
  const accepted = [];
  let localPolarizedCount = 0;

  for (const b of blocks) {
    if (accepted.length >= 6) break;
    if ((stats.byDomain[domain] || 0) + accepted.length >= MAX_PER_DOMAIN) break;

    const theme = classifyV3Theme(b.text);
    if (!theme) continue;
    const themeAddedInPage = accepted.filter(x => x.gap_category === theme).length;
    if ((stats.byTheme[theme] || 0) + themeAddedInPage >= MAX_PER_THEME) continue;

    const isPolarizedDriving = /\b(conducir|conducci[oó]n|carretera|volante|polarizad[oa]s?)\b/i.test(b.text) && !/\b(acetato|carey|pasta|dorado|bronce|bisagras?|boho|bohemi|vintage|retro|visagismo)\b/i.test(b.text);
    if (isPolarizedDriving && (stats.polarizedDrivingCount + localPolarizedCount) >= MAX_POLARIZED_DRIVING) {
      continue;
    }

    if (isDuplicateAndRegister(b.text, dedupe)) continue;
    if (isPolarizedDriving) localPolarizedCount++;

    accepted.push({
      domain,
      source_url: sourceUrl,
      wayback_url: waybackUrl || null,
      publish_date: pubDate,
      date_method: dateMethod,
      gap_category: theme,
      vertical: getVerticalForTheme(theme),
      is_merged_block: b.merged,
      sentence_count: b.sent_count,
      word_count: b.word_count,
      text: b.text
    });
  }

  return accepted;
}

function scoreUrlForV3Themes(url) {
  const u = (url || '').toLowerCase();
  let score = 0;
  if (/(carey|havana|tierra|color|tono|beige|verde|lino|algodon)/.test(u)) score += 4;
  if (/(boho|bohemio|hippie|vintage|retro|70|setent|artesanal|oversize)/.test(u)) score += 4;
  if (/(visagismo|rostro|cara|facciones|redonda|cuadrada|aviador|cat-eye|ojo-de-gato|forma)/.test(u)) score += 4;
  if (/(acetato|pasta|metal|dorado|bronce|bisagra|material|acabado|comoda|uv)/.test(u)) score += 4;
  if (/(gafas|montura|lentes|tendencia)/.test(u)) score += 2;
  return score;
}

async function queryCDXPolite(target, retries = 2) {
  const fromParam = target.from ? `&from=${target.from}` : '';
  const filterParam = target.filter ? `&filter=original:${encodeURIComponent(target.filter)}` : '';
  const cdxUrl =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target.pattern)}` +
    filterParam +
    `&output=json&filter=statuscode:200&filter=mimetype:text/html` +
    `${fromParam}&to=20211231235959&limit=${target.limit}&collapse=urlkey`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const waitMs = 3500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 1000);
      await sleep(waitMs);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 36000);
    try {
      const res = await fetch(cdxUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.status === 429 || res.status === 503 || res.status >= 500) {
        if (attempt < retries) continue;
        console.warn(`[CDX ${res.status}] ${target.pattern}`);
        return [];
      }
      if (!res.ok) return [];

      const text = await res.text();
      if (!text || text.startsWith('<')) {
        if (attempt < retries) continue;
        return [];
      }
      const data = JSON.parse(text);
      if (!Array.isArray(data) || data.length < 2) return [];

      const headers = data[0];
      const urlIdx = headers.indexOf('original');
      const tsIdx = headers.indexOf('timestamp');
      const snapshots = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const orig = row[urlIdx];
        const ts = row[tsIdx];
        if (!orig || !ts || ts > '20211231235959') continue;
        snapshots.push({
          originalUrl: orig,
          timestamp: ts,
          waybackUrl: `https://web.archive.org/web/${ts}/${orig}`,
          domain: target.domain,
          hasCdxFilter: Boolean(target.filter)
        });
      }
      return snapshots;
    } catch (e) {
      clearTimeout(timer);
      if (attempt >= retries) {
        console.warn(`[CDX WARN] ${target.pattern}: ${e.message}`);
        return [];
      }
    }
  }
  return [];
}

async function fetchWaybackWithRetry(url, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt);
    const res = await fetchUrl(url, 13000);
    if (res && res.html && !/Internet Archive:\s*Temporarily Offline/i.test(res.html)) {
      return res;
    }
  }
  return null;
}

async function run() {
  console.log('=== COSECHADOR EDITORIAL V3 PRE-2022 (TONOS TIERRA, BOHO 70s, VISAGISMO, MATERIALES) ===');
  const evidenceFilesBefore = fs.existsSync(EVIDENCE_DIR) ? fs.readdirSync(EVIDENCE_DIR).filter(f => f.endsWith('.meta.json')).length : 0;
  const dedupe = loadExistingDedupeState();
  console.log(`Dedupe inicial: ${dedupe.seenNormEs.size} textos, ${dedupe.seenUrls.size} URLs en evidencia (${evidenceFilesBefore} .meta.json), ${dedupe.localEvidenceFiles.length} HTMLs locales pre-2022.`);

  const harvested = [];
  const stats = {
    pagesVisited: 0,
    pagesWithAcceptedFromLocal: 0,
    newRawPagesSaved: 0,
    rejectedDate: 0,
    rejectedEmpty: 0,
    polarizedDrivingCount: 0,
    byTheme: {
      COLORIMETRY_EARTH_TONES: 0,
      BOHO_VINTAGE_HERITAGE: 0,
      SHAPES_VISAGISM: 0,
      MATERIALS_FINISHES: 0
    },
    byDomain: {},
    newSnapshotsByDomain: {}
  };

  const registerBatch = (items) => {
    for (const item of items) {
      harvested.push(item);
      stats.byTheme[item.gap_category] = (stats.byTheme[item.gap_category] || 0) + 1;
      stats.byDomain[item.domain] = (stats.byDomain[item.domain] || 0) + 1;
      if (/\b(conducir|conducci[oó]n|carretera|volante|polarizad[oa]s?)\b/i.test(item.text) && !/\b(acetato|carey|pasta|dorado|bronce|bisagras?|boho|bohemi|vintage|retro|visagismo)\b/i.test(item.text)) {
        stats.polarizedDrivingCount++;
      }
    }
  };

  // Phase 1: Clean unused multi-sentence V3 blocks from verified pre-2022 local HTMLs
  for (const ev of dedupe.localEvidenceFiles) {
    if (harvested.length >= MAX_TOTAL_HARVEST) break;
    if (isJunkUrl(ev.meta.source_url)) continue;
    const html = fs.readFileSync(ev.htmlPath, 'utf8');
    const items = extractAcceptedFromHtml(
      html,
      ev.meta.source_domain,
      ev.meta.source_url,
      null,
      ev.meta.publish_date,
      ev.meta.date_verification_method || 'wayback_machine_timestamp',
      dedupe,
      stats
    );
    if (items.length > 0) {
      stats.pagesWithAcceptedFromLocal++;
      registerBatch(items);
    }
  }
  console.log(`[FASE 1 - Evidencia local pre-2022] ${harvested.length} bloques limpios multi-oración de ${stats.pagesWithAcceptedFromLocal} páginas.`);
  console.log('  Fase 1 por tema:', stats.byTheme);

  const localOnly = process.argv.includes('--local-only');
  const cdxUrlKeys = new Set();

  if (!localOnly) {
    console.log('\n[FASE 2] Cosecha incremental Wayback Machine CDX (to=20211231235959)...');
    for (const target of TARGETS) {
      if (harvested.length >= MAX_TOTAL_HARVEST) break;
      if ((stats.byDomain[target.domain] || 0) >= MAX_PER_DOMAIN) continue;

      const snaps = await queryCDXPolite(target, 2);
      const freshSnaps = [];
      for (const s of snaps) {
        if (isJunkUrl(s.originalUrl)) continue;
        if (!isEyewearRelevantUrl(s.originalUrl, s.hasCdxFilter)) continue;
        const normUrl = normalizeUrlKey(s.originalUrl);
        if (!normUrl || dedupe.seenUrls.has(normUrl) || cdxUrlKeys.has(normUrl)) continue;
        cdxUrlKeys.add(normUrl);
        dedupe.seenUrls.add(normUrl);
        freshSnaps.push(s);
      }

      freshSnaps.sort((a, b) => scoreUrlForV3Themes(b.originalUrl) - scoreUrlForV3Themes(a.originalUrl));
      const prioritizedSnaps = freshSnaps.slice(0, 80);

      console.log(`[CDX] ${target.pattern} => ${snaps.length} snapshots, ${freshSnaps.length} URLs nuevas (inspeccionando top ${prioritizedSnaps.length}).`);
      if (prioritizedSnaps.length === 0) {
        await sleep(1000);
        continue;
      }

      let domainNewPages = 0;
      let domainNewBlocks = 0;
      await runConcurrent(prioritizedSnaps, 5, async (snap) => {
        if (harvested.length >= MAX_TOTAL_HARVEST) return;
        if ((stats.byDomain[snap.domain] || 0) >= MAX_PER_DOMAIN) return;
        await sleep(100);
        stats.pagesVisited++;
        const fetched = await fetchWaybackWithRetry(snap.waybackUrl, 1);
        if (!fetched || !fetched.html) {
          stats.rejectedEmpty++;
          return;
        }

        const pubInfo = verifyPre2022Date(fetched.html, snap, fetched.finalUrl);
        if (!pubInfo || pubInfo.date >= '2022-01-01') {
          stats.rejectedDate++;
          return;
        }

        const acceptedForPage = extractAcceptedFromHtml(
          fetched.html,
          snap.domain,
          snap.originalUrl,
          snap.waybackUrl,
          pubInfo.date,
          pubInfo.method,
          dedupe,
          stats
        );

        if (acceptedForPage.length > 0) {
          saveScrapedPage(
            snap.domain,
            snap.originalUrl,
            pubInfo.date,
            pubInfo.method,
            fetched.html,
            acceptedForPage
          );
          stats.newRawPagesSaved++;
          stats.newSnapshotsByDomain[snap.domain] = (stats.newSnapshotsByDomain[snap.domain] || 0) + 1;
          domainNewPages++;
          domainNewBlocks += acceptedForPage.length;
          registerBatch(acceptedForPage);
        }
      });

      if (domainNewBlocks > 0) {
        console.log(`  => +${domainNewBlocks} bloques de ${domainNewPages} snapshots nuevos (${target.domain}) | total acumulado: ${harvested.length}`, stats.byTheme);
      }
      await sleep(1500);
    }
  } else {
    console.log('[MODO --local-only] Omitiendo Fase 2 de red.');
  }

  const evidenceFilesAfter = fs.existsSync(EVIDENCE_DIR) ? fs.readdirSync(EVIDENCE_DIR).filter(f => f.endsWith('.meta.json')).length : 0;
  const actualNewMetaFiles = evidenceFilesAfter - evidenceFilesBefore;

  // Atomic writes for staging JSON and Markdown report
  const tmpJson = `${OUT_STAGING_JSON}.tmp`;
  fs.writeFileSync(tmpJson, JSON.stringify(harvested, null, 2), 'utf8');
  fs.renameSync(tmpJson, OUT_STAGING_JSON);

  const reportLines = [
    '# Reporte de Cosecha Pre-2022: Cobertura de Huecos Editoriales y Ópticos (V3)',
    `**Fecha:** ${new Date().toISOString()}`,
    `**Filtro CDX:** \`to=20211231235959\`, \`statuscode:200\`, \`mimetype:text/html\`, \`collapse=urlkey\``,
    '',
    '## 1. Resumen de Ejecución',
    `* **Bloques extraídos de evidencia local pre-2022 reutilizable:** ${harvested.filter(x => !x.wayback_url).length} (de ${stats.pagesWithAcceptedFromLocal} páginas)`,
    `* **URLs nuevas inspeccionadas en Wayback Machine (Fase 2):** ${stats.pagesVisited}`,
    `* **Nuevos snapshots crudos guardados en \`raw_web_evidence/\`:** ${stats.newRawPagesSaved} (incremento neto de archivos .meta.json/.html: ${actualNewMetaFiles})`,
    `* **Páginas descartadas por fecha >= 2022 o sin fecha válida:** ${stats.rejectedDate}`,
    `* **Total de bloques multi-oración (2-4 oraciones, 38-115 palabras) aprobados:** ${harvested.length}`,
    '',
    '## 2. Desglose por los 4 Temas Objetivo',
    '| Tema V3 | Bloques Extraídos |',
    '| :--- | :---: |',
    ...Object.entries(stats.byTheme).map(([g, c]) => `| **${g}** | ${c} |`),
    '',
    '## 3. Desglose por Dominio (Bloques)',
    '| Dominio Fuente | Bloques | Snapshots Nuevos |',
    '| :--- | :---: | :---: |',
    ...Object.entries(stats.byDomain)
      .sort((a, b) => b[1] - a[1])
      .map(([d, c]) => `| \`${d}\` | ${c} | ${stats.newSnapshotsByDomain[d] || 0} |`),
    '',
    '## 4. Muestras Literales Extraídas',
    ...Object.keys(stats.byTheme).flatMap(g => {
      const sample = harvested.find(x => x.gap_category === g && x.wayback_url) || harvested.find(x => x.gap_category === g);
      if (!sample) return [];
      return [
        `### ${g} (${sample.domain}, ${sample.publish_date})`,
        `> ${sample.text}`,
        `*URL:* ${sample.source_url}`,
        ''
      ];
    })
  ];

  const tmpMd = `${OUT_REPORT_MD}.tmp`;
  fs.writeFileSync(tmpMd, reportLines.join('\n'), 'utf8');
  fs.renameSync(tmpMd, OUT_REPORT_MD);

  console.log('\n======================================================');
  console.log(`COSECHA V3 COMPLETADA: ${harvested.length} bloques limpios multi-oración.`);
  console.log(`Nuevas páginas/snapshots guardados en raw_web_evidence/: ${stats.newRawPagesSaved} (neto nuevos pares: ${actualNewMetaFiles})`);
  console.log('Desglose por tema:', stats.byTheme);
  console.log('Top dominios:', Object.entries(stats.byDomain).sort((a, b) => b[1] - a[1]).slice(0, 15));
  console.log(`Staging guardado en: ${OUT_STAGING_JSON}`);
  console.log(`Reporte guardado en: ${OUT_REPORT_MD}`);
  console.log('======================================================');
}

run().catch(err => {
  console.error('Error fatal en harvest_editorial_gaps_v3:', err);
  process.exit(1);
});
