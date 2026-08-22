const fs = require('fs');
const filePath = 'src/lib/client/pipelineExecutor.ts';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(
    /const cleanRes = await streamFinalCleanup\(newContent, \(\) => \{\}\); newContent = cleanRes\.html; if\(cleanRes\.usage\) useQueueStore\.getState\(\)\.addUsageToTask\(task\.id, cleanRes\.usage\);/g,
    `const cleanRes = await streamFinalCleanup(newContent, () => {}); newContent = cleanRes.html; if(cleanRes.usage) { const activeTask = useQueueStore.getState().activeTask; if(activeTask) { useQueueStore.getState().addUsageToTask(activeTask.id, cleanRes.usage); } else { useQueueStore.getState().addUsageToTask(task.id, cleanRes.usage); } }`
);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
