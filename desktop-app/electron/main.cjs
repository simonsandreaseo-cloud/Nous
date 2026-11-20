'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { initRuntimeLogger } = require('./desktop-shell/runtime-logger.cjs');

initRuntimeLogger();

const humanizationEngine = require('./features/humanization-pipeline/humanize-article.cjs');
const { createMainWindow } = require('./desktop-shell/create-main-window.cjs');
const { registerIpcHandlers } = require('./desktop-shell/register-ipc-handlers.cjs');

let mainWindow = null;

app.whenReady().then(() => {
  try {
    humanizationEngine.loadBanks();
  } catch (err) {
    console.error('Error pre-loading humanization banks:', err);
  }

  registerIpcHandlers(ipcMain, shell, () => mainWindow);
  mainWindow = createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
