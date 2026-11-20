'use strict';

/**
 * Etiqueta los 14,249 ladrillos del banco maestro con:
 * - domain: 'optica'
 * - subdomain: OPTICAL_EYEWEAR | OPTICAL_CLINICAL | AUDIOLOGY | GENERAL_LIFESTYLE | OFF_DOMAIN_JUNK | META_JUNK | LOW_DOMAIN_DENSITY
 *
 * - Descuarentena (exclude_from_humanization = false) los ladrillos limpios de AUDIOLOGY y OPTICAL_CLINICAL
 *   que solo habían sido excluidos por 'OFF_DOMAIN_AUDIOLOGY_OR_MEDICAL' (sin ruido de citas/scraping),
 *   manteniéndolos AISLADOS por subdominio estanco (invisibles para artículos de gafas, útiles para artículos
 *   de audiología o salud ocular clínica).
 * - Preserva la cuarentena previa válida (905 originales menos las especialidades limpias recuperadas)
 *   sin añadir falsos positivos por comillas sueltas.
 */

const fs = require('fs');
const path = require('path');
const domainRegistry = require('../desktop-app/electron/engine/domain-registry.cjs');

const ROOT = path.resolve(__dirname, '..');
const masterPath = path.join(ROOT, 'banco_ontologico_semantico/banco_maestro_ladrillos_retoricos.json');
const indexPath = path.join(ROOT, 'banco_ontologico_semantico/indice_subdominios.json');

const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

const stats = {
  total: master.length,
  bySubdomain: {},
  excludedBefore: 0,
  excludedAfter: 0,
  unquarantinedCleanSpecialties: 0,
  restoredFalseQuoteQuarantine: 0,
  newlyQuarantinedJunk: 0
};

const indexMap = {
  OPTICAL_EYEWEAR: [],
  OPTICAL_CLINICAL: [],
  AUDIOLOGY: [],
  GENERAL_LIFESTYLE: [],
  QUARANTINED_OR_LOW: []
};

for (const b of master) {
  const wasExcluded = Boolean(b.exclude_from_humanization);
  if (wasExcluded) stats.excludedBefore++;

  const raw = String(b.raw_text || b.text || '');
  const cls = domainRegistry.classifyBrickSubdomain(raw, 'optica');
  const exclReason = String(b.exclusion_reason || b.exclude_reason || '');

  b.domain = 'optica';
  b.subdomain = cls.subdomain;

  // Revert unintended quarantine added in first pass where only raw quotes existed without exclusion_reason
  if (wasExcluded && !exclReason && b.exclude_reason === undefined && cls.subdomain !== 'META_JUNK' && cls.subdomain !== 'OFF_DOMAIN_JUNK') {
    b.exclude_from_humanization = false;
    stats.restoredFalseQuoteQuarantine++;
  }

  const isClinicalOrAudio = cls.subdomain === 'AUDIOLOGY' || cls.subdomain === 'OPTICAL_CLINICAL';
  const hasHardJunk = /ver\s+cat[aá]logo|a[ñn]adir\s+al\s+carrito|consulta\s+nuestro\s+ranking/i.test(raw) || /\uFFFD/.test(raw);
  const onlyAudioMedicalReason = exclReason === 'OFF_DOMAIN_AUDIOLOGY_OR_MEDICAL';

  if (cls.subdomain === 'META_JUNK' || cls.subdomain === 'OFF_DOMAIN_JUNK' || hasHardJunk) {
    if (!b.exclude_from_humanization) stats.newlyQuarantinedJunk++;
    b.exclude_from_humanization = true;
    if (!b.exclusion_reason) b.exclusion_reason = cls.subdomain;
    delete b.exclude_reason;
  } else if (isClinicalOrAudio && b.exclude_from_humanization && onlyAudioMedicalReason && !/[“”"@]/.test(raw)) {
    stats.unquarantinedCleanSpecialties++;
    b.exclude_from_humanization = false;
    b.previous_exclusion_reason = exclReason;
    delete b.exclusion_reason;
    delete b.exclude_reason;
  }

  if (b.exclude_from_humanization) {
    stats.excludedAfter++;
    indexMap.QUARANTINED_OR_LOW.push(b.brick_id);
  } else if (indexMap[b.subdomain]) {
    indexMap[b.subdomain].push(b.brick_id);
  } else {
    indexMap.QUARANTINED_OR_LOW.push(b.brick_id);
  }

  stats.bySubdomain[b.subdomain] = (stats.bySubdomain[b.subdomain] || 0) + 1;
}

fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
fs.writeFileSync(indexPath, JSON.stringify({ stats, ...indexMap }, null, 2), 'utf8');

console.log('=== ETIQUETADO DE SUBDOMINIOS COMPLETADO ===');
console.log(JSON.stringify(stats, null, 2));
