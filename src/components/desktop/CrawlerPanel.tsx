import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Loader2, Globe, FileCode, Play } from 'lucide-react';

interface CrawlResult {
    url: string;
    title: string;
    content: string;
    html_structure: string;
    dom_health_score: number;
    sentiment_label: string;
    readability_score: number;
    keywords: string;
}

export function CrawlerPanel() {
    const [url, setUrl] = useState('');
    const [proxy, setProxy] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CrawlResult | null>(null);

    const handleCrawl = async () => {
        if (!url) return;
        setLoading(true);
        setResult(null);
        try {
            const data = await invoke<CrawlResult>('start_crawl_command', { url, proxy: proxy || null });
            setResult(data);
        } catch (error) {
            console.error('Crawl failed:', error);
            // Handle error state (maybe show a toast)
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 text-white font-sans">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">Deep Crawler Pro</h3>
                    <p className="text-[10px] text-white/50 font-mono">DOM STRUCTURAL ANALYSIS MODULE</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${showSettings ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                    >
                        <FileCode size={14} />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
                        <Globe size={16} className="text-cyan-400" />
                    </div>
                </div>
            </div>

            {/* Settings Area (Proxy) */}
            {showSettings && (
                <div className="bg-white/5 p-3 rounded-lg border border-white/10 animate-in slide-in-from-top-2">
                    <label className="text-[10px] text-white/40 font-mono block mb-1">PROXY SERVER (OPTIONAL)</label>
                    <input
                        type="text"
                        value={proxy}
                        onChange={(e) => setProxy(e.target.value)}
                        placeholder="http://user:pass@host:port"
                        className="bg-black/50 border border-white/10 rounded w-full py-1 px-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500/50"
                    />
                </div>
            )}

            {/* Input Area */}
            <div className="flex gap-2">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg flex items-center px-3 focus-within:border-cyan-500/50 transition-colors">
                    <Search size={14} className="text-white/30 mr-2" />
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Target URL (e.g. https://example.com)"
                        className="bg-transparent border-none outline-none text-xs w-full py-2 placeholder:text-white/20 font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
                    />
                </div>
                <button
                    onClick={handleCrawl}
                    disabled={loading || !url}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 rounded-lg flex items-center justify-center transition-all"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                </button>
            </div>

            {/* Results Area */}
            <div className="flex-1 bg-black/40 rounded-lg p-4 font-mono text-[10px] text-white/70 overflow-auto border border-white/5 relative">
                {!result && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20">
                        AWAITING TARGET COORDINATES...
                    </div>
                )}

                {loading && (
                    <div className="space-y-2 opacity-50 animate-pulse">
                        <div className="h-2 bg-white/20 w-3/4 rounded" />
                        <div className="h-2 bg-white/20 w-1/2 rounded" />
                        <div className="h-2 bg-white/20 w-5/6 rounded" />
                    </div>
                )}

                {result && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Meta Data */}
                        <div className="p-3 bg-white/5 rounded border-l-2 border-cyan-500">
                            <h4 className="font-bold text-cyan-400 mb-1">METADATA EXTRACTED</h4>
                            <div className="grid grid-cols-[80px_1fr] gap-1">
                                <span className="text-white/40">TITLE:</span>
                                <span className="truncate">{result.title}</span>
                                <span className="text-white/40">URL:</span>
                                <span className="truncate text-blue-400 underline">{result.url}</span>
                                <span className="text-white/40">SCORE:</span>
                                <span className={`font-bold ${result.dom_health_score > 80 ? 'text-emerald-400' : result.dom_health_score > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {result.dom_health_score}/100
                                </span>
                            </div>
                        </div>

                        {/* Structural Analysis */}
                        <div>
                            <h4 className="font-bold text-white/50 mb-2">STRUCTURAL INTEGRITY</h4>
                            <div className="bg-white/5 p-2 rounded text-xs text-white/80 font-mono">
                                {result.html_structure}
                            </div>
                        </div>

                        {/* Content Intelligence */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-3 rounded border-t-2 border-purple-500">
                                <h4 className="font-bold text-purple-400 mb-1 text-[10px]">SENTIMENT ANALYSIS</h4>
                                <div className="text-xl font-michroma">{result.sentiment_label.toUpperCase()}</div>
                            </div>
                            <div className="bg-white/5 p-3 rounded border-t-2 border-orange-500">
                                <h4 className="font-bold text-orange-400 mb-1 text-[10px]">READABILITY INDEX (ARI)</h4>
                                <div className="text-xl font-michroma">{result.readability_score.toFixed(1)}</div>
                            </div>
                        </div>

                        {/* Keywords */}
                        <div className="bg-white/5 p-3 rounded border-l-2 border-emerald-500">
                            <h4 className="font-bold text-emerald-400 mb-1 text-[10px]">TOP ENTITIES / KEYWORDS</h4>
                            <div className="text-xs font-mono text-white/70">{result.keywords.toUpperCase()}</div>
                        </div>

                        {/* Content Preview */}
                        <div>
                            <h4 className="font-bold text-white/50 mb-2 flex items-center gap-2">
                                <FileCode size={12} />
                                DOM CONTENT PREVIEW
                            </h4>
                            <div className="bg-black/50 p-3 rounded border border-white/10 h-40 overflow-auto text-emerald-500/90 whitespace-pre-wrap">
                                {result.content.slice(0, 500)}...
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
