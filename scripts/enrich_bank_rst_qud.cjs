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
const { analyzeBrickDiscourseProfile } = require('../desktop-app/electron/engine/discourse-topology.cjs');

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

  const dist = {};
  const shard = [];

  for (let i = safeStart; i < safeEnd; i++) {
    const b = master[i];
    const raw = decodeAllEntities(b.raw_text || b.text || '');
    const skel = b.syntactic_skeleton || raw;
    const profile = analyzeBrickDiscourseProfile(raw, skel, b.slots || []);

    dist[profile.discourse_closure] = (dist[profile.discourse_closure] || 0) + 1;
    shard.push({
      index: i,
      brick_id: b.brick_id,
      discourse_closure: profile.discourse_closure,
      anchor_position_ratio: profile.anchor_position_ratio,
      post_anchor_words: profile.post_anchor_words,
      anaphoric_open: profile.anaphoric_open,
      cataphoric_open: profile.cataphoric_open
    });
  }

  const targetOut = outPath
    ? path.resolve(outPath)
    : path.join(STAGING_DIR, `rst_shard_${safeStart}_${safeEnd}.json`);
  writeJsonAtomic(targetOut, shard);

  console.log(JSON.stringify({
    range: `${safeStart}..${safeEnd - 1}`,
    processed: shard.length,
    distribution: dist,
    outputPath: targetOut
  }, null, 2));
}

function runMerge() {
  console.log('=== MERGE DE SHARDS RST/QUD -> BANCO MAESTRO + INDICE DE TOPOLOGIA DISCURSIVA ===');
  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  const shardFiles = fs.readdirSync(STAGING_DIR)
    .filter(f => /^rst_shard_.*\.json$/i.test(f))
    .sort();

  if (!shardFiles.length) {
    console.error(`No se encontraron shards rst_shard_*.json en ${STAGING_DIR}`);
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
  let fallback = 0;
  const distAll = {};
  const topologyIndex = {};

  for (const b of master) {
    let patch = patchById.get(b.brick_id);
    if (!patch) {
      fallback++;
      patch = analyzeBrickDiscourseProfile(
        decodeAllEntities(b.raw_text || b.text || ''),
        b.syntactic_skeleton || b.raw_text || '',
        b.slots || []
      );
    } else {
      updated++;
    }

    b.discourse_closure = patch.discourse_closure;
    b.anchor_position_ratio = patch.anchor_position_ratio;
    b.post_anchor_words = patch.post_anchor_words;
    b.anaphoric_open = patch.anaphoric_open;
    b.cataphoric_open = patch.cataphoric_open;

    distAll[b.discourse_closure] = (distAll[b.discourse_closure] || 0) + 1;
    if (!b.exclude_from_humanization) {
      if (!topologyIndex[b.discourse_closure]) topologyIndex[b.discourse_closure] = [];
      topologyIndex[b.discourse_closure].push(b.brick_id);
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

  const topoIndexPath = path.resolve('banco_ontologico_semantico/indice_topologia_discursiva.json');
  writeJsonAtomic(topoIndexPath, topologyIndex);

  console.log(JSON.stringify({
    totalMaster: master.length,
    updatedFromShards: updated,
    fallbackComputed: fallback,
    coveragePct: Number(((updated + fallback) / Math.max(1, master.length) * 100).toFixed(2)),
    distribution: distAll,
    indexBuckets: Object.fromEntries(Object.entries(topologyIndex).map(([k, v]) => [k, v.length])),
    topoIndexPath
  }, null, 2));
}

const opts = parseArgs(process.argv.slice(2));
if (opts.merge) {
  runMerge();
} else {
  runRange({ start: opts.start, end: opts.end, outPath: opts.out });
}
