# deepseek：DeepSeek Provider

路径：`src/core/llm/deepseek.ts`

`DeepSeekProvider` 把内部消息格式转换为 DeepSeek Chat Completions 请求，并解析工具调用。

```ts
import { DeepSeekProvider } from "../../src/core/llm";

const provider = new DeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!
});

const response = await provider.complete({
  messages: [{ role: "user", content: "你好，请介绍你自己" }],
  tools: [],
  signal: new AbortController().signal
});

console.log(response.content);
```

运行前需要设置：

```bash
export DEEPSEEK_API_KEY="你的 API Key"
```

可选变量：`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`。默认模型为 `deepseek-chat`。
