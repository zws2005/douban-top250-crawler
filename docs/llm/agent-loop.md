# agent-loop：Agent 循环

路径：`src/core/agent-loop`

`AgentLoop` 执行“调用模型 → 执行工具 → 回填工具结果 → 再调用模型”的循环。

```ts
import { AgentLoop } from "../../src/core/agent-loop";
import { createCrawlerTools } from "../../src/core/agent-loop/crawler-tools";
import { DemoCrawlerProvider } from "../../src/core/llm";

const result = await new AgentLoop({
  provider: new DemoCrawlerProvider(),
  tools: createCrawlerTools(),
  maxSteps: 4
}).run("抓取豆瓣 Top250 第 1 页");

console.log(result.output);
console.log(result.steps);
console.log(result.logPath);
```

模型没有工具调用时循环结束；达到 `maxSteps` 仍未结束时抛出错误。
