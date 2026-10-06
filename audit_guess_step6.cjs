const fs = require('fs');

const html = fs.readFileSync('guess_step6_polished.html', 'utf8');

console.log('=== AUDIT OF guess_step6_polished.html ===');
console.log('Length:', html.length);
console.log('Emojis remaining:', html.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{FE0F}]/gu));
console.log('Nested <p> inside <li>:', html.match(/<li>\s*<p>/g));
console.log('<ol> remaining:', html.match(/<ol>/g));

console.log('\n--- HEADINGS ---');
console.log(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g));

console.log('\n--- LINKS ---');
console.log(html.match(/<a[^>]*>.*?<\/a>/g));

console.log('\n--- UL LISTS ---');
const uls = html.match(/<ul>[\s\S]*?<\/ul>/g) || [];
console.log('Total ULs:', uls.length);
uls.forEach((u, i) => {
  console.log(`UL ${i + 1} (${(u.match(/<li>/g) || []).length} items):`, u.substring(0, 120).replace(/\n/g, ' ') + '...');
});
