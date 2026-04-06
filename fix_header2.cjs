const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ContentsHeader.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// The issue is that we sed-replaced Columns with List, but didn't verify if List was imported.
content = content.replace("import { LayoutGrid, Calendar as CalendarIcon, Plus, Send, Search, SlidersHorizontal, ChevronDown }", "import { LayoutGrid, Columns, List, Calendar as CalendarIcon, Plus, Send, Search, SlidersHorizontal, ChevronDown }");

// And let's just make sure Columns is imported from lucide-react instead of List for Kanban
content = content.replace("import { LayoutGrid, Columns, List, Calendar as CalendarIcon, Plus, Send, Search, SlidersHorizontal, ChevronDown } from \"lucide-react\";", "import { LayoutGrid, Columns, Calendar as CalendarIcon, Plus, Send, Search, SlidersHorizontal, ChevronDown } from \"lucide-react\";");

content = content.replace("import { LayoutGrid, Calendar as CalendarIcon, List, Plus, Send, Search, SlidersHorizontal, ChevronDown } from \"lucide-react\";", "import { LayoutGrid, Columns, Calendar as CalendarIcon, List, Plus, Send, Search, SlidersHorizontal, ChevronDown } from \"lucide-react\";");

content = content.replace("icon: List, label: \"Tablero\"", "icon: Columns, label: \"Tablero\"");

fs.writeFileSync(filepath, content);
console.log("Fixed Header imports for Tablero button");
