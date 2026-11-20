const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EVIDENCE_DIR = path.resolve('raw_web_evidence');
const STAGING_DIR = path.resolve('banco_ontologico_semantico/staging');

if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true });

function decodeHtmlEntities(str) {
  const map = {
    '&nbsp;': ' ', '&#160;': ' ',
    '&amp;': '&', '&#38;': '&',
    '&quot;': '"', '&#34;': '"', '&#8220;': '"', '&#8221;': '"', '&ldquo;': '"', '&rdquo;': '"',
    '&#39;': "'", '&apos;': "'", '&#8217;': "'", '&#8216;': "'", '&lsquo;': "'", '&rsquo;': "'",
    '&laquo;': '«', '&#171;': '«',
    '&raquo;': '»', '&#187;': '»',
    '&ndash;': '–', '&#8211;': '–',
    '&mdash;': '—', '&#8212;': '—',
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
    '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
    '&ntilde;': 'ñ', '&Ntilde;': 'Ñ', '&uuml;': 'ü', '&Uuml;': 'Ü',
    '&iquest;': '¿', '&#191;': '¿', '&iexcl;': '¡', '&#161;': '¡',
    '&ordm;': 'º', '&ordf;': 'ª', '&deg;': '°',
    '&#8230;': '…', '&hellip;': '…'
  };
  return str.replace(/&[a-zA-Z0-9#]+;/g, (m) => map[m] || m);
}

function detectPublishDate(html, url) {
  // 1. Wayback Machine URL: web.archive.org/web/YYYYMMDD...
  const wbMatch = url.match(/web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})/);
  if (wbMatch) {
    return { date: `${wbMatch[1]}-${wbMatch[2]}-${wbMatch[3]}`, method: 'wayback_machine_timestamp' };
  }

  // 2. URL con estructura /YYYY/MM/DD/ o /YYYY/MM/
  const urlDateMatch = url.match(/\/(20(?:0\d|1\d|2[01]))\/(0[1-9]|1[0-2])(?:\/(0[1-9]|[12]\d|3[01]))?\//);
  if (urlDateMatch) {
    const day = urlDateMatch[3] || '01';
    return { date: `${urlDateMatch[1]}-${urlDateMatch[2]}-${day}`, method: 'url_path_date' };
  }

  // 3. Meta tags
  const metaRegexes = [
    /property=["']article:published_time["']\s+content=["'](\d{4}-\d{2}-\d{2})/i,
    /content=["'](\d{4}-\d{2}-\d{2})[^"']*["']\s+property=["']article:published_time["']/i,
    /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/i,
    /datetime=["'](\d{4}-\d{2}-\d{2})/i,
    /name=["']date["']\s+content=["'](\d{4}-\d{2}-\d{2})/i
  ];
  for (const rx of metaRegexes) {
    const m = html.match(rx);
    if (m && m[1]) return { date: m[1], method: 'meta_tag' };
  }

  return null;
}

function cleanAndExtractParagraphs(html) {
  // Stripping boilerplates
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Extract <p> blocks
  const pMatches = cleaned.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const paragraphs = [];

  for (const rawP of pMatches) {
    const text = decodeHtmlEntities(rawP.replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 15 || words.length > 130) continue;

    // Filter out common marketing/boilerplate
    if (/cookies|política de privacidad|aviso legal|todos los derechos reservados|newsletter|suscríbete|añadir al carrito|cesta|envío gratis|descuento|código promocional/i.test(text)) continue;
    if (/teléfono|horario|lunes a viernes|calle\s+\w+|plaza\s+\w+|c\.p\.\s*\d+/i.test(text)) continue;
    if (/wayback|archive\.org|internet archive/i.test(text)) continue;

    paragraphs.push({
      text,
      word_count: words.length
    });
  }

  return paragraphs;
}

async function fetchUrl(url, timeoutMs = 14000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const finalUrl = res.url || url;
    const html = await res.text();
    return { html, finalUrl };
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

async function queryWaybackCDX(domainPattern, limit = 50, retries = 2) {
  // CDX URL: https://web.archive.org/cdx/search/cdx
  // We filter statuscode 200, mimetype text/html, and timestamp < 20220101
  const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domainPattern)}&output=json&filter=statuscode:200&filter=mimetype:text/html&to=20211231235959&limit=${limit}&collapse=urlkey`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 50000);
      const res = await fetch(cdxUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        if (attempt < retries) continue;
        return [];
      }
      const text = await res.text();
      if (text.startsWith('<')) return [];
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
        const waybackUrl = `https://web.archive.org/web/${ts}/${orig}`;
        snapshots.push({ originalUrl: orig, timestamp: ts, waybackUrl });
      }
      return snapshots;
    } catch (e) {
      if (attempt >= retries) {
        console.error(`Error querying CDX for ${domainPattern}:`, e.message);
        return [];
      }
    }
  }
  return [];
}

function saveScrapedPage(domain, sourceUrl, publishDate, dateMethod, rawHtml, paragraphs) {
  const sha = crypto.createHash('sha256').update(rawHtml, 'utf8').digest('hex');
  const shortSha = sha.slice(0, 16);
  const baseName = `${domain.replace(/[^a-z0-9]/gi, '_')}_${shortSha}`;

  const htmlPath = path.join(EVIDENCE_DIR, `${baseName}.html`);
  const metaPath = path.join(EVIDENCE_DIR, `${baseName}.meta.json`);

  fs.writeFileSync(htmlPath, rawHtml, 'utf8');
  fs.writeFileSync(metaPath, JSON.stringify({
    source_url: sourceUrl,
    source_domain: domain,
    publish_date: publishDate,
    date_verification_method: dateMethod,
    sha256_html: sha,
    paragraphs_extracted: paragraphs.length,
    scraped_at: new Date().toISOString()
  }, null, 2), 'utf8');

  return { baseName, count: paragraphs.length };
}

async function runConcurrent(items, concurrency, fn) {
  let index = 0;
  const results = [];
  const workers = Array(concurrency).fill(null).map(async () => {
    while (index < items.length) {
      const i = index++;
      try {
        const res = await fn(items[i], i);
        if (res) results.push(res);
      } catch (e) {
        // ignore
      }
    }
  });
  await Promise.all(workers);
  return results;
}

module.exports = {
  decodeHtmlEntities,
  detectPublishDate,
  cleanAndExtractParagraphs,
  fetchUrl,
  queryWaybackCDX,
  saveScrapedPage,
  runConcurrent,
  EVIDENCE_DIR,
  STAGING_DIR
};
