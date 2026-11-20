'use strict';

const bankGapTracker = require('../donor-bank/bank-coverage-gap-tracker.cjs');
const enterpriseRetriever = require('../donor-bank/hybrid-donor-retriever.cjs');
const domainRegistry = require('../donor-bank/domain-packs-registry.cjs');
const discourseTopology = require('../text-analysis/discourse-topology-analyzer.cjs');
const factualGuard = require('../text-analysis/factual-entailment-guard.cjs');
const { WORD_TO_CONCEPT_CLUSTER, SEMANTIC_STOPWORDS_ES } = require('../text-analysis/lexical-constants.cjs');
const { tokenize, computeNGramOverlapRatio } = require('../text-analysis/draft-preprocessor.cjs');
const {
  isClinicalOrEncyclopedicDomain,
  isCompetingBrand,
  extractCleanDonorWindow,
  expandSlotsForSemanticEval
} = require('../rewrite-tracks/track-a-donor-grafting/donor-skeleton-cleaner.cjs');
const { fillSlotsInBrick } = require('../rewrite-tracks/track-a-donor-grafting/donor-slot-filler.cjs');
const { findAllCorpusOverlaps } = require('../anti-plagiarism-and-quality/corpus-shingle-scanner.cjs');
const { applySymbolicShingleBreaker } = require('../anti-plagiarism-and-quality/symbolic-shingle-breaker.cjs');

function computeSemanticSimilarity(bankState, queryText, candidateText) {
  const norm = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanQuery = (queryText || '').replace(/\[SLOT_[A-Z_]+\]/g, ' ');
  const cleanCand = (candidateText || '').replace(/\[SLOT_[A-Z_]+\]/g, ' ');
  const qToks = [...new Set(
    tokenize(cleanQuery)
      .map(norm)
      .filter(t => t.length >= 3 && !SEMANTIC_STOPWORDS_ES.has(t))
  )];
  const cToks = new Set(
    tokenize(cleanCand)
      .map(norm)
      .filter(t => t.length >= 3 && !SEMANTIC_STOPWORDS_ES.has(t))
  );
  if (!qToks.length || !cToks.size) {
    return { lexSim: 0, clusterSim: 0, totalSim: 0, matchedTerms: [], matchedClusters: 0 };
  }

  let lexSim = 0;
  const matchedTerms = [];
  const qClusters = new Set();
  const cClusters = new Set();

  for (const ct of cToks) {
    if (WORD_TO_CONCEPT_CLUSTER.has(ct)) cClusters.add(WORD_TO_CONCEPT_CLUSTER.get(ct));
  }
  for (const qt of qToks) {
    if (WORD_TO_CONCEPT_CLUSTER.has(qt)) qClusters.add(WORD_TO_CONCEPT_CLUSTER.get(qt));
    if (cToks.has(qt)) {
      const w = (bankState.corpusIdf && bankState.corpusIdf.get(qt)) || 2.5;
      lexSim += w;
      matchedTerms.push(qt);
    } else if (qt.length >= 5) {
      // Stem-level semantic hit (e.g. redonda <-> redondeadas, artesania <-> artesanal, dorada <-> dorado)
      const root = qt.slice(0, Math.max(4, qt.length - 2));
      for (const ct of cToks) {
        if (ct.length >= 5 && ct.startsWith(root)) {
          const w = ((bankState.corpusIdf && bankState.corpusIdf.get(qt)) || 2.5) * 0.75;
          lexSim += w;
          matchedTerms.push(`${qt}~${ct}`);
          break;
        }
      }
    }
  }

  let matchedClusters = 0;
  for (const qc of qClusters) {
    if (cClusters.has(qc)) matchedClusters++;
  }
  const clusterSim = matchedClusters * 2.4;
  return {
    lexSim: Number(lexSim.toFixed(2)),
    clusterSim: Number(clusterSim.toFixed(2)),
    totalSim: Number((lexSim + clusterSim).toFixed(2)),
    matchedTerms,
    matchedClusters
  };
}

function searchDonorBricksForParagraph(bankState, frames, atoms, text, excludeIds = new Set(), count = 1, preferredSlot = null, frameHint = null, searchOptions = {}) {
  if (!Array.isArray(frames)) frames = [frames];
  const seenCandidates = new Set();
  const allCandidates = [];

  for (const f of frames) {
    if (bankState.goldenIndex && bankState.goldenIndex[f]) {
      for (const g of bankState.goldenIndex[f]) {
        const gid = g.brick_id || g.golden_id || g.donor_id;
        if (gid && !seenCandidates.has(gid)) {
          seenCandidates.add(gid);
          allCandidates.push({ ...g, brick_id: gid, _isGolden: true });
        }
      }
    }
    if (bankState.frameIndex && bankState.frameIndex[f]) {
      for (const b of bankState.frameIndex[f]) {
        if (b.brick_id && !seenCandidates.has(b.brick_id)) {
          seenCandidates.add(b.brick_id);
          allCandidates.push(b);
        }
      }
    }
  }

  const textLower = (text || '').toLowerCase();
  const queryForSemantic = `${searchOptions.currentAnchor || ''} ${text || ''}`.trim();
  const queryProfile = enterpriseRetriever.analyzeQuery(queryForSemantic, frameHint || frames[0], atoms);
  const domainId = searchOptions.domainId || 'optica';
  const activeSubdomains = searchOptions.activeSubdomains || domainRegistry.detectActiveSubdomains(text, domainId);

  // Multi-Axis O(1) Inverted Index Expansion: pull cross-frame bricks matching query topic_tags or discourse_intent
  if (bankState.brickById && enterpriseRetriever.isIndexed) {
    for (const tg of queryProfile.topic_tags || []) {
      const tagSet = enterpriseRetriever.byTopicTag.get(tg);
      if (!tagSet) continue;
      for (const id of tagSet) {
        if (!seenCandidates.has(id)) {
          const b = bankState.brickById.get(id);
          if (b) {
            seenCandidates.add(id);
            allCandidates.push(b);
          }
        }
      }
    }
    const intentSet = enterpriseRetriever.byIntent.get(queryProfile.discourse_intent);
    if (intentSet && queryProfile.discourse_intent !== 'STYLE_DEFINITION') {
      for (const id of intentSet) {
        if (!seenCandidates.has(id)) {
          const b = bankState.brickById.get(id);
          if (b) {
            seenCandidates.add(id);
            allCandidates.push(b);
          }
        }
      }
    }
  }

  // Technical Optical Index O(1) Expansion (dynamic key + stem resolution)
  if (bankState.brickById && bankState.techIndex && atoms?.discriminativeAnchors?.length) {
    const indexKeys = Object.keys(bankState.techIndex);
    for (const anc of atoms.discriminativeAnchors) {
      const matchedKeys = new Set();
      if (bankState.techIndex[anc.key]) matchedKeys.add(anc.key);
      const rawTokens = `${anc.key || ''} ${anc.label || ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/)
        .filter(t => t.length >= 5);
      for (const ik of indexKeys) {
        if (matchedKeys.has(ik)) continue;
        const ikParts = ik.split('_').filter(p => p.length >= 5);
        if (ikParts.some(part => rawTokens.some(tok => tok.startsWith(part.slice(0, 5)) || part.startsWith(tok.slice(0, 5))))) {
          matchedKeys.add(ik);
        }
      }
      for (const bucketKey of matchedKeys) {
        const bucketIds = bankState.techIndex[bucketKey];
        if (!Array.isArray(bucketIds)) continue;
        for (const id of bucketIds) {
          if (!seenCandidates.has(id)) {
            const b = bankState.brickById.get(id);
            if (b && !b.exclude_from_humanization) {
              seenCandidates.add(id);
              allCandidates.push(b);
            }
          }
        }
      }
    }
  }

  // Seed clean specialty compartment bricks on demand (e.g. AUDIOLOGY, OPTICAL_CLINICAL, or generic custom domains)
  if (domainId === 'optica' && (activeSubdomains.has('AUDIOLOGY') || activeSubdomains.has('OPTICAL_CLINICAL'))) {
    for (const mb of bankState.masterBricks) {
      if (!mb || mb.exclude_from_humanization || !mb.brick_id || seenCandidates.has(mb.brick_id)) continue;
      if (mb.subdomain === 'AUDIOLOGY' && activeSubdomains.has('AUDIOLOGY')) {
        seenCandidates.add(mb.brick_id);
        allCandidates.push(mb);
      } else if (mb.subdomain === 'OPTICAL_CLINICAL' && activeSubdomains.has('OPTICAL_CLINICAL')) {
        seenCandidates.add(mb.brick_id);
        allCandidates.push(mb);
      }
    }
  } else if (allCandidates.length === 0 && activeSubdomains instanceof Set) {
    for (const mb of bankState.masterBricks) {
      if (!mb || mb.exclude_from_humanization || !mb.brick_id || seenCandidates.has(mb.brick_id)) continue;
      if (mb.subdomain && domainRegistry.isSubdomainCompatible(mb.subdomain, activeSubdomains, domainId)) {
        seenCandidates.add(mb.brick_id);
        allCandidates.push(mb);
      }
    }
  }

  if (!allCandidates.length) return [];

  const queryLower = queryForSemantic.toLowerCase();
  const textTokens = tokenize(text).filter(t => t.length > 3);
  const wantsKids = /\b(?:niñ[oa]s?|peques|bebés?|infantil(?:es)?)\b/i.test(queryLower);
  const wantsRxOptical = /\b(?:graduad[oa]s?|progresiv[oa]s?|ocupacional(?:es)?|monofocal(?:es)?|bifocal(?:es)?|presbicia|miop[ií]a|astigmatismo|ordenador|monitores?|pantallas?|oficina|ergonom\w*|cervical|cristal\s+mineral|policarbonato|fotocrom[aá]tic|polarizad)\b/i.test(queryLower);
  const targetWords = text.split(/\s+/).filter(Boolean).length;
  const isColonMode = searchOptions.paragraphMode === false || frameHint === 'TRANSITION_CURATION' || text.trim().endsWith(':');
  const paragraphMode = !isColonMode;
  const wantWindowWords = searchOptions.targetWindowWords || (paragraphMode ? Math.min(72, Math.max(52, Math.round(targetWords * 0.72))) : 22);
  const minWindowWords = searchOptions.minWindowWords || (paragraphMode ? 18 : 10);
  const maxWindowWords = searchOptions.maxWindowWords || (paragraphMode ? 96 : 34);
  const isProductFactual = frameHint === 'PRODUCT_FACTUAL' || (atoms.brand_models && atoms.brand_models.length > 0);
  const commercialCtaRx = /\b(?:a[ñn]adir\s+al\s+carrito|ver\s+cat[aá]logo|nuestras?\s+tiendas?|haz\s+clic[k]?|clikc|cons[ií]guel[oa]s|adqui[eé]rel[oa]s|hazte\s+con|enam[oó]rate|2x1|\d+\s*(?:€|eur|euros?))\b/i;
  const seasonalAnachronismRx = /\b(?:el\s+a[ñn]o\s+pasado|la\s+temporada\s+pasada|navidad|navide[ñn][oa]s?|nochebuena|nochevieja|pap[aá]\s+noel|reyes\s+magos|halloween|san\s+valent[ií]n|semana\s+santa)\b/gi;
  const metaBlogRx = /\b(?:tal\s+y\s+como\s+hemos\s+(?:mencionado|comentado|visto)|como\s+(?:ya\s+)?hemos\s+(?:mencionado|comentado)|como\s+te\s+habr[aá]s\s+dado\s+cuenta|gu[ií]a\s+de\s+compra|consejos\s+para\s+elegir|saber\s+c[oó]mo\s+elegir|es\s+clave\s+saber\s+elegir)\b/i;
  const listicleCountRx = /\b(\d{1,2})\s+(?:gafas|monturas|modelos|opciones|colores|ideas|consejos|trucos)\b/gi;
  const rejectsLoudColors = /\b(?:descartar|evitar|nada\s+de|no\s+le\s+van)\b[^.]{0,75}\b(?:fluorescentes|estridentes|brillantes|llamativos|artificiales)\b/i.test(textLower);
  const wantsWomen = /\b(?:mujer(?:es)?|femenin[oa]s?|chicas?)\b/i.test(textLower);
  const wantsMen = /\b(?:hombre(?:s)?|masculin[oa]s?|chicos?)\b/i.test(textLower);
  const rejectsRigidFit = /\b(?:no\s+opriman|sin\s+(?:dejar\s+)?marcas|c[oó]modas|flojas|movimiento\s+brusco)\b/i.test(textLower);
  const mentionsCareyOrTierra = /\b(?:carey|tierra|marr[oó]n|marrones|c[aá]lid[oa]s?|neutr[oa]s?|[aá]mbar|ocre)\b/i.test(textLower);
  const mentionsGoldOrBronze = /\b(?:dorad[oa]|oro|bronce|envejecido|metal(?:es)?)\b/i.test(textLower);
  const allowsSpecialtyClinical = activeSubdomains instanceof Set && (activeSubdomains.has('OPTICAL_CLINICAL') || activeSubdomains.has('AUDIOLOGY'));

  const scored = [];
  for (const c of allCandidates) {
    if (c.exclude_from_humanization) continue;
    const bId = c.brick_id || c.golden_id || c.donor_id;
    if (!bId || excludeIds.has(bId)) continue;
    if (c.domain && c.domain !== domainId) continue;
    if (c.subdomain && !domainRegistry.isSubdomainCompatible(c.subdomain, activeSubdomains, domainId)) {
      continue;
    }

    // Ontological domain gate: isolate clinical ophthalmology & audiology strictly to their active compartments
    if (!allowsSpecialtyClinical && isClinicalOrEncyclopedicDomain(c, textLower)) continue;

    const raw = c.raw_text || c.text || '';
    const cText = raw.toLowerCase();
    if (!raw.trim() || raw.includes('\uFFFD')) continue;
    if (!factualGuard.assessDomainPurity(raw, { domainId, activeSubdomains }).isCleanOptical) continue;

    // Discard quoted interviews, social handles (@), commercial CTAs, meta-blog listicles, and scraping headers
    if (
      /[“”"@]/.test(raw) ||
      commercialCtaRx.test(cText) ||
      metaBlogRx.test(cText) ||
      [...cText.matchAll(listicleCountRx)].some(m => !textLower.includes(m[1])) ||
      /Rostro\s+[a-záéíóúñ]+[A-ZÁÉÍÓÚÑ]/.test(raw) ||
      /[a-záéíóúüñ]{3}[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]{2}/.test(raw.replace(/\b(?:McQueen|RayBan|StreetStyle|iPhone|YouTube|LinkedIn|PlayStation|WhatsApp)\b/g, ''))
    ) {
      continue;
    }

    // General guard against unrequested cycling / niche sport blocks
    if (
      !/\b(?:ciclismo|bici|bicicleta|deportiv|running|senderismo|esqu[ií]|monta[ñn]a|n[aá]utic|golf|acu[aá]tic)\b/i.test(textLower) &&
      /\b(?:practicar\s+ciclismo|ruta\s+en\s+bici|para\s+ciclismo|el\s+casco\s+que\s+llevar[aá]s|actividades\s+acu[aá]ticas|monta[ñn]ismo,\s*golf|golf\s+y\s+otros\s+deportes)\b/i.test(cText)
    ) {
      continue;
    }

    // Guard indoor Rx paragraphs (progresivas/ocupacionales/ordenador) against outdoor sunglass donors
    if (
      wantsRxOptical &&
      /\b(?:ocupacional(?:es)?|progresiv[oa]s?|ordenador|oficina|monitores?)\b/i.test(textLower) &&
      !/\b(?:gafas\s+de\s+sol|solares?|polarizad|fotocrom)\b/i.test(textLower) &&
      /\b(?:gafas\s+de\s+sol\s+(?:polarizad|fotocrom|espejad)|actividades\s+al\s+aire\s+libre)\b/i.test(cText)
    ) {
      continue;
    }

    // Filter frozen 4-digit years (e.g., 1947, 2018, 2020) and seasonal/anachronistic refs unless mentioned in input text
    const yearMatches = raw.match(/\b(19\d\d|20[0-2]\d)\b/g);
    if (yearMatches && yearMatches.some(y => !textLower.includes(y))) {
      continue;
    }
    if ([...cText.matchAll(seasonalAnachronismRx)].some(m => !textLower.includes(m[0]))) {
      continue;
    }

    // Skip children or contact-lens / refractive pathology blocks unless source text requests them
    const allowsAudiologyOtitisKids = activeSubdomains instanceof Set && activeSubdomains.has('AUDIOLOGY') && /\botitis\b/i.test(textLower);
    if (!wantsKids && !allowsAudiologyOtitisKids && /\b(?:peques|niñ[oa]s?|bebés?)\b/i.test(cText)) {
      continue;
    }
    const allowsClinicalSub = activeSubdomains instanceof Set && activeSubdomains.has('OPTICAL_CLINICAL');
    if (!wantsRxOptical && !allowsClinicalSub && /\b(?:graduad[oa]s?|graduaci[oó]n|lentillas?|miopía|astigmatismo|(?:efecto|defecto|error)\s+refractivo)\b/i.test(cText)) {
      continue;
    }

    // Skip sizing/caliber measurement tutorials unless source paragraph explicitly discusses sizing or caliber
    const wantsSizing = /\b(calibre|talla|medidas?|mil[ií]metros?|puente\s+nasal|varillas?\s+mm)\b/i.test(textLower);
    if (!wantsSizing && /\b(calibre\s+de\s+la\s+lente|borde\s+interior|n[úu]meros\s+que\s+hacen\s+referencia|en\s+las\s+varillas\s+encontrar[aá]s|talla\s+de\s+gafas|medida\s+se\s+refiere)\b/i.test(cText)) {
      continue;
    }

    // Semantic Polarity Guard: block donors praising loud/bright colors when input rejects them or stresses sobriety/earth/neutral tones
    const wantsSoberOrEarthColors = rejectsLoudColors || (mentionsCareyOrTierra && /\b(?:sobri[oa]|neutr[oa]|mate|oscuro|atemporal|sin\s+saturar|versatilidad)\b/i.test(textLower));
    if (wantsSoberOrEarthColors && /\b(?:mil\s+colores|tonos\s+llamativos|colores\s+llamativos|colores\s+fluorescentes|extravagante|extravagancia|prints|alejen?\s+de\s+los\s+tonos\s+neutros|salen\s+de\s+lo\s+convencional|color\s+block|locas,\s+atrevidas|todo\s+color)\b/i.test(cText)) {
      continue;
    }

    // Audience Gender Guard: avoid gender-locked blocks ("para mujer" / "para hombres") on unisex paragraphs
    const isUnisexMention = /\b(?:hombres?\s+y\s+mujeres?|mujeres?\s+y\s+hombres?|tanto\s+(?:para\s+)?hombres?\s+como|unisex)\b/i.test(cText);
    if (!isUnisexMention) {
      if (!wantsWomen && /\b(?:para\s+mujer(?:es)?|aquellas\s+que\s+tengan\s+el\s+rostro\s+pequeño|para\s+las\s+mujeres)\b/i.test(cText)) {
        continue;
      }
      if (!wantsMen && /\b(?:para\s+hombres?|el\s+p[úu]blico\s+masculino)\b/i.test(cText)) {
        continue;
      }
    }

    // Self-contradicting donor guard (e.g. "pesadas" followed by "Su ligereza" in same paragraph)
    if (/\bpesad[oa]s?\b/i.test(cText) && /\bligereza\b/i.test(cText)) {
      continue;
    }

    // Material Specificity Guard: reserve explicit metal-frame tutorials for paragraphs that actually discuss materials/metal
    const wantsMaterialOrMetal = /\b(?:metal|met[aá]lic[oa]s?|bronce|oro|dorad[oa]s?|acero|titanio|acetato|pasta|celulosa|carey|material(?:es)?)\b/i.test(queryLower);
    if (!wantsMaterialOrMetal && /\b(?:gafas\s+de\s+metal|el\s+metal\s+es\s+un\s+material)\b/i.test(cText)) {
      continue;
    }

    // Contrast polarity & gender-noun guards
    if (/\b(?:quedan\s+descartadas|las\s+monturas\s+\[?slot_frame_shape\]?\s+quedan)\b/i.test(cText) && atoms?.shapes?.length) {
      continue;
    }
    if (!wantsMen && /\b(?:hombre\s+italiano|españoles)\b/i.test(cText)) {
      continue;
    }
    if (!wantsWomen && /\bgafas\s+de\s+sol\s+mujer\b/i.test(cText)) {
      continue;
    }
    if (!wantsMen && /\bgafas\s+de\s+sol\s+hombre\b/i.test(cText)) {
      continue;
    }
    // Block anaphoric openers like "Para eso," / "Este diseño" anywhere inside standalone corpus paragraphs
    if (/\b(?:para\s+eso,\s+f[ií]jate|este\s+diseño\s+se\s+convierte|esto\s+es\s+m[aá]s\s+complicado)\b/i.test(cText)) {
      continue;
    }
    // Block specific model codes leaked in V2 harvested fashion lists (e.g. CD0369, RB3016, PLD 2053/S) unless input asks for exact code
    const foreignSkuMatch = raw.match(/\b(?:[A-Z]{2,3}\d{3,4}[A-Z]*|RB\d{4}[A-Z]*|PO\d{4}[A-Z]*|PLD\s*\d{4})\b/g);
    if (foreignSkuMatch && foreignSkuMatch.some(code => {
      const esc = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return !new RegExp(`\\b${esc}\\b`, 'i').test(text);
    })) {
      continue;
    }

    // Skip competing brands unless explicitly queried
    if (isCompetingBrand(cText, textLower, textTokens)) continue;

    // Extract coherent paragraph window (42-94w multi-sentence for normal paragraphs, 10-34w for colon intros)
    const cleanWindow = extractCleanDonorWindow(c, wantWindowWords, frameHint || frames[0], atoms, { paragraphMode, maxWords: maxWindowWords, minWords: minWindowWords, rawPara: text, articleMacroStyle: searchOptions.articleMacroStyle, activeSubdomains });
    const cleanWc = cleanWindow ? cleanWindow.split(/\s+/).filter(Boolean).length : 0;
    if (!cleanWindow || cleanWc < minWindowWords || cleanWc > maxWindowWords) continue;

    // Reject broken mid-word slot substitutions from corpus scraping (e.g. "mientras se [SLOT_OCCASION_OUTFIT]a")
    if (/\[SLOT_[A-Z_]+\][a-záéíóúüñ]|[a-záéíóúüñ]\[SLOT_[A-Z_]+\]/i.test(cleanWindow)) continue;

    // Reject donor windows that overlap too closely with the input paragraph (>25% trigrams)
    if (cleanWc >= 15 && computeNGramOverlapRatio(cleanWindow, text, 3) > 0.25) continue;

    // Colon intros must genuinely introduce upcoming options/models (no pro-drop starts, no "porque..." endings)
    if (isColonMode) {
      const cwTrim = cleanWindow.trim();
      if (/^(?:este\s+tipo\s+de|esta\s+clase\s+de|estas\s+gafas\s+tienen|el\s+modelo|no\s+solo\s+nos|funcionan|hacen\s+que|son\s+un|otra\s+novedad|adem[aá]s)\b/i.test(cwTrim)) continue;
      if (/\bporque\s+[^.]{1,55}[.:]?$/i.test(cwTrim)) continue;
    }

    // Also block exact anaphoric openers when extractCleanDonorWindow strips the first sentence ("Si... . Para eso, ...")
    if (/^(?:para\s+eso,|este\s+diseño\s+se\s+convierte|otro\s+factor\s+a\s+tener\s+en\s+cuenta)/i.test(cleanWindow.trim()) && searchOptions.isFirstAfterHeading) {
      continue;
    }
    if (/^(?:hacen\s+que|te\s+hace\s+ser)\b/i.test(cleanWindow.trim())) {
      continue;
    }
    if (/^o\s+(?:con|de|en|para|por|si|quiz[aá]|algun[oa]s?|las?|los?|unas?|unos?)\b/i.test(cleanWindow.trim())) {
      continue;
    }

    // First paragraph right under an H2/H3 must start with an explicit subject (no abrupt pro-drop or dangling connector)
    if (searchOptions.isFirstAfterHeading && /^(?:funcionan\s+a\s+la\s+perfecci[oó]n|son\s+un\s+complemento|no\s+solo\s+nos|suelen\s+llevarse|destacan\s+por|ofrecen\s+un|as[ií],\s+si\b|por\s+eso,|cuando\s+estrenes\s+estas|adem[aá]s,|sin\s+embargo,|de\s+hecho,)\b/i.test(cleanWindow.trim())) {
      continue;
    }

    // Product-Factual structural fit: require a real brand/model slot or substitutable eyewear NP so the SKU integrates naturally
    const hasProductAnchor = /\[SLOT_(?:BRAND|MODEL)\]|\b(?:estas|las)\s+gafas(?:\s+de\s+sol)?\b|\b(?:esta|la)\s+montura\b|\b(?:este|el)\s+(?:modelo|diseño)\b/i.test(cleanWindow);
    if (isProductFactual && !hasProductAnchor) {
      continue;
    }

    const winStem = cleanWindow.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 38);
    if (winStem && excludeIds && excludeIds.has(`stem:${winStem}`)) continue;

    // Deduplicate against any individual sentence already used in prior paragraphs
    const winSents = cleanWindow.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    if (searchOptions.requireMultiSentence && winSents.length < 2) continue;
    const winSentStems = winSents
      .map(s => s.toLowerCase().replace(/[^a-záéíóúüñ0-9]+/g, ' ').trim().slice(0, 34))
      .filter(s => s.length >= 16);
    if (excludeIds && winSentStems.some(st => excludeIds.has(`sent:${st}`))) continue;

    // LAYER 1: ENTERPRISE HYBRID SCORING (Okapi BM25 + 128-D Dense Semantic Vector Cosine + 4D Ontology + Concept Clusters + Entailment)
    const semanticSurface = expandSlotsForSemanticEval(cleanWindow, c.slots);
    const entail = factualGuard.evaluateFactualEntailment(text, semanticSurface, atoms?.discriminativeAnchors, atoms?.signedPolarity);
    if (entail.polarityContradiction) continue;
    if (atoms?.signedPolarity?.negativeContexts?.length) {
      const rawEntail = factualGuard.evaluateFactualEntailment(text, raw, atoms?.discriminativeAnchors, atoms?.signedPolarity);
      if (rawEntail.polarityContradiction) continue;
    }

    const sem = computeSemanticSimilarity(bankState, queryForSemantic, semanticSurface);
    const hybrid = enterpriseRetriever.scoreCandidateHybrid(queryProfile, c, semanticSurface);
    const combinedSemScore = Number((sem.totalSim * 0.4 + hybrid.bm25Score * 0.85 + hybrid.denseCosine * 38).toFixed(2));

    let score = 15 + hybrid.totalHybrid + Math.min(24, sem.clusterSim * 3.2);
    if (atoms?.discriminativeAnchors?.length) {
      score += entail.anchorCoverageRatio * 34 - entail.missingCriticalTech.length * 44;
    }
    if (!isColonMode && sem.lexSim < 1.2 && sem.clusterSim < 2 && hybrid.denseCosine < 0.22) {
      score -= 24;
    }
    if (discourseTopology.hasContrastiveMaterialRedundancy(cleanWindow, text, atoms)) {
      score -= 38;
    }
    const topoProfile = discourseTopology.analyzeBrickDiscourseProfile(semanticSurface, cleanWindow, c.slots);
    const topoCompat = discourseTopology.scoreTopologyCompatibility(searchOptions.paraTopology?.role || 'SECTION_MEDIAL', topoProfile, frameHint || frames[0]);
    score += topoCompat.score * 0.65;

    if (/\[SLOT_[A-Z_]+\]/.test(cleanWindow)) score += 5;
    if (c.frame === frames[0]) score += 8;
    if (c._isGolden) score += 5;
    if (c._isTriad) score += 3;
    if (c.source_origin === 'the_10_golden_human_texts') score += 4;
    if (c.voice_category === 'EDITORIAL_LIFESTYLE' || c.tier === 'TIER_2_EDITORIAL') score += 3;
    const domSrc = ((c.domain_source || c.source_domain || '') + ' ' + (c.source_origin || '')).toLowerCase();
    if (/revistagq|vogue|telva|elle|esquire|smoda|elpa[ií]s|jotdown/i.test(domSrc)) {
      score += 4;
    }
    if (c.voice_category === 'WORKSHOP_CLINICAL' || c.tier === 'TIER_1_WORKSHOP') score += 3;
    if (c.metrics?.has_human_glitch) score += 3;

    // Coherent multi-sentence paragraph quality bonus (balanced so relevance always beats generic magazine length)
    if (paragraphMode) {
      if (winSents.length >= 2) score += 10;
      if (winSents.length >= 3) score += 4;
      if (cleanWc >= 40 && cleanWc <= 90) score += 8;
      else if (cleanWc < 34) score -= 10;
      if (winSents.length >= 2) {
        const sLens = winSents.map(s => s.split(/\s+/).filter(Boolean).length);
        const spread = Math.max(...sLens) - Math.min(...sLens);
        if (spread >= 8) score += 4;
        if (Math.max(...sLens) >= 26) score += 3;
      }
      if (/[;:¡!¿?–—…]|\s-\s/.test(cleanWindow)) score += 3;
    }

    const evalLower = (semanticSurface || cleanWindow || raw).toLowerCase();

    // Guard against opposite negative advice when input gives positive recommendations (e.g. "huir de aviador" on aviator article)
    const wantsNegativeAdvice = /\b(?:evitar|evita|evitaremos|huir|descartar|no\s+favorecen)\b/i.test(textLower);
    if (!wantsNegativeAdvice && /\b(?:huir\s+de|evitar|evitaremos|descartar|no\s+favorecen)\b/i.test(evalLower)) {
      continue;
    }
    if (wantsSoberOrEarthColors && /\b(?:tonos\s+llamativos|colores\s+llamativos|mil\s+colores|colores\s+fluorescentes)\b/i.test(evalLower)) {
      continue;
    }

    // Penalize negative/hedonic tone mismatches on serious editorial paragraphs (e.g. "horribles gafas", "licencia para molar", "sex-appeal")
    if (/\b(?:horribles|peores\s+gafas|licencia\s+para\s+molar|sex-appeal)\b/i.test(evalLower)) {
      score -= 35;
    }

    // Colon intro rhetorical alignment
    if (isColonMode && /\b(?:apunta|tendencia|propuestas|modelos|opciones|colecci[oó]n|temporada|claves|alternativas|favorit[oa]s?|est[aá]n\s+de\s+moda|destacan)\b/i.test(evalLower)) {
      score += 20;
    }

    // Explicit topical alignment boosts for materials, silhouettes, palette, and facial ergonomics
    if (atoms?.materials?.length) {
      const reqMatStr = atoms.materials.join(' ').toLowerCase();
      if (/\b(?:acetato|pasta|celulosa)\b/.test(reqMatStr) && /\b(?:acetato|pasta|celulosa)\b/.test(evalLower)) score += 18;
      if (/\b(?:metal|bronce|oro|acero)\b/.test(reqMatStr) && /\b(?:metal|met[aá]lic|bronce|dorad|acero)\b/.test(evalLower)) score += 18;
      if (/\bcarey\b/.test(reqMatStr) && /\bcarey\b/.test(evalLower)) score += 14;
    }
    if (atoms?.shapes?.length) {
      const reqShapeStr = atoms.shapes.join(' ').toLowerCase();
      if (/\bredond/.test(reqShapeStr) && /\bredond|circular|pantos\b/.test(evalLower)) score += 18;
      if (/\bcuadrad|geom[eé]tric/.test(reqShapeStr) && /\bcuadrad|geom[eé]tric|rectangul|angulos\b/.test(evalLower)) score += 16;
      if (/\baviador/.test(reqShapeStr) && /\baviador|piloto|gota|l[aá]grima\b/.test(evalLower)) score += 18;
    }
    if (/\b(?:paleta|crom[aá]tic|tonos\s+tierra|colores?\s+fluorescent|marrones?|ámbar|ocre)\b/i.test(textLower) &&
        /\b(?:tierra|carey|marr[oó]n|marrones|c[aá]lid[oa]s?|neutr[oa]s?|sobri[oa]s?|atemporal(?:es)?|[aá]mbar|ocre)\b/i.test(evalLower)) {
      score += 18;
    }
    if (mentionsCareyOrTierra && /\bcarey\b/i.test(evalLower) && /\b(?:cl[aá]sic|tonos|c[aá]lid|envejecen|atemporal|marr[oó]n|estampado|moda|id[oó]nea|puedes\s+encontrar|resiste)\b/i.test(evalLower)) {
      score += 28;
    }
    if (mentionsGoldOrBronze && /\b(?:metal|met[aá]lic|dorad|bronce|oro\s+rosa|patillas|puente)\b/i.test(evalLower) && !/\bhorribles|peores\b/i.test(evalLower)) {
      score += 20;
    }
    if (rejectsRigidFit && /\b(?:aprieten|ajustan|comodidad|confort|puente|nariz|orejas|sujec|suave)\b/i.test(evalLower)) {
      score += 22;
    }
    if (atoms?.styles?.some(st => /boho|bohem|vintage|retro|70/i.test(st)) &&
        /\b(?:retro|vintage|cl[aá]sic|setenter|d[eé]cadas|años\s+(?:60|70|80)|ic[oó]nic)\b/i.test(evalLower)) {
      score += 16;
    }
    if (/\b(?:fisonom[ií]a|c[oó]modas?|asientan|opriman|flojas|movimiento\s+brusco|rostro|elegir|escoger)\b/i.test(textLower) &&
        /\b(?:c[oó]mod[oa]s?|ajustan?|rostro|facciones|cara|nariz|puente|aprieten|sueltas|elegir|favorecedor)\b/i.test(evalLower)) {
      score += 16;
    }

    let tokenHits = sem.matchedTerms.length;

    // Check slot matching (deduplicated per slot_type + material nativity check)
    let slotHits = 0;
    const seenSlotTypesForScore = new Set();
    if (c.slots && c.slots.length > 0) {
      const reqMat = (atoms.materials || []).join(' ').toLowerCase();
      const reqAcetate = /\b(?:acetato|pasta)\b/.test(reqMat);
      const reqMetal = /\b(?:metal|titanio|oro|bronce|acero)\b/.test(reqMat);
      for (const s of c.slots) {
        if (cleanWindow && !cleanWindow.includes(`[${s.slot_type}]`)) continue;
        if (s.slot_type === 'SLOT_MATERIAL' && atoms.materials && atoms.materials.length) {
          const rawSlotVal = (s.raw_value || '').toLowerCase();
          const isSlotMetal = /\b(?:metal|met[aá]lic[oa]s?|titanio)\b/.test(rawSlotVal);
          const isSlotAcetate = /\b(?:acetato|pasta)\b/.test(rawSlotVal);
          if ((reqAcetate && !reqMetal && isSlotMetal) || (reqMetal && !reqAcetate && isSlotAcetate)) {
            score -= 25;
          }
        }
        if (seenSlotTypesForScore.has(s.slot_type)) continue;
        seenSlotTypesForScore.add(s.slot_type);
        if (preferredSlot && s.slot_type === preferredSlot) { score += 8; slotHits++; }
        if (s.slot_type === 'SLOT_FRAME_SHAPE' && atoms.shapes && atoms.shapes.length) { score += 5; slotHits++; }
        if (s.slot_type === 'SLOT_MATERIAL' && atoms.materials && atoms.materials.length) { score += 5; slotHits++; }
        if (s.slot_type === 'SLOT_BRAND' && atoms.brand_models && atoms.brand_models.length) { score += 6; slotHits++; }
        if (s.slot_type === 'SLOT_MODEL' && atoms.brand_models && atoms.brand_models.length) { score += 6; slotHits++; }
        if (s.slot_type === 'SLOT_COATING' && atoms.coatings && atoms.coatings.length) { score += 4; slotHits++; }
        if (s.slot_type === 'SLOT_AESTHETIC_STYLE' && atoms.styles && atoms.styles.length) { score += 4; slotHits++; }
        if (s.slot_type === 'SLOT_OCCASION_OUTFIT' && atoms.outfits && atoms.outfits.length) { score += 3; slotHits++; }
      }
    }

    if (isProductFactual && /\[SLOT_(?:BRAND|MODEL)\]|^(?:las|estas)\s+gafas(?:\s+de\s+sol)?\b|^(?:este|el)\s+(?:modelo|diseño)\b/i.test(cleanWindow.trim())) {
      score += 16;
    }
    if (isProductFactual && slotHits === 0 && tokenHits === 0) {
      score -= 12;
    }

    const wc = cleanWc || c.word_count || raw.split(/\s+/).filter(Boolean).length;
    if (wc < 10) score -= 8;
    if (!paragraphMode && wc > 34) score -= (wc - 34) * 0.8;
    if (paragraphMode && wc > 92) score -= (wc - 92) * 0.6;

    // Penalize explicit raw-text material contradictions when input explicitly focuses on acetate vs metal
    if (atoms?.materials?.length) {
      const reqMatLow = atoms.materials.join(' ').toLowerCase();
      const reqAcetateOnly = /\b(?:acetato|pasta|celulosa)\b/.test(reqMatLow) && !/\b(?:metal|bronce|oro|acero|titanio)\b/.test(reqMatLow);
      const reqMetalOnly = /\b(?:metal|bronce|oro|acero|titanio)\b/.test(reqMatLow) && !/\b(?:acetato|pasta|celulosa)\b/.test(reqMatLow);
      if (reqAcetateOnly && /\b(?:titanio|armazón metálico|gafas\s+de\s+metal)\b/i.test(evalLower)) score -= 28;
      if (reqMetalOnly && /\b(?:gafas\s+de\s+pasta|de\s+acetato\s+grueso)\b/i.test(evalLower)) score -= 28;
    }

    const rawSemanticQuality = Number(score.toFixed(1));
    const reuseInfo = searchOptions.usageLedger
      ? bankGapTracker.getDonorReuseInfo(searchOptions.usageLedger, bId, winSentStems)
      : { brickUses: 0, stemUses: 0, totalFreshnessPenalty: 0, isCrossArticleRepeat: false };
    if (reuseInfo.totalFreshnessPenalty > 0) {
      score -= reuseInfo.totalFreshnessPenalty;
    }

    scored.push({
      brick: {
        ...c,
        brick_id: bId,
        word_count: wc,
        _cleanWindow: cleanWindow,
        _articleMacroStyle: searchOptions.articleMacroStyle || 'general_editorial',
        _semanticSurface: semanticSurface,
        _winStem: winStem,
        _winSentStems: winSentStems,
        _sentCount: winSents.length,
        _semScore: combinedSemScore,
        _bm25Score: hybrid.bm25Score,
        _denseCosine: hybrid.denseCosine,
        _tagOverlap: hybrid.tagOverlap,
        _discourseIntent: hybrid.discourseIntent,
        _narrativePersona: hybrid.narrativePersona,
        _polarity: hybrid.polarity,
        _topicTags: hybrid.topicTags,
        _matchedTerms: [...new Set([...hybrid.matchedTerms, ...sem.matchedTerms])].slice(0, 8),
        _rawSemanticQuality: rawSemanticQuality,
        _crossArticleReuseCount: reuseInfo.brickUses,
        _crossArticleStemReuseCount: reuseInfo.stemUses,
        _crossArticleFresh: !reuseInfo.isCrossArticleRepeat
      },
      score: Number(score.toFixed(1))
    });
  }

  scored.sort((a, b) => b.score - a.score);

  const verifiedZero = [];
  const fallbackNonZero = [];
  const evalLimit = Math.min(scored.length, 35);
  const enableAntiPlagiarism = bankState.enableAntiPlagiarism === true;
  for (let idx = 0; idx < evalLimit; idx++) {
    const item = scored[idx];
    if (enableAntiPlagiarism) {
      const simFilled = fillSlotsInBrick(item.brick, atoms, frameHint || frames[0]);
      const simBroken = applySymbolicShingleBreaker(bankState, simFilled, [item.brick], atoms, new Set(), 7);
      const rem = findAllCorpusOverlaps(bankState, simBroken, [item.brick], 7).length;
      if (rem === 0) {
        verifiedZero.push(item);
      } else {
        fallbackNonZero.push({ ...item, score: item.score - rem * 30 });
      }
    } else {
      verifiedZero.push(item);
    }
  }
  const orderedCandidates = [...verifiedZero, ...fallbackNonZero, ...scored.slice(evalLimit)];

  // Return top `count` bricks deduplicated by stem (allowing up to 4 per quality source domain)
  const picked = [];
  const seenStems = new Set();
  const domCounts = new Map();
  for (const item of orderedCandidates) {
    const dom = item.brick.domain_source || item.brick.source_domain || '';
    const basis = (item.brick._cleanWindow || item.brick.raw_text || '').toLowerCase();
    const stem = basis.slice(0, 32);
    if (seenStems.has(stem)) continue;
    if (dom && (domCounts.get(dom) || 0) >= 4 && orderedCandidates.length > count * 2) continue;
    seenStems.add(stem);
    if (dom) domCounts.set(dom, (domCounts.get(dom) || 0) + 1);
    picked.push(item);
    if (picked.length >= count) break;
  }
  return picked;
}

function searchBestDonorBrick(bankState, frames, atoms, text, excludeIds = new Set(), preferredSlot = null) {
  const picked = searchDonorBricksForParagraph(bankState, frames, atoms, text, excludeIds, 1, preferredSlot);
  if (!picked.length) return { best: null, bestScore: -999 };
  return { best: picked[0].brick, bestScore: picked[0].score };
}

function searchGoldenVisagism(bankState, atoms, excludeIds = new Set()) {
  const shape = (atoms.shapes && atoms.shapes[0]) ? atoms.shapes[0].toLowerCase() : '';
  const isRound = shape.includes('redond') || shape.includes('oval') || shape.includes('mariposa');
  const isSquare = shape.includes('cuadrad') || shape.includes('geométric') || shape.includes('rectangul');

  for (const g of bankState.goldenVH) {
    const gId = g.brick_id || g.golden_id;
    if (excludeIds.has(gId)) continue;
    const feat = (g.curation_feature || '').toUpperCase();
    const txt = (g.raw_text || '').toLowerCase();
    if (isRound && (feat.includes('ROUND') || txt.includes('redond') || txt.includes('angulos'))) {
      return g;
    }
    if (isSquare && (feat.includes('SQUARE') || feat.includes('RECTANGULAR') || txt.includes('geométric') || txt.includes('rectas'))) {
      return g;
    }
  }
  return bankState.goldenVH.find(g => !excludeIds.has(g.brick_id || g.golden_id)) || null;
}

function searchGoldenMaterial(bankState, atoms, excludeIds = new Set()) {
  const mat = (atoms.materials && atoms.materials[0]) ? atoms.materials[0].toLowerCase() : '';
  const isAcetate = mat.includes('acetato') || mat.includes('pasta');
  const isMetal = mat.includes('metal') || mat.includes('titanio');

  for (const g of bankState.goldenMM) {
    const gId = g.brick_id || g.donor_id;
    if (excludeIds.has(gId)) continue;
    const txt = (g.raw_text || '').toLowerCase();
    if (isAcetate && (txt.includes('pasta') || txt.includes('acetato') || txt.includes('almohadilla') || txt.includes('tacto'))) {
      return g;
    }
    if (isMetal && (txt.includes('metal') || txt.includes('titanio') || txt.includes('fino'))) {
      return g;
    }
  }
  return bankState.goldenMM.find(g => !excludeIds.has(g.brick_id || g.donor_id)) || null;
}

module.exports = {
  computeSemanticSimilarity,
  searchDonorBricksForParagraph,
  searchBestDonorBrick,
  searchGoldenVisagism,
  searchGoldenMaterial
};
