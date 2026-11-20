'use strict';

const { BrowserWindow } = require('electron');
const { DIST_INDEX_HTML, PRELOAD_SCRIPT } = require('../shared/app-paths.cjs');
const { writeLog } = require('./runtime-logger.cjs');

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1050,
    minHeight: 720,
    title: 'NOUS - Motor Neuro-Simbólico de Humanización Pre-2022',
    backgroundColor: '#0d0f17',
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.webContents.on('console-message', (detailsOrEvent, level, message, line) => {
    if (detailsOrEvent && typeof detailsOrEvent === 'object' && 'message' in detailsOrEvent) {
      writeLog('RENDERER', `[Line ${detailsOrEvent.lineNumber ?? '?'}] ${detailsOrEvent.message}`);
    } else {
      writeLog('RENDERER', `[Line ${line ?? '?'}] ${message}`);
    }
  });

  const devUrl = process.env.VITE_DEV_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null);

  if (devUrl) {
    win.loadURL(devUrl).catch(() => {
      win.loadFile(DIST_INDEX_HTML);
    });
  } else {
    win.loadFile(DIST_INDEX_HTML);
  }

  return win;
}

module.exports = {
  createMainWindow
};
