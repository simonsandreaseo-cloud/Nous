const fs = require('fs');
let content = fs.readFileSync('src/lib/actions/aiActions.ts', 'utf8');

// For standard mode
const target1 = `                if (onLog) {
                    onLog(\`=== [MINI-HUMANIZADOR] FINAL (\${stepName}) ===\\n\` + raw);
                }

                return raw;
            });`;
const injection1 = `                if (onLog) {
                    onLog(\`=== [MINI-HUMANIZADOR] FINAL (\${stepName}) ===\\n\` + raw);
                }

                return raw;
            }, onStatus, stepName, modelName, providerOverride, reasoning);`;

// For json mode
const target2 = `                    if (onLog) {
                        onLog(\`=== [MINI-HUMANIZADOR JSON] ERROR ===\\n\` + e);
                    }
                    throw e;
                }
            });`;
const injection2 = `                    if (onLog) {
                        onLog(\`=== [MINI-HUMANIZADOR JSON] ERROR ===\\n\` + e);
                    }
                    throw e;
                }
            }, onStatus, 'Mini-Humanizador JSON', modelName, providerOverride, reasoning);`;

content = content.replace(target1, injection1);
content = content.replace(target2, injection2);

fs.writeFileSync('src/lib/actions/aiActions.ts', content, 'utf8');
console.log("Patched missing args");
