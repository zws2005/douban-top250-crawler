# demo：离线 Demo Provider

路径：`src/core/llm/demo.ts`

`DemoCrawlerProvider` 不需要 API Key，用于测试 Agent 循环和工具调用协议。

```ts
import { DemoCrawlerProvider } from "../../src/core/llm";

const response = await new DemoCrawlerProvider().complete({
  messages: [{ role: "user", content: "抓取第一页" }],
  tools: [],
  signal: new AbortController().signal
});

console.log(response.toolCalls);
// [{ id: 'demo-fetch-page-1', name: 'fetch_top250_page', arguments: { page: 1 } }]
```

它只发起只读的 `fetch_top250_page` 工具调用，不会修改 CSV 数据。
