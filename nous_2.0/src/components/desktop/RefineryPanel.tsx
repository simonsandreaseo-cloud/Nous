import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Database, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface DataFrameStats {
    row_count: number;
    column_count: number;
    columns: string[];
    preview: string[][];
}

export function RefineryPanel() {
    const [stats, setStats] = useState<DataFrameStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [filePath, setFilePath] = useState('');

    const handleOpenFile = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'CSV Dataset',
                    extensions: ['csv']
                }]
            });

            if (typeof selected === 'string') {
                setFilePath(selected);
                loadDataset(selected);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadDataset = async (path: string) => {
        setLoading(true);
        try {
            const data = await invoke<DataFrameStats>('load_dataset', { path });
            setStats(data);
        } catch (error) {
            console.error('Failed to load dataset:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClean = async () => {
        if (!filePath) return;
        setLoading(true);
        try {
            const newPath = await invoke<string>('clean_dataset', { path: filePath });
            // Reload with the cleaned file
            setFilePath(newPath);
            loadDataset(newPath);
        } catch (error) {
            console.error('Failed to clean:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: 'json' | 'parquet') => {
        if (!filePath) return;
        setLoading(true);
        try {
            await invoke<string>('save_dataset', { path: filePath, format });
            // Maybe show success notification
        } catch (error) {
            console.error('Failed to export:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 text-white font-sans">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">Data Refinery</h3>
                    <p className="text-[10px] text-white/50 font-mono">HIGH-PERFORMANCE DATA PROCESSOR</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/30">
                    <Database size={16} className="text-purple-400" />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={handleOpenFile}
                    disabled={loading}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all group"
                >
                    <Upload size={20} className="text-white/40 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-xs font-bold text-white/60">IMPORT CSV</span>
                </button>
                <div className="flex-1 flex gap-2">
                    <button
                        onClick={handleClean}
                        disabled={loading || !stats}
                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all group disabled:opacity-50"
                    >
                        <span className="text-xs font-bold text-white/60">CLEAN DATA</span>
                    </button>
                    <button
                        onClick={() => handleExport('json')}
                        disabled={loading || !stats}
                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all group disabled:opacity-50"
                    >
                        <span className="text-xs font-bold text-white/60">EXPORT JSON</span>
                    </button>
                    <button
                        onClick={() => handleExport('parquet')}
                        disabled={loading || !stats}
                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all group disabled:opacity-50"
                    >
                        <span className="text-xs font-bold text-white/60">PARQUET</span>
                    </button>
                </div>
            </div>

            {/* Data Preview */}
            <div className="flex-1 bg-black/40 rounded-lg border border-white/5 overflow-hidden relative flex flex-col">
                {!stats && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 flex-col gap-2">
                        <FileSpreadsheet size={32} />
                        <span className="text-xs">NO DATASET LOADED</span>
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-sm">
                        <Loader2 className="animate-spin text-cyan-400" size={32} />
                    </div>
                )}

                {stats && (
                    <>
                        <div className="bg-white/5 p-2 border-b border-white/10 flex justify-between items-center text-[10px] font-mono">
                            <span className="text-white/50">{filePath.split('\\').pop()}</span>
                            <div className="flex gap-4">
                                <span className="text-cyan-400">{stats.row_count.toLocaleString()} <span className="text-white/30">ROWS</span></span>
                                <span className="text-purple-400">{stats.column_count} <span className="text-white/30">COLS</span></span>
                            </div>
                        </div>
                        <div className="overflow-auto flex-1 p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/5 sticky top-0">
                                    <tr>
                                        {stats.columns.map((col, i) => (
                                            <th key={i} className="p-2 text-[10px] font-bold text-white/60 border-b border-white/10 whitespace-nowrap">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="font-mono text-[10px] text-white/70">
                                    {stats.preview.map((row, r_i) => (
                                        <tr key={r_i} className="hover:bg-white/5 border-b border-white/5">
                                            {row.map((cell, c_i) => (
                                                <td key={c_i} className="p-2 whitespace-nowrap truncate max-w-[150px]">
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
