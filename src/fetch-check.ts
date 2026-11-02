import { fetchPage } from "./fetch";
import { buildTop250Url } from "./normalize";
import { parseTop250PageWithStats } from "./parser";

async function main(): Promise<void> {
  const url = buildTop250Url(0);
  const { html, status, finalUrl } = await fetchPage(url);
  const { books } = parseTop250PageWithStats(html);

  if (books.length < 20) {
    throw new Error(
      `Fetch check failed: expected at least 20 books, received ${books.length}`
    );
  }

  const first = books[0];
  console.log("网页 fetch 测试通过");
  console.log(`状态码: ${status}`);
  console.log(`最终 URL: ${finalUrl}`);
  console.log(`HTML 大小: ${Buffer.byteLength(html, "utf8")} bytes`);
  console.log(`解析书目: ${books.length}`);
  console.log(
    `首条记录: ${first?.rank}. ${first?.title} | 评分 ${first?.ratingRaw} | ${first?.ratingCountRaw}`
  );
}

main().catch((error: unknown) => {
  console.error(`Fetch check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
