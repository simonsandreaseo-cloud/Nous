const fs = require('fs');
const path = require('path');
const { queryWaybackCDX, fetchUrl, detectPublishDate, cleanAndExtractParagraphs, saveScrapedPage, runConcurrent, STAGING_DIR, EVIDENCE_DIR } = require('./harvest_core.cjs');

const TARGETS = [
  { pattern: 'opticagasset.com/gafas/*', limit: 80, domain: 'opticagasset.com' },
  { pattern: 'opticagasset.com/blog/*', limit: 80, domain: 'opticagasset.com' },
  { pattern: 'opticasflorida.com/blog/*', limit: 80, domain: 'opticasflorida.com' },
  { pattern: 'generaloptica.es/blog/*', limit: 80, domain: 'generaloptica.es' },
  { pattern: 'costasoloptica.com/blog/*', limit: 80, domain: 'costasoloptica.com' }
];

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

// Relevant to mechanics, frames, hinges, acetate, materials, workshop fit
function isMechanicsOrMaterialRelevant(text) {
  return /\b(bisagras?|varillas?|patillas?|puente|almohadillas?|plaquetas?|monturas?|armazón|acetato|celulosa|titanio|beta-titanio|metal|pasta|tornillo|flex|articulad[oa]|ajuste|calibre|mineral|cristal|orgánic[oa]|pulido|taller|ranurado|biselado|pantoscópico|anatómic[oa]|curvatura|codo|taladro|enderezar)\b/i.test(text);
}

function annotateOntology(text) {
  const lower = text.toLowerCase();
  const slots = [];
  const frames = [];

  // SLOT_COMPONENT
  if (/\b(bisagras?|pernio|pernios|charnelas?|flex)\b/i.test(lower)) slots.push('SLOT_COMPONENT:bisagras');
  if (/\b(varillas?|patillas?|terminales?|codos?)\b/i.test(lower)) slots.push('SLOT_COMPONENT:varillas');
  if (/\b(puentes?|doble puente)\b/i.test(lower)) slots.push('SLOT_COMPONENT:puente');
  if (/\b(almohadillas?|plaquetas?)\b/i.test(lower)) slots.push('SLOT_COMPONENT:almohadillas_plaquetas');
  if (/\b(tornillos?|tuercas?)\b/i.test(lower)) slots.push('SLOT_COMPONENT:tornillos');
  if (/\b(aros?|taladros?|ranuras?|ranurado|hilo de nylon)\b/i.test(lower)) slots.push('SLOT_COMPONENT:aros_ranuras');
  if (/\b(monturas?|armazón|armazones)\b/i.test(lower)) slots.push('SLOT_COMPONENT:montura');

  // SLOT_MATERIAL
  if (/\b(acetato|celulosa)\b/i.test(lower)) slots.push('SLOT_MATERIAL:acetato');
  if (/\b(titanio|beta-titanio)\b/i.test(lower)) slots.push('SLOT_MATERIAL:titanio');
  if (/\b(metal|metálic[oa]s?|acero|alpaca|monel|aluminio)\b/i.test(lower)) slots.push('SLOT_MATERIAL:metal');
  if (/\b(pasta|resina|inyección)\b/i.test(lower)) slots.push('SLOT_MATERIAL:pasta');
  if (/\b(poliamida|grilamid|tr90|policarbonato)\b/i.test(lower)) slots.push('SLOT_MATERIAL:polimeros_tr90');
  if (/\b(madera|cuerno|fibra de carbono)\b/i.test(lower)) slots.push('SLOT_MATERIAL:materiales_nobles');
  if (/\b(mineral|cristal|orgánic[oa]|cr-39|trivex)\b/i.test(lower)) slots.push('SLOT_MATERIAL:mineral_organico');

  // MECHANICAL_FUNCTION: articulación, bisagras flex, sujeción, ranurado, resistencia a rotura, biselado
  if (/\b(flex|articulad[oa]|articulación|apertura|cierre|resorte|muelle|biselad[oa]|ranurad[oa]|sujeción|fijación|resistencia|rotura|tornillo|apretar)\b/i.test(lower)) {
    frames.push('MECHANICAL_FUNCTION');
  }

  // MATERIAL_COMPOSITION: ligereza, hipoalergénico, biocompatible, maleabilidad térmica, corrosión, durabilidad
  if (/\b(acetato|titanio|celulosa|hipoalergénic[oa]|biocompatible|ligereza|ligero|liviano|corrosión|maleable|calor|calentar|termoplástic[oa]|durabilidad|oxidación|material)\b/i.test(lower)) {
    frames.push('MATERIAL_COMPOSITION');
  }

  // ANATOMICAL_FIT: ajuste, adaptación, ángulo pantoscópico, puente, apoyo nasal, curvatura tras la oreja, centrado, caída
  if (/\b(ajuste|ajustar|adaptar|adaptación|pantoscópic[oa]|apoyo nasal|nariz|oreja|detrás de la oreja|curvatura|centrado|fisionomía|caerse|resbalar|apretar|aflojar|ergonomía|confort)\b/i.test(lower)) {
    frames.push('ANATOMICAL_FIT');
  }

  return { slots, frames };
}

async function run() {
  console.log('=== HARVEST STREAM C: MECHANICS, MATERIALS & WORKSHOP PRE-2022 ===');
  const allParagraphs = [];
  const seenUrls = new Set();
  const seenHashes = new Set();
  const pagesCountPerDomain = {
    'opticagasset.com': 0,
    'opticasflorida.com': 0,
    'generaloptica.es': 0,
    'costasoloptica.com': 0
  };

  // 1. Process CDX Targets live
  for (const t of TARGETS) {
    console.log(`\nConsultando Wayback CDX para: ${t.pattern} (límite: ${t.limit})...`);
    let snapshots = [];
    try {
      snapshots = await queryWaybackCDX(t.pattern, t.limit);
    } catch (e) {
      console.warn(`Error en CDX para ${t.pattern}: ${e.message}`);
    }
    console.log(`Instantáneas pre-2022 encontradas para ${t.domain}: ${snapshots.length}`);

    const filtered = snapshots.filter(snap => {
      const cleanUrl = snap.originalUrl.split('#')[0].replace(/\/+$/, '');
      if (isJunkUrl(cleanUrl)) return false;
      if (seenUrls.has(cleanUrl)) return false;
      seenUrls.add(cleanUrl);
      return true;
    });

    console.log(`Instantáneas únicas tras deduplicar URLs: ${filtered.length}`);

    await runConcurrent(filtered, 4, async (snap) => {
      try {
        let fetched = await fetchUrl(snap.waybackUrl, 9000);
        let dateMethod = 'wayback_timestamp';
        let detectedDate = `${snap.timestamp.slice(0,4)}-${snap.timestamp.slice(4,6)}-${snap.timestamp.slice(6,8)}`;

        if (!fetched || !fetched.html) {
          fetched = await fetchUrl(snap.originalUrl, 6000);
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
          if (!isMechanicsOrMaterialRelevant(p.text)) return;
          const norm = p.text.toLowerCase().replace(/\s+/g, ' ');
          if (seenHashes.has(norm)) return;
          seenHashes.add(norm);

          const { slots, frames } = annotateOntology(p.text);
          allParagraphs.push({
            domain: t.domain,
            source_url: snap.originalUrl,
            publish_date: detectedDate,
            tier: 'TIER_1_WORKSHOP',
            voice_category: 'WORKSHOP_CLINICAL',
            vertical: 'mechanics_materials',
            text: p.text,
            word_count: p.word_count,
            slots_detected: slots,
            frames_detected: frames
          });
          added++;
        });

        if (added > 0) {
          pagesCountPerDomain[t.domain] = (pagesCountPerDomain[t.domain] || 0) + 1;
        }
      } catch (e) {}
    });
  }

  // 2. Ingest existing verified pre-2022 evidence for the 4 domains
  console.log('\n--- Verificando repositorio raw_web_evidence para dominios del Stream C ---');
  if (fs.existsSync(EVIDENCE_DIR)) {
    const metaFiles = fs.readdirSync(EVIDENCE_DIR).filter(f => f.endsWith('.meta.json'));
    const targetDomains = Object.keys(pagesCountPerDomain);

    metaFiles.forEach(metaFile => {
      try {
        const metaPath = path.join(EVIDENCE_DIR, metaFile);
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const domain = meta.source_domain;
        if (!targetDomains.includes(domain)) return;
        if (meta.publish_date >= '2022-01-01') return;

        const htmlFile = metaFile.replace('.meta.json', '.html');
        const htmlPath = path.join(EVIDENCE_DIR, htmlFile);
        if (!fs.existsSync(htmlPath)) return;

        const html = fs.readFileSync(htmlPath, 'utf8');
        const paragraphs = cleanAndExtractParagraphs(html);
        let addedFromEvidence = 0;

        paragraphs.forEach(p => {
          if (!isMechanicsOrMaterialRelevant(p.text)) return;
          const norm = p.text.toLowerCase().replace(/\s+/g, ' ');
          if (seenHashes.has(norm)) return;
          seenHashes.add(norm);

          const { slots, frames } = annotateOntology(p.text);
          allParagraphs.push({
            domain: domain,
            source_url: meta.source_url,
            publish_date: meta.publish_date,
            tier: 'TIER_1_WORKSHOP',
            voice_category: 'WORKSHOP_CLINICAL',
            vertical: 'mechanics_materials',
            text: p.text,
            word_count: p.word_count,
            slots_detected: slots,
            frames_detected: frames
          });
          addedFromEvidence++;
        });

        if (addedFromEvidence > 0) {
          pagesCountPerDomain[domain] = (pagesCountPerDomain[domain] || 0) + 1;
        }
      } catch (e) {}
    });
  }

  // 3. Write final staging output
  const outPath = path.join(STAGING_DIR, 'harvested_mechanics_artisan.json');
  fs.writeFileSync(outPath, JSON.stringify(allParagraphs, null, 2), 'utf8');

  // 4. Summarize statistics
  const totalPages = Object.values(pagesCountPerDomain).reduce((a, b) => a + b, 0);
  const domainBreakdown = {};
  const slotCoverage = {};
  const frameCoverage = {};

  allParagraphs.forEach(p => {
    domainBreakdown[p.domain] = (domainBreakdown[p.domain] || 0) + 1;
    (p.slots_detected || []).forEach(s => slotCoverage[s] = (slotCoverage[s] || 0) + 1);
    (p.frames_detected || []).forEach(f => frameCoverage[f] = (frameCoverage[f] || 0) + 1);
  });

  console.log(`\n========================================`);
  console.log(`[FINALIZADO MECÁNICA/TALLER]`);
  console.log(`Total párrafos extraídos: ${allParagraphs.length}`);
  console.log(`Total páginas con contenido técnico: ${totalPages}`);
  console.log(`Desglose por dominio:`, domainBreakdown);
  console.log(`Páginas por dominio:`, pagesCountPerDomain);
  console.log(`Cobertura de ranuras (SLOT_COMPONENT / SLOT_MATERIAL):`, slotCoverage);
  console.log(`Cobertura de marcos (MECHANICAL_FUNCTION / MATERIAL_COMPOSITION / ANATOMICAL_FIT):`, frameCoverage);
  console.log(`Archivo guardado en: ${outPath}`);
  console.log(`========================================`);
}

run();
