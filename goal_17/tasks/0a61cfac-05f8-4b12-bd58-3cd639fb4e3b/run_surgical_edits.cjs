const fs = require('fs');
const path = require('path');
const { edits } = require('./test_chunk_edits.cjs');

const taskDir = __dirname;
const baseFile = path.join(taskDir, 'latest_base.html');
const pass1File = path.join(taskDir, 'surg_pass_1.html');
const pass2File = path.join(taskDir, 'surg_pass_2.html');
const pass3File = path.join(taskDir, 'surg_pass_3.html');

console.log(`Task directory: ${taskDir}`);

function wordLevenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
}

function extractTags(str) {
    return (str.match(/<[^>]+>/g) || []).join('');
}

function getWords(line) {
    return line.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean);
}

function applyPass(inputContent, passKey, passName) {
    const lines = inputContent.split('\n');
    let maxRatio = 0;
    let maxLine = 0;

    for (const [lineNumStr, config] of Object.entries(edits)) {
        const lineNum = parseInt(lineNumStr);
        const origLine = lines[lineNum - 1];
        const [target, replacement] = config[passKey];

        if (!origLine.includes(target)) {
            throw new Error(`[${passName}] Target not found on line ${lineNum}: "${target}"`);
        }

        const newLine = origLine.replace(target, replacement);

        // Verify tags
        const origTags = extractTags(origLine);
        const newTags = extractTags(newLine);
        if (origTags !== newTags) {
            throw new Error(`[${passName}] Tag mismatch on line ${lineNum}!`);
        }

        // Verify word Levenshtein ratio
        const origWords = getWords(origLine);
        const newWords = getWords(newLine);
        const dist = wordLevenshtein(origWords, newWords);
        const ratio = dist / origWords.length;

        if (ratio >= 0.05) {
            throw new Error(`[${passName}] Ratio exceeded limit on line ${lineNum}: ${(ratio * 100).toFixed(2)}% >= 5%`);
        }

        if (ratio > maxRatio) {
            maxRatio = ratio;
            maxLine = lineNum;
        }

        lines[lineNum - 1] = newLine;
    }

    const outputContent = lines.join('\n');

    // Global document tag check
    if (extractTags(inputContent) !== extractTags(outputContent)) {
        throw new Error(`[${passName}] Global HTML tags mismatch!`);
    }

    console.log(`[${passName}] Successfully applied to ${Object.keys(edits).length} chunks.`);
    console.log(`[${passName}] Max edit ratio: ${(maxRatio * 100).toFixed(2)}% on line ${maxLine} (STRICTLY < 5.00%)`);

    return outputContent;
}

// --- Step 1: Base -> Pass 1 ---
console.log('\n==============================');
console.log('--- Applying Surgical Pass 1 ---');
console.log('==============================');
const baseContent = fs.readFileSync(baseFile, 'utf8');
const pass1Content = applyPass(baseContent, 'p1', 'Pass 1');
fs.writeFileSync(pass1File, pass1Content, 'utf8');
console.log(`Saved surg_pass_1.html (${pass1Content.length} bytes)`);

// --- Step 2: Pass 1 -> Pass 2 ---
console.log('\n==============================');
console.log('--- Applying Surgical Pass 2 ---');
console.log('==============================');
const readPass1 = fs.readFileSync(pass1File, 'utf8');
const pass2Content = applyPass(readPass1, 'p2', 'Pass 2');
fs.writeFileSync(pass2File, pass2Content, 'utf8');
console.log(`Saved surg_pass_2.html (${pass2Content.length} bytes)`);

// --- Step 3: Pass 2 -> Pass 3 ---
console.log('\n==============================');
console.log('--- Applying Surgical Pass 3 ---');
console.log('==============================');
const readPass2 = fs.readFileSync(pass2File, 'utf8');
const pass3Content = applyPass(readPass2, 'p3', 'Pass 3');
fs.writeFileSync(pass3File, pass3Content, 'utf8');
console.log(`Saved surg_pass_3.html (${pass3Content.length} bytes)`);

console.log('\n======================================================');
console.log('All 3 surgical passes completed and validated successfully!');
console.log('======================================================');
