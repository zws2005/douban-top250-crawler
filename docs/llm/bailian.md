# bailian：阿里云百炼 Provider

路径：`src/core/llm/bailian.ts`

`BailianProvider` 通过阿里云百炼的 OpenAI Compatible API 调用 Qwen 模型。

```ts
import { BailianProvider } from "../../src/core/llm";

const provider = new BailianProvider({
  apiKey: process.env.DASHSCOPE_API_KEY!
});

const response = await provider.complete({
  messages: [{ role: "user", content: "你好，请介绍你自己" }],
  tools: [],
  signal: new AbortController().signal
});

console.log(response.content);
```

运行前设置 API Key：

```bash
export DASHSCOPE_API_KEY="你的百炼 API Key"
```

可选变量：

```bash
export DASHSCOPE_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export DASHSCOPE_MODEL="qwen-plus"
```

也兼容 `BAILIAN_API_KEY`、`BAILIAN_BASE_URL` 和 `BAILIAN_MODEL` 作为别名。
