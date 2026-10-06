const fs = require('fs');
const path = require('path');

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

function verifyStrictLimits(prevContent, newContent, passLabel) {
    const prevLines = prevContent.split('\n');
    const newLines = newContent.split('\n');

    if (prevLines.length !== newLines.length) {
        throw new Error(`[${passLabel}] Line count mismatch: ${prevLines.length} vs ${newLines.length}`);
    }

    let maxLevRatio = 0;
    let maxLcsRatio = 0;
    let editedLines = 0;

    for (let i = 0; i < prevLines.length; i++) {
        const pLine = prevLines[i].trim();
        const nLine = newLines[i].trim();
        if (!pLine || /^<\/?(table|thead|tbody|tr|ul|ol|div)>$/i.test(pLine)) continue;

        const pText = pLine.replace(/<[^>]+>/g, '').trim();
        const nText = nLine.replace(/<[^>]+>/g, '').trim();

        const pWords = pText.split(/\s+/).filter(Boolean);
        const nWords = nText.split(/\s+/).filter(Boolean);

        const m = pWords.length;
        if (m === 0) continue;

        const levDist = wordLevenshtein(pWords, nWords);
        const lcs = wordLCS(pWords, nWords);
        const lcsEdits = m - lcs;

        const levRatio = (levDist / m);
        const lcsRatio = (lcsEdits / m);

        if (levDist > 0 || lcsEdits > 0) {
            editedLines++;
        }

        if (levRatio > maxLevRatio) maxLevRatio = levRatio;
        if (lcsRatio > maxLcsRatio) maxLcsRatio = lcsRatio;

        if (levRatio >= 0.05 || lcsRatio >= 0.05) {
            throw new Error(`[${passLabel}] LIMIT VIOLATION on Line ${i+1}: Lev=${(levRatio * 100).toFixed(2)}%, LCS=${(lcsRatio * 100).toFixed(2)}% (Max permitted < 5.00%). Words=${m}. Prev: "${pText}" | Next: "${nText}"`);
        }
    }

    // Tag verification
    const prevTags = prevContent.match(/<[^>]+>/g) || [];
    const newTags = newContent.match(/<[^>]+>/g) || [];
    if (prevTags.length !== newTags.length) {
        throw new Error(`[${passLabel}] HTML tag count mismatch: ${prevTags.length} vs ${newTags.length}`);
    }
    for (let i = 0; i < prevTags.length; i++) {
        if (prevTags[i] !== newTags[i]) {
            throw new Error(`[${passLabel}] Tag mismatch at index ${i}: "${prevTags[i]}" vs "${newTags[i]}"`);
        }
    }

    console.log(`[${passLabel}] PASSED! Edited lines: ${editedLines}, Max Lev: ${(maxLevRatio * 100).toFixed(2)}%, Max LCS: ${(maxLcsRatio * 100).toFixed(2)}% (Strict limit < 5.00%)`);
}

module.exports = {
    wordLevenshtein,
    wordLCS,
    verifyStrictLimits
};
