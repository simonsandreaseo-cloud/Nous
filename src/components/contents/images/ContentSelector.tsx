
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, FileText, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContentSelectorProps {
    onSelect: (task: any) => void;
    selectedId?: string;
}

export const ContentSelector: React.FC<ContentSelectorProps> = ({ onSelect, selectedId }) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('tasks')
                .select('id, title, status, content_body, project_id, projects(logo_url)')
                .in('status', ['por_maquetar', 'publicado'])
                .order('updated_at', { ascending: false });

            if (!error && data) {
                // Formatting data to flatten the logo_url
                const formattedData = data.map((t: any) => ({
                    ...t,
                    project_logo_url: t.projects?.logo_url
                }));
                setTasks(formattedData);
            }
            setLoading(false);
        };

        fetchTasks();
    }, []);

    const filteredTasks = tasks.filter(task => 
        task.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar contenido por título..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-xs text-slate-400 font-medium tracking-widest uppercase">Cargando contenidos...</span>
                    </div>
                ) : filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                        <motion.button
                            key={task.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => onSelect(task)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group ${
                                selectedId === task.id
                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                    : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${selectedId === task.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-400'}`}>
                                    <FileText size={18} />
                                </div>
                                <div className="text-left">
                                    <p className={`text-sm font-bold truncate max-w-[200px] ${selectedId === task.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                        {task.title || 'Sin título'}
                                    </p>
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            {selectedId === task.id ? (
                                <Check size={18} className="text-indigo-600" />
                            ) : (
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-300 transition-colors" />
                            )}
                        </motion.button>
                    ))
                ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400">No se encontraron contenidos listos para maquetar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
