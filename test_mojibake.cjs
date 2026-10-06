const cp1252ToChar = new Array(256);
for (let i = 0; i < 256; i++) {
  cp1252ToChar[i] = String.fromCharCode(i);
}
// Apply overrides for 0x80-0x9F
const overrides = {
  0x80: '\u20AC', 0x81: '\u0081', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E', 0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021',
  0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160', 0x8B: '\u2039', 0x8C: '\u0152', 0x8D: '\u008D', 0x8E: '\u017D', 0x8F: '\u008F',
  0x90: '\u0090', 0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
  0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153', 0x9D: '\u009D', 0x9E: '\u017E', 0x9F: '\u0178'
};
for (const [k, v] of Object.entries(overrides)) {
  cp1252ToChar[k] = v;
}

const charToCp1252 = {};
for (let i = 0; i < 256; i++) {
  charToCp1252[cp1252ToChar[i]] = i;
}

function getCharClass(start, end) {
  let chars = '';
  for (let i = start; i <= end; i++) {
    chars += cp1252ToChar[i];
  }
  return '[' + chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ']';
}

const b80_bf = getCharClass(0x80, 0xBF);
const b80_9F = getCharClass(0x80, 0x9F);
const bA0_BF = getCharClass(0xA0, 0xBF);
const b90_BF = getCharClass(0x90, 0xBF);
const b80_8F = getCharClass(0x80, 0x8F);

const c2_df = getCharClass(0xC2, 0xDF);
const e0 = getCharClass(0xE0, 0xE0);
const e1_ec = getCharClass(0xE1, 0xEC);
const ed = getCharClass(0xED, 0xED);
const ee_ef = getCharClass(0xEE, 0xEF);

const f0 = getCharClass(0xF0, 0xF0);
const f1_f3 = getCharClass(0xF1, 0xF3);
const f4 = getCharClass(0xF4, 0xF4);

const regexStr = 
  '(' + c2_df + b80_bf + ')|' +
  '(' + e0 + bA0_BF + b80_bf + ')|' +
  '(' + e1_ec + b80_bf + '{2})|' +
  '(' + ed + b80_9F + b80_bf + ')|' +
  '(' + ee_ef + b80_bf + '{2})|' +
  '(' + f0 + b90_BF + b80_bf + '{2})|' +
  '(' + f1_f3 + b80_bf + '{3})|' +
  '(' + f4 + b80_8F + b80_bf + '{2})';

const re = new RegExp(regexStr, 'g');
const testStr = 'Hola esto es una âš ï¸  prueba con ðŸ“ˆ y tambiÃ©n Â¡asÃ­!';
console.log('Matches in test string:', testStr.match(re));

function decodeMojibake(match) {
  const bytes = [];
  for (let i = 0; i < match.length; i++) {
    bytes.push(charToCp1252[match[i]]);
  }
  return Buffer.from(bytes).toString('utf8');
}

console.log('Fixed string:', testStr.replace(re, decodeMojibake));
