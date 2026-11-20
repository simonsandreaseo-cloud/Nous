/**
 * @fileoverview Capa Meta-Estructural de Topología Discursiva (RST + QUD + Cohesión de Halliday-Hasan)
 * y Validadores de Estilo Editorial para NOUS.
 */

const BRAND_OR_SKU_ANCHOR_RX = /\b(?:chlo[eé]|gucci|ray-?ban|persol|oakley|prada|dior|tom\s+ford|carrera|moscot|oliver\s+peoples|arnette|police|polaroid|vogue|versace|dolce|burberry|saint\s+laurent|celine|balenciaga|cazal|dita|lindberg|silhouette|maui\s+jim|etnia\s+barcelona|hawkers|meller|[A-Z]{2,3}\d{3,4}[A-Z]?)\b/i;
const SLOT_BRAND_MODEL_RX = /\[SLOT_(?:BRAND|MODEL)\]/i;
const GENERIC_CORE_NOUN_RX = /\b(?:gafas(?:\s+de\s+sol)?|monturas?|armaz[oó]n(?:es)?|model[oa]s?|diseñ[oa]s?|acetato|pasta|metal|titanio|carey|lentes|cristales|\[SLOT_(?:COMPONENT|FRAME_SHAPE|MATERIAL)\])\b/i;

const ANAPHORIC_OPEN_RX = /^(?:Por\s+eso|Adem[aá]s|Tambi[eé]n|Sin\s+embargo|No\s+obstante|Por\s+otro\s+lado|Por\s+otra\s+parte|En\s+cambio|Asimismo|De\s+hecho|Por\s+lo\s+tanto|En\s+este\s+caso|Es\s+el\s+caso\s+de|Esto\s+|Este\s+tipo\s+de|Esta\s+clase\s+de)\b/i;

const CATAPHORIC_CLOSE_RX = /\b(?:son\s+una\s+de\s+sus\s+principales\s+apuestas|es\s+una\s+de\s+las\s+grandes\s+apuestas|te\s+contamos\s+por\s+qu[eé]|descubre\s+c[oó]mo|veamos\s+por\s+qu[eé]|a\s+continuaci[oó]n)\b[^.!?]{0,25}[.!]?$/i;

const CLOSER_EVAL_RX = /\b(?:sin\s+duda\s+alguna|en\s+definitiva|apuesta\s+segura|no\s+te\s+las\s+quitar[aá]s|sobresale\s+por\s+encima|acierto\s+seguro)\b/i;

const CORRELATIVE_PAIRS = [
  {
    openRx: /(^|[.!?]\s+|\s+)Por\s+un\s+lado,\s*([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/gi,
    partnerRx: /\b(?:por\s+otro\s+lado|por\s+otra\s+parte)\b/i
  },
  {
    openRx: /(^|[.!?]\s+|\s+)Por\s+una\s+parte,\s*([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/gi,
    partnerRx: /\b(?:por\s+otra\s+parte|por\s+otro\s+lado)\b/i
  },
  {
    openRx: /(^|[.!?]\s+|\s+)En\s+primer\s+lugar,\s*([a-záéíóúüñA-ZÁÉÍÓÚÜÑ])/gi,
    partnerRx: /\b(?:en\s+segundo\s+lugar|por\s+otro\s+lado|en\s+último\s+lugar)\b/i
  }
];

function hasOrphanCorrelativeOpener(text) {
  const s = String(text || '');
  for (const pair of CORRELATIVE_PAIRS) {
    pair.openRx.lastIndex = 0;
    if (pair.openRx.test(s) && !pair.partnerRx.test(s)) {
      return true;
    }
  }
  return false;
}

/**
 * Mapea cada párrafo del artículo según su sección, posición QUD y macro-estilo estético.
 */
function computeSectionTopology(paragraphs, isHeadingFn) {
  const list = Array.isArray(paragraphs) ? paragraphs : [];
  const articleMacroStyle = 'general_editorial';

  const sections = [];
  let currentSection = { sectionIndex: 0, headingIdx: -1, bodyIndices: [] };
  sections.push(currentSection);

  const isHeadingFlags = list.map((p, idx) => Boolean(isHeadingFn ? isHeadingFn(p, idx) : false));

  for (let i = 0; i < list.length; i++) {
    if (isHeadingFlags[i]) {
      if (currentSection.bodyIndices.length > 0 || currentSection.headingIdx !== -1) {
        currentSection = { sectionIndex: sections.length, headingIdx: i, bodyIndices: [] };
        sections.push(currentSection);
      } else {
        currentSection.headingIdx = i;
      }
    } else {
      currentSection.bodyIndices.push(i);
    }
  }

  const items = new Array(list.length);
  let globalBodyIdx = 0;

  for (const sec of sections) {
    const sectionCount = sec.bodyIndices.length;
    if (sec.headingIdx !== -1) {
      items[sec.headingIdx] = {
        isHeading: true,
        sectionIndex: sec.sectionIndex,
        posInSection: 0,
        sectionCount,
        role: 'HEADING'
      };
    }

    for (let k = 0; k < sectionCount; k++) {
      const pIdx = sec.bodyIndices[k];
      const trimmed = String(list[pIdx] || '').trim();
      const posInSection = k + 1;
      const bodyIdx = globalBodyIdx++;

      let role;
      if (trimmed.endsWith(':')) {
        role = 'TRANSITION_COLON';
      } else if (bodyIdx === 0) {
        role = 'ARTICLE_INTRO';
      } else if (sectionCount === 1) {
        role = 'SINGLETON';
      } else if (posInSection === 1) {
        role = 'SECTION_OPENING';
      } else if (posInSection === sectionCount) {
        role = 'SECTION_CLOSING';
      } else {
        role = 'SECTION_MEDIAL';
      }

      items[pIdx] = {
        isHeading: false,
        sectionIndex: sec.sectionIndex,
        posInSection,
        sectionCount,
        bodyIdx,
        role
      };
    }
  }

  return { articleMacroStyle, items };
}

/**
 * Calcula métricas RST / QUD / cohesión de Halliday-Hasan sobre un ladrillo o ventana donante.
 */
function analyzeBrickDiscourseProfile(text, skeleton = '', slots = []) {
  const cleanText = String(text || '').trim();
  const cleanSkel = String(skeleton || cleanText).trim();
  const hasSlotAnchor = SLOT_BRAND_MODEL_RX.test(cleanSkel) ||
    (Array.isArray(slots) && slots.some(s => s && (s.slot_type === 'SLOT_BRAND' || s.slot_type === 'SLOT_MODEL')) && SLOT_BRAND_MODEL_RX.test(cleanSkel));

  const words = cleanText.split(/\s+/).filter(Boolean);
  const totalWords = Math.max(1, words.length);
  const skelWords = cleanSkel.split(/\s+/).filter(Boolean);
  const totalSkelWords = Math.max(1, skelWords.length);

  let anchorIdx = -1;
  let totalForRatio = totalWords;
  let hasBrandOrModelAnchor = false;

  // Prefer finding explicit brand/SKU mention in surface text when available, else [SLOT_BRAND]/[SLOT_MODEL] in aligned skeleton
  for (let i = 0; i < words.length; i++) {
    if (BRAND_OR_SKU_ANCHOR_RX.test(words[i])) {
      anchorIdx = i;
      totalForRatio = totalWords;
      hasBrandOrModelAnchor = true;
      break;
    }
  }

  if (anchorIdx === -1 && SLOT_BRAND_MODEL_RX.test(cleanSkel)) {
    for (let i = 0; i < skelWords.length; i++) {
      if (SLOT_BRAND_MODEL_RX.test(skelWords[i])) {
        anchorIdx = i;
        totalForRatio = totalSkelWords;
        hasBrandOrModelAnchor = true;
        break;
      }
    }
  }

  if (anchorIdx === -1 && hasSlotAnchor) {
    hasBrandOrModelAnchor = true;
  }

  if (anchorIdx === -1) {
    for (let i = 0; i < words.length; i++) {
      if (GENERIC_CORE_NOUN_RX.test(words[i])) {
        anchorIdx = i;
        totalForRatio = totalWords;
        break;
      }
    }
  }

  if (anchorIdx === -1) anchorIdx = 0;

  const anchor_position_ratio = Number((anchorIdx / totalForRatio).toFixed(3));
  const post_anchor_words = Math.max(0, totalForRatio - anchorIdx - 1);

  const anaphoric_open = ANAPHORIC_OPEN_RX.test(cleanText);
  const cataphoric_open = Boolean(
    hasOrphanCorrelativeOpener(cleanText) ||
    /[:?]\s*$/.test(cleanText) ||
    (hasBrandOrModelAnchor && anchor_position_ratio >= 0.55 && post_anchor_words < 18) ||
    CATAPHORIC_CLOSE_RX.test(cleanText)
  );

  let discourse_closure;
  if (cataphoric_open || (hasBrandOrModelAnchor && anchor_position_ratio >= 0.55 && post_anchor_words < 18)) {
    discourse_closure = 'LEAD_IN_FUNNEL';
  } else if (CLOSER_EVAL_RX.test(cleanText) && !cataphoric_open) {
    discourse_closure = 'CLOSER_SYNTHESIS';
  } else if (anaphoric_open && !cataphoric_open) {
    discourse_closure = 'ELABORATION_BODY';
  } else {
    discourse_closure = 'SELF_CONTAINED';
  }

  return {
    hasBrandOrModelAnchor,
    anchor_position_ratio,
    post_anchor_words,
    anaphoric_open,
    cataphoric_open,
    discourse_closure
  };
}

/**
 * Puntúa la compatibilidad estructural RST + QUD entre el rol del párrafo objetivo y el perfil del donante.
 */
function scoreTopologyCompatibility(targetRole, profile, contextFrame = 'GENERAL_STYLE') {
  if (!profile) return { score: 0, reason: 'NO_PROFILE' };

  let score = 0;
  const reasons = [];

  if (targetRole === 'SINGLETON') {
    if (profile.discourse_closure === 'LEAD_IN_FUNNEL' || profile.cataphoric_open) {
      score -= 36;
      reasons.push('SINGLETON_FUNNEL_PENALTY(-36)');
      if (contextFrame === 'PRODUCT_FACTUAL' && profile.hasBrandOrModelAnchor && profile.anchor_position_ratio > 0.52) {
        score -= 20;
        reasons.push('SINGLETON_LATE_SKU(-20)');
      }
    } else if (profile.anaphoric_open) {
      score -= 18;
      reasons.push('SINGLETON_ANAPHORIC(-18)');
    } else if (profile.discourse_closure === 'SELF_CONTAINED' || profile.discourse_closure === 'CLOSER_SYNTHESIS') {
      score += 16;
      reasons.push('SINGLETON_SELF_CONTAINED(+16)');
      if (contextFrame === 'PRODUCT_FACTUAL' && profile.anchor_position_ratio <= 0.42 && profile.post_anchor_words >= 18) {
        score += 6;
        reasons.push('SINGLETON_EARLY_ELABORATION(+6)');
      }
    }
  } else if (targetRole === 'ARTICLE_INTRO' || targetRole === 'SECTION_OPENING') {
    if (profile.anaphoric_open) {
      score -= 20;
      reasons.push('OPENING_ANAPHORIC(-20)');
    }
    if (profile.discourse_closure === 'LEAD_IN_FUNNEL' || profile.discourse_closure === 'SELF_CONTAINED') {
      score += 10;
      reasons.push('OPENING_FIT(+10)');
    }
  } else if (targetRole === 'SECTION_MEDIAL') {
    if (profile.discourse_closure === 'ELABORATION_BODY' || profile.discourse_closure === 'SELF_CONTAINED') {
      score += 8;
      reasons.push('MEDIAL_ELABORATION(+8)');
    }
    if (profile.cataphoric_open) {
      score -= 14;
      reasons.push('MEDIAL_CATAPHORIC(-14)');
    }
  } else if (targetRole === 'SECTION_CLOSING') {
    if (profile.discourse_closure === 'CLOSER_SYNTHESIS' || profile.discourse_closure === 'SELF_CONTAINED') {
      score += 12;
      reasons.push('CLOSING_SYNTHESIS(+12)');
    }
    if (profile.discourse_closure === 'LEAD_IN_FUNNEL' || profile.cataphoric_open) {
      score -= 24;
      reasons.push('CLOSING_FUNNEL(-24)');
    }
  }

  return {
    score,
    reason: reasons.join('+') || 'NEUTRAL'
  };
}

/**
 * Clasifica materiales en familias equivalentes para evitar falsas oposiciones (e.g. acetato vs. pasta).
 */
function getMaterialFamilies(textOrList) {
  const joined = Array.isArray(textOrList) ? textOrList.join(' ') : String(textOrList || '');
  // Excluir herramientas de taller o refuerzos internos que no definen el material de la montura
  const cleaned = joined
    .replace(/\btambores?\s+de\s+madera\b/gi, ' ')
    .replace(/\b(?:alma|n[uú]cleo)\s+met[aá]lic[oa]s?\b/gi, ' ')
    .replace(/\bvarillas?\s+con\s+(?:alma|n[uú]cleo)\s+met[aá]lic[oa]s?\b/gi, ' ');
  const families = new Set();
  if (/\b(?:acetato|pasta|celulosa|ecoacetato|propionato)\b/i.test(cleaned)) {
    families.add('ACETATE_CELLULOSE');
  }
  if (/\b(?:metal|met[aá]lic[oa]?|acero|titanio|aluminio|bronce|dorad[oa]|oro)\b/i.test(cleaned)) {
    families.add('METAL_ALLOY');
  }
  if (/\b(?:madera|bamb[uú]|cuerno|asta)\b/i.test(cleaned)) {
    families.add('NATURAL_ORGANIC');
  }
  return families;
}

/**
 * Detecta si la ventana contrapone dos materiales cuando los átomos de entrada solo pertenecen a una familia,
 * o si el relleno final ha producido una redundancia/falsa oposición dentro de la familia acetato/celulosa.
 */
function hasContrastiveMaterialRedundancy(skeletonOrWindow, rawPara = '', atoms = null, filledText = '') {
  const skel = String(skeletonOrWindow || '');
  const matSlots = (skel.match(/\[SLOT_MATERIAL\]/g) || []).length;
  const hasContrastiveFrame = /\b(?:tambi[eé]n\s+hay\s+(?:monturas|gafas)\s+de|o\s+bien\s+(?:en|con\s+montura)|tanto\s+en\s+\[SLOT_MATERIAL\]\s+como\s+en|adem[aá]s\s+del\s+(?:acetato|metal|\[SLOT_MATERIAL\])|acabados?\s+en\s+\[SLOT_MATERIAL\],\s+en\s+\[SLOT_MATERIAL\]|frontal\s+de\s+\[SLOT_MATERIAL\]\s+y\s+varillas?\s+de\s+\[SLOT_MATERIAL\]|combinan?\s+[^.!?]{0,25}\[SLOT_MATERIAL\]\s+y\s+(?:el\s+)?\[SLOT_MATERIAL\]|compartiendo\s+espacio\s+con\s+los\s+de\s+\[SLOT_MATERIAL\]|de\s+\[SLOT_MATERIAL\]\s+o\s+\[SLOT_MATERIAL\])\b/i.test(skel);
  const inputFamilies = getMaterialFamilies([rawPara || '', ...(atoms?.materials || [])]);

  if ((matSlots >= 2 || hasContrastiveFrame) && inputFamilies.size <= 1) {
    return true;
  }

  if (filledText) {
    const f = String(filledText);
    if (/\bel\s+celulosa\b|\balma\s+(?:acetato|pasta|celulosa)\b/i.test(f)) {
      return true;
    }
    const fClean = f.replace(/\bacetato\s+de\s+celulosa\b/gi, 'acetato');
    const acetateTerms = new Set(fClean.toLowerCase().match(/\b(?:acetato|celulosa|pasta)\b/g) || []);
    if (
      acetateTerms.size >= 2 &&
      /\b(?:tambi[eé]n\s+hay\s+(?:monturas|gafas)\s+de|o\s+(?:de\s+)?(?:celulosa|pasta|acetato)|y\s+(?:el\s+|la\s+)?(?:celulosa|pasta|acetato)|en\s+(?:acetato|celulosa|pasta),\s+en\s+(?:acetato|celulosa|pasta)|varillas?\s+de\s+(?:celulosa|pasta|acetato)|compartiendo\s+espacio\s+con|las\s+gafas\s+de\s+celulosa|combinan?\s+(?:acetato|celulosa|pasta)\s+y\s+(?:acetato|celulosa|pasta))\b/i.test(fClean)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Limpia iniciadores correlativos huérfanos y micro-fricciones de preposición/registro.
 */
function cleanOrphanCorrelatives(text) {
  let out = String(text || '').trim();
  if (!out) return '';

  for (const pair of CORRELATIVE_PAIRS) {
    if (!pair.partnerRx.test(out)) {
      out = out.replace(pair.openRx, (full, prefix, nextChar) => {
        const atSentenceStart = !prefix || /[.!?]\s+$/.test(prefix);
        const fixedChar = atSentenceStart ? nextChar.toUpperCase() : nextChar.toLowerCase();
        return `${prefix || ''}${fixedChar}`;
      });
    }
  }

  out = out
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (out.length > 0) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

/**
 * Conservado por compatibilidad de firma con callers existentes.
 */
function isAestheticSilhouetteCompatible() {
  return true;
}

module.exports = {
  computeSectionTopology,
  analyzeBrickDiscourseProfile,
  scoreTopologyCompatibility,
  getMaterialFamilies,
  hasContrastiveMaterialRedundancy,
  cleanOrphanCorrelatives,
  isAestheticSilhouetteCompatible
};
