import type { SearchOptions, SearchProvider, SearchResponse, SearchResult } from "./types";

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
}

export class TavilySearchProvider implements SearchProvider {
  readonly name = "tavily";

  constructor(
    private readonly apiKey: string,
    private readonly endpoint = "https://api.tavily.com/search",
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const limit = Math.max(1, Math.min(10, options.limit ?? 5));
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: limit,
        search_depth: "basic",
        include_answer: true
      }),
      signal: options.signal
    });
    if (!response.ok) {
      throw new Error(`Tavily search HTTP ${response.status}`);
    }
    const data = (await response.json()) as TavilyResponse;
    const results: SearchResult[] = (data.results ?? [])
      .filter((item) => item.title && item.url)
      .slice(0, limit)
      .map((item) => ({
        title: item.title!,
        url: item.url!,
        snippet: item.content ?? ""
      }));
    return {
      query,
      provider: this.name,
      results,
      ...(data.answer ? { answer: data.answer } : {})
    };
  }
}
