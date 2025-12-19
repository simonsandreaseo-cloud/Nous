
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CannibalizationGroup, AggregatedUrlData, Language } from '../types';
import { ChevronDown, ChevronUp, Globe, ExternalLink, ChevronRight, Trophy, Wand2, Loader2, Trash2, Layers, Tag, Edit2, Split, Check, Microscope } from 'lucide-react';

interface KeywordRowProps {
  group: CannibalizationGroup;
  lang: Language;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onDelete: () => void;
  onUpdate: (group: CannibalizationGroup) => void;
  onUpdateUrlTag: (url: string, newTag: string) => void;
  isEditorMode: boolean;
  forceExpand?: boolean;
}

// CONSOLIDATED TAGS
const ACTION_TAGS_ES = ['GANADORA', 'REDIRECCIONAR 301', 'FUSIONAR', 'DESOPTIMIZAR', 'MANTENER', 'ELIMINAR (404)', 'CANONICALIZAR', 'REVISIÓN MANUAL'];
const ACTION_TAGS_EN = ['WINNER', 'REDIRECT 301', 'MERGE', 'DE-OPTIMIZE', 'KEEP', 'DELETE (404)', 'CANONICALIZE', 'MANUAL REVIEW'];

// OPTIMIZATION: Extracted sub-components to standalone memoized components to prevent re-creation during parent render
const UrlRow = React.memo(({ 
    row, 
    lang, 
    fmt, 
    fmtCtr, 
    fmtDec,
    isEditorMode,
    onTagChange
}: { 
    row: AggregatedUrlData; 
    lang: Language; 
    fmt: (n:number)=>string; 
    fmtCtr: (n:number)=>string; 
    fmtDec: (n:number)=>string;
    isEditorMode: boolean;
    onTagChange: (newTag: string) => void;
}) => {
    const [showCountries, setShowCountries] = useState(false);
    const countryCount = row.countryStats.length;
    const singleCountry = countryCount === 1 ? row.countryStats[0] : null;

    const availableTags = lang === 'es' ? ACTION_TAGS_ES : ACTION_TAGS_EN;
    
    // Check if the current tag is one of the standard predefined tags
    const isStandardTag = row.aiTag && availableTags.includes(row.aiTag);
    // If it has a tag but it's not standard, it's custom.
    // If it has no tag, it's not custom yet.
    const [isCustomMode, setIsCustomMode] = useState(!isStandardTag && !!row.aiTag);
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
            onTagChange(val);
            setIsCustomMode(false);
        }
    };

    return (
        <>
            <tr className="border-b border-gray-100/50 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center group gap-2">
                            <a 
                                href={row.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="font-mono text-xs text-slate-600 hover:text-indigo-600 truncate max-w-[220px] sm:max-w-md block"
                                title={row.url}
                            >
                                {row.url}
                            </a>
                            <a href={row.url} target="_blank" rel="noopener noreferrer" className="ml-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 print:hidden">
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        
                        {isEditorMode && (
                            <div className="flex items-center gap-2 print:hidden">
                                <Tag className="w-3 h-3 text-slate-400" />
                                {isCustomMode ? (
                                    <div className="flex items-center gap-1">
                                        <input 
                                            ref={inputRef}
                                            type="text"
                                            value={row.aiTag || ''}
                                            onChange={(e) => onTagChange(e.target.value)}
                                            className="text-[10px] py-0.5 px-1 rounded border border-indigo-300 bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 w-32"
                                            placeholder="Custom action..."
                                            onBlur={() => {
                                                // If empty, revert to dropdown? or keep empty.
                                                if (!row.aiTag) setIsCustomMode(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') inputRef.current?.blur();
                                            }}
                                        />
                                        <button 
                                            onClick={() => setIsCustomMode(false)}
                                            className="text-slate-400 hover:text-slate-600"
                                            title="Cancel Custom"
                                        >
                                            <span className="text-[10px]">✕</span>
                                        </button>
                                    </div>
                                ) : (
                                    <select 
                                        value={row.aiTag || ''} 
                                        onChange={(e) => handleSelectChange(e.target.value)}
                                        className="text-[10px] py-0.5 px-1 rounded border border-gray-200 bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[150px]"
                                    >
                                        <option value="" disabled>Select Action</option>
                                        {availableTags.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                        <option value="__custom__" className="font-semibold text-indigo-600">
                                            {lang === 'es' ? '+ Personalizada...' : '+ Custom...'}
                                        </option>
                                    </select>
                                )}
                            </div>
                        )}
                    </div>
                </td>
                <td className="py-2 px-4">
                    {singleCountry ? (
                        <div className="flex items-center text-xs text-slate-500" title={singleCountry.country}>
                            <Globe className="w-3 h-3 mr-1.5 text-slate-300" />
                            <span className="truncate max-w-[80px]">{singleCountry.country}</span>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setShowCountries(!showCountries)}
                            className="flex items-center text-xs text-slate-500 hover:text-indigo-600 transition-colors focus:outline-none group"
                        >
                            <Globe className="w-3 h-3 mr-1.5 text-slate-300 group-hover:text-indigo-500" />
                            <span>{countryCount}</span>
                            <ChevronRight className={`w-3 h-3 ml-1 transition-transform duration-200 ${showCountries ? 'rotate-90' : ''}`} />
                        </button>
                    )}
                </td>
                <td className="py-2 px-4 text-right font-medium text-xs tabular-nums text-slate-600">{fmt(row.impressions)}</td>
                <td className="py-2 px-4 text-right font-medium text-xs tabular-nums text-slate-600">{fmt(row.clicks)}</td>
                <td className="py-2 px-4 text-right text-xs tabular-nums text-slate-500">{fmtCtr(row.ctr)}</td>
                <td className="py-2 px-4 text-right font-semibold text-xs tabular-nums text-slate-700">{fmtDec(row.position)}</td>
            </tr>
            
            {showCountries && !singleCountry && (
                <tr className="bg-slate-50/50">
                    <td colSpan={6} className="py-0 px-0">
                        <div className="py-2 px-4 pl-8 border-l-4 border-indigo-100 ml-4 my-1 space-y-1">
                             {row.countryStats.map((c, idx) => (
                                 <div key={idx} className="grid grid-cols-12 gap-2 text-[10px] text-slate-500 px-2">
                                     <div className="col-span-3 truncate">{c.country}</div>
                                     <div className="col-span-2 text-right tabular-nums">{fmt(c.impressions)}</div>
                                     <div className="col-span-2 text-right tabular-nums">{fmt(c.clicks)}</div>
                                     <div className="col-span-2 text-right tabular-nums">{fmtCtr(c.ctr)}</div>
                                     <div className="col-span-2 text-right tabular-nums">{fmtDec(c.position)}</div>
                                 </div>
                             ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
});

// OPTIMIZATION: Extracted TagGroup to standalone memoized component
const TagGroup = React.memo(({
    tag,
    urls,
    lang,
    fmt,
    fmtCtr,
    fmtDec,
    isEditorMode,
    onUpdateUrlTag
}: {
    tag: string;
    urls: AggregatedUrlData[];
    lang: Language;
    fmt: any;
    fmtCtr: any;
    fmtDec: any;
    isEditorMode: boolean;
    onUpdateUrlTag: (url: string, newTag: string) => void;
}) => {
    
    // Determine color based on tag content (heuristic)
    const tLower = tag.toLowerCase();
    let colorClass = 'bg-slate-100 border-slate-200 text-slate-700'; // Default
    let icon = <Layers className="w-3 h-3" />;

    if (tLower.includes('winner') || tLower.includes('ganadora')) {
        colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-800';
        icon = <Trophy className="w-3 h-3" />;
    } else if (tLower.includes('redirect') || tLower.includes('redireccion')) {
        colorClass = 'bg-rose-50 border-rose-200 text-rose-800';
    } else if (tLower.includes('merge') || tLower.includes('fusionar')) {
        colorClass = 'bg-blue-50 border-blue-200 text-blue-800';
    } else if (tLower.includes('de-opt') || tLower.includes('desopt')) {
        colorClass = 'bg-amber-50 border-amber-200 text-amber-800';
    } else if (tLower.includes('mixed') || tLower.includes('mixto') || tLower.includes('mantener') || tLower.includes('keep')) {
        colorClass = 'bg-violet-50 border-violet-200 text-violet-800';
        icon = <Split className="w-3 h-3" />;
    }

    return (
        <div className={`mb-4 rounded-lg border ${colorClass.split(' ')[2]} overflow-hidden last:mb-0`}>
            <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b flex items-center gap-2 ${colorClass}`}>
                {icon}
                {tag}
                <span className="ml-auto bg-white/50 px-1.5 rounded text-[10px]">{urls.length}</span>
            </div>
            <table className="w-full text-sm text-left bg-white">
                 <thead className="text-[10px] text-slate-400 bg-white border-b border-gray-100 uppercase tracking-wider">
                    <tr>
                    <th className="py-2 px-4 font-semibold w-auto">{lang === 'es' ? 'URL' : 'URL'}</th>
                    <th className="py-2 px-4 font-semibold w-24">{lang === 'es' ? 'País' : 'Country'}</th>
                    <th className="py-2 px-4 text-right font-semibold w-16">Impr.</th>
                    <th className="py-2 px-4 text-right font-semibold w-14">{lang === 'es' ? 'Clics' : 'Clicks'}</th>
                    <th className="py-2 px-4 text-right font-semibold w-14">CTR</th>
                    <th className="py-2 px-4 text-right font-semibold w-14">Pos</th>
                    </tr>
                </thead>
                <tbody>
                    {urls.map((u, idx) => (
                        <UrlRow 
                            key={idx} 
                            row={u} 
                            lang={lang} 
                            fmt={fmt} 
                            fmtCtr={fmtCtr} 
                            fmtDec={fmtDec} 
                            isEditorMode={isEditorMode}
                            onTagChange={(newTag) => onUpdateUrlTag(u.url, newTag)}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
});

const KeywordRow: React.FC<KeywordRowProps> = React.memo(({ group, lang, onAnalyze, isAnalyzing, onDelete, onUpdate, onUpdateUrlTag, isEditorMode, forceExpand }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
      if (forceExpand !== undefined) {
          setIsOpen(forceExpand);
      }
  }, [forceExpand]);

  const t = {
    competing: lang === 'es' ? 'URLs compitiendo' : 'URLs competing',
    imp: lang === 'es' ? 'Impr.' : 'Impr.',
    clicks: lang === 'es' ? 'Clics' : 'Clicks',
    pos: lang === 'es' ? 'Pos' : 'Pos',
    ctr: 'CTR',
    lost: lang === 'es' ? 'Clics Pot. Perdidos' : 'Lost Potential Clicks',
    analyzeBtn: lang === 'es' ? 'Analizar' : 'Analyze',
    deleteBtn: lang === 'es' ? 'Eliminar' : 'Delete',
    untagged: lang === 'es' ? 'Sin Analizar / Sin Etiqueta' : 'Unanalyzed / Untagged',
    analysisTitle: lang === 'es' ? 'Análisis' : 'Analysis',
    marketAnalysisTitle: lang === 'es' ? 'Análisis de Intención / Mercado' : 'Intent / Market Analysis',
    editReasonPlaceholder: lang === 'es' ? 'Editar razonamiento...' : 'Edit reasoning...'
  };

  const fmt = (n: number) => new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US').format(Math.round(n));
  const fmtDec = (n: number) => n.toFixed(1);
  const fmtCtr = (n: number) => n.toFixed(2) + '%';

  const handleReasonChange = (newReason: string) => {
      onUpdate({ ...group, aiReasoning: newReason });
  };

  // Group URLs by their AI tag
  const groupedUrls = React.useMemo(() => {
      const map = new Map<string, AggregatedUrlData[]>();
      const untagged: AggregatedUrlData[] = [];

      group.urls.forEach(u => {
          if (u.aiTag) {
              if (!map.has(u.aiTag)) map.set(u.aiTag, []);
              map.get(u.aiTag)?.push(u);
          } else {
              untagged.push(u);
          }
      });

      return { map, untagged };
  }, [group.urls]);

  // Calculate all tags present in the group
  const allTagCounts = useMemo(() => {
      const counts = new Map<string, number>();
      group.urls.forEach(u => {
          if (u.aiTag) {
              counts.set(u.aiTag, (counts.get(u.aiTag) || 0) + 1);
          }
      });
      return Array.from(counts.entries());
  }, [group.urls]);

  // Determine if the group has been analyzed (has tags)
  const hasTags = allTagCounts.length > 0;

  // Filter tags for display in the summary (exclude Winner/Ganadora)
  const summaryBadges = useMemo(() => {
      return allTagCounts.filter(([tag]) => {
           const tLower = tag.toLowerCase();
           return !tLower.includes('winner') && !tLower.includes('ganadora');
      });
  }, [allTagCounts]);

  // Check if we have badges to display in the collapsed view
  const hasDisplayBadges = summaryBadges.length > 0;

  return (
    <div className={`border rounded-lg bg-white shadow-sm overflow-hidden transition-all duration-200 ${isOpen ? 'ring-1 ring-indigo-200 border-indigo-300' : 'border-gray-200 hover:shadow-md'} print:break-inside-avoid`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer bg-white hover:bg-slate-50 transition-colors gap-4 sm:gap-0"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-slate-800 mr-2" title={group.query}>
                {group.query}
              </h3>
              
              {hasDisplayBadges && summaryBadges.map(([tag, count]) => {
                   const tLower = tag.toLowerCase();
                   let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                   if (tLower.includes('winner') || tLower.includes('ganadora')) badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                   else if (tLower.includes('redirect') || tLower.includes('redirec')) badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                   else if (tLower.includes('merge') || tLower.includes('fusion')) badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                   else if (tLower.includes('mixed') || tLower.includes('mixto') || tLower.includes('mantener') || tLower.includes('keep')) badgeClass = 'bg-violet-50 text-violet-700 border-violet-200';
                   
                   return (
                       <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wide ${badgeClass}`}>
                           {count > 1 ? `${count}x ` : ''}{tag}
                       </span>
                   )
              })}
          </div>
          
          <div className="text-xs text-slate-500 flex items-center flex-wrap gap-2">
            <span className="font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
              {group.uniqueUrlCount}
            </span> 
            <span className="mr-2">{t.competing}</span>

            {group.lostClicksEstimate > 0 && (
                 <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center">
                    ~{fmt(group.lostClicksEstimate)} {t.lost}
                 </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-3 sm:gap-5">
          <div className="text-right w-14 sm:w-16">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 tracking-wide">{t.imp}</div>
            <div className="text-slate-700 font-bold text-sm">{fmt(group.totalImpressions)}</div>
          </div>
          <div className="text-right w-12 sm:w-14">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 tracking-wide">{t.clicks}</div>
            <div className="text-slate-700 font-bold text-sm">{fmt(group.totalClicks)}</div>
          </div>
          <div className="text-right w-12 sm:w-14">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 tracking-wide">{t.ctr}</div>
            <div className="text-slate-700 font-semibold text-sm">{fmtCtr(group.avgCtr)}</div>
          </div>
          <div className="text-right w-12 sm:w-14">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 tracking-wide">{t.pos}</div>
            <div className={`font-bold px-2 py-0.5 rounded inline-block text-sm ${group.weightedAvgPosition < 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
              {fmtDec(group.weightedAvgPosition)}
            </div>
          </div>
          
          <div className="flex items-center gap-2 print:hidden pl-2 border-l border-gray-100">
              {!hasTags && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
                    className="p-1.5 rounded-full hover:bg-indigo-100 text-indigo-600 transition-colors disabled:opacity-50"
                    title={t.analyzeBtn}
                    disabled={isAnalyzing}
                  >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  </button>
              )}
               <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                    title={t.deleteBtn}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
              <div className="text-slate-400 pl-1">
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="bg-slate-50/50 border-t border-gray-100 p-4 animate-in slide-in-from-top-2 duration-200">
          
          {/* Market Analysis (New) */}
          {group.marketAnalysis && (
              <div className="mb-4 p-3 bg-violet-50 border border-violet-100 rounded-lg text-xs text-slate-700 flex items-start gap-3 shadow-sm">
                  <Microscope className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  <div className="w-full">
                      <span className="font-bold block mb-1 text-violet-900 uppercase tracking-wide text-[10px]">{t.marketAnalysisTitle}</span>
                      <p className="whitespace-pre-wrap leading-relaxed">{group.marketAnalysis}</p>
                  </div>
              </div>
          )}

          {/* Legacy Reasoning or Editor */}
          {(group.aiReasoning || isEditorMode) && (
             <div className="mb-4 p-3 bg-white border border-indigo-100 rounded-lg text-xs text-slate-700 flex items-start gap-3 shadow-sm">
                <Wand2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="w-full">
                    <span className="font-bold block mb-1 text-indigo-900 uppercase tracking-wide text-[10px]">{t.analysisTitle}</span>
                    {isEditorMode ? (
                        <textarea 
                            value={group.aiReasoning || ''} 
                            onChange={(e) => handleReasonChange(e.target.value)}
                            className="w-full p-2 rounded border border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 min-h-[60px]"
                            onClick={(e) => e.stopPropagation()}
                            placeholder={t.editReasonPlaceholder}
                        />
                    ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{group.aiReasoning}</p>
                    )}
                </div>
             </div>
          )}

          <div className="space-y-4">
              {/* Render Tagged Groups */}
              {Array.from(groupedUrls.map.entries()).map(([tag, urls]) => (
                  <TagGroup 
                    key={tag} 
                    tag={tag} 
                    urls={urls} 
                    lang={lang} 
                    fmt={fmt} 
                    fmtCtr={fmtCtr} 
                    fmtDec={fmtDec} 
                    isEditorMode={isEditorMode}
                    onUpdateUrlTag={onUpdateUrlTag}
                  />
              ))}

              {/* Render Untagged URLs */}
              {groupedUrls.untagged.length > 0 && (
                  <TagGroup 
                    tag={t.untagged} 
                    urls={groupedUrls.untagged} 
                    lang={lang} 
                    fmt={fmt} 
                    fmtCtr={fmtCtr} 
                    fmtDec={fmtDec} 
                    isEditorMode={isEditorMode}
                    onUpdateUrlTag={onUpdateUrlTag}
                  />
              )}
          </div>
        </div>
      )}
    </div>
  );
});

export default KeywordRow;
