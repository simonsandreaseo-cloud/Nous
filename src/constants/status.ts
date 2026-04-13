export const STATUS_LABELS: Record<string, string> = {
    'idea': 'Idea',
    'en_investigacion': 'Investigando',
    'por_redactar': 'Por Redactar',
    'en_redaccion': 'En Redacción',
    'por_corregir': 'Por Corregir',
    'por_maquetar': 'Por Maquetar',
    'publicado': 'Publicado'
};

export const STATUS_COLORS: Record<string, { bg: string, text: string, border: string, dot: string }> = {
    'idea': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', dot: 'bg-slate-400' },
    'en_investigacion': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', dot: 'bg-violet-500' },
    'por_redactar': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-500' },
    'en_redaccion': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', dot: 'bg-indigo-500' },
    'por_corregir': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', dot: 'bg-rose-500' },
    'por_maquetar': { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100', dot: 'bg-sky-500' },
    'publicado': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500' }
};

export type TaskStatus = keyof typeof STATUS_LABELS;
