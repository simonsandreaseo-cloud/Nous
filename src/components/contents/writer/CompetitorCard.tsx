'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, Edit3, Save, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/dom/Button';

interface CompetitorCardProps {
    url: string;
    content: string;
    onSave?: (newContent: string) => void;
}

export default function CompetitorCard({ url, content: initialContent, onSave }: CompetitorCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(initialContent);
    const [editValue, setEditValue] = useState(initialContent);

    const domain = new URL(url).hostname.replace('www.', '');

    // Simple logic to extract sections based on Markdown headers (H2, H3)
    // This allows the "Accordion de Headers" requested by the user
    const sections = content.split(/(?=^#{2,3} )/m).filter(s => s.trim().length > 0);

    const handleSave = () => {
        setContent(editValue);
        setIsEditing(false);
        if (onSave) onSave(editValue);
    };

    return (
        <div className={cn(
            "bg-white rounded-[24px] border border-slate-200 shadow-sm transition-all duration-300 overflow-hidden",
            isExpanded ? "shadow-md ring-1 ring-indigo-100" : "hover:shadow-md"
        )}>
            {/* CARD HEADER */}
            <div 
                className="p-5 flex items-center justify-between cursor-pointer group"
                onClick={() => !isEditing && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors shrink-0">
                        <img 
                            src={`https://www.google.com/s2/favicons?domain=${url}&sz=64`} 
                            alt="" 
                            className="w-5 h-5 opacity-70 group-hover:opacity-100"
                        />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">{domain}</span>
                        <h4 className="text-[13px] font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {url}
                        </h4>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isEditing && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsExpanded(true); }}
                            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Edit3 size={16} />
                        </button>
                    )}
                    <div className="p-2 text-slate-300">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
            </div>

            {/* CARD CONTENT */}
            {isExpanded && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="w-full h-[1px] bg-slate-100 mb-6" />
                    
                    {isEditing ? (
                        <div className="space-y-4">
                            <textarea 
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                            />
                            <div className="flex items-center gap-2 justify-end">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-slate-500">
                                    <X size={16} className="mr-2" /> Cancelar
                                </Button>
                                <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                                    <Save size={16} className="mr-2" /> Guardar Cambios
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sections.length > 1 ? (
                                <div className="space-y-3">
                                    {sections.map((section, idx) => (
                                        <HeaderAccordion key={idx} content={section} />
                                    ))}
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-slate max-w-none text-slate-600 leading-relaxed font-medium">
                                    <ReactMarkdown>{content}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function HeaderAccordion({ content }: { content: string }) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Extract head title (e.g. "## Title" -> "Title")
    const lines = content.trim().split('\n');
    const headerLine = lines[0];
    const headerTitle = headerLine.replace(/^#+\s+/, '');
    
    return (
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
            >
                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-3">
                    <div className={cn("w-1 h-1 rounded-full bg-slate-300", isOpen && "bg-indigo-400")} />
                    {headerTitle}
                </h5>
                <div className="text-slate-300">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </div>
            {isOpen && (
                <div className="px-5 py-4 bg-white prose prose-sm prose-slate max-w-none text-[13px] leading-relaxed text-slate-600 animate-in slide-in-from-top-1">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            )}
        </div>
    );
}
