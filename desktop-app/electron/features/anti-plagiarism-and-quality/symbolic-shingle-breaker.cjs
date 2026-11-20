'use strict';

const ollamaClient = require('../local-llm-ollama/ollama-local-client.cjs');
const grammaticalSurgery = require('./central-morphosyntactic-surgery.cjs');
const { tokenize } = require('../text-analysis/draft-preprocessor.cjs');
const { findAllCorpusOverlaps } = require('./corpus-shingle-scanner.cjs');

async function breakShinglesWithQwen(candidateText, overlaps, modelName, log, qwenStats) {
  const flaggedList = overlaps.slice(0, 6).map(o => `- "${o.shingle}"`).join('\n');
  const candWords = (candidateText || '').split(/\s+/).filter(Boolean).length;
  const numPredict = Math.min(220, Math.max(95, Math.round(candWords * 2.5)));
  const prompt = `Cambia 1 o 2 palabras dentro de cada secuencia listada para romper coincidencias exactas de 7+ palabras, conservando el significado, las marcas/códigos SKU y el tono natural.
Devuelve SOLO el párrafo completo en español, sin comillas.

SECUENCIAS A ROMPER:
${flaggedList}

PÁRRAFO:
"${candidateText}"`;

  const res = await ollamaClient.generate(modelName, prompt, {
    system: 'Eres un editor en español experto en paráfrasis mínima. Sustituye 1 o 2 palabras en las secuencias indicadas conservando marcas y códigos SKU exactos.',
    temperature: 0.15,
    num_predict: numPredict,
    cleanPlainText: true
  });

  qwenStats.calls += 1;
  qwenStats.totalDurationMs += res.durationMs;
  qwenStats.totalTokens += res.eval_count || 0;

  log(`[QWEN_FASE_5_ANTIPLAGIO] Modelo: ${res.model} | Solapamientos enviados: ${overlaps.length} | Latencia: ${res.durationMs}ms | Tokens: ${res.eval_count}`);
  log(`[QWEN_FASE_5_RESULTADO] "${res.response}"`);

  return {
    model: res.model,
    durationMs: res.durationMs,
    evalCount: res.eval_count || 0,
    text: (res.response || '').trim()
  };
}

function applySymbolicShingleBreaker(bankState, text, donorsUsedInPara, atoms = null, usedReplacements = new Set(), minShingleLen = 7) {
  let current = text;
  const protectedBrandTokens = new Set([
    ...(atoms?.brand_models || []).flatMap(bm => tokenize(bm)),
    ...(atoms?.proper_entities || []).flatMap(pe => tokenize(pe))
  ]);

  const microSwaps = [
    { rx: /\bde esta manera\b/i, rep: 'así,' },
    { rx: /\bde esta forma\b/i, rep: 'de este modo' },
    { rx: /\bse caracterizan por\b/i, rep: 'destacan por' },
    { rx: /\bse han convertido en\b/i, rep: 'son hoy' },
    { rx: /\bde manera\b/i, rep: 'de forma' },
    { rx: /\bhoy en día\b/i, rep: 'actualmente' },
    { rx: /\ben la actualidad\b/i, rep: 'hoy en día' },
    { rx: /\bsin embargo\b/i, rep: 'no obstante' },
    { rx: /\bpor lo que\b/i, rep: 'de modo que' },
    { rx: /\bpueden ser\b/i, rep: 'suelen ser' },
    { rx: /\bpuede ser\b/i, rep: 'suele ser' },
    { rx: /\bpara los que\b/i, rep: 'para quienes' },
    { rx: /\bpara las que\b/i, rep: 'para quienes' },
    { rx: /\bde este tipo de\b/i, rep: 'de esta clase de' },
    { rx: /\btodo tipo de\b/i, rep: 'toda clase de' },
    { rx: /\bcualquier tipo de\b/i, rep: 'cualquier clase de' },
    { rx: /\bsin lugar a dudas\b/i, rep: 'sin duda' },
    { rx: /\ba lo largo de\b/i, rep: 'durante' },
    { rx: /\ba la vez que\b/i, rep: 'al tiempo que' },
    { rx: /\ba pesar de que\b/i, rep: 'aunque' },
    { rx: /\bdebido a que\b/i, rep: 'porque' },
    { rx: /\bcon el objetivo de\b/i, rep: 'para' }
  ];

  // Clean, natural Spanish editorial synonyms (strictly NO archaic/thesaurus spinner terms)
  const tokenSynonyms = {
    anchura: ['amplitud'],
    longitud: ['extensión'],
    anchas: ['amplias', 'marcadas'],
    misma: ['idéntica'],
    accesorio: ['complemento'],
    complemento: ['accesorio'],
    convertido: ['transformado'],
    pero: ['aunque'],
    encontrarán: ['verán'],
    opción: ['alternativa'],
    moda: ['tendencia', 'estética'],
    gustos: ['estilos', 'preferencias'],
    accesorios: ['complementos'],
    muchos: ['numerosos'],
    muchas: ['numerosas'],
    también: ['asimismo', 'igualmente'],
    además: ['asimismo'],
    porque: ['ya que', 'puesto que'],
    tienen: ['cuentan con'],
    tiene: ['cuenta con'],
    pueden: ['suelen'],
    puede: ['suele'],
    muy: ['bastante'],
    unas: ['algunas'],
    unos: ['algunos'],
    gafas: ['monturas'],
    monturas: ['gafas'],
    montura: ['silueta'],
    estilo: ['aire', 'línea'],
    forma: ['silueta', 'línea'],
    formas: ['siluetas', 'líneas'],
    diseño: ['corte'],
    diseños: ['cortes'],
    mejores: ['más acertadas'],
    perfecto: ['ideal', 'acertado'],
    perfecta: ['ideal', 'acertada'],
    ideal: ['idóneo', 'acertado'],
    actualmente: ['hoy en día'],
    prendas: ['piezas'],
    aporta: ['ofrece', 'brinda'],
    aportan: ['ofrecen', 'brindan'],
    ofrece: ['brinda', 'aporta'],
    ofrecen: ['brindan', 'aportan'],
    destaca: ['resalta', 'realza'],
    destacan: ['resaltan', 'realzan'],
    combina: ['armoniza', 'encaja'],
    combinan: ['armonizan', 'encajan'],
    favorece: ['estiliza', 'equilibra'],
    favorecen: ['estilizan', 'equilibran'],
    opciones: ['alternativas'],
    versátiles: ['adaptables'],
    quedan: ['sientan'],
    creados: ['elaborados'],
    desean: ['buscan'],
    lucir: ['llevar'],
    excelente: ['magnífica'],
    elección: ['alternativa'],
    suele: ['acostumbra'],
    suelen: ['acostumbran'],
    fresco: ['natural'],
    divertido: ['dinámico'],
    coloridas: ['llamativas'],
    ligeras: ['livianas'],
    firmas: ['marcas'],
    populares: ['reconocidas'],
    gafa: ['pieza'],
    temporada: ['estación'],
    uso: ['empleo'],
    color: ['tono'],
    siluetas: ['formas'],
    marca: ['firma'],
    buena: ['acertada'],
    posibilidades: ['alternativas'],
    fácil: ['sencillo'],
    elegir: ['escoger'],
    protegen: ['resguardan'],
    armoniza: ['encaja'],
    realza: ['destaca'],
    estiliza: ['favorece'],
    mirada: ['expresión'],
    recuerda: ['evoca'],
    icónicas: ['emblemáticas'],
    crean: ['generan'],
    logran: ['consiguen'],
    llevan: ['usan'],
    buscan: ['prefieren'],
    colores: ['tonos'],
    detalles: ['matices'],
    rasgos: ['facciones'],
    ésta: ['esta'],
    diseñadas: ['pensadas', 'creadas'],
    diseñada: ['pensada', 'creada'],
    pensadas: ['creadas'],
    pensada: ['creada'],
    distintas: ['diferentes'],
    clásico: ['intemporal'],
    clásica: ['intemporal'],
    elegante: ['sofisticado'],
    elegantes: ['sofisticados'],
    manera: ['forma'],
    darán: ['aportarán'],
    toque: ['matiz'],
    llevar: ['usar'],
    combinación: ['mezcla'],
    logra: ['consigue'],
    pequeño: ['sutil'],
    moderno: ['actual'],
    moderna: ['actual'],
    marcado: ['definido'],
    marcada: ['definida'],
    sencillo: ['simple']
  };

  let guard = 0;
  while (guard < 45) {
    guard++;
    const overlaps = findAllCorpusOverlaps(bankState, current, donorsUsedInPara, minShingleLen);
    if (!overlaps.length) break;

    let mutated = false;

    // 1. Multi-word lexical/syntactic swaps scoped to active overlap windows (preserving capitalization)
    for (const ov of overlaps) {
      const targetShingle = ov.shingle;
      const winPattern = targetShingle
        .split(' ')
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^a-záéíóúüñ0-9]+');
      const winRx = new RegExp(`(${winPattern})`, 'i');

      for (const sw of microSwaps) {
        if (usedReplacements.has(sw.rep)) continue;
        if (!sw.rx.test(targetShingle)) continue;
        const rxGlobal = new RegExp(sw.rx.source, 'i');
        if (!winRx.test(current)) continue;

        const nextCandidate = current.replace(winRx, (winMatch) => (
          winMatch.replace(rxGlobal, (subMatch, g1) => {
            let out = sw.rep;
            if (g1 !== undefined && typeof g1 === 'string') {
              out = out.replace('$1', g1);
            }
            if (/^[A-ZÁÉÍÓÚÑ]/.test(subMatch)) {
              out = out.charAt(0).toUpperCase() + out.slice(1);
            }
            return out;
          })
        ));

        if (
          nextCandidate !== current &&
          !findAllCorpusOverlaps(bankState, nextCandidate, donorsUsedInPara, minShingleLen).some(o => o.shingle === targetShingle)
        ) {
          current = nextCandidate;
          usedReplacements.add(sw.rep);
          mutated = true;
          break;
        }
      }
      if (mutated) break;
    }

    // 2. Single-token invariant grammatical synonym replacement across ALL active overlaps (context-guarded)
    if (!mutated) {
      for (const ov of overlaps) {
        const targetShingle = ov.shingle;
        const tokens = targetShingle.split(' ');
        const probeOrder = [3, 2, 4, 1, 5, 0, 6];
        for (const idx of probeOrder) {
          const tok = tokens[idx];
          if (!tok || protectedBrandTokens.has(tok)) continue;
          if (tok === 'pero' && tokens[idx + 1] === 'que') continue;
          if ((tok === 'además' || tok === 'también') && tokens[idx + 1] === 'de') continue;
          if ((tok === 'forma' || tok === 'manera') && /^(?:de|esta|esa|otra|alguna|ninguna|misma|tal)$/i.test(tokens[idx - 1] || '')) continue;
          const syns = tokenSynonyms[tok];
          if (!syns || !syns.length) continue;

          const validSyns = syns.filter(s => !s.toLowerCase().split(/\s+/).includes(tok));
          const chosenSyn = validSyns.find(s => !usedReplacements.has(`${tok}->${s}`)) || validSyns[0];
          if (!chosenSyn) continue;

          const escTok = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escBefore = tokens[idx - 1] ? `${tokens[idx - 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,;:]*\\s+` : '';
          const escAfter = tokens[idx + 1] ? `[,;:]*\\s+${tokens[idx + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` : '';

          const scopedRx = new RegExp(`(^|[^a-záéíóúüñ0-9])(${escBefore})(${escTok})(${escAfter})(?=[^a-záéíóúüñ0-9]|$)`, 'i');
          if (scopedRx.test(current)) {
            const nextCandidate = current.replace(scopedRx, (m, lead, bef, origTok, aft) => {
              const adjusted = /^[A-ZÁÉÍÓÚÑ]/.test(origTok)
                ? chosenSyn.charAt(0).toUpperCase() + chosenSyn.slice(1)
                : chosenSyn;
              return `${lead}${bef}${adjusted}${aft}`;
            });
            if (
              nextCandidate !== current &&
              !/\b(gafas|monturas|modelos|diseños|formas|siluetas)\s+(?:de\s+)?\1\b/i.test(nextCandidate) &&
              !findAllCorpusOverlaps(bankState, nextCandidate, donorsUsedInPara, minShingleLen).some(o => o.shingle === targetShingle)
            ) {
              current = nextCandidate;
              usedReplacements.add(`${tok}->${chosenSyn}`);
              mutated = true;
              break;
            }
          }
        }
        if (mutated) break;
      }
    }

    // 3. Universal interior syntactic pivot fallback for unforeseen 7-gram runs
    if (!mutated) {
      const syntacticPivots = [
        {
          key: 'pivot_que_art',
          rx: /\bque\s+(el|la|los|las|se|no|te|le|nos)\b/i,
          repFn: (m, g1) => `que hoy ${g1}`
        },
        {
          key: 'pivot_coord_y_ademas',
          rx: /\b([a-záéíóúñ]{4,})\s+y\s+(no|su|sus|el|la|los|las)\b/i,
          repFn: (m, w1, w2) => `${w1} —y además ${w2}`
        },
        {
          key: 'pivot_dash_pause',
          rx: /\b([a-záéíóúñ]{4,}),\s+pero\b/i,
          repFn: (m, w1) => `${w1} —eso sí,`
        },
        {
          key: 'pivot_conversational_comma',
          rx: /\b,\s+(que|donde|cuando|como)\b/i,
          repFn: (m, rel) => `, de hecho, ${rel}`
        },
        {
          key: 'pivot_sin_duda',
          rx: /\bes\s+(una|un|perfecto|perfecta|ideal)\b/i,
          repFn: (m, w1) => `es, sin duda, ${w1}`
        },
        {
          key: 'pivot_en_la_practica',
          rx: /\bpara\s+(los|las|todos|todas|quienes)\b/i,
          repFn: (m, w1) => `en la práctica, para ${w1}`
        }
      ];

      for (const ov of overlaps) {
        const targetShingle = ov.shingle;
        const winPattern = targetShingle
          .split(' ')
          .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('[^a-záéíóúüñ0-9]+');
        const winRx = new RegExp(`(${winPattern})`, 'i');
        if (!winRx.test(current)) continue;

        for (const pv of syntacticPivots) {
          if (!pv.rx.test(targetShingle)) continue;
          const provisionalOut = targetShingle.match(pv.rx);
          const pvUsageKey = pv.key === 'pivot_que_art' ? pv.key : `${pv.key}:${(provisionalOut?.[0] || '').toLowerCase()}`;
          if (usedReplacements.has(pvUsageKey)) continue;

          const nextCandidate = current.replace(winRx, (winMatch) => (
            winMatch.replace(pv.rx, (...args) => {
              const subMatch = args[0];
              let out = pv.repFn(...args);
              if (/^[A-ZÁÉÍÓÚÑ]/.test(subMatch)) {
                out = out.charAt(0).toUpperCase() + out.slice(1);
              }
              return out;
            })
          ));

          if (
            nextCandidate !== current &&
            !findAllCorpusOverlaps(bankState, nextCandidate, donorsUsedInPara, minShingleLen).some(o => o.shingle === targetShingle)
          ) {
            current = nextCandidate;
            usedReplacements.add(pvUsageKey);
            mutated = true;
            break;
          }
        }
        if (mutated) break;
      }
    }

    if (!mutated) break;
  }

  // Restore post-sentence capitalization cleanly
  current = current.replace(/(^|[.!?]\s+)([a-záéíóúñ])/g, (_, sep, ch) => sep + ch.toUpperCase());
  return current;
}

/**
 * Micro-Cirugía Gramatical Central para romper rachas continuas >= 7 palabras
 * operando exclusivamente en el interior de cada oración [3, L-4] (bordes intactos).
 */

function applyCentralGrammaticalSurgery(bankState, text, donorsUsedInPara = [], atoms = null, minShingleLen = 7, log = null, auditSteps = null) {
  const res = grammaticalSurgery.applyCentralGrammaticalSurgery(
    text,
    donorsUsedInPara,
    { tokenize, corpus7GramMap: bankState?.corpus7GramMap },
    atoms,
    { minShingleLen }
  );

  if (Array.isArray(res.operations) && res.operations.length > 0) {
    for (const op of res.operations) {
      if (typeof log === 'function') {
        log(`[FASE_5_CIRUGIA_CENTRAL] Or.${op.sentenceIndex} [${op.interiorPosition}] ${op.family} (${op.ruleId}): "${op.beforeSnippet}" -> "${op.afterSnippet}" | rachaMax: ${op.beforeMaxRun}w -> ${op.afterMaxRun}w | >=7w: ${op.beforeHits} -> ${op.afterHits}`);
      }
      if (Array.isArray(auditSteps)) {
        auditSteps.push({
          stage: 'CENTRAL_GRAMMATICAL_SURGERY',
          sentenceIndex: op.sentenceIndex,
          interiorPosition: op.interiorPosition,
          family: op.family,
          ruleId: op.ruleId,
          before: op.beforeSnippet,
          after: op.afterSnippet,
          beforeMaxRun: op.beforeMaxRun,
          afterMaxRun: op.afterMaxRun,
          beforeHits: op.beforeHits,
          afterHits: op.afterHits,
          centralityScore: op.centralityScore
        });
      }
    }
  }

  return res;
}

module.exports = {
  breakShinglesWithQwen,
  applySymbolicShingleBreaker,
  applyCentralGrammaticalSurgery
};
