'use strict';

const fs = require('fs');
const path = require('path');
const fg = require('../desktop-app/electron/features/text-analysis/factual-entailment-guard.cjs');
const dt = require('../desktop-app/electron/features/text-analysis/discourse-topology-analyzer.cjs');

const ROOT = path.resolve(__dirname, '..');
const masterPath = path.join(ROOT, 'banco_ontologico_semantico/banco_maestro_ladrillos_retoricos.json');
const topoPath = path.join(ROOT, 'banco_ontologico_semantico/indice_topologia_discursiva.json');
const techPath = path.join(ROOT, 'banco_ontologico_semantico/indice_tecnologia_optica.json');
const gapsPath = path.join(ROOT, 'banco_ontologico_semantico/registro_huecos_banco.json');

const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
const topoIdx = JSON.parse(fs.readFileSync(topoPath, 'utf8'));
const techIdx = JSON.parse(fs.readFileSync(techPath, 'utf8'));

// Normalize indice_topologia_discursiva.json whether grouped by closure keys or keyed by brick_id
const closureByBrick = new Map();
const closureNames = ['SELF_CONTAINED', 'LEAD_IN_FUNNEL', 'ELABORATION_BODY', 'CLOSER_SYNTHESIS'];
if (closureNames.some(k => Array.isArray(topoIdx[k]))) {
  for (const cname of closureNames) {
    for (const bid of (topoIdx[cname] || [])) {
      closureByBrick.set(bid, cname);
    }
  }
} else {
  for (const [bid, val] of Object.entries(topoIdx)) {
    const cl = typeof val === 'string' ? val : val?.discourse_closure;
    if (cl) closureByBrick.set(bid, cl);
  }
}

function resolveClosure(brick) {
  if (brick.discourse_closure) return brick.discourse_closure;
  if (closureByBrick.has(brick.brick_id)) return closureByBrick.get(brick.brick_id);
  return dt.analyzeBrickDiscourseProfile(brick.raw_text, brick.syntactic_skeleton, brick.slots).discourse_closure;
}

const total = master.length;
const excluded = master.filter(b => b.exclude_from_humanization).length;
const active = master.filter(b => !b.exclude_from_humanization);

// 1. Purity breakdown across ALL 13,344 active bricks
const purityBreakdown = {};
for (const b of active) {
  const p = fg.assessOpticalDomainPurity(b.raw_text || b.text || '');
  purityBreakdown[p.reason] = (purityBreakdown[p.reason] || 0) + 1;
}

// 2. Strict Carril A usability funnel
const cleanUsable = [];
const droppedReasons = { impurity: 0, quotesCta: 0, shortOrLong: 0, frozenYear: 0, brokenSlot: 0 };

for (const b of active) {
  const raw = String(b.raw_text || b.text || '').trim();
  const wc = raw.split(/\s+/).filter(Boolean).length;
  if (wc < 18 || wc > 180) { droppedReasons.shortOrLong++; continue; }
  if (!fg.assessOpticalDomainPurity(raw).isCleanOptical) { droppedReasons.impurity++; continue; }
  if (
    /[“”"@]/.test(raw) ||
    /\b(?:añadir al carrito|ver catálogo|consulta nuestro ranking|guía de compra|consejos para elegir)\b/i.test(raw)
  ) {
    droppedReasons.quotesCta++; continue;
  }
  if (/\b(19\d\d|20[0-2]\d)\b/.test(raw)) { droppedReasons.frozenYear++; continue; }
  if (/\[SLOT_[A-Z_]+\][a-záéíóúüñ]|[a-záéíóúüñ]\[SLOT_[A-Z_]+\]/i.test(b.syntactic_skeleton || '')) {
    droppedReasons.brokenSlot++; continue;
  }
  cleanUsable.push(b);
}

console.log('=== 1. EMBUDO GLOBAL DEL BANCO PRE-2022 ===');
console.log(JSON.stringify({
  totalMaster: total,
  excludedQuarantine: excluded,
  activeBricks: active.length,
  purityBreakdownActive: purityBreakdown,
  cleanUsableCarrilA: cleanUsable.length,
  survivalPctOfMaster: Number(((cleanUsable.length / total) * 100).toFixed(1)),
  droppedReasons
}, null, 2));

// 3. Matrix: Frame x discourse_closure (Meta-estructura)
const frameClosure = {};
const closureTotals = {};
for (const b of cleanUsable) {
  const fr = b.frame || 'UNKNOWN';
  const cl = resolveClosure(b) || 'UNKNOWN';
  frameClosure[fr] = frameClosure[fr] || {};
  frameClosure[fr][cl] = (frameClosure[fr][cl] || 0) + 1;
  closureTotals[cl] = (closureTotals[cl] || 0) + 1;
}
console.log('\n=== 2. DISTRIBUCIÓN META-ESTRUCTURA (CLEAN USABLE) ===');
console.log('Totales por cierre discursivo:', closureTotals);
console.log('Matriz Marco x Cierre:', JSON.stringify(frameClosure, null, 2));

// 4. Polarity, RST & Material-Slot profile on cleanUsable
const NEG_STRICT_RX = /\b(?:nunca\s+(?:debes|deben|uses?|utilices?)|jam[aá]s|no\s+debes\s+(?:usar\w*|utilizar\w*)|no\s+(?:son\s+|est[aá]n\s+|resultan\s+)?(?:permitid\w*|recomendab\w*|apt\w*|ideales?|convenientes?)|no\s+(?:te\s+(?:lo|las|los)\s+)?(?:recomendamos|aconsejamos|conviene)|no\s+deben\s+(?:usarse|utilizarse)|conviene\s+evitar\w*|evitar(?:las|los)?\s+si|descartar|prohibid\w*|inconveniente|desventaja|problema|no\s+(?:se\s+)?oscurec\w*|no\s+funcionan?\s+dentro|descascarill\w*|quebradiz\w*|tensi[oó]n\s+cervical|renunciar\s+a)\b/i;
const ADV_RX = /\b(?:pero|sin\s+embargo|aunque|en\s+cambio|mientras\s+que|no\s+obstante|a\s+diferencia\s+de)\b/i;
const CAUS_RX = /\b(?:porque|ya\s+que|debido\s+a|por\s+eso|por\s+lo\s+que|lo\s+que\s+permite|hace\s+que|provoca|obliga\s+a|de\s+modo\s+que)\b/i;
const COMP_RX = /\b(?:m[aá]s\s+[a-záéíóúüñ]+\s+que|mejor\s+[a-záéíóúüñ]*\s*que|menos\s+[a-záéíóúüñ]+\s+que)\b/i;

const rstCounts = {
  NEG_WARNING: 0,
  ADVERSATIVE: 0,
  CAUSAL: 0,
  COMPARATIVE: 0,
  ADV_AND_NEG: 0,
  CAUSAL_AND_NEG: 0,
  SINGLETON_PRODUCT_EARLY_SKU: 0,
  MONO_MATERIAL_SLOT: 0,
  MULTI_MATERIAL_SLOT: 0
};

for (const b of cleanUsable) {
  const raw = b.raw_text || '';
  const skel = b.syntactic_skeleton || '';
  const cl = resolveClosure(b);
  const tp = dt.analyzeBrickDiscourseProfile(raw, skel, b.slots);
  const isNeg = NEG_STRICT_RX.test(raw);
  const isAdv = ADV_RX.test(raw);
  const isCaus = CAUS_RX.test(raw);
  const isComp = COMP_RX.test(raw);
  if (isNeg) rstCounts.NEG_WARNING++;
  if (isAdv) rstCounts.ADVERSATIVE++;
  if (isCaus) rstCounts.CAUSAL++;
  if (isComp) rstCounts.COMPARATIVE++;
  if (isAdv && isNeg) rstCounts.ADV_AND_NEG++;
  if (isCaus && isNeg) rstCounts.CAUSAL_AND_NEG++;
  if ((cl === 'SELF_CONTAINED' || cl === 'CLOSER_SYNTHESIS') && tp.hasBrandOrModelAnchor && tp.anchor_position_ratio <= 0.45 && tp.post_anchor_words >= 18) {
    rstCounts.SINGLETON_PRODUCT_EARLY_SKU++;
  }
  const matSlots = (skel.match(/\[SLOT_MATERIAL\]/g) || []).length;
  if (matSlots === 1) rstCounts.MONO_MATERIAL_SLOT++;
  if (matSlots >= 2) rstCounts.MULTI_MATERIAL_SLOT++;
}
console.log('\n=== 3. ESTRUCTURAS RST, POLARIDAD Y SLOTS (CLEAN USABLE) ===');
console.log(JSON.stringify(rstCounts, null, 2));

// 5. Matrix of 21 Discriminative Anchors x Polarity x RST x Meta-estructura
console.log('\n=== 4. MATRIZ DE LAS 21 ANCLAS DISCRIMINATIVAS ===');
const anchorMatrix = [];
for (const entry of fg.DISCRIMINATIVE_ANCHOR_CATALOG) {
  let cleanHits = 0, negHits = 0, advHits = 0, causHits = 0, selfHits = 0, closerHits = 0;
  for (const b of cleanUsable) {
    const raw = b.raw_text || '';
    entry.verifyRx.lastIndex = 0;
    if (!entry.verifyRx.test(raw)) continue;
    cleanHits++;
    const cl = resolveClosure(b);
    if (NEG_STRICT_RX.test(raw)) negHits++;
    if (ADV_RX.test(raw)) advHits++;
    if (CAUS_RX.test(raw)) causHits++;
    if (cl === 'SELF_CONTAINED') selfHits++;
    if (cl === 'CLOSER_SYNTHESIS') closerHits++;
  }
  anchorMatrix.push({
    key: entry.key,
    cat: entry.category,
    sev: entry.severity,
    clean: cleanHits,
    negWarn: negHits,
    adv: advHits,
    caus: causHits,
    self: selfHits,
    closer: closerHits
  });
}
anchorMatrix.sort((a, b) => a.clean - b.clean);
console.table(anchorMatrix);

// 6. 16 Real-World Combinatorial Optical Intersections
const combos = [
  { name: 'Polarizadas + Inconveniente LCD/salpicadero', rx: [/\bpolarizad/i, /\b(?:lcd|pantallas?\s+digital|salpicadero|head-up)\b/i] },
  { name: 'Fotocromáticas + Parabrisas / NO oscurecen en coche', rx: [/\bfotocrom/i, /\b(?:parabrisas|dentro\s+del\s+coche)\b/i, NEG_STRICT_RX] },
  { name: 'Fotocromáticas + Luz visible (activación coche)', rx: [/\bfotocrom/i, /\bluz\s+visible\b/i] },
  { name: 'Progresivas + Tensión cervical / postura ordenador', rx: [/\bprogresiv/i, /\b(?:cervical|cuello|postura|inclinar\s+la\s+cabeza)\b/i] },
  { name: 'Ocupacionales + Oficina/ordenador + NO conducir', rx: [/\bocupacional/i, /\b(?:conducir|volante|coche)\b/i, NEG_STRICT_RX] },
  { name: 'Acetato fresado (planchas/tambores/alma metálica)', rx: [/\bacetato\b/i, /\b(?:planchas?|fresad\w*|tambores?\s+de\s+madera|alma\s+met[aá]lica)\b/i] },
  { name: 'Plástico/pasta inyectada (molde/pintado/descascarilla)', rx: [/\b(?:pl[aá]stico\s+inyectado|pasta\s+inyectada|molde\s+de\s+inyecci[oó]n|descascarill\w*)\b/i] },
  { name: 'Cristal mineral vs Policarbonato / peso nasal', rx: [/\bcristal(?:es)?\s+mineral/i, /\b(?:policarbonato|org[aá]nic|peso|pesad|nariz|tabique)\b/i] },
  { name: 'Puente cerradura / nariz estrecha + advertencia ajuste', rx: [/\b(?:cerradura|puente\s+nasal|nariz\s+estrecha|tabique)\b/i, NEG_STRICT_RX] },
  { name: 'Meflecto / gafas plegables (Persol/artesanía)', rx: [/\b(?:meflecto|plegables?)\b/i] },
  { name: 'Lentes categoría 4 + prohibición conducir', rx: [/\bcategor[ií]a\s*4\b/i, /\bconduc/i, NEG_STRICT_RX] },
  { name: 'Filtro luz azul + evidencia/crítica equilibrada', rx: [/\bluz\s+azul\b/i, ADV_RX] },
  { name: 'Titanio vs Acero inoxidable / hipoalergénico', rx: [/\btitanio\b/i, /\b(?:acero|alerg|hipoalerg|peso|liger)\b/i] },
  { name: 'Gafas graduadas de sol / clip-on / sobrepuestas', rx: [/\b(?:clip-?on|sobrepuest|graduad[oa]s?\s+de\s+sol|solares?\s+graduad)\b/i] },
  { name: 'Índice de refracción / reducción (1.6, 1.67, 1.74)', rx: [/\b(?:1[.,]6|1[.,]67|1[.,]74|[ií]ndice\s+de\s+refracci[oó]n|lentes?\s+reducid)\b/i] },
  { name: 'Antirreflejante + conducción nocturna / halós', rx: [/\bantirreflejante/i, /\b(?:noche|nocturn|faros|halos|conduc)\b/i] }
];

console.log('\n=== 5. INTERSECCIONES COMBINATORIAS (ESCENARIOS REALES) ===');
const comboRows = combos.map(c => {
  const hits = cleanUsable.filter(b => c.rx.every(r => r.test(b.raw_text || '')));
  const selfHits = hits.filter(b => resolveClosure(b) === 'SELF_CONTAINED').length;
  return {
    escenario: c.name,
    cleanBricks: hits.length,
    selfContained: selfHits,
    estado: hits.length === 0 ? 'VACIO (0)' : (hits.length < 5 ? 'CRITICO (<5)' : (hits.length < 15 ? 'ESCASO (<15)' : 'SOLIDO'))
  };
});
console.table(comboRows);

// 7. Narrative Voice & Domain concentration
const domains = {};
let firstPersonPlural = 0, secondPerson = 0, impersonal = 0;
for (const b of cleanUsable) {
  const d = b.source_domain || b.domain_source || 'unknown';
  domains[d] = (domains[d] || 0) + 1;
  const raw = b.raw_text || '';
  if (/\b(?:nosotros|nuestro|nuestra|ofrecemos|disponemos|en nuestra [oó]ptica)\b/i.test(raw)) firstPersonPlural++;
  else if (/\b(?:t[uú]|tu|tus|te|buscas|quieres|tienes|puedes|llevas|necesitas)\b/i.test(raw)) secondPerson++;
  else impersonal++;
}
const topDomains = Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log('\n=== 6. VOZ NARRATIVA Y CONCENTRACIÓN DE DOMINIOS (CLEAN USABLE) ===');
console.log({
  firstPersonPlural,
  firstPersonPct: Number(((firstPersonPlural / cleanUsable.length) * 100).toFixed(1)),
  secondPerson,
  secondPersonPct: Number(((secondPerson / cleanUsable.length) * 100).toFixed(1)),
  impersonal,
  impersonalPct: Number(((impersonal / cleanUsable.length) * 100).toFixed(1)),
  uniqueDomains: Object.keys(domains).length
});
console.log('Top 12 dominios:', topDomains);
console.log('\n=== 7. ÍNDICE TÉCNICO ACTUAL (indice_tecnologia_optica.json) ===');
console.log(techIdx.stats || Object.keys(techIdx));
if (fs.existsSync(gapsPath)) {
  const reg = JSON.parse(fs.readFileSync(gapsPath, 'utf8'));
  console.log('\n=== 8. REGISTRO DINÁMICO DE HUECOS EN DISCO ===');
  console.log({ stats: reg.stats, loggedGaps: (reg.gaps || []).length, topGaps: (reg.gaps || []).slice(0, 6).map(g => ({ key: g.gapKey, sev: g.severity, occ: g.occurrences, missing: g.missingConcepts })) });
}
