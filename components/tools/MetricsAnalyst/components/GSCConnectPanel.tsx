import React, { useState, useEffect } from 'react';
import { GscService, GSCProperty } from '../services/gscService';
import { useAuth } from '@/context/AuthContext';

interface GSCConnectPanelProps {
    onAnalyze: (siteUrl: string, startDateP1: string, endDateP1: string, startDateP2: string, endDateP2: string) => void;
    isLoading: boolean;
}

export const GSCConnectPanel: React.FC<GSCConnectPanelProps> = ({ onAnalyze, isLoading }) => {
    const { session, signInWithGoogle } = useAuth();
    const [sites, setSites] = useState<GSCProperty[]>([]);
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [loadingSites, setLoadingSites] = useState(false);
    const [hasToken, setHasToken] = useState<boolean | null>(null);

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
    const [compareMode, setCompareMode] = useState<'range' | 'day'>('range');
    const [dayP1, setDayP1] = useState(defaults.p1End);
    const [dayP2, setDayP2] = useState(defaults.p2End);

    useEffect(() => {
        checkToken();
    }, [session]);

    const checkToken = async () => {
        setLoadingSites(true);
        try {
            const token = await GscService.getAccessToken();
            if (token) {
                setHasToken(true);
                await loadSites(token);
            } else {
                setHasToken(false);
            }
        } catch (e) {
            console.error("Token check failed", e);
            setHasToken(false);
        } finally {
            setLoadingSites(false);
        }
    };

    const loadSites = async (token: string) => {
        setLoadingSites(true);
        try {
            const list = await GscService.getSites(token);
            setSites(list);
            if (list.length > 0) setSelectedSite(list[0].siteUrl);
        } catch (e) {
            console.error("Failed to load sites", e);
        } finally {
            setLoadingSites(false);
        }
    };

    const handleAnalyzeClick = () => {
        if (!selectedSite) return alert("Selecciona una propiedad.");
        if (compareMode === 'day') {
            onAnalyze(selectedSite, dayP1, dayP1, dayP2, dayP2);
        } else {
            onAnalyze(selectedSite, dateRangeP1.start, dateRangeP1.end, dateRangeP2.start, dateRangeP2.end);
        }
    };

    // Quick Selectors
    const applyQuickRange = (months?: number, type?: 'prev_year' | 'prev_period') => {
        const end = new Date();
        end.setDate(end.getDate() - 3);

        let start, p2S, p2E, startP1, endP1;

        if (type === 'prev_year') {
            // Same dates last year
            start = new Date(dateRangeP2.start);
            end.setTime(new Date(dateRangeP2.end).getTime());

            startP1 = new Date(start);
            startP1.setFullYear(startP1.getFullYear() - 1);
            endP1 = new Date(end);
            endP1.setFullYear(endP1.getFullYear() - 1);
        } else if (months) {
            start = new Date(end);
            start.setMonth(start.getMonth() - months);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            endP1 = new Date(start.getTime() - 86400000);
            startP1 = new Date(endP1.getTime() - diffTime);
        }

        if (start && endP1 && startP1) {
            setDateRangeP2({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
            setDateRangeP1({ start: startP1.toISOString().split('T')[0], end: endP1.toISOString().split('T')[0] });
        }
    };

    if (hasToken === false) {
        return (
            <div className="text-center py-12 bg-brand-soft/50 rounded-2xl border border-brand-power/10">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-xl font-bold text-brand-power mb-2">Conexión Requerida</h3>
                <p className="text-brand-power/60 mb-6 max-w-sm mx-auto">Para analizar tus datos automáticamente, necesitamos acceso de lectura a tu Google Search Console.</p>
                <button
                    onClick={() => signInWithGoogle(`${window.location.origin}/herramientas/generador-informes`)}
                    className="bg-brand-white border border-brand-power/10 text-brand-power font-bold py-3 px-6 rounded-xl hover:bg-brand-soft flex items-center gap-3 mx-auto shadow-sm transition-transform active:scale-95"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
                    Iniciar Sesión con Google
                </button>
            </div>
        );
    }

    if (hasToken === null || loadingSites) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-brand-power border-t-transparent rounded-full animate-spin"></div>
                <p className="text-brand-power/50 font-bold animate-pulse">Verificando acceso a Google...</p>
            </div>
        );
    }


    // ... (rest of quick actions)

    return (
        <div className="w-full">
            {/* 0. Mode Tabs */}
            <div className="flex gap-2 mb-6 bg-brand-power/5 p-1.5 rounded-xl self-start inline-flex">
                <button
                    onClick={() => setCompareMode('range')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${compareMode === 'range' ? 'bg-brand-white shadow text-brand-power' : 'text-brand-power/50 hover:bg-brand-white/50'}`}
                >
                    Rango de Fechas
                </button>
                <button
                    onClick={() => setCompareMode('day')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${compareMode === 'day' ? 'bg-brand-white shadow text-brand-power' : 'text-brand-power/50 hover:bg-brand-white/50'}`}
                >
                    Día vs Día
                </button>
            </div>
            {/* 1. Property Selector */}
            <div className="mb-8">
                <label className="block text-sm font-bold text-brand-power mb-2 uppercase tracking-wide">Propiedad de Search Console</label>
                {loadingSites ? (
                    <div className="animate-pulse h-12 bg-brand-soft rounded-xl w-full"></div>
                ) : (
                    <select
                        value={selectedSite}
                        onChange={(e) => setSelectedSite(e.target.value)}
                        className="w-full text-lg p-3 bg-brand-soft/50 border border-brand-power/10 rounded-xl focus:ring-2 focus:ring-brand-power/30 outline-none font-medium text-brand-power"
                    >
                        {sites.map(s => (
                            <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* 2. Date Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Period 1 */}
                <div className="p-5 rounded-2xl border border-brand-power/10 bg-brand-soft/50 relative group">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-brand-power/20 rounded-t-2xl"></div>
                    <div className="text-xs font-bold text-brand-power/60 uppercase mb-3 flex justify-between">
                        <span>{compareMode === 'range' ? 'Periodo Base' : 'Día Base'} (Anterior)</span>
                        <span className="bg-brand-power/10 text-brand-power px-2 py-0.5 rounded text-[10px]">Comparativa</span>
                    </div>
                    {compareMode === 'range' ? (
                        <div className="flex gap-2">
                            <input type="date" value={dateRangeP1.start} onChange={(e) => setDateRangeP1({ ...dateRangeP1, start: e.target.value })} className="w-full p-2 rounded-lg border border-brand-power/10 text-sm font-mono text-brand-power focus:border-brand-power/50 outline-none bg-transparent" />
                            <span className="self-center text-brand-power/40">-</span>
                            <input type="date" value={dateRangeP1.end} onChange={(e) => setDateRangeP1({ ...dateRangeP1, end: e.target.value })} className="w-full p-2 rounded-lg border border-brand-power/10 text-sm font-mono text-brand-power focus:border-brand-power/50 outline-none bg-transparent" />
                        </div>
                    ) : (
                        <input type="date" value={dayP1} onChange={(e) => setDayP1(e.target.value)} className="w-full p-2 rounded-lg border border-brand-power/10 text-sm font-mono text-brand-power focus:border-brand-power/50 outline-none bg-transparent" />
                    )}
                </div>

                {/* Period 2 */}
                <div className="p-5 rounded-2xl border border-brand-accent/50 bg-brand-accent/10 relative group shadow-sm">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-brand-accent rounded-t-2xl"></div>
                    <div className="text-xs font-bold text-brand-power uppercase mb-3 flex justify-between">
                        <span>{compareMode === 'range' ? 'Periodo Actual' : 'Día Objetivo'} (Foco)</span>
                        <span className="bg-brand-accent/30 text-brand-power px-2 py-0.5 rounded text-[10px]">Principal</span>
                    </div>
                    {compareMode === 'range' ? (
                        <div className="flex gap-2">
                            <input type="date" value={dateRangeP2.start} onChange={(e) => setDateRangeP2({ ...dateRangeP2, start: e.target.value })} className="w-full p-2 rounded-lg border border-brand-accent/30 text-sm font-mono text-brand-power font-bold focus:border-brand-accent outline-none bg-brand-white/50" />
                            <span className="self-center text-brand-power/40">-</span>
                            <input type="date" value={dateRangeP2.end} onChange={(e) => setDateRangeP2({ ...dateRangeP2, end: e.target.value })} className="w-full p-2 rounded-lg border border-brand-accent/30 text-sm font-mono text-brand-power font-bold focus:border-brand-accent outline-none bg-brand-white/50" />
                        </div>
                    ) : (
                        <input type="date" value={dayP2} onChange={(e) => setDayP2(e.target.value)} className="w-full p-2 rounded-lg border border-brand-accent/30 text-sm font-mono text-brand-power font-bold focus:border-brand-accent outline-none bg-brand-white/50" />
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            {compareMode === 'range' && (
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {[1, 3, 6, 12].map(m => (
                        <button
                            key={m}
                            onClick={() => applyQuickRange(m)}
                            className="px-4 py-1.5 rounded-full border border-brand-power/10 text-xs font-bold text-brand-power/70 hover:bg-brand-soft hover:border-brand-power/30 transition whitespace-nowrap"
                        >
                            Últimos {m} Meses
                        </button>
                    ))}
                    <button onClick={() => applyQuickRange(undefined, 'prev_year')} className="px-4 py-1.5 rounded-full border border-brand-accent/30 bg-brand-accent/10 text-xs font-bold text-brand-power hover:bg-brand-accent/20 transition whitespace-nowrap">Vs Año Anterior</button>
                </div>
            )}

            {/* Action Button */}
            <button
                onClick={handleAnalyzeClick}
                disabled={isLoading}
                className="w-full bg-brand-power text-brand-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg shadow-brand-power/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
