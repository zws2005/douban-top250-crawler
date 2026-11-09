# Agent 模块文档

本目录按模块说明 `src/core` 的最小使用方式。

| 文档 | 模块 |
| --- | --- |
| [agent.md](agent.md) | 工具注册与执行 |
| [agent-loop.md](agent-loop.md) | Agent 循环 |
| [deepseek.md](deepseek.md) | DeepSeek Provider |
| [demo.md](demo.md) | 离线 Demo Provider |
| [session.md](session.md) | 会话事件日志 |
| [scope.md](scope.md) | 作用域 |
| [attachment.md](attachment.md) | 附件类型 |

## 完整最小示例

示例假设文件位于 `docs/llm/`，因此使用 `../../src/...` 导入。

```ts
import { AgentLoop } from "../../src/core/agent-loop";
import { createCrawlerTools } from "../../src/core/agent-loop/crawler-tools";
import { DemoCrawlerProvider } from "../../src/core/llm";

const loop = new AgentLoop({
  provider: new DemoCrawlerProvider(),
  tools: createCrawlerTools(),
  maxSteps: 4
});

const result = await loop.run("抓取豆瓣 Top250 第 1 页并总结");
console.log(result.output);
console.log(result.logPath);
```

这段代码会启动一次离线 Agent 循环：Demo Provider 产生一次工具调用，`AgentLoop` 执行工具、回填结果，并保存 JSONL 会话日志。
