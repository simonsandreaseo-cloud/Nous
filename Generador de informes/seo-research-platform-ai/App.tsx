import React, { useState, useCallback } from 'react';
import { CSVRow, ReportPayload, ChartData, LogEntry } from './types';
import { parseCSV } from './services/csvService';
import { runFullLocalAnalysis } from './services/analysisService';
import { generateHTMLReport, getRelevantSections } from './services/geminiService';
import { LiveConsole } from './components/LiveConsole';
import { ReportView } from './components/ReportView';
import { Dashboard } from './components/Dashboard';

const App: React.FC = () => {
    // State
    const [step, setStep] = useState<number>(1);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<CSVRow[]>([]);
    const [userContext, setUserContext] = useState<string>("");
    const [apiKey, setApiKey] = useState<string>("");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Result State
    const [reportHTML, setReportHTML] = useState<string>("");
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [reportPayload, setReportPayload] = useState<ReportPayload | null>(null);
    const [p1Name, setP1Name] = useState("");
    const [p2Name, setP2Name] = useState("");
    const [originalDataP1, setOriginalDataP1] = useState<CSVRow[]>([]);
    const [originalDataP2, setOriginalDataP2] = useState<CSVRow[]>([]);

    // Helpers
    const addLog = useCallback((message: string, type: 'info' | 'warn' | 'error' = 'info') => {
        setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
    }, []);

    // Handlers
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFile(file);
        
        try {
            addLog(`Analizando archivo: ${file.name}...`);
            const data = await parseCSV(file, (msg) => addLog(msg, 'info'));
            setParsedData(data);
            setStep(3);
            addLog("CSV procesado correctamente.");
        } catch (err: any) {
            addLog(`Error al leer CSV: ${err.message}`, 'error');
        }
    };

    const handleAnalysis = async (customContext?: string) => {
        if (!apiKey) {
            alert("Por favor ingresa tu API Key de Google AI Studio.");
            return;
        }

        setIsAnalyzing(true);
        setStep(4);
        const activeContext = customContext || userContext;
        
        try {
            // Split Data into periods if not already done
            let dP1 = originalDataP1;
            let dP2 = originalDataP2;
            let name1 = p1Name;
            let name2 = p2Name;

            if (dP1.length === 0) {
                addLog("Detectando periodos de tiempo en los datos...");
                
                // 1. Get all unique timestamps and sort them
                const uniqueTimestamps = Array.from<number>(new Set(parsedData.map(r => r.date.getTime())))
                                             .sort((a, b) => a - b);
                
                if (uniqueTimestamps.length < 2) {
                    throw new Error("El dataset es muy pequeño (necesita al menos 2 fechas distintas).");
                }

                // 2. Split strictly in half by time continuity
                // This handles 'Last 28 days' or custom ranges much better than calendar months
                const midPointIndex = Math.floor(uniqueTimestamps.length / 2);
                
                // P1 = First half (Older)
                const p1Dates = new Set(uniqueTimestamps.slice(0, midPointIndex));
                // P2 = Second half (Newer)
                const p2Dates = new Set(uniqueTimestamps.slice(midPointIndex));

                dP1 = parsedData.filter(r => p1Dates.has(r.date.getTime()));
                dP2 = parsedData.filter(r => p2Dates.has(r.date.getTime()));

                // Format labels
                const fmt = (ts: number) => new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                
                name1 = `${fmt(uniqueTimestamps[0])} - ${fmt(uniqueTimestamps[midPointIndex - 1])}`;
                name2 = `${fmt(uniqueTimestamps[midPointIndex])} - ${fmt(uniqueTimestamps[uniqueTimestamps.length - 1])}`;

                setOriginalDataP1(dP1);
                setOriginalDataP2(dP2);
                setP1Name(name1);
                setP2Name(name2);
                
                addLog(`Periodos Identificados: P1 [${name1}] vs P2 [${name2}]`);
                addLog(`Filas P1: ${dP1.length}, Filas P2: ${dP2.length}`);
            }

            // Run Analysis
            addLog("Ejecutando análisis estadístico local...");
            const { reportPayload: payload, chartData: cData } = runFullLocalAnalysis(dP1, dP2, name1, name2, activeContext, (msg) => addLog(msg));
            
            setReportPayload(payload);
            setChartData(cData);

            // Gemini Dispatcher
            addLog("Consultando al Despachador IA para estructura del informe...");
            const sections = await getRelevantSections(payload, apiKey);
            addLog(`Secciones seleccionadas por IA: ${sections.join(', ')}`);

            // Gemini Writer
            addLog("Generando narrativa del informe con Gemini...");
            const html = await generateHTMLReport(payload, sections, apiKey);
            setReportHTML(html);
            
            addLog("¡Informe generado con éxito!", 'info');
        } catch (err: any) {
            addLog(`Fallo en el análisis: ${err.message}`, 'error');
            setStep(3); // Go back
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRegenerate = (newMessage: string) => {
        const newContext = `${userContext}\n\n[USER UPDATE]: ${newMessage}`;
        setUserContext(newContext);
        handleAnalysis(newContext);
    };

    return (
        <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto font-sans text-slate-800">
            {/* Header */}
            <div className="text-center mb-8 no-print">
                <h1 className="text-3xl font-bold text-indigo-900">Plataforma de Investigación SEO</h1>
                <p className="text-slate-500 mt-2">Análisis inteligente de Search Console con Gemini 2.0</p>
            </div>

            {/* Step 1: Looker Studio Instructions */}
            {step === 1 && (
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-slate-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Paso 1: Obtener Datos</h2>
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg text-indigo-900 text-sm mb-6">
                        <p className="font-semibold mb-2">Instrucciones:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Selecciona tu propiedad de Search Console en el reporte de abajo.</li>
                            <li>Asegúrate de que el rango de fechas cubra un periodo significativo (ej. últimos 3 meses).</li>
                            <li>Haz clic derecho en la tabla -> Exportar -> CSV.</li>
                        </ol>
                    </div>
                    <div className="relative pb-[75%] h-0 border rounded-lg overflow-hidden shadow-inner bg-gray-100">
                        <iframe 
                            src="https://lookerstudio.google.com/embed/reporting/d1ee3885-13c0-4e98-9f51-2f522dfda494/page/0ludF" 
                            className="absolute top-0 left-0 w-full h-full border-0"
                            allowFullScreen
                        />
                    </div>
                    <button onClick={() => setStep(2)} className="mt-6 w-full bg-indigo-600 text-white py-4 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition transform hover:-translate-y-0.5">
                        Ya tengo el CSV, continuar
                    </button>
                </div>
            )}

            {/* Step 2: Upload */}
            {step === 2 && (
                <div className="bg-white p-8 rounded-xl shadow-lg mb-8 text-center border border-slate-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Paso 2: Subir CSV</h2>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 hover:bg-slate-50 transition cursor-pointer group">
                        <input 
                            type="file" 
                            id="csv-upload" 
                            accept=".csv"
                            onChange={handleFileChange} 
                            className="hidden" 
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer w-full h-full block">
                            <div className="text-slate-400 group-hover:text-indigo-500 transition">
                                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <span className="font-medium text-lg">Haz clic para subir</span> o arrastra el archivo aquí
                            </div>
                            <p className="text-sm text-slate-400 mt-2">Acepta exportaciones estándar de Search Console</p>
                        </label>
                    </div>
                </div>
            )}

            {/* Step 3: Configure & Run */}
            {(step === 3 || step === 4) && !reportHTML && (
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-slate-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Paso 3: Analizar</h2>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Google AI API Key</label>
                        <input 
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Pega tu clave API aquí (comienza con AIza...)"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                         <p className="text-xs text-slate-500 mt-1">Se usa localmente en tu navegador. No guardamos nada.</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Contexto Adicional (Opcional)</label>
                        <textarea 
                            rows={3}
                            value={userContext}
                            onChange={(e) => setUserContext(e.target.value)}
                            placeholder="Ej: Ignora las keywords de marca, enfócate en el blog, el tráfico de España es irrelevante..."
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <button 
                        onClick={() => handleAnalysis()} 
                        disabled={isAnalyzing || !apiKey}
                        className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-md"
                    >
                        {isAnalyzing ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Analizando Datos...
                            </span>
                        ) : 'Generar Informe SEO'}
                    </button>

                    <div className="mt-6">
                        <LiveConsole logs={logs} />
                    </div>
                </div>
            )}

            {/* Final Report View */}
            {reportHTML && chartData && (
                <div className="space-y-8 animate-fade-in">
                    <Dashboard stats={chartData.dashboardStats} />
                    
                    <ReportView 
                        htmlContent={reportHTML} 
                        chartData={chartData}
                        p1Name={p1Name}
                        p2Name={p2Name}
                        onRegenerate={handleRegenerate}
                        isRegenerating={isAnalyzing}
                    />
                </div>
            )}
        </div>
    );
};

export default App;