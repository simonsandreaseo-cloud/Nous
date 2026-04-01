const fs = require('fs');
const filepath = 'nous_2.0/src/components/studio/writer/WriterEditor.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// We need an input for the `/nous` command.
// If commandId === 'ai-nous', we should prompt the user (or insert a temporary interactive node, or just a window.prompt for MVP).
const slashHandler = `    const handleSlashCommand = (commandId: string) => {
        if (!editor) return;
        editor.commands.deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from });

        switch (commandId) {
            case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
            case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
            case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
            case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
            case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
            case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
            case 'ai-write':
                editor.commands.insertContent(" *[AI Generando...]* ");
                break;
            case 'ai-nous':
                const prompt = window.prompt("¿Qué deseas que redacte Nous?");
                if (prompt) {
                     editor.commands.insertContent(\`\\n**[Nous]:** *Generando respuesta para "\${prompt}"...*\\n\`);
                }
                break;
        }
        setSlashMenuPos(null);
    };`;

// Replace the old handleSlashCommand
content = content.replace(/    const handleSlashCommand = \(commandId: string\) => \{[\s\S]*?setSlashMenuPos\(null\);\n    \};/m, slashHandler);

fs.writeFileSync(filepath, content);
console.log("Updated handleSlashCommand for ai-nous.");
