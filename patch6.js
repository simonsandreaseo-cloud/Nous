@
const fs = require("fs");
let content = fs.readFileSync("src/components/contents/writer/useWriterActions.ts", "utf8");

content = content.replace(/enqueueTask\(\s*'([^']+)',/g, "enqueueTask('$1',");

content = content.replace(/enqueueTask\(\s*'([^']+)',\s*'([^']+)',\s*async\s*\(\)\s*=>\s*\{/g, (match, p1, p2) => {
    return "{\n        const targetTaskId = store.draftId;\n        const targetProjectId = activeProject?.id;\n        enqueueTask('" + p1 + "', '" + p2 + "', async () => {\n            const isTaskActive = () => useWriterStore.getState().draftId === targetTaskId;";
});

content = content.replace(/enqueueTask\(\s*'([^']+)',\s*`([^`]+)`,\s*async\s*\(\)\s*=>\s*\{/g, (match, p1, p2) => {
    return "{\n        const targetTaskId = store.draftId;\n        const targetProjectId = activeProject?.id;\n        enqueueTask('" + p1 + "', `" + p2 + "`, async () => {\n            const isTaskActive = () => useWriterStore.getState().draftId === targetTaskId;";
});

// Replace the closing of enqueueTask
content = content.replace(/        \}\);\n    \}, \[/g, "        }, { taskId: targetTaskId, projectId: targetProjectId });\n        }\n    }, [");

content = content.replace(/store\.(set[A-Z]\w*|add[A-Z]\w*|remove[A-Z]\w*)\(/g, "(isTaskActive() ? store.$1 : () => {})(");
content = content.replace(/useWriterStore\.setState\(/g, "(isTaskActive() ? useWriterStore.setState : () => {})(");

content = content.replace(/store\.saveTaskVersion\('Pre-Restauración'\)/g, "store.saveTaskVersion('Pre-Restauración', undefined, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\('Pre-Humanización', store\.content\)/g, "store.saveTaskVersion('Pre-Humanización', store.content, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\(getNextProcessName\('Humanizada'\), refined\)/g, "store.saveTaskVersion(getNextProcessName('Humanizada'), refined, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\('Pre-Parcheo', store\.content\)/g, "store.saveTaskVersion('Pre-Parcheo', store.content, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\(getNextProcessName\('Enriquecida'\), patchedContent\)/g, "store.saveTaskVersion(getNextProcessName('Enriquecida'), patchedContent, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\('Pre-Outline', store\.content\)/g, "store.saveTaskVersion('Pre-Outline', store.content, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\(getNextProcessName\('Esquema'\), contentWithOutline\)/g, "store.saveTaskVersion(getNextProcessName('Esquema'), contentWithOutline, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\('Pre-Extracción', store\.content\)/g, "store.saveTaskVersion('Pre-Extracción', store.content, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\(getNextProcessName\('Extraída'\), newContent\)/g, "store.saveTaskVersion(getNextProcessName('Extraída'), newContent, targetTaskId)");

fs.writeFileSync("src/components/contents/writer/useWriterActions.ts", content, "utf8");
console.log("JS patch applied successfully.");
@
