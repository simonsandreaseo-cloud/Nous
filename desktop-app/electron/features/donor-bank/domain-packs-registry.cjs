/**
 * @fileoverview Registro Declarativo Multi-Nicho y Enrutamiento por Subdominios Estancos.
 * Permite aislar subdominios compatibles dentro de un mismo sector (p. ej. Gafas vs. Audiología
 * vs. Oftalmología Clínica) y sumar nuevos nichos completos (p. ej. Criptomonedas & Web3)
 * sin reescribir el núcleo neuro-simbólico.
 */

const fs = require('fs');
const path = require('path');

const { WORKSPACE_ROOT_DIR: ROOT_DIR } = require('../../shared/app-paths.cjs');

const DIARY_META_JUNK_RX = /(?:^|\.\s+)Resumen:\s|\bmientras\s+escribo\b|\brese[ñn]aros\b|\ben\s+este\s+(?:post|art[ií]culo)\b|\bconsulta\s+nuestro\s+ranking\b|\bnuestro\s+ranking\s+de\b/i;

const OPTICA_AUDIOLOGY_RX = /\b(?:dolor\s+de\s+o[ií]dos?|en\s+(?:el|los)\s+o[ií]dos?|o[ií]dos?\s+(?:tapados?|internos?|sensibles?)|v[eé]rtigo|camilla|aud[ií]fonos?|audiolog[ií]a\s+cl[ií]nica|centro\s+auditivo|t[ií]mpano|ac[uú]fenos?|tinnitus|otitis|cerumen|sordera|hipoacusia|laberintitis|vestibular|otorrino\w*|implante\s+coclear|maniobra\s+de\s+dix|tapones?\s+(?:para\s+)?o[ií]dos?|p[eé]rdida\s+auditiva|auditiv[oa]s?|audici[oó]n|audiometr[ií]a|conducto\s+auditivo|salud\s+auditiva|revisi[oó]n\s+auditiva|decibelios?|o[ií]r\s+mejor|aparato\s+auditivo)\b/i;

function stripOpticaFalseAudiologyStrings(text) {
  return String(text || '')
    .replace(/(?:^|[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ])[oó]ptica\s*(?:&|&amp;|y)\s*audiolog[ií]a(?:\s+universitaria)?/gi, ' ')
    .replace(/\b(?:he|has|ha|hemos|han|hab[ií]a[ns]?)\s+o[ií]do\b|\bo[ií]do\s+hablar\b/gi, ' ');
}

function stripOpticaFalseEyewearStrings(text) {
  return String(text || '').replace(/\bmariah\s+carey\b/gi, ' ');
}

const OPTICA_CLINICAL_RX = /\b(?:cataratas?|glaucoma|colirio|retin[oa]s?|c[oó]rnea|estrabismo|ambliop[ií]a|ojo\s+vago|conjuntivitis|m[aá]cula|blefaritis|cirug[ií]a\s+refractiva|lasik|queratocono|desprendimiento\s+de\s+retina|oftalm[oó]log\w*|cl[ií]nica\s+oftalmol\w*|derrame\s+ocular|tensi[oó]n\s+ocular)\b/i;

const OPTICA_OFF_DOMAIN_MEDICAL_RX = /\b(?:fisioterap\w*|cl[ií]nica\s+dental|podolog[ií]a|odontolog[ií]a|ortodoncia|glucosa\s+en\s+sangre)\b/i;

const OPTICA_EYEWEAR_SUBJECT_RX = /\b(?:gafas?|monturas?|lentes?|cristales?|armaz[oó]n(?:es)?|varillas?|patillas?|plaquetas?|calibre|puente(?:\s+nasal)?|polarizad[oa]s?|fotocrom[aá]tic[oa]s?|progresiv[oa]s?|ocupacional(?:es)?|monofocal(?:es)?|antirreflejante|policarbonato|acetato|pasta|carey|visagismo|uv\s*400|rayos?\s+uv|filtros?\s+(?:solares?|de\s+categor[ií]a)|categor[ií]a\s+[0-4]|deslumbramiento|protecci[oó]n\s+solar|solares?|graduad[oa]s?|optometr\w*|presbicia|miop[ií]a|astigmatismo|l[aá]minas?\s+de\s+acetato|reflejos?\s+(?:solares?|horizontales?|molestos?)|rostro|facciones|cristal\s+mineral)\b|\[SLOT_(?:BRAND|MODEL|COMPONENT|FRAME_SHAPE|MATERIAL|COATING)\]/gi;

const OPTICA_LIFESTYLE_FALLBACK_RX = /\b(?:boho\s*chic|bohemi[oa]s?|hippie|vintage|retro|estilismo|outfit|look(?:s)?|tendencias?\s+de\s+moda|moda\s+setentera|complemento\s+estrella)\b/i;

const CRYPTO_TRADING_DEFI_RX = /\b(?:bitcoin|btc|ethereum|eth|blockchain|cadena\s+de\s+bloques|staking|defi|dex|exchange|liquidez|gas\s+fees?|comisiones?\s+de\s+red|halving|volatilidad|tokens?|smart\s+contracts?|contratos?\s+inteligentes?|layer\s*2|rollup|pool\s+de\s+liquidez|apr|apy|altcoins?)\b/gi;

const CRYPTO_SECURITY_CUSTODY_RX = /\b(?:cold\s+wallet|hardware\s+wallet|billetera\s+fr[ií]a|wallet|monedero|seed\s+phrase|frase\s+semilla|palabras?\s+semilla|autocustodia|self-custody|claves?\s+privadas?|clave\s+p[uú]blica|phishing|multisig|multifirma|2fa|custodia|ledger|trezor)\b/gi;

const CRYPTO_REGULATION_TAX_RX = /\b(?:mica|fiscalidad\s+cripto|hacienda|declaraci[oó]n\s+de\s+(?:la\s+)?renta|kyc|aml|reglamento\s+europeo|plusval[ií]as|tributaci[oó]n|modelo\s+721)\b/gi;

const DOMAIN_PACKS = {
  optica: {
    id: 'optica',
    label: 'Óptica & Audiología',
    description: 'Monturas, lentes técnicas solares/graduadas y compartimentos estancos para oftalmología clínica y audiología.',
    bankDir: 'banco_ontologico_semantico',
    masterBankFile: 'banco_maestro_ladrillos_retoricos.json',
    defaultSubdomain: 'OPTICAL_EYEWEAR',
    eyewearSubjectRx: OPTICA_EYEWEAR_SUBJECT_RX,
    subdomains: {
      OPTICAL_EYEWEAR: {
        id: 'OPTICAL_EYEWEAR',
        label: 'Óptica de Monturas y Lentes',
        detectRx: OPTICA_EYEWEAR_SUBJECT_RX,
        compatibleFrames: ['OPTICAL_PROTECTION', 'LENS_PROPERTIES', 'MATERIAL_COMPOSITION', 'PRODUCT_FACTUAL', 'MECHANICAL_FUNCTION', 'ANATOMICAL_FIT', 'VISAGISM_AESTHETICS', 'GENERAL_STYLE', 'HERITAGE_ORIGIN', 'TRANSITION_CURATION', 'CARE_MAINTENANCE']
      },
      OPTICAL_CLINICAL: {
        id: 'OPTICAL_CLINICAL',
        label: 'Oftalmología Clínica y Patologías',
        detectRx: OPTICA_CLINICAL_RX,
        compatibleFrames: ['CLINICAL_OPHTHALMOLOGY', 'CONTACT_LENS_CARE', 'LENS_PROPERTIES']
      },
      AUDIOLOGY: {
        id: 'AUDIOLOGY',
        label: 'Audiología, Audífonos y Vértigo',
        detectRx: OPTICA_AUDIOLOGY_RX,
        compatibleFrames: ['AUDIOLOGY', 'CLINICAL_AUDIOLOGY']
      },
      GENERAL_LIFESTYLE: {
        id: 'GENERAL_LIFESTYLE',
        label: 'Estilo y Editorial de Moda',
        detectRx: OPTICA_LIFESTYLE_FALLBACK_RX,
        compatibleFrames: ['GENERAL_STYLE', 'VISAGISM_AESTHETICS', 'HERITAGE_ORIGIN', 'TRANSITION_CURATION']
      }
    }
  },
  criptomonedas: {
    id: 'criptomonedas',
    label: 'Criptomonedas & Web3 (Preparado)',
    description: 'Arquitectura lista para trading DeFi, autocustodia/seguridad de claves y regulación/fiscalidad cripto.',
    bankDir: 'banco_criptomonedas',
    masterBankFile: 'banco_maestro_ladrillos_retoricos.json',
    defaultSubdomain: 'CRYPTO_TRADING_DEFI',
    subdomains: {
      CRYPTO_TRADING_DEFI: {
        id: 'CRYPTO_TRADING_DEFI',
        label: 'Blockchain, Trading & DeFi',
        detectRx: CRYPTO_TRADING_DEFI_RX
      },
      CRYPTO_SECURITY_CUSTODY: {
        id: 'CRYPTO_SECURITY_CUSTODY',
        label: 'Autocustodia y Seguridad Cripto',
        detectRx: CRYPTO_SECURITY_CUSTODY_RX
      },
      CRYPTO_REGULATION_TAX: {
        id: 'CRYPTO_REGULATION_TAX',
        label: 'Regulación MiCA y Fiscalidad',
        detectRx: CRYPTO_REGULATION_TAX_RX
      }
    },
    discriminativeAnchors: [
      {
        key: 'seed_phrase',
        label: 'frase semilla / seed phrase',
        category: 'CRYPTO_SECURITY',
        severity: 'CRITICAL',
        weight: 3.0,
        detectRx: /\b(?:seed\s+phrase|frase\s+semilla|palabras?\s+de\s+recuperaci[oó]n)\b/i,
        verifyRx: /\b(?:seed\s+phrase|frase\s+semilla|palabras?\s+de\s+recuperaci[oó]n|copia\s+en\s+papel)\b/i
      },
      {
        key: 'cold_wallet',
        label: 'cold wallet / hardware wallet',
        category: 'CRYPTO_SECURITY',
        severity: 'CRITICAL',
        weight: 3.0,
        detectRx: /\b(?:cold\s+wallet|hardware\s+wallet|billetera\s+fr[ií]a)\b/i,
        verifyRx: /\b(?:cold\s+wallet|hardware\s+wallet|billetera\s+fr[ií]a|en\s+fr[ií]o)\b/i
      },
      {
        key: 'staking',
        label: 'staking / bloqueo de liquidez',
        category: 'CRYPTO_TECH',
        severity: 'HIGH',
        weight: 2.5,
        detectRx: /\bstaking\b/i,
        verifyRx: /\bstaking\b/i
      },
      {
        key: 'halving',
        label: 'halving / emisión',
        category: 'CRYPTO_TECH',
        severity: 'HIGH',
        weight: 2.0,
        detectRx: /\bhalving\b/i,
        verifyRx: /\bhalving\b/i
      },
      {
        key: 'gas_fees',
        label: 'gas fees / comisiones de red',
        category: 'CRYPTO_TECH',
        severity: 'HIGH',
        weight: 2.0,
        detectRx: /\b(?:gas\s+fees?|comisiones?\s+de\s+red)\b/i,
        verifyRx: /\b(?:gas|comisiones?\s+de\s+red|congesti[oó]n)\b/i
      },
      {
        key: 'kyc',
        label: 'KYC / verificación',
        category: 'CRYPTO_REG',
        severity: 'HIGH',
        weight: 2.0,
        detectRx: /\bkyc\b/i,
        verifyRx: /\b(?:kyc|verificaci[oó]n\s+de\s+identidad)\b/i
      }
    ],
    signedPolarityRules: [
      { key: 'compartir semilla', rx: /\b(?:compartir|fotografiar|guardar\s+en\s+la\s+nube|subir\s+a\s+internet)\b[^.]{0,30}\b(?:semilla|seed|claves?)\b/i },
      { key: 'autocustodia largo plazo', rx: /\b(?:autocustodia|cold\s+wallet|hardware\s+wallet)\b/i },
      { key: 'exchange centralizado', rx: /\b(?:exchange\s+centralizado|dejar\s+fondos\s+en\s+un\s+exchange)\b/i }
    ]
  }
};

function registerDomainPack(pack) {
  if (!pack || !pack.id) throw new Error('DomainPack inválido: requiere id.');
  DOMAIN_PACKS[pack.id] = pack;
  return DOMAIN_PACKS[pack.id];
}

function getDomainPack(domainId = 'optica') {
  return DOMAIN_PACKS[domainId] || DOMAIN_PACKS.optica;
}

function resolveBankFilePath(domainId = 'optica') {
  const pack = getDomainPack(domainId);
  return path.join(ROOT_DIR, pack.bankDir || 'banco_ontologico_semantico', pack.masterBankFile || 'banco_maestro_ladrillos_retoricos.json');
}

const DOMAIN_COUNT_CACHE = new Map();

function listDomainPacks(liveCounts = null) {
  return Object.values(DOMAIN_PACKS).map(pack => {
    const bankPath = resolveBankFilePath(pack.id);
    const hasBank = fs.existsSync(bankPath);
    let masterCount = 0;
    if (liveCounts && typeof liveCounts[pack.id] === 'number') {
      masterCount = liveCounts[pack.id];
    } else if (hasBank) {
      try {
        const stat = fs.statSync(bankPath);
        if (stat.size > 0) {
          const cached = DOMAIN_COUNT_CACHE.get(pack.id);
          if (cached && cached.mtimeMs === stat.mtimeMs) {
            masterCount = cached.count;
          } else {
            const parsed = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
            masterCount = Array.isArray(parsed) ? parsed.length : 0;
            DOMAIN_COUNT_CACHE.set(pack.id, { mtimeMs: stat.mtimeMs, count: masterCount });
          }
        }
      } catch {}
    }
    return {
      id: pack.id,
      label: pack.label,
      description: pack.description,
      bankDir: pack.bankDir,
      hasBank,
      masterCount,
      subdomains: Object.keys(pack.subdomains || {})
    };
  });
}

function detectOpticaSignals(str) {
  const raw = String(str || '');
  if (!raw.trim()) {
    return { hasAudio: false, hasClin: false, hasEyewear: false, hasLifestyle: false };
  }
  const sAudio = stripOpticaFalseAudiologyStrings(raw);
  const sEyewear = stripOpticaFalseEyewearStrings(raw);
  const hasAudio = OPTICA_AUDIOLOGY_RX.test(sAudio) || /\baudiolog[ií]a\b/i.test(sAudio);
  const hasClin = OPTICA_CLINICAL_RX.test(raw);
  OPTICA_EYEWEAR_SUBJECT_RX.lastIndex = 0;
  const hasEyewear = OPTICA_EYEWEAR_SUBJECT_RX.test(sEyewear);
  const hasLifestyle = OPTICA_LIFESTYLE_FALLBACK_RX.test(raw);
  return { hasAudio, hasClin, hasEyewear, hasLifestyle };
}

function detectActiveSubdomains(text, domainId = 'optica') {
  const s = String(text || '');
  const active = new Set();

  if (domainId === 'optica') {
    const { hasAudio, hasClin, hasEyewear } = detectOpticaSignals(s);

    if (hasAudio && !hasEyewear && !hasClin) {
      active.add('AUDIOLOGY');
      return active;
    }
    if (hasClin && !hasEyewear && !hasAudio) {
      active.add('OPTICAL_CLINICAL');
      return active;
    }
    if (hasAudio) active.add('AUDIOLOGY');
    if (hasClin) active.add('OPTICAL_CLINICAL');
    active.add('OPTICAL_EYEWEAR');
    active.add('GENERAL_LIFESTYLE');
    return active;
  }

  const pack = getDomainPack(domainId);
  for (const [subId, def] of Object.entries(pack.subdomains || {})) {
    if (!def.detectRx) continue;
    def.detectRx.lastIndex = 0;
    if (def.detectRx.test(s)) active.add(subId);
  }
  if (active.size === 0 && pack.defaultSubdomain) {
    active.add(pack.defaultSubdomain);
  }
  return active;
}

function resolveSectionSubdomains({ headingText = '', sectionBodyText = '', paragraphText = '', domainId = 'optica' } = {}) {
  if (domainId === 'optica') {
    const p = detectOpticaSignals(paragraphText);
    const h = detectOpticaSignals(headingText);
    const s = detectOpticaSignals(sectionBodyText);
    const active = new Set();

    const applyOpticaSignals = (sig) => {
      if (sig.hasAudio && !sig.hasEyewear && !sig.hasClin) {
        active.add('AUDIOLOGY');
        return true;
      }
      if (sig.hasClin && !sig.hasEyewear && !sig.hasAudio) {
        active.add('OPTICAL_CLINICAL');
        return true;
      }
      if (sig.hasEyewear && !sig.hasAudio && !sig.hasClin) {
        active.add('OPTICAL_EYEWEAR');
        active.add('GENERAL_LIFESTYLE');
        return true;
      }
      if (sig.hasAudio && sig.hasEyewear) {
        active.add('AUDIOLOGY');
        active.add('OPTICAL_EYEWEAR');
        if (sig.hasClin) active.add('OPTICAL_CLINICAL');
        return true;
      }
      if (sig.hasClin && sig.hasEyewear) {
        active.add('OPTICAL_CLINICAL');
        active.add('OPTICAL_EYEWEAR');
        return true;
      }
      if (sig.hasAudio && sig.hasClin) {
        active.add('AUDIOLOGY');
        active.add('OPTICAL_CLINICAL');
        return true;
      }
      return false;
    };

    if (p.hasAudio || p.hasClin || p.hasEyewear) {
      applyOpticaSignals(p);
      return active;
    }

    const inherited = (h.hasAudio || h.hasClin || h.hasEyewear) ? h : s;
    if (!applyOpticaSignals(inherited)) {
      active.add('OPTICAL_EYEWEAR');
      active.add('GENERAL_LIFESTYLE');
    }
    return active;
  }

  const pack = getDomainPack(domainId);
  const matchSubdomainsInText = (txt) => {
    const hits = new Set();
    const raw = String(txt || '');
    if (!raw.trim()) return hits;
    for (const [subId, def] of Object.entries(pack.subdomains || {})) {
      if (!def.detectRx) continue;
      def.detectRx.lastIndex = 0;
      if (def.detectRx.test(raw)) hits.add(subId);
    }
    return hits;
  };

  for (const candText of [paragraphText, headingText, sectionBodyText]) {
    const hits = matchSubdomainsInText(candText);
    if (hits.size > 0) return hits;
  }

  const fallback = new Set();
  if (pack.defaultSubdomain) fallback.add(pack.defaultSubdomain);
  return fallback;
}

function classifyBrickSubdomain(text, domainId = 'optica') {
  const s = String(text || '').trim();
  if (!s) return { subdomain: 'LOW_DOMAIN_DENSITY', hits: 0, hasMetaJunk: false };

  const hasMetaJunk = DIARY_META_JUNK_RX.test(s);
  if (hasMetaJunk) {
    return { subdomain: 'META_JUNK', hits: 0, hasMetaJunk: true };
  }

  if (domainId === 'optica') {
    if (OPTICA_OFF_DOMAIN_MEDICAL_RX.test(s)) {
      return { subdomain: 'OFF_DOMAIN_JUNK', hits: 0, hasMetaJunk: false };
    }
    const sSanitizedAudio = stripOpticaFalseAudiologyStrings(s);
    if (OPTICA_AUDIOLOGY_RX.test(sSanitizedAudio) || /\baudiolog[ií]a\b/i.test(sSanitizedAudio)) {
      return { subdomain: 'AUDIOLOGY', hits: 1, hasMetaJunk: false };
    }
    const sSanitizedEyewear = stripOpticaFalseEyewearStrings(s);
    OPTICA_EYEWEAR_SUBJECT_RX.lastIndex = 0;
    const eyHits = (sSanitizedEyewear.match(OPTICA_EYEWEAR_SUBJECT_RX) || []).length;
    const hasClin = OPTICA_CLINICAL_RX.test(s);

    if (hasClin && eyHits === 0) {
      return { subdomain: 'OPTICAL_CLINICAL', hits: 1, hasMetaJunk: false };
    }
    if (hasClin && eyHits > 0 && !/\b(?:gafas?|monturas?|polarizad|fotocrom)\b/i.test(s)) {
      return { subdomain: 'OPTICAL_CLINICAL', hits: eyHits, hasMetaJunk: false };
    }
    if (eyHits > 0) {
      return { subdomain: 'OPTICAL_EYEWEAR', hits: eyHits, hasMetaJunk: false };
    }
    if (OPTICA_LIFESTYLE_FALLBACK_RX.test(s)) {
      return { subdomain: 'GENERAL_LIFESTYLE', hits: 1, hasMetaJunk: false };
    }
    return { subdomain: 'LOW_DOMAIN_DENSITY', hits: 0, hasMetaJunk: false };
  }

  const pack = getDomainPack(domainId);
  let bestSub = 'LOW_DOMAIN_DENSITY';
  let bestHits = 0;
  for (const [subId, def] of Object.entries(pack.subdomains || {})) {
    if (!def.detectRx) continue;
    def.detectRx.lastIndex = 0;
    const matches = s.match(def.detectRx) || [];
    if (matches.length > bestHits) {
      bestHits = matches.length;
      bestSub = subId;
    }
  }
  return { subdomain: bestSub, hits: bestHits, hasMetaJunk: false };
}

function isSubdomainCompatible(brickSubdomain, activeSubdomains, domainId = 'optica') {
  if (!brickSubdomain || brickSubdomain === 'META_JUNK' || brickSubdomain === 'OFF_DOMAIN_JUNK' || brickSubdomain === 'LOW_DOMAIN_DENSITY') {
    return false;
  }
  const active = activeSubdomains instanceof Set
    ? activeSubdomains
    : new Set(Array.isArray(activeSubdomains) ? activeSubdomains : [getDomainPack(domainId).defaultSubdomain]);

  return active.has(brickSubdomain);
}

function getAnchorsForDomain(domainId = 'optica') {
  return getDomainPack(domainId).discriminativeAnchors || null;
}

function getSignedRulesForDomain(domainId = 'optica') {
  return getDomainPack(domainId).signedPolarityRules || null;
}

module.exports = {
  DOMAIN_PACKS,
  DIARY_META_JUNK_RX,
  OPTICA_AUDIOLOGY_RX,
  OPTICA_CLINICAL_RX,
  OPTICA_OFF_DOMAIN_MEDICAL_RX,
  OPTICA_EYEWEAR_SUBJECT_RX,
  registerDomainPack,
  getDomainPack,
  resolveBankFilePath,
  listDomainPacks,
  detectActiveSubdomains,
  resolveSectionSubdomains,
  stripOpticaFalseAudiologyStrings,
  stripOpticaFalseEyewearStrings,
  classifyBrickSubdomain,
  isSubdomainCompatible,
  getAnchorsForDomain,
  getSignedRulesForDomain
};
