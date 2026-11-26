'use strict';

const fs = require('fs');
const path = require('path');

let envLoaded = false;

function parseEnvFile(filePath, override = false) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (override || process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

function loadWorkspaceEnv(workspaceRootDir) {
  if (envLoaded) return;
  const root = workspaceRootDir || path.resolve(__dirname, '../../..');
  parseEnvFile(path.join(root, '.env'), false);
  parseEnvFile(path.join(root, '.env.modal'), false);
  envLoaded = true;
}

module.exports = {
  loadWorkspaceEnv,
  parseEnvFile
};
