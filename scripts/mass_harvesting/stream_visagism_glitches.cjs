const fs = require('fs');
const path = require('path');
const { queryWaybackCDX, fetchUrl, detectPublishDate, cleanAndExtractParagraphs, saveScrapedPage, runConcurrent, EVIDENCE_DIR, STAGING_DIR } = require('./harvest_core.cjs');

const TARGETS = [
  { pattern: 'vipsual.com/*', limit: 60, domain: 'vipsual.com' },
  { pattern: 'telva.com/moda/accesorios/*', limit: 50, domain: 'telva.com' },
  { pattern: 'elle.com/es/moda/tendencias/*', limit: 40, domain: 'elle.com' },
  { pattern: 'esquire.com/es/moda-hombre/*', limit: 30, domain: 'esquire.com' }
];

const TARGET_DOMAINS = ['vipsual.com', 'telva.com', 'elle.com', 'esquire.com'];

function isJunkUrl(url) {
  if (/\/page\/\d+/i.test(url)) return true;
  if (/\?replytocom=/i.test(url)) return true;
  if (/\?share=/i.test(url)) return true;
  if (/\/feed\/?$/i.test(url)) return true;
  if (/\/tag\//i.test(url)) return true;
  if (/\/author\//i.test(url)) return true;
  if (/\.(jpg|jpeg|png|gif|pdf|css|js)$/i.test(url)) return true;
  return false;
}

// Relevant to visagism, face shapes, styling, oral expressions, frame choices
function isVisagismOrGlitchRelevant(text) {
  return /\b(gafas?|monturas?|cara redonda|rostro redondo|rostro cuadrado|cara cuadrada|cara alargada|rostro alargado|rostro ovalado|cara ovalada|rostro triangular|cara triangular|mandíbula|pómulos?|frente|facciones|rasgos|puente|visagismo|ojos|favorece|estilo|olvídate|como un guante|sí que|ojo con|de toda la vida|la verdad es que|lo que hace|a la hora de)\b/i.test(text);
}

async function run() {
  console.log('=== HARVEST STREAM D: VISAGISM, AESTHETICS & ORAL GLITCHES PRE-2022 ===');
  const allParagraphs = [];
  const seenUrls = new Set();
  const seenHashes = new Set();
  let totalPages = 0;

  // STEP 1: Ingest pre-scraped raw evidence from target domains
  console.log('\n[FASE 1] Ingestando evidencia HTML pre-2022 existente en raw_web_evidence...');
  if (fs.existsSync(EVIDENCE_DIR)) {
    const metaFiles = fs.readdirSync(EVIDENCE_DIR).filter(f => f.endsWith('.meta.json'));
    for (const mf of metaFiles) {
      try {
        const metaPath = path.join(EVIDENCE_DIR, mf);
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (!TARGET_DOMAINS.includes(meta.source_domain)) continue;
        if (meta.publish_date >= '2022-01-01') continue;

        const htmlPath = path.join(EVIDENCE_DIR, mf.replace('.meta.json', '.html'));
        if (!fs.existsSync(htmlPath)) continue;

        const cleanUrl = (meta.source_url || '').split('#')[0].replace(/\/+$/, '');
        if (seenUrls.has(cleanUrl)) continue;
        seenUrls.add(cleanUrl);

        const html = fs.readFileSync(htmlPath, 'utf8');
        const paragraphs = cleanAndExtractParagraphs(html);
        if (paragraphs.length < 1) continue;

        let added = 0;
        paragraphs.forEach(p => {
          if (!isVisagismOrGlitchRelevant(p.text)) return;
          const norm = p.text.toLowerCase().replace(/\s+/g, ' ');
          if (seenHashes.has(norm)) return;
          seenHashes.add(norm);

          allParagraphs.push({
            domain: meta.source_domain,
            source_url: meta.source_url,
            publish_date: meta.publish_date,
            tier: 'TIER_2_EDITORIAL',
            voice_category: 'EDITORIAL_LIFESTYLE',
            vertical: 'visagism_aesthetics',
            text: p.text,
            word_count: p.word_count
          });
          added++;
        });

        if (added > 0) {
          totalPages++;
          console.log(`[EVIDENCIA LOCAL ${totalPages}] ${meta.source_domain} (${meta.publish_date}) => ${added} párrafos estéticos.`);
        }
      } catch (e) {}
    }
  }
  console.log(`\nEvidencia local procesada: ${allParagraphs.length} párrafos de ${totalPages} páginas.`);

  // STEP 2: Live CDX & Wayback harvest for target patterns
  console.log('\n[FASE 2] Consultando Wayback Machine CDX API para nuevas fuentes...');
  for (const t of TARGETS) {
    try {
      console.log(`\nConsultando CDX para: ${t.pattern} (límite: ${t.limit})...`);
      const snapshots = await queryWaybackCDX(t.pattern, t.limit);
      console.log(`Instantáneas pre-2022 encontradas para ${t.domain}: ${snapshots.length}`);

      const filtered = snapshots.filter(snap => {
        const cleanUrl = snap.originalUrl.split('#')[0].replace(/\/+$/, '');
        if (isJunkUrl(cleanUrl)) return false;
        if (seenUrls.has(cleanUrl)) return false;
        seenUrls.add(cleanUrl);
        return true;
      });

      console.log(`Instantáneas únicas a procesar: ${filtered.length}`);

      await runConcurrent(filtered, 4, async (snap) => {
        try {
          let fetched = await fetchUrl(snap.waybackUrl, 7000);
          let dateMethod = 'wayback_timestamp';
          let detectedDate = `${snap.timestamp.slice(0,4)}-${snap.timestamp.slice(4,6)}-${snap.timestamp.slice(6,8)}`;

          if (!fetched || !fetched.html) {
            fetched = await fetchUrl(snap.originalUrl, 5000);
            if (fetched && fetched.html) {
              const detected = detectPublishDate(fetched.html, snap.originalUrl);
              if (!detected || detected.date >= '2022-01-01') return;
              detectedDate = detected.date;
              dateMethod = detected.method;
            }
          } else {
            const detected = detectPublishDate(fetched.html, snap.originalUrl);
            if (detected) {
              detectedDate = detected.date;
              dateMethod = detected.method;
            }
          }

          if (!fetched || !fetched.html) return;
          if (detectedDate >= '2022-01-01') return;

          const paragraphs = cleanAndExtractParagraphs(fetched.html);
          if (paragraphs.length < 2) return;

          saveScrapedPage(t.domain, snap.originalUrl, detectedDate, dateMethod, fetched.html, paragraphs);

          let added = 0;
          paragraphs.forEach(p => {
            if (!isVisagismOrGlitchRelevant(p.text)) return;
            const norm = p.text.toLowerCase().replace(/\s+/g, ' ');
            if (seenHashes.has(norm)) return;
            seenHashes.add(norm);

            allParagraphs.push({
              domain: t.domain,
              source_url: snap.originalUrl,
              publish_date: detectedDate,
              tier: 'TIER_2_EDITORIAL',
              voice_category: 'EDITORIAL_LIFESTYLE',
              vertical: 'visagism_aesthetics',
              text: p.text,
              word_count: p.word_count
            });
            added++;
          });

          if (added > 0) {
            totalPages++;
            console.log(`[WAYBACK ${totalPages}] ${t.domain} (${detectedDate}) => ${added} párrafos estéticos.`);
          }
        } catch (e) {}
      });
    } catch (err) {
      console.warn(`[SKIP] Fallo temporal en ${t.domain}: ${err.message}. Continuando con el siguiente lote...`);
    }
  }

  const outPath = path.join(STAGING_DIR, 'harvested_visagism_glitches.json');
  fs.writeFileSync(outPath, JSON.stringify(allParagraphs, null, 2), 'utf8');
  console.log(`\n========================================`);
  console.log(`[FINALIZADO VISAGISMO] Guardados ${allParagraphs.length} párrafos de ${totalPages} páginas en ${outPath}`);
  console.log(`========================================`);
}

run();
