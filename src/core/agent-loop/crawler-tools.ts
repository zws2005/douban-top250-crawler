import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { ToolRegistry } from "../agent";
import { crawlDoubanTop250 } from "../../crawler";
import { fetchPage } from "../../fetch";
import { buildTop250Url } from "../../normalize";
import { parseTop250PageWithStats } from "../../parser";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");

function numberArg(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function createCrawlerTools(): ToolRegistry {
  const tools = new ToolRegistry();

  tools.register({
    name: "fetch_top250_page",
    description: "抓取并解析豆瓣读书 Top250 的指定页（1-10），只读，不写文件。",
    parameters: {
      type: "object",
      properties: {
        page: { type: "integer", minimum: 1, maximum: 10, description: "页码，从 1 开始" }
      }
    },
    async execute(args, context) {
      if (context.signal.aborted) throw new Error("cancelled");
      const page = numberArg(args.page, 1, 1, 10);
      const url = buildTop250Url(page - 1);
      const { html } = await fetchPage(url);
      const parsed = parseTop250PageWithStats(html, (page - 1) * 25);
      return {
        page,
        url,
        count: parsed.books.length,
        malformedRows: parsed.malformedRows,
        sample: parsed.books.slice(0, 5).map((book) => ({
          rank: book.rank,
          title: book.title,
          rating: book.ratingRaw,
          ratingCount: book.ratingCountRaw
        }))
      };
    }
  });

  tools.register({
    name: "crawl_top250",
    description: "抓取豆瓣 Top250 的若干页并写入 data/raw_books.csv。",
    parameters: {
      type: "object",
      properties: {
        pages: { type: "integer", minimum: 1, maximum: 10 },
        delayMs: { type: "integer", minimum: 0, maximum: 10000 }
      }
    },
    async execute(args, context) {
      if (context.signal.aborted) throw new Error("cancelled");
      const result = await crawlDoubanTop250({
        pages: numberArg(args.pages, 1, 1, 10),
        delayMs: numberArg(args.delayMs, 1000, 0, 10000),
        outputPath: path.join(PROJECT_ROOT, "data", "raw_books.csv")
      });
      return {
        rows: result.books.length,
        outputPath: path.relative(PROJECT_ROOT, result.outputPath),
        sample: result.books.slice(0, 5).map((book) => ({ rank: book.rank, title: book.title }))
      };
    }
  });

  tools.register({
    name: "read_books_csv",
    description: "读取原始或清洗后的图书 CSV 前若干行。",
    parameters: {
      type: "object",
      properties: {
        file: { type: "string", enum: ["raw", "clean"] },
        limit: { type: "integer", minimum: 1, maximum: 50 }
      }
    },
    async execute(args, context) {
      if (context.signal.aborted) throw new Error("cancelled");
      const file = args.file === "clean" ? "clean_books.csv" : "raw_books.csv";
      const limit = numberArg(args.limit, 5, 1, 50);
      const content = await readFile(path.join(PROJECT_ROOT, "data", file), "utf8");
      return {
        file,
        lines: content.split(/\r?\n/).filter(Boolean).slice(0, limit + 1)
      };
    }
  });

  tools.register({
    name: "analyze_books",
    description: "运行 pandas 清洗与分析脚本，生成 clean_books.csv 和 report.md。",
    parameters: { type: "object", properties: {} },
    async execute(_args, context) {
      if (context.signal.aborted) throw new Error("cancelled");
      const { stdout, stderr } = await execFileAsync(
        "bash",
        [path.join(PROJECT_ROOT, "analysis", "run_analysis.sh")],
        { cwd: PROJECT_ROOT, signal: context.signal }
      );
      return { stdout: stdout.trim(), stderr: stderr.trim() };
    }
  });

  return tools;
}
