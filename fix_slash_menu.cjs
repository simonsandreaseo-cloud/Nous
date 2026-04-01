const fs = require('fs');
const filepath = 'nous_2.0/src/components/studio/writer/SlashMenu.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// We want to add `/nous` as a specific AI prompt command.
// Currently it just says 'Continuar con IA'. Let's rename it to 'Preguntar a Nous' or similar.
content = content.replace(
    "{ id: 'ai-write', label: 'Continuar con IA', icon: Sparkles, desc: 'Autocompletar texto', highlight: true },",
    "{ id: 'ai-nous', label: 'Agente Nous', icon: Sparkles, desc: '/nous [instrucción]', highlight: true },\n        { id: 'ai-write', label: 'Continuar con IA', icon: Sparkles, desc: 'Autocompletar texto', highlight: true },"
);

fs.writeFileSync(filepath, content);
console.log("Updated SlashMenu for Agente Nous");
