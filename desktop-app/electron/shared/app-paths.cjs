'use strict';

const path = require('path');

const ELECTRON_DIR = path.resolve(__dirname, '..');
const DESKTOP_APP_DIR = path.resolve(__dirname, '../..');
const WORKSPACE_ROOT_DIR = path.resolve(__dirname, '../../..');

const BANK_DIR = path.join(WORKSPACE_ROOT_DIR, 'banco_ontologico_semantico');
const LOGS_DIR = path.join(DESKTOP_APP_DIR, 'logs');
const DIST_INDEX_HTML = path.join(DESKTOP_APP_DIR, 'dist', 'index.html');
const PRELOAD_SCRIPT = path.join(ELECTRON_DIR, 'preload.cjs');

module.exports = {
  ELECTRON_DIR,
  DESKTOP_APP_DIR,
  WORKSPACE_ROOT_DIR,
  BANK_DIR,
  LOGS_DIR,
  DIST_INDEX_HTML,
  PRELOAD_SCRIPT
};
