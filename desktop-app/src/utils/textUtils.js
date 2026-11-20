/**
 * Utility functions for text processing, clean plain text conversion, and clipboard helpers.
 */

export function convertHtmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';

  // If there are no HTML tags, return cleanly trimmed text
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html.trim();
  }

  let text = html;

  // 1. Remove non-content structural elements
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<figure[\s\S]*?<\/figure>/gi, '\n\n');
  text = text.replace(/<video[\s\S]*?<\/video>/gi, '');
  text = text.replace(/<audio[\s\S]*?<\/audio>/gi, '');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  text = text.replace(/<img[\s\S]*?>/gi, '');

  // 2. Line breaks and headings
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<h[1-6][^>]*>/gi, '\n\n');

  // 3. Lists and list items
  text = text.replace(/<li[^>]*>\s*<p[^>]*>/gi, '\n• ');
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/p>\s*<\/li>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');

  // 4. Tables: preserve table structure cleanly
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<tr[^>]*>/gi, '\n');
  text = text.replace(/<\/t[dh]>/gi, '   ');
  text = text.replace(/<t[dh][^>]*>/gi, ' ');
  text = text.replace(/<\/?(?:table|tbody|thead|tfoot|colgroup|col)[^>]*>/gi, '\n');

  // 5. Paragraphs and blockquotes
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/blockquote>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  text = text.replace(/<blockquote[^>]*>/gi, '');

  // 6. Strip all remaining HTML tags (strong, b, em, i, span, a, div, etc.)
  text = text.replace(/<[^>]+>/g, '');

  // 7. Remove markdown bold markers and internal asset placeholders
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\[\*\d+\*\]/g, '');

  // 8. Decode HTML entities
  const entityMap = {
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&iexcl;': '¡',
    '&iquest;': '¿',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢',
    '&aacute;': 'á',
    '&eacute;': 'é',
    '&iacute;': 'í',
    '&oacute;': 'ó',
    '&uacute;': 'ú',
    '&ntilde;': 'ñ',
    '&Aacute;': 'Á',
    '&Eacute;': 'É',
    '&Iacute;': 'Í',
    '&Oacute;': 'Ó',
    '&Uacute;': 'Ú',
    '&Ntilde;': 'Ñ'
  };

  for (const [entity, char] of Object.entries(entityMap)) {
    text = text.replaceAll(entity, char);
  }

  // Handle decimal and hex entities
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // 9. Remove solitary bullet points
  text = text.replace(/^[ \t]*•[ \t]*$/gm, '');

  // 10. Normalize lines and collapse excessive whitespace
  return text
    .split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => {
      if (line === '' && i > 0 && arr[i - 1] === '') return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
