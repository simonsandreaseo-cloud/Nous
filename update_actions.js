const fs = require('fs');

let content = fs.readFileSync('src/lib/actions/aiActions.ts', 'utf-8');

// Update runHumanizerPipeline signature
content = content.replace(
    `    modelName: string = 'gemma-4-31b-it', \n    onChunk?: (chunkHtml: string) => void\n): Promise<{ html: string; metadata?: any }> => {`,
    `    modelName: string = 'gemma-4-31b-it', \n    onChunk?: (chunkHtml: string) => void,\n    onProgress?: (percent: number) => void\n): Promise<{ html: string; metadata?: any }> => {`
);

// Update runMiniHumanizerPipeline signature
content = content.replace(
    `    modelName: string = 'gemini-3.5-flash', \n    onChunk?: (chunkHtml: string) => void,\n    onLog?: (msg: string) => void,\n    mode: string = 'standard'\n): Promise<{ html: string; metadata?: any }> => {`,
    `    modelName: string = 'gemini-3.5-flash', \n    onChunk?: (chunkHtml: string) => void,\n    onLog?: (msg: string) => void,\n    mode: string = 'standard',\n    onProgress?: (percent: number) => void\n): Promise<{ html: string; metadata?: any }> => {`
);

// Pass onProgress from runHumanizerPipeline to runMiniHumanizerPipeline
content = content.replace(
    `            onChunk\n        );`,
    `            onChunk,\n            onProgress\n        );`
);

// Add progress to inner loop in runHumanizerPipeline
const oldLoop = `            allProcessedBlocks = { ...allProcessedBlocks, ...(processedChunk as any) };\n        }\n        \n        safeStatus(\`Reconstruyendo el HTML...\`);`;
const newLoop = `            allProcessedBlocks = { ...allProcessedBlocks, ...(processedChunk as any) };
            for (const [id, humanizedText] of Object.entries(processedChunk as any)) {
                if (id === 'razonamiento_interno') continue;
                const el = $(\`[data-humanize-id="\${id}"]\`);
                if (el.length > 0 && typeof humanizedText === 'string') {
                    el.html(humanizedText);
                }
            }
            if (onChunk) onChunk($.html());
            if (onProgress) {
                const percent = Math.min(100, Math.round(((i + chunkSize) / entries.length) * 100));
                onProgress(percent);
            }
        }
        
        safeStatus(\`Reconstruyendo el HTML...\`);`;
content = content.replace(oldLoop, newLoop);

// Add progress to inner loop in legacy_json inside runMiniHumanizerPipeline
const oldLegacyLoop = `                allProcessedBlocks = { ...allProcessedBlocks, ...(processedChunk as any) };\n            }\n            \n            safeStatus(\`Reconstruyendo el HTML...\`);`;
const newLegacyLoop = `                allProcessedBlocks = { ...allProcessedBlocks, ...(processedChunk as any) };
                for (const [id, humanizedText] of Object.entries(processedChunk as any)) {
                    if (id === 'razonamiento_interno') continue;
                    const el = $(\`[data-humanize-id="\${id}"]\`);
                    if (el.length > 0 && typeof humanizedText === 'string') {
                        el.html(humanizedText);
                    }
                }
                if (onChunk) {
                    const currentHtml = $.html();
                    const tmp = cheerio.load(currentHtml, { decodeEntities: false }, false);
                    tmp('[data-sys-hdr]').each((_, el) => {
                        const id = tmp(el).attr('data-sys-hdr');
                        if (id && protectedHeaders[id] !== undefined) {
                            tmp(el).html(protectedHeaders[id]);
                            tmp(el).removeAttr('data-sys-hdr');
                        }
                    });
                    tmp('[data-sys-tbl]').each((_, el) => {
                        const id = tmp(el).attr('data-sys-tbl');
                        if (id && protectedTables[id] !== undefined) {
                            tmp(el).html(protectedTables[id]);
                            tmp(el).removeAttr('data-sys-tbl');
                        }
                    });
                    tmp('[data-humanize-id]').removeAttr('data-humanize-id');
                    onChunk(tmp.html());
                }
                if (onProgress) {
                    const percent = Math.min(100, Math.round(((i + chunkSize) / entries.length) * 100));
                    onProgress(percent);
                }
            }
            
            safeStatus(\`Reconstruyendo el HTML...\`);`;
content = content.replace(oldLegacyLoop, newLegacyLoop);

// Disable runFinalCleaningLayer
content = content.replace(
    /export const runFinalCleaningLayer = async \([\s\S]+?catch \(e: any\) \{\s+safeStatus\(`Error fatal en limpieza final.+?\s+return html;\s+\}\s+\};/,
    `export const runFinalCleaningLayer = async (html: string, onStatus?: (msg: string) => void): Promise<string> => {
    if (onStatus) onStatus('Omitiendo limpieza HTML (desactivado)...');
    return html;
};`);

// Disable runContentCleaning
content = content.replace(
    /export const runContentCleaning = async \([\s\S]+?catch \(e: any\) \{\s+safeStatus\(`⚠️ Error en limpieza.+?\s+return html;\s+\}\s+\};/,
    `export const runContentCleaning = async (html: string, onStatus?: (msg: string) => void): Promise<string> => {
    if (onStatus) onStatus('Omitiendo limpieza HTML (desactivado)...');
    return html;
};`);

fs.writeFileSync('src/lib/actions/aiActions.ts', content, 'utf-8');
console.log('Update successful');
