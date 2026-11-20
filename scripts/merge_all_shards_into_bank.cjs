const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  MASTER_PATH,
  MARCOS_DIR,
  STAGING_DIR,
  TAXONOMY,
  writeJsonAtomic,
  decodeAllEntities,
  normalizeAsciiKey,
  normalizeEsKey,
  splitSentencesSafe,
  extractTopicTags,
  classifyDiscourseIntent,
  detectNarrativePersona,
  detectPolarity,
  tagBrickFromRaw
} = require('./mass_harvesting/blog_grinder_core.cjs');

const BACKUP_PATH = path.join(STAGING_DIR, 'backup_banco_maestro_pre_megagrind.json');

function run() {
  console.log('=== CONSOLIDACIÓN GLOBAL ETIQUETADA DE SHARDS -> BANCO MAESTRO ===');
  if (!fs.existsSync(MASTER_PATH)) {
    console.error(`No existe el banco maestro en ${MASTER_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(MASTER_PATH, BACKUP_PATH);
    console.log(`Backup creado en ${BACKUP_PATH}`);
  } else {
    console.log(`Backup existente preservado en ${BACKUP_PATH}`);
  }

  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  const beforeCount = master.length;
  console.log(`Ladrillos base existentes: ${beforeCount} (${master[0]?.brick_id}..${master[master.length - 1]?.brick_id})`);

  const seenAscii = new Set();
  const seenEs = new Set();
  const seenSents = new Set();

  const registerNorm = (txt) => {
    const a = normalizeAsciiKey(txt);
    const e = normalizeEsKey(txt);
    if (a) seenAscii.add(a);
    if (e) seenEs.add(e);
    for (const s of splitSentencesSafe(txt || '')) {
      const sn = normalizeEsKey(s);
      if (sn.length >= 26) seenSents.add(sn);
    }
  };

  for (const b of master) {
    registerNorm(b.raw_text);
    const raw = b.raw_text || '';
    if (!Array.isArray(b.topic_tags) || !b.topic_tags.length) {
      b.topic_tags = extractTopicTags(raw);
    }
    if (!b.discourse_intent) {
      b.discourse_intent = classifyDiscourseIntent(raw, b.frame);
    }
    if (!b.narrative_persona) {
      b.narrative_persona = detectNarrativePersona(raw);
    }
    if (!b.polarity) {
      b.polarity = detectPolarity(raw);
    }
  }
  if (fs.existsSync(MARCOS_DIR)) {
    for (const f of fs.readdirSync(MARCOS_DIR)) {
      if (f.startsWith('golden_') && f.endsWith('.json')) {
        const gData = JSON.parse(fs.readFileSync(path.join(MARCOS_DIR, f), 'utf8'));
        for (const g of gData) registerNorm(g.raw_text || g.text);
      }
    }
  }

  let maxIdNum = 0;
  for (const b of master) {
    const m = (b.brick_id || '').match(/^brick_(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxIdNum) maxIdNum = n;
    }
  }

  const shardFiles = fs.readdirSync(STAGING_DIR)
    .filter(f => (f.startsWith('shard_') && f.endsWith('.json')) || f === 'harvested_editorial_gaps_v3.json')
    .sort();

  console.log(`Archivos de staging encontrados (${shardFiles.length}): ${shardFiles.join(', ')}`);

  const newBricks = [];
  let totalCandidates = 0;
  let skippedDate = 0;
  let skippedDupes = 0;
  let skippedSlotBroken = 0;
  let skippedBounds = 0;
  const addedByShard = {};
  const addedByFrame = {};
  const addedByDomain = {};
  const addedByTag = {};

  for (const fname of shardFiles) {
    const fpath = path.join(STAGING_DIR, fname);
    let items = [];
    try {
      items = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    } catch {
      console.warn(`Saltando staging inválido: ${fname}`);
      continue;
    }
    if (!Array.isArray(items)) continue;
    let shardAdded = 0;

    for (const item of items) {
      totalCandidates++;
      if (!item.publish_date || item.publish_date >= '2022-01-01' || item.publish_date < '2004-01-01') {
        skippedDate++;
        continue;
      }
      const clean = decodeAllEntities(item.raw_text || item.text || '');
      if (/\/\/leer/i.test(clean)) continue;
      const wc = clean.split(/\s+/).filter(Boolean).length;
      const sents = splitSentencesSafe(clean);
      if (wc < 22 || wc > 130 || sents.length < 1) {
        skippedBounds++;
        continue;
      }

      const normA = normalizeAsciiKey(clean);
      const normE = normalizeEsKey(clean);
      if (!normA || !normE || seenAscii.has(normA) || seenEs.has(normE)) {
        skippedDupes++;
        continue;
      }

      const overlapSents = sents.filter(s => {
        const sn = normalizeEsKey(s);
        return sn.length >= 26 && seenSents.has(sn);
      }).length;
      if (overlapSents >= sents.length || (sents.length >= 2 && overlapSents / sents.length > 0.6)) {
        skippedDupes++;
        continue;
      }

      maxIdNum++;
      const brickId = `brick_${String(maxIdNum).padStart(6, '0')}`;
      const tagged = tagBrickFromRaw({ ...item, text: clean }, brickId);
      if (!tagged) {
        maxIdNum--;
        skippedSlotBroken++;
        continue;
      }

      registerNorm(clean);
      newBricks.push(tagged);
      shardAdded++;
      addedByFrame[tagged.frame] = (addedByFrame[tagged.frame] || 0) + 1;
      addedByDomain[tagged.source_domain] = (addedByDomain[tagged.source_domain] || 0) + 1;
      for (const tg of tagged.topic_tags || []) {
        addedByTag[tg] = (addedByTag[tg] || 0) + 1;
      }
    }

    addedByShard[fname] = shardAdded;
  }

  const mergedBank = [...master, ...newBricks];
  writeJsonAtomic(MASTER_PATH, mergedBank);

  const firstNewId = newBricks[0]?.brick_id || 'NONE';
  const lastNewId = newBricks[newBricks.length - 1]?.brick_id || 'NONE';

  console.log(`\n=============================================================`);
  console.log(`BANCO MAESTRO ACTUALIZADO: ${beforeCount} -> ${mergedBank.length} (+${newBricks.length} ladrillos: ${firstNewId}..${lastNewId})`);
  console.log(`Candidatos totales leídos: ${totalCandidates} | Duplicados/solapados: ${skippedDupes} | Fecha inválida: ${skippedDate} | Longitud: ${skippedBounds} | Slot roto: ${skippedSlotBroken}`);
  console.log(`Aporte neto por shard:`, addedByShard);
  console.log(`Nuevos por marco FrameNet:`, addedByFrame);
  console.log(`Top 20 dominios aportados:`, Object.entries(addedByDomain).sort((a, b) => b[1] - a[1]).slice(0, 20));
  console.log(`Top etiquetas temáticas (topic_tags):`, Object.entries(addedByTag).sort((a, b) => b[1] - a[1]));

  // Rebuild marcos/*.json without touching golden_*.json
  const framesToUpdate = [...Object.keys(TAXONOMY.frames), 'TRANSITION_CURATION'];
  for (const frameKey of framesToUpdate) {
    const frameBricks = mergedBank.filter(b => b.frame === frameKey && !b.exclude_from_humanization);
    const framePath = path.join(MARCOS_DIR, `${frameKey.toLowerCase()}.json`);
    writeJsonAtomic(framePath, frameBricks);
    console.log(`Actualizado marcos/${frameKey.toLowerCase()}.json: ${frameBricks.length} donantes`);
  }

  const workshopPure = mergedBank.filter(b => b.tier === 'TIER_1_WORKSHOP' && !b.exclude_from_humanization);
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/taller_optico_puro.json'), workshopPure);

  const glitchesPool = mergedBank.filter(b => b.metrics?.has_human_glitch && !b.exclude_from_humanization);
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/glitches_humanos_certificados.json'), glitchesPool);

  // Build enterprise inverted indices for topic_tags, discourse_intent, narrative_persona, and polarity
  const topicTagIndex = {};
  const intentIndex = {};
  const personaIndex = {};
  for (const b of mergedBank) {
    if (b.exclude_from_humanization) continue;
    for (const tg of b.topic_tags || []) {
      if (!topicTagIndex[tg]) topicTagIndex[tg] = [];
      topicTagIndex[tg].push(b.brick_id);
    }
    const intent = b.discourse_intent || 'STYLE_DEFINITION';
    if (!intentIndex[intent]) intentIndex[intent] = [];
    intentIndex[intent].push(b.brick_id);

    const persona = b.narrative_persona || 'IMPERSONAL_THIRD';
    if (!personaIndex[persona]) personaIndex[persona] = [];
    personaIndex[persona].push(b.brick_id);
  }
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/indice_topic_tags.json'), topicTagIndex);
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/indice_intencion_discursiva.json'), intentIndex);
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/indice_persona_narrativa.json'), personaIndex);
  console.log('Índices invertidos empresariales generados: indice_topic_tags.json, indice_intencion_discursiva.json, indice_persona_narrativa.json');

  console.log('\nEjecutando scripts/verify_and_index_banco.cjs...');
  const verifyOut = execFileSync(process.execPath, [path.resolve('scripts/verify_and_index_banco.cjs')], { encoding: 'utf8' });
  console.log(verifyOut);
}

run();
