'use strict';

/**
 * Torneo Empirico V2 de Modelos Ligeros Locales para Carril B (Ollama CPU/RAM)
 * - 6 casos reales solvables con pre-flight de oraculos 6/6 obligatorio.
 * - Seleccion de andamios por afinidad semantica + polaridad + voz + sin marcas/tech ajenas.
 * - Prompt des-linealizado (sin clausulas copiables del origen y con CERO "%") + few-shot multi-turno neutro.
 * - Evaluacion imparcial de 2 andamios sin arrastre de feedback entre moldes.
 * - Reporte dual: Calidad (Aprobados/6, Score, LCS, Entailment, Divergencia) + Viabilidad CPU (s/caso, tok/s).
 *
 * Flags:
 *   --preflight-only   Verifica bancos, subdominios, andamios Top-2, prompts (0 "%") y 6/6 oraculos sin llamar al LLM.
 *   --only=<id>        Ejecuta solo un contendiente (p. ej. --only=qwen2.5:1.5b) y guarda en scratch/torneo_carril_b_v2_smoke.json.
 */

const fs = require('fs');
const path = require('path');
const ollamaClient = require('../desktop-app/electron/features/local-llm-ollama/ollama-local-client.cjs');
const engine = require('../desktop-app/electron/features/humanization-pipeline/humanize-article.cjs');
const enterpriseRetriever = require('../desktop-app/electron/features/donor-bank/hybrid-donor-retriever.cjs');
const domainRegistry = require('../desktop-app/electron/features/donor-bank/domain-packs-registry.cjs');
const fg = require('../desktop-app/electron/features/text-analysis/factual-entailment-guard.cjs');
const dt = require('../desktop-app/electron/features/text-analysis/discourse-topology-analyzer.cjs');
const cb = require('../desktop-app/electron/features/rewrite-tracks/track-b-guided-transfer/guided-structural-transfer.cjs');

const args = process.argv.slice(2);
const PREFLIGHT_ONLY = args.includes('--preflight-only');
const onlyArg = args.find(a => a.startsWith('--only='));
const ONLY_ID = onlyArg ? onlyArg.slice('--only='.length).trim() : null;

const OUT_PATH = ONLY_ID
  ? 'C:/Users/Simon San/.gemini/antigravity/brain/6f42180b-4dda-4c2d-b413-ed7d3b28acfa/scratch/torneo_carril_b_v2_smoke.json'
  : 'C:/Users/Simon San/.gemini/antigravity/brain/6f42180b-4dda-4c2d-b413-ed7d3b28acfa/scratch/torneo_carril_b_v2_resultados.json';

const CONTENDERS = [
  { id: 'qwen2.5:0.5b', family: 'Qwen 2.5', tags: ['qwen2.5:0.5b'], keepInstalled: true, isLargeModel: false, opts: {} },
  { id: 'gemma3:1b', family: 'Gemma 3', tags: ['gemma3:1b'], keepInstalled: false, isLargeModel: false, opts: {} },
  { id: 'qwen2.5:1.5b', family: 'Qwen 2.5', tags: ['qwen2.5:1.5b'], keepInstalled: true, isLargeModel: false, opts: {} },
  { id: 'qwen3:1.7b', family: 'Qwen 3', tags: ['qwen3:1.7b'], keepInstalled: false, isLargeModel: false, opts: { think: false } },
  {
    id: 'salamandra-2b',
    family: 'Salamandra (BSC-LT)',
    tags: [
      'hf.co/tensorblock/salamandra-2b-instruct-GGUF:Q4_K_M',
      'hf.co/hdnh2006/BSC-LT-salamandra-2b-instruct-gguf:Q4_K_M',
      'hf.co/rdrgzlng/salamandra-2b-instruct-GGUF:Q4_K_M'
    ],
    keepInstalled: false,
    isLargeModel: false,
    opts: {}
  },
  { id: 'llama3.2:3b', family: 'Llama 3.2', tags: ['llama3.2:3b'], keepInstalled: false, isLargeModel: true, opts: {} },
  { id: 'qwen2.5:3b', family: 'Qwen 2.5', tags: ['qwen2.5:3b'], keepInstalled: false, isLargeModel: true, opts: {} },
  { id: 'qwen3:4b', family: 'Qwen 3', tags: ['qwen3:4b'], keepInstalled: false, isLargeModel: true, opts: { think: false } },
  { id: 'gemma3:4b', family: 'Gemma 3', tags: ['gemma3:4b'], keepInstalled: false, isLargeModel: true, opts: {} }
];

const BENCH_CASES = [
  {
    caseId: 'C1-MINERAL',
    title: 'Persol PO0714SM + Cristal Mineral vs Policarbonato',
    expectedSubdomain: 'OPTICAL_EYEWEAR',
    heading: 'Persol PO0714SM Plegables: Qué Debes Saber Antes de Comprarlas',
    role: 'SECTION_OPENING',
    rawPara: 'Las Persol PO0714SM plegables combinan acetato artesanal, varillas con sistema flexible Meflecto y lentes de cristal mineral templado. Ese cristal ofrece una nitidez óptica sobresaliente y resiste mucho mejor los arañazos que el policarbonato, aunque incrementa el peso sobre el tabique nasal.',
    carrilABaseline: 'Muchos cristales están securizados y son resistentes a los golpes; conviene protegerlos de la arena cuando vas a la playa.',
    buildOracle: (scafText) =>
      `Las gafas de sol Persol PO0714SM plegables montan cristal mineral frente al policarbonato y sistema flexible Meflecto, ofreciendo gran nitidez aunque resultan algo más pesadas en la nariz. A cambio de ese peso sobre el tabique nasal, el acetato artesanal del armazón garantiza máxima durabilidad y resistencia superior frente a arañazos.`
  },
  {
    caseId: 'C2-ANATOMIA-NEG',
    title: 'Advertencia Negativa Puente Cerradura 21 mm / Nariz Estrecha',
    expectedSubdomain: 'OPTICAL_EYEWEAR',
    heading: 'Persol PO0714SM Plegables: Qué Debes Saber Antes de Comprarlas',
    role: 'SECTION_CLOSING',
    forceBrandSku: 'Persol PO0714SM',
    rawPara: 'Debido precisamente a ese peso extra y a su puente tipo cerradura de 21 mm, conviene evitarlas si tienes la nariz muy estrecha o si necesitas unas gafas ultraligeras para llevar ocho horas seguidas sin notar presión.',
    carrilABaseline: 'Conviene revisar siempre el ajuste de las varillas si notas molestias detrás de las orejas durante el día.',
    buildOracle: () =>
      `Porque del peso extra y su puente de cerradura de 21 mm depende que la Persol PO0714SM se nos adapte bien a nuestra nariz o no. Si tu nariz es muy estrecha o buscas gafas ultraligeras sin presión durante ocho horas, conviene evitarlas para prevenir molestias.`
  },
  {
    caseId: 'C3-INYECTADO-NEG',
    title: 'Plástico Inyectado en Molde y Degradación Superficial',
    expectedSubdomain: 'OPTICAL_EYEWEAR',
    heading: 'Por Qué el Acetato Fresado Cuesta el Triple que la Pasta Inyectada',
    role: 'SECTION_CLOSING',
    rawPara: 'En cambio, las monturas de plástico inyectado salen de un molde en pocos segundos, suelen llevar el color pintado solo en la superficie y terminan descascarillándose o volviéndose rígidas y quebradizas con el sudor y el sol.',
    carrilABaseline: 'Además existen armazones laminados en dos colores que aportan un contraste visual muy elegante en el frontal.',
    buildOracle: () =>
      `El problema del plástico inyectado es que sale de un molde de inyección rápido con tinte pintado en superficie y resulta menos resistente con el paso del tiempo. Por este motivo, el sudor y el sol provocan que el color se acabe descascarillando y la montura se vuelva quebradiza.`
  },
  {
    caseId: 'C4-OCUPACIONAL-PROHIB',
    title: 'Lentes Ocupacionales en Oficina vs Prohibición de Conducir',
    expectedSubdomain: 'OPTICAL_EYEWEAR',
    heading: 'Gafas Progresivas u Ocupacionales Frente al Ordenador',
    role: 'SECTION_CLOSING',
    rawPara: 'Las lentes ocupacionales resuelven este problema ampliando el campo visual intermedio y cercano a cambio de renunciar al enfoque de lejos; por eso resultan excelentes en la oficina, pero nunca deben utilizarse para conducir.',
    carrilABaseline: 'Para ver de cerca con nitidez frente al escritorio resulta útil ajustar la altura del asiento y la distancia al monitor.',
    buildOracle: () =>
      `La ventaja de las lentes ocupacionales en la oficina es que amplían el campo visual cercano e intermedio y dejan atrás el enfoque de lejos, pero jamás sirven al volante para conducir.`
  },
  {
    caseId: 'C5-FOTOCROM-COCHE',
    title: 'Lentes Fotocromáticas Frente al Parabrisas y Luz Visible',
    expectedSubdomain: 'OPTICAL_EYEWEAR',
    heading: 'Lentes Fotocromáticas: Ventajas en Exteriores y Límites en el Coche',
    role: 'SECTION_MEDIAL',
    rawPara: 'Las lentes fotocromáticas se adaptan rápido al aire libre gracias a la radiación ultravioleta, pero el parabrisas del coche filtra casi toda la luz UV e impide que se oscurezcan salvo que incorporen activación por luz visible.',
    carrilABaseline: 'En días muy luminosos conviene llevar unas gafas cómodas para evitar el resplandor directo del sol en exteriores.',
    buildOracle: () =>
      `Al aire libre, es cierto que las lentes fotocromáticas reaccionan rápido ante la radiación UV exterior, pero dentro del coche no se oscurecen porque el parabrisas bloquea y filtra esos rayos. No obstante, podemos encontrar opciones modernas que responden a la luz visible en carretera.`
  },
  {
    caseId: 'C6-AUDIOLOGIA-H2',
    title: 'Pérdida Auditiva y Acúfenos -> Audiometría y Audífonos (H2 Audiología)',
    expectedSubdomain: 'AUDIOLOGY',
    heading: 'Cuándo Necesitas una Revisión Auditiva',
    role: 'SECTION_OPENING',
    rawPara: 'La exposición prolongada a un ruido excesivo y la pérdida auditiva gradual suelen provocar acúfenos persistentes; por eso conviene realizar una audiometría a tiempo para adaptar audífonos discretos.',
    carrilABaseline: 'La otitis externa aparece con frecuencia cuando entra humedad en el conducto auditivo tras bañarse en la piscina.',
    buildOracle: () =>
      `La exposición prolongada a un ruido excesivo puede provocar un daño continuo y generar tanto pérdida auditiva como acúfenos persistentes, haciendo recomendable una audiometría temprana para ajustar audífonos discretos.`
  }
];

function getFreeDiskGB() {
  try {
    const st = fs.statfsSync('C:\\');
    return Number(((st.bfree * st.bsize) / (1024 ** 3)).toFixed(2));
  } catch {
    return 99;
  }
}

async function unloadModel(modelTag) {
  try {
    await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelTag, prompt: '', keep_alive: 0, stream: false }),
      signal: AbortSignal.timeout(10000)
    });
  } catch {}
}

async function ensureContenderPulled(contender, installedSet) {
  for (const tag of contender.tags) {
    if (installedSet.has(tag)) {
      return { ok: true, activeTag: tag, pulled: false };
    }
    const freeGB = getFreeDiskGB();
    if (freeGB < 6.0) {
      return { ok: false, error: `LOW_DISK_SPACE (${freeGB} GB free)` };
    }
    console.log(`  [PULL] Descargando ${tag} (SSD libre: ${freeGB} GB)...`);
    let lastPctLogged = -10;
    const res = await ollamaClient.pullModel(tag, (prog) => {
      if (prog.total && prog.completed) {
        const pct = Math.floor((prog.completed / prog.total) * 100);
        if (pct >= lastPctLogged + 25) {
          lastPctLogged = pct;
          process.stdout.write(`    ${tag}: ${pct}%\n`);
        }
      }
    });
    if (res.success) {
      return { ok: true, activeTag: tag, pulled: true };
    }
    console.log(`  [PULL_FAIL] ${tag}: ${res.error}`);
  }
  return { ok: false, error: `No pudo descargarse ningun tag de ${contender.id}` };
}

function classifyCpuViability(avgLatencySec) {
  if (avgLatencySec < 35) return 'RAPIDO <35s';
  if (avgLatencySec <= 95) return 'VIABLE 35-95s';
  return 'LENTO >95s';
}

function prepareBenchFixturesAndValidatePreFlight() {
  console.log('\n=== CARGANDO BANCOS E ÍNDICE HÍBRIDO SEMÁNTICO ===');
  engine.loadBanks();
  const fewShotMessages = cb.buildCarrilBFewShotMessages();
  const systemPrompt = 'Eres un editor lingüístico de precisión en español. Transfiere hechos exactos dentro del molde humano conservando conectores y estructura sin copiar frases literales de los datos de referencia.';

  if (systemPrompt.includes('%') || fewShotMessages.some(m => String(m.content || '').includes('%'))) {
    throw new Error('PREFLIGHT_FAIL: Se detecto caracter "%" en systemPrompt o fewShotMessages.');
  }

  const fixtures = [];
  let preflightErrors = 0;

  console.log('\n=== PRE-FLIGHT DE SOLVABILIDAD (6/6 CASOS + ORÁCULOS) ===');
  for (const bc of BENCH_CASES) {
    const activeSubdomains = domainRegistry.resolveSectionSubdomains({
      headingText: bc.heading,
      sectionBodyText: bc.rawPara,
      paragraphText: bc.rawPara,
      domainId: 'optica'
    });

    if (!activeSubdomains.has(bc.expectedSubdomain)) {
      console.error(`  [FAIL] ${bc.caseId}: subdominio esperado ${bc.expectedSubdomain}, obtuvo [${[...activeSubdomains].join(', ')}]`);
      preflightErrors++;
    }

    const { type, atoms } = engine.classifyParagraph(bc.rawPara, bc.heading, activeSubdomains);
    if (bc.forceBrandSku) {
      atoms.brand_models = [bc.forceBrandSku];
      atoms.discriminativeAnchors = fg.extractDiscriminativeAnchors(bc.rawPara, atoms);
    }

    const scaffolds = cb.selectStructuralScaffolds({
      rawPara: bc.rawPara,
      atoms,
      frame: type,
      heading: bc.heading,
      paraTopology: { role: bc.role },
      masterBricks: engine.masterBricks,
      usedDonorIds: new Set(),
      factualGuard: fg,
      discourseTopology: dt,
      enterpriseRetriever,
      domainId: 'optica',
      activeSubdomains,
      topK: 2
    });

    const baselineEntailment = fg.evaluateFactualEntailment(
      bc.rawPara,
      bc.carrilABaseline,
      atoms.discriminativeAnchors,
      atoms.signedPolarity
    );
    const srcBlueprint = cb.extractRhetoricalBlueprint(bc.rawPara, atoms, { role: bc.role });

    if (scaffolds.length < 2) {
      console.error(`  [FAIL] ${bc.caseId}: menos de 2 andamios (${scaffolds.length})`);
      preflightErrors++;
    }

    for (let sIdx = 0; sIdx < scaffolds.length; sIdx++) {
      const sc = scaffolds[sIdx];
      const testPrompt = cb.buildGuidedTransferPrompt({
        donorBase: sc.cleanText,
        rawPara: bc.rawPara,
        atoms,
        heading: bc.heading,
        paraTopology: { role: bc.role },
        blueprint: srcBlueprint,
        donorBlueprint: sc.blueprint,
        feedback: null
      });
      if (testPrompt.includes('%')) {
        console.error(`  [FAIL] ${bc.caseId} scaffold #${sIdx + 1}: el prompt contiene "%"!`);
        preflightErrors++;
      }
      if (!domainRegistry.isSubdomainCompatible(sc.brick.subdomain, activeSubdomains, 'optica')) {
        console.error(`  [FAIL] ${bc.caseId} scaffold #${sIdx + 1}: subdominio incompatible (${sc.brick.subdomain})`);
        preflightErrors++;
      }
    }

    // Validate realistic human oracle transfer against Scaffold #1
    const scaf1 = scaffolds[0];
    let oracleOk = false;
    let oracleJudge = null;
    if (scaf1 && typeof bc.buildOracle === 'function') {
      const oracleText = bc.buildOracle(scaf1.cleanText);
      oracleJudge = cb.judgeCarrilBCandidate({
        candidate: oracleText,
        donorBase: scaf1.cleanText,
        rawPara: bc.rawPara,
        atoms,
        heading: bc.heading,
        factualGuard: fg,
        discourseTopology: dt,
        paraTopology: { role: bc.role },
        domainId: 'optica',
        activeSubdomains,
        baselineEntailment
      });
      oracleOk = oracleJudge.approved;
      if (!oracleOk) {
        preflightErrors++;
      }
    }

    console.log(`\n[${bc.caseId}] Sub=[${[...activeSubdomains].join(',')}] | Frame=${type} | BaselineEntail=${baselineEntailment.entailmentScore}% | Oraculo=${oracleOk ? 'APROBADO' : `RECHAZADO [${oracleJudge?.failedGates?.join(', ')}]`}`);
    console.log(`  #1 ${scaf1?.brick?.brick_id} (${scaf1?.domain}, sub=${scaf1?.brick?.subdomain}, sc=${scaf1?.scaffoldScore}): "${scaf1?.cleanText}"`);
    console.log(`     -> ${scaf1?.matchSummary}`);
    if (scaffolds[1]) {
      const scaf2 = scaffolds[1];
      console.log(`  #2 ${scaf2.brick.brick_id} (${scaf2.domain}, sub=${scaf2.brick.subdomain}, sc=${scaf2.scaffoldScore}): "${scaf2.cleanText}"`);
      console.log(`     -> ${scaf2.matchSummary}`);
    }
    if (!oracleOk && oracleJudge) {
      console.log(`  [ORACULO_DIAG] LCS=${oracleJudge.metrics.functionSkeletonLCS} Entail=${oracleJudge.metrics.entailmentScore}% Mask3g=${oracleJudge.metrics.maskedSourceTrigramOverlap} MaxSpan=${oracleJudge.metrics.maxSourceCopySpan} Retention=${oracleJudge.metrics.donorContentRetention}`);
    }

    fixtures.push({
      ...bc,
      activeSubdomains,
      frame: type,
      atoms,
      scaffolds,
      baselineEntailment,
      srcBlueprint,
      oracleApproved: oracleOk
    });
  }

  if (preflightErrors > 0) {
    throw new Error(`PREFLIGHT_ABORTADO: ${preflightErrors} fallo(s) en validacion de andamios/prompts/oraculos.`);
  }

  console.log('\n[PRE-FLIGHT OK] 6/6 casos con andamios validos de su subdominio, CERO "%" en prompts y 6/6 oraculos APROBADOS.');
  return { fixtures, fewShotMessages, systemPrompt };
}

async function main() {
  console.log('=== INICIANDO TORNEO EMPÍRICO V2 DE MODELOS PARA CARRIL B ===');
  const { fixtures, fewShotMessages, systemPrompt } = prepareBenchFixturesAndValidatePreFlight();

  if (PREFLIGHT_ONLY) {
    console.log('\nModo --preflight-only completado con exito. Saliendo antes de invocar Ollama.');
    return;
  }

  const srv = await ollamaClient.ensureServerRunning((m) => console.log(' ', m));
  if (!srv.available) {
    throw new Error('Ollama no pudo iniciarse para el torneo.');
  }

  const initialModels = new Set((srv.models || []).map(m => m.name));
  console.log('Modelos preinstalados:', [...initialModels].join(', ') || '(ninguno)');
  console.log(`Espacio libre en C:: ${getFreeDiskGB()} GB`);

  const activeContenders = ONLY_ID
    ? CONTENDERS.filter(c => c.id === ONLY_ID || c.tags.includes(ONLY_ID))
    : CONTENDERS;

  if (!activeContenders.length) {
    throw new Error(`No se encontro el contendiente "${ONLY_ID}" en la lista del torneo.`);
  }

  const tournamentReport = {
    version: 2,
    startedAt: new Date().toISOString(),
    hardware: 'Intel Core i5-3320M (2C/4T) CPU-only, 15.87 GB RAM',
    onlyContender: ONLY_ID || null,
    fixtures: fixtures.map(f => ({
      caseId: f.caseId,
      title: f.title,
      expectedSubdomain: f.expectedSubdomain,
      baselineEntailScore: f.baselineEntailment.entailmentScore,
      oracleApproved: f.oracleApproved,
      scaffold1: { id: f.scaffolds[0]?.brick?.brick_id, domain: f.scaffolds[0]?.domain, subdomain: f.scaffolds[0]?.brick?.subdomain, score: f.scaffolds[0]?.scaffoldScore, text: f.scaffolds[0]?.cleanText },
      scaffold2: { id: f.scaffolds[1]?.brick?.brick_id, domain: f.scaffolds[1]?.domain, subdomain: f.scaffolds[1]?.brick?.subdomain, score: f.scaffolds[1]?.scaffoldScore, text: f.scaffolds[1]?.cleanText }
    })),
    results: []
  };

  for (const contender of activeContenders) {
    console.log(`\n--------------------------------------------------------------------`);
    console.log(`CONTENDIENTE: ${contender.id} (${contender.family})`);
    console.log(`--------------------------------------------------------------------`);

    const currentModels = new Set((await ollamaClient.listModels()).map(m => m.name));
    const pullState = await ensureContenderPulled(contender, currentModels);

    if (!pullState.ok) {
      tournamentReport.results.push({
        id: contender.id,
        family: contender.family,
        status: 'PULL_FAILED',
        error: pullState.error,
        approvedCount: 0,
        firstTryApprovedCount: 0,
        avgScore: -999,
        avgLCS: 0,
        avgEntail: 0,
        avgDivergence: 0,
        avgLatencyMs: 0,
        avgTokensPerSec: 0,
        cpuViability: 'PULL_FAILED',
        cases: []
      });
      fs.writeFileSync(OUT_PATH, JSON.stringify(tournamentReport, null, 2), 'utf8');
      continue;
    }

    const activeTag = pullState.activeTag;
    const caseOutcomes = [];
    let totalGeneratedTokens = 0;
    let totalInferenceMs = 0;

    for (const fx of fixtures) {
      console.log(`  [${contender.id}] Evaluando ${fx.caseId}...`);
      const tryPlan = [
        { scaffoldIdx: 0, temp: 0.20 },
        { scaffoldIdx: fx.scaffolds.length > 1 ? 1 : 0, temp: 0.24 }
      ];
      const attempts = [];
      let approvedEntry = null;
      let bestEntry = null;
      let totalCaseMs = 0;

      for (let t = 0; t < tryPlan.length; t++) {
        const scaf = fx.scaffolds[tryPlan[t].scaffoldIdx];
        // Clean independent scaffold pass: NEVER carry feedback from scaffold #1 into scaffold #2
        const prompt = cb.buildGuidedTransferPrompt({
          donorBase: scaf.cleanText,
          rawPara: fx.rawPara,
          atoms: fx.atoms,
          heading: fx.heading,
          paraTopology: { role: fx.role },
          blueprint: fx.srcBlueprint,
          donorBlueprint: scaf.blueprint,
          feedback: null
        });
        const numPredict = Math.min(340, Math.max(220, Math.round(scaf.blueprint.wordCount * 4.5)));
        const timeoutMs = contender.isLargeModel ? 300000 : 240000;

        const tStart = Date.now();
        try {
          const genRes = await ollamaClient.generate(activeTag, prompt, {
            system: systemPrompt,
            fewShotMessages,
            temperature: tryPlan[t].temp,
            top_p: 0.88,
            num_ctx: 2048,
            num_predict: numPredict,
            cleanPlainText: true,
            timeoutMs,
            ...contender.opts
          });

          const durMs = genRes.durationMs || (Date.now() - tStart);
          const evCount = genRes.eval_count || 0;
          totalCaseMs += durMs;
          totalInferenceMs += durMs;
          totalGeneratedTokens += evCount;

          let candText = engine.cleanQwenResponse(genRes.response);
          candText = candText.replace(/^["«“]|["»”]$/g, '').replace(/\s+/g, ' ').trim();

          const judge = cb.judgeCarrilBCandidate({
            candidate: candText,
            donorBase: scaf.cleanText,
            rawPara: fx.rawPara,
            atoms: fx.atoms,
            heading: fx.heading,
            factualGuard: fg,
            discourseTopology: dt,
            paraTopology: { role: fx.role },
            domainId: 'optica',
            activeSubdomains: fx.activeSubdomains,
            baselineEntailment: fx.baselineEntailment
          });

          const rec = {
            attempt: t + 1,
            scaffoldId: scaf.brick.brick_id,
            temperature: tryPlan[t].temp,
            durationMs: durMs,
            evalCount: evCount,
            tokensPerSec: durMs > 0 ? Number((evCount / (durMs / 1000)).toFixed(2)) : 0,
            text: candText,
            approved: judge.approved,
            score: judge.score,
            failedGates: judge.failedGates,
            metrics: judge.metrics
          };
          attempts.push(rec);
          if (!bestEntry || rec.score > bestEntry.score) bestEntry = rec;

          console.log(`    Try #${t + 1} (${scaf.brick.brick_id}, ${(durMs / 1000).toFixed(1)}s, ${rec.tokensPerSec} tok/s): ${rec.approved ? 'APROBADO' : `RECHAZADO [${rec.failedGates.join(',')}]`} | LCS=${rec.metrics.functionSkeletonLCS} Entail=${rec.metrics.entailmentScore}% Mask3g=${rec.metrics.maskedSourceTrigramOverlap} Score=${rec.score}`);
          if (rec.approved) {
            approvedEntry = rec;
            break;
          }
        } catch (err) {
          const errDur = Date.now() - tStart;
          totalCaseMs += errDur;
          totalInferenceMs += errDur;
          attempts.push({
            attempt: t + 1,
            scaffoldId: scaf.brick.brick_id,
            durationMs: errDur,
            approved: false,
            score: -100,
            failedGates: ['TIMEOUT_OR_ERR'],
            error: err.message
          });
          console.log(`    Try #${t + 1} ERROR (${(errDur / 1000).toFixed(1)}s): ${err.message}`);
        }
      }

      const finalRec = approvedEntry || bestEntry || {
        score: -100,
        approved: false,
        failedGates: ['NO_OUTPUT'],
        metrics: { functionSkeletonLCS: 0, entailmentScore: 0, maskedSourceTrigramOverlap: 1 }
      };
      caseOutcomes.push({
        caseId: fx.caseId,
        approved: Boolean(approvedEntry),
        approvedAttempt: approvedEntry?.attempt || null,
        totalCaseMs,
        bestScore: finalRec.score,
        bestText: finalRec.text || '',
        bestScaffoldId: finalRec.scaffoldId || null,
        failedGates: finalRec.failedGates || [],
        metrics: finalRec.metrics,
        attempts
      });
    }

    const approvedCount = caseOutcomes.filter(c => c.approved).length;
    const firstTryApprovedCount = caseOutcomes.filter(c => c.approved && c.approvedAttempt === 1).length;
    const avgScore = Number((caseOutcomes.reduce((s, c) => s + c.bestScore, 0) / caseOutcomes.length).toFixed(2));
    const avgLCS = Number((caseOutcomes.reduce((s, c) => s + (c.metrics?.functionSkeletonLCS || 0), 0) / caseOutcomes.length).toFixed(4));
    const avgEntail = Number((caseOutcomes.reduce((s, c) => s + (c.metrics?.entailmentScore || 0), 0) / caseOutcomes.length).toFixed(1));
    const avgDivergence = Number((caseOutcomes.reduce((s, c) => s + (1 - (c.metrics?.maskedSourceTrigramOverlap ?? 1)), 0) / caseOutcomes.length).toFixed(4));
    const avgLatencyMs = Math.round(caseOutcomes.reduce((s, c) => s + c.totalCaseMs, 0) / caseOutcomes.length);
    const avgLatencySec = Number((avgLatencyMs / 1000).toFixed(1));
    const avgTokensPerSec = totalInferenceMs > 0 ? Number((totalGeneratedTokens / (totalInferenceMs / 1000)).toFixed(2)) : 0;
    const cpuViability = classifyCpuViability(avgLatencySec);

    tournamentReport.results.push({
      id: contender.id,
      activeTag,
      family: contender.family,
      keepInstalled: contender.keepInstalled,
      status: 'COMPLETED',
      approvedCount,
      firstTryApprovedCount,
      avgScore,
      avgLCS,
      avgEntail,
      avgDivergence,
      avgLatencyMs,
      avgLatencySec,
      avgTokensPerSec,
      cpuViability,
      cases: caseOutcomes
    });

    await unloadModel(activeTag);
    if (!contender.keepInstalled && pullState.pulled) {
      const del = await ollamaClient.deleteModel(activeTag);
      console.log(`  [CLEANUP] Modelo temporal ${activeTag} eliminado (${del.success ? 'OK' : del.error}) | SSD libre: ${getFreeDiskGB()} GB`);
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(tournamentReport, null, 2), 'utf8');
  }

  const ranked = [...tournamentReport.results].sort((a, b) => {
    if (b.approvedCount !== a.approvedCount) return b.approvedCount - a.approvedCount;
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    if (b.avgLCS !== a.avgLCS) return b.avgLCS - a.avgLCS;
    if (b.avgDivergence !== a.avgDivergence) return b.avgDivergence - a.avgDivergence;
    return a.avgLatencyMs - b.avgLatencyMs;
  });

  tournamentReport.ranking = ranked.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    activeTag: r.activeTag,
    family: r.family,
    approved: `${r.approvedCount}/${fixtures.length}`,
    firstTry: `${r.firstTryApprovedCount}/${fixtures.length}`,
    avgScore: r.avgScore,
    avgLCS: r.avgLCS,
    avgEntail: r.avgEntail,
    avgDivergence: r.avgDivergence,
    avgLatencySec: r.avgLatencySec,
    tokPerSec: r.avgTokensPerSec,
    cpuViability: r.cpuViability,
    status: r.status
  }));
  tournamentReport.finishedAt = new Date().toISOString();

  console.log('\n=== RANKING OFICIAL DEL TORNEO V2 CARRIL B ===');
  console.table(tournamentReport.ranking);

  if (!ONLY_ID) {
    const winner = ranked[0];
    if (winner && winner.status === 'COMPLETED' && winner.activeTag) {
      const installedNow = new Set((await ollamaClient.listModels()).map(m => m.name));
      if (!installedNow.has(winner.activeTag)) {
        console.log(`\n[WINNER_KEEP] Re-descargando ganador #1 (${winner.activeTag}) para dejarlo instalado localmente...`);
        await ollamaClient.pullModel(winner.activeTag);
      }
      tournamentReport.winnerTag = winner.activeTag;
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(tournamentReport, null, 2), 'utf8');
  console.log(`\nResultados guardados en: ${OUT_PATH}`);
}

main().catch((e) => {
  console.error('TORNEO_V2_ERROR:', e);
  process.exit(1);
});
