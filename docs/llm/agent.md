# agent：工具注册与执行

路径：`src/core/agent`

`ToolRegistry` 负责注册工具、生成工具 Schema，并统一处理工具执行错误。

```ts
import { ToolRegistry } from "../../src/core/agent";

const tools = new ToolRegistry().register({
  name: "echo",
  description: "返回输入文本",
  parameters: {
    type: "object",
    properties: { text: { type: "string" } }
  },
  execute(args) {
    return { echoed: args.text };
  }
});

const result = await tools.execute(
  { id: "call-1", name: "echo", arguments: { text: "hello" } },
  { sessionId: "demo", signal: new AbortController().signal }
);

console.log(result.isError); // false
console.log(result.content); // {"echoed":"hello"}
```

工具执行失败时不会抛出到 Agent 循环，而是返回 `isError: true` 和错误文本。
