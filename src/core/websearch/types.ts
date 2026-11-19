export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  provider: string;
  results: SearchResult[];
  answer?: string;
}

export interface SearchOptions {
  limit?: number;
  signal?: AbortSignal;
}

export interface SearchProvider {
  readonly name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResponse>;
}
