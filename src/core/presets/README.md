# core/presets

Preset 是一组 Agent 配置，决定：

- system prompt
- 插件集合
- 插件注册的工具和 Hook

它不直接执行 Agent，而是由调用方选择 Preset 后创建 AgentLoop。

## 最小模型

```ts
import type { AgentPreset } from "../../src/core/presets";

const preset: AgentPreset = {
  id: "research",
  name: "联网研究",
  description: "允许 Agent 搜索互联网",
  systemPrompt: "你是研究助手，需要搜索时调用 web_search。",
  plugins: [webSearchPlugin]
};
```

## 注册与选择

```ts
const registry = new PresetRegistry([preset]);
const selected = registry.get("research");
const loop = new AgentLoop({
  provider,
  tools,
  plugins: selected.plugins,
  systemPrompt: selected.systemPrompt
});
```

一个进程可以注册多个 Preset，但不同 Preset 的 ID 不能重复。
