import re

with open('src/components/contents/writer/useWriterActions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace enqueueTask(..., async () => {
# We will match: enqueueTask('type', 'title', async () => {
pattern = r"enqueueTask\(\s*('[^']+')\s*,\s*('[^']+')\s*,\s*async\s*\(\)\s*=>\s*\{"

replacement = r'''const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        enqueueTask(\1, \2, async () => {
            const isTaskActive = () => useWriterStore.getState().draftId === targetTaskId;
            const safeSetState = (newState: any) => { if (isTaskActive()) useWriterStore.setState(newState); };
            const originalStore = store;
            const store = new Proxy(originalStore, {
                get(target, prop) {
                    if (prop === 'saveTaskVersion') {
                        return (processName: string, contentBody?: string) => target.saveTaskVersion(processName, contentBody, targetTaskId);
                    }
                    if (typeof target[prop as keyof typeof target] === 'function' && typeof prop === 'string' && (prop.startsWith('set') || prop.startsWith('add'))) {
                        return (...args: any[]) => {
                            if (!isTaskActive()) return;
                            return (target[prop as keyof typeof target] as any)(...args);
                        };
                    }
                    return target[prop as keyof typeof target];
                }
            });'''

new_content = re.sub(pattern, replacement, content)

# 2. Replace useWriterStore.setState({ with safeSetState({
# Only replace instances that are inside the callbacks. Since all of them in this file are inside the enqueue callbacks, we can just replace all of them.
new_content = new_content.replace('useWriterStore.setState(', 'safeSetState(')

# 3. Add the options object to the end of enqueueTask calls.
# This is tricky because we need to find the matching '});' for each enqueueTask.
# However, all enqueueTask calls in this file end with exactly:
#         });
#     }, [store
# Or similar. We can replace '});\n    },' with '}, { taskId: targetTaskId, projectId: targetProjectId });\n    },'
# Let's just find         });\n    }, [
new_content = re.sub(r"        \}\);\n    \}, \[", r"        }, { taskId: targetTaskId, projectId: targetProjectId });\n    }, [", new_content)

with open('src/components/contents/writer/useWriterActions.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Patch applied successfully.")
