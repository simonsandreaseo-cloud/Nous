const fs = require('fs');

const filePath = 'src/lib/services/writer/pipeline.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target1 = `            chunkHtml = chunkResult.html;
            if (chunkResult.usage) {
                const { useQueueStore } = require('@/store/useQueueStore');
                useQueueStore.getState().addUsageToTask(task.id, chunkResult.usage);
            }`;
const replace1 = `            chunkHtml = chunkResult.html;
            if (chunkResult.usage) {
                const { useQueueStore } = require('@/store/useQueueStore');
                const activeTask = useQueueStore.getState().activeTask;
                if (activeTask) {
                    useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                }
            }`;
content = content.replace(target1, replace1).replace(target1, replace1);

const target2 = 'const cleanupRes = await streamFinalCleanup(chunkHtml, onLog); chunkHtml = cleanupRes.html; if (cleanupRes.usage) { const { useQueueStore } = await import("@/store/useQueueStore"); useQueueStore.getState().addUsageToTask(task.id, cleanupRes.usage); }';
const replace2 = 'const cleanupRes = await streamFinalCleanup(chunkHtml, onLog); chunkHtml = cleanupRes.html; if (cleanupRes.usage) { const { useQueueStore } = await import("@/store/useQueueStore"); const activeTask = useQueueStore.getState().activeTask; if (activeTask) { useQueueStore.getState().addUsageToTask(activeTask.id, cleanupRes.usage); } }';
content = content.replace(target2, replace2);

const target3 = `                accumulatedHtml += chunkResult.html + '\\n';
                onChunk(accumulatedHtml);
                success = true;`;
const replace3 = `                accumulatedHtml += chunkResult.html + '\\n';
                onChunk(accumulatedHtml);
                
                if (chunkResult.usage) {
                    const { useQueueStore } = require('@/store/useQueueStore');
                    const activeTask = useQueueStore.getState().activeTask;
                    if (activeTask) {
                        useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                    }
                }
                
                success = true;`;
content = content.replace(target3, replace3);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
