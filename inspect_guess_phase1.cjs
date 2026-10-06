const fs = require('fs');

const ref = fs.readFileSync('C:/Users/Simon San/.gemini/antigravity/brain/6474e280-c05b-40c4-9eb2-31621027da68/.system_generated/steps/965/content.md', 'utf8');

const blocks = ref.match(/<a class="image__link"[^>]*>[\s\S]*?<\/a>/gi) || [];
const seen = new Set();
console.log('=== REFERENCE LANDING PAGE IMAGES & PRODUCT LINKS ===');
blocks.forEach(b => {
  const hrefMatch = b.match(/href="([^"]+)"/);
  const imgMatch = b.match(/data-desktop="([^"]+)"/);
  const href = hrefMatch ? hrefMatch[1] : 'none';
  const img = imgMatch ? imgMatch[1] : 'none';
  const key = img + '\n   -> ' + href;
  if (!seen.has(key)) {
    seen.add(key);
    console.log(key);
  }
});

console.log('\n=== GUESS ARTICLE FULL TEXT & SECTIONS ===');
const html = fs.readFileSync('guess_latest.html', 'utf8');
console.log('Headings in current article:');
console.log(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g));

console.log('\nLinks in current article:');
console.log(html.match(/<a[^>]*>.*?<\/a>/g));

console.log('\nShortcodes [*...*] or {*...*} in current article:');
console.log(html.match(/[\[\{]\*[0-9]+\*[\]\}]/g));
