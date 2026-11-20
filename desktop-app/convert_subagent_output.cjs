const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'subagent_humanized_output.html'), 'utf8');

function htmlToPlainText(html) {
  if (!html) return '';
  let text = html;

  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<figure[\s\S]*?<\/figure>/gi, '\n\n');
  text = text.replace(/<video[\s\S]*?<\/video>/gi, '');
  text = text.replace(/<img[\s\S]*?>/gi, '');

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<h[1-6][^>]*>/gi, '\n\n');

  text = text.replace(/<li[^>]*>\s*<p[^>]*>/gi, '\n• ');
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/p>\s*<\/li>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<tr[^>]*>/gi, '\n');
  text = text.replace(/<\/t[dh]>/gi, '   ');
  text = text.replace(/<t[dh][^>]*>/gi, ' ');
  text = text.replace(/<\/?(?:table|tbody|thead|tfoot|colgroup|col)[^>]*>/gi, '\n');

  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/blockquote>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<blockquote[^>]*>/gi, '');

  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\[\*\d+\*\]/g, '');

  const entityMap = {
    '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
    '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú', '&Ntilde;': 'Ñ'
  };
  for (const [e, c] of Object.entries(entityMap)) {
    text = text.replaceAll(e, c);
  }

  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  text = text.replace(/^[ \t]*•[ \t]*$/gm, '');

  return text
    .split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => !(line === '' && i > 0 && arr[i - 1] === ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const plain = htmlToPlainText(html);
const outPath = path.join(__dirname, 'subagent_humanized_plain.txt');
fs.writeFileSync(outPath, plain, 'utf8');

console.log('Plain text generated successfully at:', outPath);
console.log('Words count:', plain.split(/\s+/).length);
console.log('Lines count:', plain.split('\n').length);
