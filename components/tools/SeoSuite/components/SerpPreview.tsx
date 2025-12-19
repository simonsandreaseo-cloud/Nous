
import React, { useEffect, useState } from 'react';
import { SerpSimulation } from '../types';
import { Search, MoreVertical, X, Globe, ExternalLink } from 'lucide-react';
import { simulateSerpWithPuter } from '../services/puterService';

interface SerpPreviewProps {
    query: string;
    lang: 'es' | 'en';
    onClose: () => void;
}

const SerpPreview: React.FC<SerpPreviewProps> = ({ query, lang, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SerpSimulation | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSerp = async () => {
            try {
                setLoading(true);
                const result = await simulateSerpWithPuter(query, lang);
                setData(result);
            } catch (err: any) {
                setError(err.message || 'Error loading simulation');
            } finally {
                setLoading(false);
            }
        };

        if (query) fetchSerp();
    }, [query, lang]);

    // Helper to extract domain for favicon
    const getDomain = (url: string) => {
        try {
            // Handle display URLs that might not have http
            const cleanUrl = url.startsWith('http') ? url : `https://${url.split('/')[0]}`;
            return new URL(cleanUrl).hostname;
        } catch (e) {
            return 'google.com';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Google-like Header */}
                <div className="bg-white border-b border-gray-100 p-4 flex items-center gap-4 sticky top-0 z-10 shrink-0">
                    <img 
                        src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" 
                        alt="Google" 
                        className="h-6 sm:h-7 object-contain"
                    />
                    <div className="flex-1 bg-white shadow-sm border border-gray-200 rounded-full px-4 py-2 flex items-center gap-3">
                        <span className="text-slate-700 text-sm truncate flex-1">{query}</span>
                        <Search className="w-4 h-4 text-indigo-500" />
                        <X className="w-4 h-4 text-slate-400 cursor-pointer" onClick={onClose} />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white font-sans">
                    {loading ? (
                        <div className="space-y-8 animate-pulse">
                             {[1, 2, 3].map(i => (
                                 <div key={i} className="max-w-xl">
                                     <div className="h-4 w-32 bg-slate-100 rounded mb-2"></div>
                                     <div className="h-5 w-3/4 bg-slate-200 rounded mb-2"></div>
                                     <div className="h-3 w-full bg-slate-50 rounded"></div>
                                     <div className="h-3 w-5/6 bg-slate-50 rounded mt-1"></div>
                                 </div>
                             ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 text-rose-500">
                            <p className="font-bold mb-2">Simulation Failed</p>
                            <p className="text-sm">{error}</p>
                            <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-100 rounded text-slate-600 text-sm">Close</button>
                        </div>
                    ) : (
                        <div className="space-y-8 max-w-[600px]">
                            <div className="text-xs text-slate-400 mb-2">
                                {lang === 'es' ? 'Aproximadamente 12,400,000 resultados (0.42 segundos)' : 'About 12,400,000 results (0.42 seconds)'}
                            </div>

                            {data?.results.map((result, idx) => {
                                const domain = getDomain(result.url);
                                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

                                return (
                                    <div key={idx} className="group cursor-pointer">
                                        {/* Meta Row */}
                                        <div className="flex items-center gap-3 mb-1 text-sm text-[#202124]">
                                            <div className="bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center overflow-hidden border border-gray-100">
                                                <img src={faviconUrl} alt="" className="w-4 h-4" onError={(e) => e.currentTarget.src = 'https://www.google.com/favicon.ico'} />
                                            </div>
                                            <div className="flex flex-col leading-tight">
                                                <span className="font-medium text-[#202124]">{domain}</span>
                                                <span className="text-xs text-[#5f6368] truncate max-w-[250px]">{result.url}</span>
                                            </div>
                                            <MoreVertical className="w-4 h-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100" />
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-xl text-[#1a0dab] hover:underline cursor-pointer font-normal truncate">
                                            {result.title}
                                        </h3>

                                        {/* Snippet */}
                                        <p className="text-sm text-[#4d5156] leading-relaxed mt-1">
                                            {result.isSponsored && (
                                                <span className="font-bold text-[#202124] mr-1">
                                                    {lang === 'es' ? 'Patrocinado' : 'Sponsored'}
                                                </span>
                                            )}
                                            {result.snippet}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-slate-50 text-center text-xs text-slate-400">
                    * {lang === 'es' ? 'Simulación generada por Puter AI. Los resultados reales pueden variar.' : 'Simulation generated by Puter AI. Actual results may vary.'}
                </div>
            </div>
        </div>
    );
};

export default SerpPreview;
