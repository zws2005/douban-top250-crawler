import { BingSearchProvider } from "./bing";
import { DuckDuckGoSearchProvider } from "./duckduckgo";
import { TavilySearchProvider } from "./tavily";
import type { SearchOptions, SearchProvider, SearchResponse } from "./types";

export type WebSearchProviderName = "bing" | "duckduckgo" | "tavily";

export interface WebSearchServiceOptions {
  provider?: SearchProvider;
  env?: NodeJS.ProcessEnv;
}

export function createSearchProvider(env: NodeJS.ProcessEnv = process.env): SearchProvider {
  const forced = env.WEB_SEARCH_PROVIDER?.toLowerCase();
  if (forced === "duckduckgo" || forced === "ddg") return new DuckDuckGoSearchProvider();
  if (forced === "tavily") {
    if (!env.TAVILY_API_KEY) throw new Error("缺少 TAVILY_API_KEY");
    return new TavilySearchProvider(env.TAVILY_API_KEY);
  }
  if (forced === "bing") return new BingSearchProvider();
  if (env.TAVILY_API_KEY) return new TavilySearchProvider(env.TAVILY_API_KEY);
  return new BingSearchProvider();
}

export class WebSearchService {
  constructor(private readonly provider = createSearchProvider()) {}

  get name(): string {
    return this.provider.name;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const cleaned = query.trim();
    if (!cleaned) throw new Error("搜索关键词不能为空");
    return this.provider.search(cleaned, {
      ...options,
      limit: Math.max(1, Math.min(10, options.limit ?? 5))
    });
  }
}
