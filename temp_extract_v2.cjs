const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('C:\\\\Users\\\\Simon San\\\\.gemini\\\\antigravity\\\\brain\\\\6474e280-c05b-40c4-9eb2-31621027da68\\\\scratch\\\\content_v2.html', 'utf8');
const $ = cheerio.load(html, { decodeEntities: false }, false);
const textBlocks = {};
let counter = 0;
const blockSelectors = 'p, h1, h2, h3, h4, h5, h6, blockquote, q, cite, li, td, th';
$(blockSelectors).each((_, el) => {
    if ($(el).children(blockSelectors).length === 0) {
        const innerHtml = $(el).html()?.trim();
        if (innerHtml && innerHtml.replace(/<[^>]*>/g, '').trim().length > 5) {
            textBlocks['block_' + counter++] = innerHtml;
        }
    }
});
fs.writeFileSync('C:\\\\Users\\\\Simon San\\\\.gemini\\\\antigravity\\\\brain\\\\6474e280-c05b-40c4-9eb2-31621027da68\\\\scratch\\\\blocks_v2.json', JSON.stringify(textBlocks, null, 2), 'utf8');
console.log('Saved to blocks_v2.json');
