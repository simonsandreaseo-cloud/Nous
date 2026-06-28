const fs = require('fs');
let content = fs.readFileSync('src/components/contents/writer/useWriterActions.ts', 'utf8');

// Replace enqueueTask
content = content.replace(/enqueueTask\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*async\s*\(\)\s*=>\s*\{/g, (match, p1, p2) => {
    return "const targetTaskId = store.draftId;\n        const targetProjectId = activeProject?.id;\n        enqueueTask('" + p1 + "', '" + p2 + "', async () => {\n            const isTaskActive = () => useWriterStore.getState().draftId === targetTaskId;";
});

// Replace the closing of enqueueTask
content = content.replace(/        \}\);\n    \}, \[/g, "        }, { taskId: targetTaskId, projectId: targetProjectId });\n    }, [");

// We only want to replace store.set... and store.add... if they are inside the enqueueTask. Since all of them in this file are safe to guard, we can just replace them.
// But we should use if (isTaskActive())  instead of isTaskActive() &&  to avoid return type issues or single-line if statement issues.
// Wait, an IIFE is better: (isTaskActive() ? store.setContent : () => {})(...)
// This is perfectly safe:
content = content.replace(/store\.(set[A-Z]\w*|add[A-Z]\w*|remove[A-Z]\w*)\(/g, "(isTaskActive() ? store. : () => {})(");
content = content.replace(/useWriterStore\.setState\(/g, "(isTaskActive() ? useWriterStore.setState : () => {})(");

// For saveTaskVersion, we need to append targetTaskId.
// Since saveTaskVersion is always store.saveTaskVersion(arg1) or store.saveTaskVersion(arg1, arg2), let's just use string replace for each known call.
content = content.replace(/store\.saveTaskVersion\('Pre-Restauración'\)/g, "store.saveTaskVersion('Pre-Restauración', undefined, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\('Pre-Humanización', store\.content\)/g, "store.saveTaskVersion('Pre-Humanización', store.content, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\(getNextProcessName\('Humanizada'\), refined\)/g, "store.saveTaskVersion(getNextProcessName('Humanizada'), refined, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\('Pre-Parcheo', store\.content\)/g, "store.saveTaskVersion('Pre-Parcheo', store.content, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\(getNextProcessName\('Enriquecida'\), patchedContent\)/g, "store.saveTaskVersion(getNextProcessName('Enriquecida'), patchedContent, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\('Pre-Outline', store\.content\)/g, "store.saveTaskVersion('Pre-Outline', store.content, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\(getNextProcessName\('Esquema'\), contentWithOutline\)/g, "store.saveTaskVersion(getNextProcessName('Esquema'), contentWithOutline, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\('Pre-Extracción', store\.content\)/g, "store.saveTaskVersion('Pre-Extracción', store.content, targetTaskId)");
content = content.replace(/store\.saveTaskVersion\(getNextProcessName\('Extraída'\), newContent\)/g, "store.saveTaskVersion(getNextProcessName('Extraída'), newContent, targetTaskId)");


fs.writeFileSync('src/components/contents/writer/useWriterActions.ts', content, 'utf8');
console.log('JS patch applied');
