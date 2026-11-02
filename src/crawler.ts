import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { booksToCsv } from "./csv";
import { fetchPage } from "./fetch";
import {
  buildTop250Url,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TOP250_URL
} from "./normalize";
import { parseTop250PageWithStats } from "./parser";
import type { RawBookRecord } from "./types";

export interface CrawlOptions {
  pages?: number;
  pageSize?: number;
  delayMs?: number;
  outputPath?: string;
  baseUrl?: string;
}

export interface CrawlResult {
  books: RawBookRecord[];
  outputPath: string;
  malformedRows: number;
}

export async function crawlDoubanTop250(
  options: CrawlOptions = {}
): Promise<CrawlResult> {
  const pages = Math.max(1, options.pages ?? 10);
  const pageSize = Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE);
  const delayMs = Math.max(0, options.delayMs ?? 1_500);
  const baseUrl = options.baseUrl ?? DEFAULT_TOP250_URL;
  const outputPath = path.resolve(
    options.outputPath ?? path.join(process.cwd(), "data", "raw_books.csv")
  );

  const books: RawBookRecord[] = [];
  let malformedRows = 0;

  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const start = pageIndex * pageSize;
    const url = buildTop250Url(pageIndex, pageSize, baseUrl);
    console.log(`[crawl] page ${pageIndex + 1}/${pages}: ${url}`);

    const { html } = await fetchPage(url);
    const parsed = parseTop250PageWithStats(html, start);
    malformedRows += parsed.malformedRows;

    if (parsed.books.length === 0) {
      throw new Error(
        `No book rows found on page ${pageIndex + 1}; the page may be blocked or its layout changed`
      );
    }

    books.push(...parsed.books);
    console.log(
      `[crawl] parsed ${parsed.books.length} books (rank ${parsed.books[0]?.rank}-${
        parsed.books[parsed.books.length - 1]?.rank
      })`
    );

    if (pageIndex < pages - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, booksToCsv(books), "utf8");
  await rename(temporaryPath, outputPath);

  console.log(
    `[crawl] wrote ${books.length} rows to ${outputPath}` +
      (malformedRows > 0 ? ` (${malformedRows} malformed rows skipped)` : "")
  );

  return { books, outputPath, malformedRows };
}
