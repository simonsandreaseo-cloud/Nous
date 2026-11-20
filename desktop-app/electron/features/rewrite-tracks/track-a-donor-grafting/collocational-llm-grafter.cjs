'use strict';

const ollamaClient = require('../../local-llm-ollama/ollama-local-client.cjs');
const grammaticalSurgery = require('../../anti-plagiarism-and-quality/central-morphosyntactic-surgery.cjs');
const { extractCompactAnchor } = require('../../text-analysis/davidsonian-atom-extractor.cjs');
const { tokenize, computeNGramOverlapRatio } = require('../../text-analysis/draft-preprocessor.cjs');
const { isCompetingBrand } = require('./donor-skeleton-cleaner.cjs');
const { stripLeadingAnchorEcho, enforceBrandSku, repairTruncatedTail } = require('./donor-slot-filler.cjs');

async function atomizeWithQwen(rawPara, deterministicAtoms, frame, currentAnchor, modelName, log, qwenStats) {
  const compactAnchor = extractCompactAnchor(currentAnchor);
  const prompt = `Extrae de 2 a 3 hechos concretos del siguiente texto en oraciones cortas y simples (entidades, modelos exactos, formas, materiales o usos).
REGLAS: No uses numeración, listas, Markdown (**), ni formato "Clave: Valor".
TEMA: ${compactAnchor || 'Gafas de sol'}
TEXTO: "${rawPara}"
ORACIONES FÁCTICAS:`;

  const res = await ollamaClient.generate(modelName, prompt, {
    system: 'Eres un extractor de proposiciones fácticas en español. Respondes únicamente con 2 o 3 oraciones cortas y directas, sin etiquetas ni Markdown.',
    temperature: 0.1,
    num_predict: 80,
    cleanPlainText: false
  });

  qwenStats.calls += 1;
  qwenStats.totalDurationMs += res.durationMs;
  qwenStats.totalTokens += res.eval_count || 0;

  // Strip markdown and leading enumeration / Key: Value prefixes
  const cleanedLines = (res.response || '')
    .split(/\r?\n/)
    .map(l => l
      .replace(/[*_`#]+/g, '')
      .replace(/^\s*(?:\d+[.)]\s*|[-•]\s*)/, '')
      .replace(/^(?:Modelo|Marco|Estilo|Tendencia|Propuesta|Adecuación|Complemento(?:\s+ideal)?|Tipo(?:\s+de\s+montura)?|Uso|Material|Forma|Hecho)\s*:\s*/i, '')
      .trim()
    )
    .filter(l => l.length >= 6 && !/^(?:TransitionCuration|PRODUCT_FACTUAL|GENERAL_STYLE)$/i.test(l));
  const cleanedFacts = cleanedLines.join(' ');

  log(`[QWEN_FASE_1_ATOMIZACION] Modelo: ${res.model} | Temp: 0.1 | Latencia: ${res.durationMs}ms | Tokens: ${res.eval_count}`);
  if (cleanedLines.length) {
    for (const rl of cleanedLines) {
      log(`[QWEN_FASE_1_RESULTADO] ${rl}`);
    }
  } else {
    log(`[QWEN_FASE_1_RESULTADO] (respuesta vacía)`);
  }

  return {
    model: res.model,
    durationMs: res.durationMs,
    evalCount: res.eval_count || 0,
    prompt,
    rawResponse: cleanedFacts
  };
}

function cleanQwenResponse(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim();
  // Strip markdown code fences
  text = text.replace(/^```(?:[a-z]*\r?\n)?/i, '').replace(/\r?\n```\s*$/i, '').trim();
  // Strip conversational greetings / chatter
  text = text.replace(/^(?:¡?hola!?\s*[^.!?\n]*[.!?\n]+\s*)/i, '');
  text = text.replace(/^(?:aquí (?:tienes|está|va)[^.!?:\n]*[:.!?\n]+\s*)/i, '');
  text = text.replace(/^(?:por supuesto[,:]?\s*[^.!?\n]*[.!?\n]+\s*)/i, '');
  text = text.replace(/^(?:claro[,:]?\s*[^.!?\n]*[.!?\n]+\s*)/i, '');
  text = text.replace(/^(?:borrador (?:revisado|final|pulido)[^.!?:\n]*[:.!?\n]+\s*)/i, '');
  text = text.replace(/^(?:párrafo (?:revisado|final|pulido)[^.!?:\n]*[:.!?\n]+\s*)/i, '');
  // Strip surrounding quotes
  if (text.startsWith('"') && text.endsWith('"') && text.length > 2) {
    text = text.slice(1, -1).trim();
  }
  if (text.startsWith('«') && text.endsWith('»') && text.length > 2) {
    text = text.slice(1, -1).trim();
  }
  // Strip trailing conversational sign-offs
  text = text.replace(/\s*(?:¡?espero que (?:disfrutes|te sirva|te sea útil|te guste)[^.!?\n]*[.!?:)]*)\s*$/i, '');
  text = text.replace(/\s*(?:¡?un saludo!?\s*)$/i, '');
  // Clean remaining markdown bold/italic
  text = text.split(/\r?\n/).map(l => l.replace(/[*_`#]+/g, '').trim()).filter(Boolean).join(' ').trim();
  return text;
}

async function compileCollocationalWithQwen({
  graftedDonorDraft,
  endsWithColon = false,
  atoms,
  centering,
  currentAnchor,
  frame,
  modelName,
  log,
  qwenStats,
  attempt = 1,
  temperature = 0.10,
  feedback = null
}) {
  const draftClean = (graftedDonorDraft || '').trim();
  const draftForPrompt = endsWithColon ? draftClean.replace(/:\s*$/, '.') : draftClean;
  const draftWords = draftForPrompt.split(/\s+/).filter(Boolean).length;
  const numPredict = Math.min(360, Math.max(120, Math.round(draftWords * 2.7)));

  const draftLowerForMand = draftForPrompt.toLowerCase();
  const presentProper = (atoms?.proper_entities || []).filter(e => draftLowerForMand.includes(e.toLowerCase()));
  const mandatoryTokens = [...new Set([
    ...(atoms?.brand_models || []),
    ...presentProper
  ])];
  const entityRule = mandatoryTokens.length
    ? `Conserva exactamente estas entidades y códigos: ${mandatoryTokens.join(', ')}.`
    : `Evita añadir introducciones, resúmenes, títulos o temas que no estén en el texto.`;
  const proDropRule = centering.hasProDrop
    ? `Asegura sujeto explícito si la oración lo requiere.`
    : `Evita repetir encabezados innecesarios.`;

  const feedbackNotice = feedback
    ? `\nADVERTENCIA DEL INTENTO PREVIO: Tu versión anterior fue rechazada porque: "${feedback}". En esta ocasión está estrictamente prohibido cometer ese error. Conserva las oraciones originales sin parafrasear.`
    : '';

  // Plain-language morphosyntactic slot compiler & harmonizer (preserves organic human punctuation & cadence)
  const prompt = `Verifica la concordancia gramatical (artículos, preposiciones, género y número) del siguiente borrador editorial en español conservando al menos el 90% de las palabras, la puntuación y el tono humano exacto del texto original.

REGLAS ESTRICTAS:
1. ${entityRule} ${proDropRule}
2. Corrige ÚNICAMENTE errores reales de género, número, artículos o preposiciones donde se insertaron marcas, modelos o atributos.
3. Conserva intactos los giros coloquiales válidos (como "están genial", "este tipo de monturas", expresiones conversacionales), los verbos en subjuntivo, el orden de las palabras y la puntuación expresiva original; está prohibido reescribir, "mejorar" el estilo o sustituir expresiones correctas.
4. Prohibido inventar datos, materiales o características técnicas nuevas.
5. Si el texto entregado ya concuerda bien en género y número, devuélvelo exactamente igual letra por letra sin modificar nada.
6. Devuelve únicamente el texto final en un solo párrafo, sin comillas, sin listas y sin citar estas instrucciones.${feedbackNotice}

Texto: "${draftForPrompt}"`;

  const res = await ollamaClient.generate(modelName, prompt, {
    system: 'Eres un corrector morfosintáctico ultraconservador para artículos editoriales en español. Tu única función es reparar discordancias objetivas de género, número o artículos donde se insertaron marcas o modelos, dejando intactos los códigos SKU, los giros coloquiales, la puntuación y la sintaxis original del autor. Si el texto ya es gramaticalmente coherente, devuélvelo idéntico sin cambiar ninguna palabra ni coma.',
    temperature: Number(temperature.toFixed(2)),
    top_p: 0.90,
    num_predict: numPredict,
    cleanPlainText: true
  });

  qwenStats.calls += 1;
  qwenStats.totalDurationMs += res.durationMs;
  qwenStats.totalTokens += res.eval_count || 0;

  let cleanedText = cleanQwenResponse(res.response);
  cleanedText = stripLeadingAnchorEcho(cleanedText, centering.cb, draftClean, currentAnchor);

  // Shield against Qwen 1.5B mid-sentence continuation (lowercase start dropping initial subject/SKU)
  if (cleanedText && !/^[A-ZÁÉÍÓÚÑ¡¿0-9]/.test(cleanedText)) {
    const firstDraftSent = draftClean.split(/(?<=[.!?])\s+/)[0] || '';
    const firstDot = cleanedText.indexOf('.');
    if (firstDraftSent && firstDot > 0 && firstDot < cleanedText.length - 12) {
      const restAfterBrokenFirst = cleanedText.slice(firstDot + 1).trim();
      cleanedText = `${firstDraftSent} ${restAfterBrokenFirst}`.trim();
    } else {
      cleanedText = '';
    }
  }

  cleanedText = enforceBrandSku(cleanedText, atoms);

  const minTailWords = Math.min(25, Math.max(10, Math.floor(draftWords * 0.55)));
  const tailFix = repairTruncatedTail(cleanedText, atoms, minTailWords);
  if (tailFix.repaired) {
    cleanedText = tailFix.text;
  }
  if (endsWithColon && cleanedText.length > 0) {
    cleanedText = cleanedText.replace(/[.!?]+$/, '') + ':';
  }

  log(`[QWEN_FASE_4_INJERTO] Intento ${attempt} | Modelo: ${res.model} | Temp: ${Number(temperature.toFixed(2))} | Predict: ${numPredict} | Latencia: ${res.durationMs}ms | Tokens: ${res.eval_count}${tailFix.repaired ? ' | Cola truncada podada' : ''}`);
  log(`[QWEN_FASE_4_ENTRADA_ESQUELETO] "${draftClean}"`);
  log(`[QWEN_FASE_4_RESULTADO] ${cleanedText || '(respuesta vacía)'}`);

  return {
    model: res.model,
    durationMs: res.durationMs,
    evalCount: res.eval_count || 0,
    prompt,
    text: cleanedText
  };
}

function analyzeAlterations(candidate, reference, atoms = null) {
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const refWords = norm(reference);
  const candWords = norm(candidate);
  const refSet = new Set(refWords);
  const candSet = new Set(candWords);

  const preserved = refWords.filter(w => candSet.has(w)).length;
  const retentionRate = refWords.length > 0 ? Number(((preserved / refWords.length) * 100).toFixed(1)) : 100;
  const alterationRate = Number((100 - retentionRate).toFixed(1));

  const added = candWords.filter(w => !refSet.has(w));
  const removed = refWords.filter(w => !candSet.has(w));

  const grammaticalTokens = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del',
    'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'durante', 'en', 'entre',
    'hacia', 'hasta', 'mediante', 'para', 'por', 'segun', 'según', 'sin', 'so', 'sobre', 'tras',
    'y', 'e', 'ni', 'que', 'o', 'u', 'pero', 'sino', 'aunque', 'si', 'como', 'ya',
    'cuando', 'donde', 'mientras', 'porque', 'pues', 'asi', 'así', 'bien', 'tan', 'tanto',
    'mas', 'más', 'menos', 'muy', 'tambien', 'también', 'asimismo',
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
    'se', 'le', 'les', 'lo', 'la', 'los', 'las', 'su', 'sus', 'mi', 'mis', 'tu', 'tus',
    'es', 'son', 'ser', 'era', 'eran', 'fue', 'fueron', 'sido', 'esta', 'está', 'estan', 'están',
    'estar', 'hay', 'hubo', 'tiene', 'tienen', 'tener', 'queda', 'quedan', 'parece', 'parecen',
    'puede', 'pueden', 'podria', 'podría', 'podrian', 'podrían', 'sea', 'sean', 'hace', 'hacen'
  ]);

  const gramChanges = [];
  const stemInflections = [];
  const lexChanges = [];

  for (const w of added) {
    if (grammaticalTokens.has(w)) {
      gramChanges.push(w);
    } else {
      const isStemMatch = refWords.some(rw => rw.length >= 4 && (rw.startsWith(w.slice(0, 4)) || w.startsWith(rw.slice(0, 4))));
      if (isStemMatch) {
        stemInflections.push(w);
      } else {
        lexChanges.push(w);
      }
    }
  }

  let typeSummary = '';
  if (lexChanges.length === 0) {
    if (gramChanges.length === 0 && stemInflections.length === 0 && removed.length === 0) {
      typeSummary = 'Sin modificaciones (texto base intacto)';
    } else {
      typeSummary = `Concordancia morfosintáctica pura (${gramChanges.length} enlaces/artículos, ${stemInflections.length} flexiones)`;
    }
  } else {
    typeSummary = `Alerta: ${lexChanges.length} palabras léxicas añadidas (${lexChanges.slice(0, 3).join(', ')})`;
  }

  return {
    refWordCount: refWords.length,
    candWordCount: candWords.length,
    retentionRate,
    alterationRate,
    addedCount: added.length,
    removedCount: removed.length,
    grammaticalChanges: [...new Set(gramChanges)],
    stemInflections: [...new Set(stemInflections)],
    lexicalChanges: [...new Set(lexChanges)],
    typeSummary
  };
}

function selectBestCandidateFallback(attemptHistory, graftedDonorDraft) {
  if (!attemptHistory || !attemptHistory.length) return null;
  let best = null;
  let bestScore = -9999;
  for (const item of attemptHistory) {
    if (!item.text || item.text.length < 20) continue;
    let sc = 100;
    const m = item.metrics || {};
    if (m.lexicalChanges && m.lexicalChanges.length > 0) {
      sc -= m.lexicalChanges.length * 25; // penalización severa por inventar palabras no autorizadas
    }
    sc -= Math.abs(100 - (m.retentionRate || 100)) * 0.5;
    if (/[.!?]$/.test(item.text)) sc += 15;
    if (sc > bestScore) {
      bestScore = sc;
      best = { ...item, score: sc, reason: `Mejor aproximación morfosintáctica (score: ${sc.toFixed(1)}, retención: ${m.retentionRate}%)` };
    }
  }
  return best;
}

function computeWordRetentionRatio(candidate, reference) {
  if (!candidate || !reference) return 0;
  const candWords = tokenize(candidate);
  const refWords = tokenize(reference);
  if (!refWords.length) return 1;
  const candSet = new Set(candWords);
  let matched = 0;
  for (const rw of refWords) {
    if (candSet.has(rw)) matched++;
  }
  return matched / refWords.length;
}

function findUnauthorizedContentWords(candidate, reference, atoms, rawPara = '', anchor = '') {
  if (!candidate || !reference) return [];
  const allowedFunctional = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'al', 'del',
    'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'del', 'desde', 'durante', 'en', 'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'segun', 'según', 'sin', 'so', 'sobre', 'tras', 'versus', 'via', 'vía',
    'y', 'e', 'ni', 'que', 'o', 'u', 'pero', 'sino', 'aunque', 'si', 'como', 'ya', 'cuando', 'donde', 'mientras', 'porque', 'pues', 'entonces', 'asi', 'así', 'bien', 'tan', 'tanto', 'mas', 'más', 'menos', 'muy', 'tambien', 'también', 'asimismo',
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'se', 'le', 'les', 'lo', 'la', 'los', 'las', 'me', 'te', 'nos', 'os', 'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'cuyo', 'cuya', 'cuyos', 'cuyas',
    'es', 'son', 'ser', 'era', 'eran', 'fue', 'fueron', 'sido', 'esta', 'está', 'estan', 'están', 'estar', 'estaba', 'estaban', 'estuve', 'estuvieron', 'hay', 'hubo', 'habia', 'había', 'tiene', 'tienen', 'tener', 'tenia', 'tenían', 'resulta', 'resultan', 'queda', 'quedan', 'parece', 'parecen', 'puede', 'pueden', 'podria', 'podría', 'podrian', 'podrían', 'sea', 'sean', 'siendo', 'hace', 'hacen', 'hacer', 'dar', 'da', 'dan', 'ir', 'va', 'van',
    'buscar', 'buscas', 'busca', 'buscan', 'buscando',
    'encontrar', 'encuentras', 'encuentra', 'encuentran',
    'preferir', 'prefieres', 'prefiere', 'prefieren',
    'optar', 'optas', 'opta', 'optan',
    'elegir', 'eliges', 'elige', 'eligen',
    'querer', 'quieres', 'quiere', 'quieren',
    'asegurar', 'aseguras', 'asegura', 'aseguran',
    'acertar', 'aciertas', 'acierta', 'aciertan',
    'gustar', 'gustas', 'gusta', 'gustan',
    'lucir', 'luces', 'luce', 'lucen',
    'llevar', 'llevas', 'lleva', 'llevan',
    'adaptar', 'adaptas', 'adapta', 'adaptan', 'adaptando', 'adaptado', 'adaptada',
    'ajustar', 'ajustas', 'ajusta', 'ajustan', 'ajustando', 'ajustado', 'ajustada',
    'encajar', 'encajas', 'encaja', 'encajan', 'encajando',
    'favorecer', 'favoreces', 'favorece', 'favorecen', 'favoreciendo',
    'sentar', 'sientas', 'sienta', 'sientan', 'sentando',
    'estilizar', 'estilizas', 'estiliza', 'estilizan', 'estilizando',
    'embargo', 'temporada', 'epoca', 'época', 'ano', 'año', 'anos', 'años',
    'destacar', 'destaca', 'destacan', 'permitir', 'permite', 'permiten',
    'ofrecer', 'ofrece', 'ofrecen', 'aportar', 'aporta', 'aportan',
    'mantener', 'mantiene', 'mantienen', 'suavizar', 'suaviza', 'suavizan',
    'combinar', 'combina', 'combinan', 'proteger', 'protege', 'protegen',
    'equilibrar', 'equilibra', 'equilibran', 'resaltar', 'resalta', 'resaltan',
    'caso', 'casos', 'cuanto', 'relacion', 'relación', 'respecto', 'sentido', 'punto', 'puntos',
    'lado', 'parte', 'partes', 'modo', 'manera', 'forma', 'formas', 'cuenta', 'lugar', 'terminos', 'términos', 'lineas', 'líneas'
  ]);

  const opticalCore = new Set([
    'gafa', 'gafas', 'sol', 'lente', 'lentes', 'cristal', 'cristales', 'montura', 'monturas', 'armazon', 'varilla', 'varillas', 'puente', 'silueta', 'diseno', 'modelo', 'forma', 'estilo', 'aire', 'toque', 'pieza', 'faccion', 'facciones', 'rostro', 'rostros', 'cara', 'caras'
  ]);

  const normalizeWord = (w) => (w || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  const allowedSource = [
    reference,
    JSON.stringify(atoms || {}),
    rawPara || '',
    anchor || ''
  ].join(' ');

  const refWords = tokenize(allowedSource).map(normalizeWord).filter(w => w.length >= 3);
  const refStems = new Set(refWords);

  const candWords = tokenize(candidate).map(normalizeWord).filter(w => w.length >= 3);
  const unauthorized = [];

  for (const w of candWords) {
    if (allowedFunctional.has(w)) continue;
    if (opticalCore.has(w)) continue;
    if (refStems.has(w)) continue;
    let matchedStem = false;
    for (const stem of refStems) {
      if (stem.length >= 4 && (w.startsWith(stem.slice(0, -1)) || stem.startsWith(w.slice(0, -1)))) {
        matchedStem = true;
        break;
      }
      // Allow genuine Spanish verb/gender inflections (-an/-en, -os/-as, -ar/-er) and 1-char typo fixes on >=6-char words with shared 4-char root (e.g. vuelvan -> vuelven / vuelan)
      if (stem.length >= 6 && w.length >= 6) {
        const rootLen = Math.min(stem.length, w.length) - 2;
        if (rootLen >= 4 && stem.slice(0, rootLen) === w.slice(0, rootLen)) {
          matchedStem = true;
          break;
        }
        // 1-char edit distance with matching 4-char prefix (restrict equal-length substitutions to inflectional suffix so internal vowel typos like destaque->destique fail)
        if (Math.abs(stem.length - w.length) <= 1 && stem.slice(0, 4) === w.slice(0, 4)) {
          let diffs = 0;
          let firstDiffPos = -1;
          let a = 0;
          let b = 0;
          while (a < stem.length && b < w.length) {
            if (stem[a] === w[b]) { a++; b++; }
            else {
              if (firstDiffPos === -1) firstDiffPos = Math.min(a, b);
              diffs++;
              if (diffs > 1) break;
              if (stem.length > w.length) a++;
              else if (w.length > stem.length) b++;
              else { a++; b++; }
            }
          }
          const totalDiffs = diffs + (stem.length - a) + (w.length - b);
          const effPos = firstDiffPos !== -1 ? firstDiffPos : Math.min(a, b);
          const suffixFloor = stem.length === w.length
            ? Math.max(4, stem.length - 2)
            : Math.max(4, Math.min(stem.length, w.length) - 3);
          if (totalDiffs <= 1 && effPos >= suffixFloor) {
            matchedStem = true;
            break;
          }
        }
      }
    }
    if (!matchedStem) {
      unauthorized.push(w);
    }
  }
  return [...new Set(unauthorized)];
}

function validateQwenGraft(candidateText, rawPara, atoms, graftedDonorDraft = null, frame = 'GENERAL_STYLE', currentAnchor = '') {
  if (!candidateText || typeof candidateText !== 'string') return { ok: false, reason: 'Salida vacía' };
  const clean = candidateText.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const refText = graftedDonorDraft || rawPara;
  const refWords = refText.split(/\s+/).filter(Boolean).length;

  if (refWords >= 12 && words.length < Math.max(8, Math.floor(refWords * 0.55))) {
    return { ok: false, reason: `Salida demasiado corta (${words.length} vs ${refWords} palabras)` };
  }
  if (refWords >= 10 && words.length > Math.ceil(refWords * 1.45) + 8) {
    return { ok: false, reason: `Salida inflada (${words.length} vs ${refWords} palabras)` };
  }
  if (/\*\*|(?:^|\s)-\s+[A-ZÁÉÍÓÚÑ]+:|(?:Modelo|Montura|Estilo|Material|Propiedad|Accesorio|Forma|Uso)\s*:/i.test(clean)) {
    return { ok: false, reason: 'Formato Markdown/lista clave-valor detectado' };
  }
  if (/MOLDE DE REFERENCIA|BORRADOR FÁCTICO|BORRADOR A PULIR|PROPOSICIONES FÁCTICAS|COMPILADOR DE CADENCIA|PÁRRAFO FINAL|REGLAS ESTRICTAS|CADENCIA OBJETIVO|Hechos clave:|ÁTOMOS:|brick_?\d+|score:\d+/i.test(clean)) {
    return { ok: false, reason: 'Fuga de etiquetas o metadatos internos' };
  }

  const rawTrimmed = (rawPara || '').trim();
  if (!rawTrimmed.endsWith(':') && !/[.!?]$/.test(clean)) {
    return { ok: false, reason: 'Oración sin cierre puntuado al final' };
  }

  // Reject mid-sentence truncation using Spanish-safe boundary across ALL Spanish prepositions, conjunctions, articles and dangling verbs
  if (
    /[¡¿][^!?]*$/.test(clean) ||
    /(?<=^|[\s,;:¡¿"«(])(sobre|bajo|tras|ante|contra|desde|entre|hacia|hasta|mediante|según|sin|durante|el|la|los|las|un|una|unos|unas|de|del|al|con|en|por|para|que|y|o|u|e|ni|pero|aunque|sino|ya|su|sus|como|cuando|donde|mientras|porque|pues|aporta|aportan|combina|combinando|ofrece|ofrecen|destaca|destacan)\.?$/i.test(clean)
  ) {
    return { ok: false, reason: 'Oración truncada al final' };
  }

  // Reject high trigram overlap vs original input rawPara (must genuinely reconstruct from donors!)
  const trigramOverlap = computeNGramOverlapRatio(clean, rawPara, 3);
  if (words.length >= 15 && trigramOverlap > 0.30) {
    return { ok: false, reason: `Similitud excesiva de trigramas con el original (${(trigramOverlap * 100).toFixed(1)}% > 30%)` };
  }
  if (words.length >= 10 && words.length < 15 && trigramOverlap > 0.35) {
    return { ok: false, reason: `Similitud excesiva de trigramas en transición (${(trigramOverlap * 100).toFixed(1)}% > 35%)` };
  }

  // Verify candidate actually polished graftedDonorDraft rather than rewriting from scratch
  if (graftedDonorDraft && graftedDonorDraft.split(/\s+/).filter(Boolean).length >= 12) {
    const donorWordRetention = computeWordRetentionRatio(clean, graftedDonorDraft);
    if (donorWordRetention < 0.78) {
      return { ok: false, reason: `Modificación de Qwen demasiado agresiva (${(donorWordRetention * 100).toFixed(1)}% palabras retenidas < 78%)` };
    }
    const unauthorized = findUnauthorizedContentWords(clean, graftedDonorDraft, atoms, rawPara, currentAnchor);
    if (unauthorized.length > 0) {
      return { ok: false, reason: `Términos léxicos no autorizados introducidos por Qwen (${unauthorized.slice(0, 4).join(', ')})` };
    }
  }

  const rawLower = rawPara.toLowerCase();
  const cleanLower = clean.toLowerCase();

  if (grammaticalSurgery.hasGeneralSpanishAgreementError(clean)) {
    return { ok: false, reason: 'Discordancia general de género o número en español' };
  }
  if (/\b(?:opciones|alternativas|propuestas|siluetas|monturas|gafas|prendas|formas|líneas|lentes|piezas)\s+(?:m[aá]s\s+)?[a-záéíóúüñ]+as\s+y\s+[a-záéíóúüñ]+(?:ic|os|iv|ad|id|er|n)os\b/i.test(cleanLower)) {
    return { ok: false, reason: 'Discordancia de género en adjetivos coordinados' };
  }
  if (/^(?:El|La|Los|Las|Este|Esta|Estos|Estas)\s+[^,.;!?]{2,35}\s+es\s+por\s+(?:eso|ello)\s+que\b/i.test(clean)) {
    return { ok: false, reason: 'Colisión sintáctica de sujeto ante "es por eso/ello que"' };
  }
  if (/\b(?:los|unos|estos|esos|el|un|este|ese)\s+monturas?\b|\b(?:las|unas|estas|esas)\s+montura\b/i.test(cleanLower)) {
    return { ok: false, reason: 'Discordancia de determinante y sustantivo en "montura/monturas"' };
  }
  if (/\b(?:tipo|clase)\s+de\s+[a-záéíóúüñ]+s\s+(?:est[aá]|es)\s+[a-záéíóúüñ]+da\b/i.test(cleanLower)) {
    return { ok: false, reason: 'Discordancia de número/género en construcción partitiva' };
  }

  const draftLowerCheck = (graftedDonorDraft || '').toLowerCase();

  if (atoms.brand_models && atoms.brand_models.length > 0) {
    const fullSku = atoms.brand_models[0].trim();
    const parts = fullSku.split(/\s+/).filter(Boolean);
    const brandHead = parts[0].toLowerCase();
    if (!cleanLower.includes(brandHead)) {
      return { ok: false, reason: `Marca omitida (${fullSku})` };
    }
    if (parts.length > 1) {
      const skuCode = parts[1].toLowerCase();
      if (!cleanLower.includes(skuCode)) {
        return { ok: false, reason: `Código SKU omitido (${fullSku})` };
      }
    }
  }

  if (atoms.proper_entities && atoms.proper_entities.length > 0 && draftLowerCheck) {
    for (const ent of atoms.proper_entities) {
      if (draftLowerCheck.includes(ent.toLowerCase()) && !cleanLower.includes(ent.toLowerCase())) {
        return { ok: false, reason: `Entidad cultural/histórica del borrador omitida por Qwen (${ent})` };
      }
    }
  }

  const competing = isCompetingBrand(cleanLower, rawLower, tokenize(rawPara));
  if (competing) {
    return { ok: false, reason: `Marca competidora intrusa detectada (${competing})` };
  }
  return { ok: true };
}

module.exports = {
  atomizeWithQwen,
  cleanQwenResponse,
  compileCollocationalWithQwen,
  analyzeAlterations,
  selectBestCandidateFallback,
  computeWordRetentionRatio,
  findUnauthorizedContentWords,
  validateQwenGraft
};
