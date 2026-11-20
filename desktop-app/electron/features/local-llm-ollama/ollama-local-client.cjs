const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

class OllamaClient {
  constructor(baseUrl = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl;
    const logical = (os.cpus() || []).length || 4;
    this.defaultThreads = Math.max(2, Math.min(8, Math.floor(logical / 2) || logical));
  }

  async isAvailable() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2500) });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async ensureServerRunning(logFn = null) {
    const emit = (msg) => {
      if (typeof logFn === 'function') logFn(msg);
    };

    const alreadyUp = await this.isAvailable();
    if (alreadyUp) {
      const models = await this.listModels();
      const modelList = models.length ? models.map(m => `${m.name} (${m.parameter_size})`).join(', ') : 'ninguno';
      emit(`[OLLAMA] Conectado en ${this.baseUrl} | Modelos detectados: ${modelList}`);
      return { available: true, models, startedByApp: false };
    }

    emit(`[OLLAMA] Servicio no detectado en ${this.baseUrl}. Intentando iniciar servidor local en segundo plano...`);

    const localExe = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe')
      : null;
    const exePath = (localExe && fs.existsSync(localExe)) ? localExe : 'ollama';

    try {
      const child = spawn(exePath, ['serve'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
    } catch (err) {
      emit(`[OLLAMA] Error lanzando ejecutable (${exePath}): ${err.message}`);
      return { available: false, models: [], startedByApp: false, error: err.message };
    }

    const maxWaitMs = 25000;
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await new Promise(r => setTimeout(r, 400));
      if (await this.isAvailable()) {
        const models = await this.listModels();
        const modelList = models.length ? models.map(m => `${m.name} (${m.parameter_size})`).join(', ') : 'ninguno';
        emit(`[OLLAMA] Servidor iniciado (${Date.now() - start}ms) | Modelos detectados: ${modelList}`);
        return { available: true, models, startedByApp: true };
      }
    }

    emit(`[OLLAMA] Timeout (${maxWaitMs}ms): Ollama no respondió en ${this.baseUrl}.`);
    return { available: false, models: [], startedByApp: false, error: 'Timeout esperando servidor Ollama' };
  }

  async listModels() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map(m => ({
        name: m.name,
        size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'N/A',
        modified_at: m.modified_at,
        family: m.details?.family || 'unknown',
        parameter_size: m.details?.parameter_size || 'unknown'
      }));
    } catch (e) {
      return [];
    }
  }

  async pullModel(modelName, onProgress = null) {
    try {
      const res = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true })
      });

      if (!res.ok) {
        throw new Error(`Error en descarga de modelo ${modelName}: HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (onProgress) onProgress(parsed);
          } catch (err) {}
        }
      }
      return { success: true, model: modelName };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  cleanResponseText(text, cleanPlainText = false) {
    let out = (text || '').trim();
    // Remove residual reasoning <think>...</think> blocks if present (e.g. Qwen 3)
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Strip markdown code fences if the model wrapped the answer
    out = out.replace(/^```(?:[a-zA-Z0-9_-]+)?\s*\r?\n([\s\S]*?)\r?\n```$/i, '$1').trim();
    if (out.startsWith('{') && out.endsWith('}')) {
      try {
        const parsed = JSON.parse(out);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.parrafo === 'string') out = parsed.parrafo.trim();
          else if (typeof parsed.texto === 'string') out = parsed.texto.trim();
          else if (Array.isArray(parsed.hechos)) out = parsed.hechos.map(h => String(h).trim()).filter(Boolean).join('\n');
        }
      } catch (e) {}
    }
    if (cleanPlainText) {
      if (
        (out.startsWith('"') && out.endsWith('"')) ||
        (out.startsWith("'") && out.endsWith("'")) ||
        (out.startsWith('«') && out.endsWith('»')) ||
        (out.startsWith('“') && out.endsWith('”'))
      ) {
        out = out.slice(1, -1).trim();
      }
      out = out.replace(/^(?:SALIDA|RESULTADO|TEXTO COMPILADO|TEXTO REESCRITO|PÁRRAFO FINAL|CORREGIDO|HECHOS|RESPUESTA)\s*:\s*/i, '').trim();
    }
    return out;
  }

  async generate(model, prompt, options = {}) {
    const startTime = Date.now();
    const useRawGenerate = Boolean(options.useRawGenerate);
    const sysPrompt = options.system !== undefined
      ? options.system
      : 'Eres un editor morfosintáctico experto en óptica y moda en español. Sigue las instrucciones con precisión absoluta sin inventar datos ni usar formato Markdown.';

    const ollamaOptions = {
      temperature: options.temperature !== undefined ? options.temperature : 0.15,
      top_p: options.top_p !== undefined ? options.top_p : 0.8,
      top_k: options.top_k !== undefined ? options.top_k : 20,
      repeat_penalty: options.repeat_penalty !== undefined ? options.repeat_penalty : 1.05,
      num_ctx: options.num_ctx || 1024,
      num_batch: options.num_batch || 256,
      num_thread: options.num_thread || this.defaultThreads,
      num_predict: options.num_predict || 200,
      ...options.rawOptions
    };

    const payload = useRawGenerate
      ? {
          model,
          prompt,
          stream: false,
          keep_alive: options.keep_alive || '10m',
          options: ollamaOptions
        }
      : {
          model,
          messages: [
            ...(sysPrompt ? [{ role: 'system', content: sysPrompt }] : []),
            ...(Array.isArray(options.fewShotMessages) ? options.fewShotMessages : []),
            { role: 'user', content: prompt }
          ],
          stream: false,
          keep_alive: options.keep_alive || '10m',
          options: ollamaOptions
        };

    if (options.format) {
      payload.format = options.format;
    }
    if (options.think === false || (/^qwen3/i.test(String(model || '')) && options.think !== true)) {
      payload.think = false;
    }

    const endpoint = useRawGenerate ? `${this.baseUrl}/api/generate` : `${this.baseUrl}/api/chat`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.timeoutMs || 120000)
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Error en inferencia Ollama: HTTP ${res.status}${errBody ? ` - ${errBody.slice(0, 160)}` : ''}`);
      }

      const data = await res.json();
      const durationMs = Date.now() - startTime;
      const rawResponse = (data.message?.content ?? data.response ?? '').trim();
      const response = this.cleanResponseText(rawResponse, !!options.cleanPlainText);

      return {
        response,
        rawResponse,
        total_duration: data.total_duration,
        durationMs,
        eval_count: data.eval_count || 0,
        prompt_eval_count: data.prompt_eval_count || 0,
        model: data.model || model
      };
    } catch (e) {
      throw e;
    }
  }

  async deleteModel(modelName) {
    try {
      const res = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(15000)
      });
      return { success: res.ok, status: res.status };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = new OllamaClient();
