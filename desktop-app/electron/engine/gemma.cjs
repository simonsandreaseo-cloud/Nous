const fs = require('fs');
const path = require('path');

let apiKey = process.env.GEMINI_API_KEY || '';

// Load from .env if not set
if (!apiKey) {
  const envPaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(process.cwd(), '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/);
      if (match) {
        apiKey = match[1].trim();
        break;
      }
    }
  }
}

// Load .env explicitly to guarantee GEMMA_MODEL is always loaded
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  const keyMatch = content.match(/GEMINI_API_KEY=([^\r\n]+)/);
  if (keyMatch) apiKey = keyMatch[1].trim();
  const modelMatch = content.match(/GEMMA_MODEL=([^\r\n]+)/);
  if (modelMatch) process.env.GEMMA_MODEL = modelMatch[1].trim();
}

const MODEL_NAME = 'gemma-4-31b-it';
const FALLBACK_MODELS = ['gemma-4-31b-it'];

function extractCleanParagraph(text) {
  if (!text) return '';
  let trimmed = text.trim();
  
  // Patrón 1: Si Gemma encapsuló la respuesta en etiquetas delimitadoras <texto_adaptado>...</texto_adaptado>
  const tagMatch = trimmed.match(/<texto_adaptado>([\s\S]*?)<\/texto_adaptado>/i);
  if (tagMatch) {
    trimmed = tagMatch[1].trim();
  }

  // Remove markdown code fences if wrapped in ``` ... ```
  trimmed = trimmed.replace(/^```[a-z]*\s*|\s*```$/gi, '').trim();

  // If the model wrapped the ENTIRE result in quotes, unwrap them safely
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('«') && trimmed.endsWith('»')) ||
      (trimmed.startsWith('“') && trimmed.endsWith('”'))) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // Remove common AI preambles if present at the very beginning
  trimmed = trimmed.replace(/^(?:aquí tienes|resultado|texto adaptado|versión final|texto base modificado)[\s\S]*?:\s*\n*/i, '').trim();

  return trimmed;
}

async function generateWithGemma(prompt, options = {}, retries = 5) {
  const key = options.apiKey || apiKey;
  if (!key) {
    throw new Error('API Key de Google AI Studio no configurada.');
  }

  const modelCandidates = options.model ? [options.model] : FALLBACK_MODELS;
  let lastError = null;

  for (const model of modelCandidates) {
    let attempt = 0;
    const maxAttempts = retries;

    while (attempt < maxAttempts) {
      attempt++;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const generationConfig = {
        temperature: options.temperature ?? 0.15,
        topP: options.topP ?? 0.95
      };

      // Si se especifica un límite manual se envía; si no, se deja sin tope artificial
      // (Gemma 4 31B puede usar libremente hasta su límite arquitectónico nativo de 32.768 tokens)
      if (options.maxTokens) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }

      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig
      };

      const startTime = Date.now();

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(options.timeoutMs || 300000)
        });

        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          
          // Verificar si Google envía encabezado Retry-After o información de espera
          let waitSeconds = 0;
          const retryHeader = response.headers.get('retry-after');
          if (retryHeader) {
            waitSeconds = parseInt(retryHeader, 10);
            if (isNaN(waitSeconds)) {
              const retryDate = new Date(retryHeader).getTime();
              waitSeconds = Math.max(0, Math.ceil((retryDate - Date.now()) / 1000));
            }
          }

          // Si el cuerpo JSON incluye mensaje con segundos o cuota
          if (!waitSeconds && /try again in ([0-9]+(?:\.[0-9]+)?)\s*s/i.test(errorText)) {
            const m = errorText.match(/try again in ([0-9]+(?:\.[0-9]+)?)\s*s/i);
            if (m) waitSeconds = Math.ceil(parseFloat(m[1]));
          }

          // Para 503, 429 o 500 (Internal error transitorio de Google): reintento con espera inteligente + 1s de margen
          if (response.status === 503 || response.status === 429 || response.status === 500) {
            const finalWaitSec = (waitSeconds > 0 ? waitSeconds : (attempt * 4 + 2)) + 1;
            console.warn(`[Gemma 4 31B] Error transitorio del servidor (${response.status}: ${errorText.slice(0, 100)}). Esperando ${finalWaitSec}s antes de reintentar (Intento ${attempt}/${maxAttempts})...`);
            await new Promise(r => setTimeout(r, finalWaitSec * 1000));
            continue;
          }

          console.warn(`[Gemma 4 31B] Error HTTP ${response.status} tras ${latencyMs}ms: ${errorText}`);
          lastError = new Error(`HTTP ${response.status}: ${errorText}`);
          break;
        }

        const data = await response.json();
      const candidate = data.candidates?.[0];
      if (!candidate) {
        console.warn(`[Model ${model}] No devolvió candidatos. Probando siguiente modelo...`);
        continue;
      }

      const parts = candidate.content?.parts || [];
      let chosenText = '';
      let thoughts = '';

      for (const part of parts) {
        if (part.thought) {
          thoughts += (part.text || '') + '\n';
        }
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        if (!parts[i].thought && parts[i].text) {
          chosenText = parts[i].text;
          break;
        }
      }

      // Si el modelo solo produjo tokens de pensamiento (thought: true) y se cortó antes de emitir la respuesta final,
      // NUNCA debemos usar el thought como texto final porque contaminaría el texto con el rastro de razonamiento.
      if (!chosenText) {
        console.warn(`[Gemma 4 31B] El modelo generó razonamiento pero no emitió el párrafo final. Reintentando...`);
        continue;
      }

      const cleaned = extractCleanParagraph(chosenText);
      if (!cleaned) {
        continue;
      }

      const result = {
        text: cleaned,
        rawText: chosenText,
        thoughts: thoughts.trim(),
        latencyMs,
        durationSec: (latencyMs / 1000).toFixed(2),
        usage: data.usageMetadata || {},
        model: model
      };

      if (options.legacyString) {
        return cleaned;
      }
      return result;

    } catch (err) {
      console.warn(`[Gemma 4 31B] Fallo o timeout: ${err.message}`);
      lastError = err;
    }
  } // fin while attempts
} // fin for modelCandidates

  throw lastError || new Error('Gemma 4 31B no respondió o alcanzó timeout.');
}

module.exports = {
  generateWithGemma,
  getModelName: () => MODEL_NAME,
  setApiKey: (key) => { apiKey = key; }
};
