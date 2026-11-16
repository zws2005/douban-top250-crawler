import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchPage } from "./fetch";
import { doubanBooksSource } from "./sources";
import type { CrawlSource } from "./sources";
import type { RawBookRecord } from "./types";

export interface CrawlOptions {
  pages?: number;
  pageSize?: number;
  delayMs?: number;
  outputPath?: string;
}

export interface CrawlResult<T> {
  items: T[];
  outputPath: string;
  malformedRows: number;
  sourceName: string;
}

export async function crawlSource<T>(
  source: CrawlSource<T>,
  options: CrawlOptions = {}
): Promise<CrawlResult<T>> {
  const pages = Math.min(
    source.maxPages,
    Math.max(1, options.pages ?? source.maxPages)
  );
  const pageSize = Math.max(1, options.pageSize ?? source.pageSize);
  const delayMs = Math.max(0, options.delayMs ?? 1_500);
  const defaultOutput = path.join(process.cwd(), "data", "raw_books.csv");
  const outputPath = path.resolve(options.outputPath ?? defaultOutput);
  const items: T[] = [];
  let malformedRows = 0;

  console.log(`[crawl] source: ${source.name} (${pages} pages, ${pageSize}/page)`);

  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const url = source.buildPageUrl(pageIndex, pageSize);
    console.log(`[crawl] page ${pageIndex + 1}/${pages}: ${url}`);

    const { html } = await fetchPage(url);
    const parsed = source.parsePage(html, pageIndex * pageSize);
    malformedRows += parsed.malformedRows;

    if (parsed.items.length === 0) {
      throw new Error(
        `No rows found by source "${source.name}" on page ${pageIndex + 1}; the page may be blocked or its layout changed`
      );
    }

    items.push(...parsed.items);
    console.log(`[crawl] parsed ${parsed.items.length} rows`);

    if (pageIndex < pages - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, source.serialize(items), "utf8");
  await rename(temporaryPath, outputPath);

  console.log(
    `[crawl] wrote ${items.length} rows to ${outputPath}` +
      (malformedRows > 0 ? ` (${malformedRows} malformed rows skipped)` : "")
  );

  return { items, outputPath, malformedRows, sourceName: source.name };
}

export async function crawlDoubanTop250(
  options: CrawlOptions = {}
): Promise<CrawlResult<RawBookRecord>> {
  return crawlSource(doubanBooksSource, options);
}
