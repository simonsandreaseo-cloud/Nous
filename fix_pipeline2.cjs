const fs = require('fs');

const filePath = 'src/lib/services/writer/pipeline.ts';
let content = fs.readFileSync(filePath, 'utf8');

let replaced1 = 0;
content = content.replace(
    /chunkHtml = chunkResult\.html;\s+if \(chunkResult\.usage\) \{\s+const \{ useQueueStore \} = require\('@\/store\/useQueueStore'\);\s+useQueueStore\.getState\(\)\.addUsageToTask\(task\.id, chunkResult\.usage\);\s+\}/g,
    () => { replaced1++; return \chunkHtml = chunkResult.html;
            if (chunkResult.usage) {
                const { useQueueStore } = require('@/store/useQueueStore');
                const activeTask = useQueueStore.getState().activeTask;
                if (activeTask) {
                    useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                } else {
                    useQueueStore.getState().addUsageToTask(task.id, chunkResult.usage);
                }
            }\; }
);

let replaced2 = 0;
content = content.replace(
    /const cleanupRes = await streamFinalCleanup\(chunkHtml, onLog\); chunkHtml = cleanupRes\.html; if \(cleanupRes\.usage\) \{ const \{ useQueueStore \} = await import\("@\/store\/useQueueStore"\); useQueueStore\.getState\(\)\.addUsageToTask\(task\.id, cleanupRes\.usage\); \}/g,
    () => { replaced2++; return \const cleanupRes = await streamFinalCleanup(chunkHtml, onLog); chunkHtml = cleanupRes.html; if (cleanupRes.usage) { const { useQueueStore } = await import("@/store/useQueueStore"); const activeTask = useQueueStore.getState().activeTask; if (activeTask) { useQueueStore.getState().addUsageToTask(activeTask.id, cleanupRes.usage); } }\; }
);

let replaced3 = 0;
content = content.replace(
    /accumulatedHtml \+= chunkResult\.html \+ '\\n';\s+onChunk\(accumulatedHtml\);\s+success = true;/g,
    () => { replaced3++; return \ccumulatedHtml += chunkResult.html + '\\n';
                onChunk(accumulatedHtml);
                
                if (chunkResult.usage) {
                    const { useQueueStore } = require('@/store/useQueueStore');
                    const activeTask = useQueueStore.getState().activeTask;
                    if (activeTask) {
                        useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                    } else if (task && task.id) {
                        useQueueStore.getState().addUsageToTask(task.id, chunkResult.usage);
                    }
                }
                
                success = true;\; }
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced 1:', replaced1, 'Replaced 2:', replaced2, 'Replaced 3:', replaced3);
