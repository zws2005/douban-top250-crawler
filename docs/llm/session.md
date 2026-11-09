# session：会话事件日志

路径：`src/core/session`

`SessionLog` 记录一次 Agent 运行的关键事件，并支持 JSONL 持久化。

```ts
import { SessionLog } from "../../src/core/session";

const session = new SessionLog({
  cwd: process.cwd(),
  onEvent: (record) => console.log(record.type)
});

session.append({ type: "turn/start", turnId: "t1", input: "hello" });
session.append({
  type: "user/message",
  message: { role: "user", content: "hello" }
});
session.append({
  type: "assistant/message",
  message: { role: "assistant", content: "world" }
});
session.append({
  type: "turn/end",
  turnId: "t1",
  output: "world",
  steps: 1
});

const file = await session.persist();
console.log(file); // data/agent-sessions/<session-id>.jsonl
```

当前 Session 只负责事件记录和持久化。fork、repair、消息派生和工具历史属于未来扩展，不在当前模块中实现。
