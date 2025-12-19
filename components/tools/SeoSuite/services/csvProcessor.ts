
import { GscRow, CannibalizationGroup, AggregatedUrlData, CountryStat, ComparisonRow, PeriodStats, GlobalSiteStats, UrlBreakdownEntry } from '../types';

// --- HELPER FUNCTIONS ---

const MONTH_MAP: Record<string, number> = {
    'ene': 0, 'jan': 0,
    'feb': 1,
    'mar': 2,
    'abr': 3, 'apr': 3,
    'may': 4,
    'jun': 5,
    'jul': 6,
    'ago': 7, 'aug': 7,
    'sep': 8, 'set': 8,
    'oct': 9,
    'nov': 10,
    'dic': 11, 'dec': 11
};

// Robust Date Parser
const parseSmartDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    const clean = dateStr.trim().toLowerCase();
    
    // Quick check for standard ISO/format
    const simpleDate = new Date(clean);
    if (!isNaN(simpleDate.getTime()) && clean.includes('-')) return simpleDate;

    // Fallback for custom formats
    const parts = clean.split(/[\s/-]+/);
    
    if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let monthStr = parts[1];
        let year = parseInt(parts[2]);

        if (parts[0].length === 4) {
            year = parseInt(parts[0]);
            monthStr = parts[1];
            day = parseInt(parts[2]);
        }

        let month = -1;
        if (!isNaN(parseInt(monthStr))) {
            month = parseInt(monthStr) - 1;
        } else {
            const sub = monthStr.substring(0, 3);
            if (MONTH_MAP[sub] !== undefined) {
                month = MONTH_MAP[sub];
            }
        }

        if (year > 1900 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            return new Date(year, month, day);
        }
    }

    return undefined;
};

// Helper to parse numbers, returning null if empty/invalid, but preserving 0
const parseNumberOrNull = (val: string): number | null => {
    if (!val) return null;
    // Optimization: Check most common case first (simple number)
    const fastNum = parseFloat(val);
    if (!isNaN(fastNum) && val.indexOf(',') === -1 && val.indexOf('%') === -1) return fastNum;

    if (val.trim() === '') return null;
    let clean = val.trim();
    if (clean === '-' || clean.toLowerCase() === 'nan') return null;
    
    // Handle Percentage symbols
    clean = clean.replace(/\s?%/, '');

    // Handle European vs US format guessing
    const hasComma = clean.includes(',');
    const hasDot = clean.includes('.');

    if (hasComma && hasDot) {
        const lastDot = clean.lastIndexOf('.');
        const lastComma = clean.lastIndexOf(',');
        if (lastComma > lastDot) {
            // 1.000,50
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // 1,000.50
            clean = clean.replace(/,/g, '');
        }
    } else if (hasComma) {
         // Ambiguous: "45,5" vs "1,200". 
         // If comma is close to end (1 or 2 digits), assume decimal separator.
         const parts = clean.split(',');
         if (parts[parts.length - 1].length < 3) {
             clean = clean.replace(',', '.');
         } else {
             clean = clean.replace(/,/g, '');
         }
    }

    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
};

const parseTimeOrNull = (val: string): number | null => {
    if (!val || val.trim() === '') return null;
    const clean = val.trim();
    
    if (clean.includes(':')) {
        const parts = clean.split(':').map(p => parseFloat(p));
        if (parts.some(isNaN)) return null;
        
        if (parts.length === 3) {
            return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        } else if (parts.length === 2) {
            return (parts[0] * 60) + parts[1];
        }
    }
    
    return parseNumberOrNull(clean);
};

// Robust URL Normalizer for matching
// CRITICAL CHANGE: Removes #fragments to aggregate metrics for the same page
const normalizeUrl = (url: string): string => {
    if (!url) return '';
    let u = url.trim().toLowerCase();
    
    // Remove Fragment/Hash first (Aggregation Logic)
    if (u.includes('#')) {
        u = u.split('#')[0];
    }
    
    // Ensure protocol
    if (!u.startsWith('http')) {
        if (u.startsWith('/')) {
             u = 'https://' + u; 
        } else {
             u = 'https://' + u;
        }
    }
    
    // Remove www. for looser matching
    u = u.replace('://www.', '://');
    
    // Remove trailing slash
    if (u.endsWith('/')) u = u.slice(0, -1);
    
    return u;
};


// --- FILE PROCESSING ---

export const processUploadedFiles = async (files: File[]): Promise<string> => {
    if (files.length === 0) throw new Error("No files provided");

    const readFile = (f: File): Promise<{name: string, content: string}> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ name: f.name, content: e.target?.result as string });
            reader.onerror = reject;
            reader.readAsText(f);
        });
    };

    const contents = await Promise.all(files.map(readFile));
    
    let gscData: GscRow[] = [];
    
    // Map stores simple accumulated stats
    // Key: "normalized_url|date"
    let gaMap = new Map<string, { bounceSum: number, bounceCount: number, durSum: number, durCount: number }>();

    for (const file of contents) {
        const lower = file.content.toLowerCase().slice(0, 1000);
        
        if (lower.includes('query') || lower.includes('consulta') || lower.includes('palabra clave') || lower.includes('keywords')) {
            const rows = parseRawCsvToRows(file.content);
            gscData = gscData.concat(rows);
        } 
        else if (lower.includes('rebote') || lower.includes('bounce') || lower.includes('duración') || lower.includes('duration') || lower.includes('time') || lower.includes('tiempo')) {
            // This seems to be the GA file
            const gaRows = parseRawCsvToRows(file.content);
            
            gaRows.forEach(row => {
                const url = normalizeUrl(row.landingPage);
                // Use 'no-date' if date is missing, otherwise use date string
                const dateKey = row.date ? row.date.toISOString().split('T')[0] : 'no-date';
                const key = `${url}|${dateKey}`;
                
                const entry = gaMap.get(key) || { bounceSum: 0, bounceCount: 0, durSum: 0, durCount: 0 };

                // Aggregate. IMPORTANT: Includes 0 values.
                if (row.bounceRate !== null && row.bounceRate !== undefined) {
                    entry.bounceSum += row.bounceRate;
                    entry.bounceCount += 1;
                }
                
                if (row.avgSessionDuration !== null && row.avgSessionDuration !== undefined) {
                    entry.durSum += row.avgSessionDuration;
                    entry.durCount += 1;
                }

                gaMap.set(key, entry);
            });
        }
    }

    // Heuristic: Check max bounce in GA Map to determine scale (0-1 or 0-100)
    let maxBounce = 0;
    for (const val of gaMap.values()) {
        if (val.bounceCount > 0) {
            const avg = val.bounceSum / val.bounceCount;
            if (avg > maxBounce) maxBounce = avg;
        }
    }
    const needsScale = maxBounce <= 1.0 && maxBounce > 0;

    const header = "Landing Page,Query,Date,Country,Clicks,Impressions,Position,Bounce Rate,Session Duration\n";
    
    const body = gscData.map(row => {
        const url = normalizeUrl(row.landingPage);
        const dateKey = row.date ? row.date.toISOString().split('T')[0] : 'no-date';
        
        // 1. Try Exact Match (URL + Date)
        let key = `${url}|${dateKey}`;
        let gaEntry = gaMap.get(key);
        
        // 2. If not found, Try Aggregate Match (URL + 'no-date') - Fallback
        if (!gaEntry) {
            gaEntry = gaMap.get(`${url}|no-date`);
        }
        
        let finalBounce = '';
        let finalDuration = '';

        if (gaEntry && gaEntry.bounceCount > 0) {
            let avg = gaEntry.bounceSum / gaEntry.bounceCount;
            if (needsScale) avg = avg * 100; // Normalize to 0-100 scale
            finalBounce = avg.toString();
        }

        if (gaEntry && gaEntry.durCount > 0) {
            finalDuration = (gaEntry.durSum / gaEntry.durCount).toString();
        }
        
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        
        return [
            esc(row.landingPage), // Keep original string in CSV output but joined logic uses normalized
            esc(row.query),
            row.date ? row.date.toISOString().split('T')[0] : '', 
            esc(row.country),
            row.clicks,
            row.impressions,
            row.position,
            finalBounce,
            finalDuration
        ].join(',');
    }).join('\n');

    return header + body;
};

// OPTIMIZATION: Replaced split/map chain with a more efficient loop
const parseRawCsvToRows = (text: string): GscRow[] => {
    // Find header line
    const firstLineEnd = text.indexOf('\n');
    if (firstLineEnd === -1) return [];

    const header = text.substring(0, firstLineEnd).toLowerCase();
    const sep = header.includes(';') ? ';' : ','; 
    const cols = header.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));

    const idxPage = cols.findIndex(c => c.includes('page') || c.includes('página') || c.includes('url'));
    const idxQuery = cols.findIndex(c => c.includes('query') || c.includes('keyword') || c.includes('consulta'));
    const idxDate = cols.findIndex(c => c.includes('date') || c.includes('fecha'));
    const idxCountry = cols.findIndex(c => c.includes('country') || c.includes('país') || c.includes('pais'));
    
    // GSC Metrics
    const idxClicks = cols.findIndex(c => c.includes('click') || c.includes('clic'));
    const idxImp = cols.findIndex(c => c.includes('impression') || c.includes('impresion'));
    const idxPos = cols.findIndex(c => c.includes('position') || c.includes('posic'));
    
    // GA Metrics
    const idxBounce = cols.findIndex(c => c.includes('bounce') || c.includes('rebote'));
    const idxDur = cols.findIndex(c => 
        c.includes('duration') || 
        c.includes('duración') || 
        c.includes('tiempo') || 
        c.includes('time') ||
        c.includes('media') || 
        c.includes('avg')
    );

    const results: GscRow[] = [];
    
    let startIndex = firstLineEnd + 1;
    const len = text.length;

    while (startIndex < len) {
        let endIndex = text.indexOf('\n', startIndex);
        if (endIndex === -1) endIndex = len;
        
        // Skip empty lines
        if (startIndex === endIndex) {
            startIndex++;
            continue;
        }

        const line = text.substring(startIndex, endIndex).trim();
        startIndex = endIndex + 1;

        if (line.length === 0) continue;

        // Optimized split that respects quotes loosely
        // Note: For extreme performance on huge files, a true parser state machine is better,
        // but this regex split is generally acceptable for standard GSC exports.
        const regex = sep === ',' ? /,(?=(?:(?:[^"]*"){2})*[^"]*$)/ : /;(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        const row = line.split(regex).map(cell => cell.replace(/^"|"$/g, '').trim());

        if (!row[idxPage]) continue;

        const date = idxDate > -1 ? parseSmartDate(row[idxDate]) : undefined;
        
        const clicks = idxClicks > -1 ? (parseNumberOrNull(row[idxClicks]) || 0) : 0;
        const impressions = idxImp > -1 ? (parseNumberOrNull(row[idxImp]) || 0) : 0;
        const position = idxPos > -1 ? (parseNumberOrNull(row[idxPos]) || 0) : 0;
        
        const bounceRate = idxBounce > -1 ? parseNumberOrNull(row[idxBounce]) : null;
        const avgSessionDuration = idxDur > -1 ? parseTimeOrNull(row[idxDur]) : null;

        results.push({
            landingPage: row[idxPage],
            query: idxQuery > -1 ? row[idxQuery] : '',
            country: idxCountry > -1 ? row[idxCountry] : 'Global',
            date: date,
            clicks,
            impressions,
            position,
            bounceRate,
            avgSessionDuration
        });
    }

    return results;
};

export const parseCSV = (csvText: string): GscRow[] => {
    return parseRawCsvToRows(csvText);
};

// --- LOGIC: Comparison & Stats ---

export const processComparisonData = (rows: GscRow[]): { comparisonRows: ComparisonRow[], globalStats: GlobalSiteStats } => {
    const dates = rows.filter(r => r.date).map(r => r.date!.getTime());
    
    let minTs = dates.length > 0 ? dates[0] : Date.now();
    let maxTs = dates.length > 0 ? dates[0] : Date.now();

    if (dates.length > 0) {
        minTs = dates.reduce((min, cur) => Math.min(min, cur), dates[0]);
        maxTs = dates.reduce((max, cur) => Math.max(max, cur), dates[0]);
    }
    
    const minDate = new Date(minTs);
    const maxDate = new Date(maxTs);
    const midPoint = minTs + (maxTs - minTs) / 2;

    const queryMap = new Map<string, Map<string, { 
        periodA: PeriodStats & { weightSum: number, validBounceCount: number, validTimeCount: number }, 
        periodB: PeriodStats & { weightSum: number, validBounceCount: number, validTimeCount: number } 
    }>>();

    const countryMap = new Map<string, Map<string, number>>(); 

    const createStats = () => ({ 
        clicks: 0, impressions: 0, ctr: 0, position: 0, 
        bounceRate: 0, sessionDuration: 0, 
        weightSum: 0, validBounceCount: 0, validTimeCount: 0 
    });

    rows.forEach(row => {
        const queryKey = row.query.toLowerCase().trim();
        if (!queryKey) return;

        // Normalize URL here using the new logic (strips #)
        const urlKey = normalizeUrl(row.landingPage);

        if (!queryMap.has(queryKey)) {
            queryMap.set(queryKey, new Map());
            countryMap.set(queryKey, new Map());
        }
        const urlMap = queryMap.get(queryKey)!;
        const cMap = countryMap.get(queryKey)!;

        const currentCountryImp = cMap.get(row.country) || 0;
        cMap.set(row.country, currentCountryImp + row.impressions);

        if (!urlMap.has(urlKey)) {
            urlMap.set(urlKey, { periodA: createStats(), periodB: createStats() });
        }
        const entry = urlMap.get(urlKey)!;

        const isPeriodA = row.date && row.date.getTime() < midPoint;
        const target = isPeriodA ? entry.periodA : entry.periodB;

        target.clicks += row.clicks;
        target.impressions += row.impressions;
        target.position += (row.position * row.impressions);
        
        if (row.bounceRate !== null && row.bounceRate !== undefined) {
            target.bounceRate! += row.bounceRate;
            target.validBounceCount += 1;
        }
        
        if (row.avgSessionDuration !== null && row.avgSessionDuration !== undefined) {
            if (row.avgSessionDuration > 0) {
                target.sessionDuration! += row.avgSessionDuration;
                target.validTimeCount += 1;
            }
        }
    });

    const finalRows: ComparisonRow[] = [];
    const allImps: number[] = [];
    const allCtrs: number[] = [];
    let totalClicks = 0;
    let totalImp = 0;
    let totalPosWeight = 0;

    queryMap.forEach((urlMap, queryKey) => {
        const breakdown: UrlBreakdownEntry[] = [];
        
        const cMap = countryMap.get(queryKey)!;
        let dominantCountry = 'Global';
        let maxCountryImp = -1;
        cMap.forEach((imp, country) => {
            if (imp > maxCountryImp) {
                maxCountryImp = imp;
                dominantCountry = country;
            }
        });

        let qA_Clicks = 0, qA_Imp = 0, qA_PosWeight = 0;
        let qA_BounceSum = 0, qA_BounceCount = 0, qA_DurSum = 0, qA_DurCount = 0;
        
        let qB_Clicks = 0, qB_Imp = 0, qB_PosWeight = 0;
        let qB_BounceSum = 0, qB_BounceCount = 0, qB_DurSum = 0, qB_DurCount = 0;

        urlMap.forEach((stats, url) => {
            const finalize = (s: typeof stats.periodA) => {
                const finalPos = s.impressions > 0 ? s.position / s.impressions : 0;
                const finalCtr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0;
                
                const finalBounce = s.validBounceCount > 0 ? s.bounceRate! / s.validBounceCount : 0;
                const finalDur = s.validTimeCount > 0 ? s.sessionDuration! / s.validTimeCount : 0;
                
                return { ...s, position: finalPos, ctr: finalCtr, bounceRate: finalBounce, sessionDuration: finalDur };
            };

            const finalA = finalize(stats.periodA);
            const finalB = finalize(stats.periodB);

            const diffBounce = (finalB.bounceRate || 0) - (finalA.bounceRate || 0);
            const diffTime = (finalB.sessionDuration || 0) - (finalA.sessionDuration || 0);

            breakdown.push({ url, periodA: finalA, periodB: finalB, diffBounce, diffTime });

            qA_Clicks += finalA.clicks;
            qA_Imp += finalA.impressions;
            qA_PosWeight += (finalA.position * finalA.impressions);
            
            qA_BounceSum += stats.periodA.bounceRate!;
            qA_BounceCount += stats.periodA.validBounceCount;
            qA_DurSum += stats.periodA.sessionDuration!;
            qA_DurCount += stats.periodA.validTimeCount;

            qB_Clicks += finalB.clicks;
            qB_Imp += finalB.impressions;
            qB_PosWeight += (finalB.position * finalB.impressions);
            
            qB_BounceSum += stats.periodB.bounceRate!;
            qB_BounceCount += stats.periodB.validBounceCount;
            qB_DurSum += stats.periodB.sessionDuration!;
            qB_DurCount += stats.periodB.validTimeCount;
        });

        breakdown.sort((a, b) => b.periodB.impressions - a.periodB.impressions);

        const pA: PeriodStats = {
            clicks: qA_Clicks,
            impressions: qA_Imp,
            ctr: qA_Imp > 0 ? (qA_Clicks / qA_Imp) * 100 : 0,
            position: qA_Imp > 0 ? qA_PosWeight / qA_Imp : 0,
            bounceRate: qA_BounceCount > 0 ? qA_BounceSum / qA_BounceCount : 0,
            sessionDuration: qA_DurCount > 0 ? qA_DurSum / qA_DurCount : 0
        };

        const pB: PeriodStats = {
            clicks: qB_Clicks,
            impressions: qB_Imp,
            ctr: qB_Imp > 0 ? (qB_Clicks / qB_Imp) * 100 : 0,
            position: qB_Imp > 0 ? qB_PosWeight / qB_Imp : 0,
            bounceRate: qB_BounceCount > 0 ? qB_BounceSum / qB_BounceCount : 0,
            sessionDuration: qB_DurCount > 0 ? qB_DurSum / qB_DurCount : 0
        };

        const diffBounce = (pB.bounceRate || 0) - (pA.bounceRate || 0);
        const diffTime = (pB.sessionDuration || 0) - (pA.sessionDuration || 0);

        if (pB.impressions > 0) {
            totalClicks += pB.clicks;
            totalImp += pB.impressions;
            totalPosWeight += (pB.position * pB.impressions);
            allImps.push(pB.impressions);
            allCtrs.push(pB.ctr);
        }

        finalRows.push({
            query: queryKey,
            urlBreakdown: breakdown,
            periodA: pA,
            periodB: pB,
            diffClicks: pB.clicks - pA.clicks,
            diffImp: pB.impressions - pA.impressions,
            diffPos: pB.position - pA.position,
            diffBounce: diffBounce,
            diffTime: diffTime,
            isNew: pA.impressions === 0 && pB.impressions > 0,
            isLost: pA.impressions > 0 && pB.impressions === 0,
            dominantCountry 
        });
    });

    allImps.sort((a,b) => a-b);
    allCtrs.sort((a,b) => a-b);
    
    const impThreshold = allImps[Math.floor(allImps.length * 0.7)] || 0;
    const ctrThreshold = allCtrs[Math.floor(allCtrs.length * 0.7)] || 0;
    const avgPos = totalImp > 0 ? totalPosWeight / totalImp : 0;
    const avgCtr = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0;

    return {
        comparisonRows: finalRows,
        globalStats: {
            avgCtr,
            avgPosition: avgPos,
            impressionThreshold: impThreshold,
            ctrThreshold,
            periodAStart: minDate,
            periodAEnd: new Date(midPoint),
            periodBStart: new Date(midPoint),
            periodBEnd: maxDate
        }
    };
};

export const detectCannibalization = (rows: GscRow[]): CannibalizationGroup[] => {
  const queryMap = new Map<string, GscRow[]>();
  rows.forEach(row => {
    const normalizedQuery = row.query.toLowerCase().trim();
    if (!normalizedQuery) return;
    if (!queryMap.has(normalizedQuery)) queryMap.set(normalizedQuery, []);
    queryMap.get(normalizedQuery)?.push(row);
  });

  const cannibalizationGroups: CannibalizationGroup[] = [];

  queryMap.forEach((queryRows, queryKey) => {
    // Determine dominant country for this cannibalization group
    const cCount = new Map<string, number>();
    queryRows.forEach(r => cCount.set(r.country, (cCount.get(r.country) || 0) + r.impressions));
    let dominantCountry = 'Global';
    let maxCImp = -1;
    cCount.forEach((imp, c) => { if(imp > maxCImp) { maxCImp = imp; dominantCountry = c; } });

    const urlMap = new Map<string, { 
      clicks: number; 
      impressions: number; 
      weightedPosSum: number;
      countriesData: Map<string, { clicks: number; impressions: number; weightedPosSum: number; }> 
    }>();

    const displayQuery = queryRows[0].query; 

    queryRows.forEach(r => {
      // Normalize URL (this aggregates #fragments)
      const urlKey = normalizeUrl(r.landingPage);

      if (!urlMap.has(urlKey)) {
        urlMap.set(urlKey, { clicks: 0, impressions: 0, weightedPosSum: 0, countriesData: new Map() });
      }
      const entry = urlMap.get(urlKey)!;
      
      entry.clicks += r.clicks;
      entry.impressions += r.impressions;
      entry.weightedPosSum += (r.position * r.impressions);

      if (!entry.countriesData.has(r.country)) {
        entry.countriesData.set(r.country, { clicks: 0, impressions: 0, weightedPosSum: 0 });
      }
      const countryEntry = entry.countriesData.get(r.country)!;
      countryEntry.clicks += r.clicks;
      countryEntry.impressions += r.impressions;
      countryEntry.weightedPosSum += (r.position * r.impressions);
    });

    if (urlMap.size > 1) {
      const aggregatedUrls: AggregatedUrlData[] = [];
      let totalQueryClicks = 0;
      let totalQueryImpressions = 0;
      let totalWeightedPos = 0;

      urlMap.forEach((stats, urlKey) => {
        // We use the normalized urlKey as the displayUrl
        const displayUrl = urlKey; 

        const avgPos = stats.impressions > 0 ? stats.weightedPosSum / stats.impressions : 0;
        const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
        
        const countryStats: CountryStat[] = [];
        stats.countriesData.forEach((cStats, countryName) => {
            countryStats.push({
                country: countryName,
                clicks: cStats.clicks,
                impressions: cStats.impressions,
                position: cStats.impressions > 0 ? cStats.weightedPosSum / cStats.impressions : 0,
                ctr: cStats.impressions > 0 ? (cStats.clicks / cStats.impressions) * 100 : 0
            });
        });

        aggregatedUrls.push({
          url: displayUrl,
          clicks: stats.clicks,
          impressions: stats.impressions,
          position: avgPos,
          ctr: ctr,
          countryStats: countryStats.sort((a, b) => b.impressions - a.impressions)
        });

        totalQueryClicks += stats.clicks;
        totalQueryImpressions += stats.impressions;
        totalWeightedPos += stats.weightedPosSum;
      });

      const overallAvgPos = totalQueryImpressions > 0 ? totalWeightedPos / totalQueryImpressions : 0;
      const overallCtr = totalQueryImpressions > 0 ? (totalQueryClicks / totalQueryImpressions) * 100 : 0;

      const volumeThreshold = Math.max(50, totalQueryImpressions * 0.20);
      let benchmarkCtr = 0;
      aggregatedUrls.forEach(urlData => {
        if (urlData.impressions > volumeThreshold) {
            if (urlData.ctr > benchmarkCtr) benchmarkCtr = urlData.ctr;
        }
      });
      if (benchmarkCtr === 0 && aggregatedUrls.length > 0) {
          const highestVolumeUrl = aggregatedUrls.reduce((prev, current) => (prev.impressions > current.impressions) ? prev : current);
          benchmarkCtr = highestVolumeUrl.ctr; 
      }
      const potentialClicks = Math.floor(totalQueryImpressions * (benchmarkCtr / 100));
      const lostClicksEstimate = Math.max(0, potentialClicks - totalQueryClicks);

      cannibalizationGroups.push({
        query: displayQuery,
        urls: aggregatedUrls.sort((a, b) => b.impressions - a.impressions),
        uniqueUrlCount: urlMap.size,
        totalClicks: totalQueryClicks,
        totalImpressions: totalQueryImpressions,
        avgCtr: overallCtr,
        weightedAvgPosition: overallAvgPos,
        lostClicksEstimate,
        dominantCountry
      });
    }
  });

  return cannibalizationGroups.sort((a, b) => b.totalImpressions - a.totalImpressions);
};
