import { AgentLoop } from "./core/agent-loop";
import { createCrawlerTools } from "./core/agent-loop/crawler-tools";
import { selectProvider } from "./core/llm";
import { CRAWLER_AGENT_SYSTEM_PROMPT, DEFAULT_AGENT_TASK } from "./app/prompt";
import { loadEnvFile } from "./app/env";

interface AgentCliOptions {
  task: string;
  demo: boolean;
  provider?: string;
  model?: string;
}

function parseArgs(args: string[]): AgentCliOptions {
  let demo = false;
  let provider: string | undefined;
  let model: string | undefined;
  const task: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--demo") {
      demo = true;
    } else if (arg === "--provider") {
      provider = args[index + 1];
      index += 1;
    } else if (arg === "--model") {
      model = args[index + 1];
      index += 1;
    } else {
      task.push(arg);
    }
  }

  return {
    task: task.join(" ").trim() || DEFAULT_AGENT_TASK,
    demo,
    provider,
    model
  };
}

async function main(): Promise<void> {
  loadEnvFile();
  const options = parseArgs(process.argv.slice(2));
  const provider = selectProvider({
    demo: options.demo,
    provider: options.provider,
    model: options.model
  });
  const tools = createCrawlerTools();

  console.log(`[agent] provider: ${provider.name}`);
  console.log(`[agent] tools: ${tools.schemas().map((tool) => tool.name).join(", ")}`);

  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());

  const loop = new AgentLoop({
    provider,
    tools,
    systemPrompt: CRAWLER_AGENT_SYSTEM_PROMPT,
    maxSteps: 6,
    onEvent: (event) => {
      if (event.type === "tool/call") {
        console.log(`[agent] tool/call: ${event.call.name} ${JSON.stringify(event.call.arguments)}`);
      } else if (event.type === "tool/result") {
        console.log(`[agent] tool/result: ${event.result.name} (${event.result.isError ? "error" : "ok"})`);
      }
    }
  });

  const result = await loop.run(options.task, controller.signal);
  console.log("\n=== Agent 最终输出 ===");
  console.log(result.output);
  console.log(`\n[agent] steps: ${result.steps}`);
  console.log(`[agent] session: ${result.logPath}`);
}

main().catch((error: unknown) => {
  console.error(`[agent] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
