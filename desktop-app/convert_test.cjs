const fs = require('fs');
const path = require('path');

const runFile = path.join(__dirname, 'electron', 'logs', 'runs', 'run_1794071717271.json');
const run = JSON.parse(fs.readFileSync(runFile, 'utf8'));

function htmlToPlainText(html) {
  if (!html) return '';
  let text = html;

  // Remove script and style elements
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove figures and media containers completely
  text = text.replace(/<figure[\s\S]*?<\/figure>/gi, '\n\n');
  text = text.replace(/<video[\s\S]*?<\/video>/gi, '');
  text = text.replace(/<img[\s\S]*?>/gi, '');

  // Line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Headings
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<h[1-6][^>]*>/gi, '\n\n');

  // Lists
  text = text.replace(/<li[^>]*>\s*<p[^>]*>/gi, '\n• ');
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/p>\s*<\/li>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  // Tables
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<tr[^>]*>/gi, '\n');
  text = text.replace(/<\/t[dh]>/gi, ' ');
  text = text.replace(/<t[dh][^>]*>/gi, ' ');
  text = text.replace(/<\/?(?:table|tbody|thead|tfoot|colgroup|col)[^>]*>/gi, '\n');

  // Paragraphs and blockquotes
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/blockquote>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<blockquote[^>]*>/gi, '');

  // Strip all other HTML tags (strong, b, em, i, span, a, etc.)
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Remove empty bullets: '•' on a line alone
  text = text.replace(/^[ \t]*•[ \t]*$/gm, '');

  // Normalize lines and whitespace
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => {
      // Avoid excessive blank lines
      if (line === '' && i > 0 && arr[i - 1] === '') return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

const plain = htmlToPlainText(run.finalText);
console.log('Plain text length (chars):', plain.length);
console.log('Plain text word count:', plain.split(/\s+/).length);
fs.writeFileSync(path.join(__dirname, 'converted_plain_text.txt'), plain, 'utf8');
console.log('Saved to converted_plain_text.txt successfully');
