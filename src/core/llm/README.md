# core/llm

`core/llm` 是爬虫 Agent 的模型适配层，负责把内部聊天消息和工具 Schema 转换为具体模型服务的请求，并把模型响应转换为统一的 `LlmResponse`。

## 文件

| 文件 | 作用 |
| --- | --- |
| `types.ts` | 公共消息、工具、请求、响应和 Provider 接口 |
| `deepseek.ts` | DeepSeek Chat Completions 适配器 |
| `demo.ts` | 无 API Key 的离线演示 Provider |
| `index.ts` | 统一导出 |
| `README.md` | 公共接口、适配器注册和流式调用说明 |

## 当前公共接口

```ts
export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmRequest {
  messages: readonly ChatMessage[];
  tools: readonly ToolSchema[];
  signal: AbortSignal;
}

export interface LlmResponse {
  content: string;
  toolCalls: readonly ToolCall[];
}

export interface LlmProvider {
  readonly name: string;
  complete(request: LlmRequest): Promise<LlmResponse>;
}
```

当前 AgentLoop 只依赖 `LlmProvider.complete()`，因此新增 Provider 时只需要实现一个方法。

## 已实现：DeepSeek Provider

```ts
import { DeepSeekProvider } from "../../src/core/llm";

const provider = new DeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!
});

const response = await provider.complete({
  messages: [{ role: "user", content: "抓取 Top250 第一页" }],
  tools: [],
  signal: new AbortController().signal
});

console.log(response.content);
console.log(response.toolCalls);
```

支持的环境变量：

```bash
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

## 已实现：离线 Demo Provider

```ts
import { DemoCrawlerProvider } from "../../src/core/llm";

const provider = new DemoCrawlerProvider();

const response = await provider.complete({
  messages: [{ role: "user", content: "抓取第一页" }],
  tools: [],
  signal: new AbortController().signal
});

console.log(response.toolCalls);
```

Demo Provider 返回固定的 `fetch_top250_page` 工具调用，用于验证 Agent 循环协议，不调用外部模型。

## 规划中：适配器注册

当前版本通过直接实例化 Provider 使用模型：

```ts
const provider = new DeepSeekProvider({ apiKey });
const loop = new AgentLoop({ provider, tools });
```

当需要支持多个模型提供商时，建议增加 `LlmRegistry`，按 Provider 名称注册工厂：

```ts
export type LlmAdapterFactory = () => LlmProvider;

export class LlmRegistry {
  private readonly adapters = new Map<string, LlmAdapterFactory>();

  register(name: string, factory: LlmAdapterFactory): this {
    if (this.adapters.has(name)) {
      throw new Error(`LLM adapter already registered: ${name}`);
    }
    this.adapters.set(name, factory);
    return this;
  }

  create(name: string): LlmProvider {
    const factory = this.adapters.get(name);
    if (!factory) {
      throw new Error(`Unknown LLM adapter: ${name}`);
    }
    return factory();
  }

  names(): string[] {
    return [...this.adapters.keys()];
  }
}
```

使用示例：

```ts
const registry = new LlmRegistry()
  .register("deepseek", () => new DeepSeekProvider({ apiKey }))
  .register("demo", () => new DemoCrawlerProvider());

const provider = registry.create("deepseek");
const loop = new AgentLoop({ provider, tools });
```

**状态：规划中，当前未实现。** 如果加入该能力，需要新增 `src/core/llm/registry.ts`，并为重复注册和未知适配器增加测试。

## 规划中：流式调用

当前 `LlmProvider` 只有非流式 `complete()`。流式调用建议扩展为：

```ts
export type LlmStreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; call: ToolCall }
  | { type: "done"; response: LlmResponse };

export interface StreamingLlmProvider extends LlmProvider {
  stream(request: LlmRequest): AsyncIterable<LlmStreamEvent>;
}
```

使用示例：

```ts
const provider: StreamingLlmProvider = new DeepSeekProvider({ apiKey });

for await (const event of provider.stream(request)) {
  if (event.type === "text-delta") {
    process.stdout.write(event.text);
  } else if (event.type === "tool-call") {
    console.log("tool:", event.call.name);
  } else if (event.type === "done") {
    console.log("final:", event.response.content);
  }
}
```

流式实现需要处理：

- SSE 或分块 JSON 解析。
- 文本增量与工具调用增量。
- 连接中断、取消和超时。
- 最终消息持久化与 UI 增量输出分离。
- 流式失败时保留已输出内容，并记录错误。

**状态：规划中，当前未实现。** 当前 AgentLoop 在模型返回完整响应后统一处理工具调用。

## 与 AgentLoop 的关系

当前调用链：

```text
AgentLoop
  → provider.complete(request)
  → LlmResponse
  → 执行 toolCalls
  → 继续下一轮
```

未来加入流式调用后，建议保持 `complete()` 作为非流式基线，同时增加 `stream()`，避免破坏现有 Provider 和测试。

## 设计约束

- 公共接口只暴露内部需要的消息、工具和响应结构。
- DeepSeek 特有字段不能泄漏到 AgentLoop。
- Provider 必须接收 `AbortSignal`。
- 工具调用参数统一解析为 `Record<string, unknown>`。
- 规划中的适配器注册和流式接口在实现前不应被业务代码依赖。
