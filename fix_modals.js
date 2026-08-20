const fs = require('fs');

const files = [
    'src/components/contents/tools/CustomTransformModal.tsx',
    'src/components/contents/tools/MiniEditorModal.tsx',
    'src/components/contents/tools/MiniHumanizerModal.tsx'
];

const replacement = <option value="gemini-3.7-flash-gas">Gemini 3.7 Flash (GAS)</option>
                            <option value="gemini-3.7-flash-vertex">Gemini 3.7 Flash (Vertex)</option>
                            <option value="gemini-3.6-flash-gas">Gemini 3.6 Flash (GAS)</option>
                            <option value="gemini-3.6-flash-vertex">Gemini 3.6 Flash (Vertex)</option>
                            <option value="gemini-3.5-flash-gas">Gemini 3.5 Flash (GAS)</option>
                            <option value="gemini-3.5-flash-vertex">Gemini 3.5 Flash (Vertex)</option>
                            <option value="gemini-3.5-flash-lite-gas">Gemini 3.5 Flash-Lite (GAS)</option>
                            <option value="gemini-3.5-flash-lite-vertex">Gemini 3.5 Flash-Lite (Vertex)</option>
                            <option value="gemini-3-flash-vertex">Gemini 3 Flash (Vertex)</option>
                            <option value="gemini-3.1-pro-preview-vertex">Gemini 3.1 Pro (Vertex)</option>
                            <option value="gemini-3.1-flash-lite-preview-gas">Gemini 3.1 Flash Lite (GAS)</option>
                            <option value="gemini-3.1-flash-lite-preview-vertex">Gemini 3.1 Flash Lite (Vertex)</option>
                            <option value="gemma-4-31b-it">Gemma 4 31B IT (GAS)</option>
                            <option value="gemma-4-26b-a4b-it">Gemma 4 26B IT (GAS)</option>
                            <option value="gemma-3-27b-it">Gemma 3 27B IT (GAS)</option>;

for (const file of files) {
    try {
        let content = fs.readFileSync(file, 'utf8');
        const regex = /<option value="gemini-3\.5-flash-gas">Gemini 3\.5 Flash \(GAS\)<\/option>[\s\S]*?<option value="gemma-4-26b-a4b-it">Gemma 4 26B IT \(GAS\)<\/option>/g;
        
        content = content.replace(regex, replacement);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated " + file);
    } catch (e) {
        console.log("Error " + file + ": " + e);
    }
}
