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

    const calculateDefaultDates = () => {
        const end = new Date();
        end.setDate(end.getDate() - 3);
        const start = new Date(end);
        start.setDate(start.getDate() - 27);

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

    const applyQuickRange = (months?: number, type?: 'prev_year' | 'prev_period') => {
        const end = new Date();
        end.setDate(end.getDate() - 3);

        let start, startP1, endP1;

        if (type === 'prev_year') {
            start = new Date(dateRangeP2.start);
            const p2End = new Date(dateRangeP2.end);

            startP1 = new Date(start);
            startP1.setFullYear(startP1.getFullYear() - 1);
            endP1 = new Date(p2End);
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
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="bg-indigo-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl animate-pulse">🔒</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Conexión con Search Console</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">Necesitamos acceso a tus propiedades de Google para automatizar el análisis.</p>
                <button
                    onClick={() => signInWithGoogle(`${window.location.origin}/herramientas/generador-informes`)}
                    className="bg-indigo-600 text-white font-bold py-4 px-8 rounded-2xl hover:bg-indigo-700 flex items-center gap-3 mx-auto shadow-lg shadow-indigo-200 transition-all active:scale-95"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 p-1 bg-white rounded-full shadow-sm" alt="G" />
                    Conectar con Google
                </button>
            </div>
        );
    }

    if (hasToken === null || loadingSites) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-inner"></div>
                <div className="text-center">
                    <p className="text-indigo-600 font-extrabold tracking-wide uppercase text-xs mb-1">Cargando propiedades</p>
                    <p className="text-slate-400 text-sm">Sincronizando con Google Cloud...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-8 animate-fade-in">
            {/* Mode Tabs */}
            <div className="p-1 bg-slate-100 rounded-2xl self-start inline-flex border border-slate-200/50">
                <button
                    onClick={() => setCompareMode('range')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${compareMode === 'range' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Rango de Fechas
                </button>
                <button
                    onClick={() => setCompareMode('day')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${compareMode === 'day' ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Comparador de Días
                </button>
            </div>

            {/* Property Selector */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">PROPIEDAD GSC</label>
                <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="w-full text-lg p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all appearance-none cursor-pointer"
                >
                    {sites.map(s => (
                        <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
                    ))}
                </select>
            </div>

            {/* Date Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Period 1 */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white group shadow-sm transition-all hover:border-slate-300">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase mb-4 flex justify-between items-center tracking-widest">
                        <span>{compareMode === 'range' ? 'Periodo 1' : 'Día 1'} (Base)</span>
                        <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                    </div>
                    {compareMode === 'range' ? (
                        <div className="flex gap-4">
                            <input type="date" value={dateRangeP1.start} onChange={(e) => setDateRangeP1({ ...dateRangeP1, start: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-slate-300 outline-none transition-all" />
                            <span className="self-center text-slate-300">→</span>
                            <input type="date" value={dateRangeP1.end} onChange={(e) => setDateRangeP1({ ...dateRangeP1, end: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-slate-300 outline-none transition-all" />
                        </div>
                    ) : (
                        <input type="date" value={dayP1} onChange={(e) => setDayP1(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-slate-300 outline-none transition-all" />
                    )}
                </div>

                {/* Period 2 */}
                <div className="p-6 rounded-2xl border border-indigo-100 bg-indigo-50/20 group shadow-sm transition-all hover:border-indigo-200">
                    <div className="text-[10px] font-extrabold text-indigo-500 uppercase mb-4 flex justify-between items-center tracking-widest">
                        <span>{compareMode === 'range' ? 'Periodo 2' : 'Día 2'} (Target)</span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    </div>
                    {compareMode === 'range' ? (
                        <div className="flex gap-4">
                            <input type="date" value={dateRangeP2.start} onChange={(e) => setDateRangeP2({ ...dateRangeP2, start: e.target.value })} className="w-full p-2.5 rounded-xl border border-indigo-100 bg-white text-sm font-mono text-indigo-700 font-bold focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm" />
                            <span className="self-center text-indigo-300">→</span>
                            <input type="date" value={dateRangeP2.end} onChange={(e) => setDateRangeP2({ ...dateRangeP2, end: e.target.value })} className="w-full p-2.5 rounded-xl border border-indigo-100 bg-white text-sm font-mono text-indigo-700 font-bold focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm" />
                        </div>
                    ) : (
                        <input type="date" value={dayP2} onChange={(e) => setDayP2(e.target.value)} className="w-full p-2.5 rounded-xl border border-indigo-100 bg-white text-sm font-mono text-indigo-700 font-bold focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm" />
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            {compareMode === 'range' && (
                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-2">
                    {[1, 3, 6, 12].map(m => (
                        <button
                            key={m}
                            onClick={() => applyQuickRange(m)}
                            className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md transition whitespace-nowrap"
                        >
                            {m} {m === 1 ? 'Mes' : 'Meses'}
                        </button>
                    ))}
                    <button onClick={() => applyQuickRange(undefined, 'prev_year')} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition whitespace-nowrap">Año Anterior</button>
                </div>
            )}

            {/* Action Button */}
            <button
                onClick={handleAnalyzeClick}
                disabled={isLoading}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 overflow-hidden relative group"
            >
                {isLoading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Obteniendo información...
                    </>
                ) : (
                    <>
                        <span>🚀</span> Analizar con IA
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
                    </>
                )}
            </button>
        </div>
    );
};
