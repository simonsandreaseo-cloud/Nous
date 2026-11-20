'use strict';

const fs = require('fs');
const path = require('path');
const humanizationEngine = require('../features/humanization-pipeline/humanize-article.cjs');
const ollamaClient = require('../features/local-llm-ollama/ollama-local-client.cjs');
const bankGapTracker = require('../features/donor-bank/bank-coverage-gap-tracker.cjs');
const domainRegistry = require('../features/donor-bank/domain-packs-registry.cjs');
const supabaseSync = require('../features/supabase-cloud-sync/supabase-tasks-sync.cjs');
const { writeLog, getRecentLogs, clearRuntimeLogs, getLogFilePath } = require('./runtime-logger.cjs');

function registerIpcHandlers(ipcMain, shell, getMainWindow) {
  ipcMain.handle('humanize-neurosymbolic', async (event, inputText, options = {}) => {
    try {
      writeLog('NEURO_ENGINE', `=== INICIO PROCESO DE HUMANIZACIÓN (${inputText.length} chars) ===`);

      const logCallback = (msg) => {
        writeLog('NEURO_ENGINE', msg);
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send('agent-event', { event: 'log', data: msg, timestamp: Date.now() });
        }
      };

      const result = await humanizationEngine.humanizeArticle(inputText, options, logCallback);

      if (result && result.bankEmptyForDomain) {
        return {
          success: false,
          bankEmptyForDomain: true,
          domainId: result.domainId,
          domainLabel: result.domainLabel,
          message: result.message
        };
      }

      return {
        success: true,
        text: result.text,
        output: result.text,
        paragraphCount: result.paragraphCount,
        wordCount: result.wordCount,
        bankCoverageReport: result.bankCoverageReport || [],
        auditTrail: result.auditTrail || [],
        metrics: {
          wordCount: result.wordCount,
          burstiness: result.metrics?.burstinessSigma || 0,
          avgSentenceLength: result.metrics?.avgSentenceLength || 0,
          plagiarismRunsCount: result.metrics?.shingleViolationsCount || 0,
          divergencePct: result.metrics?.divergencePct ?? null,
          uniqueDonorDomains: result.metrics?.uniqueDonorDomains ?? 0,
          centeringTransitions: result.metrics?.centeringTransitions || null,
          avgCoverageScore: result.metrics?.avgCoverageScore ?? 100,
          bankCoverageGapsCount: result.metrics?.bankCoverageGapsCount ?? 0,
          criticalGapsCount: result.metrics?.criticalGapsCount ?? 0,
          mediumGapsCount: result.metrics?.mediumGapsCount ?? 0,
          bankGapRegistrySummary: result.metrics?.bankGapRegistrySummary || null,
          qwenStats: result.metrics?.qwenStats || null,
          carrilBStats: result.metrics?.carrilBStats || null
        }
      };
    } catch (err) {
      writeLog('ERROR', `Error en humanizeArticle: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  });

  ipcMain.handle('scan-metrics', async (event, text) => {
    const burstiness = humanizationEngine.calculateBurstiness(text);
    const shingles = humanizationEngine.checkPlagiarismShingles(text, 7);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return {
      wordCount: words,
      burstiness: burstiness.sigma,
      avgSentenceLength: burstiness.avg,
      shingleViolationsCount: shingles.length,
      shingleViolations: shingles
    };
  });

  // Local Ollama IPC Handlers
  ipcMain.handle('ollama-status', async () => {
    const available = await ollamaClient.isAvailable();
    const models = available ? await ollamaClient.listModels() : [];
    return { available, models };
  });

  ipcMain.handle('ollama-models', async () => {
    return await ollamaClient.listModels();
  });

  ipcMain.handle('ollama-pull', async (event, modelName) => {
    writeLog('OLLAMA', `Descargando modelo: ${modelName}`);
    return await ollamaClient.pullModel(modelName, (prog) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('ollama-progress', prog);
      }
    });
  });

  ipcMain.handle('get-personas', async () => {
    return [
      {
        id: 'neurosymbolic-qwen',
        name: 'Qwen 2.5 + Donantes Pre-2022',
        title: 'Adaptador de Micro-Slots Sintácticos',
        corpus: `${humanizationEngine.masterBricks.length} ladrillos biológicos (< 2022-01-01)`,
        status: 'Activo',
        specialty: 'Micro-adaptación morfosintáctica pura sin alucinación ni cambio estructural',
        avatar: '🧬'
      },
      {
        id: 'auditor-shingling',
        name: 'Auditor Cero-Plagio & Burstiness',
        title: 'Supervisor de Perplejidad y Ruptura',
        corpus: 'Auditoría de solapamientos N-gram <= 6 tokens, burstiness y cobertura fáctica',
        status: 'Activo',
        specialty: 'Control de calidad, inyección de glitches asimétricos y veto anti-outro',
        avatar: '🛡️'
      }
    ];
  });

  // Logs IPC Handlers
  ipcMain.handle('get-recent-logs', async () => getRecentLogs());
  ipcMain.handle('clear-runtime-logs', async () => clearRuntimeLogs());
  ipcMain.handle('open-log-folder', () => {
    shell.showItemInFolder(getLogFilePath());
    return true;
  });

  // Bank Coverage Radar, Cross-Article Rotation & Hot Reload
  ipcMain.handle('get-domain-packs', async () => {
    const liveCounts = humanizationEngine.isLoaded
      ? { optica: humanizationEngine.masterBricks.length }
      : null;
    return domainRegistry.listDomainPacks(liveCounts);
  });

  ipcMain.handle('get-bank-stats', async () => {
    if (!humanizationEngine.isLoaded) humanizationEngine.loadBanks();
    const stats = humanizationEngine.getBankStats();
    return {
      ...stats,
      gapStats: bankGapTracker.loadRegistry().stats,
      usageStats: bankGapTracker.getUsageStats(stats.usableCleanBlocks || null)
    };
  });

  ipcMain.handle('reload-bank', async () => {
    const stats = humanizationEngine.reloadBanks();
    writeLog('SYSTEM', `Banco Pre-2022 recargado en caliente: ${stats.masterBricks} ladrillos maestros (${stats.usableCleanBlocks ?? '?'} bloques multi-oración utilizables).`);
    return {
      ...stats,
      gapStats: bankGapTracker.loadRegistry().stats,
      usageStats: bankGapTracker.getUsageStats(stats.usableCleanBlocks || null)
    };
  });

  ipcMain.handle('get-donor-usage', async () => {
    if (!humanizationEngine.isLoaded) humanizationEngine.loadBanks();
    const stats = humanizationEngine.getBankStats();
    return bankGapTracker.getUsageStats(stats.usableCleanBlocks || null);
  });

  ipcMain.handle('reset-donor-usage', async () => {
    bankGapTracker.resetUsageLedger();
    if (!humanizationEngine.isLoaded) humanizationEngine.loadBanks();
    const stats = humanizationEngine.getBankStats();
    writeLog('SYSTEM', 'Historial de rotación de donantes entre artículos reiniciado por el usuario.');
    return bankGapTracker.getUsageStats(stats.usableCleanBlocks || null);
  });

  ipcMain.handle('get-bank-gaps', async () => bankGapTracker.loadRegistry());
  ipcMain.handle('update-bank-gap-status', async (event, gapId, status) => bankGapTracker.markGapStatus(gapId, status));
  ipcMain.handle('clear-resolved-bank-gaps', async () => bankGapTracker.clearResolvedGaps());
  ipcMain.handle('export-bank-gaps-brief', async (event, maxGaps = 12) => bankGapTracker.buildHarvesterTaskBrief(maxGaps));

  ipcMain.handle('open-bank-gaps-file', async () => {
    if (!fs.existsSync(bankGapTracker.REPORT_MD_PATH)) {
      const reg = bankGapTracker.loadRegistry();
      fs.mkdirSync(path.dirname(bankGapTracker.REPORT_MD_PATH), { recursive: true });
      fs.writeFileSync(bankGapTracker.REGISTRY_PATH, JSON.stringify(reg, null, 2), 'utf8');
    }
    const target = fs.existsSync(bankGapTracker.REPORT_MD_PATH)
      ? bankGapTracker.REPORT_MD_PATH
      : path.dirname(bankGapTracker.REGISTRY_PATH);
    shell.showItemInFolder(target);
    return true;
  });

  // Supabase Nous Cloud IPC Handlers
  ipcMain.handle('supabase-get-projects', async () => {
    try {
      return await supabaseSync.fetchProjects();
    } catch (e) {
      console.error('[Supabase] Error en get-projects:', e.message);
      throw e;
    }
  });

  ipcMain.handle('supabase-get-tasks', async (event, projectId, status) => {
    try {
      return await supabaseSync.fetchTasks(projectId, status);
    } catch (e) {
      console.error('[Supabase] Error en get-tasks:', e.message);
      throw e;
    }
  });

  ipcMain.handle('supabase-get-task-body', async (event, taskId) => {
    try {
      return await supabaseSync.fetchTaskBody(taskId);
    } catch (e) {
      console.error('[Supabase] Error en get-task-body:', e.message);
      throw e;
    }
  });

  ipcMain.handle('supabase-save-task', async (event, { taskId, contentBody, aiPercentage, status, metrics }) => {
    try {
      return await supabaseSync.saveHumanizedTask(taskId, contentBody, aiPercentage, status, metrics);
    } catch (e) {
      console.error('[Supabase] Error en save-task:', e.message);
      throw e;
    }
  });
}

module.exports = {
  registerIpcHandlers
};
