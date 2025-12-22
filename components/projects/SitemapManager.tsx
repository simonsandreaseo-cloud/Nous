import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SitemapUrl {
    id: number;
    url: string;
    category?: string;
    created_at: string;
}

interface SitemapManagerProps {
    projectId: string | number;
}

export const SitemapManager: React.FC<SitemapManagerProps> = ({ projectId }) => {
    const [urls, setUrls] = useState<SitemapUrl[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');

    useEffect(() => {
        loadUrls();
    }, [projectId]);

    const loadUrls = async () => {
        try {
            const { data, error } = await supabase
                .from('sitemap_urls')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUrls(data || []);
        } catch (error) {
            console.error('Error loading sitemap:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            await processContent(content, file.type);
            setIsUploading(false);
        };
        reader.readAsText(file);
    };

    const handleTextSubmit = async () => {
        if (!inputText.trim()) return;
        setIsUploading(true);
        await processContent(inputText, 'text/plain');
        setIsUploading(false);
        setInputText('');
    };

    const processContent = async (content: string, type: string) => {
        let extractedUrls: string[] = [];

        if (type.includes('xml') || content.trim().startsWith('<?xml') || content.trim().startsWith('<urlset')) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, "text/xml");
            const locs = xmlDoc.getElementsByTagName("loc");
            for (let i = 0; i < locs.length; i++) {
                if (locs[i].textContent) extractedUrls.push(locs[i].textContent!);
            }
        } else {
            // Assume text/csv - one per line
            extractedUrls = content.split(/[\r\n]+/).map(l => l.trim()).filter(l => l.startsWith('http'));
        }

        if (extractedUrls.length === 0) {
            alert("No URLs found valid.");
            return;
        }

        // Batch insert (ignore duplicates)
        const entries = extractedUrls.map(url => ({
            project_id: projectId,
            url,
            category: 'Imported'
        }));

        const { error } = await supabase.from('sitemap_urls').upsert(entries, { onConflict: 'project_id, url', ignoreDuplicates: true });

        if (error) {
            alert("Error saving URLs: " + error.message);
        } else {
            alert(`Processed ${extractedUrls.length} URLs.`);
            loadUrls();
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        const { error } = await supabase.from('sitemap_urls').delete().eq('id', id);
        if (!error) loadUrls();
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Importar URLs</h3>

                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setUploadMode('text')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${uploadMode === 'text' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Pegar Texto
                    </button>
                    <button
                        onClick={() => setUploadMode('file')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${uploadMode === 'file' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Subir XML/CSV
                    </button>
                </div>

                {uploadMode === 'text' ? (
                    <div className="space-y-3">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="https://site.com/page1&#10;https://site.com/page2"
                            className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button
                            onClick={handleTextSubmit}
                            disabled={isUploading || !inputText.trim()}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isUploading ? 'Procesando...' : 'Importar URLs'}
                        </button>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition cursor-pointer relative">
                        <input
                            type="file"
                            accept=".xml,.txt,.csv"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="text-slate-500">
                            {isUploading ? (
                                <span className="font-bold text-indigo-600">Procesando archivo...</span>
                            ) : (
                                <>
                                    <p className="font-medium text-slate-700">Haz clic o arrastra un archivo sitemap.xml</p>
                                    <p className="text-xs mt-1">Soporta XML, CSV o TXT</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Mapa del Sitio ({urls.length})</h3>
                    <button onClick={loadUrls} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold">Refrescar</button>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-slate-400">Cargando...</div>
                ) : urls.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No hay URLs importadas.</div>
                ) : (
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="p-3 border-b">URL</th>
                                    <th className="p-3 border-b text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {urls.map(url => (
                                    <tr key={url.id} className="hover:bg-slate-50 group">
                                        <td className="p-3 text-slate-600 font-mono text-xs truncate max-w-md">
                                            <a href={url.url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline">
                                                {url.url}
                                            </a>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => handleDelete(url.id)}
                                                className="text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
                                                title="Eliminar"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
