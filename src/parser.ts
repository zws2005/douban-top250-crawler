import * as cheerio from "cheerio";
import { normalizeText } from "./normalize";
import type { RawBookRecord } from "./types";

export interface ParseResult {
  books: RawBookRecord[];
  malformedRows: number;
}

/**
 * Parse one 豆瓣图书 Top250 listing page.
 *
 * The parser intentionally keeps rating and rating-count text unchanged in the
 * raw output. Format normalisation belongs to the pandas cleaning stage.
 */
export function parseTop250Page(
  html: string,
  pageStart = 0,
  fetchedAt = new Date().toISOString()
): RawBookRecord[] {
  return parseTop250PageWithStats(html, pageStart, fetchedAt).books;
}

export function parseTop250PageWithStats(
  html: string,
  pageStart = 0,
  fetchedAt = new Date().toISOString()
): ParseResult {
  if (!html.trim()) {
    return { books: [], malformedRows: 0 };
  }

  const $ = cheerio.load(html);
  const books: RawBookRecord[] = [];
  let malformedRows = 0;

  $("tr.item").each((index, element) => {
    const item = $(element);
    const titleLink = item.find("div.pl2 a").first();
    const star = item.find("div.star").first();

    const title = normalizeText(titleLink.attr("title")) || normalizeText(titleLink.text());
    const url = normalizeText(titleLink.attr("href"));
    if (!title || !url) {
      malformedRows += 1;
      return;
    }

    const subtitle = normalizeText(titleLink.find("span").first().text()).replace(
      /^[:：\s]+/,
      ""
    );

    books.push({
      rank: pageStart + index + 1,
      title,
      subtitle,
      authorInfo: normalizeText(item.find("p.pl").first().text()),
      ratingRaw: normalizeText(star.find("span.rating_nums").first().text()),
      ratingCountRaw: normalizeText(star.find("span.pl").first().text()),
      quote: normalizeText(item.find("p.quote span.inq").first().text()),
      url,
      coverUrl: normalizeText(item.find("a.nbg img").first().attr("src")),
      fetchedAt
    });
  });

  return { books, malformedRows };
}
