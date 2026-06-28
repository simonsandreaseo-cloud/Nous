import re

with open('src/components/contents/writer/useWriterActions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern1 = r"(enqueueTask\s*\(\s*'[^']+'\s*,\s*'[^']+'\s*,\s*async\s*\(\)\s*=>\s*\{)"
replacement1 = r"const targetTaskId = store.draftId;\n        \1\n            const isTaskActive = () => useWriterStore.getState().draftId === targetTaskId;"
content = re.sub(pattern1, replacement1, content)

pattern2 = r"        \}\);\n    \}, \["
replacement2 = r"        }, { taskId: targetTaskId, projectId: activeProject?.id });\n    }, ["
content = re.sub(pattern2, replacement2, content)

content = re.sub(r"store\.set([A-Z]\w*)\(", r"isTaskActive() && store.set\1(", content)
content = re.sub(r"store\.add([A-Z]\w*)\(", r"isTaskActive() && store.add\1(", content)
content = re.sub(r"useWriterStore\.setState\(", r"isTaskActive() && useWriterStore.setState(", content)

def repl_save(m):
    arg1 = m.group(1)
    arg2 = m.group(2)
    if arg2:
        return f"store.saveTaskVersion({arg1}, {arg2}, targetTaskId)"
    else:
        return f"store.saveTaskVersion({arg1}, undefined, targetTaskId)"

content = re.sub(r"store\.saveTaskVersion\(([^,)]+)(?:,\s*([^)]+))?\)", repl_save, content)

with open('src/components/contents/writer/useWriterActions.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch 3 applied")
