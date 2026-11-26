'use strict';

require('../../shared/app-paths.cjs');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const PROGRESSIVE_BACKOFF_MS = [
  2000,
  3500,
  5500,
  8000,
  11500,
  15500,
  20500,
  26500,
  34000
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Short 90s circuit-breaker when a model exhausts all 10 attempts so subsequent paragraphs in the same article don't stall 3 min each
const modelCooldownUntil = new Map();
const EXHAUSTED_COOLDOWN_MS = 90000;

function normalizeAIStudioModelId(rawModel) {
  return String(rawModel || '')
    .trim()
    .replace(/^aistudio:/i, '')
    .replace(/^models\//i, '');
}

function isAIStudioModelName(rawModel) {
  const s = String(rawModel || '').trim();
  if (!s) return false;
  if (/^aistudio:/i.test(s)) return true;
  const clean = s.replace(/^models\//i, '');
  // Distinguish AI Studio hyphenated IDs (gemma-4-26b-a4b-it, gemini-3.1-flash-lite) from Ollama tags (gemma3:4b, qwen2.5:1.5b)
  if (clean.includes(':')) return false;
  return /^(?:gemma-4-|gemini-\d)/i.test(clean);
}

function getApiKey() {
  return String(
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_STUDIO_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();
}

function hasApiKey() {
  return getApiKey().length > 10;
}

function getDefaultPrimaryModel() {
  return normalizeAIStudioModelId(process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it');
}

function getConfiguredFallbackModels() {
  const raw = process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.5-flash,gemini-3.1-flash-lite,gemini-3.5-flash-lite';
  return raw
    .split(',')
    .map((m) => normalizeAIStudioModelId(m))
    .filter(Boolean);
}

function getMaxAttemptsPerModel(override) {
  const envVal = Number(process.env.GEMINI_MAX_ATTEMPTS_PER_MODEL || 10);
  const n = override !== undefined && override !== null ? Number(override) : envVal;
  return Number.isFinite(n) && n >= 1 ? Math.min(15, Math.floor(n)) : 10;
}

function buildModelCascade(primaryModel, includeFallbacks = true) {
  const head = normalizeAIStudioModelId(primaryModel || getDefaultPrimaryModel());
  const chain = [head];
  if (includeFallbacks) {
    for (const fb of getConfiguredFallbackModels()) {
      if (fb && !chain.includes(fb)) {
        chain.push(fb);
      }
    }
  }
  return chain;
}

function parseProtoDurationMs(rawDur) {
  if (!rawDur) return null;
  if (typeof rawDur === 'object') {
    const sec = Number(rawDur.seconds || 0);
    const nanos = Number(rawDur.nanos || 0);
    const total = sec * 1000 + Math.round(nanos / 1e6);
    return total > 0 ? total : null;
  }
  const s = String(rawDur).trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m)?$/i);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const unit = (m[2] || 's').toLowerCase();
  if (!Number.isFinite(val) || val <= 0) return null;
  if (unit === 'ms') return Math.round(val);
  if (unit === 'm') return Math.round(val * 60000);
  return Math.round(val * 1000);
}

function extractGoogleRetryDelayMs(res, parsedData, rawBody = '') {
  // 1. Standard HTTP Retry-After header (seconds or HTTP-date)
  if (res && res.headers) {
    const retryAfter = res.headers.get('retry-after');
    if (retryAfter) {
      const asNum = Number(retryAfter.trim());
      if (Number.isFinite(asNum) && asNum > 0) {
        return { suggestedMs: Math.round(asNum * 1000), source: 'header:Retry-After' };
      }
      const asDate = Date.parse(retryAfter);
      if (!Number.isNaN(asDate)) {
        const diff = asDate - Date.now();
        if (diff > 0) return { suggestedMs: diff, source: 'header:Retry-After(date)' };
      }
    }

    for (const hName of ['x-goog-quota-reset-after', 'x-ratelimit-reset-after', 'x-ratelimit-reset']) {
      const hv = res.headers.get(hName);
      if (hv) {
        const num = parseFloat(hv);
        if (Number.isFinite(num) && num > 0) {
          // Distinguish delta seconds (< 3600) vs epoch seconds (> 1e9)
          const ms = num > 1e9 ? Math.max(0, num * 1000 - Date.now()) : Math.round(num * 1000);
          if (ms > 0) return { suggestedMs: ms, source: `header:${hName}` };
        }
      }
    }
  }

  // 2. Google RPC RetryInfo in error.details[]
  const details = parsedData?.error?.details;
  if (Array.isArray(details)) {
    for (const item of details) {
      if (!item || typeof item !== 'object') continue;
      if (item.retryDelay !== undefined) {
        const ms = parseProtoDurationMs(item.retryDelay);
        if (ms && ms > 0) {
          return { suggestedMs: ms, source: 'rpc:RetryInfo.retryDelay' };
        }
      }
      if (item.metadata && typeof item.metadata === 'object') {
        for (const [mk, mv] of Object.entries(item.metadata)) {
          if (/retry|delay|wait|reset/i.test(mk)) {
            const ms = parseProtoDurationMs(mv);
            if (ms && ms > 0) {
              return { suggestedMs: ms, source: `rpc:metadata.${mk}` };
            }
          }
        }
      }
    }
  }

  // 3. Explicit wait hint inside Google error message ("Please retry in 18.42s")
  const msg = `${parsedData?.error?.message || ''} ${rawBody || ''}`;
  const rx = /(?:retry|try\s+again|wait)\s+(?:in|after)\s+(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec|seconds?|m|min|minutes?)/i;
  const m = msg.match(rx);
  if (m) {
    const val = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    if (Number.isFinite(val) && val > 0) {
      let ms = val * 1000;
      if (unit.startsWith('ms') || unit.startsWith('milli')) ms = val;
      else if (unit.startsWith('m')) ms = val * 60000;
      return { suggestedMs: Math.round(ms), source: 'error.message' };
    }
  }

  return { suggestedMs: null, source: null };
}

function computeWaitDurationMs(attemptIndex1Based, metaHint) {
  const jitter = Math.floor(Math.random() * 600);
  if (metaHint && Number.isFinite(metaHint.suggestedMs) && metaHint.suggestedMs > 0) {
    // Respect Google's wait metadata + small safety margin, capped at 90s
    const padded = Math.round(metaHint.suggestedMs) + 500 + jitter;
    return {
      waitMs: Math.min(90000, Math.max(1200, padded)),
      usedMetadata: true,
      source: metaHint.source,
      rawSuggestedMs: metaHint.suggestedMs
    };
  }
  const base = PROGRESSIVE_BACKOFF_MS[Math.min(attemptIndex1Based - 1, PROGRESSIVE_BACKOFF_MS.length - 1)] || 34000;
  return {
    waitMs: base + jitter,
    usedMetadata: false,
    source: 'progressive_backoff',
    rawSuggestedMs: null
  };
}

function buildGenerationConfigForModel(modelId, options = {}) {
  const numPredict = options.num_predict || 260;
  const maxOutputTokens = Math.min(4096, Math.max(512, Math.round(numPredict * 2.5)));
  const cfg = {
    temperature: options.temperature !== undefined ? options.temperature : 0.2,
    topP: options.top_p !== undefined ? options.top_p : 0.88,
    maxOutputTokens
  };
  if (options.top_k !== undefined) {
    cfg.topK = options.top_k;
  }
  // Only attach responseMimeType on Gemini models; on Gemma 4 AI Studio, constrained JSON decoding triggers extra 503s/45s hangs while few-shot JSON works natively
  if (options.format === 'json' && !/^gemma-4-/i.test(modelId)) {
    cfg.responseMimeType = 'application/json';
  }
  // Gemma 4 models enable thinking by default and require thinkingLevel: 'MINIMAL' for fast deterministic surgical generation
  if (/^gemma-4-/i.test(modelId) && options.think !== true) {
    cfg.thinkingConfig = { thinkingLevel: 'MINIMAL' };
  }
  return cfg;
}

function listAvailableCatalogModels() {
  if (!hasApiKey()) return [];
  const primary = getDefaultPrimaryModel();
  const catalog = [
    {
      name: 'gemma-4-26b-a4b-it',
      size: 'Cloud MoE',
      modified_at: null,
      family: 'gemma4-aistudio',
      parameter_size: '26B (4B activos · AI Studio)'
    },
    {
      name: 'gemini-3.1-flash-lite',
      size: 'Cloud Lite',
      modified_at: null,
      family: 'gemini-aistudio',
      parameter_size: 'Respaldo #1 · AI Studio'
    },
    {
      name: 'gemini-3.5-flash-lite',
      size: 'Cloud Lite',
      modified_at: null,
      family: 'gemini-aistudio',
      parameter_size: 'Respaldo #2 · AI Studio'
    },
    {
      name: 'gemma-4-31b-it',
      size: 'Cloud Dense',
      modified_at: null,
      family: 'gemma4-aistudio',
      parameter_size: '31B Denso · AI Studio'
    }
  ];
  // Ensure custom GEMMA_MODEL in .env appears first if not already in list
  if (primary && !catalog.some((c) => c.name === primary)) {
    catalog.unshift({
      name: primary,
      size: 'Cloud',
      modified_at: null,
      family: 'aistudio',
      parameter_size: 'Google AI Studio'
    });
  }
  return catalog;
}

async function generateWithCascade(requestedModel, prompt, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY no configurada en .env para usar Google AI Studio.');
    err.code = 'MISSING_GEMINI_API_KEY';
    throw err;
  }

  const emitLog = typeof options.log === 'function' ? options.log : null;
  const maxAttemptsPerModel = getMaxAttemptsPerModel(options.maxAttemptsPerModel);
  const cascade = buildModelCascade(
    requestedModel,
    options.disableModelCascade !== true
  );

  const sysPrompt = options.system !== undefined
    ? options.system
    : 'Eres un editor morfosintáctico experto en óptica en español. Sigue las instrucciones con precisión absoluta sin inventar datos ni usar formato Markdown.';

  const contents = [];
  if (Array.isArray(options.fewShotMessages)) {
    for (const msg of options.fewShotMessages) {
      if (!msg || !msg.content) continue;
      contents.push({
        role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(msg.content) }]
      });
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: String(prompt || '') }]
  });

  const overallStart = Date.now();
  const attemptHistory = [];
  const timeoutPerAttemptMs = options.perAttemptTimeoutMs || 25000;

  // Order cascade so models NOT in active 90s exhaustion cooldown are tried first (if all are cooling down, try full cascade normally)
  const nowTs = Date.now();
  const activeModels = cascade.filter((m) => (modelCooldownUntil.get(m) || 0) <= nowTs);
  const coolingModels = cascade.filter((m) => (modelCooldownUntil.get(m) || 0) > nowTs);
  const effectiveCascade = activeModels.length > 0 ? [...activeModels, ...coolingModels] : cascade;

  for (let mIdx = 0; mIdx < effectiveCascade.length; mIdx++) {
    const currentModel = effectiveCascade[mIdx];
    let stripThinkingCfg = false;

    if (mIdx === 0 && currentModel !== cascade[0] && emitLog) {
      emitLog(`[AI_STUDIO_COOLDOWN] "${cascade[0]}" agotó recientemente sus 10 intentos (en enfriamiento 90s); usando "${currentModel}" directamente...`);
    } else if (mIdx > 0 && emitLog) {
      emitLog(`[AI_STUDIO_CASCADA] Conmutando a modelo de respaldo #${mIdx}: "${currentModel}" (hasta ${maxAttemptsPerModel} intentos)...`);
    }

    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      const generationConfig = buildGenerationConfigForModel(currentModel, options);
      if (stripThinkingCfg) {
        delete generationConfig.thinkingConfig;
      }

      const payload = {
        ...(sysPrompt ? { systemInstruction: { parts: [{ text: sysPrompt }] } } : {}),
        contents,
        generationConfig
      };

      const callStart = Date.now();
      let res = null;
      let rawText = '';
      let parsed = null;

      try {
        res = await fetch(
          `${API_BASE}/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(timeoutPerAttemptMs)
          }
        );
        rawText = await res.text();
        try { parsed = JSON.parse(rawText); } catch {}
      } catch (netErr) {
        const callMs = Date.now() - callStart;
        attemptHistory.push({
          model: currentModel,
          attempt,
          status: 'NETWORK_TIMEOUT',
          durationMs: callMs,
          error: netErr.message
        });

        if (attempt < maxAttemptsPerModel) {
          const waitInfo = computeWaitDurationMs(attempt, null);
          if (emitLog) {
            emitLog(`[AI_STUDIO_RETRY] ${currentModel} intento ${attempt}/${maxAttemptsPerModel} falló por red/timeout (${netErr.message}). Esperando ${(waitInfo.waitMs / 1000).toFixed(1)}s...`);
          }
          await sleep(waitInfo.waitMs);
          continue;
        }
        break;
      }

      const callMs = Date.now() - callStart;

      if (res.ok) {
        const parts = parsed?.candidates?.[0]?.content?.parts || [];
        const rawResponse = parts
          .filter((p) => !p.thought)
          .map((p) => p.text || '')
          .join('')
          .trim();

        if (!rawResponse) {
          const blockReason = parsed?.promptFeedback?.blockReason || parsed?.candidates?.[0]?.finishReason || 'EMPTY_CANDIDATE';
          attemptHistory.push({
            model: currentModel,
            attempt,
            status: `EMPTY_${blockReason}`,
            durationMs: callMs,
            error: `Respuesta vacía (${blockReason})`
          });
          if (attempt < maxAttemptsPerModel) {
            const waitInfo = computeWaitDurationMs(attempt, null);
            if (emitLog) {
              emitLog(`[AI_STUDIO_RETRY] ${currentModel} intento ${attempt}/${maxAttemptsPerModel} devolvió salida vacía (${blockReason}). Reintentando en ${(waitInfo.waitMs / 1000).toFixed(1)}s...`);
            }
            await sleep(waitInfo.waitMs);
            continue;
          }
          break;
        }

        const usage = parsed?.usageMetadata || {};
        modelCooldownUntil.delete(currentModel);
        return {
          rawResponse,
          durationMs: Date.now() - overallStart,
          netCallMs: callMs,
          eval_count: usage.candidatesTokenCount || 0,
          prompt_eval_count: usage.promptTokenCount || 0,
          thoughts_token_count: usage.thoughtsTokenCount || 0,
          model: currentModel,
          usedFallbackModel: mIdx > 0,
          attemptsTaken: attemptHistory.length + 1,
          attemptHistory
        };
      }

      const status = res.status;
      const errMsg = parsed?.error?.message || rawText.slice(0, 200) || `HTTP ${status}`;

      // Auto-recover if a model rejects thinkingConfig with HTTP 400 without burning an attempt
      if (status === 400 && generationConfig.thinkingConfig && !stripThinkingCfg && /thinking/i.test(errMsg)) {
        stripThinkingCfg = true;
        attempt -= 1;
        continue;
      }

      // Fatal auth error: abort immediately (retrying won't fix an invalid API key)
      if (status === 401 || status === 403 || (status === 400 && /api\s*key\s*not\s*valid/i.test(errMsg))) {
        const authErr = new Error(`Google AI Studio rechazó las credenciales (HTTP ${status}): ${errMsg}`);
        authErr.code = 'AI_STUDIO_AUTH_ERROR';
        authErr.attemptHistory = attemptHistory;
        throw authErr;
      }

      // Model deprecated or invalid argument: jump directly to next fallback model
      if (status === 404 || status === 400) {
        attemptHistory.push({
          model: currentModel,
          attempt,
          status,
          durationMs: callMs,
          error: errMsg
        });
        if (emitLog) {
          emitLog(`[AI_STUDIO_SKIP] ${currentModel} devolvió HTTP ${status} no recuperable (${errMsg.slice(0, 120)}). Saltando al siguiente modelo...`);
        }
        break;
      }

      // Transient server / saturation / rate-limit errors (503, 429, 500, 502, 504)
      const metaHint = extractGoogleRetryDelayMs(res, parsed, rawText);
      attemptHistory.push({
        model: currentModel,
        attempt,
        status,
        durationMs: callMs,
        googleSuggestedWaitMs: metaHint.suggestedMs,
        waitSource: metaHint.source,
        error: errMsg.slice(0, 160)
      });

      if (attempt < maxAttemptsPerModel) {
        const waitInfo = computeWaitDurationMs(attempt, metaHint);
        if (emitLog) {
          const metaLabel = waitInfo.usedMetadata
            ? `metadato Google [${waitInfo.source} = ${(waitInfo.rawSuggestedMs / 1000).toFixed(1)}s]`
            : `backoff progresivo #${attempt}`;
          emitLog(`[AI_STUDIO_RETRY] ${currentModel} intento ${attempt}/${maxAttemptsPerModel} -> HTTP ${status} (${status === 503 ? 'Modelo saturado' : 'Cuota/Servidor'}). Espera (${metaLabel}): ${(waitInfo.waitMs / 1000).toFixed(1)}s...`);
        }
        await sleep(waitInfo.waitMs);
      } else {
        modelCooldownUntil.set(currentModel, Date.now() + EXHAUSTED_COOLDOWN_MS);
        if (emitLog) {
          emitLog(`[AI_STUDIO_AGOTADO] ${currentModel} agotó los ${maxAttemptsPerModel} intentos consecutivos (último: HTTP ${status}) -> enfriamiento 90s.`);
        }
      }
    }
  }

  const modelsSummary = cascade.map((m) => {
    const tries = attemptHistory.filter((a) => a.model === m);
    const codes = [...new Set(tries.map((t) => t.status))].join(',');
    return `${m} (${tries.length} intentos: ${codes || 'sin respuesta'})`;
  }).join(' -> ');

  const exhaustedErr = new Error(
    `Fallo definitivo en Google AI Studio tras agotar todos los modelos y reintentos: ${modelsSummary}.`
  );
  exhaustedErr.code = 'AI_STUDIO_ALL_MODELS_EXHAUSTED';
  exhaustedErr.cascade = cascade;
  exhaustedErr.attemptHistory = attemptHistory;
  throw exhaustedErr;
}

module.exports = {
  isAIStudioModelName,
  normalizeAIStudioModelId,
  hasApiKey,
  getDefaultPrimaryModel,
  getConfiguredFallbackModels,
  getMaxAttemptsPerModel,
  buildModelCascade,
  extractGoogleRetryDelayMs,
  computeWaitDurationMs,
  listAvailableCatalogModels,
  generateWithCascade
};
