/**
 * Sanitiza dimensiones de Tiptap ("100%", "800px") a números puros para la UI.
 */
export function cleanDimension(val: string | number): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  const cleaned = val.replace(/[%px]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convierte un número de la UI a formato compatible con Tiptap.
 * Heurística: <= 100 -> %, > 100 -> px.
 */
export function toTiptapWidth(val: number | string): string {
  if (typeof val === 'string') {
    if (val.includes('%') || val.includes('px')) return val;
    val = parseFloat(val) || 0;
  }
  
  if (val <= 100) return `${val}%`;
  return `${val}px`;
}
