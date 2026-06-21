import * as cheerio from 'cheerio';
const html = 'Texto huerfano 1 </p><h1>Titulo</h1> Texto huerfano 2 <ul>Texto en ul<li>Item</li></ul> <table>Texto en table<tr><td>Data</td></tr></table>';
const $ = cheerio.load(html, null, false);
console.log('Original parsed:', $.html());

// Remover textos huerfanos en la raiz
$.root().contents().filter((_, el) => el.type === 'text' && $(el).text().trim().length > 0).remove();

// Remover textos huerfanos dentro de ul, ol, table, tbody, tr
$('ul, ol, table, tbody, thead, tr').contents().filter((_, el) => el.type === 'text' && $(el).text().trim().length > 0).remove();

console.log('Limpiado:', $.html());
