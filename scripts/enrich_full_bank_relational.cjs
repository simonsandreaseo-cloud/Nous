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
  abstractSkeleton,
  extractTopicTags,
  classifyDiscourseIntent,
  detectNarrativePersona,
  detectPolarity,
  detectRhetoricalRelation
} = require('./mass_harvesting/blog_grinder_core.cjs');

const EXTRA_TOPIC_TAG_RULES = [
  { tag: 'monturas_sol_general', rx: /\b(?:gafas(?:\s+de\s+sol)?|monturas?|armaz[oó]n(?:es)?|solares?)\b/i },
  { tag: 'estilismo_armario', rx: /\b(?:vestidos?|prendas?|camisetas?|jeans|vaqueros|traje|ropa|lino|algod[oó]n|cuero|encaje|estilismos?|conjuntos?|complementos?|accesorios?)\b/i },
  { tag: 'ergonomia_facial', rx: /\b(?:nariz|sienes|orejas|presi[oó]n|opriman|pesen|peso|c[oó]mod[oa]s?|adaptan?|sujec|movimiento|talla|calibre|medida)\b/i },
  { tag: 'diseno_autor_firma', rx: /\b(?:firma|marcas?|colecci[oó]n|diseñador(?:es|as)?|creaci[oó]n|modelo|edici[oó]n|lanzamiento|propuesta)\b/i },
  { tag: 'geometria_silueta', rx: /\b(?:silueta|l[ií]neas?|contorno|formas?|simetr[ií]a|proporci[oó]n|marcadas?|suaves?|rectas?|curvas?|alargad[oa]s?|estilizad[oa]s?)\b/i },
  { tag: 'colorimetria_lentes', rx: /\b(?:color(?:es)?|tonos?|tonalidades?|mate|brillo|transl[uú]cid[oa]s?|transparente|negro|blanco|rojo|azul|verde|gris|rosa|amarill[oa])\b/i }
];

const CAUSAL_RELATION_RULES = [
  {
    rel: 'PAIRS_WITH_GARMENT',
    rx: /\b(?:combinan?\s+con|combinar(?:las|los)?\s+con|junto\s+a|sienta(?:n)?\s+(?:bien|de\s+maravilla)\s+con|con\s+(?:vestidos?|prendas?|lino|jeans|camisetas?|traje|vaqueros|estilismos?|looks?|conjuntos?))\b/i
  },
  {
    rel: 'USED_IN_CONTEXT',
    rx: /\b(?:este\s+verano|en\s+verano|en\s+primavera|todo\s+el\s+a[ñn]o|en\s+la\s+ciudad|en\s+la\s+playa|en\s+la\s+oficina|pasarelas?|fiestas?|d[ií]a\s+a\s+d[ií]a|aire\s+libre|a[ñn]os\s*(?:50|60|70|80|90)|paseo|conducci[oó]n|entretiempo|uso\s+diario)\b/i
  },
  {
    rel: 'CAUSES_BENEFIT',
    rx: /\b(?:gracias\s+a|por\s+lo\s+que|de\s+modo\s+que|de\s+tal\s+(?:forma|manera)\s+que|para\s+que\s+no|logra(?:n)?\s+que|permite(?:n)?\s+que|consigue(?:n)?\s+aportar|por\s+eso|ya\s+que|puesto\s+que|debido\s+a|porque|evitando\s+que)\b/i
  },
  {
    rel: 'BALANCES_FACE_SHAPE',
    rx: /\b(?:sienta(?:n)?\s+(?:muy\s+)?bien\s+a|favorece(?:n)?\s+(?:en|a)\s+(?:los\s+|las\s+)?(?:rostros?|caras?)|facciones\s+marcadas|cara\s+m[aá]s\s+bien|estiliza(?:n)?\s+(?:mucho\s+)?el\s+rostro|tipo\s+de\s+(?:rostro|cara)|suaviza(?:n)?\s+(?:las\s+|los\s+)?(?:facciones|rasgos|[aá]ngulos)|equilibra(?:n)?\s+(?:el\s+rostro|la\s+cara|los\s+rasgos)|armoniza(?:n)?|perfil\s+y\s+los\s+[aá]ngulos)\b/i
  },
  {
    rel: 'AVOID_FEATURE',
    rx: /\b(?:evitar|evita|evitando|descartar|no\s+le\s+van|no\s+opriman|no\s+recar(?:gar|guen)|sin\s+saturar|no\s+conviene|huir\s+de|no\s+son\s+recomendables|jam[aá]s|nunca\s+debes)\b/i
  },
  {
    rel: 'HAS_ATTRIBUTE',
    rx: /\b(?:montura\s+(?:redonda|cuadrada|ovalada|rectangular|geom[eé]trica|met[aá]lica)|fabricad[oa]s?\s+en|elaborad[oa]s?\s+en|acetato|titanio|acero|metal|carey|lentes\s+(?:polarizad|degradad|minerales)|acabados?\s+artesanales?|diseño|estilo)\b/i
  }
];

function extractFullTopicTags(text) {
  const baseTags = extractTopicTags(text);
  const tagSet = new Set(baseTags);
  for (const r of EXTRA_TOPIC_TAG_RULES) {
    if (r.rx.test(text)) tagSet.add(r.tag);
  }
  if (tagSet.size === 0) {
    tagSet.add('optica_editorial');
  }
  return [...tagSet];
}

function extractCausalRelations(text, slots = []) {
  const relSet = new Set();
  for (const r of CAUSAL_RELATION_RULES) {
    if (r.rx.test(text)) relSet.add(r.rel);
  }
  if (Array.isArray(slots)) {
    for (const s of slots) {
      if (!s || !s.slot_type) continue;
      if (s.slot_type === 'SLOT_OCCASION_OUTFIT') {
        const rv = String(s.raw_value || '').toLowerCase();
        if (/\b(?:lino|vestido|algod|prendas|look|camiseta|traje)\b/.test(rv)) relSet.add('PAIRS_WITH_GARMENT');
        else relSet.add('USED_IN_CONTEXT');
      } else if (s.slot_type === 'SLOT_FACIAL_FEATURE') {
        relSet.add('BALANCES_FACE_SHAPE');
      } else if (['SLOT_FRAME_SHAPE', 'SLOT_MATERIAL', 'SLOT_AESTHETIC_STYLE', 'SLOT_COLOR', 'SLOT_COATING', 'SLOT_TECHNIQUE'].includes(s.slot_type)) {
        relSet.add('HAS_ATTRIBUTE');
      }
    }
  }
  if (relSet.size === 0) {
    relSet.add('HAS_ATTRIBUTE');
  }
  return [...relSet];
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

function hasBrokenSlotSyntax(skeleton) {
  return /\[SLOT_[A-Z_]+\][a-záéíóúüñ]|[a-záéíóúüñ]\[SLOT_[A-Z_]+\]/i.test(String(skeleton || ''));
}

function runRange({ start = 0, end = Infinity, outPath }) {
  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  const safeStart = Math.max(0, Number.isFinite(start) ? start : 0);
  const safeEnd = Math.min(master.length, Number.isFinite(end) ? end : master.length);

  let slotsAdded = 0;
  let brokenSlotsRepaired = 0;
  let topicTagsFilled = 0;
  let causalTagged = 0;
  const enrichedSlice = [];

  for (let i = safeStart; i < safeEnd; i++) {
    const b = master[i];
    const raw = decodeAllEntities(b.raw_text || b.text || '');

    let nextSlots = Array.isArray(b.slots) ? b.slots : [];
    let nextSkeleton = b.syntactic_skeleton || raw;
    const isBrokenPreexisting = hasBrokenSlotSyntax(nextSkeleton);

    if ((nextSlots.length === 0 || isBrokenPreexisting) && raw) {
      const abs = abstractSkeleton(raw);
      if (abs && Array.isArray(abs.slots) && abs.slots.length > 0 && !hasBrokenSlotSyntax(abs.skeleton)) {
        nextSlots = abs.slots;
        nextSkeleton = abs.skeleton;
        if (isBrokenPreexisting) brokenSlotsRepaired++;
        else slotsAdded++;
      } else if (isBrokenPreexisting) {
        nextSlots = [];
        nextSkeleton = raw;
        brokenSlotsRepaired++;
      }
    }

    const hadTopicTags = Array.isArray(b.topic_tags) && b.topic_tags.length > 0;
    const nextTopicTags = extractFullTopicTags(raw);
    if (!hadTopicTags && nextTopicTags.length > 0) topicTagsFilled++;

    const nextIntent = b.discourse_intent || classifyDiscourseIntent(raw, b.frame);
    const nextPersona = b.narrative_persona || detectNarrativePersona(raw);
    const nextPolarity = b.polarity || detectPolarity(raw);
    const nextRhetorical = b.rhetorical_relation || detectRhetoricalRelation(raw);
    const nextCausal = extractCausalRelations(raw, nextSlots);
    if (nextCausal.length > 0) causalTagged++;

    enrichedSlice.push({
      index: i,
      brick_id: b.brick_id,
      slots: nextSlots,
      syntactic_skeleton: nextSkeleton,
      topic_tags: nextTopicTags,
      discourse_intent: nextIntent,
      narrative_persona: nextPersona,
      polarity: nextPolarity,
      rhetorical_relation: nextRhetorical,
      causal_relations: nextCausal
    });
  }

  const targetOut = outPath
    ? path.resolve(outPath)
    : path.join(STAGING_DIR, `enriched_shard_${safeStart}_${safeEnd}.json`);
  writeJsonAtomic(targetOut, enrichedSlice);

  console.log(JSON.stringify({
    range: `${safeStart}..${safeEnd - 1}`,
    processed: enrichedSlice.length,
    slotsAdded,
    brokenSlotsRepaired,
    topicTagsFilled,
    causalTagged,
    outputPath: targetOut
  }, null, 2));
}

function runMerge() {
  console.log('=== MERGE DE SHARDS ENRIQUECIDOS -> BANCO MAESTRO + ÍNDICES + EMBEDDINGS 128-D ===');
  const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  const shardFiles = fs.readdirSync(STAGING_DIR)
    .filter(f => /^enriched_shard_.*\.json$/i.test(f))
    .sort();

  if (!shardFiles.length) {
    console.error(`No se encontraron shards en ${STAGING_DIR}`);
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

  let updatedCount = 0;
  let missingCount = 0;
  for (const b of master) {
    const patch = patchById.get(b.brick_id);
    if (!patch) {
      missingCount++;
      continue;
    }
    if (!hasBrokenSlotSyntax(patch.syntactic_skeleton)) {
      b.slots = Array.isArray(patch.slots) ? patch.slots : (b.slots || []);
      b.syntactic_skeleton = patch.syntactic_skeleton || b.syntactic_skeleton || b.raw_text;
    }
    b.topic_tags = Array.isArray(patch.topic_tags) && patch.topic_tags.length ? patch.topic_tags : extractFullTopicTags(b.raw_text || '');
    b.discourse_intent = patch.discourse_intent || b.discourse_intent;
    b.narrative_persona = patch.narrative_persona || b.narrative_persona;
    b.polarity = patch.polarity || b.polarity;
    b.rhetorical_relation = patch.rhetorical_relation || b.rhetorical_relation;
    b.causal_relations = Array.isArray(patch.causal_relations) && patch.causal_relations.length
      ? patch.causal_relations
      : extractCausalRelations(b.raw_text || '', b.slots);
    updatedCount++;
  }

  writeJsonAtomic(MASTER_PATH, master);
  console.log(`Banco maestro guardado (${master.length} ladrillos, actualizados=${updatedCount}, faltantes=${missingCount}).`);

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

  const topicTagIndex = {};
  const intentIndex = {};
  const personaIndex = {};
  const causalIndex = {};
  for (const b of master) {
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

    for (const rel of b.causal_relations || []) {
      if (!causalIndex[rel]) causalIndex[rel] = [];
      causalIndex[rel].push(b.brick_id);
    }
  }
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/indice_topic_tags.json'), topicTagIndex);
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/indice_intencion_discursiva.json'), intentIndex);
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/indice_persona_narrativa.json'), personaIndex);
  writeJsonAtomic(path.resolve('banco_ontologico_semantico/indice_relaciones_causales.json'), causalIndex);
  console.log('Índices invertidos regenerados (incluyendo indice_relaciones_causales.json).');

  const verifyOut = execFileSync(process.execPath, [path.resolve('scripts/verify_and_index_banco.cjs')], { encoding: 'utf8' });
  console.log(verifyOut);

  // Reconstruir matriz densa Float32 128-D (indice_vectores_semanticos.bin + .meta.json)
  const engine = require(path.resolve('desktop-app/electron/engine/neurosymbolic-engine.cjs'));
  engine.loadBanks();
  const stats = engine.getBankStats();
  console.log('Estadísticas de matriz vectorial reconstruida:', stats);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.merge) {
  runMerge();
} else {
  runRange({ start: opts.start, end: opts.end, outPath: opts.out });
}
