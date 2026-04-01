const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ContentsHeader.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// I replaced the wrong code block initially or it didn't match. Let's fix the map array directly.
content = content.replace(
    "{ id: \"cards\" as ViewMode, icon: LayoutGrid, label: \"Tarjetas\" },",
    "{ id: \"cards\" as ViewMode, icon: LayoutGrid, label: \"Tarjetas\" },\n                            { id: \"kanban\" as ViewMode, icon: Columns, label: \"Tablero\" },"
);

fs.writeFileSync(filepath, content);
console.log("Added Tablero button to the header map array.");
