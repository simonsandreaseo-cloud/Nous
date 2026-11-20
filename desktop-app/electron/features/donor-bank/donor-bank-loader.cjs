'use strict';

const fs = require('fs');
const path = require('path');
const { BANK_DIR } = require('../../shared/app-paths.cjs');
const enterpriseRetriever = require('./hybrid-donor-retriever.cjs');
const { SEMANTIC_STOPWORDS_ES } = require('../text-analysis/lexical-constants.cjs');
const { tokenize } = require('../text-analysis/draft-preprocessor.cjs');
const {
  computeFunctionalTokenRatio,
  expandSlotsForSemanticEval,
  isClinicalOrEncyclopedicDomain,
  extractCleanDonorWindow
} = require('../rewrite-tracks/track-a-donor-grafting/donor-skeleton-cleaner.cjs');

function createDonorBankState() {
  return {
    isLoaded: false,
    unifiedBanks: { triads: [], duos: [], singles: [] },
    goldenMM: [],
    goldenOP: [],
    goldenVH: [],
    glitches: [],
    masterBricks: [],
    techIndex: {},
    frameIndex: {},
    brickById: new Map(),
    unifiedCorpusBricks: [],
    goldenIndex: {},
    corpus7GramMap: new Map(),
    corpusIdf: new Map(),
    _usableCleanBlocksCount: undefined,
    enableAntiPlagiarism: false
  };
}

function loadBanks(bankState) {
  if (bankState.isLoaded) return;
  const baseDir = BANK_DIR;

  const unifiedPath = path.join(baseDir, 'banco_maestro_retorico_unificado.json');
  if (fs.existsSync(unifiedPath)) {
    try {
      const u = JSON.parse(fs.readFileSync(unifiedPath, 'utf8'));
      bankState.unifiedBanks = {
        triads: u.triads || [],
        duos: u.duos || [],
        singles: u.singles || []
      };
    } catch (e) {
      console.error('Error cargando banco unificado:', e.message);
    }
  }

  const mmPath = path.join(baseDir, 'marcos/golden_material_mechanics.json');
  if (fs.existsSync(mmPath)) {
    try {
      bankState.goldenMM = JSON.parse(fs.readFileSync(mmPath, 'utf8'));
    } catch (e) {
      console.error('Error cargando golden MM:', e.message);
    }
  }

  const opPath = path.join(baseDir, 'marcos/golden_optical_protection.json');
  if (fs.existsSync(opPath)) {
    try {
      bankState.goldenOP = JSON.parse(fs.readFileSync(opPath, 'utf8'));
    } catch (e) {
      console.error('Error cargando golden OP:', e.message);
    }
  }

  const vhPath = path.join(baseDir, 'marcos/golden_visagism_heritage.json');
  if (fs.existsSync(vhPath)) {
    try {
      bankState.goldenVH = JSON.parse(fs.readFileSync(vhPath, 'utf8'));
    } catch (e) {
      console.error('Error cargando golden VH:', e.message);
    }
  }

  const glitchesPath = path.join(baseDir, 'glitches_humanos_certificados.json');
  if (fs.existsSync(glitchesPath)) {
    try {
      bankState.glitches = JSON.parse(fs.readFileSync(glitchesPath, 'utf8'));
    } catch (e) {
      console.error('Error cargando glitches:', e.message);
    }
  }

  const masterPath = path.join(baseDir, 'banco_maestro_ladrillos_retoricos.json');
  if (fs.existsSync(masterPath)) {
    try {
      bankState.masterBricks = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    } catch (e) {
      console.error('Error cargando master bricks:', e.message);
    }
  }

  const techIndexPath = path.join(baseDir, 'indice_tecnologia_optica.json');
  bankState.techIndex = {};
  if (fs.existsSync(techIndexPath)) {
    try {
      bankState.techIndex = JSON.parse(fs.readFileSync(techIndexPath, 'utf8'));
    } catch (e) {
      console.error('Error cargando índice técnico óptico:', e.message);
    }
  }

  // Indexation dinamica en memoria por FrameNet Frame + Mapa O(1) por ID
  bankState.frameIndex = {};
  bankState.brickById = new Map();
  const seenCorpusStems = new Set();
  const brokenMarkdownRx = /\[\s*[^\]]+\]\s*\(/;
  const allCapsHeadingRx = /\b[A-ZÁÉÍÓÚÑ]{3,}\s+[A-ZÁÉÍÓÚÑ]{3,}/;
  const extractNormSents = (txt) => (txt || '')
    .replace(/\.([A-ZÁÉÍÓÚÑ])/g, '. $1')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.toLowerCase()
      .replace(/^rostro\s+[a-záéíóúñ]+\s+(?=(?:el|la|los|las|a|en|para|si|es|un|una)\b)/i, '')
      .replace(/\bademas\b/g, 'además')
      .replace(/\[slot_[a-z_]+\]/gi, '')
      .replace(/[^a-záéíóúüñ0-9]+/g, ' ')
      .trim()
      .slice(0, 32))
    .filter(s => s.length >= 18);

  for (const b of bankState.masterBricks) {
    const stem = (b.raw_text || '').toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 45);
    if (stem) seenCorpusStems.add(stem);
    for (const s of extractNormSents(b.raw_text)) seenCorpusStems.add(s);
    if (b.exclude_from_humanization) continue;
    bankState.brickById.set(b.brick_id, b);
    if (!bankState.frameIndex[b.frame]) bankState.frameIndex[b.frame] = [];
    bankState.frameIndex[b.frame].push(b);
  }

  // Integrar bloques unificados certificados pre-2022 (singles + duos) en frameIndex
  const mapUnifiedFrame = (item) => {
    const fn = (item.rhetorical_function || item.primary_function || '').toUpperCase();
    const fam = (item.rhetorical_family || item.primary_family || '').toUpperCase();
    if (fn.includes('VISAGISMO') || fam.includes('VISAGISMO')) return 'VISAGISM_AESTHETICS';
    if (fn.includes('OPTICA') || fn.includes('VIDRIO') || fn.includes('SENSORIAL')) return 'OPTICAL_PROTECTION';
    if (fn.includes('MATERIAL') || fn.includes('ANATOMIA') || fn.includes('ERGONOMIA')) return 'MATERIAL_COMPOSITION';
    return 'GENERAL_STYLE';
  };

  bankState.unifiedCorpusBricks = [];
  const allUnifiedFor7Gram = [];
  const rawUnified = [
    ...(Array.isArray(bankState.unifiedBanks.triads) ? bankState.unifiedBanks.triads.map(x => ({ ...x, _isTriad: true })) : []),
    ...(Array.isArray(bankState.unifiedBanks.duos) ? bankState.unifiedBanks.duos.map(x => ({ ...x, _isDuo: true })) : []),
    ...(Array.isArray(bankState.unifiedBanks.singles) ? bankState.unifiedBanks.singles : [])
  ];
  const unifiedOpticalRx = /\b(?:gafas?|monturas?|lentes?|cristales|solares?|rostro|cara|facciones|armazón|varillas?|puente|acetato|pasta|polarizad|visagismo|óptica)\b/i;
  for (const u of rawUnified) {
    if (u.exclude_from_humanization || !u.text) continue;
    const uDomLower = (u.source_domain || u.source_origin || '').toLowerCase();
    if (/wikipedia\.org/i.test(uDomLower)) continue;
    const uId = u.id || `unified_${bankState.unifiedCorpusBricks.length}`;
    allUnifiedFor7Gram.push({ brick_id: uId, raw_text: u.text });
    if (!unifiedOpticalRx.test(u.text)) continue;

    const uSents = extractNormSents(u.text);
    const stem = u.text.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 45);
    // Allow multi-sentence triads/duos even if one isolated sentence also appeared in masterBricks, as long as the full block stem is unique
    if ((stem && seenCorpusStems.has(stem)) || (!u._isTriad && !u._isDuo && uSents.some(s => seenCorpusStems.has(s))) || brokenMarkdownRx.test(u.text) || allCapsHeadingRx.test(u.text)) {
      continue;
    }
    if (stem) seenCorpusStems.add(stem);
    if (!u._isTriad && !u._isDuo) {
      for (const s of uSents) seenCorpusStems.add(s);
    }

    const uFrame = mapUnifiedFrame(u);
    const normalizedBrick = {
      brick_id: uId,
      source_domain: u.source_domain || u.source_origin || 'corpus_unificado',
      source_origin: u.source_origin || null,
      tier: u.tier === 1 || u.tier === 2 ? 'TIER_1_WORKSHOP' : 'TIER_2_EDITORIAL',
      voice_category: u.tier <= 2 ? 'WORKSHOP_CLINICAL' : 'EDITORIAL_FASHION',
      frame: uFrame,
      rhetorical_relation: u.rhetorical_function || u.primary_function || 'ELABORATION',
      raw_text: u.text,
      syntactic_skeleton: u.text,
      word_count: u.total_words || u.text.split(/\s+/).filter(Boolean).length,
      slots: [],
      metrics: {
        has_human_glitch: Boolean(u.has_human_glitch),
        functional_token_ratio: computeFunctionalTokenRatio(u.text)
      },
      _isUnified: true,
      _isTriad: Boolean(u._isTriad),
      _isDuo: Boolean(u._isDuo)
    };
    bankState.unifiedCorpusBricks.push(normalizedBrick);
    bankState.brickById.set(uId, normalizedBrick);
    if (!bankState.frameIndex[uFrame]) bankState.frameIndex[uFrame] = [];
    bankState.frameIndex[uFrame].push(normalizedBrick);
  }

  // Indexar tambien marcos dorados certificados (material, optica, visagismo)
  const goldenSets = [
    ...(Array.isArray(bankState.goldenMM) ? bankState.goldenMM : []),
    ...(Array.isArray(bankState.goldenOP) ? bankState.goldenOP : []),
    ...(Array.isArray(bankState.goldenVH) ? bankState.goldenVH : [])
  ];
  bankState.goldenIndex = {};
  for (const g of goldenSets) {
    if (g.exclude_from_humanization) continue;
    const gId = g.brick_id || g.golden_id || g.donor_id;
    if (gId) bankState.brickById.set(gId, { ...g, brick_id: gId, _isGolden: true });
    const frameKey = g.frame || 'GENERAL_STYLE';
    if (!bankState.goldenIndex[frameKey]) bankState.goldenIndex[frameKey] = [];
    bankState.goldenIndex[frameKey].push(g);
  }

  // Indice global O(1) de 7-gramas del banco completo para auditoria antiplagio k<=6
  bankState.corpus7GramMap = new Map();
  const allCorpus = [...bankState.masterBricks, ...allUnifiedFor7Gram, ...goldenSets];
  for (const item of allCorpus) {
    const bId = item.brick_id || item.golden_id || item.donor_id || 'corpus';
    const words = tokenize(item.raw_text || item.text || '');
    if (words.length < 7) continue;
    for (let i = 0; i <= words.length - 7; i++) {
      const s7 = words.slice(i, i + 7).join(' ');
      if (!bankState.corpus7GramMap.has(s7)) {
        bankState.corpus7GramMap.set(s7, bId);
      }
    }
  }

  // Indice global TF-IDF (IDF) para recuperación semántica real sobre el banco óptico
  const dfMap = new Map();
  const idfDocs = [...bankState.masterBricks, ...bankState.unifiedCorpusBricks, ...goldenSets];
  const normSemTok = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const item of idfDocs) {
    const toks = new Set(
      tokenize(item.raw_text || item.text || '')
        .map(normSemTok)
        .filter(t => t.length >= 3 && !SEMANTIC_STOPWORDS_ES.has(t))
    );
    for (const t of toks) {
      dfMap.set(t, (dfMap.get(t) || 0) + 1);
    }
  }
  bankState.corpusIdf = new Map();
  const totalIdfDocs = Math.max(1, idfDocs.length);
  for (const [tok, df] of dfMap.entries()) {
    bankState.corpusIdf.set(tok, Math.log((totalIdfDocs + 1) / (df + 1)) + 1);
  }

  const allHybridDocs = [
    ...bankState.masterBricks.filter(b => !b.exclude_from_humanization),
    ...bankState.unifiedCorpusBricks,
    ...goldenSets.filter(g => !g.exclude_from_humanization)
  ];
  enterpriseRetriever.buildIndex(allHybridDocs, (txt, slots) => expandSlotsForSemanticEval(txt, slots));

  bankState.isLoaded = true;
  console.log(`[NeurosymbolicEngine] Bancos Biológicos Pre-2022 cargados: ${bankState.masterBricks.length} ladrillos maestros + ${bankState.unifiedCorpusBricks.length} bloques unificados + ${goldenSets.length} marcos dorados (${bankState.corpus7GramMap.size} 7-gramas + ${bankState.corpusIdf.size} términos IDF + ${enterpriseRetriever.bm25Idf.size} términos BM25 + Proyección léxica 128-D indexados).`);
}

function computeUsableCleanBlocksCount(bankState) {
  let count = 0;
  const allShapesAtoms = { shapes: ['redondas', 'cuadradas', 'aviador', 'ojo de gato', 'mariposa', 'geométrica', 'ovalada'] };
  const candidates = [...(bankState.masterBricks || []), ...(bankState.unifiedCorpusBricks || [])];
  for (const b of candidates) {
    if (b.exclude_from_humanization || isClinicalOrEncyclopedicDomain(b, '')) continue;
    let cw = extractCleanDonorWindow(b, 60, b.frame || 'GENERAL_STYLE', null, { paragraphMode: true, minWords: 30, maxWords: 110 });
    if (!cw || cw.split(/(?<=[.!?])\s+/).length < 2) {
      cw = extractCleanDonorWindow(b, 60, b.frame || 'GENERAL_STYLE', allShapesAtoms, { paragraphMode: true, minWords: 30, maxWords: 110 });
    }
    if (cw && cw.split(/(?<=[.!?])\s+/).length >= 2) count++;
  }
  bankState._usableCleanBlocksCount = count;
  return count;
}

function getBankStats(bankState) {
  const goldenCount = (bankState.goldenMM?.length || 0) + (bankState.goldenOP?.length || 0) + (bankState.goldenVH?.length || 0);
  if (bankState.isLoaded && bankState._usableCleanBlocksCount === undefined) {
    computeUsableCleanBlocksCount(bankState);
  }
  return {
    masterBricks: bankState.masterBricks?.length || 0,
    unifiedBricks: bankState.unifiedCorpusBricks?.length || 0,
    goldenCount,
    idfTerms: bankState.corpusIdf?.size || 0,
    bm25Terms: enterpriseRetriever.bm25Idf?.size || 0,
    vectorDim: 128,
    topicTagsIndexed: enterpriseRetriever.byTopicTag?.size || 0,
    intentBucketsIndexed: enterpriseRetriever.byIntent?.size || 0,
    usableCleanBlocks: bankState._usableCleanBlocksCount ?? null
  };
}

function reloadBanks(bankState) {
  bankState.isLoaded = false;
  bankState._usableCleanBlocksCount = undefined;
  loadBanks(bankState);
  return getBankStats(bankState);
}

module.exports = {
  createDonorBankState,
  loadBanks,
  computeUsableCleanBlocksCount,
  getBankStats,
  reloadBanks
};
