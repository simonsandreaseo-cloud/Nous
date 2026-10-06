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
            if (words1[i - 1] === words2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],
                    dp[i][j - 1],
                    dp[i - 1][j - 1]
                );
            }
        }
    }
    return dp[m][n];
}

function check(origText, newText) {
    const origWords = origText.split(/\s+/).filter(Boolean);
    const newWords = newText.split(/\s+/).filter(Boolean);
    const dist = wordLevenshtein(origWords, newWords);
    const ratio = dist / origWords.length;
    return {
        words: origWords.length,
        dist,
        ratio,
        pct: (ratio * 100).toFixed(2),
        ok: ratio < 0.05
    };
}

module.exports = { wordLevenshtein, check };
