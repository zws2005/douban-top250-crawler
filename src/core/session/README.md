# core/session

`core/session` 是爬虫 Agent 的最小会话日志模块，负责记录一次 Agent 运行中的关键事件，并把日志保存为 JSONL 文件。

## 当前范围

该模块只解决三个问题：

1. 创建带唯一 ID 的 Session。
2. 按顺序追加可回放的事件。
3. 将事件保存到 `data/agent-sessions/<session-id>.jsonl`。

它不负责消息派生、上下文压缩、会话 fork、崩溃修复、数据库持久化或跨进程恢复。

## 文件

| 文件 | 作用 |
| --- | --- |
| `types.ts` | 定义 SessionHeader、事件负载和记录类型 |
| `index.ts` | `SessionLog`：创建、追加事件、持久化 |
| `README.md` | 模块说明和最小示例 |

## 事件类型

```text
session/created
turn/start
user/message
assistant/message
tool/call
tool/result
turn/end
```

事件是有序的。一个正常的工具调用流程通常为：

```text
session/created
turn/start
user/message
assistant/message
tool/call
tool/result
assistant/message
turn/end
```

## 公开 API

### `new SessionLog(options)`

```ts
const session = new SessionLog({
  cwd: process.cwd(),
  onEvent: (record) => console.log(record.type)
});
```

参数：

- `id`：可选，未传入时自动生成 UUID。
- `cwd`：会话工作目录，默认 `process.cwd()`。
- `onEvent`：每条事件追加后的回调，可用于日志输出或 UI。

### `session.append(event)`

追加一条事件并自动补充 `at` 时间戳。

```ts
session.append({
  type: "turn/start",
  turnId: "turn-1",
  input: "抓取 Top250 第一页"
});
```

### `session.persist(directory?)`

将全部事件写入 JSONL 文件，返回文件路径。

```ts
const file = await session.persist();
console.log(file);
// data/agent-sessions/<session-id>.jsonl
```

### `session.records`

读取当前内存中的全部事件记录。每条记录包含原始事件字段和 `at` 时间戳。

### `session.id`

读取当前会话 ID。

## 最小示例

```ts
import { SessionLog } from "../../src/core/session";

const session = new SessionLog({ cwd: process.cwd() });

session.append({
  type: "turn/start",
  turnId: "turn-1",
  input: "hello"
});
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
  turnId: "turn-1",
  output: "world",
  steps: 1
});

const file = await session.persist();
console.log(file);
```

## 设计取舍

当前爬虫 Agent 只需要记录一次运行并在结束时保存日志，因此以下能力已经从本模块移除：

- fork：没有多分支会话需求。
- repair：没有恢复中断 Session 的运行入口。
- deriveMessages：AgentLoop 自己维护消息数组。
- deriveToolHistory：没有工具历史查询接口。
- request-header：模型选择还没有写入 Session。
- 事件白名单：TypeScript 的联合类型已经足够约束事件。

这些能力可以作为后续扩展重新加入，但不应在还没有使用场景时提前实现。
