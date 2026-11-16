export interface ParsedPage<T> {
  items: T[];
  malformedRows: number;
}

/**
 * A crawl source owns everything site-specific:
 * pagination, HTML parsing, page size, and output serialization.
 */
export interface CrawlSource<T> {
  readonly name: string;
  readonly pageSize: number;
  readonly maxPages: number;
  buildPageUrl(pageIndex: number, pageSize?: number): string;
  parsePage(html: string, pageStart: number): ParsedPage<T>;
  serialize(items: readonly T[]): string;
}
