const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ContentsHeader.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// The header has the ViewMode toggle. Need to add Kanban button.
// import { LayoutGrid, Calendar as CalendarIcon, List, Plus, Send, Search, SlidersHorizontal, ChevronDown } from "lucide-react";
// Add Kanban (Columns icon or similar)

const viewOptions = `                            <button
                                onClick={() => onViewModeChange('cards')}
                                className={cn(
                                    "flex items-center gap-2 px-3 h-8 rounded-lg transition-all",
                                    viewMode === 'cards'
                                        ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 border border-transparent"
                                )}
                            >
                                <LayoutGrid size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Tarjetas</span>
                            </button>`;

const kanbanOption = `                            <button
                                onClick={() => onViewModeChange('kanban')}
                                className={cn(
                                    "flex items-center gap-2 px-3 h-8 rounded-lg transition-all",
                                    viewMode === 'kanban'
                                        ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 border border-transparent"
                                )}
                            >
                                <Columns size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Tablero</span>
                            </button>`;

content = content.replace("import { LayoutGrid, Calendar as CalendarIcon, List, Plus, Send, Search, SlidersHorizontal, ChevronDown } from \"lucide-react\";", "import { LayoutGrid, Columns, Calendar as CalendarIcon, List, Plus, Send, Search, SlidersHorizontal, ChevronDown } from \"lucide-react\";");
content = content.replace(viewOptions, viewOptions + '\n' + kanbanOption);

fs.writeFileSync(filepath, content);
console.log("Updated ContentsHeader.tsx for Kanban support");
