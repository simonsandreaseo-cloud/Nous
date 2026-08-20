import sys

file_path = 'src/lib/services/writer/pipeline.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '''            chunkHtml = chunkResult.html;
            if (chunkResult.usage) {
                const { useQueueStore } = require('@/store/useQueueStore');
                useQueueStore.getState().addUsageToTask(task.id, chunkResult.usage);
            }'''
replace1 = '''            chunkHtml = chunkResult.html;
            if (chunkResult.usage) {
                const { useQueueStore } = require('@/store/useQueueStore');
                const activeTask = useQueueStore.getState().activeTask;
                if (activeTask) {
                    useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                }
            }'''
content = content.replace(target1, replace1)

target2 = 'const cleanupRes = await streamFinalCleanup(chunkHtml, onLog); chunkHtml = cleanupRes.html; if (cleanupRes.usage) { const { useQueueStore } = await import("@/store/useQueueStore"); useQueueStore.getState().addUsageToTask(task.id, cleanupRes.usage); }'
replace2 = 'const cleanupRes = await streamFinalCleanup(chunkHtml, onLog); chunkHtml = cleanupRes.html; if (cleanupRes.usage) { const { useQueueStore } = await import("@/store/useQueueStore"); const activeTask = useQueueStore.getState().activeTask; if (activeTask) { useQueueStore.getState().addUsageToTask(activeTask.id, cleanupRes.usage); } }'
content = content.replace(target2, replace2)

target3 = '''                accumulatedHtml += chunkResult.html + '\n';
                onChunk(accumulatedHtml);
                success = true;'''
replace3 = '''                accumulatedHtml += chunkResult.html + '\n';
                onChunk(accumulatedHtml);
                
                if (chunkResult.usage) {
                    const { useQueueStore } = require('@/store/useQueueStore');
                    const activeTask = useQueueStore.getState().activeTask;
                    if (activeTask) {
                        useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                    }
                }
                
                success = true;'''
content = content.replace(target3, replace3)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
