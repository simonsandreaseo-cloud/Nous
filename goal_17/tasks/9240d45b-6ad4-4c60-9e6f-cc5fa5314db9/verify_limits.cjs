const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/9240d45b-6ad4-4c60-9e6f-cc5fa5314db9';
const baseFile = path.join(dir, 'latest_base.html');
const baseContent = fs.readFileSync(baseFile, 'utf8');

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

// Let's load apply_surgical.cjs or inspect its passes
const surgCode = fs.readFileSync(path.join(dir, 'apply_surgical.cjs'), 'utf8');

// We can run the exact logic and check the distance for each chunk between Base and Pass 1, between Pass 1 and Pass 2, and between Pass 2 and Pass 3!
// Wait! Is the limit per pass on top of previous pass, or cumulative from base?
// Let's re-read the prompt carefully!
