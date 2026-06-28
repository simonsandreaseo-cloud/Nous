import re

with open('src/components/contents/writer/useWriterActions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the previously patched enqueueTask with a working version.
# The previous patch looked like:
'''
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        enqueueTask('type', 'title', async () => {
            const isTaskActive = () => useWriterStore.getState().draftId === targetTaskId;
            const safeSetState = (newState: any) => { if (isTaskActive()) useWriterStore.setState(newState); };
            const originalStore = store;
            const store = new Proxy(originalStore, {
'''
# I'll replace it with:
'''
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        const _safeStore = new Proxy(store, {
            get(target, prop) {
                if (prop === 'saveTaskVersion') {
                    return (processName: string, contentBody?: string) => target.saveTaskVersion(processName, contentBody, targetTaskId);
                }
                if (typeof target[prop as keyof typeof target] === 'function' && typeof prop === 'string' && (prop.startsWith('set') || prop.startsWith('add'))) {
                    return (...args: any[]) => {
                        if (useWriterStore.getState().draftId !== targetTaskId) return;
                        return (target[prop as keyof typeof target] as any)(...args);
                    };
                }
                return target[prop as keyof typeof target];
            }
        });
        const isTaskActive = () => useWriterStore.getState().draftId === targetTaskId;
        const safeSetState = (newState: any) => { if (isTaskActive()) useWriterStore.setState(newState); };
        
        enqueueTask('type', 'title', async () => {
            const store = _safeStore;
'''

pattern = r"const targetTaskId = store\.draftId;\s*const targetProjectId = activeProject\?\.id;\s*enqueueTask\(([^,]+),\s*([^,]+),\s*async\s*\(\)\s*=>\s*\{\s*const isTaskActive = \(\) => useWriterStore\.getState\(\)\.draftId === targetTaskId;\s*const safeSetState = \(newState: any\) => \{ if \(isTaskActive\(\)\) useWriterStore\.setState\(newState\); \};\s*const originalStore = store;\s*const store = new Proxy\(originalStore, \{\s*get\(target, prop\) \{\s*if \(prop === 'saveTaskVersion'\) \{\s*return \(processName: string, contentBody\?: string\) => target\.saveTaskVersion\(processName, contentBody, targetTaskId\);\s*\}\s*if \(typeof target\[prop as keyof typeof target\] === 'function' && typeof prop === 'string' && \(prop\.startsWith\('set'\) \|\| prop\.startsWith\('add'\)\)\) \{\s*return \(\.\.\.args: any\[\]\) => \{\s*if \(\!isTaskActive\(\)\) return;\s*return \(target\[prop as keyof typeof target\] as any\)\(\.\.\.args\);\s*\};\s*\}\s*return target\[prop as keyof typeof target\];\s*\}\s*\}\);"

replacement = r'''const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        const _safeStore = new Proxy(store, {
            get(target, prop) {
                if (prop === 'saveTaskVersion') {
                    return (processName: string, contentBody?: string) => target.saveTaskVersion(processName, contentBody, targetTaskId);
                }
                if (typeof target[prop as keyof typeof target] === 'function' && typeof prop === 'string' && (prop.startsWith('set') || prop.startsWith('add'))) {
                    return (...args: any[]) => {
                        if (useWriterStore.getState().draftId !== targetTaskId) return;
                        return (target[prop as keyof typeof target] as any)(...args);
                    };
                }
                return target[prop as keyof typeof target];
            }
        });
        const isTaskActive = () => useWriterStore.getState().draftId === targetTaskId;
        const safeSetState = (newState: any) => { if (isTaskActive()) useWriterStore.setState(newState); };
        
        enqueueTask(\1, \2, async () => {
            const store = _safeStore;'''

new_content = re.sub(pattern, replacement, content)

with open('src/components/contents/writer/useWriterActions.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Patch applied")
