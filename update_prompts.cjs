const fs = require('fs');
const path = 'c:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/src/lib/services/writer/prompts.ts';
let content = fs.readFileSync(path, 'utf8');

const replacement = `    let outlineInstruction = "";
    if (outlineStructure && outlineStructure.length > 0) {
        // Detect if outline is experimental (AnchorMapNode) or standard (OutlineNode)
        const isExperimental = outlineStructure.some(h => h.instructions !== undefined || h.lsi_targets !== undefined);
        const fullOutline = config.fullOutlineStructure || outlineStructure;

        const renderItem = (h: any) => {
            if (isExperimental) {
                return \`\${h.type || \`H\${h.level}\`}: \${h.text}
   👉 [PAUTA: \${h.notes || h.instructions || 'Desarrolla esta sección naturalmente y sigue el título.'}]
   👉 [KEYWORDS OBLIGATORIAS: \${h.lsi_targets?.join(', ') || 'N/A'}]\`;
            } else {
                return \`\${h.type}: \${h.text}
   👉 [LONGITUD MÍNIMA: \${h.wordCount || 150} palabras. EXPANDE DETALLADAMENTE. PROHIBIDO RESUMIR.]
   👉 [PAUTA: \${h.notes || 'Desarrolla esta sección naturalmente.'}]\`;
            }
        };

        outlineInstruction = \`
### ESTRUCTURA COMPLETA DEL ARTÍCULO (PARA CONTEXTO)
A continuación se muestra el esquema completo del artículo para que entiendas el contexto general y no repitas temas que se tratarán en otras secciones:
\${fullOutline.map(h => \`- \${h.type || \`H\${h.level}\`}: \${h.text}\`).join('\\n')}

### ESTRUCTURA OBLIGATORIA PARA ESTE FRAGMENTO (\${chunkIndex + 1}/\${totalChunks})
**INSTRUCCIÓN CRÍTICA:** DEBES REDACTAR ÚNICAMENTE LAS SIGUIENTES SECCIONES. IGNORA EL RESTO DEL ESQUEMA. NO INVENTES NUEVOS HEADERS NI REDACTES SECCIONES QUE NO ESTÉN AQUÍ:
\${isFirstChunk ? \`El H1 del artículo es: "\${topic}" (Debe ser el título visible).\` : \`(Omite el H1, ya fue escrito en la parte anterior).\`}
Asegurándote de cumplir la longitud de palabras exigida por cada sección, desarrolla el siguiente esquema:
\${outlineStructure.map(renderItem).join('\\n')}
\`;
    }`;

const startRegex = /let outlineInstruction = "";\s*if \(outlineStructure && outlineStructure\.length > 0\) {/g;
const endRegex = /}\)\.join\('\\n'\)}\s*`;\s*}/g;

const startMatch = startRegex.exec(content);
const endMatch = endRegex.exec(content);

if (startMatch && endMatch) {
    const startIdx = startMatch.index;
    const endIdx = endMatch.index + endMatch[0].length;
    content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Replaced successfully!");
} else {
    console.log("Could not find the block to replace.");
}
