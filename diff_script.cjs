const fs = require('fs');
const orig = fs.readFileSync('original_content.txt', 'utf8');
const clean = fs.readFileSync('cleaned_content.txt', 'utf8');

// A very naive diffing simply by splitting into sentences and seeing which ones changed
const splitRegex = /(?<=<\/?[^>]+>)|(?=[<])/;
const oParts = orig.split(splitRegex).filter(Boolean);
const cParts = clean.split(splitRegex).filter(Boolean);

let diffs = [];

for (let i = 0, j = 0; i < oParts.length || j < cParts.length; ) {
    if (oParts[i] === cParts[j]) {
        i++; j++;
    } else {
        // Find next match to resync
        let nextMatchIdx = -1;
        for(let k = i + 1; k < Math.min(i + 15, oParts.length); k++) {
            if (oParts[k] === cParts[j]) {
                diffs.push({ type: 'deleted', content: oParts.slice(i, k).join('') });
                i = k;
                nextMatchIdx = k;
                break;
            }
            if (oParts[k] === cParts[j+1]) {
               diffs.push({ type: 'changed', original: oParts.slice(i, k).join(''), cleaned: cParts.slice(j, j+1).join('')});
               i = k;
               j = j+1;
               nextMatchIdx = k;
               break;
            }
        }
        if (nextMatchIdx === -1) {
            // just step 1
            diffs.push({ type: 'changed', original: oParts[i], cleaned: cParts[j] });
            i++; j++;
        }
    }
}

diffs.forEach(d => {
    if (d.type === 'changed' && !d.original.includes('<img') && !d.original.includes('<table')) {
        console.log('--- ORIGINAL ---');
        console.log(d.original.trim());
        console.log('--- CHANGED ---');
        console.log(d.cleaned ? d.cleaned.trim() : '');
        console.log();
    }
});
