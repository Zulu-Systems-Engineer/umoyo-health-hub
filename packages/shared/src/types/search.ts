export interface SearchParams {
  query: string;
  category?: string;
  language?: string;
  audience?: string;
  region?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  documentId: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  metadata: {
    category: string;
    language: string;
    lastUpdated: string;
  };
}

