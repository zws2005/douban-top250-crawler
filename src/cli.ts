import path from "node:path";
import { crawlDoubanTop250 } from "./crawler";

interface CliOptions {
  pages: number;
  pageSize: number;
  delayMs: number;
  outputPath: string;
}

const HELP = `豆瓣读书 Top250 爬虫

用法:
  npm run crawl -- [选项]

选项:
  --pages <n>       抓取页数，默认 10（每页 25 本）
  --page-size <n>   每页条目数，默认 25
  --delay-ms <n>    页面间等待毫秒数，默认 1500
  --output <path>   原始 CSV 路径，默认 data/raw_books.csv
  --help            显示帮助
`;

function parsePositiveInteger(name: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

function parseCliOptions(args: string[]): CliOptions | null {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) {
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      return null;
    }
    if (!argument.startsWith("--")) {
      throw new Error(`Unknown argument: ${argument}`);
    }

    const equalsIndex = argument.indexOf("=");
    if (equalsIndex > 0) {
      values.set(argument.slice(2, equalsIndex), argument.slice(equalsIndex + 1));
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    values.set(argument.slice(2), value);
    index += 1;
  }

  return {
    pages: values.has("pages")
      ? parsePositiveInteger("--pages", values.get("pages") as string)
      : 10,
    pageSize: values.has("page-size")
      ? parsePositiveInteger("--page-size", values.get("page-size") as string)
      : 25,
    delayMs: values.has("delay-ms")
      ? Math.max(0, Number(values.get("delay-ms")))
      : 1_500,
    outputPath: path.resolve(
      values.get("output") ?? path.join(process.cwd(), "data", "raw_books.csv")
    )
  };
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  if (!options) {
    console.log(HELP);
    return;
  }

  await crawlDoubanTop250(options);
}

main().catch((error: unknown) => {
  console.error(`[crawl] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
