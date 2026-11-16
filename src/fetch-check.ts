import { fetchPage } from "./fetch";
import { doubanBooksSource } from "./sources";

async function main(): Promise<void> {
  const url = doubanBooksSource.buildPageUrl(0);
  const { html, status, finalUrl } = await fetchPage(url);
  const parsed = doubanBooksSource.parsePage(html, 0);

  if (parsed.items.length < 20) {
    throw new Error(
      `Fetch check failed: expected at least 20 books, received ${parsed.items.length}`
    );
  }

  const first = parsed.items[0];
  console.log("网页 fetch 测试通过");
  console.log(`数据源: ${doubanBooksSource.name}`);
  console.log(`状态码: ${status}`);
  console.log(`最终 URL: ${finalUrl}`);
  console.log(`HTML 大小: ${Buffer.byteLength(html, "utf8")} bytes`);
  console.log(`解析书目: ${parsed.items.length}`);
  console.log(
    `首条记录: ${first?.rank}. ${first?.title} | 评分 ${first?.ratingRaw} | ${first?.ratingCountRaw}`
  );
}

main().catch((error: unknown) => {
  console.error(`Fetch check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
