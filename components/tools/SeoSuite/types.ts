
export interface GscRow {
  landingPage: string;
  query: string;
  country: string;
  clicks: number;
  impressions: number;
  position: number;
  date?: Date; 
  bounceRate?: number | null; // Allow null for missing data
  avgSessionDuration?: number | null; // Allow null for missing data
}

export interface CountryStat {
  country: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

export interface AggregatedUrlData {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  countryStats: CountryStat[];
  aiTag?: string; 
}

export type AiActionCategory = 'WINNER' | 'REDIRECT' | 'MERGE' | 'DEOPTIMIZE' | 'NO_ACTION';

export interface CannibalizationGroup {
  query: string;
  urls: AggregatedUrlData[];
  uniqueUrlCount: number;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  weightedAvgPosition: number;
  lostClicksEstimate: number;
  winnerUrl?: string;
  aiReasoning?: string;
  marketAnalysis?: string; // New: Explanation of SERP Slots and Fit
  mainActionCategory?: AiActionCategory; 
  isExcluded?: boolean;
  dominantCountry: string; // New for Blue Paper
}

// --- NEW TYPES FOR PERIOD COMPARISON & MODULES ---

export interface PeriodStats {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  bounceRate?: number; // Avg Bounce Rate
  sessionDuration?: number; // Avg Session Duration
}

export interface UrlBreakdownEntry {
    url: string;
    periodA: PeriodStats;
    periodB: PeriodStats;
    diffBounce?: number;
    diffTime?: number;
}

// --- BLUE PAPER TYPES ---

export interface SeoDiagnosis {
    status: 'CRITICAL' | 'IMPROVABLE' | 'OPTIMAL';
    rootCause: 'INTENT' | 'TECHNICAL' | 'CONTENT_QUALITY' | 'FRESHNESS' | 'SERP_FEATURE' | 'UNKNOWN';
    explanation: string;
    referenceCompetitors?: string[]; // New: List of competitor URLs used for benchmarking
}

export interface SeoAction {
    type: 'TEXT' | 'CODE' | 'INSTRUCCION';
    title: string;
    content: string; // HTML, JSON-LD, or Markdown text
}

export interface ComparisonRow {
  query: string;
  // urls: string[]; // Deprecated in favor of urlBreakdown
  urlBreakdown: UrlBreakdownEntry[]; 
  periodA: PeriodStats; // Query-level Totals (Previous Period)
  periodB: PeriodStats; // Query-level Totals (Current Period)
  diffClicks: number;
  diffImp: number;
  diffPos: number;
  diffBounce?: number;
  diffTime?: number; 
  isNew: boolean; 
  isLost: boolean; 
  dominantCountry: string; // New for Blue Paper
  
  // AI Results Persistence
  aiDiagnosis?: SeoDiagnosis;
  aiActions?: SeoAction[];
  aiAnalyzed?: boolean;
}

export interface GlobalSiteStats {
  avgCtr: number;
  avgPosition: number;
  impressionThreshold: number; 
  ctrThreshold: number; 
  periodAStart: Date;
  periodAEnd: Date;
  periodBStart: Date;
  periodBEnd: Date;
}

export type ModuleId = 
  | 'CANNIBALIZATION' 
  | 'GHOST_KEYWORDS' 
  | 'SEO_DECAY' 
  | 'LOSERS_PAGE_1' 
  | 'CTR_RED_FLAGS' 
  | 'LOST_KEYWORDS' 
  | 'STRIKING_DISTANCE' 
  | 'NEW_KEYWORDS' 
  | 'CTR_OPPORTUNITIES'
  | 'KEYWORD_CLUSTERS';

export interface AnalysisModule {
  id: ModuleId;
  title: Record<string, string>;
  description: Record<string, string>;
  icon: any; 
  type: 'PROBLEM' | 'OPPORTUNITY' | 'NEUTRAL';
}

export enum SortField {
  CLICKS = 'totalClicks',
  IMPRESSIONS = 'totalImpressions',
  CTR = 'avgCtr',
  URL_COUNT = 'uniqueUrlCount',
  POSITION = 'weightedAvgPosition',
  QUERY = 'query',
  LOST = 'lostClicksEstimate'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export type Language = 'en' | 'es';

export type DataSourceMode = 'csv' | 'gsc';

export type ViewMode = 'list' | 'tasks';

// --- API PROVIDERS ---

export type ReaderProvider = 'JINA' | 'FIRECRAWL' | 'UNSTRUCTURED';
export type SerpProvider = 'JINA' | 'TAVILY' | 'SERPER' | 'DUCKDUCKGO';
export type ClusteringProvider = 'GEMINI' | 'VOYAGE';

export interface ProviderConfig {
    reader: ReaderProvider;
    serp: SerpProvider;
    clustering: ClusteringProvider;
}

export interface ExternalApiKeys {
    jina?: string;
    firecrawl?: string;
    tavily?: string;
    unstructured?: string;
    voyage?: string;
    serper?: string;
}

export interface AiBatchOptions {
    apiKeys: string[]; // Google Gemini Keys
    externalKeys: ExternalApiKeys;
    providerConfig: ProviderConfig;
    lang: Language;
    siteContext?: string;
    model: string;
    isAiEnabled?: boolean;
}

export interface ModuleState {
    hiddenQueries: string[];
    expandedQueries: string[];
    filters: {
        imp: [number, number];
        pos: [number, number];
        ctr: [number, number];
    };
    sort: {
        key: string; 
        order: 'asc' | 'desc';
    };
    viewMode?: ViewMode;
}

export interface TrendAnalysis {
    query: string;
    verdict: 'SEASONAL' | 'SEO_ISSUE' | 'UNKNOWN';
    reason: string;
}

export interface SerpResult {
    position: number;
    title: string;
    url: string;
    snippet: string;
    isSponsored?: boolean;
}

export interface SerpSimulation {
    query: string;
    results: SerpResult[];
}

export interface ClusterGroup {
    name: string;
    intent: string;
    keywords: string[];
}

export interface AutoTaskResult {
    query: string;
    url: string;
    moduleId: ModuleId;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    diagnosis: SeoDiagnosis;
    actions: SeoAction[];
}

export interface AiAnalysisResult {
    query: string;
    market_analysis?: string;
    classifications: {
        url: string;
        tag: string;
    }[];
}

// --- SESSION PERSISTENCE ---

export type AutoTaskStep = 'CONTEXT' | 'CONFIG' | 'PROCESSING' | 'RESULTS';

export interface AutoTaskSession {
    step: AutoTaskStep;
    siteContext: string;
    candidateTasks: Map<string, any[]>;
    selectedModules: Set<string>;
    moduleLimits: Map<string, number>;
}