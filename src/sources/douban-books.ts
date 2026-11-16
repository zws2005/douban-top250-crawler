import { booksToCsv } from "../csv";
import { buildTop250Url, DEFAULT_PAGE_SIZE } from "../normalize";
import { parseTop250PageWithStats } from "../parser";
import type { RawBookRecord } from "../types";
import type { CrawlSource } from "./types";

export const doubanBooksSource: CrawlSource<RawBookRecord> = {
  name: "douban-books-top250",
  pageSize: DEFAULT_PAGE_SIZE,
  maxPages: 10,

  buildPageUrl(pageIndex, pageSize = DEFAULT_PAGE_SIZE) {
    return buildTop250Url(pageIndex, pageSize);
  },

  parsePage(html, pageStart) {
    const parsed = parseTop250PageWithStats(html, pageStart);
    return { items: parsed.books, malformedRows: parsed.malformedRows };
  },

  serialize(items) {
    return booksToCsv(items);
  }
};
