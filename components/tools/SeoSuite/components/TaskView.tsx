
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { CannibalizationGroup, Language, AggregatedUrlData, ComparisonRow } from '../types';
import { Trophy, Merge, ExternalLink, TrendingDown, HelpCircle, ArrowRightCircle, Tag, CheckSquare, Code, FileText, Sparkles, AlertOctagon, Target, Copy, Trash2, Edit2 } from 'lucide-react';

interface TaskViewProps {
    groups?: CannibalizationGroup[]; 
    rows?: ComparisonRow[]; 
    mode?: 'CANNIBALIZATION' | 'GENERIC';
    lang: Language;
    isEditorMode: boolean;
    onUpdateUrlTag?: (groupQuery: string, url: string, newTag: string) => void;
    onUpdateRow?: (updatedRow: ComparisonRow) => void;
    onDismiss?: (query: string) => void;
}

interface RelationalTask {
    targetUrl: string; 
    targetStats: AggregatedUrlData | null;
    actions: {
        sourceUrl: string;
        actionType: 'REDIRECT' | 'MERGE' | 'DEOPTIMIZE' | 'UNKNOWN';
        originalTag: string;
        queries: string[];
        impact: number; 
        clicks: number;
        ctr: number;
        position: number;
    }[];
    totalImpact: number;
}

// CONSOLIDATED TAGS
const ACTION_TAGS_ES = ['GANADORA', 'REDIRECCIONAR 301', 'FUSIONAR', 'DESOPTIMIZAR', 'MANTENER', 'ELIMINAR (404)', 'CANONICALIZAR', 'REVISIÓN MANUAL'];
const ACTION_TAGS_EN = ['WINNER', 'REDIRECT 301', 'MERGE', 'DE-OPTIMIZE', 'KEEP', 'DELETE (404)', 'CANONICALIZE', 'MANUAL REVIEW'];

const ActionEditor: React.FC<{
    currentTag: string;
    lang: Language;
    onChange: (newTag: string) => void;
}> = ({ currentTag, lang, onChange }) => {
    const availableTags = lang === 'es' ? ACTION_TAGS_ES : ACTION_TAGS_EN;
    const isStandardTag = availableTags.includes(currentTag);
    const [isCustomMode, setIsCustomMode] = useState(!isStandardTag && !!currentTag);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isCustomMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCustomMode]);

    const handleSelectChange = (val: string) => {
        if (val === '__custom__') {
            setIsCustomMode(true);
        } else {
            onChange(val);
            setIsCustomMode(false);
        }
    };

    if (isCustomMode) {
        return (
            <div className="flex items-center gap-1">
                <input 
                    ref={inputRef}
                    type="text"
                    defaultValue={currentTag}
                    onBlur={(e) => {
                        if (e.target.value) onChange(e.target.value);
                        setIsCustomMode(false);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            if (e.currentTarget.value) onChange(e.currentTarget.value);
                            setIsCustomMode(false);
                        }
                    }}
                    className="text-[10px] py-1 px-1 rounded border border-indigo-300 bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 w-32"
                    placeholder="Custom..."
                />
            </div>
        );
    }

    return (
        <select 
            value={currentTag} 
            onChange={(e) => handleSelectChange(e.target.value)}
            className="text-[10px] py-1 px-1 pr-6 rounded border border-gray-200 bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[140px] appearance-none"
        >
            {availableTags.map(t => (
                <option key={t} value={t}>{t}</option>
            ))}
            <option value="__custom__" className="font-semibold text-indigo-600">
                {lang === 'es' ? '+ Personalizada...' : '+ Custom...'}
            </option>
        </select>
    );
};

const TaskView: React.FC<TaskViewProps> = ({ groups = [], rows = [], mode = 'CANNIBALIZATION', lang, isEditorMode, onUpdateUrlTag, onUpdateRow, onDismiss }) => {
    const t = {
        noTasks: lang === 'es' ? 'No hay tareas generadas. Ejecuta el análisis IA primero.' : 'No tasks generated. Run AI Analysis first.',
        consolidateTo: lang === 'es' ? 'Consolidar autoridad hacia' : 'Consolidate Authority to',
        orphanTasks: lang === 'es' ? 'Tareas sin Destino (Conflictos Sin Resolver)' : 'Orphan Tasks (Unresolved Conflicts)',
        redirect: lang === 'es' ? 'Redirigir 301 desde' : '301 Redirect from',
        merge: lang === 'es' ? 'Fusionar contenido de' : 'Merge content from',
        deopt: lang === 'es' ? 'Desoptimizar' : 'De-optimize',
        unknown: lang === 'es' ? 'Acción Requerida en' : 'Action Required on',
        impact: lang === 'es' ? 'Impresiones' : 'Impressions',
        clicks: lang === 'es' ? 'Clics' : 'Clicks',
        ctr: 'CTR',
        pos: 'Pos',
        winnerStats: lang === 'es' ? 'Métricas Ganadora' : 'Winner Metrics',
        actions: lang === 'es' ? 'Acción' : 'Action',
        sourceUrl: lang === 'es' ? 'URL Origen' : 'Source URL',
        queries: lang === 'es' ? 'Queries Afectadas' : 'Affected Queries',
        diagnosis: lang === 'es' ? 'Diagnóstico IA' : 'AI Diagnosis',
        proposedActions: lang === 'es' ? 'Acciones Propuestas' : 'Proposed Actions',
        competitors: lang === 'es' ? 'Competidores de Referencia' : 'Reference Competitors',
        copy: lang === 'es' ? 'Copiar' : 'Copy',
        copied: lang === 'es' ? 'Copiado' : 'Copied'
    };

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(n);
    const fmtDec = (n: number) => n.toFixed(1);

    const CopyButton = ({ text }: { text: string }) => {
        const [copied, setCopied] = useState(false);
        const handleCopy = () => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };
        return (
            <button onClick={handleCopy} className="ml-auto text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                {copied ? <CheckSquare className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? t.copied : t.copy}
            </button>
        );
    };

    const relationalData = useMemo(() => {
        if (mode !== 'CANNIBALIZATION') return { validTasks: [], orphans: null };
        const taskMap = new Map<string, RelationalTask>();
        
        groups.forEach(group => {
            let winnerUrl = group.winnerUrl;
            if (!winnerUrl) {
                const winnerObj = group.urls.find(u => u.aiTag && (u.aiTag.toUpperCase().includes('WINNER') || u.aiTag.toUpperCase().includes('GANADORA')));
                if (winnerObj) winnerUrl = winnerObj.url;
            }

            group.urls.forEach(u => {
                if (!u.aiTag) return;
                const tagUpper = u.aiTag.toUpperCase();
                if (u.url === winnerUrl) return;
                if (tagUpper.includes('WINNER') || tagUpper.includes('GANADORA')) return; 
                if (tagUpper.includes('IGNORAR') || tagUpper.includes('IGNORE')) return;
                if (tagUpper.includes('MIXED') || tagUpper.includes('MIXTO') || tagUpper.includes('KEEP') || tagUpper.includes('MANTENER')) return;

                let actionType: 'REDIRECT' | 'MERGE' | 'DEOPTIMIZE' | 'UNKNOWN' = 'UNKNOWN';
                if (tagUpper.includes('REDIRECT') || tagUpper.includes('REDIRECCIONAR')) actionType = 'REDIRECT';
                else if (tagUpper.includes('MERGE') || tagUpper.includes('FUSIONAR')) actionType = 'MERGE';
                else if (tagUpper.includes('DE-OPT') || tagUpper.includes('DESOPT')) actionType = 'DEOPTIMIZE';

                const targetKey = winnerUrl || '__ORPHAN__';

                if (!taskMap.has(targetKey)) {
                    const targetStats = winnerUrl ? group.urls.find(x => x.url === winnerUrl) || null : null;
                    taskMap.set(targetKey, {
                        targetUrl: targetKey,
                        targetStats,
                        actions: [],
                        totalImpact: 0
                    });
                }

                const entry = taskMap.get(targetKey)!;
                if (!entry.targetStats && winnerUrl) {
                    const found = group.urls.find(x => x.url === winnerUrl);
                    if (found) entry.targetStats = found;
                }

                const existingAction = entry.actions.find(a => a.sourceUrl === u.url);
                
                if (existingAction) {
                    if (!existingAction.queries.includes(group.query)) {
                        existingAction.queries.push(group.query);
                        const totalImp = existingAction.impact + u.impressions;
                        existingAction.clicks += u.clicks;
                        existingAction.position = ((existingAction.position * existingAction.impact) + (u.position * u.impressions)) / totalImp;
                        existingAction.ctr = ((existingAction.ctr * existingAction.impact) + (u.ctr * u.impressions)) / totalImp;
                        existingAction.impact = totalImp;
                    }
                } else {
                    entry.actions.push({
                        sourceUrl: u.url,
                        actionType,
                        originalTag: u.aiTag,
                        queries: [group.query],
                        impact: u.impressions,
                        clicks: u.clicks,
                        ctr: u.ctr,
                        position: u.position
                    });
                }
                
                entry.totalImpact += u.impressions;
            });
        });

        const result = Array.from(taskMap.values());
        const orphans = result.find(r => r.targetUrl === '__ORPHAN__');
        const validTasks = result.filter(r => r.targetUrl !== '__ORPHAN__');

        validTasks.sort((a, b) => b.totalImpact - a.totalImpact);

        return { validTasks, orphans };
    }, [groups, mode]);

    const genericTasks = useMemo(() => {
        if (mode !== 'GENERIC') return [];
        return rows.filter(r => r.aiDiagnosis && r.aiDiagnosis.status !== 'OPTIMAL');
    }, [rows, mode]);

    const ActionIcon = ({ type }: { type: string }) => {
        switch (type) {
            case 'REDIRECT': return <ArrowRightCircle className="w-4 h-4 text-rose-600" />;
            case 'MERGE': return <Merge className="w-4 h-4 text-blue-600" />;
            case 'DEOPTIMIZE': return <TrendingDown className="w-4 h-4 text-amber-600" />;
            default: return <HelpCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    const getActionLabel = (type: string) => {
        switch (type) {
            case 'REDIRECT': return t.redirect;
            case 'MERGE': return t.merge;
            case 'DEOPTIMIZE': return t.deopt;
            default: return t.unknown;
        }
    };

    const handleGenericUpdate = (originalRow: ComparisonRow, field: 'DIAGNOSIS' | 'ACTION', value: any, actionIndex?: number) => {
        if (!onUpdateRow) return;

        const newRow = { ...originalRow };
        // Deep copy nested objects to ensure React state update detection
        newRow.aiDiagnosis = { ...originalRow.aiDiagnosis! };
        newRow.aiActions = originalRow.aiActions ? originalRow.aiActions.map(a => ({...a})) : [];

        if (field === 'DIAGNOSIS') {
            newRow.aiDiagnosis.explanation = value;
        } else if (field === 'ACTION' && typeof actionIndex === 'number') {
            if (value.title !== undefined) newRow.aiActions[actionIndex].title = value.title;
            if (value.content !== undefined) newRow.aiActions[actionIndex].content = value.content;
        }
        
        onUpdateRow(newRow);
    };

    if (mode === 'CANNIBALIZATION') {
        if (relationalData.validTasks.length === 0 && (!relationalData.orphans || relationalData.orphans.actions.length === 0)) {
            return <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">{t.noTasks}</div>;
        }

        const renderTaskTable = (actions: RelationalTask['actions']) => (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-gray-100">
                            <th className="px-4 py-2 font-semibold w-40">{t.actions}</th>
                            <th className="px-4 py-2 font-semibold">{t.sourceUrl}</th>
                            <th className="px-4 py-2 font-semibold">{t.queries}</th>
                            <th className="px-4 py-2 font-semibold text-right w-20">{t.impact}</th>
                            <th className="px-4 py-2 font-semibold text-right w-20">{t.clicks}</th>
                            <th className="px-4 py-2 font-semibold text-right w-20">{t.ctr}</th>
                            <th className="px-4 py-2 font-semibold text-right w-20">{t.pos}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {actions.map((action, actionIdx) => (
                            <tr key={actionIdx} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-4 py-3 align-top">
                                    {isEditorMode && onUpdateUrlTag ? (
                                        <ActionEditor currentTag={action.originalTag} lang={lang} onChange={(newTag) => onUpdateUrlTag(action.queries[0], action.sourceUrl, newTag)} />
                                    ) : (
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border w-fit ${action.actionType === 'REDIRECT' ? 'bg-rose-50 text-rose-700 border-rose-100' : action.actionType === 'MERGE' ? 'bg-blue-50 text-blue-700 border-blue-100' : action.actionType === 'DEOPTIMIZE' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            <ActionIcon type={action.actionType} />
                                            {getActionLabel(action.actionType)}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <a href={action.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-slate-600 hover:text-indigo-600 break-all flex items-center gap-1">
                                        {action.sourceUrl}
                                        <ExternalLink className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                                    </a>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <div className="flex flex-wrap gap-1.5">
                                        {action.queries.map((q, qIdx) => (
                                            <span key={qIdx} className="inline-flex items-center text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{q}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 align-top text-right text-xs font-bold text-slate-700">{fmt(action.impact)}</td>
                                <td className="px-4 py-3 align-top text-right text-xs text-slate-600">{fmt(action.clicks)}</td>
                                <td className="px-4 py-3 align-top text-right text-xs text-slate-500">{fmtDec(action.ctr)}%</td>
                                <td className="px-4 py-3 align-top text-right text-xs text-slate-500">{fmtDec(action.position)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {relationalData.validTasks.map((task, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden break-inside-avoid">
                        <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-emerald-100 p-2 rounded-lg mt-1"><Trophy className="w-5 h-5 text-emerald-700" /></div>
                                <div>
                                    <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-1">{t.consolidateTo} (Winner)</h3>
                                    <a href={task.targetUrl} target="_blank" rel="noopener noreferrer" className="text-sm sm:text-base font-bold text-slate-800 hover:text-indigo-600 flex items-center gap-2 break-all">{task.targetUrl}<ExternalLink className="w-3 h-3 text-slate-400" /></a>
                                </div>
                            </div>
                            {task.targetStats && (
                                <div className="flex gap-3 sm:gap-6 text-xs text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm whitespace-nowrap">
                                    <div><span className="font-bold text-slate-700">{fmt(task.targetStats.impressions)}</span> imp</div>
                                    <div><span className="font-bold text-slate-700">{fmt(task.targetStats.clicks)}</span> clk</div>
                                    <div>Pos <span className="font-bold text-slate-700">{task.targetStats.position.toFixed(1)}</span></div>
                                </div>
                            )}
                        </div>
                        {renderTaskTable(task.actions)}
                    </div>
                ))}
                {relationalData.orphans && relationalData.orphans.actions.length > 0 && (
                    <div className="mt-8 border-2 border-dashed border-rose-300 bg-rose-50/30 rounded-xl overflow-hidden break-inside-avoid">
                        <div className="p-4 bg-rose-100/50 border-b border-rose-200 flex items-center gap-3">
                            <AlertOctagon className="w-6 h-6 text-rose-600" />
                            <div>
                                <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wide">{t.orphanTasks}</h3>
                                <p className="text-xs text-rose-600 mt-0.5">The AI identified issues but couldn't pick a winner. Please review manually.</p>
                            </div>
                        </div>
                        {renderTaskTable(relationalData.orphans.actions)}
                    </div>
                )}
            </div>
        );
    }

    if (mode === 'GENERIC') {
        if (genericTasks.length === 0) {
            return <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">{t.noTasks}</div>;
        }

        return (
            <div className="space-y-4 animate-in fade-in duration-500">
                {genericTasks.map((row, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-6 break-inside-avoid relative group">
                        
                        {onDismiss && (
                            <button 
                                onClick={() => onDismiss(row.query)}
                                className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 p-1 rounded-full hover:bg-rose-50 transition-colors z-10"
                                title="Dismiss Task"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}

                        {/* Diagnosis Column */}
                        <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${row.aiDiagnosis?.status === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : row.aiDiagnosis?.status === 'IMPROVABLE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{row.aiDiagnosis?.status}</span>
                                <span className="text-xs text-slate-400 font-mono">{row.dominantCountry !== 'Global' ? row.dominantCountry : 'GL'}</span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1">{row.query}</h3>
                            <a href={row.urlBreakdown[0]?.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:underline truncate block mb-4 font-mono">{row.urlBreakdown[0]?.url}</a>

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-3 flex-grow">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3 text-indigo-400" /> {t.diagnosis}</h4>
                                {isEditorMode ? (
                                    <textarea 
                                        value={row.aiDiagnosis?.explanation || ''}
                                        onChange={(e) => handleGenericUpdate(row, 'DIAGNOSIS', e.target.value)}
                                        className="w-full text-sm text-slate-700 bg-white border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                                    />
                                ) : (
                                    <p className="text-sm text-slate-700 leading-relaxed italic">"{row.aiDiagnosis?.explanation}"</p>
                                )}
                            </div>

                            {/* Competitor Analysis Section */}
                            {row.aiDiagnosis?.referenceCompetitors && row.aiDiagnosis.referenceCompetitors.length > 0 && (
                                <div className="mt-auto pt-3">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> {t.competitors}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {row.aiDiagnosis.referenceCompetitors.map((compUrl, i) => (
                                            <a key={i} href={compUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1.5 rounded border border-indigo-100 flex items-center gap-1 max-w-full hover:shadow-sm transition-shadow group">
                                                <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                                                <span className="truncate max-w-[200px]">{compUrl}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Column */}
                        <div className="w-full lg:w-1/2 bg-gray-50/50 rounded-xl p-5 border border-gray-100 flex flex-col">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5" /> {t.proposedActions}</h4>
                            <div className="space-y-4 flex-grow">
                                {row.aiActions?.map((act, i) => {
                                    // SAFE RENDER: Ensure content is a string before rendering to avoid React Error #31
                                    const safeContent = typeof act.content === 'string' 
                                        ? act.content 
                                        : JSON.stringify(act.content, null, 2);

                                    return (
                                        <div key={i} className="group">
                                            <div className="flex items-center justify-between mb-1.5 gap-2">
                                                {isEditorMode ? (
                                                    <input 
                                                        type="text"
                                                        value={act.title}
                                                        onChange={(e) => handleGenericUpdate(row, 'ACTION', { title: e.target.value }, i)}
                                                        className="flex-1 text-sm font-bold text-slate-700 border border-slate-300 rounded px-2 py-1"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                        {act.type === 'CODE' ? <Code className="w-3.5 h-3.5 text-blue-500" /> : <FileText className="w-3.5 h-3.5 text-emerald-500" />}
                                                        {act.title}
                                                    </div>
                                                )}
                                                <CopyButton text={safeContent} />
                                            </div>
                                            
                                            {isEditorMode ? (
                                                <textarea 
                                                    value={safeContent}
                                                    onChange={(e) => handleGenericUpdate(row, 'ACTION', { content: e.target.value }, i)}
                                                    className="w-full h-48 bg-white border border-slate-300 p-3 rounded-lg font-mono text-xs text-slate-600 focus:ring-1 focus:ring-indigo-500"
                                                />
                                            ) : (
                                                <div className="bg-white border border-gray-200 p-3 rounded-lg font-mono text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-60 shadow-sm leading-relaxed relative">
                                                    {safeContent}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return null;
};

export default TaskView;
