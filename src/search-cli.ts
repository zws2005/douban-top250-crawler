import { loadEnvFile } from "./app/env";
import { createSearchProvider } from "./core/websearch";

async function main(): Promise<void> {
  loadEnvFile();
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    console.error('用法: npm run search -- "搜索关键词"');
    process.exitCode = 1;
    return;
  }
  const provider = createSearchProvider();
  const response = await provider.search(query, { limit: 5 });
  console.log(`provider: ${response.provider}`);
  console.log(`query: ${response.query}`);
  if (response.answer) console.log(`answer: ${response.answer}`);
  response.results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.title}`);
    console.log(result.url);
    if (result.snippet) console.log(result.snippet);
  });
}

main().catch((error: unknown) => {
  console.error(`搜索失败: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
