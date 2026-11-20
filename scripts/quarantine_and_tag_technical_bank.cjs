const fs = require('fs');
const path = require('path');
const {
  MASTER_PATH,
  MARCOS_DIR,
  STAGING_DIR,
  TAXONOMY,
  writeJsonAtomic,
  decodeAllEntities
} = require('./mass_harvesting/blog_grinder_core.cjs');
const { assessOpticalDomainPurity } = require('../desktop-app/electron/engine/factual-integrity-guard.cjs');

const LENS_TECH_RULES = [
  { key: 'polarizadas', rx: /\bpolarizad[oa]s?\b/i },
  { key: 'fotocromaticas', rx: /\bfotocrom[aá]tic[oa]s?\b/i },
  { key: 'progresivas', rx: /\bprogresiv[oa]s?\b/i },
  { key: 'ocupacionales', rx: /\bocupacional(?:es)?\b/i },
  { key: 'cristal_mineral', rx: /\bcristal(?:es)?\s+mineral(?:es)?\b/i },
  { key: 'policarbonato', rx: /\bpolicarbonato\b/i },
  { key: 'luz_azul', rx: /\bluz\s+azul\b/i },
  { key: 'antirreflejante', rx: /\bantirr?eflejant\w*\b/i }
];

const OPTICAL_MECHANISM_RULES = [
  { key: 'parabrisas_uv', rx: /\b(?:parabrisas|dentro\s+del\s+coche)\b/i },
  { key: 'pantallas_lcd', rx: /\b(?:lcd|salpicadero|head-up|pantallas?\s+digital\w*)\b/i },
  { key: 'meflecto_plegable', rx: /\b(?:meflecto|plegables?)\b/i },
  { key: 'acetato_fresado', rx: /\b(?:fresad\w*|planchas?\s+de\s+acetato|tambores?\s+de\s+madera|alma\s+met[aá]lica)\b/i },
  { key: 'plastico_inyectado', rx: /\b(?:inyectad\w*|descascarill\w*|molde)\b/i },
  { key: 'corredor_intermedio', rx: /\b(?:corredor\s+(?:de\s+visi[oó]n\s+)?intermedi[oa]|visi[oó]n\s+intermedia|dos\s+monitores|tensi[oó]n\s+cervical)\b/i },
  { key: 'ajuste_calor', rx: /\b(?:calor|moldear|ajustes?\s+t[eé]rmicos?)\b/i },
  { key: 'deslumbramiento', rx: /\b(?:deslumbramiento|reflejos?\s+horizontales)\b/i }
];

const NEGATIVE_USAGE_RX = /\b(?:no\s+(?:son\s+|est[aá]n\s+|resultan\s+)?(?:permitid\w*|recomendab\w*|apt\w*)|nunca\s+(?:deben|uses?)|prohibid\w*|evitar|inconveniente)\b/i;

function analyzeBrickTechnical(raw) {
  const purity = assessOpticalDomainPurity(raw);
  const lens_tech_tags = LENS_TECH_RULES.filter(r => r.rx.test(raw)).map(r => r.key);
  const optical_mechanisms = OPTICAL_MECHANISM_RULES.filter(r => r.rx.test(raw)).map(r => r.key);
  const has_negative_usage_clause = NEGATIVE_USAGE_RX.test(raw);
  return {
    purity,
    lens_tech_tags,
    optical_mechanisms,
    has_negative_usage_clause
  };
}

function parseArgs(argv) {
  const opts = {};
  for (const a of argv) {
    if (a === '--merge') opts.merge = true;
    else if (a.startsWith('--start=')) opts.start = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--end=')) opts.end = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--out=')) opts.out = a.split('=')[1];
  }
  return opts;
}

function runRange({ start = 0, end = Infinity, outPath }) {
  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  const safeStart = Math.max(0, Number.isFinite(start) ? start : 0);
  const safeEnd = Math.min(master.length, Number.isFinite(end) ? end : master.length);

  let quarantined = 0;
  let offDomain = 0;
  let diaryJunk = 0;
  let technicalTagged = 0;
  const shard = [];

  for (let i = safeStart; i < safeEnd; i++) {
    const b = master[i];
    const raw = decodeAllEntities(b.raw_text || b.text || '');
    const res = analyzeBrickTechnical(raw);
    const shouldQuarantine = Boolean(
      b.exclude_from_humanization ||
      res.purity.isOffDomainIntruder ||
      res.purity.hasDiaryMetaJunk
    );

    if (res.purity.isOffDomainIntruder) offDomain++;
    if (res.purity.hasDiaryMetaJunk) diaryJunk++;
    if (shouldQuarantine) quarantined++;
    if (res.lens_tech_tags.length || res.optical_mechanisms.length) technicalTagged++;

    shard.push({
      index: i,
      brick_id: b.brick_id,
      exclude_from_humanization: shouldQuarantine,
      exclusion_reason: (res.purity.isOffDomainIntruder || res.purity.hasDiaryMetaJunk)
        ? res.purity.reason
        : (b.exclusion_reason || null),
      lens_tech_tags: res.lens_tech_tags,
      optical_mechanisms: res.optical_mechanisms,
      has_negative_usage_clause: res.has_negative_usage_clause
    });
  }

  const targetOut = outPath
    ? path.resolve(outPath)
    : path.join(STAGING_DIR, `tech_shard_${safeStart}_${safeEnd}.json`);
  writeJsonAtomic(targetOut, shard);

  console.log(JSON.stringify({
    range: `${safeStart}..${safeEnd - 1}`,
    processed: shard.length,
    quarantined,
    offDomain,
    diaryJunk,
    technicalTagged,
    outputPath: targetOut
  }, null, 2));
}

function runMerge() {
  console.log('=== MERGE DE CUARENTENA Y ETIQUETADO TÉCNICO -> BANCO + INDICE TECNICO + VECTORES ===');
  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  const shardFiles = fs.readdirSync(STAGING_DIR)
    .filter(f => /^tech_shard_.*\.json$/i.test(f))
    .sort();

  if (!shardFiles.length) {
    console.error(`No se encontraron shards tech_shard_*.json en ${STAGING_DIR}`);
    process.exit(1);
  }

  const patchById = new Map();
  for (const f of shardFiles) {
    const items = JSON.parse(fs.readFileSync(path.join(STAGING_DIR, f), 'utf8'));
    for (const it of items) {
      if (it && it.brick_id) patchById.set(it.brick_id, it);
    }
    console.log(`Cargado ${f}: ${items.length} registros.`);
  }

  let updated = 0;
  let totalExcluded = 0;
  let newlyExcluded = 0;
  const techIndex = {};

  for (const b of master) {
    const wasExcluded = Boolean(b.exclude_from_humanization);
    let patch = patchById.get(b.brick_id);
    if (!patch) {
      const raw = decodeAllEntities(b.raw_text || b.text || '');
      const res = analyzeBrickTechnical(raw);
      patch = {
        exclude_from_humanization: wasExcluded || res.purity.isOffDomainIntruder || res.purity.hasDiaryMetaJunk,
        exclusion_reason: (res.purity.isOffDomainIntruder || res.purity.hasDiaryMetaJunk) ? res.purity.reason : (b.exclusion_reason || null),
        lens_tech_tags: res.lens_tech_tags,
        optical_mechanisms: res.optical_mechanisms,
        has_negative_usage_clause: res.has_negative_usage_clause
      };
    } else {
      updated++;
    }

    if (patch.exclude_from_humanization) {
      b.exclude_from_humanization = true;
      if (patch.exclusion_reason) b.exclusion_reason = patch.exclusion_reason;
      totalExcluded++;
      if (!wasExcluded) newlyExcluded++;
    }

    b.lens_tech_tags = patch.lens_tech_tags || [];
    b.optical_mechanisms = patch.optical_mechanisms || [];
    b.has_negative_usage_clause = Boolean(patch.has_negative_usage_clause);

    if (!b.exclude_from_humanization) {
      for (const tg of [...b.lens_tech_tags, ...b.optical_mechanisms]) {
        if (!techIndex[tg]) techIndex[tg] = [];
        techIndex[tg].push(b.brick_id);
      }
      if (b.has_negative_usage_clause) {
        if (!techIndex._negative_usage_clause) techIndex._negative_usage_clause = [];
        techIndex._negative_usage_clause.push(b.brick_id);
      }
    }
  }

  writeJsonAtomic(MASTER_PATH, master);

  const framesToUpdate = [...Object.keys(TAXONOMY.frames), 'TRANSITION_CURATION'];
  for (const frameKey of framesToUpdate) {
    const frameBricks = master.filter(b => b.frame === frameKey && !b.exclude_from_humanization);
    const framePath = path.join(MARCOS_DIR, `${frameKey.toLowerCase()}.json`);
    writeJsonAtomic(framePath, frameBricks);
  }
  writeJsonAtomic(
    path.resolve('banco_ontologico_semantico/taller_optico_puro.json'),
    master.filter(b => b.tier === 'TIER_1_WORKSHOP' && !b.exclude_from_humanization)
  );
  writeJsonAtomic(
    path.resolve('banco_ontologico_semantico/glitches_humanos_certificados.json'),
    master.filter(b => b.metrics?.has_human_glitch && !b.exclude_from_humanization)
  );

  const techIndexPath = path.resolve('banco_ontologico_semantico/indice_tecnologia_optica.json');
  writeJsonAtomic(techIndexPath, techIndex);

  // Rebuild 128-D vectors + BM25 index cleanly over active non-excluded bricks
  const engine = require(path.resolve('desktop-app/electron/engine/neurosymbolic-engine.cjs'));
  engine.loadBanks();
  const stats = engine.getBankStats();

  console.log(JSON.stringify({
    totalMaster: master.length,
    updatedFromShards: updated,
    totalExcluded,
    newlyExcluded,
    activeBricks: master.length - totalExcluded,
    techBuckets: Object.fromEntries(Object.entries(techIndex).map(([k, v]) => [k, v.length])),
    techIndexPath,
    engineStats: stats
  }, null, 2));
}

const opts = parseArgs(process.argv.slice(2));
if (opts.merge) {
  runMerge();
} else {
  runRange({ start: opts.start, end: opts.end, outPath: opts.out });
}
