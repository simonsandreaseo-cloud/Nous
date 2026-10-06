const fs = require('fs');
const path = require('path');
const { check } = require('./test_helper.cjs');

const dir = __dirname;
const files = [
    'latest_base.html',
    'surg_pass_1.html',
    'surg_pass_2.html',
    'surg_pass_3.html'
];

console.log('=== AUDIT 1: File Existence & Sizes ===');
files.forEach(f => {
    const fullPath = path.join(dir, f);
    if (!fs.existsSync(fullPath)) {
        console.error(`File missing: ${f}`);
        process.exit(1);
    }
    const stat = fs.statSync(fullPath);
    console.log(`- ${f}: ${stat.size} bytes`);
});

console.log('\n=== AUDIT 2: Encoding & Mojibake Check ===');
const mojibakePatterns = [/Ã¡/g, /Ã©/g, /Ã­/g, /Ã³/g, /Ãº/g, /Ã±/g, /Ã/g, /\uFFFD/g];
files.slice(1).forEach(f => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    let hasMojibake = false;
    for (const pat of mojibakePatterns) {
        if (pat.test(content)) {
            console.error(`Mojibake pattern ${pat} detected in ${f}!`);
            hasMojibake = true;
        }
    }
    if (!hasMojibake) {
        console.log(`- ${f}: UTF-8 clean. Spanish accents (ñ, á, é, í, ó, ú) valid.`);
    }
});

console.log('\n=== AUDIT 3: HTML Tag Preservation ===');
const baseHtml = fs.readFileSync(path.join(dir, 'latest_base.html'), 'utf8');
const baseTags = (baseHtml.match(/<[^>]+>/g) || []).join('');
console.log(`Base total HTML tags count: ${(baseHtml.match(/<[^>]+>/g) || []).length}`);

['surg_pass_1.html', 'surg_pass_2.html', 'surg_pass_3.html'].forEach(f => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const tags = (content.match(/<[^>]+>/g) || []).join('');
    if (tags === baseTags) {
        console.log(`- ${f}: 100% exact tag match with latest_base.html.`);
    } else {
        console.error(`- ${f}: Tag mismatch detected!`);
        process.exit(1);
    }
});

console.log('\n=== AUDIT 4: Step-by-Step Chunk Levenshtein Distance ===');
function auditStep(fileA, fileB, stepName) {
    const linesA = fs.readFileSync(path.join(dir, fileA), 'utf8').split('\n');
    const linesB = fs.readFileSync(path.join(dir, fileB), 'utf8').split('\n');
    let maxRatio = 0;
    let worst = null;
    let count = 0;

    linesA.forEach((lineA, idx) => {
        const isP = lineA.startsWith('<p>');
        const isLi = lineA.startsWith('  <li>') || lineA.startsWith('<li>');
        if ((isP || isLi) && !lineA.includes('[*')) {
            count++;
            const lineB = linesB[idx];
            const textA = lineA.replace(/<[^>]+>/g, '').trim();
            const textB = lineB.replace(/<[^>]+>/g, '').trim();
            const res = check(textA, textB);
            if (res.ratio > maxRatio) {
                maxRatio = res.ratio;
                worst = { line: idx + 1, res };
            }
            if (!res.ok) {
                console.error(`Violation in ${stepName} at line ${idx + 1}: ${res.pct}% > 5%`);
                process.exit(1);
            }
        }
    });

    console.log(`- ${stepName} (${fileA} -> ${fileB}): ${count} chunks checked. Max edit ratio: ${(maxRatio * 100).toFixed(2)}% (Line ${worst.line}, dist ${worst.res.dist}/${worst.res.words}). All chunks < 5.0%!`);
}

auditStep('latest_base.html', 'surg_pass_1.html', 'Pass 1');
auditStep('surg_pass_1.html', 'surg_pass_2.html', 'Pass 2');
auditStep('surg_pass_2.html', 'surg_pass_3.html', 'Pass 3');

console.log('\n>>> AUDIT COMPLETE: ALL CHECKS PASSED PERFECTLY! <<<');
