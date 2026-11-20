'use strict';

const domainRegistry = require('../donor-bank/domain-packs-registry.cjs');
const factualGuard = require('./factual-entailment-guard.cjs');
const { FRAME_SHAPE_ONTOLOGY } = require('./lexical-constants.cjs');

function extractDavidsonianAtoms(text) {
  const atoms = {
    brand_models: [],
    proper_entities: [],
    shapes: [],
    styles: [],
    materials: [],
    outfits: [],
    garment_pairings: [],
    temporal_occasions: [],
    locative_scenes: [],
    coatings: [],
    key_concepts: [],
    relations: []
  };

  // Brands and models (with SKU/caliber codes preserved verbatim, without leaking full headings)
  const brandRx = /\b(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley|Carrera|Moscot|Oliver Peoples)(?:\s+(?:Aviator|Classic|Wayfarer|Clubmaster|Original|Steve\s+McQueen|714|[A-Z]{1,4}\d{2,5}[A-Z]?(?:\/\d{1,3})?|\d{2,4}))+/gi;
  let bm;
  while ((bm = brandRx.exec(text)) !== null) {
    atoms.brand_models.push(bm[0].trim());
  }
  for (const sSku of factualGuard.extractStrictBrandSkus(text)) {
    if (!atoms.brand_models.some(b => b.toLowerCase() === sSku.toLowerCase())) {
      atoms.brand_models.push(sSku);
    }
  }
  atoms.brand_models = [...new Set(atoms.brand_models)];

  // Proper / historical / cultural entities (e.g., Brigitte Bardot, Jane Birkin, hippies)
  const stopEntityStarts = /^(?:Hoy|Por|Sin|Ahora|Estos|Estas|Este|Esta|Dos|Las|Los|Una|Uno|Para|Con|En|La|El|Un|De|Del|Al|Su|Sus|No|Si|Y|O|Pero|Aunque|Mientras|Cuando|Boho|Chic|Original)$/i;
  const properRx = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+(?:de\s+|la\s+|el\s+|y\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}){1,2})\b/g;
  let pm;
  while ((pm = properRx.exec(text)) !== null) {
    const candidate = pm[1].trim();
    const firstWord = candidate.split(/\s+/)[0];
    if (stopEntityStarts.test(firstWord)) continue;
    if (/\b(?:Ban|Aviator|Classic|Steve\s+McQueen|Wayfarer|Clubmaster)\b/i.test(candidate)) continue;
    if (text.slice(Math.max(0, pm.index - 5), pm.index).includes('-')) continue;
    if (atoms.brand_models.some(b => b.toLowerCase().includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(b.toLowerCase()))) continue;
    atoms.proper_entities.push(candidate);
  }
  if (/\bhippies?\b/i.test(text)) {
    const hMatch = text.match(/\bhippies?\b/i);
    if (hMatch) atoms.proper_entities.push(hMatch[0].toLowerCase());
  }
  atoms.proper_entities = [...new Set(atoms.proper_entities)];

  // Shapes: Extract canonical frame silhouettes using Universal Shape Ontology
  const cleanLower = text.toLowerCase();
  for (const [key, def] of Object.entries(FRAME_SHAPE_ONTOLOGY)) {
    if (def.contextRx.test(cleanLower) || (!def.requireContext && def.detectRx.test(cleanLower))) {
      atoms.shapes.push(def.canonical);
    }
  }
  atoms.shapes = [...new Set(atoms.shapes)];

  // Styles
  const styleRx = /\b(boho\s*chic|bohemio|bohemia|vintage|retro|hippie|moderno|artesanal|setentero|años\s*70|clásico|atemporal|elegante|urbano|sofisticado|minimalista|campestre)\b/gi;
  const stMatches = text.match(styleRx);
  if (stMatches) atoms.styles.push(...[...new Set(stMatches.map(s => s.toLowerCase()))]);

  // Materials (Frame materials exclusively - excluding textile fabrics, process tools & internal wire cores)
  const matSearchText = text
    .replace(/\btambores?\s+de\s+madera\b/gi, ' ')
    .replace(/\b(?:alma|n[uú]cleo)\s+met[aá]lic[oa]s?\b/gi, ' ')
    .replace(/\bacetato\s+de\s+celulosa\b/gi, 'acetato');
  const matRx = /\b(acetato\s*pulido|acetato|pasta|carey|metales|metal|met[aá]lic[oa]s?|titanio|oro|bronce|acero|celulosa|madera)\b/gi;
  const mMatches = matSearchText.match(matRx);
  if (mMatches) {
    const seenFamilies = new Set();
    const normMats = [];
    for (const m of mMatches) {
      const norm = /^(?:metales|met[aá]lic)/i.test(m) ? 'metal' : m.toLowerCase();
      const fam = /^(?:acetato|pasta|celulosa)/i.test(norm) ? 'ACETATE_CELLULOSE' : norm;
      if (fam === 'ACETATE_CELLULOSE' && seenFamilies.has('ACETATE_CELLULOSE')) continue;
      seenFamilies.add(fam);
      if (!normMats.includes(norm)) normMats.push(norm);
    }
    atoms.materials.push(...normMats);
  }

  // Outfits & Occasions sub-typed into Garment Pairings, Temporal Occasions, and Locative Scenes
  const garmentRx = /\b(vestidos\s*sueltos|prendas\s*de\s*lino|prendas\s*de\s*cuero|encajes\s*finos|lino|algodón|cuero|encajes|seda|sombrero)\b/gi;
  const gMatches = text.match(garmentRx);
  if (gMatches) atoms.garment_pairings.push(...[...new Set(gMatches.map(g => g.toLowerCase()))]);

  const temporalRx = /\b(verano|diario|todo\s+el\s+año|entretiempo|primavera|otoño|invierno|años\s*70)\b/gi;
  const tMatches = text.match(temporalRx);
  if (tMatches) atoms.temporal_occasions.push(...[...new Set(tMatches.map(t => t.toLowerCase()))]);

  const locativeRx = /\b(ciudad|paseo|playa|oficina|despacho|fiestas|escaparates|pasarelas|tiendas\s*de\s*moda|boda|evento|conducir|al\s+volante|coche|ordenador|monitores?|monta[ñn]a|nieve|deporte)\b/gi;
  const lMatches = text.match(locativeRx);
  if (lMatches) atoms.locative_scenes.push(...[...new Set(lMatches.map(l => l.toLowerCase()))]);

  const outRx = /\b(vestidos\s*sueltos|prendas\s*de\s*lino|prendas\s*de\s*cuero|encajes\s*finos|lino|cuero|encajes|algodón|seda|sombrero|playa|ciudad|paseo|verano|boda|evento|diario|oficina|despacho|fiestas|escaparates|pasarelas|tiendas\s*de\s*moda|conducir|al\s+volante|coche|ordenador|monitores?|monta[ñn]a|nieve|deporte)\b/gi;
  const oMatches = text.match(outRx);
  if (oMatches) atoms.outfits.push(...[...new Set(oMatches.map(o => o.toLowerCase()))]);

  // Optical coatings & lens tech
  const coatRx = /\b(uv\s*400|filtro\s*uv|polarizad[oa]s?|antirreflejantes?|espejad[oa]s?|cristal(?:es)?\s*mineral(?:es)?|fotocrom[aá]tic[oa]s?|progresiv[oa]s?|ocupacional(?:es)?|monofocal(?:es)?|policarbonato|luz\s+azul|degradad[oa]s?)\b/gi;
  const cMatches = text.match(coatRx);
  if (cMatches) atoms.coatings.push(...[...new Set(cMatches.map(c => c.toLowerCase()))]);

  // Domain key concepts (sintagmas nominales compuestos extraídos dinámicamente por morfosintaxis general)
  const dynamicNPs = factualGuard.extractSpanishCompoundNPs(text, 12);
  for (const np of dynamicNPs) {
    const norm = np.label.replace(/\s+/g, ' ').trim().toLowerCase();
    if (norm.length >= 5) atoms.key_concepts.push(norm);
  }
  atoms.key_concepts = [...new Set(atoms.key_concepts)];

  // Grafo de Fichas Relacionales/Causales (relaciones canónicas dirigidas por morfosintaxis general)
  const subj = atoms.brand_models[0] || (atoms.shapes[0] ? `montura ${atoms.shapes[0]}` : (atoms.proper_entities[0] || atoms.key_concepts[0] || (/\b(?:gafas?|lentes?|monturas?)\b/i.test(text) ? 'gafas de sol' : 'el tema')));
  for (const sh of atoms.shapes) {
    atoms.relations.push({ subject: subj, type: 'FORMA_MONTURA', relation: 'HAS_ATTRIBUTE', target: sh });
  }
  for (const mat of atoms.materials) {
    atoms.relations.push({ subject: subj, type: 'MATERIAL', relation: 'HAS_ATTRIBUTE', target: mat });
  }
  for (const st of atoms.styles) {
    atoms.relations.push({ subject: subj, type: 'ESTILO', relation: 'HAS_ATTRIBUTE', target: st });
  }
  for (const gp of atoms.garment_pairings) {
    atoms.relations.push({ subject: subj, type: 'ESTILISMO_PRENDA', relation: 'PAIRS_WITH_GARMENT', target: gp });
  }
  for (const ctxVal of [...new Set([...atoms.temporal_occasions, ...atoms.locative_scenes])]) {
    atoms.relations.push({ subject: subj, type: 'OCASION_CONTEXTO', relation: 'USED_IN_CONTEXT', target: ctxVal });
  }
  const benefitRx = /\b(?:gracias\s+a|logra(?:n)?\s+que|permite(?:n)?\s+que|aporta(?:n)?|ayuda(?:n)?\s+a|consigue(?:n)?|evita(?:n)?)\s+([^.;!?]{8,65})/gi;
  let bMatch;
  while ((bMatch = benefitRx.exec(text)) !== null) {
    const val = bMatch[1].toLowerCase().trim();
    if (val) atoms.relations.push({ subject: subj, type: 'BENEFICIO_CAUSAL', relation: 'CAUSES_BENEFIT', target: val });
  }
  const visagismRx = /\b(?:favorece|estiliza|suaviza|armoniza|equilibra|realza|enmarca|asienta)\w*\s+([^.;!?]{4,45})/gi;
  let vMatch;
  while ((vMatch = visagismRx.exec(text)) !== null) {
    const val = vMatch[0].toLowerCase().trim();
    if (val) atoms.relations.push({ subject: subj, type: 'VISAGISMO', relation: 'BALANCES_FACE_SHAPE', target: val });
  }
  const avoidRx = /\b(?:evitar|evita|descartar|prescindir\s+de|huir\s+de|conviene\s+evitar|nunca\s+(?:uses?|utilices?|debes?)|no\s+(?:conviene|recomend\w*|oprim\w*|presionen))\s+([^.;!?]{4,55})/gi;
  let aMatch;
  while ((aMatch = avoidRx.exec(text)) !== null) {
    const val = aMatch[0].toLowerCase().trim();
    if (val) atoms.relations.push({ subject: subj, type: 'RESTRICCION', relation: 'AVOID_FEATURE', target: val });
  }

  atoms.signedPolarity = factualGuard.extractSignedPolarityAtoms(text);
  atoms.discriminativeAnchors = factualGuard.extractDiscriminativeAnchors(text, atoms);

  return atoms;
}

function classifyParagraph(text, currentAnchor = null, activeSubdomains = null) {
  const clean = text.toLowerCase();
  const atoms = extractDavidsonianAtoms(text);

  // If text or anchor explicitly mentions a specific brand/model, route to PRODUCT_FACTUAL
  if (atoms.brand_models.length > 0 || (currentAnchor && /^(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley|Carrera|Moscot|Oliver Peoples)\b/i.test(currentAnchor))) {
    return { type: 'PRODUCT_FACTUAL', atoms };
  }

  // Audiology compartment routing (strict H2/paragraph isolation)
  const cleanAudioText = domainRegistry.stripOpticaFalseAudiologyStrings(text);
  const hasEyewearExplicit = domainRegistry.OPTICA_EYEWEAR_SUBJECT_RX.test(text);
  domainRegistry.OPTICA_EYEWEAR_SUBJECT_RX.lastIndex = 0;
  if (
    (activeSubdomains instanceof Set && activeSubdomains.has('AUDIOLOGY') && !activeSubdomains.has('OPTICAL_EYEWEAR')) ||
    (domainRegistry.OPTICA_AUDIOLOGY_RX.test(cleanAudioText) && !hasEyewearExplicit)
  ) {
    return { type: 'AUDIOLOGY', atoms };
  }

  // Clinical ophthalmology compartment routing
  if (
    (activeSubdomains instanceof Set && activeSubdomains.has('OPTICAL_CLINICAL') && !activeSubdomains.has('OPTICAL_EYEWEAR'))
  ) {
    return { type: 'CLINICAL_OPHTHALMOLOGY', atoms };
  }

  // Contact lens care
  if (clean.includes('lentilla') || clean.includes('lente de contacto') || clean.includes('líquido') || clean.includes('solución única')) {
    return { type: 'CONTACT_LENS_CARE', atoms };
  }

  // Visagism and facial geometry
  if (clean.includes('perfil y los ángulos') || clean.includes('rostro') || clean.includes('fisonomía') || clean.includes('facciones') || clean.includes('mandíbula') || clean.includes('cara redonda') || clean.includes('cara cuadrada') || clean.includes('forma de la cara')) {
    return { type: 'VISAGISM_AESTHETICS', atoms };
  }

  // Material composition and mechanics (prioritize when explicit frame materials are central and no optical filter/UV keywords dominate)
  if ((clean.includes('acetato') || clean.includes('pasta') || clean.includes('celulosa') || clean.includes('titanio') || clean.includes('metal') || clean.includes('bronce') || clean.includes('bisagra') || clean.includes('almohadilla')) &&
      !(clean.includes('uv') || clean.includes('polarizado') || clean.includes('espectro') || clean.includes('deslumbramiento'))) {
    return { type: 'MATERIAL_COMPOSITION', atoms };
  }

  // Optical protection and lens properties
  if (clean.includes('cristal') || clean.includes('uv') || clean.includes('espectro') || clean.includes('filtro') || clean.includes('polarizado') || clean.includes('polarizada') || clean.includes('fotocrom') || clean.includes('progresiv') || clean.includes('ocupacional') || clean.includes('policarbonato') || clean.includes('reflejo') || clean.includes('conducir') || clean.includes('deslumbramiento')) {
    return { type: 'OPTICAL_PROTECTION', atoms };
  }

  // Fallback material composition
  if (clean.includes('material')) {
    return { type: 'MATERIAL_COMPOSITION', atoms };
  }

  // Clinical ophthalmology
  if (clean.includes('miopía') || clean.includes('astigmatismo') || clean.includes('ojo seco') || clean.includes('fatiga visual') || clean.includes('graduación') || clean.includes('oftalmólogo')) {
    return { type: 'CLINICAL_OPHTHALMOLOGY', atoms };
  }

  // Curation / Transition to models
  if (clean.includes('hemos seleccionado') || clean.includes('modelos de tendencia') || clean.includes('dos piezas de artesanía') || clean.includes('opciones más destacadas') || clean.includes('modelos recomendados')) {
    return { type: 'TRANSITION_CURATION', atoms };
  }

  return { type: 'GENERAL_STYLE', atoms };
}

function deconstructToDavidsonianTuples(rawPara, atoms, frame, currentAnchor) {
  const compactAnchor = extractCompactAnchor(currentAnchor);
  const mainEntity = (atoms?.brand_models && atoms.brand_models[0]) || compactAnchor || 'Gafas de sol';
  const rawTrimmed = (rawPara || '').trim();
  const totalWords = rawTrimmed.split(/\s+/).filter(Boolean).length;

  const rawSegments = rawTrimmed
    .split(/(?<=[.!?])\s+|;\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  // Merge tiny fragments into neighbors so each tuple carries a full propositional event
  const merged = [];
  for (const seg of rawSegments) {
    const wc = seg.split(/\s+/).filter(Boolean).length;
    if (wc < 5 && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${seg}`.trim();
    } else {
      merged.push(seg);
    }
  }
  if (!merged.length && rawTrimmed) merged.push(rawTrimmed);

  // Group sentences into M dense tuples (1 for curatorial intros, 3 for >=55w, 2 otherwise)
  const targetCount = (frame === 'TRANSITION_CURATION' || rawTrimmed.endsWith(':'))
    ? 1
    : (totalWords >= 55 ? 3 : 2);

  const clauses = [];
  if (merged.length <= targetCount) {
    clauses.push(...merged);
  } else {
    const groupSize = Math.ceil(merged.length / targetCount);
    for (let i = 0; i < merged.length; i += groupSize) {
      clauses.push(merged.slice(i, i + groupSize).join(' ').trim());
    }
  }

  return clauses.map((clause, idx) => {
    const lc = clause.toLowerCase();
    const clauseAtoms = extractDavidsonianAtoms(clause);
    let predicate = 'DEFINE_SILHOUETTE';
    let subFrame = frame === 'PRODUCT_FACTUAL' ? 'GENERAL_STYLE' : frame;
    const requiredSlots = [];
    let expectedCf = 'FRAME_ENTITY';

    if (frame === 'TRANSITION_CURATION' || clause.endsWith(':') || /\b(hemos seleccionado|marca la pauta|dos piezas)\b/.test(lc)) {
      predicate = 'CURATION_INTRO';
      subFrame = 'GENERAL_STYLE';
    } else if (/\b(rayos solares|resplandor|uv|protección|proteger|solares|cristal|filtro)\b/.test(lc)) {
      predicate = 'OPTICAL_PROTECTION';
      subFrame = 'OPTICAL_PROTECTION';
      requiredSlots.push('SLOT_COATING');
      expectedCf = 'OPTICAL_PROTECTION';
    } else if (/\b(facciones|rostro|cara|semblante|frente|mandíbula|perfil|ángulos)\b/.test(lc)) {
      predicate = 'VISAGISM_BALANCE';
      subFrame = 'VISAGISM_AESTHETICS';
      requiredSlots.push('SLOT_FACIAL_FEATURE');
      expectedCf = 'FACIAL_FEATURE';
    } else if (/\b(acabados|artesanales|acetato|pasta|metal|material)\b/.test(lc)) {
      predicate = 'MATERIAL_CRAFT';
      subFrame = 'MATERIAL_COMPOSITION';
      requiredSlots.push('SLOT_MATERIAL');
      expectedCf = 'MATERIAL_CRAFT';
    } else if (/\b(vestidos|lino|pasear|ciudad|verano|ropa|look|outfit|complemento|encajes|cuero|texturas)\b/.test(lc)) {
      predicate = 'OUTFIT_PAIRING';
      subFrame = 'GENERAL_STYLE';
      requiredSlots.push('SLOT_OCCASION_OUTFIT');
      expectedCf = 'OUTFIT_OCCASION';
    } else if (/\b(años 70|décadas|retro|vintage|consagrados|evocan|pervivido|universo|hippies|bardot|birkin)\b/.test(lc)) {
      predicate = 'HERITAGE_ERA';
      subFrame = 'HERITAGE_ORIGIN';
      requiredSlots.push('SLOT_AESTHETIC_STYLE');
      expectedCf = 'STYLE_AESTHETIC';
    } else if (/\b(geométric|redond|cuadrad|silueta|montura|líneas|forma)\b/.test(lc)) {
      predicate = 'DEFINE_SILHOUETTE';
      subFrame = 'VISAGISM_AESTHETICS';
      requiredSlots.push('SLOT_FRAME_SHAPE');
      expectedCf = 'FRAME_ENTITY';
    }

    const clauseFacts = [...new Set([
      ...(clauseAtoms.brand_models || []),
      ...(clauseAtoms.proper_entities || []),
      ...(clauseAtoms.shapes || []),
      ...(clauseAtoms.materials || []),
      ...(clauseAtoms.coatings || []),
      ...(clauseAtoms.outfits || []),
      ...(clauseAtoms.styles || []),
      ...(clauseAtoms.key_concepts || [])
    ])];

    let argument = clauseFacts.slice(0, 3).join('; ') || atoms?.styles?.join(', ') || 'estilo editorial';
    if (predicate === 'DEFINE_SILHOUETTE' && (clauseAtoms.shapes?.length || atoms?.shapes?.length)) {
      argument = clauseAtoms.shapes[0] || atoms.shapes[0];
    } else if (predicate === 'OUTFIT_PAIRING' && (clauseAtoms.outfits?.length || clauseFacts.length)) {
      argument = (clauseAtoms.outfits.length ? clauseAtoms.outfits : clauseFacts).slice(0, 3).join(', ');
    } else if (predicate === 'MATERIAL_CRAFT' && (clauseAtoms.materials?.length || clauseFacts.length)) {
      argument = clauseAtoms.materials[0] || clauseFacts[0];
    } else if (predicate === 'OPTICAL_PROTECTION' && (clauseAtoms.coatings?.length || clauseFacts.length)) {
      argument = clauseAtoms.coatings[0] || clauseFacts[0];
    }

    const factSummary = clauseFacts.slice(0, 4).join(', ') || argument;

    let relationType = 'HAS_ATTRIBUTE';
    if (predicate === 'OUTFIT_PAIRING' && clauseAtoms.garment_pairings?.length) {
      relationType = 'PAIRS_WITH_GARMENT';
    } else if (predicate === 'OUTFIT_PAIRING' || clauseAtoms.temporal_occasions?.length || clauseAtoms.locative_scenes?.length) {
      relationType = 'USED_IN_CONTEXT';
    } else if (predicate === 'VISAGISM_BALANCE') {
      relationType = 'BALANCES_FACE_SHAPE';
    } else if (/\b(?:descartar|evitar|nada\s+de|no\s+le\s+van|no\s+te\s+opriman)\b/.test(lc)) {
      relationType = 'AVOID_FEATURE';
    } else if (predicate === 'OPTICAL_PROTECTION' || /\b(?:para\s+no|gracias\s+a|logra|permite|resguard|aportan|confieren)\b/.test(lc)) {
      relationType = 'CAUSES_BENEFIT';
    }

    return {
      id: `p${idx + 1}`,
      entity: mainEntity,
      predicate,
      argument,
      relationType,
      relationalCards: atoms?.relations || [],
      factSummary,
      clauseAtoms,
      modifiers: {
        shapes: clauseAtoms.shapes.length ? clauseAtoms.shapes : (atoms?.shapes || []),
        styles: clauseAtoms.styles.length ? clauseAtoms.styles : (atoms?.styles || []),
        materials: clauseAtoms.materials.length ? clauseAtoms.materials : (atoms?.materials || []),
        outfits: clauseAtoms.outfits.length ? clauseAtoms.outfits : (atoms?.outfits || [])
      },
      subFrame,
      requiredSlots,
      argCount: Math.max(1, requiredSlots.length),
      expectedCf,
      rawClause: clause
    };
  });
}

function extractCompactAnchor(anchor, atoms = null) {
  let clean = (anchor || 'Gafas de sol').replace(/^#{1,6}\s+/, '').replace(/\*+/g, '').trim();

  // 1. If anchor contains known brand/model entities, return that exact entity
  if (atoms?.brand_models?.length) {
    for (const bm of atoms.brand_models) {
      if (clean.toLowerCase().includes(bm.toLowerCase())) {
        return bm;
      }
    }
  }

  // 2. Colon / dash split: prefer substantive entity side
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const left = parts[0].trim();
    if (left.length > 5 && !/^(?:gu[íi]a|claves|consejos|tips|c[oó]mo|por\s+qu[eé])/i.test(left)) {
      clean = left;
    } else if (parts[1].trim().length > 5) {
      clean = parts[1].trim();
    }
  }

  // 3. Strip rhetorical/procedural wrappers (e.g. "Cómo combinar...", "Guía de...")
  clean = clean.replace(/^(?:¿\s*)?(?:c[oó]mo|por\s+qu[eé]|qu[eé]\s+es|gu[íi]a\s+(?:de|para)|consejos\s+(?:para|de)|claves\s+(?:para|de)|tips\s+(?:para|de)|el\s+arte\s+de|descubre\s+c[oó]mo|aprende\s+a)\s+(?:combinar|elegir|cuidar|llevar|usar|limpiar|comprar|lucir|seleccionar)?\s*(?:a\s+|en\s+|para\s+|de\s+)?/i, '');

  // 4. Strip punctuation and trailing situational adverbials
  clean = clean.replace(/[?¿!]/g, '').trim();
  clean = clean.replace(/\s+(?:en\s+el\s+d[íi]a\s+a\s+d[íi]a|paso\s+a\s+paso|seg[úu]n\s+(?:tu\s+rostro|la\s+forma\s+de\s+tu\s+cara|cada\s+rostro)|para\s+cada\s+ocasi[oó]n|en\s+cualquier\s+momento|de\s+forma\s+sencilla)$/i, '').trim();

  // 5. Build clean Spanish nominal syntagma
  clean = clean.replace(/^un[ao]s?\s+/i, 'las ');
  if (/^(?:las\s+|el\s+|los\s+|la\s+|este\s+|esta\s+|estos\s+|estas\s+)/i.test(clean)) {
    return clean;
  }
  if (/^(?:gafas|monturas|lentes)\b/i.test(clean)) {
    return 'las ' + clean;
  }
  if (/^(?:diseño|silueta|modelo|estilo)\b/i.test(clean)) {
    return 'el ' + clean;
  }

  return clean || 'las gafas de sol';
}

module.exports = {
  extractDavidsonianAtoms,
  classifyParagraph,
  deconstructToDavidsonianTuples,
  extractCompactAnchor
};
