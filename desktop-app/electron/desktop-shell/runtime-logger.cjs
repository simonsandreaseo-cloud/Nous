'use strict';

const fs = require('fs');
const path = require('path');
const { LOGS_DIR } = require('../shared/app-paths.cjs');

const logFilePath = path.join(LOGS_DIR, 'nous_runtime.log');
let logStream = null;
let initialized = false;

function ensureStream() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  if (!logStream) {
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  }
  return logStream;
}

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
    ensureStream().write(logLine);
  } catch (e) {}
  if (level === 'ERROR' || level === 'FATAL') {
    process.stderr.write(logLine);
  } else {
    process.stdout.write(logLine);
  }
}

function initRuntimeLogger() {
  if (initialized) return;
  initialized = true;
  ensureStream();

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
}

function getRecentLogs() {
  if (fs.existsSync(logFilePath)) {
    const content = fs.readFileSync(logFilePath, 'utf8');
    const lines = content.split('\n');
    return lines.slice(-1500).join('\n');
  }
  return 'Sin registros disponibles.';
}

async function clearRuntimeLogs() {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    fs.writeFileSync(logFilePath, `[${new Date().toISOString()}] [SYSTEM] Logs reiniciados por el usuario.\n`, 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function getLogFilePath() {
  return logFilePath;
}

module.exports = {
  initRuntimeLogger,
  writeLog,
  getRecentLogs,
  clearRuntimeLogs,
  getLogFilePath
};
