import { AgentLoop } from "./core/agent-loop";
import { createCrawlerTools } from "./core/agent-loop/crawler-tools";
import { DeepSeekProvider, DemoCrawlerProvider } from "./core/llm";
import type { LlmProvider } from "./core/llm";

const DEFAULT_TASK = "抓取豆瓣读书 Top250 第 1 页，并总结前几本书的信息。";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const demo = args.includes("--demo");
  const task = args.filter((arg) => arg !== "--demo").join(" ").trim() || DEFAULT_TASK;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const provider: LlmProvider =
    demo || !apiKey ? new DemoCrawlerProvider() : new DeepSeekProvider({ apiKey });
  const tools = createCrawlerTools();

  console.log(`[agent] provider: ${provider.name}`);
  console.log(`[agent] tools: ${tools.schemas().map((tool) => tool.name).join(", ")}`);

  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());

  const loop = new AgentLoop({
    provider,
    tools,
    maxSteps: 6,
    onEvent: (event) => {
      if (event.type === "tool/call") {
        console.log(`[agent] tool/call: ${event.call.name} ${JSON.stringify(event.call.arguments)}`);
      } else if (event.type === "tool/result") {
        console.log(`[agent] tool/result: ${event.result.name} (${event.result.isError ? "error" : "ok"})`);
      }
    }
  });

  const result = await loop.run(task, controller.signal);
  console.log("\n=== Agent 最终输出 ===");
  console.log(result.output);
  console.log(`\n[agent] steps: ${result.steps}`);
  console.log(`[agent] session: ${result.logPath}`);
}

main().catch((error: unknown) => {
  console.error(`[agent] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
