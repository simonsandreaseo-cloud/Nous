import React, { useState, useEffect } from 'react';
import { GSCProperty, fetchSites } from '../services/gscService';
import { useAuth } from '../../../context/AuthContext';

interface GSCConnectPanelProps {
    onAnalyze: (siteUrl: string, startDateP1: string, endDateP1: string, startDateP2: string, endDateP2: string) => void;
    isLoading: boolean;
}

export const GSCConnectPanel: React.FC<GSCConnectPanelProps> = ({ onAnalyze, isLoading }) => {
    const { session, signInWithGoogle } = useAuth();
    const [sites, setSites] = useState<GSCProperty[]>([]);
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [loadingSites, setLoadingSites] = useState(false);

    // Dates State
    // Default: P2 = Last 28 Days, P1 = Previous Period
    const calculateDefaultDates = () => {
        const end = new Date();
        end.setDate(end.getDate() - 3); // GSC usually has ~2-3 days lag
        const start = new Date(end);
        start.setDate(start.getDate() - 27); // 28 days total

        const endP1 = new Date(start);
        endP1.setDate(endP1.getDate() - 1);
        const startP1 = new Date(endP1);
        startP1.setDate(startP1.getDate() - 27);

        return {
            p2Start: start.toISOString().split('T')[0],
            p2End: end.toISOString().split('T')[0],
            p1Start: startP1.toISOString().split('T')[0],
            p1End: endP1.toISOString().split('T')[0]
        };
    };

    const defaults = calculateDefaultDates();
    const [dateRangeP1, setDateRangeP1] = useState({ start: defaults.p1Start, end: defaults.p1End });
    const [dateRangeP2, setDateRangeP2] = useState({ start: defaults.p2Start, end: defaults.p2End });

    useEffect(() => {
        if (session?.provider_token) {
            loadSites();
        }
    }, [session]);

    const loadSites = async () => {
        if (!session?.provider_token) return;
        setLoadingSites(true);
        try {
            const list = await fetchSites(session.provider_token);
            setSites(list);
            if (list.length > 0) setSelectedSite(list[0].siteUrl);
        } catch (e) {
            console.error("Failed to load sites", e);
            alert("No se pudieron cargar las propiedades. Verifica que diste permisos de Search Console.");
        } finally {
            setLoadingSites(false);
        }
    };

    const handleAnalyzeClick = () => {
        if (!selectedSite) return alert("Selecciona una propiedad.");
        onAnalyze(selectedSite, dateRangeP1.start, dateRangeP1.end, dateRangeP2.start, dateRangeP2.end);
    };

    // Quick Selectors
    const applyQuickRange = (months: number) => {
        const end = new Date();
        end.setDate(end.getDate() - 3);
        const start = new Date(end);
        start.setMonth(start.getMonth() - months);

        // P2 (Current)
        const p2S = start.toISOString().split('T')[0];
        const p2E = end.toISOString().split('T')[0];

        // P1 (Previous equivalent)
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const endP1 = new Date(start.getTime() - 86400000);
        const startP1 = new Date(endP1.getTime() - diffTime);

        setDateRangeP2({ start: p2S, end: p2E });
        setDateRangeP1({ start: startP1.toISOString().split('T')[0], end: endP1.toISOString().split('T')[0] });
    };

    if (!session || !session.provider_token) {
        return (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Conexión Requerida</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">Para analizar tus datos automáticamente, necesitamos acceso de lectura a tu Google Search Console.</p>
                <button
                    onClick={signInWithGoogle}
                    className="bg-white border border-slate-300 text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 flex items-center gap-3 mx-auto shadow-sm transition-transform active:scale-95"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
                    Iniciar Sesión con Google
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            {/* 1. Property Selector */}
            <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Propiedad de Search Console</label>
                {loadingSites ? (
                    <div className="animate-pulse h-12 bg-slate-100 rounded-xl w-full"></div>
                ) : (
                    <select
                        value={selectedSite}
                        onChange={(e) => setSelectedSite(e.target.value)}
                        className="w-full text-lg p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    >
                        {sites.map(s => (
                            <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* 2. Date Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Period 1 (Previous/Baseline) */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 relative group">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-slate-300 rounded-t-2xl"></div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between">
                        <span>Periodo Base (Anterior)</span>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">Comparativa</span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={dateRangeP1.start}
                            onChange={(e) => setDateRangeP1({ ...dateRangeP1, start: e.target.value })}
                            className="w-full p-2 rounded-lg border border-slate-200 text-sm font-mono text-slate-600 focus:border-indigo-500 outline-none"
                        />
                        <span className="self-center text-slate-400">-</span>
                        <input
                            type="date"
                            value={dateRangeP1.end}
                            onChange={(e) => setDateRangeP1({ ...dateRangeP1, end: e.target.value })}
                            className="w-full p-2 rounded-lg border border-slate-200 text-sm font-mono text-slate-600 focus:border-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Period 2 (Current/Focus) */}
                <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/30 relative group shadow-sm">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-indigo-500 rounded-t-2xl"></div>
                    <div className="text-xs font-bold text-indigo-800 uppercase mb-3 flex justify-between">
                        <span>Periodo Actual (Foco)</span>
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px]">Principal</span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={dateRangeP2.start}
                            onChange={(e) => setDateRangeP2({ ...dateRangeP2, start: e.target.value })}
                            className="w-full p-2 rounded-lg border border-indigo-200 text-sm font-mono text-slate-900 font-bold focus:border-indigo-500 outline-none bg-white"
                        />
                        <span className="self-center text-slate-400">-</span>
                        <input
                            type="date"
                            value={dateRangeP2.end}
                            onChange={(e) => setDateRangeP2({ ...dateRangeP2, end: e.target.value })}
                            className="w-full p-2 rounded-lg border border-indigo-200 text-sm font-mono text-slate-900 font-bold focus:border-indigo-500 outline-none bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {[1, 3, 6, 12].map(m => (
                    <button
                        key={m}
                        onClick={() => applyQuickRange(m)}
                        className="px-4 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition whitespace-nowrap"
                    >
                        Últimos {m} Meses
                    </button>
                ))}
            </div>

            {/* Action Button */}
            <button
                onClick={handleAnalyzeClick}
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Descargando Datos...
                    </>
                ) : (
                    <>
                        🚀 Iniciar Análisis Automático
                    </>
                )}
            </button>
        </div>
    );
};
