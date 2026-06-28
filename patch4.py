import re
import sys

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all enqueueTask calls
    pattern = re.compile(r'enqueueTask\(([^,]+),\s*([^,]+),\s*async\s*\(\)\s*=>\s*\{')
    
    proxy_code = """const outerStore = store;
        const targetTaskId = store.draftId;
        const targetProjectId = activeProject?.id;
        enqueueTask(\\1, \\2, async () => {
            const store = new Proxy(outerStore, {
                get(target: any, prop: string) {
                    if (typeof target[prop] === 'function' && (prop.startsWith('set') || prop.startsWith('add') || prop === 'setStatus')) {
                        return (...args: any[]) => {
                            if (useWriterStore.getState().draftId === targetTaskId) {
                                return target[prop](...args);
                            }
                        }
                    }
                    if (prop === 'saveTaskVersion') {
                        return (name: string, content?: string) => target.saveTaskVersion(name, content, targetTaskId);
                    }
                    return target[prop];
                }
            });"""

    new_content = pattern.sub(proxy_code, content)
    
    # Now we need to replace the closing `});` for the enqueueTask.
    # The safest way is to replace `        });\n    }, [` with `        }, { taskId: targetTaskId, projectId: targetProjectId });\n    }, [`
    # Because each enqueueTask is followed by `}, [deps]);` closing the useCallback.
    
    closing_pattern = re.compile(r'(\s+)\}\);\n(\s+)\}, \[')
    new_content = closing_pattern.sub(r'\1}, { taskId: targetTaskId, projectId: targetProjectId });\n\2}, [', new_content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Python patch applied successfully")

if __name__ == "__main__":
    process_file('src/components/contents/writer/useWriterActions.ts')
