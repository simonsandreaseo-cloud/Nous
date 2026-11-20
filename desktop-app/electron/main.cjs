const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure Logs Directory
const logsDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path.join(logsDir, 'nous_runtime.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function writeLog(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length ? args.map(a => {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object' && a !== null) {
      try { return JSON.stringify(a); } catch { return String(a); }
    }
    return a;
  }).join(' ') : '';
  const logLine = `[${timestamp}] [${level}] ${message} ${formattedArgs}`.trim() + '\n';
  try {
    logStream.write(logLine);
  } catch (e) {}
  if (level === 'ERROR' || level === 'FATAL') {
    process.stderr.write(logLine);
  } else {
    process.stdout.write(logLine);
  }
}

console.log = (msg, ...args) => writeLog('INFO', msg, ...args);
console.error = (msg, ...args) => writeLog('ERROR', msg, ...args);
console.warn = (msg, ...args) => writeLog('WARN', msg, ...args);

process.on('uncaughtException', (err) => {
  writeLog('FATAL', `Uncaught Exception: ${err.stack || err.message}`);
});

process.on('unhandledRejection', (reason) => {
  writeLog('FATAL', `Unhandled Rejection: ${reason && (reason.stack || reason.message || reason)}`);
});

writeLog('SYSTEM', '=======================================================');
writeLog('SYSTEM', 'Iniciando NOUS - Motor Neuro-Simbólico de Humanización');
writeLog('SYSTEM', `Node: ${process.version}, Electron: ${process.versions.electron}`);
writeLog('SYSTEM', `Log File: ${logFilePath}`);
writeLog('SYSTEM', '=======================================================');

const neuroEngine = require('./engine/neurosymbolic-engine.cjs');
const ollamaClient = require('./engine/ollama-client.cjs');
const bankGapTracker = require('./engine/bank-gap-tracker.cjs');
const domainRegistry = require('./engine/domain-registry.cjs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1050,
    minHeight: 720,
    title: 'NOUS - Motor Neuro-Simbólico de Humanización Pre-2022',
    backgroundColor: '#0d0f17',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    writeLog('RENDERER', `[Line ${line}] ${message}`);
  });

  const distHtmlPath = path.join(__dirname, '../dist/index.html');
  const devUrl = process.env.VITE_DEV_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null);

  if (devUrl) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(distHtmlPath);
    });
  } else {
    mainWindow.loadFile(distHtmlPath);
  }
}

app.whenReady().then(() => {
  // Pre-load Master Biological Donors Bank
  try {
    neuroEngine.loadBanks();
  } catch (err) {
    console.error('Error pre-loading neurosymbolic banks:', err);
  }

  // Neurosymbolic IPC Handlers
  ipcMain.handle('humanize-neurosymbolic', async (event, inputText, options = {}) => {
    try {
      writeLog('NEURO_ENGINE', `=== INICIO PROCESO DE HUMANIZACIÓN (${inputText.length} chars) ===`);
      
      const logCallback = (msg) => {
        writeLog('NEURO_ENGINE', msg);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('agent-event', { event: 'log', data: msg, timestamp: Date.now() });
        }
      };

      const result = await neuroEngine.humanizeArticle(inputText, options, logCallback);

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
    const burstiness = neuroEngine.calculateBurstiness(text);
    const shingles = neuroEngine.checkPlagiarismShingles(text, 7);
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
      if (mainWindow) {
        mainWindow.webContents.send('ollama-progress', prog);
      }
    });
  });

  ipcMain.handle('get-personas', async () => {
    return [
      {
        id: 'neurosymbolic-qwen',
        name: 'Qwen 2.5 + Donantes Pre-2022',
        title: 'Adaptador de Micro-Slots Sintácticos',
        corpus: `${neuroEngine.masterBricks.length} ladrillos biológicos (< 2022-01-01)`,
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
  ipcMain.handle('get-recent-logs', async () => {
    if (fs.existsSync(logFilePath)) {
      const content = fs.readFileSync(logFilePath, 'utf8');
      const lines = content.split('\n');
      // Return up to 1500 lines so that reasoning and texts are never truncated
      return lines.slice(-1500).join('\n');
    }
    return 'Sin registros disponibles.';
  });

  ipcMain.handle('clear-runtime-logs', async () => {
    try {
      fs.writeFileSync(logFilePath, `[${new Date().toISOString()}] [SYSTEM] Logs reiniciados por el usuario.\n`, 'utf8');
      return true;
    } catch (e) {
      return false;
    }
  });

  ipcMain.handle('open-log-folder', () => {
    shell.showItemInFolder(logFilePath);
    return true;
  });

  // Radar de Huecos del Banco, Rotación Inter-Artículo & Recarga en Caliente
  ipcMain.handle('get-domain-packs', async () => {
    return domainRegistry.listDomainPacks();
  });

  ipcMain.handle('get-bank-stats', async () => {
    if (!neuroEngine.isLoaded) neuroEngine.loadBanks();
    const stats = neuroEngine.getBankStats();
    return {
      ...stats,
      gapStats: bankGapTracker.loadRegistry().stats,
      usageStats: bankGapTracker.getUsageStats(stats.usableCleanBlocks || null)
    };
  });

  ipcMain.handle('reload-bank', async () => {
    const stats = neuroEngine.reloadBanks();
    writeLog('SYSTEM', `Banco Pre-2022 recargado en caliente: ${stats.masterBricks} ladrillos maestros (${stats.usableCleanBlocks ?? '?'} bloques multi-oración utilizables).`);
    return {
      ...stats,
      gapStats: bankGapTracker.loadRegistry().stats,
      usageStats: bankGapTracker.getUsageStats(stats.usableCleanBlocks || null)
    };
  });

  ipcMain.handle('get-donor-usage', async () => {
    if (!neuroEngine.isLoaded) neuroEngine.loadBanks();
    const stats = neuroEngine.getBankStats();
    return bankGapTracker.getUsageStats(stats.usableCleanBlocks || null);
  });

  ipcMain.handle('reset-donor-usage', async () => {
    bankGapTracker.resetUsageLedger();
    if (!neuroEngine.isLoaded) neuroEngine.loadBanks();
    const stats = neuroEngine.getBankStats();
    writeLog('SYSTEM', 'Historial de rotación de donantes entre artículos reiniciado por el usuario.');
    return bankGapTracker.getUsageStats(stats.usableCleanBlocks || null);
  });

  ipcMain.handle('get-bank-gaps', async () => {
    return bankGapTracker.loadRegistry();
  });

  ipcMain.handle('update-bank-gap-status', async (event, gapId, status) => {
    return bankGapTracker.markGapStatus(gapId, status);
  });

  ipcMain.handle('clear-resolved-bank-gaps', async () => {
    return bankGapTracker.clearResolvedGaps();
  });

  ipcMain.handle('export-bank-gaps-brief', async (event, maxGaps = 12) => {
    return bankGapTracker.buildHarvesterTaskBrief(maxGaps);
  });

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
  const supabaseSync = require('./engine/supabase-sync.cjs');

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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
