'use strict';

const factualGuard = require('../../text-analysis/factual-entailment-guard.cjs');
const { isShapeCompatible, cleanScrapingArtifacts } = require('../../text-analysis/draft-preprocessor.cjs');
const {
  sanitizeDonorSkeleton,
  extractCleanDonorWindow,
  applySpanishSlotAgreement
} = require('./donor-skeleton-cleaner.cjs');

function fillSlotsInBrick(brick, atoms, contextFrame = 'GENERAL_STYLE', tuple = null, rawPara = '') {
  if (!brick) return '';
  const mergedAtoms = tuple?.clauseAtoms ? {
    brand_models: tuple.clauseAtoms.brand_models?.length ? tuple.clauseAtoms.brand_models : (atoms?.brand_models || []),
    proper_entities: tuple.clauseAtoms.proper_entities?.length ? tuple.clauseAtoms.proper_entities : (atoms?.proper_entities || []),
    shapes: tuple.clauseAtoms.shapes?.length ? tuple.clauseAtoms.shapes : (atoms?.shapes || []),
    styles: tuple.clauseAtoms.styles?.length ? tuple.clauseAtoms.styles : (atoms?.styles || []),
    materials: tuple.clauseAtoms.materials?.length ? tuple.clauseAtoms.materials : (atoms?.materials || []),
    outfits: tuple.clauseAtoms.outfits?.length ? tuple.clauseAtoms.outfits : (atoms?.outfits || []),
    garment_pairings: tuple.clauseAtoms.garment_pairings?.length ? tuple.clauseAtoms.garment_pairings : (atoms?.garment_pairings || []),
    temporal_occasions: tuple.clauseAtoms.temporal_occasions?.length ? tuple.clauseAtoms.temporal_occasions : (atoms?.temporal_occasions || []),
    locative_scenes: tuple.clauseAtoms.locative_scenes?.length ? tuple.clauseAtoms.locative_scenes : (atoms?.locative_scenes || []),
    coatings: tuple.clauseAtoms.coatings?.length ? tuple.clauseAtoms.coatings : (atoms?.coatings || []),
    key_concepts: tuple.clauseAtoms.key_concepts?.length ? tuple.clauseAtoms.key_concepts : (atoms?.key_concepts || []),
    relations: atoms?.relations || tuple.clauseAtoms.relations || []
  } : (atoms || {});

  const selectedWindow = brick._cleanWindow || extractCleanDonorWindow(brick, 60, contextFrame, mergedAtoms, { rawPara, articleMacroStyle: brick._articleMacroStyle });
  let skeleton = selectedWindow || sanitizeDonorSkeleton(
    cleanScrapingArtifacts(brick.syntactic_skeleton || brick.raw_text || brick.text || ''),
    brick.raw_text || brick.text || '',
    contextFrame,
    mergedAtoms,
    rawPara
  );

  if (!selectedWindow && skeleton.split(/\s+/).filter(Boolean).length > 96) {
    const words = skeleton.split(/\s+/).filter(Boolean).slice(0, 86).join(' ');
    skeleton = repairTruncatedTail(words);
  }

  const rawLower = String(rawPara || '').toLowerCase();
  const rejectsLoudColors = /\b(?:descartar|evitar|nada\s+de|no\s+le\s+van)\b[^.]{0,75}\b(?:fluorescentes|estridentes|brillantes|llamativos|artificiales)\b/i.test(rawLower);
  const wantsEarthPalette = /\b(?:carey|tierra|marr[oó]n|marrones|c[aá]lid[oa]s?|neutr[oa]s?|[aá]mbar|ocre)\b/i.test(rawLower);

  const typeUseCount = {};
  const splitMaterials = (mergedAtoms.materials || [])
    .flatMap(m => String(m || '').split(/\s*,\s*/))
    .map(s => s.trim())
    .filter(Boolean);
  let matSlotVal = splitMaterials.length ? splitMaterials[0] : null;
  if (matSlotVal && /^carey$/i.test(matSlotVal.trim()) && /\b(?:algod[oó]n|celulosa|tipo\s+de\s+material|material\s+llamado|l[aá]minas\s+de)\b/i.test(skeleton)) {
    matSlotVal = 'acetato';
  }
  const normalizedMaterials = matSlotVal ? [matSlotVal, ...splitMaterials.slice(1)] : [];
  const atomLists = {
    'SLOT_BRAND': mergedAtoms.brand_models || [],
    'SLOT_MODEL': mergedAtoms.brand_models || [],
    'SLOT_FRAME_SHAPE': mergedAtoms.shapes || [],
    'SLOT_MATERIAL': normalizedMaterials,
    'SLOT_COATING': mergedAtoms.coatings || [],
    'SLOT_AESTHETIC_STYLE': mergedAtoms.styles || [],
    'SLOT_OCCASION_OUTFIT': mergedAtoms.outfits || []
  };

  const allowedBrandsLow = new Set((mergedAtoms.brand_models || []).map(b => String(b).toLowerCase()));
  const isCompatibleRawSlotValue = (slotType, rawVal) => {
    const rv = String(rawVal || '').trim();
    if (!rv || rv.length > 34) return false;
    if (slotType === 'SLOT_BRAND' || slotType === 'SLOT_MODEL') {
      return allowedBrandsLow.has(rv.toLowerCase());
    }
    if (/\b(?:tous|furla|guess|chopard|swarovski|longchamp|oakley|carrera|persol|ray-ban|prada|gucci|chlo[eé]|dior|tom ford|kenzo|lozza|hanukeii)\b/i.test(rv)) {
      return [...allowedBrandsLow].some(b => rv.toLowerCase().includes(b));
    }
    if (slotType === 'SLOT_FRAME_SHAPE') {
      if (!mergedAtoms.shapes?.length) {
        return /\b(?:redondead|cl[aá]sic|fin[oa]s?|liger[oa]s?|minimalist|sencill)\b/i.test(rv);
      }
      return isShapeCompatible(rv, mergedAtoms.shapes);
    }
    if (slotType === 'SLOT_MATERIAL' && mergedAtoms.materials?.length) {
      const reqMatStr = mergedAtoms.materials.join(' ').toLowerCase();
      const reqAcetate = /\b(?:acetato|pasta|celulosa)\b/.test(reqMatStr) && !/\b(?:metal|titanio|acero|bronce|oro)\b/.test(reqMatStr);
      const reqMetal = /\b(?:metal|titanio|acero|bronce|oro)\b/.test(reqMatStr) && !/\b(?:acetato|pasta|celulosa)\b/.test(reqMatStr);
      if (reqAcetate && /\b(?:metal|met[aá]lic|titanio|acero)\b/i.test(rv)) return false;
      if (reqMetal && /\b(?:acetato|pasta)\b/i.test(rv)) return false;
    }
    if (slotType === 'SLOT_COATING' && !(mergedAtoms.coatings?.length)) {
      if (/\b(?:graduad|antireflejant|polarizad|espejad|fotocrom|blue\s*block)\b/i.test(rv)) return false;
    }
    if (slotType === 'SLOT_COLOR' && (rejectsLoudColors || wantsEarthPalette)) {
      if (/\b(?:ne[oó]n|fosforit|fl[uú]or|fucsia|estridente|llamativ|amarill|violeta|lila|naranja|rosa|turquesa)\b/i.test(rv)) return false;
    }
    if (slotType === 'SLOT_COLOR' && (contextFrame === 'PRODUCT_FACTUAL' || (mergedAtoms.brand_models && mergedAtoms.brand_models.length > 0))) {
      if (/\b(?:carey|havana|habana)\b/i.test(rv) && !/\b(?:carey|havana|habana)\b/i.test(rawLower)) {
        return false;
      }
    }
    if (slotType === 'SLOT_MEASURE' && /\b\d+\s*mm\b|\bcalibre\b/i.test(rv) && !/\b(?:calibre|talla|mm|medida)\b/i.test(rawLower)) {
      return false;
    }
    return true;
  };

  const neutralDefaults = {
    SLOT_BRAND: 'la firma',
    SLOT_MODEL: 'este modelo',
    SLOT_FRAME_SHAPE: 'silueta equilibrada',
    SLOT_MATERIAL: 'acetato seleccionado',
    SLOT_COMPONENT: 'montura',
    SLOT_COATING: 'de sol',
    SLOT_AESTHETIC_STYLE: 'atemporal',
    SLOT_OCCASION_OUTFIT: 'cualquier ocasión',
    SLOT_PROPERTY: 'ligereza',
    SLOT_TECHNIQUE: 'acabado artesanal',
    SLOT_FACIAL_FEATURE: 'rostro',
    SLOT_COLOR: 'tono equilibrado',
    SLOT_MEASURE: 'protección solar'
  };

  const neutralUseCount = {};
  const resolveNeutralForSlot = (slotType, preceding) => {
    const nCount = neutralUseCount[slotType] || 0;
    neutralUseCount[slotType] = nCount + 1;
    let val = neutralDefaults[slotType] || 'diseño';
    if (slotType === 'SLOT_MATERIAL') {
      val = nCount % 2 === 0 ? 'pasta seleccionada' : 'acabado artesanal';
    } else if (slotType === 'SLOT_COATING' && /\bde\s+sol\s*$/i.test(preceding)) {
      val = 'con filtro solar';
    } else if (slotType === 'SLOT_COLOR') {
      val = /\b(?:en|de|con|por|un)\s*$/i.test(preceding) ? 'tono equilibrado' : 'en tono equilibrado';
    } else if (slotType === 'SLOT_FRAME_SHAPE') {
      if (/\b(?:formas|l[ií]neas|siluetas)\s*$/i.test(preceding)) {
        val = 'clásicas';
      } else if (/\b(?:estilo|corte|tipo|formato)\s*$/i.test(preceding)) {
        val = 'clásico';
      } else if (/\b(?:ligeramente|algo|bastante|muy|tan|m[aá]s|menos)\s*$/i.test(preceding)) {
        val = 'estilizadas';
      } else if (nCount >= 1) {
        val = 'de líneas suaves';
      } else {
        val = /\b(?:de|con|por|en|su|la|una)\s*$/i.test(preceding) ? 'silueta equilibrada' : 'de silueta equilibrada';
      }
    }
    return applySpanishSlotAgreement(slotType, val, preceding, mergedAtoms);
  };

  const styleSynonyms = {
    'vintage': ['retro', 'atemporal', 'clásico'],
    'retro': ['vintage', 'atemporal', 'clásico'],
    'boho chic': ['bohemio', 'setentero', 'hippie'],
    'bohemio': ['boho chic', 'artesanal', 'hippie'],
    'bohemia': ['boho chic', 'artesanal', 'retro'],
    'hippie': ['bohemio', 'setentero', 'retro'],
    'artesanal': ['cuidado', 'atemporal', 'clásico'],
    'atemporal': ['clásico', 'versátil', 'retro']
  };
  const resolveDeduplicatedStyle = (rawStyle, fullSkeletonSoFar, prec) => {
    if (!rawStyle) return rawStyle;
    const curSentBefore = (prec || '').split(/[.!?]\s+/).pop() || '';
    const hasSecondStyleInSent = /\[SLOT_AESTHETIC_STYLE\]/i.test((fullSkeletonSoFar.slice(fullSkeletonSoFar.indexOf('[SLOT_AESTHETIC_STYLE]') + 22).split(/[.!?]/)[0] || ''));
    if (/\ben\s+tendencia\s+y\s*$/i.test(prec || '') && hasSecondStyleInSent) {
      return /\b(?:prendas|líneas|siluetas|gafas|monturas|piezas|opciones)\b/i.test(curSentBefore) && !/\b(?:looks|estilismos|conjuntos)\b/i.test(curSentBefore)
        ? 'actuales'
        : 'desenfadados';
    }
    const stLow = String(rawStyle).trim().toLowerCase();
    const tailBefore = fullSkeletonSoFar.slice(0, fullSkeletonSoFar.indexOf('[SLOT_AESTHETIC_STYLE]')).toLowerCase();
    const sameSentDup = curSentBefore.toLowerCase().includes(stLow);
    if (sameSentDup) {
      const alts = styleSynonyms[stLow] || [];
      const unused = alts.find(a => !tailBefore.includes(a));
      if (unused) return unused;
    }
    return rawStyle;
  };

  let usedGarmentPairingInSlot = false;
  const resolveRelationalOutfitCandidate = (defaultVal, prec) => {
    if (/\beste\s*$/i.test(prec || '') && mergedAtoms.temporal_occasions?.length) {
      return mergedAtoms.temporal_occasions.find(t => /^(?:verano|oto[ñn]o|invierno|d[ií]a)$/i.test(t)) || defaultVal;
    }
    if (/\b(?:con|junto\s+a|combinar(?:las|los)?\s+con)\s*$/i.test(prec || '') && mergedAtoms.garment_pairings?.length) {
      usedGarmentPairingInSlot = true;
      return mergedAtoms.garment_pairings[0];
    }
    return defaultVal;
  };

  const extractSlotFollowingClause = (text, startPos) => {
    const rawTail = text.slice(startPos, startPos + 90);
    const cutIdx = rawTail.search(/[.!?]/);
    return cutIdx >= 0 ? rawTail.slice(0, cutIdx) : rawTail;
  };

  const getScopedSlotList = (slotName, preceding, following = '') => {
    const baseList = atomLists[slotName] || [];
    const sp = mergedAtoms.signedPolarity;
    if (!sp) return baseList;
    const slotScope = factualGuard.detectDonorSlotPolarity(preceding, following);
    if (slotName === 'SLOT_OCCASION_OUTFIT') {
      if (slotScope === 'NEGATIVE') {
        return sp.negativeContexts || [];
      }
      const negOnly = new Set((sp.negativeContexts || []).filter(c => !(sp.positiveContexts || []).includes(c)));
      return baseList.filter(v => !negOnly.has(String(v || '').toLowerCase()));
    }
    if (slotName === 'SLOT_MATERIAL') {
      if (slotScope === 'NEGATIVE') {
        return sp.negativeMaterials || [];
      }
      const negMatOnly = new Set((sp.negativeMaterials || []).filter(m => !(sp.positiveMaterials || []).includes(m)));
      return baseList.filter(v => !negMatOnly.has(String(v || '').toLowerCase()));
    }
    return baseList;
  };

  const usedMaterialFamilies = new Set();
  const getMaterialFamilyTag = (val) => {
    const low = String(val || '').trim().toLowerCase();
    if (/^(?:acetato|pasta|celulosa|ecoacetato|propionato)\b/i.test(low)) return 'ACETATE_CELLULOSE';
    if (/^(?:metal|met[aá]lic|acero|titanio|aluminio|bronce|oro)\b/i.test(low)) return 'METAL_ALLOY';
    if (/^(?:madera|bamb[uú]|cuerno|asta)\b/i.test(low)) return 'NATURAL_ORGANIC';
    return low;
  };
  const isRxSolarMismatch = (slotType, candidateVal, precText, rawSlotVal = '') => {
    if (slotType !== 'SLOT_COATING') return false;
    const isRxDesignVal = /\b(?:ocupacional(?:es)?|progresiv[oa]s?|monofocal(?:es)?|bifocal(?:es)?)\b/i.test(String(candidateVal || ''));
    if (!isRxDesignVal) return false;
    return /\bgafas\s+de\s+sol\s*$/i.test(precText || '') ||
      /\bcristales\s+solares\s*$/i.test(precText || '') ||
      /\b(?:polarizad|fotocrom|espejad|degradad|uv\s*400)\b/i.test(String(rawSlotVal || ''));
  };

  if (brick.slots && brick.slots.length) {
    for (const slot of brick.slots) {
      const slotTag = `[${slot.slot_type}]`;
      if (!skeleton.includes(slotTag)) continue;

      // Guard against false-positive slot tagging of "al aire libre"
      if (slot.slot_type === 'SLOT_FRAME_SHAPE' && slot.raw_value === 'al aire') {
        const escapedTag = slotTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`${escapedTag}\\s+libre\\b`, 'i').test(skeleton)) {
          skeleton = skeleton.replace(slotTag, slot.raw_value);
          continue;
        }
      }

      const idx = skeleton.indexOf(slotTag);
      const preceding = skeleton.slice(Math.max(0, idx - 65), idx);
      const following = extractSlotFollowingClause(skeleton, idx + slotTag.length);

      // Preserve fixed idiom "alma metálica" rather than overwriting internal metal wire with frame material
      if (slot.slot_type === 'SLOT_MATERIAL' && /\balma\s*$/i.test(preceding)) {
        skeleton = skeleton.replace(slotTag, 'metálica');
        usedMaterialFamilies.add('METAL_ALLOY');
        continue;
      }

      const slotScope = factualGuard.detectDonorSlotPolarity(preceding, following);
      const slotList = getScopedSlotList(slot.slot_type, preceding, following);
      const useIdx = typeUseCount[slot.slot_type] || 0;

      let chosenCandidate = slotList[useIdx] || null;
      if (chosenCandidate && slot.slot_type === 'SLOT_MATERIAL') {
        const candFam = getMaterialFamilyTag(chosenCandidate);
        if (usedMaterialFamilies.has(candFam)) {
          const altMat = slotList.slice(useIdx + 1).find(m => !usedMaterialFamilies.has(getMaterialFamilyTag(m)));
          chosenCandidate = altMat || null;
        }
      }

      if (chosenCandidate) {
        if (isRxSolarMismatch(slot.slot_type, chosenCandidate, preceding, slot.raw_value)) {
          const cleanOrig = String(slot.raw_value || '').trim();
          const safePreserved = (cleanOrig && !/\b(?:tous|furla|guess|ray-ban|oakley|persol|gucci|prada|chlo[eé])\b/i.test(cleanOrig))
            ? cleanOrig
            : 'de sol';
          skeleton = skeleton.replace(slotTag, safePreserved);
          continue;
        }
        let chosenBase = chosenCandidate;
        if (slot.slot_type === 'SLOT_AESTHETIC_STYLE') {
          chosenBase = resolveDeduplicatedStyle(chosenBase, skeleton, preceding);
        } else if (slot.slot_type === 'SLOT_OCCASION_OUTFIT') {
          chosenBase = resolveRelationalOutfitCandidate(chosenBase, preceding);
        }
        const replacementVal = applySpanishSlotAgreement(
          slot.slot_type,
          chosenBase,
          preceding,
          mergedAtoms
        );
        skeleton = skeleton.replace(slotTag, replacementVal);
        if (slot.slot_type === 'SLOT_MATERIAL') {
          usedMaterialFamilies.add(getMaterialFamilyTag(replacementVal));
        }
        if (chosenBase === slotList[useIdx]) {
          typeUseCount[slot.slot_type] = useIdx + 1;
        }
      } else {
        let rep = null;
        const avoidDuplicateCarey = slot.slot_type === 'SLOT_COLOR' && /\bcarey\b/i.test(preceding) && /\bcarey\b/i.test(String(slot.raw_value || ''));
        const rawLow = String(slot.raw_value || '').toLowerCase();
        const violatesSignedScope = slot.slot_type === 'SLOT_OCCASION_OUTFIT' && slotScope === 'NEGATIVE' &&
          (mergedAtoms.signedPolarity?.positiveContexts || []).some(pc => !((mergedAtoms.signedPolarity?.negativeContexts || []).includes(pc)) && rawLow.includes(pc));
        const dupMatFamily = slot.slot_type === 'SLOT_MATERIAL' && usedMaterialFamilies.has(getMaterialFamilyTag(slot.raw_value));
        if (!avoidDuplicateCarey && !violatesSignedScope && !dupMatFamily && isCompatibleRawSlotValue(slot.slot_type, slot.raw_value)) {
          let naturalRaw = String(slot.raw_value).trim();
          if (/\bde\s*$/i.test(preceding) && /^de\s+/i.test(naturalRaw)) {
            naturalRaw = naturalRaw.replace(/^de\s+/i, '');
          }
          if (slot.slot_type === 'SLOT_AESTHETIC_STYLE') {
            naturalRaw = resolveDeduplicatedStyle(naturalRaw, skeleton, preceding);
          } else if (slot.slot_type === 'SLOT_OCCASION_OUTFIT') {
            naturalRaw = resolveRelationalOutfitCandidate(naturalRaw, preceding);
          }
          rep = applySpanishSlotAgreement(slot.slot_type, naturalRaw, preceding, mergedAtoms);
        } else if (slotScope === 'NEGATIVE' && slot.slot_type === 'SLOT_OCCASION_OUTFIT') {
          rep = (mergedAtoms.signedPolarity?.negativeContexts || [])[0] || 'usos inadecuados';
        } else if (slot.slot_type === 'SLOT_MATERIAL' && usedMaterialFamilies.size > 0) {
          rep = 'acabado artesanal';
        } else {
          rep = resolveNeutralForSlot(slot.slot_type, preceding);
        }
        if (slot.slot_type === 'SLOT_MATERIAL') {
          usedMaterialFamilies.add(getMaterialFamilyTag(rep));
        }
        skeleton = skeleton.replace(slotTag, rep);
      }
    }
  }

  // Replace any remaining unmapped slot markers safely with context-aware neutral defaults
  skeleton = skeleton.replace(/\[(SLOT_[A-Z_]+)\]/g, (full, slotName, offset) => {
    const preceding = skeleton.slice(Math.max(0, offset - 65), offset);
    const following = extractSlotFollowingClause(skeleton, offset + full.length);
    if (slotName === 'SLOT_MATERIAL' && /\balma\s*$/i.test(preceding)) {
      usedMaterialFamilies.add('METAL_ALLOY');
      return 'metálica';
    }
    const slotScope = factualGuard.detectDonorSlotPolarity(preceding, following);
    const slotList = getScopedSlotList(slotName, preceding, following);
    const useIdx = typeUseCount[slotName] || 0;
    let chosenCandidate = slotList[useIdx] || null;
    if (chosenCandidate && slotName === 'SLOT_MATERIAL') {
      const candFam = getMaterialFamilyTag(chosenCandidate);
      if (usedMaterialFamilies.has(candFam)) {
        chosenCandidate = slotList.slice(useIdx + 1).find(m => !usedMaterialFamilies.has(getMaterialFamilyTag(m))) || null;
      }
    }
    if (chosenCandidate) {
      if (isRxSolarMismatch(slotName, chosenCandidate, preceding)) {
        return 'de sol';
      }
      let chosenBase = chosenCandidate;
      if (slotName === 'SLOT_AESTHETIC_STYLE') {
        chosenBase = resolveDeduplicatedStyle(chosenBase, skeleton, preceding);
      } else if (slotName === 'SLOT_OCCASION_OUTFIT') {
        chosenBase = resolveRelationalOutfitCandidate(chosenBase, preceding);
      }
      if (chosenBase === slotList[useIdx]) {
        typeUseCount[slotName] = useIdx + 1;
      }
      const applied = applySpanishSlotAgreement(slotName, chosenBase, preceding, mergedAtoms);
      if (slotName === 'SLOT_MATERIAL') {
        usedMaterialFamilies.add(getMaterialFamilyTag(applied));
      }
      return applied;
    }
    if (slotScope === 'NEGATIVE' && slotName === 'SLOT_OCCASION_OUTFIT') {
      return (mergedAtoms.signedPolarity?.negativeContexts || [])[0] || 'usos inadecuados';
    }
    if (slotName === 'SLOT_MATERIAL' && usedMaterialFamilies.size > 0) {
      return 'acabado artesanal';
    }
    return resolveNeutralForSlot(slotName, preceding);
  });

  // Reparación morfosintáctica general en español tras sustitución de ranuras
  skeleton = skeleton
    .replace(/\b([a-záéíóúüñ]{2,})\s+\1\b/gi, '$1')
    .replace(/\b(de|en|con|por|para|a)\s+\1\b/gi, '$1')
    .replace(/\ba\s+el\b/g, 'al')
    .replace(/\bA\s+el\b/g, 'Al')
    .replace(/\bde\s+el\b/g, 'del')
    .replace(/\bDe\s+el\b/g, 'Del')
    .replace(/\btanto\s+en\s+([a-záéíóúüñ]+)\s+o\s+/gi, 'ya sea en $1 o ')
    .replace(/\b([a-záéíóúüñ]{4,}(?:ciones|siones|dades|tades|tudes|umbres))\s+(m[aá]s\s+[a-záéíóúüñ]+as\s+y\s+[a-záéíóúüñ]{4,}?)os\b/gi, '$1 $2as')
    .replace(/\b(los|unos|estos|esos)\s+([a-záéíóúüñ]{4,}(?:ciones|siones|dades|tades|tudes|umbres))\b/gi, (_, det, noun) => {
      const femMap = { los: 'las', unos: 'unas', estos: 'estas', esos: 'esas' };
      return `${femMap[det.toLowerCase()] || det} ${noun}`;
    })
    .replace(/\b(los|unos|estos|esos)\s+monturas?\b/gi, 'las monturas')
    .replace(/\b(las|unas|estas|esas)\s+montura\b/gi, '$1 monturas')
    .replace(/\b(el|un|este|ese)\s+montura\b/gi, 'la montura')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/([¿¡])\s+/g, '$1')
    .trim();

  skeleton = cleanScrapingArtifacts(skeleton);
  skeleton = sanitizeDonorSkeleton(skeleton, brick.raw_text || '', contextFrame, mergedAtoms, rawPara);
  skeleton = skeleton.replace(/\b(?:gafas\s+de\s+sol\s+)?((?:Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley)\s+[A-Z0-9\s]{3,28}?)\s+(?:mujer|hombre)\b/gi, 'gafas de sol $1');

  if (skeleton.length > 0) {
    skeleton = skeleton.charAt(0).toUpperCase() + skeleton.slice(1);
    if (!/[.!?:]$/.test(skeleton)) skeleton += '.';
  }

  return skeleton;
}

function stripLeadingAnchorEcho(text, anchor, rawPara, fullAnchor = null) {
  let out = (text || '').trim();
  if (!out) return out;
  const rawLower = (rawPara || '').trim().toLowerCase();

  // Strip procedural heading starts echoed by Qwen (e.g., "Como combinamos las gafas de aviador en el día a día, ...")
  out = out.replace(/^(?:¿\s*)?(?:c[oó]mo\s+(?:combinar|combinamos|elegir|elegimos|cuidar|cuidamos|llevar|llevamos))\s+[^,.:;]+[,.:;]\s*/i, '');

  const candidates = [anchor, fullAnchor].filter(Boolean).map(a => a.trim());
  for (const cleanAnchor of candidates) {
    const anchorLower = cleanAnchor.toLowerCase();
    if (out.toLowerCase().startsWith(anchorLower) && !rawLower.startsWith(anchorLower)) {
      const rest = out.slice(cleanAnchor.length).replace(/^[\s:,\-–—]+/, '').trim();
      if (rest.length >= 20) {
        out = rest;
        break;
      }
    }
  }
  return out;
}

function enforceBrandSku(text, atoms) {
  let out = (text || '').trim();
  if (!out || !atoms?.brand_models?.length) return out;

  const fullSku = atoms.brand_models[0].trim();
  const parts = fullSku.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return out;

  const brandName = parts[0];
  const modelCode = parts[1];
  const fullEscaped = fullSku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const codePrefix = modelCode.slice(0, Math.min(5, modelCode.length)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(fullEscaped, 'i').test(out)) {
    if (codePrefix.length >= 4) {
      out = out.replace(new RegExp(`(${fullEscaped})\\s+${codePrefix}[A-Za-z0-9]*\\b`, 'gi'), '$1');
    }
    return out;
  }

  // If modelCode is missing, upgrade first brandName mention to fullSku
  const codeEscaped = modelCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`\\b${codeEscaped}\\b`, 'i').test(out)) {
    const brandEscaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const brandRx = new RegExp(`\\b${brandEscaped}\\b`, 'i');
    if (brandRx.test(out)) {
      out = out.replace(brandRx, fullSku);
    }
  } else {
    // Model code exists, ensure full SKU tokens appear cleanly
    const codeRx = new RegExp(`\\b${codeEscaped}(?:\\s+\\d{2,4})*`, 'i');
    if (!new RegExp(fullEscaped, 'i').test(out) && codeRx.test(out)) {
      out = out.replace(codeRx, parts.slice(1).join(' '));
    }
  }
  return out;
}

function buildDonorGraftedDraft({ skeletonPieces = [], tuples = [], atoms = {}, extractedFacts = '', frame = 'GENERAL_STYLE', centering = {}, endsWithColon = false }) {
  const cleanPieces = (skeletonPieces || [])
    .map(p => (p || '').trim())
    .filter(Boolean);

  // Fallback atomic stem if corpus yields 0 usable pieces (never falls back to rawPara)
  if (!cleanPieces.length) {
    const baseStyle = atoms?.styles?.[0] ? `de estilo ${atoms.styles[0]}` : 'de corte editorial';
    cleanPieces.push(`Estas gafas de sol ${baseStyle} equilibran carácter y comodidad visual en el uso diario.`);
  }

  // Special curatorial colon transitions: preserve clean human donor sentences directly closed with ':'
  if (frame === 'TRANSITION_CURATION' || endsWithColon) {
    const donorSents = cleanPieces[0]
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 2);
    let leadText = donorSents.join(' ')
      .replace(/\b(aires|toques|matices|cortes|estilos|dise[ñn]os|modelos)\s+(?!(?:retro|boho|vintage|classic|chic|extra)\b)([a-záéíóúüñ]{4,}[oa])\b/gi, '$1 $2s')
      .replace(/\b(aires|toques|matices|cortes|estilos|dise[ñn]os|modelos)\s+([a-záéíóúüñ]{4,}(?:al|ar|il))\b/gi, '$1 $2es')
      .replace(/[:.!?]+$/, '')
      .trim();
    return `${leadText}:`.replace(/\s{2,}/g, ' ').trim();
  }

  // Deduplicate identical sentences across selected donor pieces and assemble strictly from pre-2022 skeletons
  const uniqueSents = [];
  const seenSentStem = new Set();
  for (const piece of cleanPieces) {
    const sents = piece.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    for (const s of sents) {
      const stem = s.toLowerCase().slice(0, 36);
      if (!seenSentStem.has(stem)) {
        seenSentStem.add(stem);
        uniqueSents.push(s);
      }
    }
  }

  let draft = uniqueSents.join(' ').replace(/\s{2,}/g, ' ').trim();

  // Ensure SKU / Brand presence cleanly inside donor syntax (never breaking category idioms like "en el terreno de las gafas de sol")
  if (atoms?.brand_models?.length) {
    const fullSku = atoms.brand_models[0].trim();
    const brandHead = fullSku.split(/\s+/)[0].toLowerCase();
    if (!draft.toLowerCase().includes(brandHead)) {
      const unsafeCategoryCtxRx = /(?:terreno|mundo|mercado|sector|[aá]mbito|universo|categor[ií]a|industria|historia)\s+de\s+$|(?:accesorio|complemento|aliado)\s+[a-záéíóúñ]+\s+son\s+$/i;
      let injected = false;

      if (/^Est[aá]\s+(?:fabricad|elaborad|hech|diseñad)[oa]\s+en\b/i.test(draft)) {
        draft = draft.replace(/^Est[aá]\s+([a-záéíóúüñ]+)\s+en\b/i, `El modelo ${fullSku} está $1 en`);
        injected = true;
      } else {
        draft = draft.replace(/\b(?:estas|las|unas)\s+gafas(?:\s+de\s+sol)?(?!\s+de\s+(?:acetato|metal|pasta|titanio))\b/gi, (match, offset, fullStr) => {
          if (injected) return match;
          const bef = fullStr.slice(Math.max(0, offset - 45), offset);
          if (unsafeCategoryCtxRx.test(bef)) return match;
          injected = true;
          return `las ${fullSku}`;
        });
      }

      if (!injected) {
        if (/\blas\s+(?:gafas|monturas)\s+retro\b/i.test(draft)) {
          draft = draft.replace(/\blas\s+(?:gafas|monturas)\s+retro\b/i, `propuestas retro como las ${fullSku}`);
        } else if (/\b(?:esta|la|una)\s+montura\b/i.test(draft)) {
          draft = draft.replace(/\b(?:esta|la|una)\s+montura\b/i, `el modelo ${fullSku}`);
        } else if (/\b(?:este|el)\s+modelo\b/i.test(draft)) {
          draft = draft.replace(/\b(?:este|el)\s+modelo\b/i, `el diseño ${fullSku}`);
        } else {
          draft = `En el caso de las ${fullSku}, ${draft.charAt(0).toLowerCase()}${draft.slice(1)}`;
        }
      }
    }
    if (new RegExp(`\\blas\\s+${fullSku.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`, 'i').test(draft)) {
      draft = draft.replace(/\.\s*Está fabricado en\b/gi, '. Este diseño está fabricado en');
    }
    draft = enforceBrandSku(draft, atoms);
  } else if (/^Está fabricado en\b/i.test(draft)) {
    draft = draft.replace(/^Está fabricado en\b/i, 'Esta montura está fabricada en');
  }

  // Centering Pro-Drop Healing if sentence starts directly with conjugated verb (only eyewear frames)
  const isSpecialtySubFrame = frame === 'AUDIOLOGY' || frame === 'CLINICAL_OPHTHALMOLOGY';
  const healCheck = isSpecialtySubFrame
    ? { healed: false, text: draft }
    : healProDropSubject(draft, centering?.cb || atoms?.brand_models?.[0] || 'estas gafas de sol', atoms);
  if (healCheck.healed) {
    draft = healCheck.text;
  }

  // Strip orphaned inter-sentence causal connector at paragraph start
  draft = draft.replace(/^(?:Es\s+por\s+(?:eso|ello)\s+que)\s+/i, '');
  if (draft.length > 0) {
    draft = draft.charAt(0).toUpperCase() + draft.slice(1);
  }

  // No artificial discourse hinges or hardcoded synthetic sentences — preserve pure pre-2022 human paragraph voice

  draft = draft
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

  if (draft.length > 0) {
    draft = draft.charAt(0).toUpperCase() + draft.slice(1);
    if (!/[.!?:]$/.test(draft)) draft += '.';
  }

  return draft;
}

function healProDropSubject(text, entityName, atoms = null) {
  let out = (text || '').trim();
  if (!out) return { text: out, healed: false };

  // Exclude clefts, discourse connectors, impersonal expressions, and sentences already holding an explicit subject
  if (/^(?:es\s+(?:por\s+eso|por\s+ello|ah[ií]|entonces|precisamente|decir|m[aá]s|que|cierto|verdad|f[aá]cil|dif[ií]cil|importante|fundamental|posible|habitual|normal|com[uú]n|frecuente|mejor|clave|recomendable|aconsejable|en\b|un\b|una\b|el\b|la\b)|resulta\s+|cabe\s+|hay\s+|se\s+trata\b)/i.test(out)) {
    return { text: out, healed: false };
  }
  const firstSent = out.split(/(?<=[.!?])\s+/)[0] || out;
  if (/\b(?:modelo|diseño|gafa|gafas|montura|monturas|silueta|lentes|cristales|acetato|metal|ray-ban|persol|chlo[eé]|gucci|prada|oakley)\b/i.test(firstSent)) {
    return { text: out, healed: false };
  }

  const brandSku = atoms?.brand_models?.[0] ? atoms.brand_models[0].trim() : '';
  const entity = brandSku || entityName || 'estas gafas de sol';
  const cleanEntity = entity.replace(/^las\s+/i, '').trim();
  const pluralVerbs = /^(son|resultan|tienen|destacan|ofrecen|permiten|aportan|cuentan|recuerdan|combinan|lucen|evocan)\b/i;
  const singularVerbs = /^(es|resulta|tiene|destaca|ofrece|permite|aporta|cuenta|recuerda|combina|luce|evoca)\b/i;

  if (pluralVerbs.test(out)) {
    let subject;
    if (brandSku) {
      subject = `Las ${brandSku.replace(/^las\s+/i, '').trim()}`;
    } else if (/^(?:las\s+|estas\s+)?(?:gafas|monturas)/i.test(cleanEntity)) {
      subject = /^las\b/i.test(entity) ? entity : `Las ${cleanEntity}`;
    } else {
      subject = 'Estas gafas de sol';
    }
    return {
      text: `${subject} ${out.charAt(0).toLowerCase()}${out.slice(1)}`,
      healed: true
    };
  }
  if (singularVerbs.test(out)) {
    const subject = brandSku ? `Este modelo ${brandSku.replace(/^las\s+/i, '').trim()}` : 'Esta montura';
    return {
      text: `${subject} ${out.charAt(0).toLowerCase()}${out.slice(1)}`,
      healed: true
    };
  }
  return { text: out, healed: false };
}

function repairTruncatedTail(text, atoms = null, minWords = 35) {
  const clean = (text || '').trim();
  if (!clean) return { text: clean, repaired: false };

  const truncTailWordRx = /(?<=^|[\s,;:¡¿"«(])(sobre|bajo|tras|ante|contra|desde|entre|hacia|hasta|mediante|según|sin|durante|el|la|los|las|un|una|unos|unas|de|del|al|con|en|por|para|que|y|o|u|e|ni|pero|aunque|sino|ya|su|sus|como|cuando|donde|mientras|porque|pues|aporta|aportan|combina|combinando|ofrece|ofrecen|destaca|destacan)\.?$/i;
  const hasOpenUnclosed = /[¡¿][^!?]*$/.test(clean);
  const missingEndPunct = !/[.!?:]$/.test(clean);
  const endsDanglingWord = truncTailWordRx.test(clean);

  if (!hasOpenUnclosed && !missingEndPunct && !endsDanglingWord) {
    return { text: clean, repaired: false };
  }

  const completeSents = clean.match(/[^.!?]+[.!?]+/g) || [];
  if (completeSents.length >= 1) {
    let keptSents = [...completeSents];
    // If the last punctuated sentence itself ends on a dangling preposition, drop it too
    if (keptSents.length >= 2 && truncTailWordRx.test(keptSents[keptSents.length - 1].trim())) {
      keptSents.pop();
    }
    const prevText = keptSents.map(s => s.trim()).join(' ').trim();
    const prevWords = prevText.split(/\s+/).filter(Boolean).length;
    const skuHead = atoms?.brand_models?.[0]?.split(/\s+/)[0]?.toLowerCase() || '';
    const keepsSku = !skuHead || prevText.toLowerCase().includes(skuHead);

    if (prevWords >= minWords && keepsSku) {
      return { text: prevText, repaired: true };
    }
  }

  return { text: clean, repaired: false };
}

module.exports = {
  fillSlotsInBrick,
  stripLeadingAnchorEcho,
  enforceBrandSku,
  buildDonorGraftedDraft,
  healProDropSubject,
  repairTruncatedTail
};
