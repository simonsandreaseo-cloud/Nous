import re

file_path = 'src/lib/services/writer/pipeline.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix target1 (DraftPipeline generation)
content = re.sub(
    r"chunkHtml = chunkResult\.html;\s+if \(chunkResult\.usage\) \{\s+const \{ useQueueStore \} = require\('@/store/useQueueStore'\);\s+useQueueStore\.getState\(\)\.addUsageToTask\(task\.id, chunkResult\.usage\);\s+\}",
    '''chunkHtml = chunkResult.html;
            if (chunkResult.usage) {
                const { useQueueStore } = require('@/store/useQueueStore');
                const activeTask = useQueueStore.getState().activeTask;
                if (activeTask) {
                    useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                } else {
                    useQueueStore.getState().addUsageToTask(task.id, chunkResult.usage);
                }
            }''',
    content
)

# Fix target3 (HumanizePipeline chunkResult)
content = re.sub(
    r"accumulatedHtml \+= chunkResult\.html \+ '\\n';\s+onChunk\(accumulatedHtml\);\s+success = true;",
    '''accumulatedHtml += chunkResult.html + '\\n';
                onChunk(accumulatedHtml);
                
                if (chunkResult.usage) {
                    const { useQueueStore } = require('@/store/useQueueStore');
                    const activeTask = useQueueStore.getState().activeTask;
                    if (activeTask) {
                        useQueueStore.getState().addUsageToTask(activeTask.id, chunkResult.usage);
                    }
                }
                
                success = true;''',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
