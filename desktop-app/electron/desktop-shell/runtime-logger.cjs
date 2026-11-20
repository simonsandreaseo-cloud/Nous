'use strict';

const fs = require('fs');
const path = require('path');
const { LOGS_DIR } = require('../shared/app-paths.cjs');

const logFilePath = path.join(LOGS_DIR, 'nous_runtime.log');
const prevLogFilePath = path.join(LOGS_DIR, 'nous_runtime.prev.log');
const MAX_LOG_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

let logStream = null;
let initialized = false;

function rotateLogIfOversized() {
  try {
    if (fs.existsSync(logFilePath)) {
      const stat = fs.statSync(logFilePath);
      if (stat.size > MAX_LOG_FILE_BYTES) {
        if (fs.existsSync(prevLogFilePath)) {
          fs.unlinkSync(prevLogFilePath);
        }
        fs.renameSync(logFilePath, prevLogFilePath);
      }
    }
  } catch (e) {}
}

function ensureStream() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  if (!logStream) {
    rotateLogIfOversized();
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

function getRecentLogs(maxLines = 1500, maxBytes = 256 * 1024) {
  if (!fs.existsSync(logFilePath)) {
    return 'Sin registros disponibles.';
  }
  let fd = null;
  try {
    const stat = fs.statSync(logFilePath);
    if (stat.size === 0) return 'Sin registros disponibles.';
    const readSize = Math.min(stat.size, maxBytes);
    const startOffset = stat.size - readSize;
    const buffer = Buffer.allocUnsafe(readSize);
    fd = fs.openSync(logFilePath, 'r');
    fs.readSync(fd, buffer, 0, readSize, startOffset);
    let content = buffer.toString('utf8');
    if (startOffset > 0) {
      const firstNl = content.indexOf('\n');
      if (firstNl !== -1) content = content.slice(firstNl + 1);
    }
    const lines = content.split('\n');
    return lines.slice(-maxLines).join('\n');
  } catch (e) {
    return `Error leyendo logs: ${e.message}`;
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (e) {}
    }
  }
}

async function clearRuntimeLogs() {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    if (logStream) {
      const activeStream = logStream;
      logStream = null;
      await new Promise((resolve) => activeStream.end(resolve));
    }
    fs.writeFileSync(logFilePath, `[${new Date().toISOString()}] [SYSTEM] Logs reiniciados por el usuario.\n`, 'utf8');
    ensureStream();
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
