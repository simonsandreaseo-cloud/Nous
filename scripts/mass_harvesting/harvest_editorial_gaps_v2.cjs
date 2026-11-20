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
const OUT_STAGING_JSON = path.join(STAGING_DIR, 'harvested_editorial_gaps_v2.json');
const OUT_REPORT_MD = path.join(STAGING_DIR, 'REPORTE_COSECHA_V2.md');

const CDX_FILTER_MAIN = '.*(gafas|montura|lentes-de-sol|visagismo|acetato|boho|vintage|aviador|redondas|carey).*';
const CDX_FILTER_STYLE = '.*(gafas|montura|lentes|visagismo|acetato|boho|bohemio|hippie|vintage|retro|aviador|redondas|cuadradas|cat-eye|carey|oversize).*';

const TARGETS = [
  // Editorial Spanish magazines
  { pattern: 'vogue.es/moda/*', domain: 'vogue.es', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'vogue.es/moda/tendencias/*', domain: 'vogue.es', filter: '.*(gafas|montura|lentes-de-sol|visagismo|carey|aviador).*', limit: 80, from: '20150101000000' },
  { pattern: 'vogue.es/belleza/*', domain: 'vogue.es', filter: '.*(gafas|rostro|visagismo).*', limit: 60, from: '20150101000000' },
  { pattern: 'telva.com/moda/*', domain: 'telva.com', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'elle.com/es/moda/*', domain: 'elle.com', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'harpersbazaar.com/es/moda/*', domain: 'harpersbazaar.com', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'revistagq.com/moda/*', domain: 'revistagq.com', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'esquire.com/es/moda-hombre/*', domain: 'esquire.com', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'smoda.elpais.com/moda/*', domain: 'smoda.elpais.com', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'glamour.es/moda/tendencias/*', domain: 'glamour.es', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'cosmopolitan.com/es/moda/*', domain: 'cosmopolitan.com', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'trendencias.com/complementos/*', domain: 'trendencias.com', filter: CDX_FILTER_STYLE, limit: 120, from: '20130101000000' },
  { pattern: 'trendencias.com/complementos-ellas/*', domain: 'trendencias.com', filter: CDX_FILTER_STYLE, limit: 120, from: '20130101000000' },
  { pattern: 'trendencias.com/propuestas-y-consejos/*', domain: 'trendencias.com', filter: CDX_FILTER_STYLE, limit: 120, from: '20130101000000' },
  { pattern: 'trendencias.com/tendencias/*', domain: 'trendencias.com', filter: CDX_FILTER_MAIN, limit: 120, from: '20130101000000' },
  { pattern: 'trendenciashombre.com/complementos/*', domain: 'trendenciashombre.com', filter: CDX_FILTER_STYLE, limit: 120, from: '20120101000000' },
  { pattern: 'trendenciashombre.com/tendencias/*', domain: 'trendenciashombre.com', filter: CDX_FILTER_MAIN, limit: 100, from: '20120101000000' },
  { pattern: 'mujerhoy.com/moda/*', domain: 'mujerhoy.com', filter: CDX_FILTER_MAIN, limit: 120, from: '20140101000000' },
  { pattern: 'hola.com/moda/*', domain: 'hola.com', filter: '.*(gafas|montura|lentes-de-sol|visagismo).*', limit: 100, from: '20180101000000' },

  // Optical / boutique non-clinical blogs
  { pattern: 'milyunagafas.com/*', domain: 'milyunagafas.com', filter: CDX_FILTER_STYLE, limit: 120, from: null },
  { pattern: 'generaloptica.es/blog/*', domain: 'generaloptica.es', filter: CDX_FILTER_STYLE, limit: 120, from: null },
  { pattern: 'opticauniversitaria.es/*', domain: 'opticauniversitaria.es', filter: CDX_FILTER_MAIN, limit: 120, from: null },
  { pattern: 'multiopticas.com/*', domain: 'multiopticas.com', filter: CDX_FILTER_MAIN, limit: 120, from: null },
  { pattern: 'cottet.es/*', domain: 'cottet.es', filter: CDX_FILTER_MAIN, limit: 120, from: null },
  { pattern: 'cottet.com/es/blog/*', domain: 'cottet.com', filter: CDX_FILTER_STYLE, limit: 120, from: null },
  { pattern: 'federopticos.com/*', domain: 'federopticos.com', filter: CDX_FILTER_MAIN, limit: 120, from: null },
  { pattern: 'opticabassol.com/blog/*', domain: 'opticabassol.com', filter: CDX_FILTER_MAIN, limit: 120, from: null },
  { pattern: 'gafasworld.es/*', domain: 'gafasworld.es', filter: CDX_FILTER_MAIN, limit: 120, from: null },
  { pattern: 'visual-click.com/*', domain: 'visual-click.com', filter: CDX_FILTER_MAIN, limit: 120, from: null },
  { pattern: 'theindianface.com/blogs/*', domain: 'theindianface.com', filter: CDX_FILTER_STYLE, limit: 120, from: null }
];

function decodeAllEntities(str) {
  if (!str) return '';
  let out = decodeHtmlEntities(str);
  out = out
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  return out.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
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
  if (/\?(replytocom|share|amp|utm_|lang|s=|p=|sort|filter|page)=/i.test(u)) return true;
  if (/[?&]amp\b|\/amp\/?$/i.test(u)) return true;
  if (/\/(feed|rss|tag|tags|author|autor|wp-json|wp-content|carrito|cart|checkout|login|account|mi-cuenta)\b/i.test(u)) return true;
  if (/\/(producto|product|productos|products|collections|categoria|category|tienda|shop)\//i.test(u) && !/\/blogs?\//i.test(u)) return true;
  if (/\/(ca|en|de|fr|it|pt|ru|nl|pl)\//i.test(u)) return true;
  if (/\/a\/lang\//i.test(u)) return true;
  if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|css|js|xml|ico|woff2?)(\?.*)?$/i.test(u)) return true;
  return false;
}

async function queryCDXWithRetry(target, retries = 3) {
  const fromParam = target.from ? `&from=${target.from}` : '';
  const cdxUrl =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target.pattern)}` +
    `&filter=original:${encodeURIComponent(target.filter)}` +
    `&output=json&filter=statuscode:200&filter=mimetype:text/html` +
    `${fromParam}&to=20211231235959&limit=${target.limit}&collapse=urlkey`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const waitMs = 3000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 1500);
      await new Promise(r => setTimeout(r, waitMs));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50000);
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
          domain: target.domain
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
    /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i
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
  let cleaned = rawHtml
    .replace(/<!--\s*BEGIN WAYBACK TOOLBAR INSERT\s*-->[\s\S]*?<!--\s*END WAYBACK TOOLBAR INSERT\s*-->/gi, ' ')
    .replace(/<div\s+id=["']wm-ipp-base["'][\s\S]*?<\/div>\s*<!--\s*END WAYBACK TOOLBAR INSERT\s*-->/gi, ' ')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, ' ')
    .replace(/<figcaption\b[^<]*(?:(?!<\/figcaption>)<[^<]*)*<\/figcaption>/gi, ' ')
    .replace(/<blockquote\b[^<]*(?:(?!<\/blockquote>)<[^<]*)*<\/blockquote>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch && (articleMatch[1].match(/<p\b/gi) || []).length >= 3) {
    cleaned = articleMatch[1];
  } else {
    const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch && (mainMatch[1].match(/<p\b/gi) || []).length >= 3) {
      cleaned = mainMatch[1];
    }
  }

  const pMatches = cleaned.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const paragraphs = [];

  for (const rawP of pMatches) {
    const noInline = rawP
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/?(?:strong|b|em|i|a|span|u|abbr|cite|small|mark|sub|sup)\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' ');

    const text = decodeAllEntities(noInline)
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) continue;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 10 || words.length > 180) continue;

    if (/(?:cookies|política de privacidad|aviso legal|todos los derechos reservados|newsletter|suscríbete|comparte este|compartir en|síguenos en|lee también|te puede interesar|contenido patrocinado|enlaces de afiliado|getty images|cordón press|imaxtree|gtres|crédito:|foto:|imagen:|publicado el|actualizado el|redacción|archivo de internet|wayback machine)/i.test(text)) {
      continue;
    }
    if (/^[—\-–•*▶►]/.test(text) || /^P:\s|^R:\s|^Pregunta:/i.test(text)) continue;
    if (/https?:\/\/|www\.|@[a-z0-9_]+/i.test(text)) continue;

    paragraphs.push({ text, word_count: words.length });
  }

  return paragraphs;
}

// Strict eyewear anchor requirement: never match dress crystals or leather aviator jackets
const CORE_EYEWEAR_RX = /\b(gafas?(?:\s+de\s+sol)?|monturas?|lentes?(?:\s+de\s+sol|\s+solares)?|armaz[oó]n(?:es)?|varillas?|patillas?|visagismo)\b/i;

const ANTI_NOISE_PATTERNS = [
  // Clinical ophthalmology, medical terms & prescription eyewear (matched on accent-folded ASCII text)
  /\b(cataratas?|glaucoma|miopia|hipermetropia|astigmatismo|presbicia|vista\s+cansada|lentillas?|lentes?\s+de\s+contacto|cirugia|colirio|lagrimas?\s+artificiales|dioptrias?|graduacion|graduad[oa]s?|graduarse|pregraduad[oa]s?|gafas?\s+de\s+vista|gafa\s+normal|pupilas?|conjuntivitis|retina|cornea|macula|cristalino|oftalmolog[oa]s?|oftalmologia|optometrista|ambliopia|estrabismo|ojo\s+vago|ojo\s+seco|sequedad\s+ocular|tonometro|lampara\s+de\s+hendidura|patologia|sintomas|cefalea|migrana|fatiga\s+visual|luz\s+azul|blue\s*block|hidrogel|tumores?|parpados?)\b/i,
  // Kids / babies
  /\b(nin[oa]s?|bebes?|peques|infantil(?:es)?|pediatric[oa]s?)\b/i,
  // Cleaning / scratches
  /\b(limpiar|limpieza|agua\s+y\s+jabon|jabon\s+neutro|rayones?|rayaduras?|rallad[oa]|rayad[oa]s?|rayen|pano(?:\s+de\s+microfibra)?|gamuza|toallita|ultrasonidos?)\b/i,
  // Climate / COVID / back to school
  /\b(mascarillas?|lluvia|vuelta\s+al\s+cole|volver\s+al\s+trabajo|pandemia|covid|coronavirus|confinamiento|cuarentena|desescalada|teletrabajo|nueva\s+normalidad|cambio\s+climatico)\b/i,
  // Commercial CTAs / pricing / store links / references / campaigns
  /\b(anadir\s+al\s+carrito|carrito|cesta|envio\s+gratis|descuento|codigo\s+promocional|cupon|comprar\s+aqui|compra\s+ahora|hazte\s+con|consiguelas|adquierelas|2x1|black\s+friday|rebajas|catalogo|haz\s+cli[ck]+|hacer\s+clic|nuestras?\s+tiendas?|tienda\s+online|centros?\s+de\s+salud\s+visual|enamorate|te\s+quedarias|p\.?v\.?p\.?|c\.?p\.?v\.?|ref\.|euros?|libras?|dolares?|ver\s+gafas\s+aqui|en\s+exclusiva|te\s+traemos|a\s+continuacion|dia\s+de\s+la\s+madre|navidad(?:es)?|amigo\s+invisible|regales|regala|en\s+la\s+fotografia|en\s+las\s+imagenes|en\s+la\s+galeria|en\s+esta\s+foto|en\s+la\s+imagen|esta\s+noticia|no\s+dejaran?\s+indiferente|distribuidor\s+oficial|100%\s+originales?)\b|[€$&]/i,
  // Sport & unrelated products / garments posing as eyewear
  /\b(chaqueta\s+de\s+aviador|cazadora\s+de\s+aviador|cazadora\s+de\s+piel|el\s+aviador|bolso\s+(?:como\s+complemento|drew)|corbatas?|piedras,\s+cristales\s+y\s+terciopelos|camara\s+fotografica|teleobjetivo|reflex|tripode|copa\s+de\s+vino|copas\s+de\s+cristal|parabrisas|gafas?\s+deportiv[oa]s?|ciclismo|ciclista|running|esqui|deportes?|wimbeldon|wimbledon)\b/i,
  // Frozen 4-digit years and temporal markers
  /\b(19\d\d|20[0-2]\d)\b/,
  /\b(este\s+ano|el\s+ano\s+pasado|temporada\s+pasada|la\s+pasada\s+temporada|hace\s+cuatro\s+anos|hace\s+varios\s+anos|hace\s+unas\s+semanas)\b/i,
  // Engine frozen noise terms & store self-mentions
  /\b(optica\s+bassol|bassol\s+optic|general\s+optica|optica\s+universitaria|optica\s+&\s+audiologia|alain\s+afflelou|afflelou|multiopticas|federopticos|gafasworld|visual-click|the\s+indian\s+face|hanukeii|vipsual|cottet|milyunagafas|opticalia|hawkers|mr\.?\s*boho|etnia\s+barcelona|lozza|dsquared2|converse|kenzo|tortoise|tarifa\s+tortoise|asos|urban\s+outfitters|zara|terminator|blade\s+runner|street\s+style|eyeliner|maquillaje|rimel|pintalabios|colorete|vaqueros|pantalones\s+de\s+traje|blazer|americanas|gafas\s+con\s+prints|al\s+aire)\b/i,
  // Celebrity / pop-culture gossip names (keeps editorial bricks evergreen and reusable)
  /\b(sara\s+carbonero|lady\s+gaga|beyonce|blue\s+ivy|katy\s+perry|leonardo\s+dicaprio|dicaprio|olsen|nicole\s+richie|mischa\s+barton|laura\s+escanes|harry\s+potter|henry\s+cavil+|timothee\s+chalamet|karl\s+lagerfeld|michael\s+jordan|beckham|brooklyn|banderas|zayn|cavill|gandy|theroux|hemsworth|kurt\s+cobain|james\s+dean|john\s+lennon|johnny\s+depp|tom\s+cruise|selena\s+gomez|bella\s+hadid|gigi\s+hadid|kardashian|mariah\s+carey|taylor\s+swift|rihanna|chiara\s+ferragni|emma\s+chamberlain|miriam\s+giovanelli|bono\s+de\s+u2|george\s+michael|twiggy|cara\s+delevigne|cara\s+delevingne|brad\s+pitt|andrea\s+duro|martirio|telecinco|gran\s+hermano|mad\s+men|marvel|netflix|x-men|daredevil|cyclope|matt\s+murdock|charlie\s+cox|margot\s+tenembaum|superheroe|ciego|de\s+vista|instagram|instagrammers?|tik\s*tok|influencers?|alfombra\s+roja|youtube)\b/i
];

function isSpanishText(text) {
  if (/\b(the|and|with|your|this|that|are|from|which|sunglasses|eyewear|features|shipping|available)\b/i.test(text)) return false;
  if (/\b(amb|aquest|aquesta|aquests|aquestes|dels|ulleres|perqu[eè]|tamb[eé]|mateix|dones)\b/i.test(text)) return false;
  if (/\b(avec|pour|dans|sont|cette|ces|lunettes|soleil|visage|vous|nous)\b/i.test(text)) return false;
  if (/\b(und|mit|f[uü]r|sonnenbrille|brillen)\b/i.test(text)) return false;
  if (/\b(n[aã]o|s[aã]o|tamb[eé]m|voc[eê]|[oó]culos)\b/i.test(text)) return false;
  if (/\b(degli|questo|questa|occhiali|perch[eé])\b/i.test(text)) return false;

  const tokens = text.toLowerCase().match(/[a-záéíóúüñ]+/g) || [];
  if (tokens.length < 10) return false;
  const esStop = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'que', 'y', 'o', 'es', 'son', 'se', 'su', 'sus', 'al', 'como', 'pero', 'más', 'si', 'muy', 'este', 'esta', 'estas', 'estos', 'entre', 'desde', 'hacia', 'también']);
  let stopCount = 0;
  for (const t of tokens) {
    if (esStop.has(t)) stopCount++;
  }
  return stopCount / tokens.length >= 0.18 && stopCount >= 3;
}

function passesHygiene(text) {
  if (!text || text.length < 40) return false;
  // Quotes (double and single), brackets, hashtags, emojis, mojibake, weird chars
  if (/[“”"«»'’‘\[\]\uFFFD{}|©®™#]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) return false;
  if (/Ã¡|Ã©|Ã­|Ã³|Ãº|Ã±|â€/.test(text)) return false;
  // Double periods or stray question marks
  if (/\.\./.test(text) || /\?/.test(text)) return false;
  // Glued camelCase or glued common words / typos / all-caps emphasis
  if (/[a-záéíóúüñ]{3}[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]{2}/.test(text)) return false;
  if (/\b[A-ZÁÉÍÓÚÑ]{4,}\b/.test(text.replace(/\b(?:UV|UV400|XXL|NANO)\b/g, ''))) return false;
  if (/\b(?:Ircon|montruas|ra-ban|mazzuccheli|peferidas|nos\s+hecho\s+las\s+ganas|Peros|neg[oó]\s+y\s+marr[oó]n|sn\s+olvidar)\b/i.test(text)) return false;
  // Unspaced period + Capital
  if (/\.[A-ZÁÉÍÓÚÑ]/.test(text)) return false;
  // All caps words/headings or Title Case spam (3+ consecutive Capitalized words mid-sentence)
  if (/\b[A-ZÁÉÍÓÚÑ]{4,}\s+[A-ZÁÉÍÓÚÑ]{4,}/.test(text)) return false;
  if (/[a-záéíóúñ],\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+,\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/.test(text)) return false;
  if (!/^[A-ZÁÉÍÓÚÑ]/.test(text)) return false;
  if (!/[.:]$/.test(text)) return false;

  // Mandatory strict eyewear noun requirement
  if (!CORE_EYEWEAR_RX.test(text)) return false;

  const textFolded = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const rx of ANTI_NOISE_PATTERNS) {
    if (rx.test(textFolded)) return false;
  }

  if (/\bpesad[oa]s?\b/i.test(text) && /\bligereza\b/i.test(text)) return false;
  if (!isSpanishText(text)) return false;

  return true;
}

function splitSentencesSafe(text) {
  const masked = text
    .replace(/\bp\.\s*ej\./gi, 'p_ej_')
    .replace(/\bc\.\s*p\.\s*v\./gi, 'cpv_DOT_')
    .replace(/\bp\.\s*v\.\s*p\./gi, 'pvp_DOT_')
    .replace(/\b(etc|ej|aprox|núm|cap|pág|art|fig|ud|uds|ref|sr|sra|dr|dra|mm|cm)\./gi, '$1_DOT_');
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

function isCleanTransitionSentence(sent) {
  const words = sent.split(/\s+/).filter(Boolean);
  if (words.length < 12 || words.length > 30) return false;
  if (!/[.:]$/.test(sent)) return false;
  if (!passesHygiene(sent)) return false;

  if (/^(?:este\s+tipo\s+de|esta\s+clase\s+de|estas\s+gafas\s+tienen|el\s+modelo|no\s+solo\s+nos|funcionan|hacen\s+que|son\s+un|otra\s+novedad|adem[aá]s|sin\s+embargo|por\s+eso|por\s+lo\s+tanto|en\s+definitiva|en\s+conclusi[oó]n|as[ií]\s+que|y\s+es\s+que|antes,|de\s+esta\s+forma\s+llegamos)\b/i.test(sent)) {
    return false;
  }
  if (/\bporque\s+[^.]{1,55}[.:]?$/i.test(sent)) return false;
  if (/\b(?:galer[ií]a|en\s+estas\s+fotos|pincha|desliza|siguiente\s+foto|como\s+hemos\s+visto|a\s+continuaci[oó]n)\b/i.test(sent)) return false;
  if (/\b\d+\s+(?:gafas|modelos|monturas|opciones|propuestas|fotos)\b/i.test(sent)) return false;

  const hasPresentationCue = /\b(tendencia|tendencias|propuestas?|modelos?|opciones|colecci[oó]n|colecciones|dise[nñ]os?|siluetas?|claves?|alternativas?|selecci[oó]n|destacan|apuntan|elegir|escoger|combinar|apostar|favorecen|imprescindibles|protagonistas|novedades|versiones|estilos?)\b/i.test(sent);
  return hasPresentationCue && CORE_EYEWEAR_RX.test(sent);
}

function classifyGapCategory(text, isTransition) {
  if (isTransition) return 'TRANSITION_CURATION';

  const scores = {
    VISAGISM_AESTHETICS: 0,
    HERITAGE_ORIGIN: 0,
    MATERIAL_COMPOSITION: 0,
    PRODUCT_FACTUAL: 0,
    OUTFIT_STYLE_PAIRING: 0
  };

  // 1. VISAGISM_AESTHETICS: true facial morphology, comfort, nasal bridge, temples, proportions
  if (/\b(visagismo|rostro\s+(?:redondo|cuadrado|ovalado|alargado|triangular|coraz[oó]n|diamante)|rostros?\s+(?:redondos|cuadrados|ovalados|alargados|triangulares)|cara\s+(?:redonda|cuadrada|ovalada|alargada|triangular)|caras?\s+(?:redondas|cuadradas|ovaladas|alargadas)|facciones|rasgos\s+faciales|tus\s+rasgos|fisonom[ií]a|p[oó]mulos?|mand[ií]bula|ment[oó]n|frente\s+(?:ancha|estrecha|amplia)|tabique\s+nasal|puente\s+de\s+la\s+nariz|detr[aá]s\s+de\s+las\s+orejas|sienes|armon[ií]a\s+facial|suavizar\s+las\s+l[ií]neas|estilizar\s+el\s+rostro|equilibrar\s+las\s+facciones|forma\s+de\s+tu\s+cara|forma\s+de\s+la\s+cara|tipo\s+de\s+rostro|comodidad\s+en\s+el\s+ajuste|se\s+asientan|se\s+ajustan\s+bien|no\s+te\s+aprieten)\b/i.test(text)) {
    scores.VISAGISM_AESTHETICS += 5;
  } else if (/\b(armonizar|favorece|favorecen|favorecedor|proporciones)\b/i.test(text) && /\b(rostro|cara|nariz|orejas|sienes|comodidad)\b/i.test(text)) {
    scores.VISAGISM_AESTHETICS += 3;
  }

  // 2. HERITAGE_ORIGIN: boho chic, bohemian, hippie, vintage, retro, 60s/70s, iconic silhouettes, classic legacy
  if (/\b(boho(?:\s+chic)?|bohemi[oa]s?|hippie|vintage|retro|a[nñ]os\s+(?:50|60|70|80|90)|sesenta|setenta|setenter[oa]s?|sesenter[oa]s?|ochenter[oa]s?|d[eé]cada\s+de\s+los|siluetas?\s+ic[oó]nicas?|modelos?\s+ic[oó]nicos?|legado|herencia|esp[ií]ritu\s+retro|inspiraci[oó]n\s+vintage|aire\s+retro|cl[aá]sicos?\s+renovados?)\b/i.test(text)) {
    scores.HERITAGE_ORIGIN += 4;
  } else if (/\b(ic[oó]nic[oa]s?|cl[aá]sico\s+atemporal|historia|origen)\b/i.test(text) && /\b(gafas|monturas?|aviador|wayfarer|cat-?eye|redondas?)\b/i.test(text)) {
    scores.HERITAGE_ORIGIN += 3;
  }

  // 3. MATERIAL_COMPOSITION: craft acetate, carey/havana, earth/amber/ochre/brown tones, fine metal, aged gold, bronze, lightness & resistance
  if (/\b(acetato(?:\s+de\s+celulosa|\s+artesanal|\s+natural)?|hech[oa]s?\s+a\s+mano|artesanal(?:es)?|pulid[oa]s?\s+a\s+mano|carey|havana|habana|tonos?\s+tierra|[aá]mbar|ocre|dorado\s+envejecido|metal\s+fino|monturas?\s+(?:de\s+metal|met[aá]licas?)|montura\s+de\s+pasta|bronce|titanio|acero\s+inoxidable|veteado|laminaci[oó]n|tacto\s+c[aá]lido|ligereza\s+y\s+resistencia)\b/i.test(text)) {
    scores.MATERIAL_COMPOSITION += 4;
  } else if (/\b(pasta|acetato|metal|met[aá]lic[oa]s?|dorado|bronce|carey)\b/i.test(text) && /\b(material(?:es)?|liger[oa]s?|resistente|resistencia|acabado|durabilidad|moldear)\b/i.test(text)) {
    scores.MATERIAL_COMPOSITION += 3;
  }

  // 4. PRODUCT_FACTUAL / SLOT_MODEL: editorial descriptions of sunglass models/silhouettes with natural product anchor
  const hasShape = /\b(redond[oa]s?|cuadrad[oa]s?|rectangulares?|ovaladas?|geom[eé]tric[oa]s?|hexagonales?|aviador|aviator|wayfarer|clubmaster|pantos|panthos|mariposa|oversize|cat-?eye|ojos?\s+de\s+gato|doble\s+puente)\b/i.test(text);
  const hasProductAnchor = /\b(?:estas|las|unas)\s+gafas(?:\s+de\s+sol)?\b|\b(?:esta|la|una)\s+montura\b|\b(?:este|el|un)\s+(?:modelo|dise[nñ]o)\b|\b(?:persol|prada|ray-ban|gucci|chlo[eé]|tom\s+ford|oliver\s+peoples|carrera|aviator|wayfarer|clubmaster|polaroid|burberry|celine|moschino)\b/i.test(text);
  if (hasShape && hasProductAnchor) {
    scores.PRODUCT_FACTUAL += 4;
  }

  // 5. OUTFIT_STYLE_PAIRING (GENERAL_STYLE): summer/city looks, linen/cotton/leather/lace, neutral/sober/timeless palette, streetstyle
  if (/\b(combinar(?:las)?|combina(?:n)?|estilismo|estilismos|outfit|outfits|streetstyle|lino|algod[oó]n|cuero|encajes?|prendas|vestidos?|paleta\s+(?:sobria|neutra|c[aá]lida|crom[aá]tica)|tonos?\s+neutros?|sobri[oa]s?|look\s+(?:de\s+verano|casual|urbano)|looks\s+de|verano|ciudad|entretiempo)\b/i.test(text)) {
    scores.OUTFIT_STYLE_PAIRING += 3;
  }

  let bestGap = null;
  let bestScore = 0;
  for (const [g, s] of Object.entries(scores)) {
    if (s > bestScore) {
      bestScore = s;
      bestGap = g;
    }
  }
  return bestScore >= 3 ? bestGap : null;
}

function buildCandidatesFromParagraphs(paragraphs) {
  const blocks = [];
  const transitions = [];
  const consumedIndices = new Set();

  for (let i = 0; i < paragraphs.length; i++) {
    if (consumedIndices.has(i)) continue;
    const p = paragraphs[i];
    const sents = splitSentencesSafe(p.text);

    if (p.word_count >= 38 && p.word_count <= 95 && sents.length >= 2 && sents.length <= 4) {
      if (passesHygiene(p.text) && !p.text.endsWith(':')) {
        blocks.push({ text: p.text, word_count: p.word_count, sent_count: sents.length, merged: false });
        consumedIndices.add(i);
        continue;
      }
    }

    if (p.word_count > 95 && sents.length >= 3) {
      for (let start = 0; start <= sents.length - 2; start++) {
        let acc = [];
        let wc = 0;
        for (let end = start; end < Math.min(sents.length, start + 4); end++) {
          acc.push(sents[end]);
          wc += sents[end].split(/\s+/).filter(Boolean).length;
          if (acc.length >= 2 && wc >= 38 && wc <= 95) {
            const candidate = acc.join(' ');
            if (passesHygiene(candidate) && !candidate.endsWith(':')) {
              blocks.push({ text: candidate, word_count: wc, sent_count: acc.length, merged: false });
              consumedIndices.add(i);
              start = sents.length;
              break;
            }
          }
          if (wc > 95) break;
        }
      }
      if (consumedIndices.has(i)) continue;
    }

    if (i + 1 < paragraphs.length && !consumedIndices.has(i + 1)) {
      const pNext = paragraphs[i + 1];
      if (
        p.word_count >= 15 && p.word_count <= 42 &&
        pNext.word_count >= 15 && pNext.word_count <= 42 &&
        /[.!?]$/.test(p.text) && !p.text.endsWith(':') && !pNext.text.endsWith(':')
      ) {
        const combined = `${p.text} ${pNext.text}`;
        const combinedSents = splitSentencesSafe(combined);
        const combinedWc = combined.split(/\s+/).filter(Boolean).length;
        if (combinedWc >= 40 && combinedWc <= 90 && combinedSents.length >= 2 && combinedSents.length <= 4) {
          if (passesHygiene(combined)) {
            blocks.push({ text: combined, word_count: combinedWc, sent_count: combinedSents.length, merged: true });
            consumedIndices.add(i);
            consumedIndices.add(i + 1);
            continue;
          }
        }
      }
    }
  }

  for (let i = 0; i < paragraphs.length; i++) {
    if (consumedIndices.has(i)) continue;
    const p = paragraphs[i];
    const sents = splitSentencesSafe(p.text);
    for (const sent of sents) {
      if (isCleanTransitionSentence(sent)) {
        transitions.push({
          text: sent,
          word_count: sent.split(/\s+/).filter(Boolean).length,
          sent_count: 1
        });
        break;
      }
    }
  }

  return { blocks, transitions };
}

function loadExistingDedupeState() {
  const seenFullNorm = new Set();
  const seenSentStems = new Set();
  const seenBlockStems = new Set();
  const seenUrls = new Set();

  const addText = (txt) => {
    if (!txt) return;
    const fullNorm = txt.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
    if (fullNorm) seenFullNorm.add(fullNorm);
    const blockStem = txt.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 45);
    if (blockStem.length >= 20) seenBlockStems.add(blockStem);
    for (const s of splitSentencesSafe(txt)) {
      const st = s.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 34);
      if (st.length >= 16) seenSentStems.add(st);
    }
  };

  const backupPath = path.join(STAGING_DIR, 'backup_banco_maestro_pre_v2.json');
  const bankToDedupe = (process.argv.includes('--local-only') && fs.existsSync(backupPath)) ? backupPath : MASTER_BANK_PATH;
  if (fs.existsSync(bankToDedupe)) {
    const master = JSON.parse(fs.readFileSync(bankToDedupe, 'utf8'));
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

  const v2SavedEvidence = [];
  if (fs.existsSync(EVIDENCE_DIR)) {
    for (const f of fs.readdirSync(EVIDENCE_DIR)) {
      if (!f.endsWith('.meta.json')) continue;
      try {
        const metaPath = path.join(EVIDENCE_DIR, f);
        const m = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (m.source_url) seenUrls.add(normalizeUrlKey(m.source_url));
        // Reuse fresh V2 evidence saved on 2026-11-19 if date is strictly pre-2022
        if (m.scraped_at && m.scraped_at >= '2026-11-19' && m.publish_date && m.publish_date < '2022-01-01') {
          const htmlPath = metaPath.replace(/\.meta\.json$/, '.html');
          if (fs.existsSync(htmlPath)) {
            v2SavedEvidence.push({ meta: m, htmlPath });
          }
        }
      } catch (_) {}
    }
  }

  return { seenFullNorm, seenSentStems, seenBlockStems, seenUrls, v2SavedEvidence, addText };
}

function isDuplicateAndRegister(text, dedupe) {
  const fullNorm = text.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, '');
  if (!fullNorm || dedupe.seenFullNorm.has(fullNorm)) return true;

  const blockStem = text.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 45);
  if (blockStem.length >= 20 && dedupe.seenBlockStems.has(blockStem)) return true;

  const sents = splitSentencesSafe(text);
  for (const s of sents) {
    const st = s.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 34);
    if (st.length >= 16 && dedupe.seenSentStems.has(st)) return true;
  }

  dedupe.addText(text);
  return false;
}

function getVerticalForGap(gap) {
  if (gap === 'TRANSITION_CURATION') return 'editorial_transition';
  if (gap === 'VISAGISM_AESTHETICS') return 'fashion_visagism';
  if (gap === 'HERITAGE_ORIGIN') return 'editorial_heritage';
  if (gap === 'MATERIAL_COMPOSITION') return 'artisan_materials';
  if (gap === 'PRODUCT_FACTUAL') return 'product_editorial';
  return 'outfit_style_pairing';
}

function extractAcceptedFromHtml(html, domain, sourceUrl, waybackUrl, pubDate, dateMethod, dedupe) {
  const rawParagraphs = extractArticleParagraphs(html);
  if (rawParagraphs.length < 2) return [];

  const { blocks, transitions } = buildCandidatesFromParagraphs(rawParagraphs);
  const accepted = [];
  let pageBlocks = 0;
  let pageTransitions = 0;

  for (const b of blocks) {
    if (pageBlocks >= 5) break;
    const gap = classifyGapCategory(b.text, false);
    if (!gap) continue;
    if (isDuplicateAndRegister(b.text, dedupe)) continue;

    accepted.push({
      domain,
      source_url: sourceUrl,
      wayback_url: waybackUrl || null,
      publish_date: pubDate,
      date_method: dateMethod,
      gap_category: gap,
      vertical: getVerticalForGap(gap),
      is_merged_block: b.merged,
      sentence_count: b.sent_count,
      word_count: b.word_count,
      text: b.text
    });
    pageBlocks++;
  }

  for (const t of transitions) {
    if (pageTransitions >= 4) break;
    if (isDuplicateAndRegister(t.text, dedupe)) continue;

    accepted.push({
      domain,
      source_url: sourceUrl,
      wayback_url: waybackUrl || null,
      publish_date: pubDate,
      date_method: dateMethod,
      gap_category: 'TRANSITION_CURATION',
      vertical: 'editorial_transition',
      frame_hint: 'TRANSITION_CURATION',
      is_merged_block: false,
      sentence_count: 1,
      word_count: t.word_count,
      text: t.text
    });
    pageTransitions++;
  }

  return accepted;
}

async function run() {
  console.log('=== COSECHADOR DE HUECOS EDITORIALES Y ÓPTICOS PRE-2022 (V2 REFINADO) ===');
  const dedupe = loadExistingDedupeState();
  console.log(`Estado deduplicación: ${dedupe.seenFullNorm.size} textos previos, ${dedupe.seenUrls.size} URLs en evidencia, ${dedupe.v2SavedEvidence.length} HTMLs V2 locales.`);

  const harvested = [];
  const stats = {
    pagesVisited: 0,
    pagesSaved: 0,
    rejectedDate: 0,
    rejectedEmpty: 0,
    byGap: {
      VISAGISM_AESTHETICS: 0,
      HERITAGE_ORIGIN: 0,
      MATERIAL_COMPOSITION: 0,
      PRODUCT_FACTUAL: 0,
      OUTFIT_STYLE_PAIRING: 0,
      TRANSITION_CURATION: 0
    },
    byDomain: {}
  };

  const registerBatch = (items) => {
    for (const item of items) {
      harvested.push(item);
      stats.byGap[item.gap_category] = (stats.byGap[item.gap_category] || 0) + 1;
      stats.byDomain[item.domain] = (stats.byDomain[item.domain] || 0) + 1;
    }
  };

  // Phase 1: Re-extract with strict precision filters from fresh V2 local HTMLs
  for (const ev of dedupe.v2SavedEvidence) {
    if (isJunkUrl(ev.meta.source_url)) continue;
    const html = fs.readFileSync(ev.htmlPath, 'utf8');
    const items = extractAcceptedFromHtml(
      html,
      ev.meta.source_domain,
      ev.meta.source_url,
      null,
      ev.meta.publish_date,
      ev.meta.date_verification_method || 'wayback_machine_timestamp',
      dedupe
    );
    if (items.length > 0) {
      stats.pagesSaved++;
      registerBatch(items);
    }
  }
  console.log(`[FASE 1 - Evidencia V2 local] Re-extraídos ${harvested.length} ladrillos limpios de ${stats.pagesSaved} páginas.`);

  const localOnly = process.argv.includes('--local-only');
  if (!localOnly) {
    // Phase 2: Query Wayback CDX for remaining uncovered patterns (e.g. glamour tendencies, trendencias complementos-ellas, hola, vogue tendencies)
    const allCandidateSnaps = [];
    const cdxUrlKeys = new Set();

    await runConcurrent(TARGETS, 2, async (target) => {
      const snaps = await queryCDXWithRetry(target, 3);
      let kept = 0;
      for (const s of snaps) {
        if (isJunkUrl(s.originalUrl)) continue;
        const normUrl = normalizeUrlKey(s.originalUrl);
        if (!normUrl || dedupe.seenUrls.has(normUrl) || cdxUrlKeys.has(normUrl)) continue;
        cdxUrlKeys.add(normUrl);
        allCandidateSnaps.push(s);
        kept++;
      }
      if (kept > 0) {
        console.log(`[CDX NUEVO] ${target.pattern} => ${snaps.length} snapshots, ${kept} URLs nuevas.`);
      }
    });

    console.log(`\n[FASE 2] URLs nuevas adicionales a inspeccionar: ${allCandidateSnaps.length}`);

    await runConcurrent(allCandidateSnaps, 5, async (snap) => {
      stats.pagesVisited++;
      const fetched = await fetchUrl(snap.waybackUrl, 16000);
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
        dedupe
      );

      if (acceptedForPage.length > 0) {
        saveScrapedPage(snap.domain, snap.originalUrl, pubInfo.date, pubInfo.method, fetched.html, acceptedForPage);
        stats.pagesSaved++;
        registerBatch(acceptedForPage);
        if (stats.pagesSaved % 15 === 0 || acceptedForPage.length >= 4) {
          console.log(`[EVIDENCIA #${stats.pagesSaved}] ${snap.domain} (${pubInfo.date}) => +${acceptedForPage.length} ladrillos (total: ${harvested.length})`);
        }
      }
    });
  } else {
    console.log('[MODO --local-only] Omitiendo Fase 2 de red; generando staging desde evidencia local pre-2022.');
  }

  // 3. Atomic write of staging JSON & Markdown report
  const tmpJson = `${OUT_STAGING_JSON}.tmp`;
  fs.writeFileSync(tmpJson, JSON.stringify(harvested, null, 2), 'utf8');
  fs.renameSync(tmpJson, OUT_STAGING_JSON);

  const multiSentenceCount = harvested.filter(x => x.sentence_count >= 2).length;
  const reportLines = [
    '# Reporte de Cosecha Pre-2022: Cobertura de Huecos Editoriales y Ópticos (V2)',
    `**Fecha:** ${new Date().toISOString()}`,
    `**Filtro CDX:** \`to=20211231235959\`, \`statuscode:200\`, \`mimetype:text/html\`, \`collapse=urlkey\``,
    '',
    '## 1. Resumen de Ejecución',
    `* **URLs nuevas inspeccionadas en Fase 2:** ${stats.pagesVisited}`,
    `* **Páginas pre-2022 verificadas con ladrillos aprobados:** ${stats.pagesSaved}`,
    `* **Páginas descartadas por fecha >= 2022 o sin fecha válida:** ${stats.rejectedDate}`,
    `* **Total de ladrillos nuevos limpios y deduplicados:** ${harvested.length} (${multiSentenceCount} multi-oración + ${harvested.length - multiSentenceCount} transiciones)`,
    '',
    '## 2. Desglose por Hueco Objetivo',
    '| Hueco / Categoría | Ladrillos Extraídos |',
    '| :--- | :---: |',
    ...Object.entries(stats.byGap).map(([g, c]) => `| **${g}** | ${c} |`),
    '',
    '## 3. Desglose por Dominio',
    '| Dominio Fuente | Ladrillos |',
    '| :--- | :---: |',
    ...Object.entries(stats.byDomain).sort((a, b) => b[1] - a[1]).map(([d, c]) => `| \`${d}\` | ${c} |`),
    '',
    '## 4. Muestras Literales Extraídas',
    ...Object.keys(stats.byGap).flatMap(g => {
      const sample = harvested.find(x => x.gap_category === g);
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
  console.log(`COSECHA V2 COMPLETADA: ${harvested.length} ladrillos limpios (${multiSentenceCount} multi-oración) de ${stats.pagesSaved} páginas.`);
  console.log('Desglose por hueco:', stats.byGap);
  console.log('Top dominios:', Object.entries(stats.byDomain).sort((a, b) => b[1] - a[1]).slice(0, 15));
  console.log(`Staging guardado en: ${OUT_STAGING_JSON}`);
  console.log(`Reporte guardado en: ${OUT_REPORT_MD}`);
  console.log('======================================================');
}

run().catch(err => {
  console.error('Error fatal en harvest_editorial_gaps_v2:', err);
  process.exit(1);
});
