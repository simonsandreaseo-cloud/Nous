const fs = require('fs');

const filePath = 'src/lib/services/writer/pipeline.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    /chunkHtml = chunkResult\.html;\s+if \(chunkResult\.usage\) \{\s+const \{ useQueueStore \} = require\('@\/store\/useQueueStore'\);\s+useQueueStore\.getState\(\)\.addUsageToTask\(task\.id, chunkResult\.usage\);\s+\}/g,
    \chunkHtml = chunkResult.html;
            if (chunkResult.usage) {
                const { useQueueStore } = require('@/store/useQueueStore');
                const activeTask = useQueueStore.getState().activeTask;
                if (activeTask) {
                    useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                } else {
                    useQueueStore.getState().addUsageToTask(task.id, chunkResult.usage);
                }
            }\
);

content = content.replace(
    /const cleanupRes = await streamFinalCleanup\(chunkHtml, onLog\); chunkHtml = cleanupRes\.html; if \(cleanupRes\.usage\) \{ const \{ useQueueStore \} = await import\("@\/store\/useQueueStore"\); useQueueStore\.getState\(\)\.addUsageToTask\(task\.id, cleanupRes\.usage\); \}/g,
    \const cleanupRes = await streamFinalCleanup(chunkHtml, onLog); chunkHtml = cleanupRes.html; if (cleanupRes.usage) { const { useQueueStore } = await import("@/store/useQueueStore"); const activeTask = useQueueStore.getState().activeTask; if (activeTask) { useQueueStore.getState().addUsageToTask(activeTask.id, cleanupRes.usage); } }\
);

content = content.replace(
    /accumulatedHtml \+= chunkResult\.html \+ '\\n';\s+onChunk\(accumulatedHtml\);\s+success = true;/g,
    \ccumulatedHtml += chunkResult.html + '\\n';
                onChunk(accumulatedHtml);
                
                if (chunkResult.usage) {
                    const { useQueueStore } = require('@/store/useQueueStore');
                    const activeTask = useQueueStore.getState().activeTask;
                    if (activeTask) {
                        useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                    } else {
                        useQueueStore.getState().addUsageToTask(task.id, chunkResult.usage);
                    }
                }
                
                success = true;\
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
