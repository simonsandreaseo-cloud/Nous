export interface ContentItem {
    url: string;
    title: string;
    type: 'product' | 'collection' | 'blog' | 'static' | 'other';
    search_index: string;
    score?: number;
}
