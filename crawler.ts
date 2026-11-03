import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

export const DEFAULT_URL = "https://book.douban.com/top250";
export const PAGE_SIZE = 25;

export interface Book {
  rank: number;
  title: string;
  subtitle: string;
  authorInfo: string;
  ratingRaw: string;
  ratingCountRaw: string;
  quote: string;
  url: string;
  coverUrl: string;
  fetchedAt: string;
}

const FIELDS = [
  ["rank", "rank"], ["title", "title"], ["subtitle", "subtitle"],
  ["authorInfo", "author_info"], ["ratingRaw", "rating_raw"],
  ["ratingCountRaw", "rating_count_raw"], ["quote", "quote"],
  ["url", "url"], ["coverUrl", "cover_url"], ["fetchedAt", "fetched_at"]
] as const;

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function buildTop250Url(pageIndex: number, pageSize = PAGE_SIZE): string {
  const url = new URL(DEFAULT_URL);
  url.searchParams.set("start", String(pageIndex * pageSize));
  return url.toString();
}

export function parseTop250Page(html: string, pageStart = 0): Book[] {
  if (!html.trim()) return [];
  const $ = cheerio.load(html);
  const books: Book[] = [];
  $("tr.item").each((index, element) => {
    const item = $(element);
    const link = item.find("div.pl2 a").first();
    const title = normalizeText(link.attr("title")) || normalizeText(link.text());
    const url = normalizeText(link.attr("href"));
    if (!title || !url) return;
    const star = item.find("div.star").first();
    books.push({
      rank: pageStart + index + 1,
      title,
      subtitle: normalizeText(link.find("span").first().text()).replace(/^[:：\s]+/, ""),
      authorInfo: normalizeText(item.find("p.pl").first().text()),
      ratingRaw: normalizeText(star.find("span.rating_nums").first().text()),
      ratingCountRaw: normalizeText(star.find("span.pl").first().text()),
      quote: normalizeText(item.find("p.quote span.inq").first().text()),
      url,
      coverUrl: normalizeText(item.find("a.nbg img").first().attr("src")),
      fetchedAt: new Date().toISOString()
    });
  });
  return books;
}

export function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function booksToCsv(books: Book[]): string {
  const header = FIELDS.map(([, name]) => name).join(",");
  const rows = books.map((book) => FIELDS.map(([key]) => csvEscape(book[key])).join(","));
  return `\ufeff${[header, ...rows].join("\n")}\n`;
}

export async function fetchPage(url: string, attempts = 4): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 DoubanTop250LearningCrawler/1.0",
          "Accept-Language": "zh-CN,zh;q=0.9"
        },
        redirect: "follow",
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      if (!html.trim()) throw new Error("empty response");
      return html;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** (attempt - 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`fetch failed: ${String(lastError)}`);
}

export async function crawl(pages = 10, delayMs = 1_500): Promise<Book[]> {
  const books: Book[] = [];
  for (let page = 0; page < pages; page += 1) {
    const url = buildTop250Url(page);
    console.log(`[crawl] page ${page + 1}/${pages}: ${url}`);
    const parsed = parseTop250Page(await fetchPage(url), page * PAGE_SIZE);
    if (!parsed.length) throw new Error(`no books found on page ${page + 1}`);
    books.push(...parsed);
    console.log(`[crawl] parsed ${parsed.length} books`);
    if (page < pages - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  const output = path.resolve("data/raw_books.csv");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, booksToCsv(books), "utf8");
  await rename(`${output}.tmp`, output);
  console.log(`[crawl] wrote ${books.length} rows to ${output}`);
  return books;
}

async function fetchCheck(): Promise<void> {
  const html = await fetchPage(buildTop250Url(0));
  const books = parseTop250Page(html);
  if (books.length < 20) throw new Error(`only parsed ${books.length} books`);
  console.log("网页 fetch 测试通过");
  console.log(`HTML 大小: ${Buffer.byteLength(html, "utf8")} bytes`);
  console.log(`解析书目: ${books.length}`);
  console.log(`首条记录: ${books[0]?.title} | 评分 ${books[0]?.ratingRaw}`);
}

function valueAfter(args: string[], name: string, fallback: number): number {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid ${name}`);
  return value;
}

async function main(): Promise<void> {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "crawl") {
    await crawl(valueAfter(args, "--pages", 10), valueAfter(args, "--delay-ms", 1_500));
  } else if (command === "fetch-test") {
    await fetchCheck();
  } else {
    console.log("用法: node dist/src/index.js crawl|fetch-test");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
