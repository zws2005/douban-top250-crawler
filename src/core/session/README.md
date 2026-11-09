# core/session

这是爬虫 Agent 使用的最小化追加式会话存储。

| 文件 | 作用 |
| --- | --- |
| `types.ts` | 定义会话头、事件负载和会话记录 |
| `known-event-types.ts` | 维护合法事件类型白名单 |
| `preparation.ts` | 创建新的会话头 |
| `request-header.ts` | 规范化 Provider 和模型选择 |
| `index.ts` | `SessionLog`：追加事件、派生消息、fork、修复和持久化 |
| `surface.ts` | 从事件日志派生模型可见的聊天消息 |
| `tool-history.ts` | 把工具调用和对应结果配对 |
| `fork.ts` | 把当前会话复制成一个新分支 |
| `repair.ts` | 在程序崩溃后关闭未结束的 turn |

会话会以 JSONL 格式保存到 `data/agent-sessions/` 目录。
