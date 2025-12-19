
import React from 'react';
import { AnalysisModule, Language, ModuleId } from '../types';
import { Ghost, TrendingDown, ArrowDownRight, AlertTriangle, Eraser, Target, Sparkles, MousePointerClick, ScanSearch, Blocks, ClipboardList } from 'lucide-react';

interface ModuleSelectorProps {
    onSelect: (id: ModuleId | 'GLOBAL_TASKS') => void;
    lang: Language;
}

export const MODULES: AnalysisModule[] = [
    {
        id: 'CANNIBALIZATION',
        type: 'NEUTRAL',
        icon: ScanSearch,
        title: { es: 'Canibalización SEO', en: 'SEO Cannibalization' },
        description: { 
            es: 'Detecta múltiples URLs compitiendo por la misma keyword.', 
            en: 'Detect multiple URLs competing for the same keyword.' 
        }
    },
    {
        id: 'KEYWORD_CLUSTERS',
        type: 'NEUTRAL',
        icon: Blocks,
        title: { es: 'Clustering Semántico', en: 'Keyword Clustering' },
        description: { 
            es: 'Agrupa palabras clave por intención de búsqueda usando IA para detectar oportunidades de contenido.', 
            en: 'Group keywords by search intent using AI to detect content opportunities.' 
        }
    },
    {
        id: 'GHOST_KEYWORDS',
        type: 'PROBLEM',
        icon: Ghost,
        title: { es: 'Keywords Fantasma', en: 'Ghost Keywords' },
        description: { 
            es: 'Top 10 en Posición con muchas impresiones pero 0 clics. Tu snippet no es atractivo o la intención es errónea.', 
            en: 'Top 10 rankings with high impressions but 0 clicks. Your snippet is unappealing or intent is wrong.' 
        }
    },
    {
        id: 'SEO_DECAY',
        type: 'PROBLEM',
        icon: TrendingDown,
        title: { es: 'Decaimiento (Decay)', en: 'Keyword Decay' },
        description: { 
            es: 'Palabras clave que han perdido >5 posiciones respecto al periodo anterior.', 
            en: 'Keywords that have lost >5 positions compared to previous period.' 
        }
    },
    {
        id: 'LOSERS_PAGE_1',
        type: 'PROBLEM',
        icon: ArrowDownRight,
        title: { es: 'Perdedores de Pág. 1', en: 'Losers of Page 1' },
        description: { 
            es: 'URLs que cayeron del Top 10 a la Página 2 (Pos 11+) en este periodo.', 
            en: 'URLs that fell from Top 10 rankings to Page 2 (Pos 11+) in this period.' 
        }
    },
    {
        id: 'CTR_RED_FLAGS',
        type: 'PROBLEM',
        icon: AlertTriangle,
        title: { es: 'Banderas Rojas CTR', en: 'CTR Red Flags' },
        description: { 
            es: 'Top 5 con CTR peligrosamente bajo (<2%). Revisa títulos y descripciones.', 
            en: 'Top 5 rankings with suspiciously low CTR (<2%). Check titles and meta descriptions.' 
        }
    },
    {
        id: 'LOST_KEYWORDS',
        type: 'PROBLEM',
        icon: Eraser,
        title: { es: 'Keywords Perdidas', en: 'Lost Keywords' },
        description: { 
            es: 'Tenían tráfico en el periodo anterior y ahora han desaparecido (0 impresiones).', 
            en: 'Had traffic previously but have now disappeared (0 impressions).' 
        }
    },
    {
        id: 'STRIKING_DISTANCE',
        type: 'OPPORTUNITY',
        icon: Target,
        title: { es: 'Distancia de Tiro', en: 'Striking Distance' },
        description: { 
            es: 'Oportunidades en Pos 11-30 con buen volumen. Fáciles de subir a Pág 1.', 
            en: 'Opportunities in Pos 11-30 with good volume. Easy wins to push to Page 1.' 
        }
    },
    {
        id: 'NEW_KEYWORDS',
        type: 'OPPORTUNITY',
        icon: Sparkles,
        title: { es: 'Nuevas Keywords', en: 'New Keywords' },
        description: { 
            es: 'Términos que no existían antes y han ganado tracción en el último periodo.', 
            en: 'Terms that did not exist before and have gained traction recently.' 
        }
    },
    {
        id: 'CTR_OPPORTUNITIES',
        type: 'OPPORTUNITY',
        icon: MousePointerClick,
        title: { es: 'Oportunidades CTR', en: 'CTR Opportunities' },
        description: { 
            es: 'Están en Página 2 pero tienen un CTR alto. El usuario las busca específicamente.', 
            en: 'Ranking on Page 2 but with unusually high CTR. Users are specifically looking for this.' 
        }
    }
];

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelect, lang }) => {
    
    const renderCard = (m: AnalysisModule) => {
        let borderClass = 'border-gray-200 hover:border-indigo-400';
        let bgClass = 'bg-white hover:bg-slate-50';
        let iconClass = 'text-slate-500';
        let badgeClass = 'bg-slate-100 text-slate-600';

        if (m.type === 'PROBLEM') {
            borderClass = 'border-gray-200 hover:border-rose-400';
            bgClass = 'bg-white hover:bg-rose-50/30';
            iconClass = 'text-rose-500';
            badgeClass = 'bg-rose-50 text-rose-700';
        } else if (m.type === 'OPPORTUNITY') {
            borderClass = 'border-gray-200 hover:border-emerald-400';
            bgClass = 'bg-white hover:bg-emerald-50/30';
            iconClass = 'text-emerald-600';
            badgeClass = 'bg-emerald-50 text-emerald-700';
        } else if (m.id === 'CANNIBALIZATION' || m.id === 'KEYWORD_CLUSTERS') {
            borderClass = 'border-indigo-200 hover:border-indigo-500 shadow-sm';
            bgClass = 'bg-indigo-50/30 hover:bg-indigo-50';
            iconClass = 'text-indigo-600';
            badgeClass = 'bg-indigo-100 text-indigo-700';
        }

        return (
            <button 
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`flex flex-col text-left p-5 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md ${borderClass} ${bgClass}`}
            >
                <div className="flex justify-between items-start w-full mb-3">
                    <div className={`p-2.5 rounded-lg bg-white shadow-sm border border-gray-100`}>
                        <m.icon className={`w-6 h-6 ${iconClass}`} />
                    </div>
                    {m.type !== 'NEUTRAL' && (
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${badgeClass}`}>
                            {m.type === 'PROBLEM' ? (lang === 'es' ? 'Problema' : 'Problem') : (lang === 'es' ? 'Oportunidad' : 'Opportunity')}
                        </span>
                    )}
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">{m.title[lang]}</h3>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{m.description[lang]}</p>
            </button>
        );
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in zoom-in-95 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="bg-slate-800 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs">1</span>
                {lang === 'es' ? 'Selecciona una herramienta' : 'Select a tool'}
            </h2>
            
            {/* Global Tasks Button */}
            <div className="mb-8">
                <button 
                    onClick={() => onSelect('GLOBAL_TASKS')}
                    className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl transition-all group"
                >
                    <div className="flex items-center gap-4 text-white">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <ClipboardList className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-bold">{lang === 'es' ? 'Ver Todas las Tareas' : 'View All Tasks'}</h3>
                            <p className="text-indigo-100 text-sm opacity-90">{lang === 'es' ? 'Panel unificado de acciones de todos los módulos.' : 'Unified action dashboard for all modules.'}</p>
                        </div>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                        <ArrowDownRight className="w-6 h-6 text-white -rotate-90" />
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULES.map(renderCard)}
            </div>
        </div>
    );
};

export default ModuleSelector;
