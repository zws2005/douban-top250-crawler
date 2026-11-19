import * as cheerio from "cheerio";
import { normalizeText } from "../../normalize";
import type { SearchOptions, SearchProvider, SearchResponse, SearchResult } from "./types";

const DEFAULT_ENDPOINT = "https://cn.bing.com/search";

export class BingSearchProvider implements SearchProvider {
  readonly name = "bing";

  constructor(
    private readonly endpoint = DEFAULT_ENDPOINT,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const limit = Math.max(1, Math.min(10, options.limit ?? 5));
    const url = new URL(this.endpoint);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(limit));

    const response = await this.fetchImpl(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7"
      },
      signal: options.signal
    });
    if (!response.ok) {
      throw new Error(`Bing search HTTP ${response.status}`);
    }

    const $ = cheerio.load(await response.text());
    const results: SearchResult[] = [];
    $("li.b_algo").each((_index, element) => {
      if (results.length >= limit) return;
      const item = $(element);
      const link = item.find("h2 a").first();
      const title = normalizeText(link.text());
      const href = normalizeText(link.attr("href"));
      const snippet = normalizeText(
        item.find(".b_caption p").first().text() || item.find("p").first().text()
      );
      if (title && href) results.push({ title, url: href, snippet });
    });

    return { query, provider: this.name, results };
  }
}
