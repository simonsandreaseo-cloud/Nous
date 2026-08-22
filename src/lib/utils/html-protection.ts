export interface ProtectionResult {
  blindedHtml: string;
  map: Map<string, string>;
}

export const HtmlProtectionService = {
  /**
   * Replaces HTML tables, styled/callout divs, and blockquotes with atomic tokens 
   * to prevent them from being split during chunking or corrupted by AI processing.
   */
  protect: (html: string): ProtectionResult => {
    const map = new Map<string, string>();
    let counter = 0;
    
    // Regex to match <table>...</table> including attributes
    const tableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
    // Regex to match styled callout divs (divs with class or style attributes)
    const calloutDivRegex = /<div\s+(?:class|style)=["'][^"']*["'][^>]*>[\s\S]*?<\/div>/gi;
    // Regex to match blockquotes
    const blockquoteRegex = /<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi;
    
    let blindedHtml = html
      .replace(tableRegex, (match) => {
        const token = `[[ATOMIC_BLOCK_${counter++}]]`;
        map.set(token, match);
        return token;
      })
      .replace(calloutDivRegex, (match) => {
        const token = `[[ATOMIC_BLOCK_${counter++}]]`;
        map.set(token, match);
        return token;
      })
      .replace(blockquoteRegex, (match) => {
        const token = `[[ATOMIC_BLOCK_${counter++}]]`;
        map.set(token, match);
        return token;
      });
    
    return { blindedHtml, map };
  },

  /**
   * Restores the original HTML tables from their atomic tokens.
   */
  restore: (blindedHtml: string, map: Map<string, string>): string => {
    let restoredHtml = blindedHtml;
    
    // Replace tokens in reverse order of their index to avoid potential overlap issues
    // although with [[ATOMIC_BLOCK_N]] it's not strictly necessary.
    const tokens = Array.from(map.keys()).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numB - numA;
    });

    for (const token of tokens) {
      const original = map.get(token);
      if (original) {
        // Use split/join for global replacement of the token
        restoredHtml = restoredHtml.split(token).join(original);
      }
    }
    
    return restoredHtml;
  },
};

/**
 * Splits HTML into chunks of approximately maxChars, 
 * ensuring elements (and protected tokens) are not split.
 */
export function sizeAwareChunkHtml(html: string, maxChars: number): string[] {
  if (!html) return [];
  
  // Boundary regex: split before common block-level elements or protected tokens
  const boundaryRegex = /(?=<h[1-6]\b[^>]*>|<p\b[^>]*>|<ul\b[^>]*>|<ol\b[^>]*>|<li\b[^>]*>|<div\b[^>]*>|<table\b[^>]*>|<blockquote\b[^>]*>|\[\[ATOMIC_BLOCK_\d+\]\])/gi;
  
  const blocks = html.split(boundaryRegex).filter(block => block.length > 0);
  const chunks: string[] = [];
  let currentChunk: string = "";
  
  for (const block of blocks) {
    // If a single block is larger than maxChars, it still stays as one block 
    // to avoid splitting tags/tokens.
    if (currentChunk.length + block.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
    
    currentChunk += block;
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}
