const fs = require('fs');
const path = require('path');

const dir = __dirname;
const baseFile = path.join(dir, 'latest_base.html');
const pass1File = path.join(dir, 'surg_pass_1.html');
const pass2File = path.join(dir, 'surg_pass_2.html');
const pass3File = path.join(dir, 'surg_pass_3.html');

function wordLevenshtein(words1, words2) {
    const m = words1.length;
    const n = words2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (words1[i - 1] === words2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
            else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function wordLCS(words1, words2) {
    const m = words1.length;
    const n = words2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (words1[i - 1] === words2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}

function verifyPass(prevContent, newContent, passName) {
    console.log(`\n=== VERIFYING ${passName} ===`);
    // Tag level chunks
    const regex = /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>[\s\S]*?<\/p>|<li[^>]*>[\s\S]*?<\/li>|<blockquote[^>]*>[\s\S]*?<\/blockquote>|<th[^>]*>[\s\S]*?<\/th>|<td[^>]*>[\s\S]*?<\/td>)/gi;
    const getChunks = html => {
        const c = [];
        let m;
        while ((m = regex.exec(html)) !== null) c.push(m[0]);
        return c;
    };

    const prevChunks = getChunks(prevContent);
    const newChunks = getChunks(newContent);
    if (prevChunks.length !== newChunks.length) {
        throw new Error(`Chunk count mismatch: ${prevChunks.length} vs ${newChunks.length}`);
    }

    let maxChunkLev = 0;
    let maxChunkLcs = 0;
    let editedChunks = 0;

    for (let i = 0; i < prevChunks.length; i++) {
        const pText = prevChunks[i].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const nText = newChunks[i].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const pWords = pText.split(/\s+/).filter(Boolean);
        const nWords = nText.split(/\s+/).filter(Boolean);
        if (pWords.length === 0) continue;

        const lev = wordLevenshtein(pWords, nWords);
        const lcs = wordLCS(pWords, nWords);
        const lcsEdits = pWords.length - lcs;

        const levRatio = lev / pWords.length;
        const lcsRatio = lcsEdits / pWords.length;

        if (lev > 0) editedChunks++;
        if (levRatio > maxChunkLev) maxChunkLev = levRatio;
        if (lcsRatio > maxChunkLcs) maxChunkLcs = lcsRatio;

        if (levRatio >= 0.05 || lcsRatio >= 0.05) {
            throw new Error(`VIOLATION on Chunk ${i}: Lev=${(levRatio*100).toFixed(2)}%, LCS=${(lcsRatio*100).toFixed(2)}% >= 5%`);
        }
    }

    // Line level check
    const prevLines = prevContent.split('\n');
    const newLines = newContent.split('\n');
    if (prevLines.length !== newLines.length) {
        throw new Error(`Line count mismatch: ${prevLines.length} vs ${newLines.length}`);
    }

    let maxLineLev = 0;
    for (let l = 0; l < prevLines.length; l++) {
        const pWords = prevLines[l].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
        const nWords = newLines[l].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
        if (pWords.length === 0) continue;
        const lev = wordLevenshtein(pWords, nWords);
        const ratio = lev / pWords.length;
        if (ratio > maxLineLev) maxLineLev = ratio;
        if (ratio >= 0.05) {
            throw new Error(`VIOLATION on Line ${l+1}: ${(ratio*100).toFixed(2)}% >= 5%`);
        }
    }

    // HTML tags check
    const getTags = str => (str.match(/<[^>]+>/g) || []).map(t => t.toLowerCase());
    const pTags = getTags(prevContent);
    const nTags = getTags(newContent);
    if (pTags.length !== nTags.length) {
        throw new Error(`Tag count mismatch: ${pTags.length} vs ${nTags.length}`);
    }
    for (let t = 0; t < pTags.length; t++) {
        if (pTags[t] !== nTags[t]) {
            throw new Error(`Tag mismatch at ${t}: ${pTags[t]} vs ${nTags[t]}`);
        }
    }

    console.log(`✓ Chunks: ${prevChunks.length} total, ${editedChunks} edited.`);
    console.log(`✓ Max Chunk Levenshtein Ratio: ${(maxChunkLev*100).toFixed(2)}% (< 5.00%)`);
    console.log(`✓ Max Chunk LCS Edit Ratio: ${(maxChunkLcs*100).toFixed(2)}% (< 5.00%)`);
    console.log(`✓ Max Line Levenshtein Ratio: ${(maxLineLev*100).toFixed(2)}% (< 5.00%)`);
    console.log(`✓ HTML Tags: ${pTags.length} tags 100% matched.`);
}

function verifyEncoding(filePath) {
    const bytes = fs.readFileSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const hasBOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    const doubleEncoded = /Ã[¡±³º©ª®¯°±²³´µ¶·¸¹º»¼½¾¿]/.test(content);
    if (hasBOM) throw new Error(`BOM found in ${filePath}`);
    if (doubleEncoded) throw new Error(`Double encoding found in ${filePath}`);
    console.log(`✓ Encoding for ${path.basename(filePath)}: Valid UTF-8 without BOM, no double encoding artifacts.`);
}

const baseContent = fs.readFileSync(baseFile, 'utf8');
const pass1Content = fs.readFileSync(pass1File, 'utf8');
const pass2Content = fs.readFileSync(pass2File, 'utf8');
const pass3Content = fs.readFileSync(pass3File, 'utf8');

verifyEncoding(pass1File);
verifyEncoding(pass2File);
verifyEncoding(pass3File);

verifyPass(baseContent, pass1Content, 'Pass 1 (base -> pass 1)');
verifyPass(pass1Content, pass2Content, 'Pass 2 (pass 1 -> pass 2)');
verifyPass(pass2Content, pass3Content, 'Pass 3 (pass 2 -> pass 3)');

console.log('\n=============================================');
console.log('ALL PASSES FULLY VERIFIED AND MATHEMATICALLY SOUND!');
console.log('=============================================\n');
